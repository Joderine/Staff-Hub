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
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetchProfile(session.user.id)
    } else {
      setLoading(false)
    }
  }

  async function fetchProfile(userId: string) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.error('Profile error:', error)
        setNoProfile(true)
      } else {
        setProfile(data as StaffProfile)
      }
    } catch (e) {
      console.error('Fetch error:', e)
      setNoProfile(true)
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.65s linear infinite' }} />
    </div>
  )

  if (noProfile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, color: 'var(--text)' }}>Profile not found</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Your account exists but has no profile. Contact your administrator.</div>
      <button onClick={() => { supabase.auth.signOut(); setNoProfile(false) }} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        Sign out
      </button>
    </div>
  )

  if (!profile) return <LoginScreen />
  if (profile.role === 'admin') return <AdminPortal profile={profile} onSignOut={() => { supabase.auth.signOut(); setProfile(null) }} />
  return <StaffPortal profile={profile} onSignOut={() => { supabase.auth.signOut(); setProfile(null) }} />
}
