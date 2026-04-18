'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile, Document, CATEGORIES, CLINICS } from '@/lib/types'

interface Folder { id: string; name: string; clinic: string; parent_id: string | null }
interface Link { id: string; title: string; url: string; description: string; clinic: string; folder_id: string | null }
interface Props { profile: StaffProfile; onSignOut: () => void }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function Tag({ label, color, bg, border }: { label: string; color: string; bg?: string; border?: string }) {
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: '3px 9px', borderRadius: 20, background: bg || (color + '12'), color, border: '1px solid ' + (border || (color + '40')), whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '10px 14px', outline: 'none', transition: 'border-color 0.18s', boxSizing: 'border-box' }
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const primaryBtn: React.CSSProperties = { width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const ghostBtn: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }
const editBtn: React.CSSProperties = { background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }
const deleteBtn: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }

function clinicColor(c: string) {
  return c === 'MAH' ? 'var(--mah)' : c === 'HPVC' ? 'var(--hpvc)' : 'var(--green)'
}

function getFolderLabel(folders: Folder[], f: Folder): string {
  if (!f.parent_id) return f.name
  const parent = folders.find(p => p.id === f.parent_id)
  if (!parent) return f.name
  const grandparent = folders.find(g => g.id === parent.parent_id)
  if (grandparent) return grandparent.name + ' > ' + parent.name + ' > ' + f.name
  return parent.name + ' > ' + f.name
}

