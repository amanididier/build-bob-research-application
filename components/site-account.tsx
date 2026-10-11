'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getWebSupabase } from '@/lib/supabase-browser'

export function SiteAccount() {
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = getWebSupabase()
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await getWebSupabase().auth.signOut()
    setEmail(null)
    window.location.href = '/'
  }

  if (!ready) return <span className="download-signin">…</span>
  if (!email) return <Link className="download-signin" href="/sign-in">Sign in</Link>

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Link className="download-signin" href="/account">{email}</Link>
      <button type="button" className="download-signin" onClick={signOut} style={{ cursor: 'pointer', background: 'transparent' }}>Sign out</button>
    </span>
  )
}
