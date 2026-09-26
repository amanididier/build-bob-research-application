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

      {/* Bottom Controls & User Profile */}
      <div className="mt-auto pt-3 border-t border-[var(--line)] space-y-1.5">
        <button
          onClick={toggleTheme}
          className="w-full text-left px-3 py-2 rounded-xl text-[12px] flex items-center gap-2.5 hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-[var(--y)]" /> : <Moon className="w-4 h-4 text-[var(--m)]" />}
          <span>{isDark ? 'Light mode' : 'Dark appearance'}</span>
        </button>

        {/* User Profile Card with Clean Settings Gear Icon */}
        <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-[var(--s2)] transition-colors">
          <button
            onClick={() => navigateTo('profile')}
            className="flex items-center gap-2.5 text-left flex-1 min-w-0"
            title="Profile & Preferences"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d9e7ff] to-[#f2d4bb] text-neutral-800 font-extrabold text-[12px] grid place-items-center shadow-sm shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[13px] font-bold text-[var(--t)] truncate leading-tight">
                Amani
              </span>
              <span className="block text-[10.5px] text-[var(--m)] truncate leading-tight">
                Research workspace
              </span>
            </div>
          </button>

          <button
            onClick={() => navigateTo('settings')}
            className="w-8 h-8 rounded-xl hover:bg-[var(--line)]/60 text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors shrink-0"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
