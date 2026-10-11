'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifaciamypmltreaefra.supabase.co'
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR'

let client: SupabaseClient | null = null

export function getWebSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'bob_web_supabase_auth',
      },
    })
  }
  return client
}

export function authCallbackUrl(fromDesktop: boolean) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://build-bob-research-application.vercel.app'
  return `${origin}/auth/callback${fromDesktop ? '?source=desktop' : ''}`
}
