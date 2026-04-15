import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { question, clinic } = await req.json()
    if (!question) return NextResponse.json({ error: 'No question' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ answer: 'ERROR: ANTHROPIC_API_KEY is not set.' })

    const supabase = createServiceClient()

    // Step 1 — Turn the question into an embedding (fingerprint)
    const embeddingResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'voyage-2',
        input: question,
      }),
    })

    if (!embeddingResponse.ok) {
      return NextResponse.json({ answer: 'ERROR: Could not process your question. Please try again.' })
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data?.[0]?.embedding

    if (!queryEmbedding) {
      return NextResponse.json({ answer: 'ERROR: Could not generate question embedding.' })
    }

    // Step 2 — Find the most relevant chunks from the database
    const { data: chunks, error: matchError } = await supabase.rpc('match_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_clinic: clinic,
      match_count: 5,
    })

    if (matchError) {
      console.error('Match error:', matchError)
      return NextResponse.json({ answer: 'ERROR: Could not search documents. Please try again.' })
    }

    if (!chunks?.length) {
      return NextResponse.json({ 
        answer: 'No relevant documents found for your question. Please contact your manager if you think this information should be available.' 
      })
    }

    // Step 3 — Build context from the matching chunks
    const context = chunks
      .map((chunk: any) => `--- ${chunk.title} ---\n${chunk.chunk_text}`)
      .join('\n\n')

    // Step 4 — Ask Claude with only the relevant context
    const anthropic = new Anthropic({ apiKey: apiKey.trim() })

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a helpful assistant for ${clinic} clinic staff. Answer questions based only on the provided document excerpts. Be clear and practical. If you find a phone number, address or specific procedure, quote it exactly. If the answer is not in the documents, say so clearly.`,
      messages: [
        {
          role: 'user',
          content: `Here are the most relevant sections from the clinic documents:\n\n${context}\n\nQuestion: ${question}`,
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
