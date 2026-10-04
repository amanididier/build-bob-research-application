import React, { useState, useEffect } from 'react';
import { BobLogo } from '../BobLogo';
import { RotateCw, MoreVertical } from 'lucide-react';

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'latest' | 'error';
  version?: string;
  percent?: number;
  message?: string;
}

export const DesktopWindowHeader: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateState>({
    status: 'idle',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).bob?.minimize) {
      setIsElectron(true);

      // Check initial window state
      (window as any).bob?.isMaximized?.().then((max: boolean) => {
        setIsMaximized(Boolean(max));
      });
    }

    if (typeof window === 'undefined' || !(window as any).bob?.onUpdateStatus) return;

    // Pull the current state first: an update event can fire before React mounts.
    (window as any).bob.getUpdateState?.().then((status: UpdateState) => {
      if (status && status.status) setUpdateInfo(status);
    });

    const unsub = (window as any).bob.onUpdateStatus((status: UpdateState) => {
      if (status && status.status) {
        setUpdateInfo(status);
      }
    });
    return unsub;
  }, []);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).bob?.minimize) {
      (window as any).bob.minimize();
    }
  };

  const handleMaximize = async () => {
    if (typeof window !== 'undefined' && (window as any).bob?.maximize) {
      const maximized = await (window as any).bob.maximize();
      setIsMaximized(Boolean(maximized));
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).bob?.close) {
      (window as any).bob.close();
    }
  };

  const handleRestartToUpdate = () => {
    if (typeof window !== 'undefined' && (window as any).bob?.installUpdate) {
      setUpdateInfo((prev) => ({ ...prev, message: 'Restarting Bob to finish update…' }));
      (window as any).bob.installUpdate();
    }
  };

  const handleStartDownload = async () => {
    if (typeof window !== 'undefined' && (window as any).bob?.downloadUpdate) {
      setUpdateInfo((prev) => ({ ...prev, status: 'downloading', percent: 0 }));
      await (window as any).bob.downloadUpdate();
    }
  };

  const handleCheckAgain = async () => {
    if (typeof window !== 'undefined' && (window as any).bob?.checkUpdates) {
      setUpdateInfo((prev) => ({ ...prev, status: 'checking', message: 'Checking for updates...' }));
      const res = await (window as any).bob.checkUpdates();
      if (res && res.status) setUpdateInfo(res);
    }
  };

  // Only show when there is a REAL update available, downloading, or ready to apply.
  // Never show mock or hardcoded indicators.
  const hasRealUpdate =
    updateInfo.status === 'downloading' ||
    updateInfo.status === 'ready' ||
    updateInfo.status === 'available';

  return (
    <div
      style={{ WebkitAppRegion: 'drag' } as any}
      className="h-[36px] w-full bg-[var(--s)] border-b border-[var(--line)] flex items-center justify-between pl-3 pr-0 select-none flex-shrink-0 z-50 text-[var(--t)] transition-colors"
    >
      {/* Left: Bob Mascot & App Name */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <BobLogo size={18} shape="transparent" />
        <span className="text-[12px] font-bold tracking-tight text-[var(--t)]">
          Bob
        </span>
        <span className="text-[10px] text-[var(--m)] px-1.5 py-0.5 rounded bg-[var(--s2)] font-mono">
          Research Companion
        </span>
      </div>

      {/* Center: Draggable Spacer */}
      <div className="flex-1 min-w-0 h-full cursor-default" />

      {/* Right: Real Auto-Update Pill & Native Chrome Window Controls (Pinned to far right) */}
      <div className="flex items-center h-full ml-auto flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Real Update Pill (NO mock - only rendered when electron-updater emits real update events) */}
        {hasRealUpdate && (
          <div className="mr-3 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
            {/* 1. Downloading state: Yellow download circle with progress */}
            {updateInfo.status === 'downloading' && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fffc00] text-[#171717] text-[11.5px] font-bold shadow-xs select-none"
                title={`Downloading update: ${updateInfo.percent || 0}%`}
              >
                {/* Yellow Download Circle */}
                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      className="text-neutral-400/40"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      r="14"
                      cx="18"
                      cy="18"
                    />
                    <circle
                      className="text-[#171717]"
                      strokeWidth="4"
                      strokeDasharray={88}
                      strokeDashoffset={88 - (88 * (updateInfo.percent || 0)) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      r="14"
                      cx="18"
                      cy="18"
                    />
                  </svg>
                </div>
                <span>Updating… {updateInfo.percent || 0}%</span>
              </div>
            )}

            {/* 2. Update Ready state: Blue pill with Restart button matching user screenshot */}
            {updateInfo.status === 'ready' && (
              <button
                onClick={handleRestartToUpdate}
                style={{ backgroundColor: '#0080f5', color: '#ffffff' }}
                className="flex items-center gap-1.5 px-3.5 py-1 rounded-full !bg-[#0080f5] hover:!bg-[#006dd4] !text-white text-[12px] font-semibold tracking-tight shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Update downloaded! Click to restart Bob and apply update."
              >
                <span className="font-semibold !text-white">Restart to finish</span>
                <span className="text-[12px] leading-none !text-white">→</span>
              </button>
            )}

            {/* 3. Update Available state: Bob yellow pill labeled "Update Available →" */}
            {updateInfo.status === 'available' && (
              <button
                onClick={handleStartDownload}
                style={{ backgroundColor: '#fffc00', color: '#171717' }}
                className="flex items-center gap-1.5 px-3.5 py-1 rounded-full !bg-[#fffc00] hover:!bg-[#ebd200] !text-[#171717] text-[12px] font-bold tracking-tight shadow-xs transition-all active:scale-95 cursor-pointer"
                title={`Click to download and install Update v${updateInfo.version || ''}`}
              >
                <span className="font-bold !text-[#171717]">Update Available</span>
                <span className="text-[12px] leading-none !text-[#171717]">→</span>
              </button>
            )}

            {/* Three-dots menu icon matching screenshot */}
            <div
              className="text-neutral-400 hover:text-[var(--t)] p-1 rounded hover:bg-[var(--s2)] transition-colors cursor-pointer"
              title="Update options"
              onClick={handleCheckAgain}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Chrome-Style Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center h-full">
          {/* Chrome Minimize */}
          <button
            onClick={handleMinimize}
            title="Minimize"
            aria-label="Minimize"
            className="w-[46px] h-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
          >
            <svg width="10" height="1" viewBox="0 0 10 1">
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </button>

          {/* Chrome Maximize / Restore */}
          <button
            onClick={handleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            className="w-[46px] h-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path
                  d="m 2,1e-4 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M0,0v10h10V0H0z M9,9H1V1h8V9z" fill="currentColor" />
              </svg>
            )}
          </button>

          {/* Chrome Close (Red on hover with white icon) */}
          <button
            onClick={handleClose}
            title="Close"
            aria-label="Close"
            className="w-[46px] h-full flex items-center justify-center hover:bg-[#e81123] text-[var(--m)] hover:text-white transition-colors cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <polygon
                points="10,0.7 9.3,0 5,4.3 0.7,0 0,0.7 4.3,5 0,9.3 0.7,10 5,5.7 9.3,10 10,9.3 5.7,5"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
