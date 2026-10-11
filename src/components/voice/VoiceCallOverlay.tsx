import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useVoiceStore } from '../../store/useVoiceStore';
import { voiceController } from '../../lib/voice/voiceController';
import {
  PhoneOff,
  Mic,
  MicOff,
  MessageSquare,
  Volume2,
  Sparkles,
  Brain,
  Cpu,
  Info,
  X,
} from 'lucide-react';
import { AudioWaveVisualizer } from './AudioWaveVisualizer';

interface VoiceCallOverlayProps {
  onClose: () => void;
}

/**
 * Premium continuous Call UI (Gemini Live first).
 * No push-to-talk — speak freely; barge-in anytime Bob is talking.
 * Transcript previews clamped to 2 lines.
 */
export const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({ onClose }) => {
  const { userName, userAvatar } = useApp();
  const {
    voiceState,
    currentTranscript,
    lastBobReply,
    stopVoiceMode,
    interrupt,
  } = useVoiceStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [showAgentsModal, setShowAgentsModal] = useState(false);

  const activeAgent = voiceController.getActiveCallAgent();
  const isLiveGemini = voiceController.isLiveModeActive();

  const isBobTurn = voiceState === 'SPEAKING' || voiceState === 'THINKING';
  const isUserTurn = voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING';

  const handleEndCall = () => {
    stopVoiceMode();
    onClose();
  };

  const handleToggleMute = () => {
    if (isBobTurn) interrupt();
    setIsMuted(!isMuted);
  };

  const initial = (userName || 'Y').trim().charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 bg-neutral-950/94 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300">
      {/* Top bar */}
      <div className="w-full max-w-xl flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[12px] font-bold tracking-wide uppercase text-neutral-400 shrink-0">
            Live call
          </span>
          <button
            type="button"
            onClick={() => setShowAgentsModal(true)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
              isLiveGemini
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 border-amber-500/35 text-amber-300 hover:bg-amber-500/25'
            }`}
            title="Active voice agent"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLiveGemini ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="truncate max-w-[140px]">{isLiveGemini ? 'Gemini Live' : activeAgent.badge}</span>
            <Info className="w-3 h-3 opacity-50" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAgentsModal(true)}
            className="text-[11px] font-medium text-neutral-500 hover:text-white px-2 py-1.5 rounded-xl hover:bg-neutral-900 transition-all cursor-pointer flex items-center gap-1"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agents</span>
          </button>
          <button
            type="button"
            onClick={handleEndCall}
            className="text-[11px] font-semibold text-neutral-500 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-neutral-900 transition-all cursor-pointer"
          >
            Exit to text
          </button>
        </div>
      </div>

      {/* Center stage */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-md space-y-5">
        <div className="relative flex items-center justify-center">
          {voiceState === 'USER_SPEAKING' && (
            <>
              <div className="absolute w-48 h-48 rounded-full border border-amber-500/25 animate-ping [animation-duration:2s]" />
              <div className="absolute w-40 h-40 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
            </>
          )}
          {voiceState === 'SPEAKING' && (
            <>
              <div className="absolute w-52 h-52 rounded-full border border-sky-500/25 animate-ping [animation-duration:2.4s]" />
              <div className="absolute w-44 h-44 rounded-full bg-sky-500/12 blur-xl animate-pulse" />
            </>
          )}
          {voiceState === 'THINKING' && (
            <div className="absolute w-44 h-44 rounded-full border-2 border-dashed border-amber-400/30 animate-spin [animation-duration:10s]" />
          )}

          <button
            type="button"
            onMouseEnter={() => setIsAvatarHovered(true)}
            onMouseLeave={() => setIsAvatarHovered(false)}
            onClick={isAvatarHovered ? handleEndCall : isBobTurn ? interrupt : undefined}
            title={isAvatarHovered ? 'End call' : isBobTurn ? 'Interrupt Bob' : 'Listening'}
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer relative z-10 ${
              isAvatarHovered
                ? 'bg-red-600 scale-105 ring-6 ring-red-500/25'
                : isBobTurn
                ? 'bg-gradient-to-tr from-sky-700 via-indigo-600 to-blue-500 ring-4 ring-sky-400/30'
                : 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 ring-4 ring-amber-400/25'
            }`}
          >
            {isAvatarHovered ? (
              <div className="flex flex-col items-center gap-1">
                <PhoneOff className="w-7 h-7 text-white" strokeWidth={2.2} />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white">End</span>
              </div>
            ) : isBobTurn ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white animate-pulse" />
                </div>
                <span className="text-[12px] font-black text-white drop-shadow">Bob</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-[18px] font-extrabold text-white">
                    {initial}
                  </div>
                )}
                <span className="text-[11px] font-bold text-white tracking-wide">{userName || 'You'}</span>
              </div>
            )}
          </button>
        </div>

        {/* State chip */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-[12px] font-semibold flex items-center gap-2">
            {voiceState === 'LISTENING' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isLiveGemini ? 'Listening — speak freely' : 'Listening…'}</span>
              </>
            )}
            {voiceState === 'USER_SPEAKING' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Hearing you…</span>
              </>
            )}
            {voiceState === 'THINKING' && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Thinking…</span>
              </>
            )}
            {voiceState === 'SPEAKING' && (
              <>
                <Volume2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Bob speaking — talk to interrupt</span>
              </>
            )}
            {!['LISTENING', 'USER_SPEAKING', 'THINKING', 'SPEAKING'].includes(voiceState) && (
              <span className="text-neutral-400">{voiceState}</span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 text-center max-w-xs m-0 leading-snug">
            {isLiveGemini
              ? 'Full-duplex · Gemini Live · natural turn-taking'
              : 'Fallback agent active · continuous listening'}
          </p>
        </div>

        {/* Waveform */}
        <div className="w-full max-w-xs px-3 py-2 rounded-2xl bg-neutral-900/50 border border-neutral-800/70">
          <AudioWaveVisualizer
            active={isUserTurn || voiceState === 'SPEAKING'}
            color={isBobTurn ? '#38bdf8' : '#f59e0b'}
            height={26}
          />
        </div>

        {/* 2-line transcript cards */}
        <div className="w-full space-y-2 max-h-[140px] overflow-hidden px-0.5">
          {currentTranscript.trim() && (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left">
              <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mb-0.5">
                <Mic className="w-3 h-3" /> You
              </div>
              <p className="text-[12.5px] text-neutral-200 m-0 leading-snug font-medium line-clamp-2 overflow-hidden text-ellipsis">
                {currentTranscript}
              </p>
            </div>
          )}
          {lastBobReply && (
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-left">
              <div className="text-[10px] font-bold text-sky-400 flex items-center gap-1 mb-0.5">
                <Volume2 className="w-3 h-3" /> Bob
              </div>
              <p className="text-[12.5px] text-neutral-200 m-0 leading-snug line-clamp-2 overflow-hidden text-ellipsis">
                {lastBobReply}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="w-full max-w-sm pb-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            isMuted
              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          {isMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
        </button>

        <button
          type="button"
          onClick={handleEndCall}
          title="End call"
          className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-[12.5px] flex items-center gap-2 shadow-lg shadow-red-900/30 transition-all active:scale-95 cursor-pointer"
        >
          <PhoneOff className="w-4 h-4" strokeWidth={2.4} />
          <span>End Call</span>
        </button>

        <button
          type="button"
          onClick={handleEndCall}
          title="Back to text"
          className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition-all cursor-pointer"
        >
          <MessageSquare className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Agents modal — honest status only */}
      {showAgentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4.5 h-4.5 text-amber-400" />
                <h3 className="text-[15px] font-bold text-white m-0">Voice agents</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAgentsModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11.5px] text-neutral-400 leading-relaxed m-0">
              Primary route is Gemini Live. Fallbacks activate only on real connection or quota failure.
            </p>

            <div className={`p-3 rounded-2xl border ${
              isLiveGemini
                ? 'bg-emerald-500/10 border-emerald-500/35 ring-1 ring-emerald-500/20'
                : 'bg-neutral-950/50 border-neutral-800 opacity-80'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[13px] text-white">Gemini Multimodal Live</span>
                {isLiveGemini ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9.5px] font-extrabold uppercase">Active</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 text-[9.5px] font-semibold">Primary</span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 mb-0 leading-relaxed">
                Full-duplex WebSocket audio · server VAD · barge-in. Uses your BYOK Gemini key.
              </p>
            </div>

            <div className={`p-3 rounded-2xl border ${
              !isLiveGemini
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-neutral-950/40 border-neutral-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[13px] text-white">{activeAgent.name}</span>
                {!isLiveGemini && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9.5px] font-extrabold uppercase">Fallback</span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 mb-0 leading-relaxed">
                {activeAgent.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAgentsModal(false)}
              className="w-full py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[12px] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { AudioWaveVisualizer as VoiceWaveform } from './AudioWaveVisualizer';
