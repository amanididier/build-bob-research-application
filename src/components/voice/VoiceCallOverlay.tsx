import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff } from 'lucide-react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { useApp } from '../../context/AppContext';
import { voiceController } from '../../lib/voice/voiceController';
import { BobAvatar } from '../BobAvatar';

const BAR_COUNT = 56;

export const VoiceWaveform: React.FC<{ height?: number; className?: string }> = ({
  height = 26,
  className = ''
}) => {
  const barsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<number[]>(Array(BAR_COUNT).fill(2));

  useEffect(() => {
    let raf = 0;
    const unsub = voiceController.addEnergyListener((energy) => {
      const level = Math.min(1, energy / 60);
      const arr = historyRef.current;
      arr.push(2 + level * (height - 4));
      if (arr.length > BAR_COUNT) arr.shift();
    });
    const tick = () => {
      const el = barsRef.current;
      if (el) {
        const arr = historyRef.current;
        const kids = el.children;
        for (let i = 0; i < kids.length; i++) {
          (kids[i] as HTMLElement).style.height = `${arr[i] ?? 2}px`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, [height]);

  return (
    <div
      ref={barsRef}
      className={`flex items-center justify-between gap-[2px] ${className}`}
      style={{ height }}
      aria-hidden
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span key={i} className="flex-1 rounded-full bg-[var(--y)]/80 transition-none" style={{ height: 2 }} />
      ))}
    </div>
  );
};

export const VoiceCallOverlay: React.FC = () => {
  const { voiceState, currentTranscript, stopVoiceMode } = useVoiceStore();
  const { userName } = useApp();
  const [hovering, setHovering] = useState(false);

  const bobTurn = voiceState === 'SPEAKING' || voiceState === 'THINKING';
  const status =
    voiceState === 'SPEAKING'
      ? 'Bob is speaking…'
      : voiceState === 'THINKING'
        ? 'Bob is thinking…'
        : voiceState === 'TRANSCRIBING' || voiceState === 'SUBMITTING'
          ? 'Transcribing…'
          : voiceState === 'USER_SPEAKING'
            ? 'Listening to you…'
            : 'Call connected — start talking.';

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[var(--s)]/97 backdrop-blur-xl animate-in fade-in duration-200">
      <button
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={stopVoiceMode}
        title="End call"
        className={`relative w-36 h-36 rounded-full grid place-items-center shadow-2xl transition-all duration-200 ${
          hovering ? 'bg-[#e5484d] scale-105' : 'bg-[var(--s2)] border border-[var(--line)]'
        }`}
      >
        {hovering ? (
          <PhoneOff className="w-10 h-10 text-white" />
        ) : bobTurn ? (
          <span className="relative grid place-items-center">
            <span className="absolute w-32 h-32 rounded-full bg-[var(--y)]/25 animate-ping" />
            <BobAvatar size={72} />
          </span>
        ) : (
          <span className="text-4xl font-extrabold text-[var(--t)] uppercase">
            {(userName || 'A').trim().charAt(0)}
          </span>
        )}
      </button>

      <div className="text-center space-y-1 px-6">
        <div className="text-[13px] font-bold text-[var(--t)]">{bobTurn ? 'Bob' : userName || 'You'}</div>
        <div className="text-[12px] text-[var(--m)]">{status}</div>
      </div>

      <div className="w-full max-w-[520px] px-6">
        <VoiceWaveform height={34} className="opacity-90" />
      </div>

      {currentTranscript.trim() && !bobTurn && (
        <div className="w-full max-w-[520px] mx-6 p-3.5 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-[12.5px] leading-relaxed text-[var(--t)] max-h-[140px] overflow-y-auto animate-in fade-in duration-150">
          {currentTranscript}
        </div>
      )}

      <button
        onClick={stopVoiceMode}
        className="text-[12px] font-semibold text-[var(--m)] hover:text-[#e5484d] transition-colors"
      >
        End call
      </button>
    </div>
  );
};
