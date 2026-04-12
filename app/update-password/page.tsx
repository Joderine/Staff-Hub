'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2' }}>
      <div style={{ textAlign: 'center', background: '#fff', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Password set!</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>You can now sign in to Staff Hub.</div>
        <button onClick={() => window.location.href = '/'} style={{ background: '#2a5f8f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer', width: '100%' }}>
          Go to Staff Hub
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#2a5f8f', marginBottom: 6 }}>Staff Hub</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Set your password to get started</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Create your password</div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: 6 }}>New Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" required
                style={{ width: '100%', background: '#f7f6f2', border: '1px solid #e8e6e0', borderRadius: 8, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '10px 14px', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#2a5f8f')}
                onBlur={e => (e.target.style.borderColor = '#e8e6e0')}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: 6 }}>Confirm Password</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password" required
                style={{ width: '100%', background: '#f7f6f2', border: '1px solid #e8e6e0', borderRadius: 8, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '10px 14px', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#2a5f8f')}
                onBlur={e => (e.target.style.borderColor = '#e8e6e0')}
              />
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', background: '#2a5f8f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? 'Setting password…' : 'Set Password & Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
