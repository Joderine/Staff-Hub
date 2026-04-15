import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

// Extract readable text from PDF buffer using multiple strategies
function extractText(buffer: Buffer): string {
  const raw = buffer.toString('binary')
  
  // Strategy 1: Extract text between BT/ET markers (PDF text blocks)
  const btEtMatches = raw.match(/BT[\s\S]*?ET/g) || []
  const btEtText = btEtMatches
    .join(' ')
    .replace(/\(([^)]*)\)\s*Tj/g, '$1 ')
    .replace(/\(([^)]*)\)\s*TJ/g, '$1 ')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Strategy 2: Extract parenthesised strings (common PDF text encoding)
  const parenMatches = raw.match(/\(([^)]{2,})\)/g) || []
  const parenText = parenMatches
    .map(m => m.slice(1, -1))
    .join(' ')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Use whichever strategy got more text
  const result = btEtText.length > parenText.length ? btEtText : parenText

  // Final fallback — just strip non-ASCII
  if (result.length < 100) {
    return raw
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return result
}

// Split text into overlapping chunks
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim().length > 50) chunks.push(chunk.trim())
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

    // Extract text and create embeddings
    try {
      const voyageKey = process.env.VOYAGE_API_KEY
      if (!voyageKey) throw new Error('No Voyage API key')

      // Extract text from PDF
      const text = extractText(buffer)
      console.log(`Extracted ${text.length} chars from ${title}`)

      if (text.length > 100) {
        const chunks = chunkText(text)
        console.log(`Created ${chunks.length} chunks for ${title}`)

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
            console.error(`Embedding failed for chunk ${i}:`, errText)
            continue
          }

          const embeddingData = await embeddingResponse.json()
          const embedding = embeddingData.data?.[0]?.embedding

          if (!embedding) {
            console.error(`No embedding returned for chunk ${i}`)
            continue
          }

          const { error: chunkError } = await supabase.from('document_chunks').insert({
            document_id: data.id,
            clinic,
            title,
            chunk_text: chunk,
            embedding: JSON.stringify(embedding),
            chunk_index: i,
          })

          if (chunkError) {
            console.error(`Failed to save chunk ${i}:`, chunkError.message)
          }
        }
      } else {
        console.warn(`Not enough text extracted from ${title} — only ${text.length} chars`)
      }
    } catch (embeddingErr: any) {
      console.error('Embedding error (non-fatal):', embeddingErr.message)
    }

    return NextResponse.json({ document: data })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
