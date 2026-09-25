import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Cpu, 
  ShieldCheck, 
  Globe, 
  Bell, 
  Check, 
  Activity,
  Sliders,
  Sparkles
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme();
  const { triggerThinking, navigateTo, startOnboarding, openChromeBridge } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'ai' | 'research' | 'browser' | 'privacy' | 'notifications' | 'diagnostics'>('appearance');

  // Toggle states
  const [openChromeByDefault, setOpenChromeByDefault] = useState(true);
  const [showConnectedContext, setShowConnectedContext] = useState(true);
  const [proactiveResearch, setProactiveResearch] = useState(true);
  const [confidenceSignals, setConfidenceSignals] = useState(true);
  const [localOnlyMode, setLocalOnlyMode] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 pb-6 border-b border-[var(--line)] mb-8">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            BOB SETTINGS
          </div>
          <h1 className="text-[32px] tracking-[-1px] font-extrabold my-1.5 text-[var(--t)]">
            Settings & Preferences
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Quiet controls for how Bob works, looks, and stays connected to your research and local hardware.
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d9e7ff] to-[#f2d4bb] text-neutral-800 font-extrabold text-lg grid place-items-center shadow-sm">
          A
        </div>
      </div>

      {/* Settings Layout: Left Nav + Right Content */}
      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-10">
        {/* Settings Sub-navigation */}
        <aside className="space-y-1">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
              activeTab === 'appearance'
                ? 'bg-[var(--s2)] text-[var(--t)] font-bold'
                : 'text-[var(--m)] hover:bg-[var(--s2)]/60 hover:text-[var(--t)]'
            }`}
          >
            Appearance & Theme
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
              activeTab === 'general'
                ? 'bg-[var(--s2)] text-[var(--t)] font-bold'
                : 'text-[var(--m)] hover:bg-[var(--s2)]/60 hover:text-[var(--t)]'
            }`}
          >
            Workspace Behavior
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-[var(--s2)] text-[var(--t)] font-bold'
                : 'text-[var(--m)] hover:bg-[var(--s2)]/60 hover:text-[var(--t)]'
            }`}
          >
            AI Models & Brain
          </button>
          <button
            onClick={() => setActiveTab('browser')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
              activeTab === 'browser'
                ? 'bg-[var(--s2)] text-[var(--t)] font-bold'
                : 'text-[var(--m)] hover:bg-[var(--s2)]/60 hover:text-[var(--t)]'
            }`}
          >
            Browser & Chrome Bridge
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
              activeTab === 'privacy'
                ? 'bg-[var(--s2)] text-[var(--t)] font-bold'
                : 'text-[var(--m)] hover:bg-[var(--s2)]/60 hover:text-[var(--t)]'
            }`}
          >
            Privacy & Offline Data
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-[var(--s2)] text-[var(--t)] font-bold'
                : 'text-[var(--m)] hover:bg-[var(--s2)]/60 hover:text-[var(--t)]'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
              activeTab === 'diagnostics'
                ? 'bg-[var(--s2)] text-[var(--t)] font-bold'
                : 'text-[var(--m)] hover:bg-[var(--s2)]/60 hover:text-[var(--t)]'
            }`}
          >
            System Diagnostics
          </button>
        </aside>

        {/* Settings Body */}
        <div className="space-y-8 max-w-[720px]">
          {/* Appearance Section */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">Appearance</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Select your interface theme or let Bob adapt to your operating system.
                </p>
              </div>

              {/* Theme Selector Cards */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    theme === 'light'
                      ? 'border-[var(--y)] bg-[var(--s)] shadow-md ring-2 ring-[var(--y)]/20'
                      : 'border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s)]'
                  }`}
                >
                  <Sun className={`w-6 h-6 mx-auto mb-2 ${theme === 'light' ? 'text-[var(--y)]' : 'text-[var(--m)]'}`} />
                  <b className="block text-[12px] text-[var(--t)]">Light Mode</b>
                  <small className="text-[10px] text-[var(--m)]">Clean & bright</small>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    theme === 'dark'
                      ? 'border-[var(--y)] bg-[var(--s)] shadow-md ring-2 ring-[var(--y)]/20'
                      : 'border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s)]'
                  }`}
                >
                  <Moon className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-[var(--y)]' : 'text-[var(--m)]'}`} />
                  <b className="block text-[12px] text-[var(--t)]">Dark Mode</b>
                  <small className="text-[10px] text-[var(--m)]">Warm night contrast</small>
                </button>

                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    theme === 'system'
                      ? 'border-[var(--y)] bg-[var(--s)] shadow-md ring-2 ring-[var(--y)]/20'
                      : 'border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s)]'
                  }`}
                >
                  <Monitor className={`w-6 h-6 mx-auto mb-2 ${theme === 'system' ? 'text-[var(--y)]' : 'text-[var(--m)]'}`} />
                  <b className="block text-[12px] text-[var(--t)]">System Auto</b>
                  <small className="text-[10px] text-[var(--m)]">Follows Windows</small>
                </button>
              </div>

              {/* Setting rows */}
              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] divide-y divide-[var(--line)] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">High Contrast Highlights</b>
                    <small className="text-[10px] text-[var(--m)]">Use saturated green and amber for research text highlights.</small>
                  </div>
                  <button
                    onClick={() => setConfidenceSignals(!confidenceSignals)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      confidenceSignals ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${
                        confidenceSignals ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* General Workspace Section */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">Workspace Behavior</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Configure default research flows and context display.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] divide-y divide-[var(--line)] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Show Connected Context Rail</b>
                    <small className="text-[10px] text-[var(--m)]">Display tabs, AI chats, tasks, and goals under responses.</small>
                  </div>
                  <button
                    onClick={() => setShowConnectedContext(!showConnectedContext)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      showConnectedContext ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${showConnectedContext ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Proactive Research Synthesis</b>
                    <small className="text-[10px] text-[var(--m)]">Allow Bob to surface contradictions across open tabs automatically.</small>
                  </div>
                  <button
                    onClick={() => setProactiveResearch(!proactiveResearch)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      proactiveResearch ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${proactiveResearch ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Bob Introduction Tour</b>
                    <small className="text-[10px] text-[var(--m)]">Revisit the first-launch interactive onboarding guide.</small>
                  </div>
                  <button
                    onClick={startOnboarding}
                    className="h-8 px-3 rounded-lg bg-[var(--s2)] hover:bg-[var(--line)]/60 text-[11px] font-bold text-[var(--t)] border border-[var(--line)] transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-[var(--y)]" />
                    <span>Replay Tour</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Models Section */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">AI Models & Hardware</h3>
                  <p className="text-[12px] text-[var(--m)] m-0">
                    Bob operates locally with small efficient language models that run offline.
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('diagnostics')}
                  className="px-3 py-1.5 rounded-xl bg-[var(--ys)] text-[#765700] text-[11px] font-bold"
                >
                  Open AI Benchmark
                </button>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-[var(--ys)] text-[#765700]">
                      <Cpu className="w-5 h-5 text-[var(--y)]" />
                    </span>
                    <div>
                      <b className="text-[13px] text-[var(--t)] block">Active Tier: Balanced 8GB RAM</b>
                      <small className="text-[10px] text-[var(--m)]">Qwen 2.5 1.5B (4-bit quantized) · ~420MB RAM</small>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#e6f7ed] text-[#14844d] font-bold">
                    ONLINE & READY
                  </span>
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

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--line)] pb-4">
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0 mb-1">Notification Preferences</h3>
                <p className="text-[12px] text-[var(--m)] m-0">
                  Choose when Bob nudges you regarding research findings and tasks.
                </p>
              </div>

              <div className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] divide-y divide-[var(--line)] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <b className="text-[12px] text-[var(--t)] block">Task Deadlines & Due Alerts</b>
                    <small className="text-[10px] text-[var(--m)]">Get notified when an attached task is due today.</small>
                  </div>
                  <button
                    onClick={() => setDeadlineAlerts(!deadlineAlerts)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      deadlineAlerts ? 'bg-[#171717] dark:bg-[var(--y)]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow-sm transition-transform ${deadlineAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
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
                    <span className="text-[var(--m)] block">Electron Framework</span>
                    <b className="text-[var(--t)] text-[13px]">v34.0.0 (Chromium 132)</b>
                  </div>
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Chrome Extension Bridge</span>
                    <b className="text-[var(--g)] text-[13px]">Connected (:54321)</b>
                  </div>
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Local SQLite DB</span>
                    <b className="text-[var(--t)] text-[13px]">Healthy (42kb)</b>
                  </div>
                  <div className="p-3 bg-[var(--s2)] rounded-xl">
                    <span className="text-[var(--m)] block">Hardware Acceleration</span>
                    <b className="text-[var(--t)] text-[13px]">WebGPU Active</b>
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
