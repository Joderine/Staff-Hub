import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('links').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data })
}

export async function POST(req: NextRequest) {
  const { title, url, description, clinic, folder_id } = await req.json()
  if (!title || !url || !clinic) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('links').insert({
    title, url, description: description || '', clinic, folder_id: folder_id || null
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const supabase = createServiceClient()
  const { error } = await supabase.from('links').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
