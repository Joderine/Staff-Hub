'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile, Document } from '@/lib/types'

interface Folder { id: string; name: string; clinic: string; parent_id: string | null }
interface Link { id: string; title: string; url: string; description: string; clinic: string; folder_id: string | null }
interface Props { profile: StaffProfile; onSignOut: () => void }
interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What do I do if the power goes out?',
  'Who do I call if I am sick?',
  'What is the emergency contact number?',
  'What is the procedure for a medical emergency?',
  'Where is the first aid kit?',
  'What is the WiFi password?',
]

function DocRow({ doc, clinicColor, onView, opening }: {
  doc: Document
  clinicColor: string
  onView: (doc: Document) => void
  opening: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fafaf8', border: '1px solid #e8e6e0', borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 16 }}>{'doc'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14 }}>{doc.title}</div>
        {doc.description && <div style={{ fontSize: 12, color: '#6b7280' }}>{doc.description}</div>}
      </div>
      <button
        onClick={() => onView(doc)}
        disabled={opening}
        style={{ background: clinicColor, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', opacity: opening ? 0.6 : 1, flexShrink: 0 }}
      >
        {opening ? '⏳' : 'View'}
      </button>
    </div>
  )
}

function LinkRow({ link }: { link: Link }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 16, color: '#ff0000' }}>{'>'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14 }}>{link.title}</div>
        {link.description && <div style={{ fontSize: 12, color: '#6b7280' }}>{link.description}</div>}
      </div>
      
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ background: '#ff0000', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', flexShrink: 0, textDecoration: 'none', display: 'inline-block' }}
      >
        Watch
      </a>
    </div>
  )
}

