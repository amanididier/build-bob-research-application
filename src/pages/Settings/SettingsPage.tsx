import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Globe, 
  Sparkles,
  Key,
  CheckCircle2,
  Database,
  Download,
  ClipboardCheck,
  ExternalLink,
  Trash2
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

  const [activeTab, setActiveTab] = useState<'ai' | 'memory' | 'browser' | 'privacy' | 'diagnostics'>('ai');
  const [openChromeByDefault, setOpenChromeByDefault] = useState(true);
  const [localOnlyMode, setLocalOnlyMode] = useState(true);

  // Gemini API Key state
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => bobAi.getGeminiKey() || '');
  const [hasKey, setHasKey] = useState(() => bobAi.hasGeminiKey());
  const [saveToast, setSaveToast] = useState(false);

  const [hardware] = useState(() => detectSystemHardware());
  const activeProfile = MODEL_CATALOG[aiDownloadStatus.tier];

  const handleSaveGeminiKey = (key: string) => {
    bobAi.setGeminiKey(key);
    setGeminiKeyInput(key);
    setHasKey(Boolean(key.trim()));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
    triggerThinking('Key Saved', 'Google Gemini API key updated. Instant response tier active.', 'Configured');
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
    triggerThinking('Key Removed', 'Reverted to local on-device model.', 'Ready');
  };

  const handleDownloadDiagnostics = () => {
    const report = {
      app: 'Bob Research Companion',
      version: '1.0.14',
      timestamp: new Date().toISOString(),
      hardware: {
        detectedRamGb: hardware.detectedRamGb,
        cpuCores: hardware.cpuCores,
        hasGpu: hardware.hasGpu,
        recommendedTier: hardware.recommendedTier,
      },
      aiEngine: {
        activeModel: activeProfile.name,
        parameters: activeProfile.parameters,
        memoryUsageMb: activeProfile.memoryUsageMb,
        geminiCloudEnabled: hasKey,
        isLocalCached: aiDownloadStatus.isReady,
      },
      localMemoryBank: {
        totalNodes: memoryStats.totalNodes,
        notesCount: memoryStats.notesCount,
        highlightsCount: memoryStats.highlightsCount,
        storageSizeKb: memoryStats.storageSizeKb,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bob-system-diagnostics.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Header */}
      <div className="py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
          PREFERENCES & AI
        </div>
        <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
          Settings
        </h1>
        <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
          Manage your AI reasoning model, Google Gemini API key, local memory bank, and browser extensions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2.5 transition-colors ${
              activeTab === 'ai'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Cpu className="w-4 h-4 text-[var(--y)]" />
            <span>AI Models & Keys</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2.5 transition-colors ${
              activeTab === 'memory'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Database className="w-4 h-4 text-[#8b5cf6]" />
            <span>Research Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('browser')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2.5 transition-colors ${
              activeTab === 'browser'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Globe className="w-4 h-4 text-[var(--b)]" />
            <span>Chrome Bridge</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2.5 transition-colors ${
              activeTab === 'privacy'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--g)]" />
            <span>Privacy</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2.5 transition-colors ${
              activeTab === 'diagnostics'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Download className="w-4 h-4 text-neutral-400" />
            <span>Diagnostics & Export</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="md:col-span-3">
          {/* AI Models & Keys Section */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">
                  AI Models & Providers
                </h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Connect Google Gemini for ultra-fast cloud inference, or use your local on-device model for 100% free offline privacy.
                </p>
              </div>

              {/* Google Gemini API Integration Card */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.02)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-[var(--bs)] text-[#1e40af]">
                      <Sparkles className="w-5 h-5 text-[var(--b)]" />
                    </span>
                    <div>
                      <b className="text-[14px] text-[var(--t)] block">Google Gemini API</b>
                      <small className="text-[11px] text-[var(--m)]">
                        High-speed cloud model (gemini-2.5-flash) with automatic local fallback
                      </small>
                    </div>
                  </div>
                  {hasKey ? (
                    <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-[#e6f7ed] text-[#14844d] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>CONNECTED</span>
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-[var(--s2)] text-[var(--m)] font-semibold">
                      NOT CONFIGURED
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="w-4 h-4 text-[var(--m)] absolute left-3 top-3" />
                      <input
                        type="password"
                        value={geminiKeyInput}
                        onChange={(e) => setGeminiKeyInput(e.target.value)}
                        placeholder="Paste AIzaSy... API Key"
                        className="w-full h-10 pl-9 pr-3 text-[12.5px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none text-[var(--t)] font-mono"
                      />
                    </div>
                    <button
                      onClick={handlePasteClipboard}
                      className="h-10 px-3.5 rounded-xl bg-[var(--s2)] hover:bg-[var(--line)] text-[12px] font-semibold text-[var(--t)] border border-[var(--line)] flex items-center gap-1.5 transition-colors"
                      title="Paste from clipboard"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Paste</span>
                    </button>
                    <button
                      onClick={() => handleSaveGeminiKey(geminiKeyInput)}
                      className="h-10 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12px] font-bold hover:opacity-90 transition-opacity"
                    >
                      Save Key
                    </button>
                    {hasKey && (
                      <button
                        onClick={handleRemoveKey}
                        className="h-10 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                        title="Remove key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {saveToast && (
                    <div className="text-[11.5px] text-[var(--g)] font-semibold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Gemini API key saved to settings!</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-[var(--m)] pt-1">
                    <span>Don't have an API key yet?</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--b)] hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>Get a free key from Google AI Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Local On-Device Fallback Brain Card */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.02)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-[var(--ys)] text-[#765700]">
                      <Cpu className="w-5 h-5 text-[var(--y)]" />
                    </span>
                    <div>
                      <b className="text-[14px] text-[var(--t)] block">Local Offline Model ({activeProfile.name.split(' ')[0]})</b>
                      <small className="text-[11px] text-[var(--m)]">
                        {hardware.detectedRamGb}GB RAM Tier · 100% Free · Runs on your device
                      </small>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-[#e6f7ed] text-[#14844d] font-bold">
                    ACTIVE FALLBACK
                  </span>
                </div>
                <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">
                  If your Gemini API quota is reached or you go offline without internet, Bob immediately uses this local model without throwing errors or interrupting your research.
                </p>
              </div>
            </div>
          )}

          {/* Research Memory Section */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">
                  Local Research Memory Bank
                </h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Stored directly on your PC to ground answers in your actual notes and tabs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Saved Evidence</span>
                  <div className="text-[20px] font-extrabold text-[var(--t)]">{memoryStats.totalNodes}</div>
                  <span className="text-[10px] text-[var(--m)]">Notes & captured quotes</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Disk Footprint</span>
                  <div className="text-[20px] font-extrabold text-[var(--t)]">{memoryStats.storageSizeKb} KB</div>
                  <span className="text-[10px] text-[var(--m)]">Indexed locally</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Cloud Cost</span>
                  <div className="text-[20px] font-extrabold text-[var(--g)]">$0.00</div>
                  <span className="text-[10px] text-[var(--m)]">Zero external server cost</span>
                </div>
              </div>
            </div>
          )}

          {/* Browser Bridge Section */}
          {activeTab === 'browser' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">Browser & Chrome Bridge</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Connect Bob with Chrome side panel.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] divide-y divide-[var(--line)] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Auto-dock Chrome side panel</b>
                    <small className="text-[10px] text-[var(--m)]">Keep Bob active next to your tabs.</small>
                  </div>
                  <button
                    onClick={() => setOpenChromeByDefault(!openChromeByDefault)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      openChromeByDefault ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${openChromeByDefault ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Chrome Extension Setup</b>
                    <small className="text-[10px] text-[var(--m)]">Download or test the unpacked extension.</small>
                  </div>
                  <button
                    onClick={openChromeBridge}
                    className="h-8 px-3 rounded-lg bg-[var(--s2)] hover:bg-[var(--line)] text-[11px] font-bold text-[var(--t)] border border-[var(--line)] transition-colors"
                  >
                    Configure Extension
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">Privacy & Data Storage</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Your research stays under your direct control.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] p-4 flex items-center justify-between">
                <div>
                  <b className="text-[12px] text-[var(--t)] block">Local-only processing mode</b>
                  <small className="text-[10px] text-[var(--m)]">Keep notes and captured text strictly on device.</small>
                </div>
                <button
                  onClick={() => setLocalOnlyMode(!localOnlyMode)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors ${
                    localOnlyMode ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${localOnlyMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          )}

          {/* Diagnostics & Export Section */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">System Diagnostics & Export</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Export complete system diagnostics and hardware profiles as a clean JSON file.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">RAM Profile</span>
                    <b className="text-[var(--t)] text-[13px]">{hardware.detectedRamGb} GB RAM</b>
                  </div>
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Active Brain</span>
                    <b className="text-[var(--t)] text-[13px]">{hasKey ? 'Gemini 2.5 Flash' : activeProfile.name.split(' ')[0]}</b>
                  </div>
                </div>

                <button
                  onClick={handleDownloadDiagnostics}
                  className="w-full h-11 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Diagnostics Report (JSON)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
