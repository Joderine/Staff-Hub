import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function DELETE(req: NextRequest) {
  try {
    const { id, storagePath } = await req.json()
    const supabase = createServiceClient()
    await supabase.storage.from('staff-docs').remove([storagePath])
    await supabase.from('documents').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
