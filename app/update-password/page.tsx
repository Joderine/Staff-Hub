'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function processToken() {
      // Get the hash from the URL
      const hash = window.location.hash
      
      if (hash && hash.includes('access_token')) {
        // Extract tokens from hash
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            setReady(true)
            setChecking(false)
            return
          }
        }
      }
      
      // Check existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
      } else {
        setError('Invalid or expired invite link. Please ask your manager to resend the invite.')
      }
      setChecking(false)
    }

    processToken()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #e8e6e0', borderTopColor: '#2a5f8f', animation: 'spin 0.65s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'sans-serif' }}>Setting up your account…</div>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2' }}>
      <div style={{ textAlign: 'center', background: '#fff', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', margin: '0 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Password set!</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 1.5 }}>
          You can now sign in to Staff Hub anytime at<br />
          <strong>staff-hub-sigma.vercel.app</strong><br />
          with your email and password.
        </div>
        <button
          onClick={() => window.location.href = '/'}
          style={{ background: '#2a5f8f', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          Go to Staff Hub
        </button>
      </div>
    </div>
  )

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2', padding: 20 }}>
      <div style={{ textAlign: 'center', background: '#fff', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Link expired or invalid</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{error || 'Please ask your manager to resend your invite.'}</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#2a5f8f', marginBottom: 6 }}>Staff Hub</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Create your password to get started</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Create your password</div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                style={{ width: '100%', background: '#f7f6f2', border: '1px solid #e8e6e0', borderRadius: 8, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '10px 14px', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#2a5f8f')}
                onBlur={e => (e.target.style.borderColor = '#e8e6e0')}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
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
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#2a5f8f', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Setting password…' : 'Set Password & Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
