'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authCallbackUrl, getWebSupabase } from '@/lib/supabase-browser'

type AuthFormProps = { mode: 'sign-in' | 'sign-up' }

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
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (step === 'code') inputs.current[0]?.focus()
  }, [step])

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    setPending(true)
    setError('')
    const { error: otpError } = await getWebSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: authCallbackUrl(fromDesktop),
        data: name.trim() ? { full_name: name.trim(), name: name.trim() } : undefined,
      },
    })
    setPending(false)
    if (otpError) {
      setError(otpError.message || 'Could not send the code.')
      return
    }
    setStep('code')
  }

  async function verifyCode(code: string) {
    if (code.length !== 6) return
    setPending(true)
    setError('')
    const { data, error: verifyError } = await getWebSupabase().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    })
    setPending(false)
    if (verifyError || !data.session) {
      setError(verifyError?.message || 'That code did not match.')
      setDigits(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
      return
    }
    setStep('done')
    if (!fromDesktop) {
      router.push('/account')
      router.refresh()
    }
  }

  function onDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < 5) inputs.current[index + 1]?.focus()
    if (next.every(Boolean)) void verifyCode(next.join(''))
  }

  async function continueWithGoogle() {
    setPending(true)
    setError('')
    const { error: oauthError } = await getWebSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authCallbackUrl(fromDesktop),
        queryParams: { prompt: 'select_account' },
      },
    })
    if (oauthError) {
      setPending(false)
      setError(oauthError.message || 'Google sign-in is not available yet.')
    }
  }

  if (step === 'done') {
    return (
      <div className="bob-auth">
        <p className="bob-auth-ok">You are signed in.</p>
        <p className="bob-auth-note">{fromDesktop ? 'Close this tab and return to the Bob desktop app.' : 'Your session is saved in this browser.'}</p>
        <a className="bob-auth-primary" href={fromDesktop ? '/' : '/account'}>{fromDesktop ? 'Back to download' : 'Open account'}</a>
      </div>
    )
  }

  return (
    <div className="bob-auth">
      <button type="button" className="bob-auth-google" onClick={continueWithGoogle} disabled={pending}>
        <GoogleMark /> Continue with Google
      </button>
      <p className="bob-auth-note">Google signs you in immediately, even the first time. No code.</p>
      <div className="bob-auth-or"><span />or email<span /></div>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="bob-auth-fields">
          {mode === 'sign-up' && (
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="What should Bob call you?" /></label>
          )}
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@email.com" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="bob-auth-primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Email me a 6-digit code'}</button>
        </form>
      ) : (
        <form className="bob-auth-fields" onSubmit={(e) => { e.preventDefault(); void verifyCode(digits.join('')) }}>
          <p className="bob-auth-note">Enter the code sent to {email}</p>
          <div className="bob-code" onPaste={(e) => {
            e.preventDefault()
            const chars = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
            const next = ['', '', '', '', '', '']
            chars.forEach((c, i) => { next[i] = c })
            setDigits(next)
            if (chars.length === 6) void verifyCode(chars.join(''))
          }}>
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
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
                }}
              />
            ))}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="bob-auth-primary" type="submit" disabled={pending || digits.join('').length < 6}>{pending ? 'Checking…' : 'Verify and continue'}</button>
          <button type="button" className="bob-auth-quiet" onClick={() => { setStep('email'); setDigits(['', '', '', '', '', '']); setError('') }}>Use a different email</button>
        </form>
      )}
      <style>{`
        .bob-auth { display: flex; flex-direction: column; gap: 12px; }
        .bob-auth-google, .bob-auth-primary, .bob-auth-quiet { font: inherit; cursor: pointer; }
        .bob-auth-google { height: 46px; border-radius: 14px; border: 1px solid #e6e1d6; background: #fff; color: #171717; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .bob-auth-primary { height: 46px; border: 0; border-radius: 14px; background: #171717; color: #fff; font-weight: 700; font-size: 13px; text-decoration: none; display: grid; place-items: center; }
        .bob-auth-quiet { border: 0; background: transparent; color: #77776f; font-size: 12px; }
        .bob-auth-note, .bob-auth-ok { margin: 0; color: #77776f; font-size: 12.5px; line-height: 1.5; }
        .bob-auth-ok { color: #067647; font-weight: 700; }
        .bob-auth-or { display: flex; align-items: center; gap: 10px; color: #a1a198; font-size: 11px; }
        .bob-auth-or span { flex: 1; height: 1px; background: #e6e1d6; }
        .bob-auth-fields { display: flex; flex-direction: column; gap: 10px; }
        .bob-auth-fields label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: #55554e; }
        .bob-auth-fields input { height: 44px; border: 1px solid #e6e1d6; border-radius: 12px; background: #fafaf8; padding: 0 12px; font: inherit; font-size: 14px; font-weight: 500; }
        .bob-code { display: flex; justify-content: space-between; gap: 8px; }
        .bob-code input { width: 46px; height: 56px; text-align: center; font-size: 22px; font-weight: 750; border-radius: 14px; border: 1px solid #e6e1d6; background: #fffdf8; }
        .bob-auth button:disabled { opacity: .6; cursor: wait; }
      `}</style>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
