import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

// Split text into overlapping chunks
function chunkText(text: string, chunkSize = 400, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ').trim()
    if (chunk.length > 50) chunks.push(chunk)
    i += chunkSize - overlap
  }
  return chunks
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const clinic = formData.get('clinic') as string
    const folder_id = formData.get('folder_id') as string | null

    if (!file || !title || !clinic) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload file to storage
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const storagePath = `${Date.now()}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('staff-docs')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (storageError) throw new Error('Storage upload failed: ' + storageError.message)

    // Save document record
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        file_name: file.name,
        storage_path: storagePath,
        title,
        description: description || '',
        category: category || 'General',
        clinic,
        folder_id: folder_id || null,
      })
      .select()
      .single()

    if (dbError) throw new Error('DB error: ' + dbError.message)

    // Extract text using Claude (reliable, handles all PDF types)
    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY
      const voyageKey = process.env.VOYAGE_API_KEY

      if (!anthropicKey || !voyageKey) {
        throw new Error('Missing API keys')
      }

      // Step 1 — Send PDF to Claude and ask it to extract all text
      const anthropic = new Anthropic({ apiKey: anthropicKey.trim() })
      const base64 = buffer.toString('base64')

      console.log(`Extracting text from ${title} using Claude...`)

      const extractionMsg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              } as any,
              {
                type: 'text',
                text: 'Please extract ALL the text content from this document. Output only the raw text, preserving the structure and content as accurately as possible. Do not summarise, skip, or paraphrase anything — include everything.',
              },
            ],
          },
        ],
      })

      const extractedText = extractionMsg.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')

      console.log(`Extracted ${extractedText.length} chars from ${title}`)

      if (extractedText.length < 50) {
        throw new Error('Not enough text extracted from document')
      }

      // Step 2 — Split into chunks
      const chunks = chunkText(extractedText)
      console.log(`Created ${chunks.length} chunks for ${title}`)

      // Step 3 — Embed each chunk via Voyage AI and save to database
      let savedCount = 0

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        const embeddingResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${voyageKey}`,
          },
          body: JSON.stringify({
            model: 'voyage-2',
            input: chunk,
          }),
        })

        if (!embeddingResponse.ok) {
          const errText = await embeddingResponse.text()
          console.error(`Voyage embedding failed for chunk ${i}:`, errText)
          continue
        }

        const embeddingData = await embeddingResponse.json()
        const embedding = embeddingData.data?.[0]?.embedding

        if (!embedding) {
          console.error(`No embedding returned for chunk ${i}`)
          continue
        }

        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: data.id,
            clinic,
            title,
            chunk_text: chunk,
            embedding: JSON.stringify(embedding),
            chunk_index: i,
          })

        if (chunkError) {
          console.error(`Failed to save chunk ${i}:`, chunkError.message)
        } else {
          savedCount++
        }
      }

      console.log(`Successfully saved ${savedCount}/${chunks.length} chunks for ${title}`)

    } catch (embeddingErr: any) {
      // Non-fatal — document is still uploaded, just won't be searchable yet
      console.error('Embedding pipeline error (non-fatal):', embeddingErr.message)
    }

    return NextResponse.json({ document: data })

  } catch (err: any) {
    console.error('Upload error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
