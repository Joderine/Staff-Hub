'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile, Document, CATEGORIES } from '@/lib/types'

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
  const bottomRef = useRef<HTMLDivElement>(null)
  const clinicColor = profile.clinic === 'MAH' ? 'var(--mah)' : 'var(--hpvc)'

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('category')
    if (data) setDocs(data as Document[])
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
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const categories = ['All', ...Array.from(new Set(docs.map(d => d.category)))]
  const filteredDocs = filterCat === 'All' ? docs : docs.filter(d => d.category === filterCat)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>Staff Hub</div>
        <div style={{ padding: '3px 10px', borderRadius: 20, background: `${clinicColor}15`, border: `1px solid ${clinicColor}40`, color: clinicColor, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500 }}>
          {profile.clinic}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Hi, {profile.name.split(' ')[0]}</span>
          <button onClick={onSignOut} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', gap: 2 }}>
        {(['ask', 'docs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', border: 'none', background: 'transparent',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
            color: tab === t ? 'var(--accent)' : 'var(--muted)',
            borderBottom: tab === t ? `2px solid var(--accent)` : '2px solid transparent',
            cursor: 'pointer', textTransform: 'capitalize',
          }}>{t === 'ask' ? 'Ask a Question' : 'Documents'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>
        {/* ASK TAB */}
        {tab === 'ask' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--dim)', marginBottom: 10 }}>Common questions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => ask(s)} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
                    padding: '7px 14px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent)' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--muted)' }}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div style={{ minHeight: 300, maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dim)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: 'var(--muted)', marginBottom: 6 }}>Ask anything about {profile.clinic}</div>
                  <div style={{ fontSize: 13 }}>Procedures, contacts, protocols — all your documents in one place</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    background: m.role === 'user' ? clinicColor : 'var(--surface)',
                    border: `1px solid ${m.role === 'user' ? 'transparent' : 'var(--border)'}`,
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '12px 16px', maxWidth: '85%',
                    color: m.role === 'user' ? '#fff' : 'var(--text)',
                    fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>{m.content}</div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Spinner color="var(--accent)" />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Searching documents…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <input
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '11px 16px', outline: 'none', transition: 'border-color 0.18s' }}
                placeholder="Type your question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ask() } }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button onClick={() => ask()} disabled={!input.trim() || loading} style={{
                background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
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
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${filterCat === cat ? 'var(--accent)' : 'var(--border)'}`,
                  background: filterCat === cat ? 'var(--accent-soft)' : 'var(--surface)',
                  color: filterCat === cat ? 'var(--accent)' : 'var(--muted)',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                }}>{cat}</button>
              ))}
            </div>

            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dim)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>No documents yet</div>
              </div>
            ) : (
              filteredDocs.map(doc => (
                <div key={doc.id} className="fade-up" style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  padding: '16px 20px', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{categoryIcon(doc.category)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{doc.title}</div>
                      {doc.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{doc.description}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-mid)' }}>{doc.category}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 20, background: doc.clinic === 'MAH' ? '#eff6ff' : doc.clinic === 'HPVC' ? '#f5f3ff' : '#f0fdf4', color: doc.clinic === 'MAH' ? 'var(--mah)' : doc.clinic === 'HPVC' ? 'var(--hpvc)' : 'var(--green)', border: '1px solid currentColor' }}>{doc.clinic}</span>
                      </div>
                    </div>
                  </div>
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

function Spinner({ color }: { color: string }) {
  return <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${color}30`, borderTopColor: color, animation: 'spin 0.65s linear infinite', flexShrink: 0 }} />
}
