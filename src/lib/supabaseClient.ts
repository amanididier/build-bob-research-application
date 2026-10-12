/**
 * Supabase Client & Authentication Service
 * 
 * Configured with the official Supabase credentials:
 * Project URL: https://kifaciamypmltreaefra.supabase.co
 * Publishable Key: sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = 
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  'https://kifaciamypmltreaefra.supabase.co';

const SUPABASE_KEY = 
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_a6eTecsGFDufThqb0moObQ_HQuaJxuR';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string | null;
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign in' };
  }
}

/**
 * Sign up with Email, Password and Display Name
 */
export async function signUpWithEmail(
  email: string, 
  password: string, 
  displayName?: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          full_name: displayName || email.split('@')[0],
        },
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign up' };
  }
}

/**
 * Sign in with Google via Supabase OAuth
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string | null }> {
  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Google authentication error' };
  }
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign out' };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
