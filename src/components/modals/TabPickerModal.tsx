import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Check } from 'lucide-react';

export const TabPickerModal: React.FC = () => {
  const { isTabPickerOpen, setIsTabPickerOpen, triggerThinking } = useApp();
  const [tabs, setTabs] = useState([
    {
      id: 't-1',
      title: 'Transport booking research and friction points',
      url: 'research.example.com/transport-booking · Current tab',
      checked: true,
      char: 'R',
    },
    {
      id: 't-2',
      title: 'ChatGPT — transport research & market signals',
      url: 'chatgpt.com · 2 useful mentions',
      checked: true,
      char: 'C',
    },
    {
      id: 't-3',
      title: 'Rwanda transport notes & cooperative interviews',
      url: 'docs.example.com · 5 highlights',
      checked: false,
      char: 'N',
    },
    {
      id: 't-4',
      title: 'Competitor booking flow case study',
      url: 'example.org · 1 saved source',
      checked: false,
      char: 'V',
    },
    {
      id: 't-5',
      title: 'AI product research & local model grounding',
      url: 'claude.ai · Related conversation',
      checked: false,
      char: 'A',
    },
  ]);

  if (!isTabPickerOpen) return null;

  const toggleTab = (id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t))
    );
  };

  const selectedCount = tabs.filter((t) => t.checked).length;

  const handleApply = () => {
    setIsTabPickerOpen(false);
    triggerThinking(
      'Tabs selected',
      `Bob connected ${selectedCount} selected tabs to your project context.`,
      'Indexing tab contents'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[580px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Head */}
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
          <div>
            <b className="text-[14px] text-[var(--t)] block">Select research tabs</b>
            <small className="text-[10px] text-[var(--m)]">
              Choose the pages Bob should read and connect to your questions.
            </small>
          </div>
          <button
            onClick={() => setIsTabPickerOpen(false)}
            className="w-7 h-7 rounded-full bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab List */}
        <div className="p-3 max-h-[360px] overflow-y-auto space-y-1">
          {tabs.map((tab) => (
            <label
              key={tab.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--s2)] cursor-pointer select-none transition-colors"
            >
              <input
                type="checkbox"
                checked={tab.checked}
                onChange={() => toggleTab(tab.id)}
                className="accent-[var(--y)] w-4 h-4 rounded"
              />
              <span className="w-7 h-7 rounded-lg bg-[var(--s2)] text-[var(--t)] font-bold text-xs grid place-items-center flex-shrink-0">
                {tab.char}
              </span>
              <div className="min-w-0 flex-1">
                <b className="text-[12px] text-[var(--t)] block truncate">{tab.title}</b>
                <small className="text-[10px] text-[var(--m)] block truncate">{tab.url}</small>
              </div>
            </label>
          ))}
        </div>

        {/* Foot */}
        <div className="p-3.5 border-t border-[var(--line)] flex items-center justify-between bg-[var(--s2)]/40">
          <span className="text-[11px] text-[var(--m)] font-medium">
            {selectedCount} {selectedCount === 1 ? 'tab selected' : 'tabs selected'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsTabPickerOpen(false)}
              className="h-8 px-3 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="h-8 px-3.5 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11px] font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Use selected tabs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
