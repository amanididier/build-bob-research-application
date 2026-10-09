import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PanelLeft, Bell, Share2 } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { 
    currentPage, 
    toggleSidebar, 
    unreadNotifications, 
    navigateTo, 
    userName,
    userEmail,
    userAvatar
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isShareHovered, setIsShareHovered] = useState(false);
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
      case 'chat':
        return 'Bob Messenger';
      case 'word':
        return 'Microsoft Word workspace';
      case 'notes':
        return 'Research notes';
      case 'tasks':
        return 'Tasks & deadlines';
      case 'chrome':
        return 'Chrome side panel';
      case 'settings':
        return 'Settings';
      case 'profile':
        return 'Personalization & Preferences';
      case 'notifications':
        return 'Notifications';
      case 'diagnostics':
        return 'Diagnostics & Brain';
      default:
        return 'Research workspace';
    }
  };

  // Generate abbreviation from user's name (e.g., "Didier Amani" -> "DA", "Didier" -> "D")
  const getUserAbbreviation = () => {
    if (!userName || !userName.trim()) return 'D';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.trim().substring(0, Math.min(2, userName.trim().length)).toUpperCase();
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

      {/* Right actions: Notifications, Share with "coming soon" tooltip, User Profile */}
      <div className="flex items-center gap-2">
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

        {/* Share Button with Yellow "coming soon.." pill on hover */}
        <div 
          className="relative inline-flex items-center justify-center"
          onMouseEnter={() => setIsShareHovered(true)}
          onMouseLeave={() => setIsShareHovered(false)}
        >
          <button
            type="button"
            className="w-8 h-8 rounded-lg hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {isShareHovered && (
            <div className="absolute top-10 right-0 z-50 animate-in fade-in zoom-in-95 duration-150">
              <span className="inline-block px-2.5 py-1 rounded-full bg-[var(--y)] text-[#171717] font-bold text-[10.5px] shadow-lg whitespace-nowrap border border-black/10 select-none">
                coming soon..
              </span>
            </div>
          )}
        </div>

        {/* User Profile Avatar: Image or Name Abbreviation */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f59e0b] via-[#eab308] to-[#ca8a04] text-[#171717] font-black text-[10.5px] grid place-items-center shadow-xs cursor-pointer hover:ring-2 ring-[var(--y)] transition-all overflow-hidden"
            title={`${userName} (${userEmail})`}
          >
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={userName} 
                className="w-full h-full object-cover rounded-full" 
              />
            ) : (
              <span>{getUserAbbreviation()}</span>
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-9 w-60 bg-[var(--s)] border border-[var(--line)] shadow-xl rounded-2xl p-2 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[var(--line)] mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--y)] text-[#171717] font-extrabold text-[10px] grid place-items-center">
                    {getUserAbbreviation()}
                  </div>
                  <div className="min-w-0">
                    <b className="text-[12.5px] text-[var(--t)] block truncate">{userName}</b>
                    <small className="text-[10px] text-[var(--m)] block truncate">{userEmail}</small>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigateTo('settings');
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--s2)] text-[var(--t)] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Profile & Personalization</span>
                <span className="text-[10px] font-semibold text-[var(--y)]">Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigateTo('chat');
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--s2)] text-[var(--t)] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Bob Messenger Chat</span>
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
