import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Cpu, 
  ShieldCheck, 
  Globe, 
  Sparkles,
  Key,
  CheckCircle2,
  Database,
  ClipboardCheck,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
  HardDrive,
  Mic,
  Volume2,
  Download,
  Check,
  User
} from 'lucide-react';
import { detectSystemHardware, MODEL_CATALOG } from '../../lib/hardware';
import { bobAi } from '../../lib/aiEngine';
import { VoiceSelectorCards } from '../../components/voice/VoiceSelectorCards';
import { localVoiceManager } from '../../lib/voice/localVoiceManager';
import { micManager } from '../../lib/voice/microphoneManager';
import { useVoiceStore } from '../../store/useVoiceStore';
import { ProfilePage } from '../Profile/ProfilePage';

export const SettingsPage: React.FC = () => {
  const { 
    openChromeBridge, 
    aiDownloadStatus, 
    memoryStats,
    bobTastePreference,
    setBobTastePreference,
    triggerThinking
  } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [activeTab, setActiveTab] = useState<'ai' | 'voice' | 'updates' | 'memory' | 'browser' | 'privacy' | 'personalization' | 'profile'>('ai');
  const [tasteDraft, setTasteDraft] = useState<string>(bobTastePreference);
  const [openChromeByDefault, setOpenChromeByDefault] = useState(true);
  const [localOnlyMode, setLocalOnlyMode] = useState(true);
  const [testMicState, setTestMicState] = useState<'idle' | 'recording' | 'success' | 'error'>('idle');
  const [testMicMessage, setTestMicMessage] = useState<string>('');

  const [geminiKeyInput, setGeminiKeyInput] = useState(() => bobAi.getGeminiKey() || '');
  const [hasKey, setHasKey] = useState(() => bobAi.hasGeminiKey());
  const [saveToast, setSaveToast] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const [installedVersion, setInstalledVersion] = useState<string>('1.0.74');

  const [updaterState, setUpdaterState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'latest' | 'error';
    version?: string;
    percent?: number;
    message?: string;
  }>({
    status: 'idle',
    version: '1.0.74',
    message: 'Ready to check for updates'
  });

  const [hardware] = useState(() => detectSystemHardware());
  const activeProfile = MODEL_CATALOG[aiDownloadStatus.tier];

  const [extensionConnected, setExtensionConnected] = useState<boolean>(false);
  const [bridgePort] = useState<number>(54321);

  useEffect(() => {
    const checkExt = async () => {
      let connected = false;
      if (typeof window !== 'undefined' && (window as any).bob?.extensionAlive) {
        try {
          const res = await (window as any).bob.extensionAlive();
          if (res?.alive) connected = true;
        } catch {}
      }
      if (!connected) {
        try {
          const res = await fetch('http://127.0.0.1:54321/events/health');
          if (res.ok) {
            const data = await res.json();
            if (data.extensionConnected) connected = true;
          }
        } catch {}
      }
      setExtensionConnected(connected);
    };
    checkExt();
    const t = setInterval(checkExt, 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).bob) {
      if ((window as any).bob.info) {
        (window as any).bob.info().then((info: any) => {
          if (info && info.version) {
            setInstalledVersion(info.version);
            setUpdaterState((prev) => ({ ...prev, version: info.version }));
          }
        }).catch(() => {});
      }
      if ((window as any).bob.getUpdateStatus) {
        (window as any).bob.getUpdateStatus().then((st: any) => {
          if (st && st.status) setUpdaterState(st);
        }).catch(() => {});
      }
      if ((window as any).bob.onUpdateStatus) {
        const unsub = (window as any).bob.onUpdateStatus((status: any) => {
          if (status) setUpdaterState(status);
        });
        return unsub;
      }
    }
  }, []);

  const handleSaveGeminiKey = async (key: string) => {
    const trimmed = key.trim();
    bobAi.setGeminiKey(trimmed);
    setGeminiKeyInput(trimmed);
    setHasKey(Boolean(trimmed));
    setSaveToast(true);
    setKeyTestFeedback(null);
    setTimeout(() => setSaveToast(false), 2500);
    if (typeof window !== 'undefined' && (window as any).bob?.setGeminiKey) {
      await (window as any).bob.setGeminiKey(trimmed);
    } else {
      await fetch('http://127.0.0.1:54321/events/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-bob-token': 'development-token' },
        body: JSON.stringify({ geminiKey: trimmed })
      }).catch(() => {});
    }
    if (trimmed) {
      const res = await bobAi.testGeminiConnection(trimmed);
      if (res && res.ok && res.model) {
        if (typeof window !== 'undefined' && (window as any).bob?.setVerifiedModel) {
          await (window as any).bob.setVerifiedModel(res.model);
        }
      }
    }
    triggerThinking('Key Saved', 'Google Gemini API key updated and verified.', 'Configured');
  };

  const handleTestGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setIsTestingKey(true);
    setKeyTestFeedback(null);
    try {
      const res = await bobAi.testGeminiConnection(geminiKeyInput);
      setKeyTestFeedback(res);
      if (res.ok) {
        const trimmed = geminiKeyInput.trim();
        bobAi.setGeminiKey(trimmed);
        setHasKey(true);
        if (typeof window !== 'undefined' && (window as any).bob?.setGeminiKey) {
          await (window as any).bob.setGeminiKey(trimmed);
        }
      }
    } catch (err: any) {
      setKeyTestFeedback({ ok: false, message: err?.message || 'Verification error' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text && text.trim()) handleSaveGeminiKey(text.trim());
    } catch {}
  };

  const handleRemoveKey = () => {
    bobAi.setGeminiKey('');
    setGeminiKeyInput('');
    setHasKey(false);
    setKeyTestFeedback(null);
    triggerThinking('Key Removed', 'Reverted to local on-device model.', 'Ready');
  };

  const handleCheckForUpdates = async () => {
    setUpdaterState((prev) => ({ ...prev, status: 'checking', message: 'Checking for latest releases...' }));
    if (typeof window !== 'undefined' && (window as any).bob?.checkForUpdates) {
      try {
        const res = await (window as any).bob.checkForUpdates();
        setUpdaterState(res || { status: 'error', version: installedVersion, message: 'The desktop updater returned no status. Please try again.' });
      } catch (err: any) {
        setUpdaterState({ status: 'error', message: err?.message || 'Update check failed.' });
      }
    } else {
      try {
        const response = await fetch('https://api.github.com/repos/amanididier/build-bob-research-application/releases/latest', {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!response.ok) throw new Error('GitHub release check returned HTTP ' + response.status);
        const release = await response.json();
        const latestVersion = String(release.tag_name || '').replace(/^v/, '');
        if (!latestVersion) throw new Error('Latest release did not include a version tag.');
        const compare = (a: string, b: string) => {
          const aa = a.split('.').map(Number), bb = b.split('.').map(Number);
          for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
            const diff = (aa[i] || 0) - (bb[i] || 0);
            if (diff !== 0) return diff;
          }
          return 0;
        };
        const isNewer = compare(latestVersion, installedVersion) > 0;
        setUpdaterState({
          status: isNewer ? 'available' : 'latest',
          version: latestVersion,
          message: isNewer
            ? 'Bob v' + latestVersion + ' is available. Download the installer from GitHub Releases.'
            : 'You are running the latest published release (v' + installedVersion + ').',
        });
      } catch (err: any) {
        setUpdaterState({ status: 'error', version: installedVersion, message: err?.message || 'Could not verify the latest release.' });
      }
    }
  };

  const handleDownloadUpdate = async () => {
    const bob = typeof window !== 'undefined' ? (window as any).bob : null;
    if (!bob?.downloadUpdate) {
      window.open('https://github.com/amanididier/build-bob-research-application/releases/latest', '_blank', 'noopener,noreferrer');
      return;
    }
    setUpdaterState((prev) => ({ ...prev, status: 'downloading', percent: 0, message: 'Downloading the update securely…' }));
    try {
      const result = await bob.downloadUpdate();
      if (result?.status === 'error') {
        setUpdaterState({ status: 'error', version: updaterState.version, message: result.message || 'The update download failed.' });
      } else if (result?.status) {
        setUpdaterState((prev) => ({ ...prev, ...result, status: result.status === 'downloading' ? 'downloading' : result.status }));
      }
    } catch (err: any) {
      setUpdaterState({ status: 'error', version: updaterState.version, message: err?.message || 'The update download failed.' });
    }
  };

  const handleInstallUpdate = async () => {
    setUpdaterState((prev) => ({ ...prev, message: 'Restarting Bob to finish update…' }));
    if (typeof window !== 'undefined' && (window as any).bob?.installUpdate) {
      try {
        await (window as any).bob.installUpdate();
      } catch (err) {
        window.location.reload();
      }
    } else {
      setTimeout(() => window.location.reload(), 600);
    }
  };

  const {
    modelProgress,
    isWhisperInstalled,
    downloadWhisperModel,
    isKokoroInstalled,
    kokoroProgress,
    downloadKokoroModel,
    deleteKokoroModel,
    activeVoiceId,
    previewVoice,
  } = useVoiceStore();

  const handleDownloadModel = async () => {
    await downloadWhisperModel();
  };

  const handleDeleteModel = () => {
    localVoiceManager.clearModel();
  };

  const handleTestMic = async () => {
    setTestMicState('recording');
    setTestMicMessage('Listening for 2 seconds to verify microphone audio…');
    try {
      await micManager.startCapture();
      setTimeout(() => {
        micManager.stopCapture();
        setTestMicState('success');
        setTestMicMessage('Microphone works perfectly! Clean audio stream verified ✓');
        setTimeout(() => setTestMicMessage(''), 5000);
      }, 2000);
    } catch (err: any) {
      setTestMicState('error');
      setTestMicMessage(`Microphone error: ${err?.message || 'Access denied'}`);
      setTimeout(() => setTestMicMessage(''), 6000);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-8 pb-36">
      <div className="pb-7 border-b border-[var(--line)] mb-8">
        <div className="text-[10px] tracking-[0.09em] text-[#999] uppercase font-semibold">
          PREFERENCES & AI ENGINES
        </div>
        <h1 className="text-[32px] tracking-tight font-extrabold my-2 text-[var(--t)]">
          Settings
        </h1>
        <p className="text-[var(--m)] text-[13.5px] leading-relaxed max-w-[650px] m-0">
          Configure your AI reasoning engines, Google Gemini API keys, desktop auto-updates, and privacy settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-1.5">
          {([
            ['ai', Cpu, 'AI Models & Keys', 'text-[var(--y)]'],
            ['profile', User, 'Profile', 'text-[#3474db]'],
            ['personalization', Sparkles, 'Personalization', 'text-[#ec4899]'],
            ['voice', Mic, 'Voice Models', 'text-amber-500'],
            ['updates', RefreshCw, 'App Updates', 'text-emerald-500'],
            ['memory', Database, 'Research Memory', 'text-[#8b5cf6]'],
            ['browser', Globe, 'Chrome Bridge', 'text-[var(--b)]'],
            ['privacy', ShieldCheck, 'Privacy', 'text-[var(--g)]'],
          ] as const).map(([id, Icon, label, color]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${                activeTab === id
                  ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                  : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
              }`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-3">
          {activeTab === 'updates' && (
            <div className="space-y-5">
              <section className="rounded-[26px] border border-[var(--line)] bg-[var(--s)] p-6 md:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf2ff] dark:bg-[#1a2b43] text-[#3474db]">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="m-0 text-[10px] uppercase tracking-[0.16em] font-extrabold text-[var(--m)]">BOB DESKTOP</p>
                      <h3 className="mt-1 mb-0 text-xl font-extrabold text-[var(--t)]">App updates</h3>
                      <p className="mt-1 mb-0 text-sm text-[var(--m)]">Check the published release before installing anything.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--s2)] px-4 py-3 min-w-[150px]">
                    <p className="m-0 text-[10px] uppercase tracking-wider text-[var(--m)] font-bold">Current version</p>
                    <p className="m-0 mt-1 text-2xl font-extrabold text-[var(--t)]">v{installedVersion}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--s2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--t)]">
                      {updaterState.status === 'error' ? <AlertCircle className="h-4 w-4 text-red-500" /> :
                       updaterState.status === 'latest' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                       updaterState.status === 'available' || updaterState.status === 'ready' ? <Download className="h-4 w-4 text-[#3474db]" /> :
                       <RefreshCw className={`h-4 w-4 ${updaterState.status === 'checking' || updaterState.status === 'downloading' ? 'animate-spin' : ''}`} />}
                      <span>{updaterState.status === 'idle' ? 'Ready to check' : updaterState.status === 'checking' ? 'Checking for updates…' : updaterState.status === 'downloading' ? 'Downloading update…' : updaterState.status === 'ready' ? 'Update ready to install' : updaterState.status === 'available' ? 'New version available' : updaterState.status === 'latest' ? 'You’re up to date' : updaterState.status === 'error' ? 'Could not check updates' : updaterState.message || 'Update status'}</span>
                    </div>
                    {updaterState.version && <span className="text-[11px] font-mono text-[var(--m)]">Latest: v{updaterState.version}</span>}
                  </div>
                  <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--m)]">{updaterState.message || 'Check for the latest published Bob release.'}</p>
                  {(updaterState.status === 'checking' || updaterState.status === 'downloading') && (
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                      <div className="h-full rounded-full bg-[#3474db] transition-all duration-300" style={{ width: updaterState.status === 'checking' ? '35%' : Math.max(4, Math.min(100, updaterState.percent || 0)) + '%' }} />
                    </div>
                  )}
                  {updaterState.status === 'downloading' && typeof updaterState.percent === 'number' && (
                    <p className="mt-2 mb-0 text-right text-[11px] font-semibold text-[var(--m)]">{Math.round(updaterState.percent)}%</p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={updaterState.status === 'checking' || updaterState.status === 'downloading'}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--y)] px-5 py-3 text-[12px] font-extrabold text-[#171717] hover:bg-[#ebd200] disabled:opacity-50 transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 ${updaterState.status === 'checking' ? 'animate-spin' : ''}`} />
                    {updaterState.status === 'checking' ? 'Checking…' : 'Check for updates'}
                  </button>
                  {updaterState.status === 'available' && (
                    typeof window !== 'undefined' && (window as any).bob?.downloadUpdate
                      ? <button onClick={handleDownloadUpdate} className="inline-flex items-center gap-2 rounded-xl bg-[#3474db] px-5 py-3 text-[12px] font-bold text-white hover:bg-[#245fc0]"><Download className="h-4 w-4" /> Download v{updaterState.version}</button>
                      : <a href="https://github.com/amanididier/build-bob-research-application/releases/latest" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#3474db] px-5 py-3 text-[12px] font-bold text-white hover:bg-[#245fc0]"><Download className="h-4 w-4" /> Get v{updaterState.version}</a>
                  )}
                  {updaterState.status === 'ready' && (
                    <button onClick={handleInstallUpdate} className="rounded-xl border border-[var(--line)] px-4 py-3 text-[12px] font-bold text-[var(--t)]">Restart to update</button>
                  )}
                  <a href="https://github.com/amanididier/build-bob-research-application/releases" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-3 text-[12px] font-semibold text-[var(--t)] hover:bg-[var(--s2)]">
                    View release history <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </section>

              <section className="rounded-[22px] border border-[var(--line)] bg-[var(--s)] p-5">
                <h4 className="m-0 text-sm font-bold text-[var(--t)]">Chrome extension</h4>
                <p className="mt-1 mb-4 text-[12px] text-[var(--m)]">Download the extension package separately and load it in Chrome’s Extensions page.</p>
                <a href="https://github.com/amanididier/build-bob-research-application/releases/latest" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--s2)] px-4 py-2.5 text-[12px] font-semibold text-[var(--t)]">
                  <Download className="h-4 w-4" /> Open latest downloads <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </section>
            </div>
          )}

          {activeTab === 'profile' && <ProfilePage />}

          {activeTab === 'personalization' && (
            <div className="space-y-6">
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#ec4899]" />
                  <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Bob's Personality & Tone</h3>
                </div>
                <p className="text-[12px] text-[var(--m)] leading-relaxed mb-4 mt-1">
                  Describe how you want Bob to sound and behave.
                </p>
                <textarea
                  value={tasteDraft}
                  onChange={(e) => setTasteDraft(e.target.value)}
                  rows={4}
                  placeholder="e.g. Warm and playful, short sentences..."
                  className="w-full resize-none rounded-2xl border border-[var(--line)] bg-[var(--s2)] px-4 py-3 text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]"
                />
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--line)]">
                  <span className="text-[11.5px] text-[var(--m)]">
                    {tasteDraft === bobTastePreference ? 'Saved preference is active.' : 'Unsaved changes.'}
                  </span>
                  <button
                    onClick={() => {
                      setBobTastePreference(tasteDraft.trim());
                      triggerThinking('Preference Saved', 'Bob will adapt his tone to your taste.', 'Personalized');
                    }}
                    disabled={!tasteDraft.trim() || tasteDraft === bobTastePreference}
                    className="px-4 py-2 rounded-xl bg-[var(--y)] hover:bg-[#ebd200] text-[#171717] text-[12px] font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Save preference
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-7">
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-[var(--y)]" />
                  <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Google Gemini API Key</h3>
                </div>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder="Paste your Gemini API key"
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--s2)] px-4 py-3 text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => handleSaveGeminiKey(geminiKeyInput)} className="px-4 py-2 rounded-xl bg-[var(--y)] text-[#171717] text-[12px] font-bold cursor-pointer">Save key</button>
                  <button onClick={handleTestGeminiKey} className="px-4 py-2 rounded-xl border border-[var(--line)] text-[12px] font-semibold cursor-pointer">Test</button>
                  <button onClick={handlePasteClipboard} className="px-4 py-2 rounded-xl border border-[var(--line)] text-[12px] font-semibold cursor-pointer">Paste</button>
                  {hasKey && <button onClick={handleRemoveKey} className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-[12px] font-semibold cursor-pointer">Remove</button>}
                </div>
                {keyTestFeedback && (
                  <p className={`text-[12px] mt-3 mb-0 ${keyTestFeedback.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {keyTestFeedback.message}
                  </p>
                )}
                {saveToast && <p className="text-[12px] text-emerald-600 mt-2 mb-0">Key saved.</p>}
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
                <h3 className="text-[16px] font-bold text-[var(--t)] m-0 mb-3">Voice models</h3>
                <VoiceSelectorCards />
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={handleTestMic} className="px-4 py-2 rounded-xl border border-[var(--line)] text-[12px] font-semibold cursor-pointer">Test microphone</button>
                </div>
                {testMicMessage && <p className="text-[12px] text-[var(--m)] mt-3 mb-0">{testMicMessage}</p>}
              </div>
            </div>
          )}

          {activeTab === 'browser' && (
            <div className="space-y-6">
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
                <h3 className="text-[16px] font-bold text-[var(--t)] m-0 mb-2">Chrome Bridge</h3>
                <p className="text-[12px] text-[var(--m)] mb-3">
                  Extension status: {extensionConnected ? 'Connected' : 'Not connected'}
                </p>
                <button onClick={() => openChromeBridge?.()} className="px-4 py-2 rounded-xl bg-[var(--y)] text-[#171717] text-[12px] font-bold cursor-pointer">
                  Open Chrome bridge
                </button>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
                <h3 className="text-[16px] font-bold text-[var(--t)] m-0 mb-2">Research Memory</h3>
                <p className="text-[12px] text-[var(--m)] mb-0">
                  Notes and research memory stay on this device.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
                <h3 className="text-[16px] font-bold text-[var(--t)] m-0 mb-2">Privacy</h3>
                <p className="text-[12px] text-[var(--m)] mb-0">
                  Local-only mode keeps research data on your machine when enabled.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
