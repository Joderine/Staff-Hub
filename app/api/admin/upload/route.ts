import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

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

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const text = buffer.toString('latin1')
  const chunks: string[] = []
  let btIndex = 0
  while ((btIndex = text.indexOf('BT', btIndex)) !== -1) {
    const etIndex = text.indexOf('ET', btIndex)
    if (etIndex === -1) break
    const block = text.slice(btIndex, etIndex)
    const matches = block.match(/\(([^)]+)\)/g)
    if (matches) {
      for (const m of matches) {
        const content = m.slice(1, -1).replace(/\\[nrt]/g, ' ').trim()
        if (content.length > 2) chunks.push(content)
      }
    }
    btIndex = etIndex + 2
  }
  const raw = chunks.join(' ')
  if (raw.length > 100) return raw

  // Fallback: grab any readable ASCII strings
  const strings: string[] = []
  let current = ''
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i]
    if (c >= 32 && c <= 126) {
      current += String.fromCharCode(c)
    } else {
      if (current.length > 4) strings.push(current)
      current = ''
    }
  }
  return strings.filter(s => /[a-zA-Z]{3,}/.test(s)).join(' ')
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
      const extractedText = await extractTextFromPDF(buffer)
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
        if (!embedding) { console.error(`No embedding for chunk ${i}`); continue }

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
