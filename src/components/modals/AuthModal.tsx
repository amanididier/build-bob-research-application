import React, { useRef, useState } from 'react';
import { X, Mail, Loader2, AlertCircle } from 'lucide-react';
import { getSupabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';

const WEB_AUTH = 'https://build-bob-research-application.vercel.app/sign-in?source=desktop';
const WEB_SIGNUP = 'https://build-bob-research-application.vercel.app/sign-up?source=desktop';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function openSite(url: string) {
  const bob = typeof window !== 'undefined' ? (window as any).bob : null;
  if (bob?.openExternal) {
    void bob.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { setUserName, setUserEmail, setUserAvatar } = useApp();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'choose' | 'code'>('choose');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sendCode = async () => {
    setLoading(true);
    setError(null);
    const { error: otpError } = await getSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStep('code');
  };

  const verify = async (code: string) => {
    setLoading(true);
    setError(null);
    const { data, error: verifyError } = await getSupabase().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    });
    setLoading(false);
    if (verifyError || !data.user) {
      setError(verifyError?.message || 'Code did not match.');
      return;
    }
    const meta = data.user.user_metadata || {};
    setUserEmail(data.user.email || email);
    setUserName(meta.full_name || meta.name || (data.user.email || '').split('@')[0]);
    if (meta.avatar_url || meta.picture) setUserAvatar(meta.avatar_url || meta.picture);
    onSuccess?.();
    onClose();
  };

  const onDigit = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) inputs.current[index + 1]?.focus();
    if (next.every(Boolean)) void verify(next.join(''));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-[var(--m)] cursor-pointer"><X className="w-5 h-5" /></button>
        <div>
          <h3 className="text-[18px] font-extrabold text-[var(--t)] m-0">Sign in on the web</h3>
          <p className="text-[12.5px] text-[var(--m)] mt-1 mb-0">Bob opens the website so you can sign in with Google instantly, or with an email code, and download the app from the same place.</p>
        </div>
        <button type="button" onClick={() => openSite(WEB_AUTH)} className="w-full h-11 rounded-2xl bg-[var(--y)] text-[#171717] font-bold text-[13px] cursor-pointer">Continue to bob.build sign-in</button>
        <button type="button" onClick={() => openSite(WEB_SIGNUP)} className="w-full h-11 rounded-2xl border border-[var(--line)] text-[var(--t)] font-semibold text-[13px] cursor-pointer">Create an account on the website</button>

        <div className="flex items-center gap-3 text-[11px] text-[var(--m)]"><span className="flex-1 h-px bg-[var(--line)]" />or code in this app<span className="flex-1 h-px bg-[var(--line)]" /></div>

        {step === 'choose' ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void sendCode(); }}>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[var(--m)] absolute left-3 top-3.5" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for a 6-digit code" className="w-full h-11 pl-9 pr-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none" />
            </div>
            {error && <p className="text-[12px] text-red-600 m-0 flex gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-11 rounded-2xl border border-[var(--line)] font-bold text-[13px] text-[var(--t)] cursor-pointer">{loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Email me a code'}</button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center gap-2">
              {digits.map((digit, index) => (
                <input key={index} ref={(el) => { inputs.current[index] = el; }} value={digit} inputMode="numeric" maxLength={1} aria-label={`Digit ${index + 1}`} onChange={(e) => onDigit(index, e.target.value)} className="w-11 h-12 text-center text-[20px] font-bold rounded-xl border border-[var(--line)] bg-[var(--s2)] text-[var(--t)]" />
              ))}
            </div>
            {error && <p className="text-[12px] text-red-600 m-0">{error}</p>}
            <button type="button" onClick={() => setStep('choose')} className="text-[12px] text-[var(--m)] cursor-pointer">Use a different email</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
