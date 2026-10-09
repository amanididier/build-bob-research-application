import React, { useState } from 'react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { Download, Sparkles, Check, AlertCircle, X, ShieldCheck, Cpu } from 'lucide-react';

export const ModelInstallCard: React.FC = () => {
  const {
    isInstallCardOpen,
    installCardType,
    closeInstallCard,
    downloadWhisperModel,
    downloadKokoroModel,
    modelProgress,
    kokoroProgress,
  } = useVoiceStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isInstallCardOpen) return null;

  const isTTS = installCardType === 'tts';
  const activeProgress = isTTS
    ? {
        status: kokoroProgress.status,
        progress: kokoroProgress.progress,
        fileName: kokoroProgress.file,
        error: kokoroProgress.error,
        bytesTotal: 82 * 1024 * 1024,
        bytesLoaded: (kokoroProgress.progress / 100) * 82 * 1024 * 1024,
      }
    : modelProgress;

  const isDownloading = activeProgress.status === 'downloading' || isSubmitting;
  const isReady = activeProgress.status === 'ready';

  const handleDownload = async () => {
    setIsSubmitting(true);
    try {
      if (isTTS) {
        await downloadKokoroModel();
      } else {
        await downloadWhisperModel();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-[440px] bg-white dark:bg-[#1f1e1d] rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        {!isDownloading && (
          <button
            onClick={closeInstallCard}
            className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
              {isTTS
                ? 'Download Kokoro 82M Neural Voice'
                : 'Bob Voice needs Whisper Tiny'}
            </h3>
            <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isTTS
                ? 'High-fidelity offline voice synthesis for Bob Call Mode.'
                : 'Whisper Tiny is required for offline speech recognition.'}
            </p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="space-y-2.5 my-4 bg-neutral-50 dark:bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/80 text-[12px]">
          <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
            <span className="text-neutral-500 dark:text-neutral-400">Download Size</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {isTTS ? '~82 MB (one-time)' : '~39 MB (one-time)'}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
            <span className="text-neutral-500 dark:text-neutral-400">Execution</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% On-Device & Offline
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
            <span className="text-neutral-500 dark:text-neutral-400">Cloud Credits</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">0 Gemini credits used</span>
          </div>
        </div>

        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-5">
          {isTTS
            ? 'Kokoro 82M runs locally on your computer via ONNX (WebGPU/WASM). Your speech is never sent over the network, giving you crystal-clear human voice synthesis.'
            : 'It runs directly on your computer inside Bob. Your speech is never sent to any cloud transcription server, ensuring 100% privacy and zero quota limits.'}
        </p>

        {/* Real Progress Bar */}
        {isDownloading && (
          <div className="space-y-2 mb-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11.5px] font-medium text-neutral-600 dark:text-neutral-400">
              <span className="truncate max-w-[240px]">{activeProgress.fileName || 'Downloading model files…'}</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{activeProgress.progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-200 rounded-full"
                style={{ width: `${Math.max(5, activeProgress.progress)}%` }}
              />
            </div>
            {activeProgress.bytesTotal > 0 && (
              <div className="text-[10.5px] text-neutral-400 text-right font-mono">
                {(activeProgress.bytesLoaded / (1024 * 1024)).toFixed(1)} MB / {(activeProgress.bytesTotal / (1024 * 1024)).toFixed(1)} MB
              </div>
            )}
          </div>
        )}

        {activeProgress.status === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[11.5px] mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{activeProgress.error || 'Download failed. Please check internet connection.'}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          {!isDownloading && (
            <button
              onClick={closeInstallCard}
              className="flex-1 py-2.5 px-4 rounded-xl text-[12.5px] font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-center"
            >
              Not now
            </button>
          )}

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex-1 py-2.5 px-4 rounded-xl text-[12.5px] font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isDownloading
                ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                : 'bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-[0.98]'
            }`}
          >
            {isDownloading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Downloading…</span>
              </>
            ) : isReady ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Ready & Enable</span>
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
  );
};
