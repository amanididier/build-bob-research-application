'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifaciamypmltreaefra.supabase.co'
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR'

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'bob_web_supabase_auth',
    },
  })
}

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        const user = data.session?.user
        setEmail(user?.email ?? null)
        const meta = user?.user_metadata || {}
        setName(meta.full_name || meta.name || '')
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  async function signOut() {
    await getSupabase().auth.signOut()
    window.location.href = '/'
  }

  return (
    <main className="bob-login-page">
      <div className="bob-login-bg" aria-hidden />
      <div className="bob-login-scrim" aria-hidden />
      <section className="bob-login-card">
        <h1>Account</h1>
        {!ready ? (
          <p className="bob-login-lede">Loading…</p>
        ) : email ? (
          <>
            <p className="bob-login-lede">{name ? `${name} · ` : ''}{email}</p>
            <button type="button" className="bob-login-primary" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="bob-login-lede">You are not signed in.</p>
            <Link href="/sign-in" className="bob-login-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              Sign in
            </Link>
          </>
        )}
        <p className="bob-login-switch">
          <Link href="/">← Home</Link>
        </p>
      </section>
    </main>
  )
}
