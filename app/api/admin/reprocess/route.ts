import { NextResponse } from 'next/server'
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

export async function POST() {
  try {
    const supabase = createServiceClient()

    // Test 1 — can we fetch documents?
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: true })

    if (docsError) {
      return NextResponse.json({ error: 'FAILED AT: fetch documents', detail: docsError.message })
    }

    if (!documents?.length) {
      return NextResponse.json({ error: 'FAILED AT: no documents found' })
    }

    // Test 2 — can we download the first file?
    const firstDoc = documents[0]
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('staff-docs')
      .download(firstDoc.storage_path)

    if (downloadError) {
      return NextResponse.json({ error: 'FAILED AT: storage download', detail: downloadError.message, path: firstDoc.storage_path })
    }

    // Test 3 — can we call Anthropic?
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() })
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64 = buffer.toString('base64')

    const extractionMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as any,
            { type: 'text', text: 'Extract the first 100 words of text from this document.' },
          ],
        },
      ],
    })

    const extractedText = extractionMsg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    return NextResponse.json({ 
      success: true, 
      docCount: documents.length,
      firstDoc: firstDoc.title,
      extractedPreview: extractedText.slice(0, 200)
    })

  } catch (err: any) {
    return NextResponse.json({ error: 'UNHANDLED ERROR', detail: err.message })
  }
}
