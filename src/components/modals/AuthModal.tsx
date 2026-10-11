import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  getAuthConfigStatus,
} from '../../lib/authService';
import { useApp } from '../../context/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { setUserName, setUserEmail, setUserAvatar } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const applyUser = (u: { name: string; email: string; avatarUrl: string }) => {
    if (u.name) setUserName(u.name);
    if (u.email) setUserEmail(u.email);
    if (u.avatarUrl) setUserAvatar(u.avatarUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const user = await signInWithEmail(email, password);
        applyUser(user);
        onSuccess?.();
        onClose();
      } else {
        const { user, needsEmailVerification } = await signUpWithEmail(name, email, password);
        if (needsEmailVerification) {
          setInfo('Account created. Check your email to verify, then sign in.');
          setMode('signin');
        } else {
          applyUser(user);
          onSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.user) {
        applyUser(result.user);
        onSuccess?.();
        onClose();
      } else if (result.redirected) {
        setInfo('Redirecting to Google… If nothing happens, enable Google in Supabase Auth providers.');
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const status = getAuthConfigStatus();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--m)] hover:text-[var(--t)] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-[18px] font-extrabold text-[var(--t)] m-0">
            {mode === 'signin' ? 'Sign in to Bob' : 'Create your account'}
          </h3>
          <p className="text-[12.5px] text-[var(--m)] mt-1 mb-0">
            Secure session via Supabase. Your Gemini key stays on this device.
          </p>
        </div>

        <div className="grid grid-cols-2 bg-[var(--s2)] p-1 rounded-xl text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'signin' ? 'bg-[var(--s)] text-[var(--t)] shadow-sm' : 'text-[var(--m)]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'signup' ? 'bg-[var(--s)] text-[var(--t)] shadow-sm' : 'text-[var(--m)]'
            }`}
          >
            Sign up
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-11 rounded-2xl border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--line)]/40 text-[var(--t)] font-bold text-[12.5px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-[11px] text-[var(--m)]">
          <span className="flex-1 h-px bg-[var(--line)]" />
          or email
          <span className="flex-1 h-px bg-[var(--line)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <User className="w-3.5 h-3.5 text-[var(--m)] absolute left-3 top-3.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-[var(--m)] absolute left-3 top-3.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]"
            />
          </div>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-[var(--m)] absolute left-3 top-3.5" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full h-11 pl-9 pr-10 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-3 text-[var(--m)] hover:text-[var(--t)] cursor-pointer"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-[11.5px] text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11.5px] text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-2xl bg-[var(--y)] text-[#171717] font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-[10.5px] text-[var(--m)] leading-relaxed m-0">
          Project: <span className="font-mono">{status.projectUrl.replace('https://', '')}</span>
          <br />
          {status.googleConfiguredHint}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