function FolderNode({ folder, folders, docs, links, clinicColor, expandedFolders, toggleFolder, onView, openingDoc }: {
  folder: Folder
  folders: Folder[]
  docs: Document[]
  links: Link[]
  clinicColor: string
  expandedFolders: Set<string>
  toggleFolder: (id: string) => void
  onView: (doc: Document) => void
  openingDoc: string | null
}) {
  const subfolders = folders.filter(f => f.parent_id === folder.id)
  const folderDocs = docs.filter(d => d.folder_id === folder.id)
  const folderLinks = links.filter(l => l.folder_id === folder.id)
  const isExpanded = expandedFolders.has(folder.id)
  const isEmpty = subfolders.length === 0 && folderDocs.length === 0 && folderLinks.length === 0

  return (
    <div>
      <button
        onClick={() => toggleFolder(folder.id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, marginBottom: 6, cursor: isEmpty ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#1a1a2e', textAlign: 'left' }}
      >
        <span style={{ fontSize: 16 }}>{isExpanded ? '📂' : '📁'}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{folder.name}</span>
        {!isEmpty && <span style={{ fontSize: 12, color: '#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>}
        {isEmpty && <span style={{ fontSize: 11, color: '#9ca3af' }}>Empty</span>}
      </button>

      {isExpanded && (
        <div style={{ marginLeft: 16, marginBottom: 6 }}>
          {subfolders.map(sf => (
            <FolderNode key={sf.id} folder={sf} folders={folders} docs={docs} links={links} clinicColor={clinicColor} expandedFolders={expandedFolders} toggleFolder={toggleFolder} onView={onView} openingDoc={openingDoc} />
          ))}
          {folderDocs.map(doc => (
            <DocRow key={doc.id} doc={doc} clinicColor={clinicColor} onView={onView} opening={openingDoc === doc.id} />
          ))}
          {folderLinks.map(link => (
            <LinkRow key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function StaffPortal({ profile, onSignOut }: Props) {
  const [tab, setTab] = useState<'ask' | 'docs'>('ask')
  const [docs, setDocs] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [openingDoc, setOpeningDoc] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const clinicColor = profile.clinic === 'MAH' ? '#2a5f8f' : '#7c3aed'

  useEffect(() => { loadDocs(); loadFolders(); loadLinks() }, [])

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('title')
    if (data) setDocs(data as Document[])
  }

  async function loadFolders() {
    const res = await fetch('/api/admin/folders')
    const data = await res.json()
    if (data.folders) setFolders(data.folders.filter((f: Folder) => f.clinic === profile.clinic))
  }

  async function loadLinks() {
    const res = await fetch('/api/admin/links')
    const data = await res.json()
    if (data.links) setLinks(data.links.filter((l: Link) => l.clinic === profile.clinic || l.clinic === 'Both'))
  }

  async function viewDoc(doc: Document) {
    setOpeningDoc(doc.id)
    try {
      const { data, error } = await supabase.storage.from('staff-docs').createSignedUrl(doc.storage_path, 60)
      if (error || !data) throw new Error('Could not get document URL')
      window.open(data.signedUrl, '_blank')
    } catch {
      alert('Could not open document. Please try again.')
    }
    setOpeningDoc(null)
  }

  async function ask(q?: string) {
    const question = q || input.trim()
    if (!question || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, clinic: profile.clinic }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error || 'Something went wrong.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const topLevelFolders = folders.filter(f => f.parent_id === null)
  const unfiledDocs = docs.filter(d => !d.folder_id && (d.clinic === profile.clinic || d.clinic === 'Both'))
  const unfiledLinks = links.filter(l => !l.folder_id)

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e6e0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#2a5f8f' }}>Staff Hub</div>
        <div style={{ padding: '3px 10px', borderRadius: 20, background: `${clinicColor}20`, border: `1px solid ${clinicColor}50`, color: clinicColor, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500 }}>
          {profile.clinic}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Hi, {profile.name.split(' ')[0]}</span>
          <button onClick={onSignOut} style={{ background: 'transparent', border: '1px solid #e8e6e0', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#6b7280', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #e8e6e0', padding: '0 24px', display: 'flex', gap: 2 }}>
        {(['ask', 'docs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', border: 'none', background: 'transparent',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
            color: tab === t ? '#2a5f8f' : '#6b7280',
            borderBottom: tab === t ? '2px solid #2a5f8f' : '2px solid transparent',
            cursor: 'pointer',
          }}>{t === 'ask' ? 'Ask a Question' : 'Documents & Videos'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>

        {tab === 'ask' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', marginBottom: 10 }}>Common questions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => ask(s)} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 20, padding: '7px 14px', fontSize: 12, color: '#6b7280', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ minHeight: 300, maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: '#6b7280', marginBottom: 6 }}>Ask anything about {profile.clinic}</div>
                  <div style={{ fontSize: 13 }}>Procedures, contacts, protocols — all in one place</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    background: m.role === 'user' ? clinicColor : '#fff',
                    border: `1px solid ${m.role === 'user' ? 'transparent' : '#e8e6e0'}`,
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '12px 16px', maxWidth: '85%',
                    color: m.role === 'user' ? '#fff' : '#1a1a2e',
                    fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>{m.content}</div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex' }}>
                  <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #e8e6e020', borderTopColor: '#2a5f8f', animation: 'spin 0.65s linear infinite' }} />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Searching documents…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid #e8e6e0' }}>
              <input
                style={{ flex: 1, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '11px 16px', outline: 'none' }}
                placeholder="Type your question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ask() } }}
                onFocus={e => (e.target.style.borderColor = '#2a5f8f')}
                onBlur={e => (e.target.style.borderColor = '#e8e6e0')}
              />
              <button onClick={() => ask()} disabled={!input.trim() || loading} style={{
                background: '#2a5f8f', color: '#fff', border: 'none', borderRadius: 10,
                padding: '11px 22px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                cursor: 'pointer', opacity: (!input.trim() || loading) ? 0.4 : 1,
              }}>Ask</button>
            </div>
          </div>
        )}

        {tab === 'docs' && (
          <div>
            {topLevelFolders.length === 0 && unfiledDocs.length === 0 && unfiledLinks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>No documents yet</div>
              </div>
            ) : (
              <div>
                {topLevelFolders.map(f => (
                  <FolderNode key={f.id} folder={f} folders={folders} docs={docs} links={links} clinicColor={clinicColor} expandedFolders={expandedFolders} toggleFolder={toggleFolder} onView={viewDoc} openingDoc={openingDoc} />
                ))}
                {(unfiledDocs.length > 0 || unfiledLinks.length > 0) && (
                  <div style={{ marginTop: topLevelFolders.length > 0 ? 20 : 0 }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 10 }}>Other</div>
                    {unfiledDocs.map(doc => <DocRow key={doc.id} doc={doc} clinicColor={clinicColor} onView={viewDoc} opening={openingDoc === doc.id} />)}
                    {unfiledLinks.map(link => <LinkRow key={link.id} link={link} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
