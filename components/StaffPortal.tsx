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
            fontFamily: "'DM Sans', sans-serif", fontS
