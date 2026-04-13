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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (!session) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/profile', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })

        if (!mounted) return

        if (!res.ok) {
          setNoProfile(true)
        } else {
          const data = await res.json()
          if (data?.profile) {
            setProfile(data.profile as StaffProfile)
          } else {
            setNoProfile(true)
          }
        }
      } catch {
        if (mounted) setNoProfile(true)
      }

      if (mounted) setLoading(false)
    })

    return () => { mounted = false }
  }, [])

  const handleSignOut = () => {
    supabase.auth.signOut().then(() => window.location.reload())
  }

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
          onClick={handleSignOut}
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
    return <AdminPortal profile={profile} onSignOut={handleSignOut} />
  }

  return <StaffPortal profile={profile} onSignOut={handleSignOut} />
}
