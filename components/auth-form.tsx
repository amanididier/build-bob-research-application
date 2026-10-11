'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type AuthFormProps = { mode: 'sign-in' | 'sign-up' }

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifaciamypmltreaefra.supabase.co'
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR'

function getBrowserSupabase(): SupabaseClient {
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

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const params = useSearchParams()
  const fromDesktop = params.get('source') === 'desktop'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (step === 'code') inputs.current[0]?.focus()
  }, [step])

  function callbackUrl() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://build-bob-research-application.vercel.app'
    const q = fromDesktop ? '?source=desktop' : ''
    return `${origin}/auth/callback${q}`
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    setPending(true)
    setError('')
    setInfo('')
    const supabase = getBrowserSupabase()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: callbackUrl(),
        data: name.trim() ? { full_name: name.trim(), name: name.trim() } : undefined,
      },
    })
    setPending(false)
    if (otpError) {
      setError(otpError.message || 'Could not send the code. Try again in a moment.')
      return
    }
    setStep('code')
    setInfo('We sent a 6-digit code. It expires in a few minutes.')
  }

  async function verifyCode(code: string) {
    if (code.length !== 6) return
    setPending(true)
    setError('')
    const supabase = getBrowserSupabase()
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    })
    setPending(false)
    if (verifyError || !data.session) {
      setError(verifyError?.message || 'That code did not match. Request a new one.')
      setDigits(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
      return
    }
    setStep('done')
    if (fromDesktop) return
    router.push('/')
    router.refresh()
  }

  function onDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < 5) inputs.current[index + 1]?.focus()
    const code = next.join('')
    if (code.length === 6 && !next.includes('')) void verifyCode(code)
  }

  function onKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function onPaste(text: string) {
    const chars = text.replace(/\D/g, '').slice(0, 6).split('')
    if (!chars.length) return
    const next = ['', '', '', '', '', '']
    chars.forEach((c, i) => { next[i] = c })
    setDigits(next)
    if (chars.length === 6) void verifyCode(chars.join(''))
  }

  async function continueWithGoogle() {
    setPending(true)
    setError('')
    const supabase = getBrowserSupabase()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl(),
        queryParams: { prompt: 'select_account' },
      },
    })
    if (oauthError) {
      setPending(false)
      setError(
        oauthError.message.includes('provider')
          ? 'Google is not enabled yet. In Supabase: Authentication → Providers → Google, then paste your Google Client ID and Secret. The Google Cloud redirect URI must be https://kifaciamypmltreaefra.supabase.co/auth/v1/callback'
          : oauthError.message
      )
    }
  }

  if (step === 'done' && fromDesktop) {
    return (
      <div className="auth-form">
        <p className="form-error" style={{ color: '#067647' }}>You are signed in.</p>
        <p className="auth-copy">You can close this tab and return to the Bob desktop app. Download stays on the home page if you still need the installer.</p>
        <a className="download-button" href="/">Back to download</a>
      </div>
    )
  }

  return (
    <div className="auth-form">
      <button type="button" onClick={continueWithGoogle} disabled={pending}>
        Continue with Google
      </button>
      <p className="auth-copy">Google signs you in immediately. No extra code.</p>

      {step === 'email' ? (
        <form onSubmit={sendCode}>
          {mode === 'sign-up' && (
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          )}
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={pending}>{pending ? 'Sending…' : mode === 'sign-up' ? 'Email me a code' : 'Email me a sign-in code'}</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void verifyCode(digits.join('')) }}>
          <p className="auth-copy">Enter the 6-digit code sent to {email}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={(e) => { e.preventDefault(); onPaste(e.clipboardData.getData('text')) }}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputs.current[index] = el }}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                aria-label={`Digit ${index + 1}`}
                onChange={(e) => onDigit(index, e.target.value)}
                onKeyDown={(e) => onKeyDown(index, e.key)}
                style={{
                  width: 44,
                  height: 52,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 12,
                  border: '1px solid #d8d8d1',
                }}
              />
            ))}
          </div>
          {info && <p className="auth-copy">{info}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={pending || digits.join('').length < 6}>{pending ? 'Checking…' : 'Verify and continue'}</button>
          <button type="button" onClick={() => { setStep('email'); setDigits(['', '', '', '', '', '']); setError('') }} disabled={pending}>Use a different email</button>
        </form>
      )}
    </div>
  )
}
