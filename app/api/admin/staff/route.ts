import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.from('staff_profiles').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ staff: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, clinic, role } = await req.json()
    if (!email || !name || !clinic) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Invite user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { name, clinic, role: role || 'staff' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app'}/`,
    })

    if (authError) throw new Error(authError.message)

    // Create profile
    const { error: profileError } = await supabase.from('staff_profiles').insert({
      id: authData.user.id,
      email,
      name,
      clinic,
      role: role || 'staff',
    })

    if (profileError) throw new Error(profileError.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const supabase = createServiceClient()
    await supabase.auth.admin.deleteUser(id)
    await supabase.from('staff_profiles').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
