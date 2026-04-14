import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const clinic = formData.get('clinic') as string
    const folder_id = formData.get('folder_id') as string | null

    if (!file || !title || !clinic) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const storagePath = `${Date.now()}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('staff-docs')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })
    if (storageError) throw new Error('Storage upload failed: ' + storageError.message)

    const { data, error: dbError } = await supabase.from('documents').insert({
      file_name: file.name,
      storage_path: storagePath,
      title,
      description: description || '',
      category: category || 'General',
      clinic,
      folder_id: folder_id || null,
    }).select().single()

    if (dbError) throw new Error('DB error: ' + dbError.message)
    return NextResponse.json({ document: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
