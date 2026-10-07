import React from 'react';
import { Download, XCircle, Mic, Volume2, Sparkles } from 'lucide-react';
import { useVoiceStore } from '../../store/useVoiceStore';
import type { STTModelStatus } from '../../lib/voice/sttProvider';
import type { TTSModelStatus } from '../../lib/voice/ttsProvider';

export type ModelInstallKind = 'stt' | 'tts';

interface ModelInstallCardProps {
  kind: ModelInstallKind;
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const ModelInstallCard: React.FC<ModelInstallCardProps> = ({ kind, open, onClose, onCompleted }) => {
  const {
    sttModelStatus,
    ttsModelStatus,
    preloadSttModel,
    preloadTtsModel,
  } = useVoiceStore();

  const status: STTModelStatus | TTSModelStatus = kind === 'stt' ? sttModelStatus : ttsModelStatus;
  const isLoading = status.state === 'downloading' || status.state === 'loading';
  const progressPct = Math.max(0, Math.min(100, Math.round(status.progress * 100)));
  const isReady = status.state === 'ready' || status.state === 'listening' || status.state === 'speaking';

  const title =
    kind === 'stt'
      ? 'Bob Voice needs one small local model'
      : 'Bob needs a local voice';

  const body =
    kind === 'stt'
      ? 'Moonshine Tiny is required for offline speech recognition. Size: ~45 MB. It runs directly on your computer and does not use Gemini transcription credits.'
      : 'Moonshine is required for offline speech. Size: ~65 MB. This voice runs directly on your computer and does not require an API key.';

  const accent = kind === 'stt' ? 'text-[var(--y)] bg-[var(--ys)]' : 'text-[var(--b)] bg-[var(--bs)]';
  const accentBar = kind === 'stt' ? 'bg-[var(--y)]' : 'bg-[var(--b)]';
  const Icon = kind === 'stt' ? Mic : Volume2;

  const handleDownload = async () => {
    try {
      if (kind === 'stt') {
        await preloadSttModel();
      } else {
        await preloadTtsModel();
      }
      onCompleted?.();
    } catch {
      // errors surfaced via status.message / notice system
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--s)] border border-[var(--line)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`shrink-0 p-2.5 rounded-2xl ${accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--y)]" />
                  <span className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-[var(--m)]">
                    Bob Voice
                  </span>
                </div>
                <h2 className="text-[18px] font-extrabold text-[var(--t)] mt-1 leading-tight">
                  {title}
                </h2>
              </div>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="shrink-0 p-2 rounded-xl hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
                title="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          <p className="text-[13px] text-[var(--m)] leading-relaxed m-0">
            {body}
          </p>

          {(isLoading || status.state === 'error') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--m)]">
                <span className="truncate pr-2">
                  {status.state === 'error' ? (status as any).message || 'Something went wrong.' : (status as any).message || 'Preparing download…'}
                </span>
                <span className="font-mono font-bold shrink-0">
                  {isLoading ? `${progressPct}%` : ''}
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${status.state === 'error' ? 'bg-rose-500' : accentBar}`}
                  style={{ width: `${isLoading ? progressPct : status.state === 'error' ? 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {isReady && (
            <div className="p-3 rounded-2xl bg-[#e6f7ed] border border-emerald-300 text-[12px] text-[#14844d] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready. Retrying your action…</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            {!isReady && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="h-11 px-5 rounded-2xl text-[12.5px] font-semibold text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)] border border-transparent hover:border-[var(--line)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Not now
              </button>
            )}
            <button
              onClick={isReady ? () => { onCompleted?.(); onClose(); } : handleDownload}
              disabled={isLoading && status.state !== 'error'}
              className="h-11 px-5 rounded-2xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              {isReady ? (
                <>Continue</>
              ) : isLoading ? (
                <>
                  <Download className="w-4 h-4 animate-pulse" />
                  <span>{status.state === 'downloading' ? 'Downloading…' : 'Installing…'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download & Enable</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
