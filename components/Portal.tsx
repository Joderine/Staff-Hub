'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StaffProfile } from '@/lib/types'
import LoginScreen from './LoginScreen'
import StaffPortal from './StaffPortal'
import AdminPortal from './AdminPortal'

const centerStyle = 'display:flex;align-items:center;justify-content:center;height:100vh;background:#f7f6f2;flex-direction:column;gap:16px;'

export default function Portal() {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [noProfile, setNoProfile] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) {
        setLoading(false)
        return
      }
      supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (!mounted) return
          if (error || !data) setNoProfile(true)
          else setProfile(data as StaffProfile)
          setLoading(false)
        })
    })
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f7f6f2' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #e8e6e0', borderTopColor: '#2a5f8f', animation: 'spin 0.65s linear infinite' }} />
      </div>
    )
  }

  if (noProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f7f6f2', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '18px', fontFamily: 'sans-serif' }}>Profile not found</p>
        <p style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'sans-serif' }}>Contact your administrator.</p>
        <button
          onClick={() => { supabase.auth.signOut(); window.location.reload() }}
          style={{ background: '#2a5f8f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          Sign out
        </button>
      </div>
    )
  }

  if (!profile) {
    return <LoginScreen />
  }

  if (profile.role === 'admin') {
    return (
      <AdminPortal
        profile={profile}
        onSignOut={() => { supabase.auth.signOut(); window.location.reload() }}
      />
    )
  }

  return (
    <StaffPortal
      profile={profile}
      onSignOut={() => { supabase.auth.signOut(); window.location.reload() }}
    />
  )
}
