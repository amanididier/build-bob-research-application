'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifaciamypmltreaefra.supabase.co'
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR'

export function AuthCallbackClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [message, setMessage] = useState('Finishing sign-in…')

  useEffect(() => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'bob_web_supabase_auth',
      },
    })

    const finish = async () => {
      try {
        const code = params.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setMessage(error.message || 'Sign-in could not be completed.')
            return
          }
        } else {
          const { data, error } = await supabase.auth.getSession()
          if (error || !data.session) {
            setMessage('No sign-in session was returned. Go back and try again.')
            return
          }
        }

        const { data } = await supabase.auth.getSession()
        const user = data.session?.user
        const email = user?.email || ''
        const name =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.display_name ||
          (email ? email.split('@')[0] : 'Researcher')

        if (params.get('source') === 'desktop' || params.get('from') === 'desktop') {
          setMessage('Signed in. Opening Bob…')
          const payload = encodeURIComponent(JSON.stringify({ email, name, at: Date.now() }))
          try {
            window.location.href = `bob://auth/callback?payload=${payload}`
          } catch {}
          setTimeout(() => {
            setMessage('Signed in. You can close this tab and return to the Bob app.')
          }, 1500)
          return
        }

        router.replace('/')
        router.refresh()
      } catch (e: any) {
        setMessage(e?.message || 'Sign-in failed.')
      }
    }

    void finish()
  }, [params, router])

  return <p className="bob-login-lede">{message}</p>
}
