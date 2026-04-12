'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile, Document } from '@/lib/types'

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

export default function StaffPortal({ profile, onSignOut }: Props) {
  const [tab, setTab] = useState<'ask' | 'docs'>('ask')
  const [docs, setDocs] = useState<Document[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterCat, setFilterCat] = useState('All')
  const [openingDoc, setOpeningDoc] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const clinicColor = profile.clinic === 'MAH' ? '#2a5f8f' : '#7c3aed'

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('category')
    if (data) setDocs(data as Document[])
  }

  async function viewDoc(doc: Document) {
    setOpeningDoc(doc.id)
    try {
      const { data, error } = await supabase.storage.from('staff-docs').createSignedUrl(doc.storage_path, 60)
      if (error || !data) throw new Error('Could not get document URL')
      window.open(data.signedUrl, '_blank')
    } catch (err) {
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

  const categories = ['All', ...Array.from(new Set(docs.map(d => d.category)))]
  const filteredDocs = filterCat === 'All' ? docs : docs.filter(d => d.category === filterCat)

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>
      {/* Header */}
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

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e6e0', padding: '0 24px', display: 'flex', gap: 2 }}>
        {(['ask', 'docs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', border: 'none', background: 'transparent',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
            color: tab === t ? '#2a5f8f' : '#6b7280',
            borderBottom: tab === t ? '2px solid #2a5f8f' : '2px solid transparent',
            cursor: 'pointer',
          }}>{t === 'ask' ? 'Ask a Question' : 'Documents'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>

        {/* ASK TAB */}
        {tab === 'ask' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', marginBottom: 10 }}>Common questions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => ask(s)} style={{
                    background: '#fff', border: '1px solid #e8e6e0', borderRadius: 20,
                    padding: '7px 14px', fontSize: 12, color: '#6b7280', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#2a5f8f'; (e.target as HTMLElement).style.color = '#2a5f8f' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#e8e6e0'; (e.target as HTMLElement).style.color = '#6b7280' }}
                  >{s}</button>
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

        {/* DOCS TAB */}
        {tab === 'docs' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)} style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${filterCat === cat ? '#2a5f8f' : '#e8e6e0'}`,
                  background: filterCat === cat ? 'rgba(42,95,143,0.08)' : '#fff',
                  color: filterCat === cat ? '#2a5f8f' : '#6b7280',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                }}>{cat}</button>
              ))}
            </div>

            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>No documents yet</div>
              </div>
            ) : (
              filteredDocs.map(doc => (
                <div key={doc.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{categoryIcon(doc.category)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{doc.title}</div>
                    {doc.description && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{doc.description}</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(42,95,143,0.08)', color: '#2a5f8f', border: '1px solid rgba(42,95,143,0.2)' }}>{doc.category}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 20, background: doc.clinic === 'MAH' ? '#eff6ff' : doc.clinic === 'HPVC' ? '#f5f3ff' : '#f0fdf4', color: doc.clinic === 'MAH' ? '#2a5f8f' : doc.clinic === 'HPVC' ? '#7c3aed' : '#16a34a', border: '1px solid currentColor' }}>{doc.clinic}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => viewDoc(doc)}
                    disabled={openingDoc === doc.id}
                    style={{
                      background: '#2a5f8f', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 16px', fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                      opacity: openingDoc === doc.id ? 0.6 : 1,
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {openingDoc === doc.id ? '⏳' : '📄'} View
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function categoryIcon(cat: string) {
  const icons: Record<string, string> = {
    'Emergency Procedures': '🚨', 'Contacts': '📞', 'HR & Leave': '👥',
    'Clinical Protocols': '🏥', 'Equipment': '🔧', 'WHS & Safety': '⚠️', 'General': '📄',
  }
  return icons[cat] || '📄'
}
