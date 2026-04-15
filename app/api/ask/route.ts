import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { question, clinic } = await req.json()
    if (!question) return NextResponse.json({ error: 'No question' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ answer: 'ERROR: ANTHROPIC_API_KEY is not set in environment variables.' })

    const anthropic = new Anthropic({ apiKey: apiKey.trim() })
    const supabase = createServiceClient()

    // Fetch documents for this clinic
    const { data: docs, error: dbError } = await supabase
      .from('documents')
      .select('*')
      .or(`clinic.eq.${clinic},clinic.eq.Both`)

    if (dbError) return NextResponse.json({ answer: `ERROR: Database error — ${dbError.message}` })
    if (!docs?.length) return NextResponse.json({ answer: 'No documents have been uploaded yet for your clinic. Please contact your manager.' })

    // Download PDFs and extract text — limit to first 3 docs and 3000 chars each
    const MAX_DOCS = 3
    const MAX_CHARS_PER_DOC = 3000
    const docTexts: string[] = []

    for (const doc of docs.slice(0, MAX_DOCS)) {
      const { data: fileData, error: storageError } = await supabase.storage
        .from('staff-docs')
        .download(doc.storage_path)

      if (storageError || !fileData) continue

      // Convert to text — extract readable characters from PDF bytes
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const rawText = buffer.toString('latin1')

      // Pull out readable ASCII text from the PDF binary
      const readable = rawText
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_CHARS_PER_DOC)

      if (readable.length > 100) {
        docTexts.push(`--- ${doc.title} ---\n${readable}`)
      }
    }

    if (!docTexts.length) return NextResponse.json({ answer: 'Documents could not be loaded. Please contact your manager.' })

    const combinedContext = docTexts.join('\n\n')

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a helpful assistant for ${clinic} clinic staff. Answer questions based only on the provided documents. Be clear and practical. If you find a phone number, address or specific procedure, quote it exactly. If the answer is not in the documents, say so clearly.`,
      messages: [
        {
          role: 'user',
          content: `Here are the clinic documents:\n\n${combinedContext}\n\nQuestion: ${question}`,
        },
      ],
    })

    const answer = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    return NextResponse.json({ answer })

  } catch (err: any) {
    console.error('Ask API error:', err)
    return NextResponse.json({ answer: `ERROR: ${err.message}` })
  }
}
