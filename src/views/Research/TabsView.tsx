import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Check, Circle, ExternalLink, Plus, Search } from 'lucide-react';

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

function relevanceTone(score: number) {
  if (score >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  if (score >= 70) return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
  if (score >= 50) return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800';
  return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
}

export const TabsView: React.FC<TabsViewProps> = ({ isSidePanel = false }) => {
  const { triggerThinking, setIsTabPickerOpen } = useApp();
  const [search, setSearch] = useState('');

  const [tabs, setTabs] = useState<TabItemData[]>(() => {
    const demoTabKeys = new Set([
      'tab-1|Why people abandon online transport booking|https://research.example.com/transport-booking',
      'tab-2|ChatGPT — transport research & friction comparison|https://chatgpt.com/c/transport-flow',
      'tab-3|Rwanda transport booking workflow notes|https://docs.google.com/document/transport',
      'tab-4|Competitor Booking Flow & Checkout Architecture|https://example.org/checkout-case-study',
      'tab-5|AI Product Research & Local Assistant Design|https://claude.ai/chat/ai-product-research',
      'tab-6|General travel blog post and tourism tips|https://travelblog.net/visiting-kigali',
    ]);
    try {
      const saved = localStorage.getItem('bob_tabs_catalog_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((tab: Partial<TabItemData>) =>
            !demoTabKeys.has(`${String(tab?.id || '')}|${String(tab?.title || '')}|${String(tab?.url || '')}`)
          );
          if (cleaned.length !== parsed.length) {
            try {
              localStorage.setItem('bob_tabs_catalog_v2', JSON.stringify(cleaned));
            } catch {}
          }
          return cleaned;
        }
      }
    } catch {}
    return [];
  });

  const persist = (updated: TabItemData[]) => {
    try {
      localStorage.setItem('bob_tabs_catalog_v2', JSON.stringify(updated));
    } catch {}
    return updated;
  };

  const toggleSelectTab = (id: string) => {
    setTabs((prev) =>
      persist(prev.map((t) => (t.id === id ? { ...t, selected: !t.selected, isRelated: true } : t)))
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...tabs].sort((a, b) => b.relevance - a.relevance);
    if (!q) return list;
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q) ||
        (t.preview || '').toLowerCase().includes(q)
    );
  }, [tabs, search]);

  const selectedCount = tabs.filter((t) => t.selected).length;

  return (
    <div className={`mx-auto ${isSidePanel ? 'max-w-none px-1 py-1' : 'max-w-[720px] py-4 pb-24'}`}>
      {/* Minimal centered header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--t)] m-0">Tabs</h1>
          <p className="text-[13px] text-[var(--m)] m-0 mt-1">
            {selectedCount} selected · {tabs.length} connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--m)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or source"
              className="h-9 w-44 sm:w-52 pl-9 pr-3 rounded-full bg-[var(--s)] border border-[var(--line)] text-[12.5px] outline-none focus:ring-2 focus:ring-[var(--y)]/30"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsTabPickerOpen(true)}
            className="h-9 px-3.5 rounded-full bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add
          </button>
        </div>
      </div>

      {/* Clean aligned cards — no description body */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-14 text-center text-[13px] text-[var(--m)]">
            No tabs match that search.
          </div>
        )}

        {filtered.map((tab) => (
          <div
            key={tab.id}
            className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border bg-[var(--s)] transition-all ${
              tab.selected
                ? 'border-[var(--y)]/50 shadow-sm ring-1 ring-[var(--y)]/15'
                : 'border-[var(--line)] hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            {/* Select circle */}
            <button
              type="button"
              onClick={() => toggleSelectTab(tab.id)}
              className="shrink-0 grid place-items-center"
              aria-label={tab.selected ? 'Deselect tab' : 'Select tab'}
            >
              {tab.selected ? (
                <span className="w-5 h-5 rounded-full bg-[var(--y)] text-[#171717] grid place-items-center">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 group-hover:border-[var(--y)] transition-colors" />
              )}
            </button>

            {/* Favicon letter */}
            <span className="shrink-0 w-9 h-9 rounded-xl bg-[var(--s2)] text-[12px] font-semibold text-[var(--m)] grid place-items-center">
              {tab.faviconChar || tab.domain.charAt(0).toUpperCase()}
            </span>

            {/* Title + source only */}
            <div className="min-w-0 flex-1">
              <a
                href={tab.url}
                target="_blank"
                rel="noreferrer"
                className="block text-[13.5px] font-semibold text-[var(--t)] truncate hover:text-[var(--b)] transition-colors"
              >
                {tab.title}
              </a>
              <p className="m-0 mt-0.5 text-[12px] text-[var(--m)] font-medium truncate tracking-tight">
                {tab.domain}
              </p>
            </div>

            {/* Relevance score */}
            <span
              className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-semibold tabular-nums ${relevanceTone(
                tab.relevance
              )}`}
            >
              {tab.relevance}%
            </span>

            <a
              href={tab.url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 p-1.5 rounded-lg text-[var(--m)] opacity-0 group-hover:opacity-100 hover:bg-[var(--s2)] hover:text-[var(--t)] transition-all"
              title="Open"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>

      {!isSidePanel && (
        <p className="mt-6 text-center text-[11px] text-[var(--m)] m-0">
          Selected tabs stay in scope for Bob’s answers and summaries.
        </p>
      )}
    </div>
  );
};
