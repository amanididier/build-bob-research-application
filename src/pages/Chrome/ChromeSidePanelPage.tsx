import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../../components/BobAvatar';
import { 
  ArrowLeft, 
  RotateCcw, 
  MoreVertical, 
  Send, 
  Sparkles, 
  Check, 
  Copy, 
  Bookmark, 
  Plus, 
  ExternalLink,
  Lock,
  Layers,
  CheckCircle2
} from 'lucide-react';

export const ChromeSidePanelPage: React.FC = () => {
  const { navigateTo, triggerThinking, addNote, setIsTabPickerOpen } = useApp();
  const [panelView, setPanelView] = useState<'chat' | 'tabs' | 'summary' | 'tasks'>('chat');
  const [panelPrompt, setPanelPrompt] = useState('');
  const [panelMessages, setPanelMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string }>>([
    {
      role: 'assistant',
      text: 'I found a useful pattern on this page: unclear price, seat availability, and pickup details interrupt passenger booking.',
    },
  ]);

  // Selection Bubble State
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const handleTextSelect = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString().trim(),
        x: Math.max(20, Math.min(window.innerWidth - 200, rect.left)),
        y: Math.max(80, rect.top - 45),
      });
    } else {
      setSelection(null);
    }
  };

  const handleCopySelection = () => {
    if (selection) {
      navigator.clipboard?.writeText(selection.text);
      setSelection(null);
      triggerThinking('Copied text', 'Text copied to system clipboard.', 'Clipboard ready');
    }
  };

  const handleSaveSelection = () => {
    if (selection) {
      addNote({
        title: 'Highlight from research.example.com',
        selectedText: selection.text,
        sourceTitle: 'Why people abandon online transport booking',
        sourceUrl: 'research.example.com/transport-booking',
        projectId: 'urugendo',
        relevance: 95,
        color: 'yellow',
      });
      setSelection(null);
      triggerThinking('Highlight Added to Bob', 'Saved passage to your active research.', 'Saving quote and source');
    }
  };

  const handleSendPanel = () => {
    if (!panelPrompt.trim()) return;
    const text = panelPrompt.trim();
    setPanelPrompt('');
    setPanelMessages((prev) => [...prev, { role: 'user', text }]);
    triggerThinking('Bob reading tab', 'Connecting article text with question...', 'Reading active page', () => {
      setPanelMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Based on this page, the strongest reason for dropoff is sudden commission fee addition at step 3. Would you like me to add this to your research summary?`,
        },
      ]);
    });
  };

  return (
    <div className="max-w-none px-4 md:px-6 py-4 pb-20 select-text" onMouseUp={handleTextSelect}>
      {/* Intro Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            BOB IN CHROME
          </div>
          <h1 className="text-[26px] tracking-[-1px] font-extrabold my-1 text-[var(--t)]">
            Research, right beside the web.
          </h1>
          <p className="text-[var(--m)] text-[12px] m-0">
            Bob stays docked alongside your browsing session to capture highlights and synthesize cross-tab context in real time.
          </p>
        </div>

        <button
          onClick={() => navigateTo('home')}
          className="h-8 px-3.5 rounded-full border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Bob Desktop</span>
        </button>
      </div>

      {/* Real Chrome Mock Window Frame */}
      <div className="min-h-[640px] border border-[var(--line)] rounded-[18px] overflow-hidden bg-[var(--s)] shadow-lg flex flex-col">
        {/* Chrome Tab Strip */}
        <div className="h-10 bg-[#e9e9e7] dark:bg-[#201c19] flex items-end px-3 gap-1.5 border-b border-[#ddd] dark:border-[#3b3129]">
          <div className="h-8 min-w-[190px] max-w-[240px] px-3 flex items-center gap-2 bg-white dark:bg-[#171412] rounded-t-lg text-[11px] text-[var(--t)] font-medium border-t border-x border-[#ddd] dark:border-[#3b3129] shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4285f4]" />
            <span className="truncate">Why people abandon online booking</span>
            <span className="ml-auto text-[#888] cursor-pointer">×</span>
          </div>

          <div className="h-8 min-w-[140px] px-3 flex items-center gap-2 bg-[#f7f7f6] dark:bg-[#29241f] rounded-t-lg text-[11px] text-[#555] dark:text-[#ddd]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f4bc18]" />
            <span className="truncate">ChatGPT — transport</span>
          </div>

          <button className="w-7 h-7 grid place-items-center text-[#666] text-base hover:bg-black/5 rounded">
            +
          </button>
        </div>

        {/* Chrome Toolbar & Omni Address Bar */}
        <div className="h-11 bg-[#f7f7f6] dark:bg-[#201c19] flex items-center gap-2 px-3 border-b border-[#ddd] dark:border-[#3b3129]">
          <button className="w-7 h-7 rounded-full grid place-items-center text-[#666] hover:bg-black/5">
            ‹
          </button>
          <button className="w-7 h-7 rounded-full grid place-items-center text-[#666] hover:bg-black/5">
            ›
          </button>
          <button className="w-7 h-7 rounded-full grid place-items-center text-[#666] hover:bg-black/5">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Omni Bar */}
          <div className="h-8 flex-1 bg-[#e9e9e8] dark:bg-[#2a2521] rounded-full px-3.5 flex items-center gap-2 text-[11px] text-[#666] dark:text-[#d7d0c8]">
            <Lock className="w-3 h-3 text-[#777]" />
            <span>https://research.example.com/transport-booking</span>
          </div>

          {/* Chrome Extension Icon with Bob Mascot */}
          <div
            title="Bob Chrome Extension (Active)"
            className="w-7 h-7 rounded-full bg-[#fff0a8] dark:bg-[#4a3818] p-0.5 grid place-items-center border border-[#d9c35e] cursor-pointer"
          >
            <BobAvatar size={20} />
          </div>
          <button className="text-[#666] px-1 font-bold">⋮</button>
        </div>

        {/* Chrome Workspace Split (Web View 1fr + Side Panel 372px) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_372px] min-h-[540px]">
          {/* Main Web Page View */}
          <div className="overflow-y-auto p-8 md:p-12 bg-white dark:bg-[#171412] max-w-[760px] mx-auto">
            <div className="text-[11px] text-[#999] mb-4">
              Research / Digital transport / Booking friction
            </div>
            <h1 className="text-[32px] font-extrabold tracking-tight text-[var(--t)] leading-tight mb-4">
              Why people abandon online transport booking
            </h1>
            <p className="text-[15px] text-[#555] dark:text-[#d0c7be] leading-relaxed mb-6 font-medium">
              A research report examining the friction points that cause prospective bus and taxi passengers to drop out before checkout.
            </p>

            <p className="text-[13px] text-[#686863] dark:text-[#d0c7be] leading-relaxed my-4 selection:bg-[#ffe58a] selection:text-neutral-900 cursor-text">
              Users often leave booking flows when prices, seat availability, or pickup details are unclear. A useful research workflow should preserve the exact evidence behind these observations instead of only saving a page title.
            </p>

            {/* Research Callout */}
            <div className="my-6 p-4 bg-[#fff9df] dark:bg-[#332817] border-l-4 border-[var(--y)] rounded-r-xl text-[12px] text-[#62552b] dark:text-[#e0cf9c] leading-relaxed">
              <b>Bob Insight:</b> Select any paragraph in this article to save quotes directly to your project notes or copy cleanly formatted evidence into your research chat.
            </div>

            <p className="text-[13px] text-[#686863] dark:text-[#d0c7be] leading-relaxed my-4 selection:bg-[#ffe58a] selection:text-neutral-900 cursor-text">
              The strongest evidence appears when several independent sources point to the same friction. Comparing those passages helps a researcher distinguish repeated assumptions from meaningful signals.
            </p>

            <div className="flex gap-2 flex-wrap mt-8 pt-4 border-t border-[var(--line)]">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[var(--m)] border border-[var(--line)]">
                Source · research.example.com
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[var(--m)] border border-[var(--line)]">
                Goal · Validate core problem
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[var(--m)] border border-[var(--line)]">
                3 related tabs
              </span>
            </div>
          </div>

          {/* Bob Chrome Side Panel (372px) */}
          <div className="border-t lg:border-t-0 lg:border-l border-[#dcdcd7] dark:border-[#3b3129] bg-white dark:bg-[#171412] flex flex-col relative">
            {/* Side Panel Top Bar */}
            <div className="h-14 px-4 border-b border-[#e7e7e2] dark:border-[#3b3129] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BobAvatar size={26} />
                <div>
                  <b className="text-[12px] text-[var(--t)] block">Bob</b>
                  <small className="text-[9px] text-[var(--m)] block">Research companion</small>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => triggerThinking('Syncing Chrome', 'Refreshing connected tabs context...', 'Active')}
                  className="w-7 h-7 rounded-lg hover:bg-[var(--s2)] text-[var(--m)] grid place-items-center"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className="w-7 h-7 rounded-lg hover:bg-[var(--s2)] text-[var(--m)] grid place-items-center font-bold"
                >
                  ⋮
                </button>
              </div>
            </div>

            {/* Side Panel Mini Navigation */}
            <div className="flex gap-1 px-3 py-2 border-b border-[#ededed] dark:border-[#3b3129] overflow-x-auto">
              <button
                onClick={() => setPanelView('chat')}
                className={`px-3 py-1 text-[10px] rounded-full font-medium transition-colors ${
                  panelView === 'chat'
                    ? 'bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717]'
                    : 'text-[var(--m)] hover:bg-[var(--s2)]'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setPanelView('tabs')}
                className={`px-3 py-1 text-[10px] rounded-full font-medium transition-colors ${
                  panelView === 'tabs'
                    ? 'bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717]'
                    : 'text-[var(--m)] hover:bg-[var(--s2)]'
                }`}
              >
                Tabs
              </button>
              <button
                onClick={() => setPanelView('summary')}
                className={`px-3 py-1 text-[10px] rounded-full font-medium transition-colors ${
                  panelView === 'summary'
                    ? 'bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717]'
                    : 'text-[var(--m)] hover:bg-[var(--s2)]'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setPanelView('tasks')}
                className={`px-3 py-1 text-[10px] rounded-full font-medium transition-colors ${
                  panelView === 'tasks'
                    ? 'bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717]'
                    : 'text-[var(--m)] hover:bg-[var(--s2)]'
                }`}
              >
                Tasks
              </button>
            </div>

            {/* Side Panel Content Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
              {panelView === 'chat' && (
                <>
                  <div className="p-3 bg-[var(--s2)] rounded-xl space-y-2">
                    <h4 className="text-[12px] font-bold text-[var(--t)] m-0">
                      Active Tab Context
                    </h4>
                    <p className="text-[10px] text-[var(--m)] m-0 leading-relaxed">
                      Bob is reading <b>research.example.com</b> and linking insights to <b>Urugendo study</b>.
                    </p>
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      <button
                        onClick={() => triggerThinking('Tab Attached', 'Current page linked to goal.', 'Linked')}
                        className="text-[9px] px-2 py-1 rounded bg-[var(--s)] border border-[var(--line)] text-[var(--t)]"
                      >
                        + Current page
                      </button>
                      <button
                        onClick={() => setIsTabPickerOpen(true)}
                        className="text-[9px] px-2 py-1 rounded bg-[var(--s)] border border-[var(--line)] text-[var(--t)]"
                      >
                        3 related tabs
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3">
                    {panelMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && <BobAvatar size={22} />}
                        <div
                          className={`max-w-[85%] text-[11px] px-3 py-2 rounded-xl leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-[var(--bs)] text-[#1e3a8a] dark:text-[#bfdbfe]'
                              : 'bg-[var(--s2)] text-[var(--t)]'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {panelView === 'tabs' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[12px] font-bold text-[var(--t)] m-0">Detected Tabs</h4>
                    <button
                      onClick={() => setIsTabPickerOpen(true)}
                      className="text-[10px] text-[var(--y)] font-semibold"
                    >
                      Select tabs
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--s2)] text-[11px] space-y-1">
                    <b className="block truncate text-[var(--t)]">1. Why people abandon online booking</b>
                    <small className="block text-[9px] text-[var(--m)]">research.example.com · Current tab</small>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--s)] text-[11px] space-y-1">
                    <b className="block truncate text-[var(--t)]">2. ChatGPT — transport research</b>
                    <small className="block text-[9px] text-[var(--m)]">chatgpt.com · 2 mentions</small>
                  </div>
                </div>
              )}

              {panelView === 'summary' && (
                <div className="space-y-2.5 text-[11px] text-[var(--t)]">
                  <h4 className="text-[12px] font-bold m-0">Quick Synthesis</h4>
                  <p className="text-[var(--m)] leading-relaxed m-0">
                    Pricing shock at checkout and missing station location are the two dominant friction drivers across all transport pages.
                  </p>
                  <button
                    onClick={() => triggerThinking('Summary Saved', 'Pushed to main research report.', 'Updated')}
                    className="w-full py-2 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[10px] font-semibold"
                  >
                    Save to Research Report
                  </button>
                </div>
              )}

              {panelView === 'tasks' && (
                <div className="space-y-2 text-[11px]">
                  <h4 className="text-[12px] font-bold text-[var(--t)] m-0">Active Tasks</h4>
                  <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--s2)] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--g)] flex-shrink-0" />
                    <span className="truncate text-[var(--t)]">Verify pricing friction</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--s)] flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border border-neutral-400 flex-shrink-0" />
                    <span className="truncate text-[var(--t)]">Compare 3 transport sources</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Side Panel Composer */}
            <div className="absolute left-3 right-3 bottom-3 bg-white dark:bg-[#191716] border border-[#dcdcd6] dark:border-[#44372e] rounded-2xl p-2 shadow-lg">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={panelPrompt}
                  onChange={(e) => setPanelPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPanel()}
                  placeholder="Ask Bob about this page..."
                  className="flex-1 text-[11px] bg-transparent outline-none px-2 text-[var(--t)]"
                />
                <button
                  onClick={handleSendPanel}
                  className="w-7 h-7 rounded-lg bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] grid place-items-center flex-shrink-0 text-xs font-bold"
                >
                  ↑
                </button>
              </div>
              <div className="text-[8px] text-[#aaa] px-2 pt-1">
                Bob uses active page, selected tabs and your goal.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Selection Bubble (Appears strictly when text is highlighted) */}
      {selection && (
        <div
          style={{ left: selection.x, top: selection.y }}
          className="fixed z-50 flex items-center gap-1.5 bg-[#171717] text-white px-2 py-1.5 rounded-xl shadow-xl border border-neutral-700 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={handleCopySelection}
            className="px-2.5 py-1 text-[10px] font-medium rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
          <button
            onClick={handleSaveSelection}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--y)] text-neutral-950 hover:bg-[#e0ac15] transition-colors flex items-center gap-1"
          >
            <Bookmark className="w-3 h-3" />
            <span>Add to Bob</span>
          </button>
        </div>
      )}
    </div>
  );
};
