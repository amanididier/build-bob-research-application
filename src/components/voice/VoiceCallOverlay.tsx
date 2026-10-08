import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useVoiceStore } from '../../store/useVoiceStore';
import { PhoneOff, Mic, MicOff, MessageSquare, Volume2, Sparkles, Brain, Hand } from 'lucide-react';
import { AudioWaveVisualizer } from './AudioWaveVisualizer';

interface VoiceCallOverlayProps {
  onClose: () => void;
}

export const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({ onClose }) => {
  const { userName } = useApp();
  const {
    voiceState,
    currentTranscript,
    lastBobReply,
    stopVoiceMode,
    interrupt,
    beginPushToTalk,
    endPushToTalk,
  } = useVoiceStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const holdingRef = useRef(false);
  const tickerRef = useRef<any>(null);

  const startHold = useCallback(() => {
    if (holdingRef.current) return;
    holdingRef.current = true;
    setHoldSeconds(0);
    tickerRef.current = setInterval(() => setHoldSeconds((s) => s + 1), 1000);
    void beginPushToTalk('call');
  }, [beginPushToTalk]);

  const endHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    setHoldSeconds(0);
    void endPushToTalk();
  }, [endPushToTalk]);

  // Hold Space to talk during a call — release and Bob thinks, no silence guessing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const node = e.target as HTMLElement | null;
      const tag = node?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || node?.isContentEditable === true) return;
      e.preventDefault();
      startHold();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      endHold();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', endHold);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', endHold);
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [startHold, endHold]);

  const isBobTurn = voiceState === 'SPEAKING' || voiceState === 'THINKING';
  const isUserTurn = voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING';
  const isRecording = holdingRef.current || voiceState === 'USER_SPEAKING';
  const isTranscribing = voiceState === 'TRANSCRIBING' || voiceState === 'SUBMITTING';

  const handleEndCall = () => {
    stopVoiceMode();
    onClose();
  };

  const handleToggleMute = () => {
    if (isBobTurn) {
      interrupt();
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 bg-neutral-950/92 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300">
      {/* Top Status Header */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[13px] font-bold tracking-wide uppercase text-neutral-400">
            Live Call with Bob
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
            Natural Voice Mode
          </span>
        </div>

        <button
          onClick={handleEndCall}
          className="text-[12px] font-semibold text-neutral-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all cursor-pointer"
        >
          Exit to text
        </button>
      </div>

      {/* Central Interactive Avatar Area */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-lg space-y-8">
        {/* Dynamic Avatar Circle */}
        <div className="relative flex items-center justify-center">
          {/* Animated concentric audio reactive rings */}
          {voiceState === 'USER_SPEAKING' && (
            <>
              <div className="absolute w-52 h-52 rounded-full border border-amber-500/30 animate-ping [animation-duration:2s]" />
              <div className="absolute w-44 h-44 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
            </>
          )}

          {voiceState === 'SPEAKING' && (
            <>
              <div className="absolute w-56 h-56 rounded-full border border-blue-500/30 animate-ping [animation-duration:2.5s]" />
              <div className="absolute w-48 h-48 rounded-full bg-blue-500/15 blur-xl animate-pulse" />
            </>
          )}

          {voiceState === 'THINKING' && (
            <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-amber-400/40 animate-spin [animation-duration:8s]" />
          )}

          {/* Main Avatar Button */}
          <button
            type="button"
            onMouseEnter={() => setIsAvatarHovered(true)}
            onMouseLeave={() => setIsAvatarHovered(false)}
            onClick={isAvatarHovered ? handleEndCall : isBobTurn ? interrupt : undefined}
            title={isAvatarHovered ? 'Click to End Call' : isBobTurn ? 'Bob speaking (click to interrupt)' : 'Voice active'}
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer relative z-10 ${
              isAvatarHovered
                ? 'bg-red-600 scale-105 ring-8 ring-red-500/30 shadow-[0_0_50px_rgba(220,38,38,0.6)]'
                : isBobTurn
                ? 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 ring-4 ring-blue-400/40 shadow-[0_0_45px_rgba(59,130,246,0.4)]'
                : 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 ring-4 ring-amber-400/30 shadow-[0_0_40px_rgba(245,158,11,0.35)]'
            }`}
          >
            {isAvatarHovered ? (
              <div className="flex flex-col items-center justify-center gap-1.5 animate-in zoom-in-95 duration-150">
                <PhoneOff className="w-8 h-8 text-white stroke-[2.2]" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">End Call</span>
              </div>
            ) : isBobTurn ? (
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <Brain className="w-7 h-7 text-white animate-pulse" />
                </div>
                <span className="text-[12.5px] font-black tracking-wide text-white drop-shadow">Bob</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-[18px] font-extrabold text-white">
                  {(userName || 'A')[0].toUpperCase()}
                </div>
                <span className="text-[12px] font-bold text-white tracking-wide">
                  {userName || 'You'}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* State Label */}
        <div className="flex flex-col items-center gap-2">
          <div className="px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[12.5px] font-semibold flex items-center gap-2">
            {voiceState === 'LISTENING' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Listening... speak naturally</span>
              </>
            )}
            {voiceState === 'USER_SPEAKING' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{isRecording ? `Hearing you… ${holdSeconds > 0 ? `${holdSeconds}s` : ''}` : 'Hearing you...'}</span>
              </>
            )}
            {isTranscribing && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span>Transcribing your turn…</span>
              </>
            )}
            {voiceState === 'THINKING' && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Bob is thinking...</span>
              </>
            )}
            {voiceState === 'SPEAKING' && (
              <>
                <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Bob is replying... (talk to interrupt)</span>
              </>
            )}
          </div>

          <span className="text-[11px] text-neutral-400">
            {isBobTurn
              ? 'Bob is speaking (talk to interrupt anytime)'
              : 'Hold Space or the button to talk — release and Bob answers'}
          </span>
        </div>

        {/* ChatGPT Style Real-time Audio Waveform */}
        <div className="w-full max-w-sm px-4 py-2 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
          <AudioWaveVisualizer
            active={voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING'}
            color={isBobTurn ? '#60a5fa' : '#f59e0b'}
            height={32}
          />
        </div>

        {/* Dynamic Speech & Transcript Cards */}
        <div className="w-full space-y-3 min-h-[110px] max-h-[220px] overflow-y-auto px-1">
          {/* User live speech card */}
          {currentTranscript.trim() && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left animate-in fade-in duration-200">
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <Mic className="w-3 h-3 text-amber-400" />
                <span>You said</span>
              </div>
              <p className="text-[13px] text-neutral-200 m-0 leading-relaxed font-medium">
                {currentTranscript}
              </p>
            </div>
          )}

          {/* Bob speech response card */}
          {lastBobReply && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-left animate-in fade-in duration-200">
              <div className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5 mb-1">
                <Volume2 className="w-3 h-3 text-blue-400" />
                <span>Bob</span>
              </div>
              <p className="text-[13px] text-neutral-200 m-0 leading-relaxed">
                {lastBobReply}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Call Control Bar */}
      <div className="w-full max-w-md pb-4 flex items-center justify-center gap-4">
        {/* Mute button */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            isMuted
              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Hold to talk */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            startHold();
          }}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          title="Hold to record your turn, release so Bob can answer"
          className={`h-12 px-5 rounded-full font-bold text-[12.5px] flex items-center gap-2 transition-all select-none touch-none cursor-pointer border ${
            isRecording
              ? 'bg-amber-500 border-amber-400 text-neutral-950 shadow-lg shadow-amber-900/40 scale-105'
              : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800'
          }`}
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-neutral-950 animate-ping" />
              <span>{holdSeconds > 0 ? `Listening ${holdSeconds}s` : 'Listening…'}</span>
            </>
          ) : (
            <>
              <Hand className="w-4 h-4" strokeWidth={2.2} />
              <span>Hold to talk</span>
            </>
          )}
        </button>

        {/* Big End Call Button */}
        <button
          onClick={handleEndCall}
          title="End conversation"
          className="h-12 px-7 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-[13px] flex items-center gap-2.5 shadow-lg shadow-red-900/40 transition-all active:scale-95 cursor-pointer"
        >
          <PhoneOff className="w-4 h-4 stroke-[2.5]" />
          <span>End Call</span>
        </button>

        {/* Text Mode button */}
        <button
          onClick={handleEndCall}
          title="Switch back to message composer"
          className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition-all cursor-pointer"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export { AudioWaveVisualizer as VoiceWaveform } from './AudioWaveVisualizer';
