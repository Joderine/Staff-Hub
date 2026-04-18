import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

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
    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const supabase = createServiceClient()
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() })
    const voyageKey = process.env.VOYAGE_API_KEY!

    // Fetch the single document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ status: 'failed', reason: 'Document not found' })
    }

    // Delete existing chunks
    await supabase.from('document_chunks').delete().eq('document_id', doc.id)

    // Download PDF
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('staff-docs')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ status: 'failed', reason: 'Could not download file' })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64 = buffer.toString('base64')

    // Extract text via Claude
    const extractionMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
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

    if (extractedText.length < 50) {
      return NextResponse.json({ status: 'failed', reason: 'Not enough text extracted' })
    }

    // Chunk and embed
    const chunks = chunkText(extractedText)
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

      if (!embeddingResponse.ok) continue

      const embeddingData = await embeddingResponse.json()
      const embedding = embeddingData.data?.[0]?.embedding
      if (!embedding) continue

      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_id: doc.id,
          clinic: doc.clinic,
          title: doc.title,
          chunk_text: chunk,
          embedding: JSON.stringify(embedding),
          chunk_index: i,
        })

      if (!chunkError) savedCount++
    }

    return NextResponse.json({ status: 'ok', title: doc.title, chunks: savedCount })

  } catch (err: any) {
    return NextResponse.json({ status: 'failed', reason: err.message })
  }
}
