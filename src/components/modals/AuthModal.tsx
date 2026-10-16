import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle as supabaseGoogleSignIn,
  supabase,
} from '../../lib/supabaseClient';
import sunflowerMorning from '../../assets/images/sunflower_garden_morning_user.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; name: string }) => void;
}

/** Prefer opening the website login so OAuth / email confirm works, then deep-link back */
function websiteLoginUrl(mode: 'sign-in' | 'sign-up') {
  const base =
    (import.meta as any).env?.VITE_BOB_WEB_URL ||
    'https://bob-research.vercel.app';
  const path = mode === 'sign-up' ? '/sign-up' : '/sign-in';
  try {
    const u = new URL(path, base);
    u.searchParams.set('source', 'desktop');
    return u.toString();
  } catch {
    return `${base}${path}?source=desktop`;
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const clearGuestMarkers = () => {
    localStorage.removeItem('bob_guest_mode');
    localStorage.removeItem('bob_guest_chat_count');
    localStorage.removeItem('bob_guest_auth_prompted');
  };

  const persistUser = (authUser: { email: string; name: string }) => {
    clearGuestMarkers();
    localStorage.setItem('bob_auth_user', JSON.stringify(authUser));
    localStorage.setItem('bob_user_email', authUser.email);
    if (authUser.name) localStorage.setItem('bob_user_name', authUser.name);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // In Electron / desktop, browser OAuth is more reliable via the website
      const isElectron = typeof window !== 'undefined' && !!(window as any).bob;
      if (isElectron) {
        const url = websiteLoginUrl(tab === 'signup' ? 'sign-up' : 'sign-in');
        if ((window as any).bob?.openExternal) {
          await (window as any).bob.openExternal(url);
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        setInfoMsg('Complete Google sign-in in your browser. You’ll return here automatically.');
        setLoading(false);
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: origin,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        setErrorMsg(error.message);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Google sign-in failed. Try email instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    const displayName = name.trim() || cleanEmail.split('@')[0];

    try {
      if (tab === 'signup') {
        const res = await signUpWithEmail(cleanEmail, password, displayName);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create account.');
        } else if (!res.session || !res.user) {
          // Align with PR #7: never mark signed-in without an active Supabase session
          setInfoMsg('Check your email to confirm your account, then sign in.');
        } else {
          const authUser = {
            email: res.user.email || cleanEmail,
            name:
              res.user.user_metadata?.full_name ||
              res.user.user_metadata?.display_name ||
              displayName,
          };
          persistUser(authUser);
          setInfoMsg('Account created. Welcome!');
          setTimeout(() => {
            onSuccess(authUser);
            onClose();
          }, 500);
        }
      } else {
        const res = await signInWithEmail(cleanEmail, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Invalid email or password.');
        } else if (!res.session || !res.user) {
          setErrorMsg('Supabase did not return an active session. Confirm your email or try again.');
        } else {
          const authUser = {
            email: res.user.email || cleanEmail,
            name:
              res.user.user_metadata?.full_name ||
              res.user.user_metadata?.display_name ||
              displayName,
          };
          persistUser(authUser);
          setInfoMsg('Signed in successfully.');
          setTimeout(() => {
            onSuccess(authUser);
            onClose();
          }, 500);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openOnWebsite = () => {
    const url = websiteLoginUrl(tab === 'signup' ? 'sign-up' : 'sign-in');
    if ((window as any).bob?.openExternal) {
      (window as any).bob.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[400px] rounded-[28px] overflow-hidden shadow-2xl border border-white/40">
        {/* Sunflower garden background */}
        <img
          src={sunflowerMorning}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/50" />

        <div className="relative m-3 sm:m-4 rounded-[22px] bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md p-6 sm:p-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-800 p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
            title="Close"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-9 h-9 rounded-xl bg-neutral-900 text-[#f5c842] grid place-items-center font-black text-lg">
              B
            </span>
            <span className="text-[14px] font-bold text-neutral-900 dark:text-white">Bob</span>
          </div>

          <h3 className="text-[22px] font-bold tracking-tight text-neutral-900 dark:text-white m-0">
            {tab === 'signin' ? 'Welcome back' : 'Create account'}
          </h3>
          <p className="text-[13px] text-neutral-500 mt-1.5 mb-5 m-0">
            {tab === 'signin'
              ? 'Sign in to sync your workspace.'
              : 'Save projects, notes, and progress across devices.'}
          </p>

          <div className="flex p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 h-9 rounded-full text-[12.5px] font-semibold transition-all ${
                tab === 'signin' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 h-9 rounded-full text-[12.5px] font-semibold transition-all ${
                tab === 'signup' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'signup' && (
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-[13.5px] outline-none focus:border-[#f5c842] focus:ring-2 focus:ring-[#f5c842]/25"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-[13.5px] outline-none focus:border-[#f5c842] focus:ring-2 focus:ring-[#f5c842]/25"
              />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                minLength={8}
                required
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-[13.5px] outline-none focus:border-[#f5c842] focus:ring-2 focus:ring-[#f5c842]/25"
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 text-[12px] text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {infoMsg && (
              <div className="flex items-start gap-2 text-[12px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[13.5px] font-semibold disabled:opacity-50"
            >
              {loading ? 'Working…' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4 text-[11px] text-neutral-400">
            <span className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
            or
            <span className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px] font-semibold text-neutral-800 dark:text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.1 4 9.2 8.5 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.2v5.1C9.1 39.4 16 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l.1.1 6.3 5.2C39.2 37.3 44 33 44 24c0-1.3-.1-2.5-.4-3.5z" />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={openOnWebsite}
            className="mt-3 w-full text-center text-[11.5px] text-neutral-500 hover:text-neutral-800 font-medium"
          >
            Open full login in browser
          </button>
        </div>
      </div>
    </div>
  );
};
