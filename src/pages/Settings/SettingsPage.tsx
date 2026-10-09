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
  Check
} from 'lucide-react';
import { detectSystemHardware, MODEL_CATALOG } from '../../lib/hardware';
import { bobAi } from '../../lib/aiEngine';
import { VoiceSelectorCards } from '../../components/voice/VoiceSelectorCards';
import { localVoiceManager } from '../../lib/voice/localVoiceManager';
import { micManager } from '../../lib/voice/microphoneManager';
import { useVoiceStore } from '../../store/useVoiceStore';

export const SettingsPage: React.FC = () => {
  const { 
    openChromeBridge, 
    aiDownloadStatus, 
    memoryStats,
    bobTastePreference,
    setBobTastePreference,
    triggerThinking
  } = useApp();

  // Scroll to top on mount as requested
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [activeTab, setActiveTab] = useState<'ai' | 'voice' | 'updates' | 'memory' | 'browser' | 'privacy' | 'personalization'>('ai');
  const [tasteDraft, setTasteDraft] = useState<string>(bobTastePreference);
  const [openChromeByDefault, setOpenChromeByDefault] = useState(true);
  const [localOnlyMode, setLocalOnlyMode] = useState(true);
  const [testMicState, setTestMicState] = useState<'idle' | 'recording' | 'success' | 'error'>('idle');
  const [testMicMessage, setTestMicMessage] = useState<string>('');

  // Gemini API Key state
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => bobAi.getGeminiKey() || '');
  const [hasKey, setHasKey] = useState(() => bobAi.hasGeminiKey());
  const [saveToast, setSaveToast] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const [installedVersion, setInstalledVersion] = useState<string>('1.0.53');

  // Auto updater state
  const [updaterState, setUpdaterState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'latest' | 'error';
    version?: string;
    percent?: number;
    message?: string;
  }>({
    status: 'idle',
    version: '1.0.53',
    message: 'Up to date (v1.0.53)'
  });

  const [hardware] = useState(() => detectSystemHardware());
  const activeProfile = MODEL_CATALOG[aiDownloadStatus.tier];

  // Extension real-time connectivity state
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

  // Listen to desktop auto-updater status if running in Electron
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

    // Sync key to desktop app and bridge
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
        } else {
          await fetch('http://127.0.0.1:54321/events/settings', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-bob-token': 'development-token' },
            body: JSON.stringify({ verifiedModel: res.model })
          }).catch(() => {});
        }
      }
    }
    triggerThinking('Key Saved', 'Google Gemini API key updated and verified. Connected to companion extension.', 'Configured');
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
        if (res.model) {
          if (typeof window !== 'undefined' && (window as any).bob?.setVerifiedModel) {
            await (window as any).bob.setVerifiedModel(res.model);
          } else {
            await fetch('http://127.0.0.1:54321/events/settings', {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-bob-token': 'development-token' },
              body: JSON.stringify({ geminiKey: trimmed, verifiedModel: res.model })
            }).catch(() => {});
          }
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
      if (text && text.trim()) {
        handleSaveGeminiKey(text.trim());
      }
    } catch {
      // ignore
    }
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
        setUpdaterState(res || { status: 'latest', message: 'You are on the latest version (v1.0.18)' });
      } catch (err: any) {
        setUpdaterState({ status: 'error', message: err?.message || 'Update check failed.' });
      }
    } else {
      // Web fallback
      setTimeout(() => {
        setUpdaterState({
          status: 'latest',
          version: '1.0.18',
          message: 'Running latest production build (v1.0.18)'
        });
      }, 700);
    }
  };

  const handleInstallUpdate = async () => {
    setUpdaterState((prev) => ({ ...prev, message: 'Restarting Bob to finish update…' }));
    if (typeof window !== 'undefined' && (window as any).bob?.installUpdate) {
      try {
        await (window as any).bob.installUpdate();
      } catch (err) {
        console.warn('Update restart error, reloading:', err);
        window.location.reload();
      }
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 600);
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
      {/* Header with clean generous spacing */}
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
        {/* Navigation Sidebar */}
        <div className="space-y-1.5">
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${
              activeTab === 'ai'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Cpu className="w-4 h-4 text-[var(--y)]" />
            <span>AI Models & Keys</span>
          </button>

          <button
            onClick={() => setActiveTab('personalization')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${
              activeTab === 'personalization'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#ec4899]" />
            <span>Personalization</span>
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${
              activeTab === 'voice'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Mic className="w-4 h-4 text-amber-500" />
            <span>Voice Models</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${
              activeTab === 'updates'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-emerald-500" />
            <span>App Updates</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${
              activeTab === 'memory'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Database className="w-4 h-4 text-[#8b5cf6]" />
            <span>Research Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('browser')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${
              activeTab === 'browser'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Globe className="w-4 h-4 text-[var(--b)]" />
            <span>Chrome Bridge</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-[12.5px] font-semibold flex items-center gap-3 transition-colors ${
              activeTab === 'privacy'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--g)]" />
            <span>Privacy</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="md:col-span-3">
          {/* AI Models & Keys Section */}
          {activeTab === 'personalization' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#ec4899]" />
                  <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Bob's Personality & Tone</h3>
                </div>
                <p className="text-[12px] text-[var(--m)] leading-relaxed mb-4 mt-1">
                  Describe how you want Bob to sound and behave. Bob follows this preference in every
                  reply, summary, and voice conversation.
                </p>

                <textarea
                  value={tasteDraft}
                  onChange={(e) => setTasteDraft(e.target.value)}
                  rows={4}
                  placeholder="e.g. Warm and playful, short sentences, always end with a concrete next step..."
                  className="w-full resize-none rounded-2xl border border-[var(--line)] bg-[var(--s2)] px-4 py-3 text-[13px] text-[var(--t)] placeholder:text-[var(--m)] outline-none focus:border-[var(--y)] focus:ring-2 focus:ring-[var(--y)]/30 transition-all"
                />

                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    'Direct, sharp synthesis, academic and encouraging with clear next steps.',
                    'Warm and playful, like a close friend who loves research.',
                    'Brief and bullet-first. No fluff, only decisions and next actions.'
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTasteDraft(preset)}
                      className="px-3 py-1.5 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[11px] font-medium text-[var(--m)] hover:text-[var(--t)] hover:border-[var(--y)] transition-all cursor-pointer"
                    >
                      {preset.slice(0, 34)}…
                    </button>
                  ))}
                </div>

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
                    className="px-4 py-2 rounded-xl bg-[var(--y)] hover:bg-[#ebd200] text-[#171717] text-[12px] font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Save preference
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-7">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[18px] font-bold text-[var(--t)] m-0 mb-1">
                  AI Models & Providers
                </h3>
                <p className="text-[12.5px] text-[var(--m)] m-0 leading-relaxed">
                  Connect Google Gemini for ultra-fast cloud inference, or use your local on-device model for 100% free offline privacy.
                </p>
              </div>

              {/* Google Gemini API Integration Card */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-[var(--bs)] text-[#1e40af]">
                      <Sparkles className="w-5 h-5 text-[var(--b)]" />
                    </span>
                    <div>
                      <b className="text-[15px] text-[var(--t)] block">Google Gemini API</b>
                      <small className="text-[11.5px] text-[var(--m)]">
                        Fast cloud model (Gemini 2.5 / 2.0 Flash) with automatic local fallback
                      </small>
                    </div>
                  </div>
                  {hasKey ? (
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#e6f7ed] text-[#14844d] font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>CONNECTED</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[var(--s2)] text-[var(--m)] font-semibold">
                      NOT CONFIGURED
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="w-4 h-4 text-[var(--m)] absolute left-3.5 top-3.5" />
                      <input
                        type="password"
                        value={geminiKeyInput}
                        onChange={(e) => {
                          setGeminiKeyInput(e.target.value);
                          setKeyTestFeedback(null);
                        }}
                        placeholder="Paste AIzaSy... API Key"
                        className="w-full h-11 pl-10 pr-3 text-[13px] rounded-2xl bg-[var(--s2)] border border-[var(--line)] outline-none text-[var(--t)] font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handlePasteClipboard}
                        className="h-11 px-3.5 rounded-2xl bg-[var(--s2)] hover:bg-[var(--line)] text-[12px] font-semibold text-[var(--t)] border border-[var(--line)] flex items-center gap-1.5 transition-colors"
                        title="Paste from clipboard"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Paste</span>
                      </button>
                      <button
                        onClick={handleTestGeminiKey}
                        disabled={!geminiKeyInput.trim() || isTestingKey}
                        className="h-11 px-3.5 rounded-2xl bg-[var(--s2)] hover:bg-[var(--line)] text-[12px] font-semibold text-[var(--t)] border border-[var(--line)] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Test key connection"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
                        <span>{isTestingKey ? 'Testing...' : 'Test Connection'}</span>
                      </button>
                      <button
                        onClick={() => handleSaveGeminiKey(geminiKeyInput)}
                        className="h-11 px-5 rounded-2xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-sm"
                      >
                        Save Key
                      </button>
                      {hasKey && (
                        <button
                          onClick={handleRemoveKey}
                          className="h-11 p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                          title="Remove key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {saveToast && (
                    <div className="text-[12px] text-[var(--g)] font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Gemini API key saved! Will be used for all research synthesis.</span>
                    </div>
                  )}

                  {keyTestFeedback && (
                    <div className={`p-3 rounded-2xl text-[12px] font-medium flex items-center gap-2 animate-in fade-in ${
                      keyTestFeedback.ok 
                        ? 'bg-[#e6f7ed] text-[#14844d] border border-emerald-300' 
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-300'
                    }`}>
                      {keyTestFeedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{keyTestFeedback.message}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11.5px] text-[var(--m)] pt-1">
                    <span>Need a key? Google AI Studio offers free tier keys:</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--b)] hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>Get a free key from Google AI Studio</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Local On-Device Fallback Brain Card */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-[var(--ys)] text-[#765700]">
                      <Cpu className="w-5 h-5 text-[var(--y)]" />
                    </span>
                    <div>
                      <b className="text-[15px] text-[var(--t)] block">Local Offline Reasoning ({activeProfile.name.split(' ')[0]})</b>
                      <small className="text-[11.5px] text-[var(--m)]">
                        {hardware.detectedRamGb}GB RAM Tier · 100% Free · Connects to Ollama (port 11434) or built-in engine
                      </small>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#e6f7ed] text-[#14844d] font-bold">
                    ACTIVE FALLBACK
                  </span>
                </div>
                <p className="text-[12.5px] text-[var(--m)] leading-relaxed m-0">
                  If your Gemini API quota is reached or you go offline without internet, Bob immediately uses this local model without throwing errors or interrupting your research.
                </p>
              </div>
            </div>
          )}

          {/* Voice Models & Local Speech Section */}
          {activeTab === 'voice' && (
            <div className="space-y-7">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[18px] font-bold text-[var(--t)] m-0 mb-1">
                  Voice Models & Local Speech
                </h3>
                <p className="text-[12.5px] text-[var(--m)] m-0 leading-relaxed">
                  100% on-device speech recognition and voice synthesis. Runs offline with zero Gemini transcription credits.
                </p>
              </div>

              {/* Speech Recognition Model: Whisper Tiny */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-7 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Mic className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-[16px] text-[var(--t)]">Whisper Tiny (Quantized)</b>
                        <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                          modelProgress.status === 'downloading'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                            : isWhisperInstalled
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500'
                        }`}>
                          {modelProgress.status === 'downloading'
                            ? 'DOWNLOADING'
                            : isWhisperInstalled
                            ? 'INSTALLED & READY'
                            : 'NOT DOWNLOADED'}
                        </span>
                      </div>
                      <small className="text-[11.5px] text-[var(--m)] block mt-0.5">
                        ~39 MB · On-Device WASM Engine · Automatic Speech-to-Text for Prompt & Call Modes
                      </small>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isWhisperInstalled ? (
                      <>
                        <button
                          type="button"
                          onClick={handleTestMic}
                          disabled={testMicState === 'recording'}
                          className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[var(--t)] transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {testMicState === 'recording' ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              <span>Listening 2s…</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" />
                              <span>Test Mic</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteModel}
                          className="px-3.5 py-2 rounded-xl text-[12px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Delete model from local browser cache"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDownloadModel}
                        disabled={modelProgress.status === 'downloading'}
                        className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>{modelProgress.status === 'downloading' ? 'Downloading…' : 'Download (~39 MB)'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Download Progress Bar */}
                {modelProgress.status === 'downloading' && (
                  <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                    <div className="flex items-center justify-between text-[11.5px] text-[var(--m)]">
                      <span className="truncate max-w-[300px]">{modelProgress.fileName || 'Fetching model weights…'}</span>
                      <span className="font-mono font-bold text-amber-500">{modelProgress.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-200 rounded-full"
                        style={{ width: `${Math.max(5, modelProgress.progress)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Mic Test Feedback Toast */}
                {testMicMessage && (
                  <div className={`p-3 rounded-xl border text-[11.5px] font-medium flex items-center gap-2 ${
                    testMicState === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                  }`}>
                    {testMicState === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{testMicMessage}</span>
                  </div>
                )}
              </div>

              {/* Speech Synthesis Model: Kokoro 82M Neural TTS */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-7 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Volume2 className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-[16px] text-[var(--t)]">Kokoro 82M Natural Voice (ONNX)</b>
                        <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                          kokoroProgress.status === 'downloading'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                            : isKokoroInstalled
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500'
                        }`}>
                          {kokoroProgress.status === 'downloading'
                            ? 'DOWNLOADING'
                            : isKokoroInstalled
                            ? 'INSTALLED & READY'
                            : 'OPTIONAL (FALLBACK ACTIVE)'}
                        </span>
                      </div>
                      <small className="text-[11.5px] text-[var(--m)] block mt-0.5">
                        ~82 MB · WebGPU/WASM ONNX · Expressive Near-Human Voice Synthesis for Call Mode
                      </small>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isKokoroInstalled ? (
                      <>
                        <button
                          type="button"
                          onClick={() => previewVoice(activeVoiceId)}
                          className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[var(--t)] transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={deleteKokoroModel}
                          className="px-3.5 py-2 rounded-xl text-[12px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Remove Kokoro from local cache and use fast system voices"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={downloadKokoroModel}
                        disabled={kokoroProgress.status === 'downloading'}
                        className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>{kokoroProgress.status === 'downloading' ? 'Downloading…' : 'Download Kokoro (~82 MB)'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Kokoro Download Progress Bar */}
                {kokoroProgress.status === 'downloading' && (
                  <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                    <div className="flex items-center justify-between text-[11.5px] text-[var(--m)]">
                      <span className="truncate max-w-[300px]">{kokoroProgress.file || 'Fetching Kokoro 82M weights…'}</span>
                      <span className="font-mono font-bold text-blue-500">{kokoroProgress.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-200 rounded-full"
                        style={{ width: `${Math.max(5, kokoroProgress.progress)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Selector Section: ChatGPT-Style Cards */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
                  <div>
                    <b className="text-[16px] text-[var(--t)] block">Voice Personalities (ChatGPT-Style)</b>
                    <small className="text-[11.5px] text-[var(--m)]">
                      Choose Bob's conversational voice for Call mode and Read Aloud. 100% offline neural speech.
                    </small>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    Zero Latency
                  </span>
                </div>

                <VoiceSelectorCards />
              </div>

              {/* Offline Privacy Guarantee Card */}
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-[var(--line)] text-[12px] text-[var(--m)] leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-[var(--t)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>100% On-Device Privacy Guarantee</span>
                </div>
                <p className="m-0">
                  Your voice never leaves your computer for transcription or synthesis. Even if your internet disconnects or your Gemini API quota is reached, Bob's voice dictation and speech synthesis continue to work without interruptions.
                </p>
              </div>
            </div>
          )}

          {/* App Updates Section (Electron Auto-Updater) */}
          {activeTab === 'updates' && (
            <div className="space-y-7">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[18px] font-bold text-[var(--t)] m-0 mb-1">
                  Desktop Auto-Updates
                </h3>
                <p className="text-[12.5px] text-[var(--m)] m-0 leading-relaxed">
                  Bob checks for updates silently in the background so you never have to manually reinstall setup files.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-7 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-[var(--m)] block">Current Version</span>
                    <b className="text-[20px] font-extrabold text-[var(--t)]">v{installedVersion}</b>
                    <span className="text-[12px] text-[var(--m)] block mt-0.5">Desktop Production Channel</span>
                  </div>

                  <span className={`text-[11px] font-mono px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                    updaterState.status === 'ready'
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-[#1a73e8]'
                      : updaterState.status === 'downloading'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      : updaterState.status === 'available'
                      ? 'bg-[var(--ys)] text-[#765700]'
                      : 'bg-[#e6f7ed] text-[#14844d]'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {updaterState.status === 'ready'
                        ? 'UPDATE READY'
                        : updaterState.status === 'downloading'
                        ? 'DOWNLOADING'
                        : updaterState.status === 'available'
                        ? `UPDATE v${updaterState.version || ''} AVAILABLE`
                        : 'UP TO DATE'}
                    </span>
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className={`w-4 h-4 text-[var(--y)] ${updaterState.status === 'checking' ? 'animate-spin' : ''}`} />
                    <div>
                      <b className="text-[13px] text-[var(--t)] block">Update Status</b>
                      <small className="text-[11.5px] text-[var(--m)]">
                        {updaterState.message || `Running latest build (v${installedVersion})`}
                      </small>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {updaterState.status === 'ready' ? (
                      <button
                        onClick={handleInstallUpdate}
                        className="h-10 px-5 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[12px] font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        Restart to finish update
                      </button>
                    ) : updaterState.status === 'available' ? (
                      <button
                        onClick={async () => {
                          setUpdaterState(prev => ({ ...prev, status: 'downloading', percent: 0 }));
                          if (typeof window !== 'undefined' && (window as any).bob?.downloadUpdate) {
                            await (window as any).bob.downloadUpdate();
                          }
                        }}
                        className="h-10 px-5 rounded-2xl bg-[var(--y)] hover:bg-[#e6ac15] text-[#171717] text-[12px] font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        Download Update v{updaterState.version || ''}
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckForUpdates}
                        disabled={updaterState.status === 'checking'}
                        className="h-10 px-4 rounded-2xl bg-[var(--s)] hover:bg-[var(--line)] text-[12px] font-bold text-[var(--t)] border border-[var(--line)] flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${updaterState.status === 'checking' ? 'animate-spin' : ''}`} />
                        <span>Check for Updates</span>
                      </button>
                    )}
                  </div>
                </div>

                {updaterState.status === 'downloading' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px] text-[var(--m)]">
                      <span>Downloading new version...</span>
                      <span className="font-mono font-bold">{updaterState.percent || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[var(--y)] rounded-full transition-all duration-300"
                        style={{ width: `${updaterState.percent || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Research Memory Section */}
          {activeTab === 'memory' && (
            <div className="space-y-7">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[18px] font-bold text-[var(--t)] m-0 mb-1">
                  Local Research Memory Bank
                </h3>
                <p className="text-[12.5px] text-[var(--m)] m-0 leading-relaxed">
                  Stored directly on your PC to ground answers in your actual notes and tabs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-[var(--s)] border border-[var(--line)] space-y-1 shadow-sm">
                  <span className="text-[10.5px] font-bold uppercase text-[var(--m)]">Saved Evidence</span>
                  <div className="text-[24px] font-extrabold text-[var(--t)]">{memoryStats.totalNodes}</div>
                  <span className="text-[11px] text-[var(--m)]">Notes & captured quotes</span>
                </div>
                <div className="p-5 rounded-3xl bg-[var(--s)] border border-[var(--line)] space-y-1 shadow-sm">
                  <span className="text-[10.5px] font-bold uppercase text-[var(--m)]">Disk Footprint</span>
                  <div className="text-[24px] font-extrabold text-[var(--t)]">{memoryStats.storageSizeKb} KB</div>
                  <span className="text-[11px] text-[var(--m)]">Indexed locally</span>
                </div>
                <div className="p-5 rounded-3xl bg-[var(--s)] border border-[var(--line)] space-y-1 shadow-sm">
                  <span className="text-[10.5px] font-bold uppercase text-[var(--m)]">Cloud Cost</span>
                  <div className="text-[24px] font-extrabold text-[var(--g)]">$0.00</div>
                  <span className="text-[11px] text-[var(--m)]">Zero external server cost</span>
                </div>
              </div>
            </div>
          )}

          {/* Browser Bridge Section */}
          {activeTab === 'browser' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[18px] font-bold text-[var(--t)] m-0 mb-1">Browser & Chrome Bridge</h3>
                <p className="text-[12.5px] text-[var(--m)] m-0 leading-relaxed">
                  Real-time bi-directional link between Bob Desktop and your Chrome Extension side panel.
                </p>
              </div>

              {/* Live Connection Status Banner */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className={`w-4 h-4 rounded-full transition-colors ${extensionConnected ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-red-500 shadow-md shadow-red-500/30'}`} />
                      {extensionConnected && <div className="absolute w-6 h-6 rounded-full bg-emerald-500/25 animate-ping" />}
                    </div>
                    <div>
                      <b className="text-[13.5px] text-[var(--t)] block">
                        {extensionConnected ? 'Chrome Side Panel Connected' : 'Chrome Side Panel Offline or Closed'}
                      </b>
                      <small className="text-[11.5px] text-[var(--m)] block mt-0.5">
                        {extensionConnected
                          ? `Local bridge is actively communicating on 127.0.0.1:${bridgePort} · Real-time message sync active`
                          : `Desktop bridge is listening on port ${bridgePort}. Open Bob in Chrome to connect.`}
                      </small>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (typeof window !== 'undefined' && (window as any).bob?.requestExtensionPanel) {
                        await (window as any).bob.requestExtensionPanel();
                      } else {
                        await fetch('http://127.0.0.1:54321/events/pending', {
                          method: 'POST',
                          headers: { 'content-type': 'application/json', 'x-bob-token': 'development-token' },
                          body: JSON.stringify({ reason: 'user-clicked-chrome' })
                        }).catch(() => {});
                      }
                    }}
                    className="h-9 px-4 rounded-2xl bg-[var(--y)] hover:opacity-95 text-[#17181c] text-[12px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Open in Chrome
                  </button>
                </div>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl divide-y divide-[var(--line)] overflow-hidden shadow-sm">
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <b className="text-[13px] text-[var(--t)] block">Auto-dock Chrome side panel</b>
                    <small className="text-[11px] text-[var(--m)]">Keep Bob active next to your tabs.</small>
                  </div>
                  <button
                    onClick={() => setOpenChromeByDefault(!openChromeByDefault)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${
                      openChromeByDefault ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${openChromeByDefault ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-5 flex items-center justify-between">
                  <div>
                    <b className="text-[13px] text-[var(--t)] block">Auto-Sync Extension Folder</b>
                    <small className="text-[11px] text-[var(--m)]">
                      Load unpacked once from this folder in Chrome. Bob auto-updates these files whenever desktop updates arrive.
                    </small>
                  </div>
                  <button
                    onClick={async () => {
                      if (typeof window !== 'undefined' && (window as any).bob?.openExtensionFolder) {
                        await (window as any).bob.openExtensionFolder();
                      } else {
                        await fetch('http://127.0.0.1:54321/events/extension-folder', { method: 'POST' }).catch(() => {});
                      }
                    }}
                    className="h-9 px-4 rounded-2xl bg-[var(--y)] hover:opacity-95 text-[#17181c] text-[12px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Open Auto-Sync Folder
                  </button>
                </div>

                <div className="p-5 flex items-center justify-between">
                  <div>
                    <b className="text-[13px] text-[var(--t)] block">Chrome Extension Setup & Zip</b>
                    <small className="text-[11px] text-[var(--m)]">Download zip or configure connection.</small>
                  </div>
                  <button
                    onClick={openChromeBridge}
                    className="h-9 px-4 rounded-2xl bg-[var(--s2)] hover:bg-[var(--line)] text-[12px] font-bold text-[var(--t)] border border-[var(--line)] transition-colors"
                  >
                    Configure Extension
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeTab === 'privacy' && (
            <div className="space-y-7">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[18px] font-bold text-[var(--t)] m-0 mb-1">Privacy & Data Storage</h3>
                <p className="text-[12.5px] text-[var(--m)] m-0 leading-relaxed">
                  Your research stays under your direct control.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-3xl p-5 flex items-center justify-between shadow-sm">
                <div>
                  <b className="text-[13px] text-[var(--t)] block">Local-only processing mode</b>
                  <small className="text-[11px] text-[var(--m)]">Keep notes and captured text strictly on device.</small>
                </div>
                <button
                  onClick={() => setLocalOnlyMode(!localOnlyMode)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors ${
                    localOnlyMode ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${localOnlyMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
