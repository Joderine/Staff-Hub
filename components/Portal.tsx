'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile } from '@/lib/types'
import LoginScreen from './LoginScreen'
import StaffPortal from './StaffPortal'
import AdminPortal from './AdminPortal'

export default function Portal() {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [noProfile, setNoProfile] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) { setLoading(false); return }
      supabase.from('staff_profiles').select('*').eq('id', session.user.id).single()
        .then(({ data, error }) => {
          if (!mounted) return
          if (error || !data) setNoProfile(true)
          else setProfile(data as StaffProfile)
          setLoading(false)
        })
    })
    return () => { mounted = false }
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.65s linear infinite' }} />
    </div>
  )

  if (noProfile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18 }}>Profile not found</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Contact your administrator.</div>
      <button onClick={() => { supabase.auth.signOut(); window.location.reload() }}
        style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        Sign out
      </button>
    </div>
  )

  if (!profile) return <LoginScreen />

  if (profile.role === 'admin') return (
    <AdminPortal profile={profile} onSignOut={() => { supabase.auth.signOut(); window.location.reload() }} />
  )
  return (
    <StaffPortal profile={profile} onSignOut={() => { supabase.auth.signOut(); window.location.reload() }} />
  )
}
