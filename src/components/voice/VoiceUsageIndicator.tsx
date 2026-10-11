import React, { useEffect, useState, useRef } from 'react';
import { voiceUsageService, VoiceUsageSnapshot } from '../../lib/voice/voiceUsageService';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Compact circular usage/status indicator shown beside the notification bell.
 * Driven only by observed usage from VoiceUsageService — never invents a quota %.
 */
export const VoiceUsageIndicator: React.FC = () => {
  const { navigateTo } = useApp();
  const [snap, setSnap] = useState<VoiceUsageSnapshot>(() => voiceUsageService.getSnapshot());
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return voiceUsageService.subscribe(setSnap);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const hasError = Boolean(snap.lastError);
  const unavailable = !snap.isAvailable;

  // Circle color: green = ok, amber = error/unavailable, neutral = idle
  const ringClass = unavailable || hasError
    ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
    : snap.totalGeminiRequests > 0
    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
    : 'bg-[var(--s2)] border-[var(--line)] text-[var(--m)]';

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Gemini usage & provider status"
        className={`w-8 h-8 rounded-full border grid place-items-center transition-colors cursor-pointer hover:opacity-90 ${ringClass}`}
      >
        {unavailable || hasError ? (
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
        ) : (
          <Activity className="w-3.5 h-3.5" strokeWidth={2} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-[var(--s)] border border-[var(--line)] shadow-xl rounded-2xl p-3.5 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-bold text-[13px] text-[var(--t)]">Provider status</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-[var(--s2)] text-[var(--m)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--m)]">Active provider</span>
              <span className="font-semibold text-[var(--t)] truncate max-w-[140px] text-right">
                {snap.provider}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--m)]">Model</span>
              <span className="font-medium text-[var(--t)] truncate max-w-[140px] text-right text-[11px]">
                {snap.activeModel.replace(/^models\//, '')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--m)]">Availability</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${
                snap.isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {snap.isAvailable ? (
                  <><CheckCircle2 className="w-3 h-3" /> Available</>
                ) : (
                  <><AlertTriangle className="w-3 h-3" /> Limited / unavailable</>
                )}
              </span>
            </div>

            <div className="h-px bg-[var(--line)] my-1" />

            <p className="text-[10.5px] text-[var(--m)] leading-snug m-0">
              Observed usage (this device). Remaining quota is not exposed by the API — shown as unavailable.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[var(--s2)] border border-[var(--line)] px-2.5 py-2">
                <div className="text-[10px] text-[var(--m)] uppercase tracking-wide">Requests</div>
                <div className="text-[15px] font-bold text-[var(--t)]">{snap.totalGeminiRequests}</div>
              </div>
              <div className="rounded-xl bg-[var(--s2)] border border-[var(--line)] px-2.5 py-2">
                <div className="text-[10px] text-[var(--m)] uppercase tracking-wide">Success</div>
                <div className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400">{snap.successfulOperations}</div>
              </div>
              <div className="rounded-xl bg-[var(--s2)] border border-[var(--line)] px-2.5 py-2">
                <div className="text-[10px] text-[var(--m)] uppercase tracking-wide">Live calls</div>
                <div className="text-[15px] font-bold text-[var(--t)]">{snap.liveCallsCount}</div>
              </div>
              <div className="rounded-xl bg-[var(--s2)] border border-[var(--line)] px-2.5 py-2">
                <div className="text-[10px] text-[var(--m)] uppercase tracking-wide">Dictation</div>
                <div className="text-[15px] font-bold text-[var(--t)]">{snap.dictationCount}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--m)]">Call time (observed)</span>
              <span className="font-medium text-[var(--t)]">{formatDuration(snap.totalCallDurationSeconds)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--m)]">Remaining quota</span>
              <span className="font-medium text-[var(--m)] italic">Unavailable</span>
            </div>

            {snap.lastError && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                <div className="font-semibold mb-0.5">Last error</div>
                <div className="leading-snug opacity-90">{snap.lastError.message}</div>
                <div className="text-[10px] opacity-70 mt-1">
                  {new Date(snap.lastError.timestamp).toLocaleString()}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigateTo('settings');
              }}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--s2)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[var(--t)] font-semibold text-[11.5px] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Gemini API key settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
