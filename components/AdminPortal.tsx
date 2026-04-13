'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile, Document, CATEGORIES, CLINICS } from '@/lib/types'

interface Folder { id: string; name: string; clinic: string; parent_id: string | null }
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

function clinicColor(c: string) {
  return c === 'MAH' ? 'var(--mah)' : c === 'HPVC' ? 'var(--hpvc)' : 'var(--green)'
}

function getFolderLabel(folders: Folder[], f: Folder): string {
  if (!f.parent_id) return f.name
  const parent = folders.find(p => p.id === f.parent_id)
  if (!parent) return f.name
  const grandparent = folders.find(g => g.id === parent.parent_id)
  if (grandparent) return `${grandparent.name} → ${parent.name} → ${f.name}`
  return `${parent.name} → ${f.name}`
}

function FolderTree({ folders, docs, parentId, clinic, depth, onDelete }: {
  folders: Folder[]
  docs: Document[]
  parentId: string | null
  clinic: string
  depth: number
  onDelete: (id: string, name: string) => void
}) {
  const children = folders.filter(f => f.parent_id === parentId && f.clinic === clinic)
  if (children.length === 0) return null
  return (
    <>
      {children.map(f => (
        <div key={f.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, marginLeft: depth * 20 }}>
            <span>{depth === 0 ? '📁' : '📂'}</span>
            <span style={{ flex: 1, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>{f.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>
              {docs.filter(d => d.folder_id === f.id).length} docs
            </span>
            <button onClick={() => onDelete(f.id, f.name)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: 'var(--red)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
              Delete
            </button>
          </div>
          <FolderTree folders={folders} docs={docs} parentId={f.id} clinic={clinic} depth={depth + 1} onDelete={onDelete} />
        </div>
      ))}
    </>
  )
}

export default function AdminPortal({ profile, onSignOut }: Props) {
  const [tab, setTab] = useState<'docs' | 'staff' | 'upload' | 'folders'>('docs')
  const [docs, setDocs] = useState<Document[]>([])
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [clinic, setClinic] = useState<'MAH' | 'HPVC' | 'Both'>('Both')
  const [folderId, setFolderId] = useState<string>('')
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteClinic, setInviteClinic] = useState<'MAH' | 'HPVC' | 'Both'>('MAH')
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderClinic, setNewFolderClinic] = useState<'MAH' | 'HPVC'>('MAH')
  const [newFolderParent, setNewFolderParent] = useState<string>('')
  const [folderMsg, setFolderMsg] = useState('')

  useEffect(() => { loadDocs(); loadStaff(); loadFolders() }, [])

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (data) setDocs(data as Document[])
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
      setUploadMsg('✓ Document uploaded successfully')
    } else {
      setUploadMsg('✕ Error: ' + data.error)
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
      body: JSON.stringify({ email: inviteEmail, name: inviteName, clinic: inviteClinic, role: inviteRole, password: invitePassword }),
    })
    const data = await res.json()
    if (data.success) {
      setInviteMsg('✓ ' + inviteName + ' added. They can log in at staff-hub-sigma.vercel.app')
      setInviteEmail(''); setInviteName(''); setInvitePassword('')
      loadStaff()
    } else {
      setInviteMsg('✕ Error: ' + data.error)
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
      setNewFolderName('')
      setNewFolderParent('')
      setFolderMsg('✓ Folder created')
    } else {
      setFolderMsg('✕ Error: ' + data.error)
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>Staff Hub</div>
        <div style={{ padding: '3px 10px', borderRadius: 20, background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>Admin</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{profile.name}</span>
          <button onClick={onSignOut} style={ghostBtn}>Sign out</button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', gap: 2 }}>
        {[['docs', 'Documents'], ['folders', 'Folders'], ['upload', 'Upload Doc'], ['staff', 'Manage Staff']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            padding: '10px 18px', border: 'none', background: 'transparent',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
            color: tab === key ? 'var(--accent)' : 'var(--muted)',
            borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px' }}>

        {tab === 'docs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18 }}>All Documents</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>{docs.length} documents</div>
            </div>
            {docs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>No documents yet</div>
              </div>
            ) : docs.map(doc => {
              const folder = folders.find(f => f.id === doc.folder_id)
              return (
                <div key={doc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{doc.title}</div>
                    {doc.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{doc.description}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Tag label={doc.category} color="var(--accent)" />
                      <Tag label={doc.clinic} color={clinicColor(doc.clinic)} />
                      {folder && <Tag label={'📁 ' + getFolderLabel(folders, folder)} color="var(--muted)" />}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(doc)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: 'var(--red)', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'folders' && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Manage Folders</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 18 }}>Create New Folder</div>
              <form onSubmit={handleCreateFolder}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <Field label="Folder Name">
                    <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. General Important Info" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                  </Field>
                  <Field label="Clinic">
                    <select value={newFolderClinic} onChange={e => setNewFolderClinic(e.target.value as any)} style={selectStyle}>
                      <option value="MAH">MAH</option>
                      <option value="HPVC">HPVC</option>
                    </select>
                  </Field>
                </div>
                <Field label="Parent Folder (optional — leave blank for top-level)">
                  <select value={newFolderParent} onChange={e => setNewFolderParent(e.target.value)} style={selectStyle}>
                    <option value="">— Top level folder —</option>
                    {folders.filter(f => f.clinic === newFolderClinic && f.parent_id === null).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                    {folders.filter(f => f.clinic === newFolderClinic && f.parent_id !== null).map(f => {
                      const parent = folders.find(p => p.id === f.parent_id)
                      return <option key={f.id} value={f.id}>{parent?.name} → {f.name}</option>
                    })}
                  </select>
                </Field>
                {folderMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: folderMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', color: folderMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', border: '1px solid ' + (folderMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca') }}>
                    {folderMsg}
                  </div>
                )}
                <button type="submit" style={{ ...primaryBtn, width: 'auto', padding: '9px 24px' }}>
                  Create Folder
                </button>
              </form>
            </div>

            {(['MAH', 'HPVC'] as const).map(c => (
              <div key={c} style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 16 }}>{c} Folders</div>
                  <Tag label={folders.filter(f => f.clinic === c).length + ' folders'} color={clinicColor(c)} />
                </div>
                {folders.filter(f => f.clinic === c && f.parent_id === null).length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--muted)', padding: '16px 0' }}>No folders yet for {c}</div>
                ) : (
                  <FolderTree folders={folders} docs={docs} parentId={null} clinic={c} depth={0} onDelete={handleDeleteFolder} />
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'upload' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Upload Document</div>
            <form onSubmit={handleUpload}>
              <Field label="PDF File">
                <input ref={fileRef} type="file" accept=".pdf" required onChange={e => setFile(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: '8px 14px' }} />
              </Field>
              <Field label="Document Title">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Power Outage Procedure" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </Field>
              <Field label="Description (optional)">
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </Field>
              <Field label="Category">
                <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Clinic">
                <select value={clinic} onChange={e => { setClinic(e.target.value as any); setFolderId('') }} style={selectStyle}>
                  {CLINICS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Folder (optional)">
                <select value={folderId} onChange={e => setFolderId(e.target.value)} style={selectStyle}>
                  <option value="">— No folder —</option>
                  {folders.filter(f => f.clinic === clinic || clinic === 'Both').map(f => (
                    <option key={f.id} value={f.id}>{getFolderLabel(folders, f)}</option>
                  ))}
                </select>
              </Field>
              {uploadMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: uploadMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', color: uploadMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', border: '1px solid ' + (uploadMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca') }}>
                  {uploadMsg}
                </div>
              )}
              <button type="submit" disabled={loading || !file || !title} style={primaryBtn}>
                {loading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>
        )}

        {tab === 'staff' && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Manage Staff</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Add New Staff Member</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
                Set a temporary password for them. They log in at staff-hub-sigma.vercel.app and can change their password anytime via Forgot Password.
              </div>
              <form onSubmit={handleAddStaff}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <Field label="Full Name">
                    <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Jane Smith" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="jane@clinic.com" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                  </Field>
                  <Field label="Clinic">
                    <select value={inviteClinic} onChange={e => setInviteClinic(e.target.value as any)} style={selectStyle}>
                      {CLINICS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Role">
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)} style={selectStyle}>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </Field>
                  <Field label="Temporary Password">
                    <input type="text" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Min 8 characters" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                  </Field>
                </div>
                {inviteMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: inviteMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', color: inviteMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', border: '1px solid ' + (inviteMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca') }}>
                    {inviteMsg}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{ ...primaryBtn, width: 'auto', padding: '9px 24px' }}>
                  {loading ? 'Adding...' : 'Add Staff Member'}
                </button>
              </form>
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
              Current Staff ({staff.length})
            </div>
            {staff.map(s => (
              <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>
                  {s.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.email}</div>
                </div>
                <Tag label={s.clinic} color={clinicColor(s.clinic)} />
                {s.role === 'admin' && <Tag label="Admin" color="#92400e" bg="#fef3c7" border="#fbbf24" />}
                {s.role !== 'admin' && (
                  <button onClick={() => handleRemoveStaff(s.id, s.name)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
