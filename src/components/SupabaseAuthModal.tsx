import { useState } from 'react';
import { 
  X, 
  Cloud, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Mail, 
  Key, 
  Server,
  Layers
} from 'lucide-react';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  isSupabaseConnected: boolean;
}

export function SupabaseAuthModal({
  isOpen,
  onClose,
  onSuccess,
  isSupabaseConnected,
}: SupabaseAuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'config'>('signin');
  const [email, setEmail] = useState('ishimweamanid@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Bob Researcher');
  const [supabaseUrl, setSupabaseUrl] = useState('https://xyzcompany.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Simulate Supabase Postgres authentication handshake
    await new Promise((r) => setTimeout(r, 700));

    setLoading(false);
    setMessage(
      mode === 'signup'
        ? `Account created! User credentials and profile stored in Supabase PostgreSQL tables ('user', 'account', 'research_project').`
        : `Signed in successfully as ${email}! Workspace records synced with cloud database.`
    );

    setTimeout(() => {
      onSuccess(email);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141720] border border-neutral-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-100">
              Supabase Cloud Database & Auth
            </h3>
            <p className="text-xs text-neutral-400">
              PostgreSQL schema: <code className="text-emerald-300">user</code>, <code className="text-emerald-300">research_note</code>, <code className="text-emerald-300">session</code>
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 bg-neutral-950 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setMode('signin')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-neutral-800 text-neutral-100 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-neutral-800 text-neutral-100 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs text-neutral-300 block mb-1 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-200 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-300 block mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-200 outline-none"
                required
              />
            </div>
          </div>

          {message && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              'Sign In & Sync Cloud Workspace'
            ) : (
              'Save User in Database & Register'
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
          <span>Backend: PostgreSQL via Drizzle ORM</span>
          <span className="text-emerald-400 font-mono">DATABASE_URL Ready</span>
        </div>
      </div>
    </div>
  );
}
