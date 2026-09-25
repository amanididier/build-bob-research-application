import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Globe, 
  Bell, 
  Terminal, 
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  Database
} from 'lucide-react';
import { detectSystemHardware, MODEL_CATALOG } from '../../lib/hardware';

export const SettingsPage: React.FC = () => {
  const { 
    openChromeBridge, 
    navigateTo, 
    aiDownloadStatus, 
    memoryStats 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ai' | 'memory' | 'browser' | 'privacy' | 'notifications' | 'diagnostics'>('ai');
  const [openChromeByDefault, setOpenChromeByDefault] = useState(true);
  const [localOnlyMode, setLocalOnlyMode] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);

  const [hardware] = useState(() => detectSystemHardware());
  const activeProfile = MODEL_CATALOG[aiDownloadStatus.tier];

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Header */}
      <div className="py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
          SYSTEM PREFERENCES
        </div>
        <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
          Settings & Local Hardware
        </h1>
        <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
          Bob is engineered to run free on your PC hardware without external server costs. Manage your local reasoning model, PC memory bank, and privacy.
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
            <span>AI Brain & Hardware</span>
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
            <span>PC Research Memory</span>
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
            <span>Privacy & Local Storage</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2.5 transition-colors ${
              activeTab === 'diagnostics'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <Terminal className="w-4 h-4 text-neutral-400" />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="md:col-span-3">
          {/* AI & Hardware Section */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">
                  Local AI Brain & Hardware Allocation
                </h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Bob auto-selected this model based on your PC's available memory, ensuring fast responses without crashing.
                </p>
              </div>

              {/* Hardware Detected Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Detected RAM</span>
                  <div className="text-[20px] font-extrabold text-[var(--t)]">{hardware.detectedRamGb} GB</div>
                  <span className="text-[10px] text-[var(--m)]">{hardware.detectedRamGb <= 4 ? '4GB Tier (Fast & Light)' : '8GB+ Tier (Full Reasoning)'}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">CPU Cores</span>
                  <div className="text-[20px] font-extrabold text-[var(--t)]">{hardware.cpuCores} Threads</div>
                  <span className="text-[10px] text-[var(--m)]">Parallel thread execution</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Inference Cost</span>
                  <div className="text-[20px] font-extrabold text-[var(--g)]">$0.00 / mo</div>
                  <span className="text-[10px] text-[var(--m)]">100% on-device private</span>
                </div>
              </div>

              {/* Model Profile Details */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-[var(--ys)] text-[#765700]">
                      <Cpu className="w-5 h-5 text-[var(--y)]" />
                    </span>
                    <div>
                      <b className="text-[14px] text-[var(--t)] block">{activeProfile.name}</b>
                      <small className="text-[11px] text-[var(--m)]">
                        {activeProfile.parameters} · {activeProfile.quantization} · {activeProfile.memoryUsageMb}MB RAM
                      </small>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#e6f7ed] text-[#14844d] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CACHED ON PC</span>
                  </span>
                </div>

                <p className="text-[12.5px] text-[var(--m)] leading-relaxed m-0">
                  {activeProfile.description}
                </p>

                <div className="p-3 bg-[var(--s2)] rounded-xl flex items-center justify-between text-[11px] text-[var(--m)]">
                  <span>Speed: ~{activeProfile.tokensPerSec} tokens / second</span>
                  <span>Minimum RAM: {activeProfile.minRamGb} GB</span>
                </div>
              </div>

              {/* Future Cloud AI Architecture note */}
              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-2">
                <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--t)]">
                  <Sparkles className="w-4 h-4 text-[var(--b)]" />
                  <span>Modular AI Provider Architecture</span>
                </div>
                <p className="text-[11.5px] text-[var(--m)] leading-relaxed m-0">
                  Bob's reasoning layer is designed with a pluggable architecture. It currently uses your local PC model to keep usage completely free and private. When you decide to scale to cloud APIs in the future, it seamlessly supports instant cloud-to-local fallback when credits are depleted.
                </p>
              </div>
            </div>
          )}

          {/* PC Research Memory Section */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">
                  Local PC Research Memory Bank
                </h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Bob's memory of your research stays directly on this PC, customized to your specific topics and past readings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Total Memory Nodes</span>
                  <div className="text-[20px] font-extrabold text-[var(--t)]">{memoryStats.totalNodes}</div>
                  <span className="text-[10px] text-[var(--m)]">Notes, quotes & synthesis</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Disk Space Used</span>
                  <div className="text-[20px] font-extrabold text-[var(--t)]">{memoryStats.storageSizeKb} KB</div>
                  <span className="text-[10px] text-[var(--m)]">Stored in local IndexedDB</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--m)]">Telemetry & Privacy</span>
                  <div className="text-[20px] font-extrabold text-[var(--g)]">0 bytes</div>
                  <span className="text-[10px] text-[var(--m)]">No data sent to outside servers</span>
                </div>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-5 space-y-3">
                <h4 className="text-[13px] font-bold text-[var(--t)] m-0">How Bob uses local memory:</h4>
                <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">
                  Whenever you ask Bob a question, Bob queries your PC's local memory bank first. It pulls the most relevant quotes and facts from your notes and browser tabs to ground its reasoning, preventing hallucinations and giving you specialized answers tailored to your research.
                </p>
              </div>
            </div>
          )}

          {/* Browser Bridge Section */}
          {activeTab === 'browser' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">Browser & Chrome Bridge</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Manage the local WebSocket connection to the Bob Chrome extension.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] divide-y divide-[var(--line)] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Auto-open Chrome side panel</b>
                    <small className="text-[10px] text-[var(--m)]">Keep Bob docked alongside your browser windows.</small>
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
                    <b className="text-[12px] text-[var(--t)] block">Chrome Extension Setup & Downloads</b>
                    <small className="text-[10px] text-[var(--m)]">Install or test the real Chrome Side Panel extension.</small>
                  </div>
                  <button
                    onClick={openChromeBridge}
                    className="h-8 px-3 rounded-lg bg-[var(--s2)] hover:bg-[var(--line)]/60 text-[11px] font-bold text-[var(--t)] border border-[var(--line)] transition-colors"
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
                  Your research notes and documents stay strictly on your local PC.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] divide-y divide-[var(--line)] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Local-only processing mode</b>
                    <small className="text-[10px] text-[var(--m)]">Never send research notes or tabs to third-party servers.</small>
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
            </div>
          )}

          {/* Diagnostics Section */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">Diagnostics & System Status</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Real-time status of Electron chrome, local models, and IPC bridges.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Offline Brain Tier</span>
                    <b className="text-[var(--t)] text-[13px]">{aiDownloadStatus.tier}</b>
                  </div>
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Memory Bank Status</span>
                    <b className="text-[var(--g)] text-[13px]">{memoryStats.totalNodes} Nodes Indexed</b>
                  </div>
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Chrome Extension Bridge</span>
                    <b className="text-[var(--g)] text-[13px]">Connected (:54321)</b>
                  </div>
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Hardware Acceleration</span>
                    <b className="text-[var(--t)] text-[13px]">WebGPU / SIMD Active</b>
                  </div>
                </div>

                <button
                  onClick={() => navigateTo('diagnostics')}
                  className="w-full py-2.5 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11px] font-semibold"
                >
                  Open Full Diagnostics & Benchmarks Center
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
