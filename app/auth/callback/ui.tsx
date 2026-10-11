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

      if (params.get('source') === 'desktop') {
        setMessage('Signed in. You can close this tab and return to the Bob app.')
        return
      }
      router.replace('/')
      router.refresh()
    }

    void finish()
  }, [params, router])

  return <p className="auth-copy">{message}</p>
}
