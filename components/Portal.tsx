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

  useEffect(() => {
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => checkSession())
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data } = await supabase.from('staff_profiles').select('*').eq('id', session.user.id).single()
      setProfile(data as StaffProfile)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.65s linear infinite' }} />
    </div>
  )

  if (!profile) return <LoginScreen />
  if (profile.role === 'admin') return <AdminPortal profile={profile} onSignOut={() => { supabase.auth.signOut(); setProfile(null) }} />
  return <StaffPortal profile={profile} onSignOut={() => { supabase.auth.signOut(); setProfile(null) }} />
}
