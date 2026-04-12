'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile, Document, CATEGORIES, CLINICS } from '@/lib/types'

interface Props { profile: StaffProfile; onSignOut: () => void }

export default function AdminPortal({ profile, onSignOut }: Props) {
  const [tab, setTab] = useState<'docs' | 'staff' | 'upload'>('docs')
  const [docs, setDocs] = useState<Document[]>([])
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [clinic, setClinic] = useState<'MAH' | 'HPVC' | 'Both'>('Both')
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteClinic, setInviteClinic] = useState<'MAH' | 'HPVC' | 'Both'>('MAH')
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => { loadDocs(); loadStaff() }, [])

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (data) setDocs(data as Document[])
  }

  async function loadStaff() {
    const res = await fetch('/api/admin/staff')
    const data = await res.json()
    if (data.staff) setStaff(data.staff)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title) return
    setLoading(true)
    setUploadMsg('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title)
    fd.append('description', description)
    fd.append('category', category)
    fd.append('clinic', clinic)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.document) {
      setDocs(prev => [data.document, ...prev])
      setTitle(''); setDescription(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setUploadMsg('✓ Document uploaded successfully')
    } else {
      setUploadMsg('✕ Error: ' + data.error)
    }
    setLoading(false)
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.title}"?`)) return
    await fetch('/api/admin/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, storagePath: doc.storage_path })
    })
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!invitePassword || invitePassword.length < 8) {
      setInviteMsg('✕ Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setInviteMsg('')
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        name: inviteName,
        clinic: inviteClinic,
        role: inviteRole,
        password: invitePassword,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setInviteMsg(`✓ ${inviteName} added successfully. They can log in at staff-hub-sigma.vercel.app`)
      setInviteEmail(''); setInviteName(''); setInvitePassword('')
      loadStaff()
    } else {
      setInviteMsg('✕ Error: ' + data.error)
    }
    setLoading(false)
  }

  async function handleRemoveStaff(id: string, name: string) {
    if (!confirm(`Remove ${name}?`)) return
    await fetch('/api/admin/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  const clinicColor = (c: string) => c === 'MAH' ? 'var(--mah)' : c === 'HPVC' ? 'var(--hpvc)' : 'var(--green)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>Staff Hub</div>
        <div style={{ padding: '3px 10px', borderRadius: 20, background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>Admin</div>
        <div style={{
