import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  User,
  Key,
  Sparkles,
  HardDrive,
  Shield,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Download,
  Trash2,
} from 'lucide-react';
import {
  getGeminiKey,
  setGeminiKey,
  isKeyLocked,
  isKeySessionUnlocked,
  lockApiKeyWithPassword,
  unlockApiKeyWithPassword,
  clearKeyLock,
  maskKey,
  setKeyProvider,
  getKeyProvider,
  getUsageSnapshot,
  setGroqKey,
  getGroqKey,
} from '../../lib/ai/keyManager';
import { bobAi } from '../../lib/aiEngine';

type TabId = 'profile' | 'keys' | 'personalization' | 'memory' | 'privacy';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'keys', label: 'Usage & keys', icon: Key },
  { id: 'personalization', label: 'Personalization', icon: Sparkles },
  { id: 'memory', label: 'Memory', icon: HardDrive },
  { id: 'privacy', label: 'Privacy & updates', icon: Shield },
];

const TONE_OPTIONS = [
  { id: 'warm', label: 'Warm & friendly', hint: 'Like a supportive teammate' },
  { id: 'clear', label: 'Clear & direct', hint: 'Short answers, no fluff' },
  { id: 'curious', label: 'Curious coach', hint: 'Asks good follow-ups' },
  { id: 'formal', label: 'Calm & formal', hint: 'Professional, measured' },
];

