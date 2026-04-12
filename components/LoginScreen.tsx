'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isReset, setIsReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--accent)', marginBottom: 6 }}>Staff Hub</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>MAH & HPVC Staff Portal</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {resetSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>We sent a reset link to {email}</div>
              <button onClick={() => { setIsReset(false); setResetSent(false) }} style={ghostBtn}>Back to login</button>
            </div>
          ) : (
            <form onSubmit={isReset ? handleReset : handleLogin}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>
                {isReset ? 'Reset password' : 'Sign in'}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
              {!isReset && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                </div>
              )}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading ? <Spinner /> : isReset ? 'Send reset link' : 'Sign in'}
              </button>
              <button type="button" onClick={() => { setIsReset(!isReset); setError('') }} style={{ ...ghostBtn, marginTop: 12 }}>
                {isReset ? 'Back to login' : 'Forgot password?'}
              </button>
            </form>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--dim)' }}>
          Don't have an account? Contact your manager.
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '10px 14px', outline: 'none', transition: 'border-color 0.18s' }
const labelStyle: React.CSSProperties = { display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6 }
const primaryBtn: React.CSSProperties = { width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const ghostBtn: React.CSSProperties = { width: '100%', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }

function Spinner() {
  return <div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.65s linear infinite' }} />
}
