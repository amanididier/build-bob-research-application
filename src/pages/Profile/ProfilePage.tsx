import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../../components/BobAvatar';
import { Check, Sparkles, User, Shield, Compass, LogOut } from 'lucide-react';
import { signOut } from '../../lib/authService';

export const ProfilePage: React.FC = () => {
  const { triggerThinking, userName, setUserName, userEmail, setUserEmail, setUserAvatar, setIsAuthModalOpen, startOnboarding } = useApp();
  const [name, setName] = useState(userName || 'Amani');
  const [style, setStyle] = useState<'concise' | 'detailed' | 'explain'>('concise');
  const [priorities, setPriorities] = useState({
    evidence: true,
    steps: true,
    contradictions: false,
    links: true,
  });

  const [toggles, setToggles] = useState({
    proactive: true,
    confidence: true,
    friendly: true,
  });

  const handleSave = () => {
    if (name.trim()) {
      setUserName(name.trim());
      localStorage.setItem('bob_user_name', name.trim());
    }
    triggerThinking('Saving Profile Preferences', 'Updating Bob personal context model...', 'Preferences stored');
  };

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      <div className="flex items-center gap-5 pb-6 border-b border-[var(--line)] mb-8">
        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#d9e7ff] to-[#f2d4bb] text-neutral-800 font-extrabold text-2xl grid place-items-center shadow-md flex-shrink-0">
          {(userName || 'A').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            USER PROFILE & WORKSPACE IDENTITY
          </div>
          <h1 className="text-[32px] tracking-[-1px] font-extrabold my-1 text-[var(--t)]">
            Profile & Personalization
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Tell Bob how you like to think and work. These preferences shape how evidence is summarized and prioritized for you.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr] gap-6">
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.02)] space-y-5">
          <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Personal Details</h3>
          <div>
            <label className="text-[11px] font-bold text-[var(--m)] block mb-1.5 uppercase tracking-wider">Display Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--s2)] text-[13px] text-[var(--t)] outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[var(--m)] block mb-1.5 uppercase tracking-wider">Research Synthesis Style</label>
            <div className="flex gap-2">
              {(['concise', 'detailed', 'explain'] as const).map((key) => (
                <button key={key} onClick={() => setStyle(key)} className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-medium transition-all ${style === key ? 'bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold shadow-sm' : 'bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'}`}>
                  {key === 'explain' ? 'Explain First' : key[0].toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[var(--m)] block mb-2 uppercase tracking-wider">What Bob Should Prioritize</label>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                ['evidence', 'Strong evidence'],
                ['steps', 'Actionable steps'],
                ['contradictions', 'Contradictions'],
                ['links', 'Source web links'],
              ] as const).map(([key, label]) => (
                <label key={key} className="p-3 rounded-xl bg-[var(--s2)] flex items-center gap-2.5 text-[12px] text-[var(--t)] cursor-pointer select-none">
                  <input type="checkbox" checked={priorities[key]} onChange={(e) => setPriorities((p) => ({ ...p, [key]: e.target.checked }))} className="accent-[var(--y)] w-4 h-4" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12px] font-bold shadow-md hover:opacity-90 active:scale-98 transition-all">Save Preferences</button>
          <div className="pt-4 border-t border-[var(--line)] space-y-2">
            <p className="text-[12px] text-[var(--m)] m-0">{userEmail ? <>Signed in as <b className="text-[var(--t)]">{userEmail}</b></> : 'Not signed in'}</p>
            {userEmail ? (
              <button type="button" onClick={async () => { await signOut(); setUserEmail(''); setUserAvatar(''); }} className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-300 text-[12px] font-bold flex items-center justify-center gap-2 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            ) : (
              <button type="button" onClick={() => setIsAuthModalOpen(true)} className="w-full py-2.5 rounded-xl border border-[var(--line)] text-[12px] font-bold text-[var(--t)] cursor-pointer">Sign in</button>
            )}
          </div>
        </div>
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BobAvatar size={24} />
            <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Bob's Personality & Tone</h3>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {([
              ['proactive', 'Proactive Research', 'Bob can surface useful cross-tab links without waiting for an explicit query.'],
              ['confidence', 'Confidence Signals', 'Explicitly show whether evidence is strong, mixed, or still uncertain.'],
              ['friendly', 'Friendly & Warm Tone', 'Keep Bob approachable and direct rather than stiff or robotic.'],
            ] as const).map(([key, title, copy]) => (
              <div key={key} className="py-3 flex items-start gap-3 justify-between">
                <div>
                  <b className="text-[12px] text-[var(--t)] block">{title}</b>
                  <small className="text-[10px] text-[var(--m)] block mt-0.5">{copy}</small>
                </div>
                <button onClick={() => setToggles((t) => ({ ...t, [key]: !t[key] }))} className={`w-9 h-5 rounded-full p-0.5 transition-colors flex-shrink-0 ${toggles[key] ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${toggles[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
