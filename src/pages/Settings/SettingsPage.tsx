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
  HardDrive
} from 'lucide-react';
import { detectSystemHardware, MODEL_CATALOG } from '../../lib/hardware';
import { bobAi } from '../../lib/aiEngine';

export const SettingsPage: React.FC = () => {
  const { 
    openChromeBridge, 
    aiDownloadStatus, 
    memoryStats,
    triggerThinking
  } = useApp();

  // Scroll to top on mount as requested
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [activeTab, setActiveTab] = useState<'ai' | 'updates' | 'memory' | 'browser' | 'privacy'>('ai');
  const [openChromeByDefault, setOpenChromeByDefault] = useState(true);
  const [localOnlyMode, setLocalOnlyMode] = useState(true);

  // Gemini API Key state
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => bobAi.getGeminiKey() || '');
  const [hasKey, setHasKey] = useState(() => bobAi.hasGeminiKey());
  const [saveToast, setSaveToast] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Auto updater state
  const [updaterState, setUpdaterState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'latest' | 'error';
    version?: string;
    percent?: number;
    message?: string;
  }>({
    status: 'idle',
    version: '1.0.18',
    message: 'Up to date'
  });

  const [hardware] = useState(() => detectSystemHardware());
  const activeProfile = MODEL_CATALOG[aiDownloadStatus.tier];

  // Listen to desktop auto-updater status if running in Electron
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).bob?.onUpdateStatus) {
      const unsub = (window as any).bob.onUpdateStatus((status: any) => {
        setUpdaterState(status);
      });
      return unsub;
    }
  }, []);

  const handleSaveGeminiKey = (key: string) => {
    const trimmed = key.trim();
    bobAi.setGeminiKey(trimmed);
    setGeminiKeyInput(trimmed);
    setHasKey(Boolean(trimmed));
    setSaveToast(true);
    setKeyTestFeedback(null);
    setTimeout(() => setSaveToast(false), 2500);
    triggerThinking('Key Saved', 'Google Gemini API key updated. Instant response tier active.', 'Configured');
  };

  const handleTestGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setIsTestingKey(true);
    setKeyTestFeedback(null);
    try {
      const res = await bobAi.testGeminiConnection(geminiKeyInput);
      setKeyTestFeedback(res);
      if (res.ok) {
        bobAi.setGeminiKey(geminiKeyInput.trim());
        setHasKey(true);
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

  const handleInstallUpdate = () => {
    if (typeof window !== 'undefined' && (window as any).bob?.installUpdate) {
      (window as any).bob.installUpdate();
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
                    <b className="text-[20px] font-extrabold text-[var(--t)]">v1.0.18</b>
                    <span className="text-[12px] text-[var(--m)] block mt-0.5">Desktop Production Channel</span>
                  </div>

                  <span className={`text-[11px] font-mono px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                    updaterState.status === 'ready'
                      ? 'bg-amber-100 text-amber-800'
                      : updaterState.status === 'downloading'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-[#e6f7ed] text-[#14844d]'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{updaterState.status === 'ready' ? 'UPDATE READY' : updaterState.status === 'downloading' ? 'DOWNLOADING' : 'UP TO DATE'}</span>
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className={`w-4 h-4 text-[var(--y)] ${updaterState.status === 'checking' ? 'animate-spin' : ''}`} />
                    <div>
                      <b className="text-[13px] text-[var(--t)] block">Update Status</b>
                      <small className="text-[11.5px] text-[var(--m)]">
                        {updaterState.message || 'Latest release installed.'}
                      </small>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {updaterState.status === 'ready' ? (
                      <button
                        onClick={handleInstallUpdate}
                        className="h-10 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold shadow-md transition-all active:scale-95"
                      >
                        Restart & Apply
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckForUpdates}
                        disabled={updaterState.status === 'checking'}
                        className="h-10 px-4 rounded-2xl bg-[var(--s)] hover:bg-[var(--line)] text-[12px] font-bold text-[var(--t)] border border-[var(--line)] flex items-center gap-2 transition-colors disabled:opacity-50"
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
            <div className="space-y-7">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[18px] font-bold text-[var(--t)] m-0 mb-1">Browser & Chrome Bridge</h3>
                <p className="text-[12.5px] text-[var(--m)] m-0 leading-relaxed">
                  Connect Bob with Chrome side panel.
                </p>
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
                    <b className="text-[13px] text-[var(--t)] block">Chrome Extension Setup</b>
                    <small className="text-[11px] text-[var(--m)]">Download or test the unpacked extension.</small>
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
