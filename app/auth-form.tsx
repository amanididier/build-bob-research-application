'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifaciamypmltreaefra.supabase.co'
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR'

type AuthFormProps = { mode: 'sign-in' | 'sign-up' }

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'bob_web_supabase_auth',
    },
  })
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const params = useSearchParams()
  const fromDesktop = params.get('source') === 'desktop' || params.get('from') === 'desktop'
  const returnTo = params.get('return') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [info, setInfo] = useState('')

  const callbackUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const u = new URL('/auth/callback', window.location.origin)
    if (fromDesktop) u.searchParams.set('source', 'desktop')
    if (returnTo) u.searchParams.set('return', returnTo)
    return u.toString()
  }, [fromDesktop, returnTo])

  async function finishDesktop(sessionEmail?: string | null, displayName?: string | null) {
    setInfo('Signed in. Opening Bob…')
    // Deep-link back into the desktop app with a light handshake payload
    const payload = encodeURIComponent(
      JSON.stringify({
        email: sessionEmail || email,
        name: displayName || name || (sessionEmail || email).split('@')[0],
        at: Date.now(),
      })
    )
    const deep = `bob://auth/callback?payload=${payload}`
    try {
      window.location.href = deep
    } catch {}
    // Fallback message if protocol handler not registered
    setTimeout(() => {
      setInfo('Signed in. You can close this tab and return to the Bob desktop app.')
    }, 1200)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setInfo('')
    const supabase = getSupabase()

    try {
      if (mode === 'sign-up') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: name.trim() || email.split('@')[0],
              full_name: name.trim() || email.split('@')[0],
            },
            emailRedirectTo: callbackUrl,
          },
        })
        if (err) {
          setError(err.message)
          return
        }
        if (data.session) {
          if (fromDesktop) {
            await finishDesktop(data.user?.email, name.trim())
          } else {
            router.push('/')
            router.refresh()
          }
        } else {
          setInfo('Check your email to confirm your account, then sign in.')
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (err) {
          setError(err.message)
          return
        }
        if (fromDesktop) {
          await finishDesktop(
            data.user?.email,
            data.user?.user_metadata?.full_name || data.user?.user_metadata?.display_name
          )
        } else {
          router.push('/')
          router.refresh()
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleGoogle() {
    setPending(true)
    setError('')
    const supabase = getSupabase()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined),
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (err) {
      setError(err.message)
      setPending(false)
    }
  }

  return (
    <form className="bob-login-form" onSubmit={handleSubmit}>
      {mode === 'sign-up' && (
        <label className="bob-login-label">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            autoComplete="name"
          />
        </label>
      )}
      <label className="bob-login-label">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@email.com"
          autoComplete="email"
        />
      </label>
      <label className="bob-login-label">
        Password
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
        />
      </label>

      {error && (
        <p className="bob-login-error" role="alert">
          {error}
        </p>
      )}
      {info && <p className="bob-login-info">{info}</p>}

      <button type="submit" className="bob-login-primary" disabled={pending}>
        {pending ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>

      <div className="bob-login-divider">
        <span>or</span>
      </div>

      <button type="button" className="bob-login-google" onClick={handleGoogle} disabled={pending}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.1 4 9.2 8.5 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.2v5.1C9.1 39.4 16 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l.1.1 6.3 5.2C39.2 37.3 44 33 44 24c0-1.3-.1-2.5-.4-3.5z" />
        </svg>
        Continue with Google
      </button>

      {fromDesktop && (
        <p className="bob-login-desktop-hint">You’ll return to the Bob desktop app after signing in.</p>
      )}
    </form>
  )
}
