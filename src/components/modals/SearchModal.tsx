import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Sparkles, BookOpen, CheckSquare, Target, X } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, navigateTo } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const searchItems = [
    {
      title: 'AI research companion',
      sub: '12 tabs · 3 AI conversations',
      icon: '✦',
      page: 'research' as const,
      subView: 'chat' as const,
      projId: 'ai-companion',
    },
    {
      title: 'Urugendo transport study',
      sub: '9 sources · summary ready',
      icon: '↗',
      page: 'research' as const,
      subView: 'summary' as const,
      projId: 'urugendo',
    },
    {
      title: 'Validate the core problem',
      sub: 'Task · due today',
      icon: '✓',
      page: 'tasks' as const,
      subView: undefined,
      projId: undefined,
    },
    {
      title: 'Bob AI startup study',
      sub: '7 sources · 2 open tasks',
      icon: '◌',
      page: 'research' as const,
      subView: 'chat' as const,
      projId: 'bob-startup',
    },
    {
      title: 'Competitive research & market signals',
      sub: 'Goal · 42% complete',
      icon: '◎',
      page: 'home' as const,
      subView: undefined,
      projId: undefined,
    },
  ];

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const filtered = searchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.sub.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSearchOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-100"
    >
      <div className="w-full max-w-[680px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--line)]">
          <Search className="w-5 h-5 text-[var(--m)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your research, tabs, tasks and AI conversations..."
            className="flex-1 bg-transparent border-0 outline-none text-[15px] text-[var(--t)]"
          />
          <kbd
            onClick={() => setIsSearchOpen(false)}
            className="text-[10px] font-mono bg-[var(--s2)] px-2 py-0.5 rounded border border-[var(--line)] text-[var(--m)] cursor-pointer hover:bg-[var(--line)]"
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[var(--m)] text-[12px]">
              No matching research found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setIsSearchOpen(false);
                  navigateTo(item.page, item.subView, item.projId);
                }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--s2)] cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--s2)] text-[var(--t)] font-bold text-sm grid place-items-center flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <b className="text-[13px] text-[var(--t)] block truncate">{item.title}</b>
                  <small className="text-[11px] text-[var(--m)] block truncate">{item.sub}</small>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[var(--line)] text-[10px] text-[var(--m)] bg-[var(--s2)]/40 flex justify-between items-center">
          <span>Search updates in real-time · click any result to open immediately</span>
          <span>Tip: Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
