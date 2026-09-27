import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { BobLogo } from '../BobLogo';
import { 
  Sparkles, 
  LayoutDashboard, 
  NotebookPen, 
  CircleCheck, 
  Search, 
  Sun, 
  Moon, 
  Settings 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    currentPage, 
    navigateTo, 
    projects, 
    activeResearchId, 
    isSidebarClosed, 
    setIsSearchOpen,
    createNewResearchSession
  } = useApp();
  const { isDark, toggleTheme } = useTheme();

  if (isSidebarClosed) {
    return null;
  }

  return (
    <aside className="w-[260px] bg-[var(--s)] border-r border-[var(--line)] px-4 py-4 flex flex-col flex-shrink-0 z-20 h-full select-none">
      {/* 1. Header: Small Bob mascot + Bob */}
      <div className="flex items-center gap-2.5 px-1 mb-5">
        <BobLogo size={26} shape="transparent" />
        <span className="text-[19px] font-semibold text-[var(--t)] tracking-tight">
          Bob
        </span>
      </div>

      {/* 2. Compact AI-app Search control (⌘ K) */}
      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
        className="h-10 w-full bg-[var(--s2)]/80 hover:bg-[var(--s2)] border border-[var(--line)]/50 rounded-xl flex items-center px-3 gap-2.5 cursor-pointer text-[var(--m)] hover:text-[var(--t)] transition-colors duration-150 mb-5 text-left"
        title="Search research and notes (⌘ K)"
      >
        <Search className="w-[18px] h-[18px] text-[var(--m)] shrink-0" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        <span className="text-[13px] flex-1">Search</span>
        <kbd className="text-[10px] bg-[var(--s)] border border-[var(--line)] px-1.5 py-0.5 rounded font-mono text-[var(--m)]">
          ⌘ K
        </kbd>
      </button>

      {/* 3. Primary Navigation Rows */}
      <nav className="space-y-1">
        {/* New research - only icon carries Bob yellow accent */}
        <button
          onClick={() => {
            createNewResearchSession();
          }}
          className={`h-10 w-full text-left px-3 rounded-lg text-[13.5px] flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
            currentPage === 'research'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]/70 font-medium'
          }`}
        >
          <Sparkles className="w-[18px] h-[18px] text-[var(--y)] shrink-0" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <span>New research</span>
        </button>

        {/* Dashboard */}
        <button
          onClick={() => navigateTo('home')}
          className={`h-10 w-full text-left px-3 rounded-lg text-[13.5px] flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
            currentPage === 'home'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]/70 font-medium'
          }`}
        >
          <LayoutDashboard className="w-[18px] h-[18px] text-[var(--m)] shrink-0" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <span>Dashboard</span>
        </button>

        {/* Notes */}
        <button
          onClick={() => navigateTo('notes')}
          className={`h-10 w-full text-left px-3 rounded-lg text-[13.5px] flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
            currentPage === 'notes'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]/70 font-medium'
          }`}
        >
          <NotebookPen className="w-[18px] h-[18px] text-[var(--m)] shrink-0" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <span>Notes</span>
        </button>

        {/* Due soon */}
        <button
          onClick={() => navigateTo('tasks')}
          className={`h-10 w-full text-left px-3 rounded-lg text-[13.5px] flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
            currentPage === 'tasks'
              ? 'bg-[var(--s2)] text-[var(--t)] font-semibold'
              : 'text-[var(--t)] hover:bg-[var(--s2)]/70 font-medium'
          }`}
        >
          <CircleCheck className="w-[18px] h-[18px] text-[var(--m)] shrink-0" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <span>Due soon</span>
        </button>
      </nav>

      {/* 4. Recent Projects Section */}
      <div className="mt-7 mb-2.5">
        <div className="text-[10.5px] tracking-[0.08em] text-[var(--m)] font-medium uppercase px-2 mb-2">
          RECENT PROJECTS
        </div>
        <div className="space-y-1 overflow-y-auto max-h-[220px]">
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => navigateTo('research', 'chat', proj.id)}
              className={`h-9 w-full text-left px-3 rounded-lg text-[13px] flex items-center gap-2.5 transition-colors duration-150 cursor-pointer ${
                currentPage === 'research' && activeResearchId === proj.id
                  ? 'bg-[var(--s2)] font-semibold text-[var(--t)]'
                  : 'text-[var(--t)] hover:bg-[var(--s2)]/70 font-normal'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: proj.dotColor || '#3b82f6' }}
              />
              <span className="truncate flex-1">{proj.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Bottom Section: Theme & User Profile */}
      <div className="mt-auto pt-3 border-t border-[var(--line)] space-y-1.5">
        {/* Light mode / Dark appearance toggle row */}
        <button
          onClick={toggleTheme}
          className="h-9 w-full text-left px-3 rounded-lg text-[13px] flex items-center gap-3 hover:bg-[var(--s2)]/70 text-[var(--m)] hover:text-[var(--t)] transition-colors duration-150 cursor-pointer"
        >
          {isDark ? (
            <>
              <Sun className="w-[18px] h-[18px] text-[var(--y)] shrink-0" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
              <span>Light mode</span>
            </>
          ) : (
            <>
              <Moon className="w-[18px] h-[18px] text-[var(--m)] shrink-0" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
              <span>Dark appearance</span>
            </>
          )}
        </button>

        {/* Profile Row: Avatar, Name, Workspace, Settings Icon */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--s2)]/70 transition-colors duration-150">
          <button
            onClick={() => navigateTo('profile')}
            className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
            title="Profile & Preferences"
          >
            <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#d9e7ff] to-[#f2d4bb] text-neutral-800 font-bold text-[12px] grid place-items-center shadow-xs shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-semibold text-[var(--t)] truncate leading-tight">
                Amani
              </span>
              <span className="block text-[11.5px] text-[var(--m)] truncate leading-tight">
                Research workspace
              </span>
            </div>
          </button>

          <button
            onClick={() => navigateTo('settings')}
            className="w-8 h-8 rounded-lg hover:bg-[var(--line)]/60 text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors cursor-pointer shrink-0"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </div>
      </div>
    </aside>
  );
};
