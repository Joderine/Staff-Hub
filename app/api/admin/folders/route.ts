import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('folders')
    .select('*')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ folders: data })
}

export async function POST(req: NextRequest) {
  const { name, clinic, parent_id } = await req.json()
  if (!name || !clinic) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('folders')
    .insert({ name, clinic, parent_id: parent_id || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ folder: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('folders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
