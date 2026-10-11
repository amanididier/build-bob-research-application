import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Globe, ExternalLink, Plus, Star, Sparkles } from 'lucide-react';

export interface TabItemData {
  id: string;
  title: string;
  domain: string;
  url: string;
  preview: string;
  relevance: number;
  isToday: boolean;
  isRelated: boolean;
  selected: boolean;
  faviconChar: string;
}

interface TabsViewProps {
  isSidePanel?: boolean;
}

export const TabsView: React.FC<TabsViewProps> = ({ isSidePanel = false }) => {
  const { triggerThinking, setIsTabPickerOpen } = useApp();

  const [tabs, setTabs] = useState<TabItemData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bob_tabs_catalog_v2');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'tab-1',
        title: 'Why people abandon online transport booking',
        domain: 'research.example.com',
        url: 'https://research.example.com/transport-booking',
        preview: 'Users often leave booking flows when prices, seat availability, or pickup details are unclear...',
        relevance: 96,
        isToday: true,
        isRelated: true,
        selected: true,
        faviconChar: 'R',
      },
      {
        id: 'tab-2',
        title: 'ChatGPT — transport research & friction comparison',
        domain: 'chatgpt.com',
        url: 'https://chatgpt.com/c/transport-flow',
        preview: 'Comparing claims side by side helps separate repeated assumptions from useful evidence.',
        relevance: 88,
        isToday: true,
        isRelated: true,
        selected: true,
        faviconChar: 'C',
      },
      {
        id: 'tab-3',
        title: 'Rwanda transport booking workflow notes',
        domain: 'docs.google.com',
        url: 'https://docs.google.com/document/transport',
        preview: 'Local cooperative drivers often maintain manual paper ticket registers in parallel with mobile apps.',
        relevance: 92,
        isToday: true,
        isRelated: true,
        selected: true,
        faviconChar: 'N',
      },
      {
        id: 'tab-4',
        title: 'Competitor Booking Flow & Checkout Architecture',
        domain: 'example.org',
        url: 'https://example.org/checkout-case-study',
        preview: 'Analyzing step-by-step dropoff across 4 major East African bus ticketing platforms.',
        relevance: 74,
        isToday: true,
        isRelated: true,
        selected: false,
        faviconChar: 'V',
      },
      {
        id: 'tab-5',
        title: 'AI Product Research & Local Assistant Design',
        domain: 'claude.ai',
        url: 'https://claude.ai/chat/ai-product-research',
        preview: 'Strategies for grounding small local models with live active tab context in Chrome.',
        relevance: 62,
        isToday: false,
        isRelated: false,
        selected: false,
        faviconChar: 'A',
      },
      {
        id: 'tab-6',
        title: 'General travel blog post and tourism tips',
        domain: 'travelblog.net',
        url: 'https://travelblog.net/visiting-kigali',
        preview: 'Things to see around Kigali, local markets, and scenic hills.',
        relevance: 42,
        isToday: false,
        isRelated: false,
        selected: false,
        faviconChar: 'T',
      },
    ];
  });

  const [isOlderTabsOpen, setIsOlderTabsOpen] = useState(false);

  // Filter based on desktop vs side-panel spec:
  // Desktop: Only show related (top priority) tabs opened today
  // Side panel: Can show all, and clicking a tab adds it to Desktop
  const todayTopTabs = tabs.filter((t) => t.isToday && t.isRelated);
  const olderOrOtherTabs = tabs.filter((t) => !t.isToday || !t.isRelated);

  const toggleSelectTab = (id: string) => {
    setTabs((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, selected: !t.selected, isRelated: true } : t
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('bob_tabs_catalog_v2', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handlePromoteToDesktop = (tab: TabItemData) => {
    setTabs((prev) => {
      const updated = prev.map((t) =>
        t.id === tab.id ? { ...t, isRelated: true, isToday: true, selected: true } : t
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('bob_tabs_catalog_v2', JSON.stringify(updated));
      }
      return updated;
    });
    triggerThinking('Tab Added to Desktop', `Added "${tab.title}" to active research scope.`, 'Syncing tab context');
  };

  return (
    <div className={`mx-auto ${isSidePanel ? 'max-w-none px-2 py-1' : 'max-w-[850px] py-2 pb-24'}`}>
      {/* Header */}
      <div className="flex items-center justify-between py-3 pb-5 border-b border-[var(--line)] mb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[var(--m)] uppercase font-semibold">
            {isSidePanel ? 'BROWSER CONTEXT TABS' : 'CONNECTED RESEARCH TABS'}
          </div>
          <h1 className={`${isSidePanel ? 'text-xl' : 'text-3xl'} tracking-tight font-extrabold my-1 text-[var(--t)]`}>
            Tabs & Evidence
          </h1>
          <p className="text-[var(--m)] text-xs leading-relaxed max-w-[620px] m-0">
            {isSidePanel
              ? 'Select any browser tab below to focus and sync it into your main desktop research study.'
              : 'Showing top priority tabs opened today. Older or low-relevance tabs are neatly categorized.'}
          </p>
        </div>

        <button
          onClick={() => setIsTabPickerOpen(true)}
          className="h-8 px-3 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Tab</span>
        </button>
      </div>

      {/* 1. Related Top-Priority Tabs Opened Today */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--t)]">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-[var(--y)] fill-current" />
            <span>Today's Top Priority Tabs ({todayTopTabs.length})</span>
          </div>
          <span className="text-[10px] text-[var(--m)] font-mono">Synced to Bob Brain</span>
        </div>

        <div className="space-y-2.5">
          {todayTopTabs.map((tab) => (
            <div
              key={tab.id}
              className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] shadow-sm flex items-start justify-between gap-3 hover:border-[var(--y)]/40 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleSelectTab(tab.id)}
                  className="mt-0.5 text-[var(--m)] hover:text-[var(--y)] transition-colors shrink-0"
                >
                  {tab.selected ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--g)] fill-current" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[var(--s2)] text-[10px] font-bold text-[var(--m)] flex items-center justify-center font-mono">
                      {tab.faviconChar}
                    </span>
                    <a
                      href={tab.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[var(--t)] hover:text-[var(--y)] truncate block transition-colors"
                    >
                      {tab.title}
                    </a>
                  </div>
                  <p className="text-[11px] text-[var(--m)] line-clamp-2 leading-relaxed">
                    {tab.preview}
                  </p>
                  <div className="text-[10px] text-[var(--m)] font-mono">{tab.domain}</div>
                </div>
              </div>

              {/* Green level of relevance badge */}
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-extrabold shrink-0">
                {tab.relevance}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Older / Collapsed Tabs Archive */}
      {olderOrOtherTabs.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={() => setIsOlderTabsOpen((prev) => !prev)}
            className="flex items-center justify-between w-full text-xs font-bold text-[var(--m)] hover:text-[var(--t)] transition-colors"
          >
            <span>Older or Lower-Relevance Tabs ({olderOrOtherTabs.length})</span>
            {isOlderTabsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {isOlderTabsOpen && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
              {olderOrOtherTabs.map((tab) => (
                <div
                  key={tab.id}
                  className="p-3.5 rounded-xl bg-[var(--s2)]/40 border border-[var(--line)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--t)] truncate">{tab.title}</div>
                    <div className="text-[10px] text-[var(--m)] font-mono">{tab.domain}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-[var(--m)]">{tab.relevance}%</span>
                    <button
                      type="button"
                      onClick={() => handlePromoteToDesktop(tab)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--s)] hover:bg-[var(--y)] hover:text-[#171717] border border-[var(--line)] text-[10px] font-bold text-[var(--t)] transition-all"
                    >
                      Focus in Desktop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
