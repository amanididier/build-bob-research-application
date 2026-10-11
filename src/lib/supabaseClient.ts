/**
 * Supabase browser client for Bob.
 * Uses the project URL + publishable (anon) key from env / defaults.
 * Never put a service-role key here.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://kifaciamypmltreaefra.supabase.co';
const DEFAULT_KEY = 'sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR';

function resolveUrl(): string {
  try {
    const env = (import.meta as any).env;
    return (env?.VITE_SUPABASE_URL || env?.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL).trim();
  } catch {
    return DEFAULT_URL;
  }
}

function resolveKey(): string {
  try {
    const env = (import.meta as any).env;
    return (
      env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env?.VITE_SUPABASE_ANON_KEY ||
      DEFAULT_KEY
    ).trim();
  } catch {
    return DEFAULT_KEY;
  }
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(resolveUrl(), resolveKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'bob_supabase_auth',
      },
    });
  }
  return client;
}

export function getSupabaseProjectUrl(): string {
  return resolveUrl();
}
