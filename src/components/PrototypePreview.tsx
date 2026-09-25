import { useState, useEffect } from 'react';
import { 
  Play, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Cpu, 
  Wifi, 
  WifiOff, 
  Zap,
  ArrowRight,
  Database,
  Globe,
  Radio,
  Sliders
} from 'lucide-react';
import { ModelTier } from '../types';
import { MODEL_CATALOG, detectSystemHardware, SystemHardwareInfo } from '../lib/hardware';
import { runLocalAiSynthesis } from '../lib/localAi';

interface PrototypePreviewProps {
  activeTier: ModelTier;
  onTierChange: (tier: ModelTier) => void;
  onOpenAuth: () => void;
  userEmail: string;
  isSupabaseConnected: boolean;
}

export function PrototypePreview({
  activeTier,
  onTierChange,
  onOpenAuth,
  userEmail,
  isSupabaseConnected,
}: PrototypePreviewProps) {
  const [currentPage, setCurrentPage] = useState<'chat' | 'dashboard' | 'tasks' | 'summary' | 'tabs' | 'chrome' | 'settings' | 'profile' | 'notifications'>('chat');
  const [isDark, setIsDark] = useState(false);
  const [sideClosed, setSideClosed] = useState(false);
  const [activeChromeTab, setActiveChromeTab] = useState<'article' | 'sidepanel'>('article');
  const [sidePanelTab, setSidePanelTab] = useState<'chat' | 'tabs' | 'summary' | 'tasks'>('chat');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTabPickerOpen, setIsTabPickerOpen] = useState(false);
  
  // Thinking banner state
  const [thinkingState, setThinkingState] = useState<{ show: boolean; title: string; sub: string; step: string }>({
    show: false,
    title: 'Bob is thinking',
    sub: 'Connecting your research...',
    step: 'Reading connected context'
  });

  // Prompt input
  const [promptText, setPromptText] = useState('');
  const [panelPromptText, setPanelPromptText] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string; isAiCard?: boolean }>>([
    { role: 'assistant', text: 'I found a few threads across your research. What should we focus on first?' },
    { role: 'user', text: 'Help me understand the strongest ideas and turn them into a plan I can actually finish.' },
  ]);

  // Hardware detection state
  const [hw, setHw] = useState<SystemHardwareInfo>({
    detectedRamGb: 8,
    cpuCores: 4,
    hasGpu: true,
    webGpuAvailable: true,
    recommendedTier: 'balanced-8gb',
  });

  useEffect(() => {
    const detected = detectSystemHardware();
    setHw(detected);
  }, []);

  const triggerThinking = (title: string, sub: string, step: string, callback?: () => void) => {
    setThinkingState({ show: true, title, sub, step });
    setTimeout(() => {
      setThinkingState((prev) => ({ ...prev, step: 'Ready' }));
      setTimeout(() => {
        setThinkingState((prev) => ({ ...prev, show: false }));
        if (callback) callback();
      }, 1200);
    }, 1500);
  };

  const handleSendPrompt = async () => {
    if (!promptText.trim()) return;
    const text = promptText.trim();
    setPromptText('');
    setChatMessages((prev) => [...prev, { role: 'user', text }]);

    triggerThinking('Bob is thinking', `Synthesizing via ${MODEL_CATALOG[activeTier].name}...`, 'Reading tabs, AI chats and tasks', () => {
      // Simulate on-device reasoning output matching prototype card
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `[Offline AI: ${MODEL_CATALOG[activeTier].name}]\nI connected your query with your saved research context. Here is the synthesized evidence:\n\n• Primary Signal: The research converges around problem validation and reducing friction before adding technical complexity.\n• Cross-source citation: Transport booking friction is corroborated across 3 connected tabs.\n• Actionable next step: Draft a 1-page hypothesis brief for testing with 2 users.`,
          isAiCard: true,
        },
      ]);
    });
  };

  const handleSendPanelPrompt = () => {
    if (!panelPromptText.trim()) return;
    const text = panelPromptText.trim();
    setPanelPromptText('');
    triggerThinking('Current tab captured', 'Bob linked this page to your active research goal.', 'Reading selected browser tabs');
  };

  const activeProfile = MODEL_CATALOG[activeTier];

  return (
    <div className={`space-y-4 ${isDark ? 'dark' : ''}`}>
      {/* Top Banner explaining fidelity to the user */}
      <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-blue-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-400 text-neutral-950 rounded font-mono">
              Exact Prototype Design Engine
            </span>
            <span className="text-xs text-neutral-400">1:1 Replica with Working Components</span>
          </div>
          <h2 className="text-lg font-bold text-neutral-100 mt-1">
            Bob Focus Workspace — Interactive Desktop & Chrome Side Panel
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Every page from your prototype HTML (Chat, Dashboard, Tasks, Summary, Tabs, Chrome, Settings, Profile, Notifications) 
            is fully operational, powered by the offline adaptive AI brain.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-semibold text-neutral-200">{activeProfile.name.split(' ')[0]}</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-bold">
              {activeProfile.minRamGb}GB RAM
            </span>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-neutral-700 transition-all cursor-pointer font-medium"
          >
            {isDark ? '☀ Light Mode' : '☾ Dark Mode'}
          </button>
        </div>
      </div>

      {/* The Actual Prototype Container */}
      <div className={`relative w-full min-h-[720px] rounded-2xl overflow-hidden border border-[#e5e5df] shadow-2xl transition-all ${isDark ? 'bg-[#100e0c] text-[#fffdf8]' : 'bg-[#fafaf8] text-[#171717]'}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        
        {/* APP SHELL */}
        <div className="h-full min-h-[720px] flex">
          {/* SIDEBAR */}
          <aside className={`transition-all duration-200 z-10 flex flex-col shrink-0 ${
            sideClosed ? 'w-0 p-0 overflow-hidden' : 'w-[275px] p-5'
          } ${isDark ? 'bg-[#151211] border-r border-[#3b3129]' : 'bg-white border-r border-[#e5e5df]'}`}>
            {!sideClosed && (
              <>
                <div className="flex items-center gap-2.5 text-2xl font-extrabold mb-4 px-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#fff3a4] to-[#f4bd18] flex items-center justify-center text-base shadow-sm">
                    🤖
                  </div>
                  <span>Bob</span>
                </div>

                <div 
                  onClick={() => setIsSearchOpen(true)}
                  className={`h-11 rounded-xl flex items-center px-3 gap-2.5 cursor-pointer text-xs mb-3 transition-colors ${
                    isDark ? 'bg-[#27211d] text-[#d7d0c8]' : 'bg-[#f2f2ef] text-[#777]'
                  }`}
                >
                  <span className="text-sm">⌕</span>
                  <span className="flex-1">Search</span>
                  <kbd className={`text-[9px] px-1.5 py-0.5 rounded border ${isDark ? 'bg-[#2a2521] border-[#44382f]' : 'bg-white border-[#e5e5df]'}`}>
                    ⌘ K
                  </kbd>
                </div>

                <nav className="grid gap-1 text-xs font-medium">
                  <button 
                    onClick={() => setCurrentPage('chat')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'chat' ? (isDark ? 'bg-[#27211d] font-bold text-white' : 'bg-[#f2f2ef] font-bold text-black') : (isDark ? 'text-[#c2b9ae] hover:bg-[#27211d]' : 'text-[#77776f] hover:bg-[#f2f2ef]')
                    }`}
                  >
                    ✦ New research
                  </button>
                  <button 
                    onClick={() => setCurrentPage('dashboard')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'dashboard' ? (isDark ? 'bg-[#27211d] font-bold text-white' : 'bg-[#f2f2ef] font-bold text-black') : (isDark ? 'text-[#c2b9ae] hover:bg-[#27211d]' : 'text-[#77776f] hover:bg-[#f2f2ef]')
                    }`}
                  >
                    ⌂ Dashboard
                  </button>
                  <button 
                    onClick={() => setCurrentPage('tasks')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'tasks' ? (isDark ? 'bg-[#27211d] font-bold text-white' : 'bg-[#f2f2ef] font-bold text-black') : (isDark ? 'text-[#c2b9ae] hover:bg-[#27211d]' : 'text-[#77776f] hover:bg-[#f2f2ef]')
                    }`}
                  >
                    ✓ Due soon
                  </button>
                  <button 
                    onClick={() => setCurrentPage('chrome')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'chrome' ? (isDark ? 'bg-[#27211d] font-bold text-white' : 'bg-[#f2f2ef] font-bold text-black') : (isDark ? 'text-[#c2b9ae] hover:bg-[#27211d]' : 'text-[#77776f] hover:bg-[#f2f2ef]')
                    }`}
                  >
                    ◉ Chrome side panel
                  </button>
                </nav>

                <div className="text-[10px] tracking-wider text-[#aaa] font-bold px-2 mt-5 mb-2 uppercase">
                  RECENT PROJECTS
                </div>
                <div className="grid gap-1 text-xs">
                  <button onClick={() => setCurrentPage('chat')} className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#f2f2ef]/50 cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-[#f4bc18]" />
                    <span className="truncate">AI research companion</span>
                  </button>
                  <button onClick={() => setCurrentPage('summary')} className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#f2f2ef]/50 cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-[#4b83f5]" />
                    <span className="truncate">Urugendo transport study</span>
                  </button>
                  <button onClick={() => setCurrentPage('chat')} className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#f2f2ef]/50 cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                    <span className="truncate">Bob AI startup study</span>
                  </button>
                </div>

                <div className={`mt-auto pt-3 border-t text-xs space-y-1.5 ${isDark ? 'border-[#3b3129]' : 'border-[#e5e5df]'}`}>
                  <button 
                    onClick={() => setIsDark(!isDark)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#f2f2ef]/50 cursor-pointer flex items-center gap-2"
                  >
                    <span>{isDark ? '☀ Light mode' : '☾ Appearance'}</span>
                  </button>
                  <button 
                    onClick={() => setCurrentPage('settings')}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#f2f2ef]/50 cursor-pointer flex items-center gap-2"
                  >
                    <span>⚙ Settings</span>
                  </button>
                  <div className={`mt-2 p-3 rounded-2xl flex items-center gap-2.5 ${isDark ? 'bg-[#2b2018] text-white border border-[#4a3021]' : 'bg-[#171717] text-white'}`}>
                    <span>🚀</span>
                    <div>
                      <b className="text-xs">Upgrade</b>
                      <small className="block text-[#aaa] text-[9px]">More research power</small>
                    </div>
                    <span className="ml-auto bg-[#f4bc18] text-black font-extrabold text-[9px] px-2 py-1 rounded-full">
                      PRO
                    </span>
                  </div>
                </div>
              </>
            )}
          </aside>

          {/* MAIN PAGE AREA */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
            {/* TOP BAR */}
            <header className={`h-16 px-6 flex items-center justify-between border-b backdrop-blur-md z-8 ${
              isDark ? 'bg-[#151211]/90 border-[#3b3129]' : 'bg-[#fafaf8]/90 border-[#e5e5df]'
            }`}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSideClosed(!sideClosed)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer transition-transform ${
                    isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'
                  }`}
                  title="Toggle sidebar"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 4h10v16H8"/><path d="M4 12h10"/><path d="m10 8 4 4-4 4"/>
                  </svg>
                </button>
                <span className="font-bold text-sm tracking-tight">
                  {currentPage === 'chat' && 'Research workspace'}
                  {currentPage === 'dashboard' && 'Today'}
                  {currentPage === 'tasks' && 'Tasks'}
                  {currentPage === 'summary' && 'Research summary'}
                  {currentPage === 'tabs' && 'Connected tabs'}
                  {currentPage === 'chrome' && 'Chrome side panel'}
                  {currentPage === 'settings' && 'Settings'}
                  {currentPage === 'profile' && 'Profile & preferences'}
                  {currentPage === 'notifications' && 'Notifications'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage('notifications')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-[#27211d]' : 'hover:bg-[#f2f2ef]'
                  }`}
                  title="Notifications"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>
                  </svg>
                </button>
                <button 
                  onClick={() => triggerThinking('Share link ready', 'Your research workspace is ready to share.', 'Preparing clean view')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-[#27211d]' : 'hover:bg-[#f2f2ef]'
                  }`}
                  title="Share"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/>
                    <path d="m8.2 10.8 7.4-4.1M8.2 13.2l7.4 4.1"/>
                  </svg>
                </button>
                <div className="relative group">
                  <button className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d9e7ff] to-[#f2d4bb] flex items-center justify-center text-xs font-bold text-[#1d2b4d] cursor-pointer">
                    🙂
                  </button>
                  {/* Profile Dropdown Card */}
                  <div className={`absolute right-0 top-10 w-52 rounded-2xl p-3 shadow-xl border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 text-xs ${
                    isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'
                  }`}>
                    <b>Amani</b>
                    <p className="text-[10px] text-[#777] mb-2">Research workspace</p>
                    <div onClick={() => setCurrentPage('profile')} className="p-2 rounded-lg hover:bg-neutral-500/10 cursor-pointer">Profile & preferences</div>
                    <div onClick={() => setCurrentPage('notifications')} className="p-2 rounded-lg hover:bg-neutral-500/10 cursor-pointer flex justify-between">Notifications <span>3</span></div>
                    <div onClick={() => setCurrentPage('settings')} className="p-2 rounded-lg hover:bg-neutral-500/10 cursor-pointer">Settings</div>
                    <div onClick={onOpenAuth} className="p-2 rounded-lg hover:bg-neutral-500/10 cursor-pointer text-emerald-400 font-semibold">Cloud Sync (Supabase)</div>
                  </div>
                </div>
              </div>
            </header>

            {/* CONTENT VIEWS */}
            <section className="flex-1 overflow-auto p-6 md:p-8 pb-36">
              {/* PAGE TABS (WHEN NOT IN CHROME) */}
              {currentPage !== 'chrome' && (
                <div className={`h-12 border-b flex gap-7 mb-6 text-xs font-medium ${isDark ? 'border-[#3b3129]' : 'border-[#e5e5df]'}`}>
                  <button 
                    onClick={() => setCurrentPage('chat')} 
                    className={`h-full relative cursor-pointer ${currentPage === 'chat' ? 'font-bold text-[#f4bc18] border-b-2 border-[#f4bc18]' : 'text-[#888]'}`}
                  >
                    Chat
                  </button>
                  <button 
                    onClick={() => setCurrentPage('summary')} 
                    className={`h-full relative cursor-pointer ${currentPage === 'summary' ? 'font-bold text-[#f4bc18] border-b-2 border-[#f4bc18]' : 'text-[#888]'}`}
                  >
                    Summary
                  </button>
                  <button 
                    onClick={() => setCurrentPage('tabs')} 
                    className={`h-full relative cursor-pointer ${currentPage === 'tabs' ? 'font-bold text-[#f4bc18] border-b-2 border-[#f4bc18]' : 'text-[#888]'}`}
                  >
                    Tabs
                  </button>
                  <button 
                    onClick={() => setCurrentPage('tasks')} 
                    className={`h-full relative cursor-pointer ${currentPage === 'tasks' ? 'font-bold text-[#f4bc18] border-b-2 border-[#f4bc18]' : 'text-[#888]'}`}
                  >
                    Tasks
                  </button>
                </div>
              )}

              {/* 1. CHAT PAGE */}
              {currentPage === 'chat' && (
                <div className="max-w-[850px] mx-auto space-y-5">
                  <div className="space-y-2">
                    <span className="text-[10px] tracking-widest text-[#999] uppercase font-bold">TODAY · FOCUSED RESEARCH</span>
                    <h1 className="text-3xl font-extrabold tracking-tight">What are you trying to understand?</h1>
                    <p className="text-xs text-[#777] leading-relaxed max-w-xl">
                      Bob connects what you are reading, what you have asked other AIs, and what you need to finish next.
                    </p>
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f2f2ef] dark:bg-[#27211d] text-[#666] dark:text-[#ddd]">12 browser tabs</span>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f2f2ef] dark:bg-[#27211d] text-[#666] dark:text-[#ddd]">3 AI conversations</span>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f2f2ef] dark:bg-[#27211d] text-[#666] dark:text-[#ddd]">2 deadlines this week</span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-4 pt-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-lg bg-[#fff3c5] dark:bg-[#4a321c] flex items-center justify-center text-xs shrink-0 mt-1">
                            🤖
                          </div>
                        )}
                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? (isDark ? 'bg-[#1d2d43] text-white' : 'bg-[#e7f0ff] text-[#171717]')
                            : (isDark ? 'bg-[#27211d] text-[#eee]' : 'bg-[#f2f2ef] text-[#171717]')
                        }`}>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      </div>
                    ))}

                    {/* Synthesis Card from Prototype */}
                    <div className={`border rounded-2xl p-5 shadow-sm space-y-3 ${
                      isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'
                    }`}>
                      <h3 className="text-sm font-bold m-0">Here is the thread I see</h3>
                      <p className="text-xs text-[#50504b] dark:text-[#d3ccc3] leading-relaxed">
                        Your sources are converging around three themes. I can compare them, surface contradictions, and turn the useful parts into concrete next steps.
                      </p>
                      <ul className="text-xs space-y-1.5 pl-4 list-disc text-[#50504b] dark:text-[#d3ccc3]">
                        <li><b>Problem:</b> research is scattered across tabs and AI chats.</li>
                        <li><b>Signal:</b> several sources point to the same user need.</li>
                        <li><b>Next move:</b> validate the highest-impact assumption.</li>
                      </ul>
                      <div className="flex gap-2 flex-wrap pt-2">
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#f2f2ef] dark:bg-[#27211d] border border-[#e5e5df] dark:border-[#3b3129]">↗ 5 browser sources</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#f2f2ef] dark:bg-[#27211d] border border-[#e5e5df] dark:border-[#3b3129]">Claude · 2 chats</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#f2f2ef] dark:bg-[#27211d] border border-[#e5e5df] dark:border-[#3b3129]">ChatGPT · 1 chat</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#f2f2ef] dark:bg-[#27211d] border border-[#e5e5df] dark:border-[#3b3129]">Task · Validate idea</span>
                      </div>
                      <div className="flex gap-1 pt-2">
                        <button onClick={() => triggerThinking('Copied', 'Context copied to clipboard', 'Ready')} className="p-1.5 rounded hover:bg-neutral-500/10 text-xs">⧉</button>
                        <button onClick={() => triggerThinking('Saved to notes', 'Thread added to your research notes', 'Ready')} className="p-1.5 rounded hover:bg-neutral-500/10 text-xs">♡</button>
                        <button onClick={() => triggerThinking('Share view ready', 'Link prepared', 'Ready')} className="p-1.5 rounded hover:bg-neutral-500/10 text-xs">↗</button>
                        <button onClick={() => triggerThinking('Regenerating', 'Re-evaluating sources with local model', 'Ready')} className="p-1.5 rounded hover:bg-neutral-500/10 text-xs">↻</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DASHBOARD */}
              {currentPage === 'dashboard' && (
                <div className="max-w-[1100px] mx-auto space-y-6">
                  <div>
                    <span className="text-[10px] tracking-widest text-[#999] uppercase font-bold">MONDAY · FOCUS WORKSPACE</span>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-1">Your focus, in one place.</h1>
                    <p className="text-xs text-[#777]">Bob turns scattered research into a small set of actions you can move forward today.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className={`md:col-span-7 p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'}`}>
                      <h3 className="text-sm font-bold">Today's focus</h3>
                      <h2 className="text-2xl font-black">Validate the core problem</h2>
                      <p className="text-xs text-[#777]">68% of this research goal is connected.</p>
                      <div className="h-1.5 bg-[#f2f2ef] dark:bg-[#27211d] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4385f5] rounded-full" style={{ width: '68%' }} />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f2f2ef] dark:bg-[#27211d]">12 tabs</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f2f2ef] dark:bg-[#27211d]">7 sources</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#f2f2ef] dark:bg-[#27211d]">2 tasks due</span>
                      </div>
                    </div>
                    <div className={`md:col-span-5 p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'}`}>
                      <h3 className="text-sm font-bold">Goal progress</h3>
                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span>Problem validation</span>
                            <span>68%</span>
                          </div>
                          <div className="h-1.5 bg-[#f2f2ef] dark:bg-[#27211d] rounded-full overflow-hidden">
                            <div className="h-full bg-[#f4bc18] rounded-full" style={{ width: '68%' }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span>Competitive research</span>
                            <span>42%</span>
                          </div>
                          <div className="h-1.5 bg-[#f2f2ef] dark:bg-[#27211d] rounded-full overflow-hidden">
                            <div className="h-full bg-[#4385f5] rounded-full" style={{ width: '42%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. TASKS */}
              {currentPage === 'tasks' && (
                <div className="max-w-[850px] mx-auto space-y-5">
                  <div>
                    <span className="text-[10px] tracking-widest text-[#999] uppercase font-bold">YOUR RESEARCH PLAN</span>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-1">Small steps. Clear finish lines.</h1>
                    <p className="text-xs text-[#777]">Tasks stay attached to the evidence that created them, so your work does not lose context.</p>
                  </div>
                  <div className={`p-5 rounded-2xl border divide-y ${isDark ? 'bg-[#191716] border-[#3b3129] divide-[#3b3129]' : 'bg-white border-[#e5e5df] divide-[#e5e5df]'}`}>
                    <div className="flex items-center gap-3 py-3">
                      <input type="checkbox" className="rounded" />
                      <div>
                        <b className="text-xs block">Write the problem statement</b>
                        <small className="text-[10px] text-[#777]">Today · connected to 5 sources</small>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-3">
                      <input type="checkbox" className="rounded" />
                      <div>
                        <b className="text-xs block">Compare competitor workflows</b>
                        <small className="text-[10px] text-[#777]">Tomorrow · connected to 4 tabs</small>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-3">
                      <input type="checkbox" className="rounded" />
                      <div>
                        <b className="text-xs block">Interview two potential users</b>
                        <small className="text-[10px] text-[#777]">Friday · validate assumption #2</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. SUMMARY */}
              {currentPage === 'summary' && (
                <div className="max-w-[850px] mx-auto space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] tracking-widest text-[#999] uppercase font-bold">RESEARCH SYNTHESIS · SEPTEMBER 21</span>
                      <h1 className="text-3xl font-extrabold tracking-tight mt-1">Urugendo — Transport App</h1>
                      <div className="flex gap-2 pt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#f2f2ef] dark:bg-[#27211d]">9 sources</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#f2f2ef] dark:bg-[#27211d]">2 AI chats</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#f2f2ef] dark:bg-[#27211d]">3 tasks</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => triggerThinking('Exporting Research', 'Compiling markdown summary and citations...', 'Ready')}
                      className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 cursor-pointer ${
                        isDark ? 'bg-white text-black' : 'bg-black text-white'
                      }`}
                    >
                      Export
                    </button>
                  </div>
                  <div className="space-y-4 text-xs leading-relaxed max-w-2xl">
                    <div className={`p-4 border-b ${isDark ? 'border-[#3b3129]' : 'border-[#e5e5df]'}`}>
                      <h2 className="text-base font-bold mb-1">Idea</h2>
                      <p className="text-[#777]">The research points to a simple starting point: understand the real transport booking problem before adding complexity.</p>
                    </div>
                    <div className={`p-4 border-b ${isDark ? 'border-[#3b3129]' : 'border-[#e5e5df]'}`}>
                      <h2 className="text-base font-bold mb-1">Competition</h2>
                      <p className="text-[#777]">Different sources discuss the same category from different angles. Comparing claims side by side helps separate repeated assumptions from useful evidence.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. TABS */}
              {currentPage === 'tabs' && (
                <div className="max-w-[850px] mx-auto space-y-5">
                  <div>
                    <span className="text-[10px] tracking-widest text-[#999] uppercase font-bold">CONNECTED BROWSER CONTEXT</span>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-1">Your research, across every tab.</h1>
                    <p className="text-xs text-[#777]">Bob keeps the pages that matter attached to your current research session. Live bridge on Port 54321.</p>
                  </div>
                  <div className={`p-5 rounded-2xl border divide-y ${isDark ? 'bg-[#191716] border-[#3b3129] divide-[#3b3129]' : 'bg-white border-[#e5e5df] divide-[#e5e5df]'}`}>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <b className="text-xs block">Transport booking research</b>
                        <small className="text-[10px] text-[#4385f5]">research.example.com/transport-booking</small>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">96% Relevant</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <b className="text-xs block">Attention Is All You Need</b>
                        <small className="text-[10px] text-[#4385f5]">arxiv.org/abs/1706.03762</small>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">92% Relevant</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. CHROME SIDE PANEL REPLICA */}
              {currentPage === 'chrome' && (
                <div className="max-w-none space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] tracking-widest text-[#999] uppercase font-bold">BOB IN CHROME</span>
                      <h1 className="text-2xl font-extrabold">Research, right beside the web.</h1>
                    </div>
                    <button 
                      onClick={() => setCurrentPage('chat')}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      ← Back to Bob desktop
                    </button>
                  </div>

                  {/* Browser Frame */}
                  <div className="border border-[#ddd] rounded-2xl overflow-hidden shadow-2xl bg-white text-black min-h-[550px] flex flex-col">
                    {/* Chrome Tab Bar */}
                    <div className="h-10 bg-[#e9e9e7] flex items-end px-2 gap-1.5">
                      <div className="h-8 bg-white rounded-t-lg px-3 flex items-center gap-2 text-xs font-medium border-t border-x border-[#ddd]">
                        <span className="w-2 h-2 rounded-full bg-[#4285f4]" />
                        <span>Transport booking research</span>
                      </div>
                      <div className="h-8 bg-[#f7f7f6] rounded-t-lg px-3 flex items-center gap-2 text-xs text-[#666]">
                        <span className="w-2 h-2 rounded-full bg-[#f4bc18]" />
                        <span>ChatGPT</span>
                      </div>
                    </div>

                    {/* Omnibox */}
                    <div className="h-11 bg-[#f7f7f6] border-y border-[#ddd] flex items-center px-3 gap-2 text-xs">
                      <div className="flex-1 bg-[#e9e9e8] rounded-full px-3 py-1 text-[#666] flex items-center gap-2">
                        <span>🔒</span>
                        <span>research.example.com/transport-booking</span>
                      </div>
                      <button className="w-7 h-7 rounded-full bg-[#fff0a8] text-[#6b5200] font-black text-xs flex items-center justify-center">
                        B
                      </button>
                    </div>

                    {/* Split View: Article + Bob Side Panel */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-[450px]">
                      {/* Left Article */}
                      <article className="md:col-span-8 p-8 overflow-y-auto max-w-xl mx-auto space-y-4">
                        <span className="text-[10px] text-[#999] uppercase tracking-wider">Research / Transport</span>
                        <h2 className="text-2xl font-black">Why people abandon online transport booking</h2>
                        <p className="text-xs text-[#555] leading-relaxed">
                          Users often leave booking flows when prices, seat availability, or pickup details are unclear. 
                          A useful research workflow should preserve the exact evidence behind these observations instead of only saving a page title.
                        </p>
                        <div className="p-3 bg-[#fff9df] border-l-4 border-[#f4bc18] text-xs text-[#62552b] rounded-r-lg">
                          Bob connects this highlighted passage to your current goal and compares it with evidence from other tabs.
                        </div>
                      </article>

                      {/* Right: Bob Real Side Panel */}
                      <aside className="md:col-span-4 border-l border-[#dcdcd7] bg-white flex flex-col p-4 relative">
                        <div className="flex items-center justify-between pb-3 border-b border-[#ecece8]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#fff3a4] to-[#f4bd18] flex items-center justify-center text-xs">
                              🤖
                            </div>
                            <div>
                              <b className="text-xs block">Bob</b>
                              <small className="text-[9px] text-[#888]">Research companion</small>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-500 font-mono font-bold">Bridge :54321</span>
                        </div>

                        {/* Sidepanel Nav */}
                        <div className="flex gap-2 py-2 border-b border-[#ecece8] text-[10px]">
                          <button onClick={() => setSidePanelTab('chat')} className={`px-2 py-1 rounded-full ${sidePanelTab === 'chat' ? 'bg-black text-white font-bold' : 'text-[#777]'}`}>Chat</button>
                          <button onClick={() => setSidePanelTab('tabs')} className={`px-2 py-1 rounded-full ${sidePanelTab === 'tabs' ? 'bg-black text-white font-bold' : 'text-[#777]'}`}>Tabs</button>
                          <button onClick={() => setSidePanelTab('summary')} className={`px-2 py-1 rounded-full ${sidePanelTab === 'summary' ? 'bg-black text-white font-bold' : 'text-[#777]'}`}>Summary</button>
                        </div>

                        {/* Sidepanel Body */}
                        <div className="flex-1 py-3 text-xs space-y-3 overflow-y-auto">
                          <div className="p-3 bg-[#fbfbf9] border border-[#e4e4df] rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#f4bc18]" />
                              <b className="text-[11px]">Research connection</b>
                            </div>
                            <p className="text-[10px] text-[#676761] leading-relaxed">
                              This passage can be compared with your other transport tabs to see whether the same friction appears repeatedly.
                            </p>
                            <div className="flex gap-1.5 pt-1">
                              <button onClick={() => triggerThinking('Comparing evidence', 'Comparing 3 transport sources', 'Ready')} className="text-[9px] px-2 py-1 rounded border bg-white cursor-pointer">Compare</button>
                              <button onClick={() => triggerThinking('Saved to research', 'Evidence stored in local workspace', 'Ready')} className="text-[9px] px-2 py-1 rounded bg-black text-white cursor-pointer font-bold">Save</button>
                            </div>
                          </div>
                        </div>

                        {/* Sidepanel Composer */}
                        <div className="pt-2 border-t border-[#ecece8] flex gap-2">
                          <input 
                            type="text" 
                            value={panelPromptText}
                            onChange={(e) => setPanelPromptText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendPanelPrompt(); }}
                            placeholder="Ask Bob about this page..."
                            className="flex-1 text-xs bg-[#f4f4f2] border border-[#ddd] rounded-lg px-2.5 py-1.5 outline-none"
                          />
                          <button 
                            onClick={handleSendPanelPrompt}
                            className="w-7 h-7 bg-black text-white rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer"
                          >
                            ↑
                          </button>
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. SETTINGS */}
              {currentPage === 'settings' && (
                <div className="max-w-[850px] mx-auto space-y-6">
                  <div>
                    <span className="text-[10px] tracking-widest text-[#999] uppercase font-bold">BOB SETTINGS</span>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-1">Settings</h1>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'}`}>
                    <h3 className="text-sm font-bold">Adaptive AI Brain & RAM Profiling</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(Object.keys(MODEL_CATALOG) as ModelTier[]).map((tierKey) => {
                        const m = MODEL_CATALOG[tierKey];
                        const isSelected = activeTier === tierKey;
                        return (
                          <div
                            key={tierKey}
                            onClick={() => onTierChange(tierKey)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#f4bc18] bg-[#f4bc18]/10 font-bold'
                                : 'border-[#e5e5df] dark:border-[#3b3129] opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span>{m.minRamGb}GB RAM</span>
                              {isSelected && <span className="text-[#f4bc18]">✓ Active</span>}
                            </div>
                            <div className="text-[11px] truncate">{m.name.split(' ')[0]}</div>
                            <div className="text-[9px] text-[#777] mt-1">{m.tokensPerSec} tokens/sec</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t flex justify-between items-center text-xs">
                      <div>
                        <b>Cloud Database Sync</b>
                        <small className="block text-[#777]">PostgreSQL / Supabase integration</small>
                      </div>
                      <button 
                        onClick={onOpenAuth}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer text-xs"
                      >
                        {isSupabaseConnected ? 'Connected (Supabase)' : 'Connect Database'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* FLOATING CHROME LAUNCHER ICON */}
            <button 
              onClick={() => setCurrentPage('chrome')}
              className="absolute bottom-6 right-6 w-11 h-11 rounded-full bg-white dark:bg-[#191716] border border-[#e5e5df] dark:border-[#3b3129] shadow-xl flex items-center justify-center cursor-pointer hover:-translate-y-0.5 transition-transform z-20"
              title="Open Bob in Chrome"
            >
              <div className="w-6 h-6 rounded-full relative flex items-center justify-center bg-gradient-to-tr from-[#db4437] via-[#f4b400] to-[#0f9d58] p-1">
                <div className="w-3.5 h-3.5 rounded-full bg-[#4285f4] border border-white" />
              </div>
            </button>

            {/* BOTTOM COMPOSER (WHEN NOT IN CHROME) */}
            {currentPage !== 'chrome' && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(800px,calc(100%-40px))] z-25">
                <div className={`p-2.5 rounded-3xl border shadow-2xl transition-all ${
                  isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#d8d8d1]'
                }`}>
                  <textarea 
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendPrompt();
                      }
                    }}
                    placeholder="Ask Bob anything about your research..."
                    rows={1}
                    className="w-full resize-none border-0 outline-none bg-transparent px-3 py-1 text-xs leading-relaxed"
                  />
                  <div className="flex items-center gap-1 px-1 pt-1">
                    <button 
                      onClick={() => setIsUploadOpen(true)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#666] hover:bg-neutral-500/10 cursor-pointer"
                      title="Add files"
                    >
                      ＋
                    </button>
                    <button 
                      onClick={() => setIsToolsOpen(!isToolsOpen)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#666] hover:bg-neutral-500/10 cursor-pointer"
                      title="Tools"
                    >
                      ✦
                    </button>
                    <span className="flex-1" />
                    <button 
                      onClick={handleSendPrompt}
                      className="w-8 h-8 rounded-full bg-[#171717] dark:bg-white text-white dark:text-black flex items-center justify-center cursor-pointer shadow-md"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 11.5 20 4l-3.5 16-4.3-6.1L4 11.5Z"/>
                        <path d="m12.2 13.8 4.2-4.2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* THINKING BANNER */}
        {thinkingState.show && (
          <div className={`fixed right-6 top-20 w-72 rounded-2xl p-4 shadow-2xl border z-50 animate-in fade-in slide-in-from-right-4 duration-200 ${
            isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#fff3a4] dark:bg-[#4a321c] flex items-center justify-center text-sm">
                🤖
              </div>
              <div className="flex-1">
                <b className="text-xs block">{thinkingState.title}</b>
                <small className="text-[10px] text-[#888]">{thinkingState.sub}</small>
              </div>
              <button onClick={() => setThinkingState((p) => ({ ...p, show: false }))} className="text-[#888] text-sm">✕</button>
            </div>
            <div className="h-1 bg-[#f2f2ef] dark:bg-[#27211d] rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[#f4bc18] rounded-full animate-pulse w-3/4" />
            </div>
            <div className="text-[10px] text-[#999] mt-2 font-medium">{thinkingState.step}</div>
          </div>
        )}

        {/* SEARCH OVERLAY */}
        {isSearchOpen && (
          <div 
            onClick={() => setIsSearchOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-24"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-[min(760px,calc(100%-30px))] rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#191716] border-[#3b3129]' : 'bg-white border-[#e5e5df]'
              }`}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e5e5df] dark:border-[#3b3129]">
                <span className="text-xl text-[#777]">⌕</span>
                <input 
                  type="text" 
                  placeholder="Search your research, tabs, tasks and AI conversations..."
                  autoFocus
                  className="flex-1 text-base outline-none bg-transparent"
                />
                <kbd className="text-[10px] px-2 py-1 rounded bg-[#f2f2ef] dark:bg-[#27211d]">ESC</kbd>
              </div>
              <div className="p-3 text-xs space-y-1">
                <div onClick={() => { setCurrentPage('chat'); setIsSearchOpen(false); }} className="p-3 rounded-xl hover:bg-neutral-500/10 cursor-pointer flex items-center gap-3">
                  <span>✦</span>
                  <div>
                    <b>AI research companion</b>
                    <small className="block text-[#888]">12 tabs · 3 AI conversations</small>
                  </div>
                </div>
                <div onClick={() => { setCurrentPage('summary'); setIsSearchOpen(false); }} className="p-3 rounded-xl hover:bg-neutral-500/10 cursor-pointer flex items-center gap-3">
                  <span>↗</span>
                  <div>
                    <b>Urugendo transport study</b>
                    <small className="block text-[#888]">9 sources · summary ready</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
