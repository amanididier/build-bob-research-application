import React, { useState } from 'react';
import { X, Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; name: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'options' | 'email'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const user = { email: 'user@gmail.com', name: 'Google User' };
    localStorage.setItem('bob_auth_user', JSON.stringify(user));
    setLoading(false);
    onSuccess(user);
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const user = { email, name: email.split('@')[0] };
    localStorage.setItem('bob_auth_user', JSON.stringify(user));
    setLoading(false);
    onSuccess(user);
    onClose();
  };

  const handleGuestContinue = () => {
    localStorage.setItem('bob_auth_user', JSON.stringify({ email: 'guest@bob.local', name: 'Researcher (Guest)' }));
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[420px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-3xl p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[var(--m)] hover:text-[var(--t)] p-1 rounded-full hover:bg-[var(--s2)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--ys)] text-[#765700] mx-auto flex items-center justify-center font-bold text-xl mb-3 shadow-inner">
            B
          </div>
          <h3 className="text-[20px] font-extrabold tracking-tight text-[var(--t)]">
            Save your research workspace
          </h3>
          <p className="text-[12.5px] text-[var(--m)] leading-relaxed max-w-[320px] mx-auto">
            Sync your notes, browser tabs, and research memory across all your sessions.
          </p>
        </div>

        {mode === 'options' ? (
          <div className="space-y-3">
            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border border-[var(--line)] hover:bg-[var(--s2)] text-[var(--t)] font-semibold text-[13px] flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            {/* Email Sign-In Toggle */}
            <button
              onClick={() => setMode('email')}
              className="w-full h-11 px-4 rounded-xl bg-[var(--s2)] hover:bg-[var(--line)]/60 text-[var(--t)] font-semibold text-[13px] flex items-center justify-center gap-2.5 transition-colors"
            >
              <Mail className="w-4 h-4 text-[var(--m)]" />
              <span>Continue with Email</span>
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={handleGuestContinue}
                className="text-[12px] font-medium text-[var(--m)] hover:text-[var(--t)] hover:underline"
              >
                Continue as Guest for now
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-semibold text-[var(--m)] block mb-1">Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[var(--m)] absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-10 pl-9 pr-3 text-[13px] rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[var(--t)] outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--m)] block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[var(--m)] absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-10 pl-9 pr-3 text-[13px] rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[var(--t)] outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-[13px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{loading ? 'Signing in...' : 'Sign In & Sync'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMode('options')}
              className="w-full text-center text-[11px] text-[var(--m)] hover:text-[var(--t)] pt-1"
            >
              ← Back to options
            </button>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-[var(--line)] text-center text-[10.5px] text-[var(--m)]">
          Free and private by design · No credit card required
        </div>
      </div>
    </div>
  );
};