function FolderTree({ folders, docs, parentId, clinic, depth, onDelete, onEdit }: {
  folders: Folder[]
  docs: Document[]
  parentId: string | null
  clinic: string
  depth: number
  onDelete: (id: string, name: string) => void
  onEdit: (folder: Folder) => void
}) {
  const children = folders.filter(f => f.parent_id === parentId && f.clinic === clinic)
  if (children.length === 0) return null
  return (
    <>
      {children.map(f => (
        <div key={f.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, marginLeft: depth * 20 }}>
            <span style={{ fontSize: 14 }}>Folder</span>
            <span style={{ flex: 1, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{f.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>
              {docs.filter(d => d.folder_id === f.id).length} docs
            </span>
            <button onClick={() => onEdit(f)} style={editBtn}>Edit</button>
            <button onClick={() => onDelete(f.id, f.name)} style={deleteBtn}>Delete</button>
          </div>
          <FolderTree folders={folders} docs={docs} parentId={f.id} clinic={clinic} depth={depth + 1} onDelete={onDelete} onEdit={onEdit} />
        </div>
      ))}
    </>
  )
}

export default function AdminPortal({ profile, onSignOut }: Props) {
  const [tab, setTab] = useState<'docs' | 'staff' | 'upload' | 'folders' | 'links'>('docs')
  const [docs, setDocs] = useState<Document[]>([])
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(false)

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [clinic, setClinic] = useState<'MAH' | 'HPVC' | 'Both'>('Both')
  const [folderId, setFolderId] = useState<string>('')
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Staff state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteClinic, setInviteClinic] = useState<'MAH' | 'HPVC' | 'Both'>('MAH')
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  // Folder state
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderClinic, setNewFolderClinic] = useState<'MAH' | 'HPVC'>('MAH')
  const [newFolderParent, setNewFolderParent] = useState<string>('')
  const [folderMsg, setFolderMsg] = useState('')

  // Link state
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [linkClinic, setLinkClinic] = useState<'MAH' | 'HPVC' | 'Both'>('Both')
  const [linkFolderId, setLinkFolderId] = useState<string>('')
  const [linkMsg, setLinkMsg] = useState('')

  // Edit states
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)

  useEffect(() => { loadDocs(); loadStaff(); loadFolders(); loadLinks() }, [])

  async function loadDocs() {
    const res = await fetch('/api/admin/documents')
    const data = await res.json()
    if (data.documents) setDocs(data.documents as Document[])
  }

  async function loadStaff() {
    const res = await fetch('/api/admin/staff')
    const data = await res.json()
    if (data.staff) setStaff(data.staff)
  }

  async function loadFolders() {
    const res = await fetch('/api/admin/folders')
    const data = await res.json()
    if (data.folders) setFolders(data.folders)
  }

  async function loadLinks() {
    const res = await fetch('/api/admin/links')
    const data = await res.json()
    if (data.links) setLinks(data.links)
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
    if (folderId) fd.append('folder_id', folderId)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.document) {
      setDocs(prev => [data.document, ...prev])
      setTitle(''); setDescription(''); setFile(null); setFolderId('')
      if (fileRef.current) fileRef.current.value = ''
      setUploadMsg('Uploaded successfully')
    } else {
      setUploadMsg('Error: ' + data.error)
    }
    setLoading(false)
  }

  async function handleDelete(doc: Document) {
    if (!confirm('Delete "' + doc.title + '"?')) return
    await fetch('/api/admin/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, storagePath: doc.storage_path })
    })
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  async function handleSaveDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!editingDoc) return
    const res = await fetch('/api/admin/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingDoc.id,
        title: editingDoc.title,
        description: editingDoc.description,
        category: editingDoc.category,
        clinic: editingDoc.clinic,
        folder_id: editingDoc.folder_id || null
      })
    })
    const data = await res.json()
    if (data.document) {
      setDocs(prev => prev.map(d => d.id === data.document.id ? data.document : d))
      setEditingDoc(null)
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!invitePassword || invitePassword.length < 8) {
      setInviteMsg('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setInviteMsg('')
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName, clinic: inviteClinic, role: inviteRole, password: invitePassword }),
    })
    const data = await res.json()
    if (data.success) {
      setInviteMsg(inviteName + ' added successfully')
      setInviteEmail(''); setInviteName(''); setInvitePassword('')
      loadStaff()
    } else {
      setInviteMsg('Error: ' + data.error)
    }
    setLoading(false)
  }

  async function handleRemoveStaff(id: string, name: string) {
    if (!confirm('Remove ' + name + '?')) return
    await fetch('/api/admin/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName) return
    setFolderMsg('')
    const res = await fetch('/api/admin/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName, clinic: newFolderClinic, parent_id: newFolderParent || null })
    })
    const data = await res.json()
    if (data.folder) {
      setFolders(prev => [...prev, data.folder])
      setNewFolderName(''); setNewFolderParent('')
      setFolderMsg('Folder created')
    } else {
      setFolderMsg('Error: ' + data.error)
    }
  }

  async function handleSaveFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!editingFolder) return
    const res = await fetch('/api/admin/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingFolder.id, name: editingFolder.name, parent_id: editingFolder.parent_id || null })
    })
    const data = await res.json()
    if (data.folder) {
      setFolders(prev => prev.map(f => f.id === data.folder.id ? data.folder : f))
      setEditingFolder(null)
      setFolderMsg('Folder updated')
    }
  }

  async function handleDeleteFolder(id: string, name: string) {
    if (!confirm('Delete folder "' + name + '"? Documents inside will become unfiled.')) return
    await fetch('/api/admin/folders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setFolders(prev => prev.filter(f => f.id !== id))
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    if (!linkTitle || !linkUrl) return
    setLinkMsg('')
    const res = await fetch('/api/admin/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: linkTitle, url: linkUrl, description: linkDescription, clinic: linkClinic, folder_id: linkFolderId || null })
    })
    const data = await res.json()
    if (data.link) {
      setLinks(prev => [data.link, ...prev])
      setLinkTitle(''); setLinkUrl(''); setLinkDescription(''); setLinkFolderId('')
      setLinkMsg('Link added successfully')
    } else {
      setLinkMsg('Error: ' + data.error)
    }
  }

  async function handleSaveLink(e: React.FormEvent) {
    e.preventDefault()
    if (!editingLink) return
    const res = await fetch('/api/admin/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingLink.id,
        title: editingLink.title,
        url: editingLink.url,
        description: editingLink.description,
        clinic: editingLink.clinic,
        folder_id: editingLink.folder_id || null
      })
    })
    const data = await res.json()
    if (data.link) {
      setLinks(prev => prev.map(l => l.id === data.link.id ? data.link : l))
      setEditingLink(null)
    }
  }

  async function handleDeleteLink(id: string, title: string) {
    if (!confirm('Delete link "' + title + '"?')) return
    await fetch('/api/admin/links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  const editPanelStyle: React.CSSProperties = {
    background: '#f0f7ff',
    border: '2px solid var(--accent)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10
  }

  return (
