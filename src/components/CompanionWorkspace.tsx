import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Plus, 
  Search, 
  ExternalLink, 
  Trash2, 
  HardDrive, 
  Wifi, 
  WifiOff, 
  Cloud, 
  Bookmark, 
  Layers, 
  FileText, 
  Compass, 
  Check, 
  Radio, 
  ArrowUpRight,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { 
  ModelTier, 
  ResearchProject, 
  BrowserTabItem, 
  ResearchHighlight, 
  ResearchNote, 
  ChatMessage, 
  BridgeEvent 
} from '../types';
import { MODEL_CATALOG } from '../lib/hardware';
import { runLocalAiSynthesis } from '../lib/localAi';

interface CompanionWorkspaceProps {
  activeTier: ModelTier;
  isOnline: boolean;
  onToggleOnline: () => void;
  onOpenAuth: () => void;
  isSupabaseConnected: boolean;
  userEmail?: string;
  notes: ResearchNote[];
  setNotes: React.Dispatch<React.SetStateAction<ResearchNote[]>>;
  tabs: BrowserTabItem[];
  setTabs: React.Dispatch<React.SetStateAction<BrowserTabItem[]>>;
  highlights: ResearchHighlight[];
  setHighlights: React.Dispatch<React.SetStateAction<ResearchHighlight[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  bridgeEvents: BridgeEvent[];
  setBridgeEvents: React.Dispatch<React.SetStateAction<BridgeEvent[]>>;
}

export function CompanionWorkspace({
  activeTier,
  isOnline,
  onToggleOnline,
  onOpenAuth,
  isSupabaseConnected,
  userEmail,
  notes,
  setNotes,
  tabs,
  setTabs,
  highlights,
  setHighlights,
  messages,
  setMessages,
  bridgeEvents,
  setBridgeEvents,
}: CompanionWorkspaceProps) {
  const [currentView, setCurrentView] = useState<'chat' | 'tabs' | 'highlights' | 'notes' | 'bridge'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [projects] = useState<ResearchProject[]>([
    { id: 'proj-1', name: 'Machine Learning Architectures', color: 'violet', createdAt: '2026-09-20', updatedAt: '2026-09-25' },
    { id: 'proj-2', name: 'Distributed Systems & Edge AI', color: 'emerald', createdAt: '2026-09-22', updatedAt: '2026-09-24' },
  ]);
  const [activeProject, setActiveProject] = useState<ResearchProject>(projects[0]);

  // Note form state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newNoteUrl, setNewNoteUrl] = useState('');

  // Tab simulation state
  const [simTabTitle, setSimTabTitle] = useState('');
  const [simTabUrl, setSimTabUrl] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSynthesizing]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSynthesizing) return;
    const userText = chatInput.trim();
    setChatInput('');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sessionId: activeProject.id,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSynthesizing(true);

    try {
      const res = await runLocalAiSynthesis({
        question: userText,
        notes,
        tabs,
        highlights,
        tier: activeTier,
      });

      const assistantMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sessionId: activeProject.id,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.modelUsed,
        isOfflineSynthesis: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteBody.trim()) return;

    const note: ResearchNote = {
      id: 'note-' + Date.now(),
      projectId: activeProject.id,
      sessionId: 'session-main',
      title: newNoteTitle.trim(),
      body: newNoteBody.trim(),
      url: newNoteUrl.trim() || undefined,
      color: 'yellow',
      createdAt: new Date().toISOString(),
    };

    setNotes((prev) => [note, ...prev]);
    setNewNoteTitle('');
    setNewNoteBody('');
    setNewNoteUrl('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSimulateExtensionTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTabTitle.trim()) return;

    const tab: BrowserTabItem = {
      id: 'tab-' + Date.now(),
      sessionId: activeProject.id,
      tabId: Math.floor(Math.random() * 900) + 100,
      title: simTabTitle.trim(),
      url: simTabUrl.trim() || 'https://arxiv.org/abs/' + Math.floor(Math.random() * 90000),
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTabs((prev) => [tab, ...prev]);
    
    // Add bridge event record
    const event: BridgeEvent = {
      id: 'ev-' + Date.now(),
      type: 'tab',
      timestamp: new Date().toLocaleTimeString(),
      origin: 'Chrome Extension (127.0.0.1:54321)',
      payload: { tabId: tab.tabId, title: tab.title, url: tab.url },
    };
    setBridgeEvents((prev) => [event, ...prev]);

    setSimTabTitle('');
    setSimTabUrl('');
  };

  const activeModel = MODEL_CATALOG[activeTier];

  return (
    <div className="flex flex-col lg:flex-row min-h-[750px] bg-[#0f1115] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar - Matching Bob V0 Design */}
      <aside className="w-full lg:w-64 bg-[#141720] border-r border-neutral-800/80 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-base shadow-md">
                B
              </div>
              <div>
                <span className="font-bold text-neutral-100 text-sm tracking-tight">Bob</span>
                <span className="text-[10px] text-neutral-400 block -mt-0.5">Desktop Companion</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              v1.0.12
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search research..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c202d] border border-neutral-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-violet-500"
            />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs">
            <button
              onClick={() => setCurrentView('chat')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all text-left cursor-pointer ${
                currentView === 'chat'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Research AI Chat</span>
            </button>

            <button
              onClick={() => setCurrentView('tabs')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left cursor-pointer ${
                currentView === 'tabs'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-blue-400" />
                <span>Connected Tabs</span>
              </div>
              <span className="px-1.5 py-0.2 bg-neutral-800 text-neutral-400 text-[10px] rounded">
                {tabs.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView('highlights')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left cursor-pointer ${
                currentView === 'highlights'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>Extension Highlights</span>
              </div>
              <span className="px-1.5 py-0.2 bg-neutral-800 text-neutral-400 text-[10px] rounded">
                {highlights.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView('notes')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left cursor-pointer ${
                currentView === 'notes'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Notes & Citations</span>
              </div>
              <span className="px-1.5 py-0.2 bg-neutral-800 text-neutral-400 text-[10px] rounded">
                {notes.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView('bridge')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left cursor-pointer ${
                currentView === 'bridge'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-rose-400" />
                <span>Port 54321 Bridge</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>
          </nav>

          {/* Active Project Picker */}
          <div className="pt-3 border-t border-neutral-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block mb-2">
              Active Project
            </span>
            <div className="space-y-1">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setActiveProject(proj)}
                  className={`p-2 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeProject.id === proj.id
                      ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full ${
                      proj.color === 'violet' ? 'bg-violet-400' : 'bg-emerald-400'
                    }`} />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  {activeProject.id === proj.id && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Hardware / Sync Status */}
        <div className="pt-4 border-t border-neutral-800/80 space-y-3">
          {/* Active Model Indicator */}
          <div className="p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800 text-xs">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-violet-400" /> Local Model:
              </span>
              <span className="text-emerald-400 font-bold">{activeModel.minRamGb}GB RAM</span>
            </div>
            <div className="text-neutral-200 font-semibold truncate text-[11px]">
              {activeModel.name.split(' ')[0]}
            </div>
          </div>

          {/* Supabase Sync Button */}
          <button
            onClick={onOpenAuth}
            className="w-full py-2 px-3 bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700 text-xs rounded-xl flex items-center justify-between text-neutral-300 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Cloud className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-400' : 'text-neutral-400'}`} />
              <span className="truncate">{isSupabaseConnected ? userEmail || 'Supabase Connected' : 'Connect Supabase'}</span>
            </div>
            <ArrowUpRight className="w-3 h-3 text-neutral-400" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <section className="flex-1 flex flex-col bg-[#0f1115] overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-neutral-800/80 px-5 flex items-center justify-between bg-[#12151d]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                activeProject.color === 'violet' ? 'bg-violet-400' : 'bg-emerald-400'
              }`} />
              {activeProject.name}
            </h2>
            <span className="text-xs text-neutral-500">|</span>
            <span className="text-xs text-neutral-400">
              {currentView === 'chat' && 'AI Synthesis Chat'}
              {currentView === 'tabs' && 'Active Research Browser Tabs'}
              {currentView === 'highlights' && 'Web Highlights & Captures'}
              {currentView === 'notes' && 'Research Notes Corpus'}
              {currentView === 'bridge' && 'Local Bridge (127.0.0.1:54321)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Online/Offline Toggle */}
            <button
              onClick={onToggleOnline}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                isOnline
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" /> Online (Cloud Sync)
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> 100% Offline Mode
                </>
              )}
            </button>

            {/* Bridge Status Indicator */}
            <div className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px]">Bridge :54321</span>
            </div>
          </div>
        </header>

        {/* View 1: AI Chat */}
        {currentView === 'chat' && (
          <div className="flex-1 flex flex-col h-[calc(100%-3.5rem)] overflow-hidden">
            {/* Chat Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={chatScrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-200">Start Your Local Research Chat</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Ask questions across your {notes.length} notes, {tabs.length} open tabs, and {highlights.length} captures. 
                    Running with the {activeModel.name} brain 100% on your machine.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-neutral-400">
                        {msg.role === 'user' ? 'You' : 'Bob AI Brain'}
                      </span>
                      {msg.modelUsed && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-violet-500/20 text-violet-300 rounded font-mono">
                          {msg.modelUsed.split(' ')[0]}
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-500">{msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-[#181c26] text-neutral-200 border border-neutral-800'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {isSynthesizing && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-neutral-400">Bob AI Brain</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-violet-500/20 text-violet-300 rounded animate-pulse">
                      Synthesizing...
                    </span>
                  </div>
                  <div className="bg-[#181c26] text-neutral-400 border border-neutral-800 rounded-2xl px-4 py-3 text-xs flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    Executing local inference on {activeModel.name}...
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-neutral-800/80 bg-[#12151d]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Ask Bob about your research, notes, or tabs..."
                  className="w-full bg-[#181c26] border border-neutral-700/80 focus:border-violet-500 rounded-xl pl-4 pr-12 py-3 text-xs text-neutral-200 placeholder-neutral-500 outline-none transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isSynthesizing}
                  className="absolute right-2 p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Connected Browser Tabs */}
        {currentView === 'tabs' && (
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-100">Chrome Extension Connected Tabs</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tabs automatically reported by the Bob Chrome extension on port 54321.
                </p>
              </div>
            </div>

            {/* Add Tab Simulator */}
            <form onSubmit={handleSimulateExtensionTab} className="bg-[#181c26] border border-neutral-800 p-4 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-neutral-300 block">Simulate Incoming Browser Tab</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Tab Title (e.g., Attention Is All You Need)"
                  value={simTabTitle}
                  onChange={(e) => setSimTabTitle(e.target.value)}
                  className="sm:col-span-6 bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="URL (https://...)"
                  value={simTabUrl}
                  onChange={(e) => setSimTabUrl(e.target.value)}
                  className="sm:col-span-4 bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Connect
                </button>
              </div>
            </form>

            {/* Tabs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tabs.map((tab) => (
                <div key={tab.id} className="p-4 bg-[#181c26] border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-neutral-200 line-clamp-1">{tab.title}</h4>
                    <span className="text-[10px] text-neutral-500 font-mono shrink-0">Tab #{tab.tabId}</span>
                  </div>
                  <p className="text-[11px] text-blue-400 truncate">{tab.url}</p>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-2 border-t border-neutral-800/60">
                    <span>Connected {tab.addedAt}</span>
                    <a
                      href={tab.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5"
                    >
                      Open Link <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View 3: Highlights Rail */}
        {currentView === 'highlights' && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="pb-4 border-b border-neutral-800">
              <h3 className="text-base font-bold text-neutral-100">Extension Captures & Web Highlights</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Quotes selected in the browser and sent via the extension's floating "Notes" or "Ask Bob" toolbar.
              </p>
            </div>

            <div className="space-y-3">
              {highlights.map((h) => (
                <div key={h.id} className="p-4 bg-[#181c26] border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" /> {h.sourceTitle || 'Web Capture'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                      Relevance {h.relevanceScore}%
                    </span>
                  </div>
                  <blockquote className="text-xs text-neutral-300 italic border-l-2 border-amber-400/60 pl-3 py-1">
                    "{h.selectedText}"
                  </blockquote>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-800/60">
                    <span className="truncate max-w-xs">{h.url}</span>
                    <span>{h.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View 4: Notes */}
        {currentView === 'notes' && (
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-100">Research Notes Corpus</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Saved locally in <code className="text-violet-300 font-mono">bob-workspace.json</code> and indexed for the local AI brain.
                </p>
              </div>
            </div>

            {/* Note Creator */}
            <form onSubmit={handleAddNote} className="bg-[#181c26] border border-neutral-800 p-4 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-neutral-300 block">Add Research Note</span>
              <input
                type="text"
                placeholder="Note Title"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none"
                required
              />
              <textarea
                placeholder="Write your observation, evidence, or note body..."
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none resize-none"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Source URL (Optional)"
                  value={newNoteUrl}
                  onChange={(e) => setNewNoteUrl(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Save Note
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="p-4 bg-[#181c26] border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-xs font-bold text-neutral-200">{note.title}</h4>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-neutral-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-300 whitespace-pre-wrap">{note.body}</p>
                  {note.url && (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 pt-1"
                    >
                      Source: {note.url} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View 5: Bridge Live Log */}
        {currentView === 'bridge' && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-100">Extension Bridge Event Monitor</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Listening on <code className="text-violet-300 font-mono">http://127.0.0.1:54321</code> for incoming Chrome extension HTTP POSTs.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Socket Open
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {bridgeEvents.map((ev) => (
                <div key={ev.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-violet-400 font-bold uppercase text-[10px] px-1.5 py-0.5 bg-violet-500/10 rounded border border-violet-500/20">
                      {ev.type}
                    </span>
                    <span className="text-neutral-300">{ev.origin}</span>
                    <span className="text-neutral-500 text-[11px]">payload: {JSON.stringify(ev.payload)}</span>
                  </div>
                  <span className="text-neutral-500 text-[11px]">{ev.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
