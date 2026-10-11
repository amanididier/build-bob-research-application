'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getWebSupabase } from '@/lib/supabase-browser'

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getWebSupabase().auth.getSession().then(({ data }) => {
      const user = data.session?.user
      setEmail(user?.email ?? null)
      const meta = user?.user_metadata || {}
      setName(meta.full_name || meta.name || '')
      setReady(true)
    })
  }, [])

  async function signOut() {
    await getWebSupabase().auth.signOut()
    window.location.href = '/'
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Bob Research System</p>
        <h1>Your account</h1>
        {!ready ? <p className="auth-copy">Checking your session…</p> : email ? (
          <>
            <p className="auth-copy">{name ? `${name} · ` : ''}{email}</p>
            <button type="button" onClick={signOut} style={{ width: '100%', border: 0, borderRadius: 12, background: '#171717', color: '#fff', padding: 12, fontWeight: 700, cursor: 'pointer' }}>Sign out</button>
          </>
        ) : (
          <p className="auth-copy">You are not signed in. <Link href="/sign-in">Sign in</Link></p>
        )}
        <p className="auth-switch"><Link href="/">Back to download</Link></p>
      </section>
    </main>
  )
}
