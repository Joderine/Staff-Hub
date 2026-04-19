import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'No token' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    console.error('Auth error:', userError?.message)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('staff_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    const fallback = await supabaseAdmin
      .from('staff_profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (fallback.error || !fallback.data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile: fallback.data })
  }

  return NextResponse.json({ profile: data })
}
