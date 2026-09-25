import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { BobLogo } from '../BobLogo';
import { 
  Sparkles, 
  Home, 
  BookOpen, 
  CheckSquare, 
  Moon, 
  Sun, 
  Settings, 
  Rocket, 
  Search 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    currentPage, 
    navigateTo, 
    projects, 
    activeResearchId, 
    isSidebarClosed, 
    setIsSearchOpen 
  } = useApp();
  const { isDark, toggleTheme } = useTheme();

  if (isSidebarClosed) {
    return null;
  }

  return (
    <aside className="w-[275px] bg-[var(--s)] border-r border-[var(--line)] px-4 py-5 flex flex-col flex-shrink-0 z-20 h-full select-none">
      {/* Brand Header with real Bob mascot */}
      <div className="flex items-center gap-2.5 px-2 mb-4">
        <BobLogo size={34} withText textClassName="text-[22px] font-extrabold tracking-tight" />
      </div>

      {/* Mini Search Bar (⌘ K) */}
      <div
        onClick={() => setIsSearchOpen(true)}
        className="h-11 bg-[var(--s2)] rounded-[13px] flex items-center px-3 gap-2.5 cursor-pointer text-[#777] dark:text-[#a8a199] hover:bg-[var(--line)]/50 transition-colors mb-3"
      >
        <Search className="w-4 h-4 text-[#888]" />
        <span className="text-[13px] flex-1">Search</span>
        <kbd className="text-[9px] bg-[var(--s)] dark:bg-[#191716] border border-[var(--line)] px-1.5 py-0.5 rounded-md font-mono text-[#888]">
          ⌘ K
        </kbd>
      </div>

      {/* Primary Navigation */}
      <nav className="space-y-1">
        <button
          onClick={() => navigateTo('research', 'chat')}
          className={`w-full text-left px-3 py-2 rounded-xl text-[13px] flex items-center gap-2.5 font-medium transition-colors ${
            currentPage === 'research'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[var(--y)]" />
          <span>✦ New research</span>
        </button>

        <button
          onClick={() => navigateTo('home')}
          className={`w-full text-left px-3 py-2 rounded-xl text-[13px] flex items-center gap-2.5 font-medium transition-colors ${
            currentPage === 'home'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]'
          }`}
        >
          <Home className="w-4 h-4 text-[var(--m)]" />
          <span>⌂ Dashboard</span>
        </button>

        <button
          onClick={() => navigateTo('notes')}
          className={`w-full text-left px-3 py-2 rounded-xl text-[13px] flex items-center gap-2.5 font-medium transition-colors ${
            currentPage === 'notes'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[var(--m)]" />
          <span>▤ Notes</span>
        </button>

        <button
          onClick={() => navigateTo('tasks')}
          className={`w-full text-left px-3 py-2 rounded-xl text-[13px] flex items-center gap-2.5 font-medium transition-colors ${
            currentPage === 'tasks'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-[var(--m)]" />
          <span>✓ Due soon</span>
        </button>
      </nav>

      {/* Recent Projects Section */}
      <div className="text-[10px] tracking-[0.09em] text-[#aaa] font-bold mt-6 px-2 mb-1.5 uppercase">
        RECENT PROJECTS
      </div>
      <div className="space-y-0.5 overflow-y-auto max-h-[190px]">
        {projects.map((proj) => (
          <button
            key={proj.id}
            onClick={() => navigateTo('research', 'chat', proj.id)}
            className={`w-full text-left px-3 py-2 rounded-xl text-[12px] flex items-center gap-2.5 transition-colors ${
              currentPage === 'research' && activeResearchId === proj.id
                ? 'bg-[var(--s2)] font-semibold text-[var(--t)]'
                : 'text-[var(--t)] hover:bg-[var(--s2)]'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: proj.dotColor }}
            />
            <span className="truncate">{proj.title}</span>
          </button>
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="mt-auto pt-3 border-t border-[var(--line)] space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full text-left px-3 py-2 rounded-xl text-[12px] flex items-center gap-2.5 hover:bg-[var(--s2)] text-[var(--t)] transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-[var(--y)]" /> : <Moon className="w-4 h-4 text-[var(--m)]" />}
          <span>{isDark ? '☀ Light mode' : '☾ Appearance'}</span>
        </button>

        <button
          onClick={() => navigateTo('settings')}
          className="w-full text-left px-3 py-2 rounded-xl text-[12px] flex items-center gap-2.5 hover:bg-[var(--s2)] text-[var(--t)] transition-colors"
        >
          <Settings className="w-4 h-4 text-[var(--m)]" />
          <span>⚙ Settings</span>
        </button>

        {/* Pro Upgrade Pill */}
        <div className="mt-2 bg-[#171717] dark:bg-[#2b2018] text-white dark:border dark:border-[#4a3021] rounded-[17px] p-3 flex items-center gap-2.5 shadow-sm">
          <Rocket className="w-5 h-5 text-[var(--y)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <b className="block text-[12px] font-bold">Upgrade</b>
            <small className="block text-[9px] text-[#aaa]">More research power</small>
          </div>
          <span className="bg-[var(--y)] text-neutral-900 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider">
            PRO
          </span>
        </div>
      </div>
    </aside>
  );
};
