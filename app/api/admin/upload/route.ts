import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
const pdfParse = require('pdf-parse')

export const maxDuration = 300

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

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const storagePath = `${Date.now()}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('staff-docs')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (storageError) throw new Error('Storage upload failed: ' + storageError.message)

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

    try {
      const voyageKey = process.env.VOYAGE_API_KEY
      if (!voyageKey) throw new Error('Missing VOYAGE_API_KEY')

      console.log(`Extracting text from ${title}...`)
      const parsed = await pdfParse(buffer)
      const extractedText = parsed.text
      console.log(`Extracted ${extractedText.length} chars from ${title}`)

      if (extractedText.length < 50) {
        throw new Error('Not enough text extracted from PDF')
      }

      const chunks = chunkText(extractedText)
      console.log(`Created ${chunks.length} chunks for ${title}`)

      let savedCount = 0
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        const embeddingResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${voyageKey}`,
          },
          body: JSON.stringify({ model: 'voyage-2', input: chunk }),
        })

        if (!embeddingResponse.ok) {
          console.error(`Voyage failed for chunk ${i}:`, await embeddingResponse.text())
          continue
        }

        const embeddingData = await embeddingResponse.json()
        const embedding = embeddingData.data?.[0]?.embedding
        if (!embedding) {
          console.error(`No embedding for chunk ${i}`)
          continue
        }

        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: data.id,
            clinic,
            title,
            chunk_text: chunk,
            embedding: '[' + embedding.join(',') + ']',
            chunk_index: i,
          })

        if (chunkError) {
          console.error(`Failed to save chunk ${i}:`, chunkError.message)
        } else {
          savedCount++
        }
      }

      console.log(`Saved ${savedCount}/${chunks.length} chunks for ${title}`)

    } catch (embeddingErr: any) {
      console.error('Embedding pipeline error:', embeddingErr.message)
    }

    return NextResponse.json({ document: data })

  } catch (err: any) {
    console.error('Upload error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