export const SettingsPage: React.FC = () => {
  const {
    userName,
    setUserName,
    bobTastePreference,
    setBobTastePreference,
    memoryStats,
    triggerThinking,
    projects,
    notes,
    tasks,
  } = useApp();

  const [tab, setTab] = useState<TabId>('profile');

  // Profile
  const [name, setName] = useState(userName || '');
  const [nickname, setNickname] = useState(() => localStorage.getItem('bob_user_nickname') || '');
  const [bobCallName, setBobCallName] = useState(() => localStorage.getItem('bob_assistant_name') || 'Bob');

  // Keys
  const [provider, setProvider] = useState(getKeyProvider());
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(() => !!getGeminiKey() || !!getGroqKey());
  const [locked, setLocked] = useState(() => isKeyLocked());
  const [sessionOpen, setSessionOpen] = useState(() => isKeySessionUnlocked());
  const [showLockModal, setShowLockModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [unlockPw, setUnlockPw] = useState('');
  const [keyError, setKeyError] = useState('');
  const [usage, setUsage] = useState(getUsageSnapshot());

  // Personalization
  const [tone, setTone] = useState(() => localStorage.getItem('bob_tone_v1') || 'warm');
  const [tasteDraft, setTasteDraft] = useState(bobTastePreference || '');

  // Privacy toggles
  const [proactive, setProactive] = useState(() => localStorage.getItem('bob_proactive_msgs') !== '0');
  const [localOnly, setLocalOnly] = useState(() => localStorage.getItem('bob_local_only') !== '0');
  const [saveChats, setSaveChats] = useState(() => localStorage.getItem('bob_save_chats') !== '0');

  // Updates — always read the installed version from the native desktop bridge.
  const [installedVersion, setInstalledVersion] = useState('Detecting…');
  const [updaterState, setUpdaterState] = useState<{
    status: string;
    version?: string;
    percent?: number;
    message?: string;
  }>({ status: 'idle', message: 'Check for the latest Bob release.' });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const desktop = (window as any).bob;
    if (!desktop) {
      setInstalledVersion('Web version');
      return;
    }
    let unsubscribe: (() => void) | undefined;
    if (typeof desktop.info === 'function') {
      desktop.info().then((info: any) => {
        if (info?.version) setInstalledVersion(String(info.version));
      }).catch(() => setInstalledVersion('Unknown'));
    }
    if (typeof desktop.onUpdateStatus === 'function') {
      unsubscribe = desktop.onUpdateStatus((status: any) => {
        if (status) setUpdaterState((previous) => ({ ...previous, ...status }));
      });
    }
    if (typeof desktop.getUpdateState === 'function') {
      desktop.getUpdateState().then((status: any) => {
        if (status) setUpdaterState((previous) => ({ ...previous, ...status }));
      }).catch(() => {});
    }
    return () => unsubscribe?.();
  }, []);

  const saveProfile = () => {
    if (name.trim()) {
      setUserName(name.trim());
      localStorage.setItem('bob_user_name', name.trim());
    }
    localStorage.setItem('bob_user_nickname', nickname.trim());
    localStorage.setItem('bob_assistant_name', bobCallName.trim() || 'Bob');
    triggerThinking('Profile saved', 'Greetings will use your name and nickname.', 'Saved');
  };

  const savePersonalization = () => {
    localStorage.setItem('bob_tone_v1', tone);
    setBobTastePreference(tasteDraft);
    localStorage.setItem('bob_taste_preference', tasteDraft);
    // Applied system rule for models
    localStorage.setItem(
      'bob_system_personalization',
      JSON.stringify({
        tone,
        assistantName: bobCallName || 'Bob',
        userNickname: nickname,
        taste: tasteDraft,
        updatedAt: new Date().toISOString(),
      })
    );
    triggerThinking('Personalization applied', 'Bob will follow these preferences in replies.', 'Applied');
  };

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setKeyError('Paste a valid API key first.');
      return;
    }
    setKeyError('');
    if (provider === 'groq') setGroqKey(trimmed);
    else setGeminiKey(trimmed);
    setKeyProvider(provider);
    setHasKey(true);
    setKeyInput('');
    setShowLockModal(true);
    try {
      if (provider === 'gemini' && bobAi.testGeminiConnection) {
        await bobAi.testGeminiConnection(trimmed);
      }
    } catch {}
    setUsage(getUsageSnapshot());
  };

  const confirmLock = async () => {
    if (pw1.length < 4) {
      setKeyError('Password should be at least 4 characters.');
      return;
    }
    if (pw1 !== pw2) {
      setKeyError('Passwords do not match.');
      return;
    }
    await lockApiKeyWithPassword(pw1);
    setLocked(true);
    setSessionOpen(true);
    setShowLockModal(false);
    setPw1('');
    setPw2('');
    setKeyError('');
    triggerThinking('Key locked', 'You’ll need this password to view or change the key.', 'Secured');
  };

  const confirmUnlock = async () => {
    const ok = await unlockApiKeyWithPassword(unlockPw);
    if (!ok) {
      setKeyError('Wrong password.');
      return;
    }
    setSessionOpen(true);
    setShowUnlockModal(false);
    setUnlockPw('');
    setKeyError('');
    // Reveal masked key into input only after unlock
    const k = getGeminiKey() || getGroqKey() || '';
    setKeyInput(k);
  };

  const removeKey = async () => {
    if (locked && !sessionOpen) {
      setShowUnlockModal(true);
      return;
    }
    setGeminiKey('');
    setGroqKey('');
    clearKeyLock();
    setHasKey(false);
    setLocked(false);
    setSessionOpen(false);
    setKeyInput('');
    triggerThinking('Key removed', 'Cloud models need a key again.', 'Ready');
  };

  const checkUpdates = async () => {
    const desktop = (window as any).bob;
    if (!desktop?.checkForUpdates) {
      setUpdaterState({ status: 'error', message: 'Open Bob Desktop to install application updates.' });
      return;
    }
    setUpdaterState((previous) => ({ ...previous, status: 'checking', message: 'Checking GitHub Releases…' }));
    try {
      const result = await desktop.checkForUpdates();
      if (result?.status) setUpdaterState((previous) => ({ ...previous, ...result }));
    } catch (error: any) {
      setUpdaterState((previous) => ({
        ...previous,
        status: 'error',
        message: error?.message || 'Could not check for updates.',
      }));
    }
  };

  const downloadUpdate = async () => {
    const desktop = (window as any).bob;
    if (!desktop?.downloadUpdate) return;
    try {
      setUpdaterState((previous) => ({ ...previous, status: 'downloading', percent: 0, message: 'Starting download…' }));
      await desktop.downloadUpdate();
    } catch (error: any) {
      setUpdaterState((previous) => ({ ...previous, status: 'error', message: error?.message || 'Download failed.' }));
    }
  };

  const installUpdate = async () => {
    const desktop = (window as any).bob;
    if (!desktop?.installUpdate) return;
    await desktop.installUpdate();
  };

  const storedKey = getGeminiKey() || getGroqKey();
  const canRevealKey = !locked || sessionOpen;

  return (
    <div className="min-h-full bg-[#f7f7f8] dark:bg-[var(--bg)] pb-24">
      <div className="max-w-[960px] mx-auto px-5 md:px-8 pt-10">
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-white m-0 mb-8">
          Settings
        </h1>

        <div className="flex flex-col md:flex-row gap-8 md:gap-10">
          {/* Left nav — ChatGPT / Airbnb minimal */}
          <nav className="md:w-[200px] shrink-0 space-y-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors text-left ${
                    active
                      ? 'bg-white dark:bg-[var(--s)] text-neutral-900 dark:text-white shadow-sm border border-neutral-200/80 dark:border-[var(--line)]'
                      : 'text-neutral-600 dark:text-[var(--m)] hover:bg-white/70 dark:hover:bg-[var(--s2)]'
                  }`}
                >
                  <Icon className="w-4 h-4 opacity-70" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Content panel */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-[var(--s)] rounded-[20px] border border-neutral-200/80 dark:border-[var(--line)] shadow-sm p-6 md:p-8">
              {/* PROFILE */}
              {tab === 'profile' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-white m-0">Profile</h2>
                    <p className="text-[13px] text-neutral-500 mt-1 m-0">
                      How Bob addresses you. Saved only on this device.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#dbeafe] to-[#fde68a] grid place-items-center text-[20px] font-bold text-neutral-800">
                      {(name || userName || 'B').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold m-0 text-neutral-900 dark:text-white">
                        {name || userName || 'Your name'}
                      </p>
                      <p className="text-[12px] text-neutral-500 m-0">Local profile</p>
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-[12px] font-medium text-neutral-600 dark:text-[var(--m)]">Your name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[14px] outline-none focus:ring-2 focus:ring-[#f5c842]/40"
                      placeholder="e.g. Didier"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-medium text-neutral-600 dark:text-[var(--m)]">
                      Nickname Bob can use
                    </span>
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[14px] outline-none focus:ring-2 focus:ring-[#f5c842]/40"
                      placeholder="e.g. buddy, captain"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-medium text-neutral-600 dark:text-[var(--m)]">
                      What you call your assistant
                    </span>
                    <input
                      value={bobCallName}
                      onChange={(e) => setBobCallName(e.target.value)}
                      className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[14px] outline-none focus:ring-2 focus:ring-[#f5c842]/40"
                      placeholder="Bob"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={saveProfile}
                    className="h-10 px-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[13px] font-semibold"
                  >
                    Save profile
                  </button>
                </div>
              )}

              {/* USAGE & KEYS */}
              {tab === 'keys' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-white m-0">Usage & keys</h2>
                    <p className="text-[13px] text-neutral-500 mt-1 m-0">
                      Add any model key that powers Bob. Lock it with a password on this PC.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-neutral-200 dark:border-[var(--line)] p-4">
                      <p className="text-[11px] font-medium text-neutral-500 m-0">Requests</p>
                      <p className="text-[22px] font-semibold m-0 mt-1 tabular-nums">{usage.requests}</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 dark:border-[var(--line)] p-4">
                      <p className="text-[11px] font-medium text-neutral-500 m-0">Est. tokens</p>
                      <p className="text-[22px] font-semibold m-0 mt-1 tabular-nums">
                        {usage.estTokens.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[12px] font-medium text-neutral-600">Provider</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['gemini', 'groq', 'openai', 'other'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProvider(p)}
                          className={`h-9 px-3.5 rounded-full text-[12px] font-semibold border transition-colors ${
                            provider === p
                              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900'
                              : 'bg-transparent border-neutral-200 dark:border-[var(--line)] text-neutral-600'
                          }`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasKey && locked && !sessionOpen && (
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[13px] text-amber-900 dark:text-amber-100">
                        <Lock className="w-4 h-4" />
                        Key is locked. Enter password to view or change it.
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowUnlockModal(true)}
                        className="h-8 px-3 rounded-full bg-amber-600 text-white text-[12px] font-semibold"
                      >
                        Unlock
                      </button>
                    </div>
                  )}

                  {hasKey && canRevealKey && (
                    <p className="text-[12px] text-neutral-500 m-0 font-mono">
                      Saved key: {maskKey(storedKey)}
                    </p>
                  )}

                  <label className="block">
                    <span className="text-[12px] font-medium text-neutral-600">API key</span>
                    <div className="mt-1.5 flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          disabled={hasKey && locked && !sessionOpen}
                          placeholder={hasKey ? 'Enter new key to replace' : 'Paste your API key'}
                          className="w-full h-11 px-3.5 pr-10 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[13px] font-mono outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((s) => !s)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </label>

                  {keyError && <p className="text-[12px] text-red-600 m-0">{keyError}</p>}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveKey}
                      className="h-10 px-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[13px] font-semibold"
                    >
                      Save key
                    </button>
                    {hasKey && (
                      <button
                        type="button"
                        onClick={removeKey}
                        className="h-10 px-4 rounded-full border border-neutral-200 dark:border-[var(--line)] text-[13px] font-semibold text-neutral-600 inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* PERSONALIZATION */}
              {tab === 'personalization' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-white m-0">
                      Personalization
                    </h2>
                    <p className="text-[13px] text-neutral-500 mt-1 m-0">
                      Shape how Bob talks. Changes apply to research, chat, roadmaps, and summaries.
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] font-medium text-neutral-600 m-0 mb-2">Tone</p>
                    <div className="space-y-2">
                      {TONE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTone(opt.id)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                            tone === opt.id
                              ? 'border-[#f5c842] bg-[#fff8df] dark:bg-[#3a3218] dark:border-[#f5c842]/60'
                              : 'border-neutral-200 dark:border-[var(--line)] hover:bg-neutral-50 dark:hover:bg-[var(--s2)]'
                          }`}
                        >
                          <div>
                            <p className="text-[14px] font-semibold m-0 text-neutral-900 dark:text-white">
                              {opt.label}
                            </p>
                            <p className="text-[12px] text-neutral-500 m-0 mt-0.5">{opt.hint}</p>
                          </div>
                          {tone === opt.id && (
                            <span className="w-5 h-5 rounded-full bg-[#f5c842] text-[#171717] grid place-items-center">
                              <Check className="w-3 h-3" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-[12px] font-medium text-neutral-600">
                      Extra notes for Bob (optional)
                    </span>
                    <textarea
                      value={tasteDraft}
                      onChange={(e) => setTasteDraft(e.target.value)}
                      rows={3}
                      placeholder="e.g. Prefer short bullet lists. I’m building for students in Rwanda."
                      className="mt-1.5 w-full p-3 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[13px] outline-none resize-none"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={savePersonalization}
                    className="h-10 px-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[13px] font-semibold"
                  >
                    Apply changes
                  </button>
                </div>
              )}

              {/* MEMORY */}
              {tab === 'memory' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-white m-0">Memory</h2>
                    <p className="text-[13px] text-neutral-500 mt-1 m-0">
                      Everything Bob keeps lives on your PC — not on our servers.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: 'Projects', value: projects.length, hint: 'Research workspaces' },
                      { label: 'Notes', value: notes.length, hint: 'Saved passages & cards' },
                      { label: 'Tasks', value: tasks.length, hint: 'Checklist items' },
                      {
                        label: 'Local storage',
                        value: `${memoryStats?.storageSizeKb ?? 0} KB`,
                        hint: `${memoryStats?.totalNodes ?? 0} memory nodes`,
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-neutral-200 dark:border-[var(--line)]"
                      >
                        <div>
                          <p className="text-[14px] font-semibold m-0 text-neutral-900 dark:text-white">
                            {row.label}
                          </p>
                          <p className="text-[12px] text-neutral-500 m-0">{row.hint}</p>
                        </div>
                        <span className="text-[15px] font-semibold tabular-nums text-neutral-800 dark:text-white">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRIVACY & UPDATES */}
              {tab === 'privacy' && (
                <div className="space-y-8 max-w-lg">
                  <div>
                    <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-white m-0">
                      Privacy
                    </h2>
                    <p className="text-[13px] text-neutral-500 mt-1 m-0">
                      Your chats, notes, and projects stay on this computer unless you export them.
                    </p>
                  </div>

                  {[
                    {
                      key: 'proactive',
                      label: 'Proactive messages',
                      desc: 'Allow Bob to nudge you about focus and deadlines',
                      value: proactive,
                      set: (v: boolean) => {
                        setProactive(v);
                        localStorage.setItem('bob_proactive_msgs', v ? '1' : '0');
                      },
                    },
                    {
                      key: 'local',
                      label: 'Local-only mode',
                      desc: 'Prefer on-device data; avoid unnecessary cloud calls',
                      value: localOnly,
                      set: (v: boolean) => {
                        setLocalOnly(v);
                        localStorage.setItem('bob_local_only', v ? '1' : '0');
                      },
                    },
                    {
                      key: 'chats',
                      label: 'Save chat history',
                      desc: 'Keep research and companion chats on this device',
                      value: saveChats,
                      set: (v: boolean) => {
                        setSaveChats(v);
                        localStorage.setItem('bob_save_chats', v ? '1' : '0');
                      },
                    },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold m-0 text-neutral-900 dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-[12px] text-neutral-500 m-0 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.value}
                        onClick={() => item.set(!item.value)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                          item.value ? 'bg-[#f5c842]' : 'bg-neutral-300 dark:bg-neutral-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            item.value ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  <div className="pt-6 border-t border-neutral-200 dark:border-[var(--line)]">
                    <div className="rounded-2xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[15px] font-semibold m-0 text-neutral-900 dark:text-white">Bob updates</h3>
                        <span className="text-[11px] font-semibold text-neutral-500 tabular-nums">v{installedVersion}</span>
                      </div>
                      <p className="text-[12px] text-neutral-500 mt-1 mb-0">
                        {updaterState.message || 'Keep Bob up to date with the latest improvements.'}
                      </p>
                      {updaterState.status === 'downloading' && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                            <span>Downloading update</span>
                            <span className="tabular-nums">{Math.max(0, Math.min(100, updaterState.percent || 0))}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                            <div className="h-full rounded-full bg-[#f4bc18] transition-all" style={{ width: `${Math.max(0, Math.min(100, updaterState.percent || 0))}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          type="button"
                          onClick={checkUpdates}
                          disabled={updaterState.status === 'checking' || updaterState.status === 'downloading'}
                          className="h-9 px-4 rounded-full border border-neutral-200 dark:border-[var(--line)] text-[12px] font-semibold inline-flex items-center gap-2 hover:bg-white dark:hover:bg-[var(--s)] disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${updaterState.status === 'checking' ? 'animate-spin' : ''}`} />
                          Check for updates
                        </button>
                        {updaterState.status === 'available' && (
                          <button type="button" onClick={downloadUpdate} className="h-9 px-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[12px] font-semibold inline-flex items-center gap-2">
                            <Download className="w-3.5 h-3.5" /> Download update
                          </button>
                        )}
                        {updaterState.status === 'ready' && (
                          <button type="button" onClick={installUpdate} className="h-9 px-4 rounded-full bg-[#f4bc18] text-neutral-900 text-[12px] font-semibold">
                            Restart & install
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lock key modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[var(--s)] rounded-[24px] p-6 shadow-2xl border border-neutral-200 dark:border-[var(--line)]">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-[#f5c842]" />
              <h3 className="text-[16px] font-semibold m-0">Lock your key</h3>
            </div>
            <p className="text-[13px] text-neutral-500 m-0 mb-4">
              Choose a password. You’ll need it to view or change this key later. Stored only on this PC.
            </p>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="Password"
              className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[14px] mb-2 outline-none"
            />
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm password"
              className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[14px] mb-3 outline-none"
            />
            {keyError && <p className="text-[12px] text-red-600 mb-2 m-0">{keyError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowLockModal(false);
                  setKeyError('');
                }}
                className="h-10 px-4 rounded-full text-[13px] font-semibold text-neutral-500"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={confirmLock}
                className="h-10 px-5 rounded-full bg-neutral-900 text-white text-[13px] font-semibold"
              >
                Lock key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[var(--s)] rounded-[24px] p-6 shadow-2xl border border-neutral-200 dark:border-[var(--line)]">
            <h3 className="text-[16px] font-semibold m-0 mb-1">Unlock key</h3>
            <p className="text-[13px] text-neutral-500 m-0 mb-4">Enter the password you set on this device.</p>
            <input
              type="password"
              value={unlockPw}
              onChange={(e) => setUnlockPw(e.target.value)}
              placeholder="Password"
              className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[14px] mb-3 outline-none"
            />
            {keyError && <p className="text-[12px] text-red-600 mb-2 m-0">{keyError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowUnlockModal(false);
                  setKeyError('');
                }}
                className="h-10 px-4 rounded-full text-[13px] font-semibold text-neutral-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUnlock}
                className="h-10 px-5 rounded-full bg-neutral-900 text-white text-[13px] font-semibold"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
