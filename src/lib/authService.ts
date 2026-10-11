/**
 * Bob authentication — Supabase Auth (email/password + Google OAuth).
 * Gemini BYOK keys stay local and are never written to Supabase profiles.
 */

import { getSupabase, getSupabaseProjectUrl } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface BobUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  provider: 'email' | 'google' | 'unknown';
  createdAt: string;
}

const SESSION_KEY = 'bob_auth_user';
const EMAIL_KEY = 'bob_user_email';
const AVATAR_KEY = 'bob_user_avatar';
const NAME_KEY = 'bob_user_name';

function mapUser(user: User): BobUser {
  const meta = user.user_metadata || {};
  const provider =
    user.app_metadata?.provider === 'google' || meta.iss?.includes('google')
      ? 'google'
      : user.app_metadata?.provider === 'email' || !user.app_metadata?.provider
      ? 'email'
      : (user.app_metadata?.provider as string) === 'google'
      ? 'google'
      : 'email';

  return {
    id: user.id,
    name:
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      (user.email ? user.email.split('@')[0] : 'Friend'),
    email: user.email || '',
    avatarUrl: meta.avatar_url || meta.picture || '',
    provider: provider === 'google' ? 'google' : 'email',
    createdAt: user.created_at || new Date().toISOString(),
  };
}

function persistLocal(user: BobUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(EMAIL_KEY, user.email);
  if (user.name) localStorage.setItem(NAME_KEY, user.name);
  if (user.avatarUrl) localStorage.setItem(AVATAR_KEY, user.avatarUrl);
  else localStorage.removeItem(AVATAR_KEY);
}

function clearLocal(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  // Keep name for UX; clear email/avatar on explicit sign-out only for auth fields
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(AVATAR_KEY);
}

/** Cached session from last successful auth (may be stale offline). */
export function getSession(): BobUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as BobUser;
  } catch {}
  return null;
}

/** Refresh session from Supabase. */
export async function refreshSession(): Promise<BobUser | null> {
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error || !data.session?.user) {
      return getSession();
    }
    const bob = mapUser(data.session.user);
    persistLocal(bob);
    return bob;
  } catch {
    return getSession();
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ user: BobUser; needsEmailVerification: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('That email address does not look valid.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { data, error } = await getSupabase().auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: name.trim() || cleanEmail.split('@')[0],
        name: name.trim() || cleanEmail.split('@')[0],
      },
    },
  });

  if (error) {
    // Safe messages — avoid account enumeration detail where possible
    if (/already|registered|exists/i.test(error.message)) {
      throw new Error('An account with that email may already exist. Try signing in.');
    }
    throw new Error(error.message || 'Could not create account.');
  }

  if (!data.user) {
    throw new Error('Sign-up did not return a user. Check your email for a verification link.');
  }

  const bob = mapUser(data.user);
  if (name.trim()) bob.name = name.trim();

  // Session may be null when email confirmation is required
  const needsEmailVerification = !data.session;
  if (data.session) {
    persistLocal(bob);
  }

  return { user: bob, needsEmailVerification };
}

export async function signInWithEmail(email: string, password: string): Promise<BobUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    if (/invalid|credentials|password/i.test(error.message)) {
      throw new Error('Invalid email or password.');
    }
    if (/confirm|verify|email/i.test(error.message)) {
      throw new Error('Please verify your email before signing in. Check your inbox.');
    }
    throw new Error(error.message || 'Sign-in failed.');
  }

  if (!data.user) throw new Error('Sign-in failed.');
  const bob = mapUser(data.user);
  persistLocal(bob);
  return bob;
}

/**
 * Google OAuth via Supabase.
 * Requires Google provider enabled in the Supabase dashboard with valid OAuth client credentials.
 */
export async function signInWithGoogle(): Promise<{ redirected: boolean; user?: BobUser }> {
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname || '/'}`
      : undefined;

  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    const msg = error.message || '';
    if (/provider|not enabled|unsupported/i.test(msg)) {
      throw new Error(
        'Google sign-in is not enabled yet. In the Supabase dashboard: Authentication → Providers → Google — add your Google OAuth Client ID and Secret, then add this app URL to Redirect URLs.'
      );
    }
    throw new Error(msg || 'Google sign-in failed.');
  }

  // Browser redirects away; if we somehow get a session without redirect, map it
  if (data?.url && typeof window !== 'undefined') {
    // Supabase returns a URL — the client usually navigates automatically.
    // If not, caller can open data.url.
    return { redirected: true };
  }

  const session = await getSupabase().auth.getSession();
  if (session.data.session?.user) {
    const bob = mapUser(session.data.session.user);
    persistLocal(bob);
    return { redirected: false, user: bob };
  }

  return { redirected: true };
}

export async function signOut(): Promise<void> {
  try {
    await getSupabase().auth.signOut();
  } catch {}
  clearLocal();
}

export async function resetPassword(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!clean) throw new Error('Enter your email address.');
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const { error } = await getSupabase().auth.resetPasswordForEmail(clean, {
    redirectTo,
  });
  if (error) throw new Error(error.message || 'Could not send reset email.');
}

/** Subscribe to auth state changes. */
export function onAuthStateChange(
  cb: (user: BobUser | null) => void
): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session: Session | null) => {
    if (session?.user) {
      const bob = mapUser(session.user);
      persistLocal(bob);
      cb(bob);
    } else {
      clearLocal();
      cb(null);
    }
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

export function getAuthConfigStatus(): {
  projectUrl: string;
  googleConfiguredHint: string;
} {
  return {
    projectUrl: getSupabaseProjectUrl(),
    googleConfiguredHint:
      'Google OAuth works only after you enable the Google provider in Supabase (Authentication → Providers) with a Google Cloud OAuth client and authorized redirect URLs for this app.',
  };
}

// Backward-compatible aliases used by older UI
export async function signInOrSignUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<BobUser> {
  // Prefer sign-in if account exists; otherwise sign-up
  try {
    return await signInWithEmail(email, password);
  } catch {
    const { user, needsEmailVerification } = await signUpWithEmail(name, email, password);
    if (needsEmailVerification) {
      throw new Error(
        'Account created. Check your email to verify, then sign in.'
      );
    }
    return user;
  }
}
