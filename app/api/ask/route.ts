import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { question, clinic } = await req.json()
    if (!question) return NextResponse.json({ error: 'No question' }, { status: 400 })

    const supabase = createServiceClient()

    // Fetch documents for this clinic
    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .or(`clinic.eq.${clinic},clinic.eq.Both`)

    if (error) throw new Error(error.message)
    if (!docs?.length) return NextResponse.json({ answer: "No documents have been uploaded yet. Please contact your manager." })

    // Download PDFs
    const pdfBlocks: any[] = []
    for (const doc of docs) {
      const { data: fileData } = await supabase.storage.from('staff-docs').download(doc.storage_path)
      if (!fileData) continue
      const base64 = Buffer.from(await fileData.arrayBuffer()).toString('base64')
      pdfBlocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        title: doc.title,
      })
    }

    const content: any[] = [
      ...pdfBlocks,
      { type: 'text', text: question },
    ]

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a helpful assistant for ${clinic} clinic staff. Answer questions based only on the provided documents. Be clear, concise and practical. If you find a phone number, address or specific procedure, quote it exactly. If the answer is not in the documents, say so clearly and suggest they contact their manager.`,
      messages: [{ role: 'user', content }],
    } as any)

    const answer = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    return NextResponse.json({ answer })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
