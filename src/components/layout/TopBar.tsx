import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PanelLeft, Bell, Share2 } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { 
    currentPage, 
    toggleSidebar, 
    unreadNotifications, 
    navigateTo, 
    triggerThinking 
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'home':
        return 'Today';
      case 'research':
        return 'Research workspace';
      case 'notes':
        return 'Research notes';
      case 'tasks':
        return 'Tasks & deadlines';
      case 'chrome':
        return 'Chrome side panel';
      case 'settings':
        return 'Settings';
      case 'profile':
        return 'Profile & preferences';
      case 'notifications':
        return 'Notifications';
      case 'diagnostics':
        return 'Diagnostics & Brain';
      default:
        return 'Research workspace';
    }
  };

  const handleShare = () => {
    triggerThinking('Share link ready', 'Your research workspace is ready to share.', 'Preparing clean share view');
  };

  return (
    <header 
      className="h-11 border-b border-[var(--line)] flex items-center px-4 md:px-6 bg-[var(--bg)]/90 backdrop-blur-md sticky top-0 z-30 select-none transition-all justify-between"
    >
      {/* Left: Sidebar toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          title="Toggle sidebar"
          className="w-7 h-7 rounded-lg border border-[var(--line)] bg-[var(--s)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)] transition-colors shadow-xs cursor-pointer"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>

        {/* Clean page title breadcrumb */}
        {currentPage !== 'research' && (
          <span className="font-semibold text-[13px] text-[var(--t)]">
            {getPageTitle()}
          </span>
        )}
      </div>

      {/* Right actions: Notifications & User Profile */}
      <div className="flex items-center gap-1.5">
        {/* Notifications Button */}
        <button
          onClick={() => navigateTo('notifications')}
          title="Notifications"
          className="w-8 h-8 rounded-lg hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors relative cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="w-2 h-2 rounded-full bg-[var(--y)] absolute top-1.5 right-1.5 ring-2 ring-[var(--bg)]" />
          )}
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          title="Share workspace"
          className="w-8 h-8 rounded-lg hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d9e7ff] to-[#f2d4bb] text-neutral-800 font-extrabold text-[11px] grid place-items-center shadow-xs cursor-pointer hover:ring-2 ring-[var(--y)] transition-all"
            title="User menu"
          >
            A
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-9 w-56 bg-[var(--s)] border border-[var(--line)] shadow-xl rounded-2xl p-2 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[var(--line)] mb-1">
                <b className="text-[13px] text-[var(--t)] block">Amani</b>
                <small className="text-[10px] text-[var(--m)] block">Research workspace</small>
              </div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigateTo('profile');
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--s2)] text-[var(--t)] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Profile & preferences</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigateTo('notifications');
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--s2)] text-[var(--t)] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--y)] text-neutral-900">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigateTo('settings');
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--s2)] text-[var(--t)] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Settings</span>
              </button>

              <div className="border-t border-[var(--line)] my-1" />

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  triggerThinking('Shortcuts', '⌘ K: Search · ⌘ Enter: Send prompt · Esc: Close', 'Ready');
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] flex items-center justify-between transition-colors text-[11px] cursor-pointer"
              >
                <span>Keyboard shortcuts</span>
                <kbd className="text-[9px] font-mono border border-[var(--line)] px-1 rounded">⌘K</kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
