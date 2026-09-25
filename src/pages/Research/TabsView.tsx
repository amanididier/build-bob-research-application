import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Globe, ExternalLink, Plus } from 'lucide-react';

interface TabData {
  id: string;
  title: string;
  domain: string;
  url: string;
  preview: string;
  relevance: number;
  selected: boolean;
  faviconChar: string;
}

export const TabsView: React.FC = () => {
  const { triggerThinking, setIsTabPickerOpen } = useApp();
  const [tabs, setTabs] = useState<TabData[]>([
    {
      id: 'tab-1',
      title: 'Why people abandon online transport booking',
      domain: 'research.example.com',
      url: 'https://research.example.com/transport-booking',
      preview: 'Users often leave booking flows when prices, seat availability, or pickup details are unclear...',
      relevance: 96,
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
      selected: false,
      faviconChar: 'T',
    },
  ]);

  const [isOtherTabsOpen, setIsOtherTabsOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const getRelevanceBadge = (relevance: number) => {
    if (relevance >= 80) {
      return {
        bg: '#e6f7ed',
        text: '#14844d',
        border: '#38b96e',
        label: 'High relevance',
      };
    } else if (relevance >= 66) {
      return {
        bg: '#e7f0ff',
        text: '#1d4ed8',
        border: '#4385f5',
        label: 'Supporting',
      };
    } else if (relevance >= 50) {
      return {
        bg: '#fff3c5',
        text: '#854d0e',
        border: '#f4bc18',
        label: 'Related',
      };
    } else {
      return {
        bg: '#fee2e2',
        text: '#991b1b',
        border: '#ef4444',
        label: 'Low relevance',
      };
    }
  };

  const selectedTabs = tabs.filter((t) => t.selected);
  const otherTabs = tabs.filter((t) => !t.selected);

  return (
    <div className="max-w-[850px] mx-auto py-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            CONNECTED BROWSER CONTEXT
          </div>
          <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            Connected Research Tabs
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Bob monitors and extracts relevant passages from your active Chrome session. Only selected tabs are fed into responses and summaries.
          </p>
        </div>

        <button
          onClick={() => setIsTabPickerOpen(true)}
          className="h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Tabs</span>
        </button>
      </div>

      {/* Selected Tabs Section */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--t)] m-0">
            Selected Tabs ({selectedTabs.length})
          </h3>
          <span className="text-[11px] text-[var(--m)]">
            Active in synthesis
          </span>
        </div>

        <div className="space-y-2.5">
          {selectedTabs.map((tab) => {
            const badge = getRelevanceBadge(tab.relevance);
            return (
              <div
                key={tab.id}
                className="bg-[var(--s)] border border-[var(--line)] rounded-[15px] p-4 flex items-start gap-3.5 hover:shadow-sm transition-shadow"
              >
                {/* Selection Circle */}
                <button
                  onClick={() => toggleSelect(tab.id)}
                  className="mt-1 text-[var(--g)] flex-shrink-0"
                >
                  <CheckCircle2 className="w-5 h-5 fill-current" />
                </button>

                {/* Favicon Icon */}
                <div className="w-7 h-7 rounded-[8px] bg-[var(--s2)] text-[var(--t)] font-bold text-[11px] grid place-items-center flex-shrink-0 mt-0.5">
                  {tab.faviconChar}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <b className="text-[13px] text-[var(--t)] truncate block font-bold">
                      {tab.title}
                    </b>
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {tab.relevance}% · {badge.label}
                    </span>
                  </div>

                  <small className="block text-[11px] text-[var(--m)] mt-0.5">
                    {tab.domain}
                  </small>

                  <p className="text-[12px] text-[#50504b] dark:text-[#d3ccc3] mt-2 leading-relaxed m-0">
                    "{tab.preview}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Other Tabs Section (Collapsible) */}
      <div className="space-y-3">
        <button
          onClick={() => setIsOtherTabsOpen(!isOtherTabsOpen)}
          className="flex items-center gap-2 text-[14px] font-bold text-[var(--t)] hover:text-[var(--y)] transition-colors"
        >
          {isOtherTabsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>Other Detected Tabs ({otherTabs.length})</span>
          <span className="text-[11px] font-normal text-[var(--m)] ml-2">
            Click to view and connect
          </span>
        </button>

        {isOtherTabsOpen && (
          <div className="space-y-2.5 pt-1">
            {otherTabs.map((tab) => {
              const badge = getRelevanceBadge(tab.relevance);
              return (
                <div
                  key={tab.id}
                  className="bg-[var(--s)]/70 border border-[var(--line)] rounded-[15px] p-4 flex items-start gap-3.5 hover:bg-[var(--s)] transition-colors opacity-90"
                >
                  <button
                    onClick={() => toggleSelect(tab.id)}
                    className="mt-1 text-[#aaa] hover:text-[var(--t)] flex-shrink-0"
                  >
                    <Circle className="w-5 h-5" />
                  </button>

                  <div className="w-7 h-7 rounded-[8px] bg-[var(--s2)] text-[var(--m)] font-bold text-[11px] grid place-items-center flex-shrink-0 mt-0.5">
                    {tab.faviconChar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <b className="text-[13px] text-[var(--t)] truncate block font-bold">
                        {tab.title}
                      </b>
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {tab.relevance}% · {badge.label}
                      </span>
                    </div>

                    <small className="block text-[11px] text-[var(--m)] mt-0.5">
                      {tab.domain}
                    </small>

                    <p className="text-[12px] text-[var(--m)] mt-1.5 leading-relaxed m-0">
                      "{tab.preview}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
