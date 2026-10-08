import React, { useState } from 'react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { voiceController } from '../../lib/voice/voiceController';
import { Play, Square, Check, Volume2 } from 'lucide-react';

export const VoiceSelectorCards: React.FC = () => {
  const { voices, activeVoiceId, setActiveVoiceId, previewVoice } = useVoiceStore();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const handlePreview = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    if (playingVoiceId === voiceId) {
      voiceController.stopSpeaking();
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(voiceId);
    try {
      await previewVoice(voiceId);
    } finally {
      setPlayingVoiceId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-[var(--m)] leading-relaxed">
        Each character is a distinct voice. With your Gemini key connected, Bob uses natural studio
        voices; without it, he falls back to fully on-device system voices tuned per character.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {voices.map((voice) => {
        const isSelected = activeVoiceId === voice.id;
        const isPlaying = playingVoiceId === voice.id;

        return (
          <div
            key={voice.id}
            onClick={() => setActiveVoiceId(voice.id)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              isSelected
                ? 'bg-amber-500/8 dark:bg-amber-400/10 border-amber-500/50 shadow-sm ring-1 ring-amber-500/40'
                : 'bg-[var(--s)] border-[var(--line)] hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}
          >
            {/* Header: Name + Gender Badge + Active Check */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 font-extrabold shadow-xs'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {voice.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <b className="text-[14px] text-[var(--t)]">{voice.name}</b>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <Check className="w-2.5 h-2.5" /> ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[11.5px] text-[var(--m)] block mt-0.5">
                    {voice.personality}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Preview Button */}
            <div className="mt-4 pt-3 border-t border-[var(--line)]/60 flex items-center justify-between">
              <span className="text-[11px] text-[var(--m)]">{voice.language}</span>

              <button
                type="button"
                onClick={(e) => handlePreview(e, voice.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  isPlaying
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[var(--t)]'
                }`}
                title="Preview voice sample"
              >
                {isPlaying ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
