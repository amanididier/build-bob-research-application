import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowUpCircle,
  Cpu,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
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
    finishTurnImmediately,
    startPushToTalk,
    stopPushToTalk,
    isKokoroInstalled,
    openInstallCard,
  } = useVoiceStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [showAgentsModal, setShowAgentsModal] = useState(false);

  // Honest agent currently powering the call - dynamically retrieved, NEVER hardcoded
  const activeAgent = voiceController.getActiveCallAgent();
  const isLiveGemini = voiceController.isLiveModeActive();

  const isBobTurn = voiceState === 'SPEAKING' || voiceState === 'THINKING';
  const isUserTurn = voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING';

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

  // Immediate turn finalization on spacebar release or button click
  const handleDoneSpeaking = useCallback(async () => {
    if (voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING') {
      await finishTurnImmediately();
    }
  }, [voiceState, finishTurnImmediately]);

  // Keyboard Spacebar Push-To-Talk (optional convenience in noisy rooms)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Prevent default page scroll
        e.preventDefault();
        setIsSpaceHeld(true);
        if (isBobTurn) {
          interrupt();
        }
        startPushToTalk('call');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceHeld(false);
        stopPushToTalk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isBobTurn, interrupt, startPushToTalk, stopPushToTalk]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 bg-neutral-950/92 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300">
      {/* Top Status Header */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[13px] font-bold tracking-wide uppercase text-neutral-400">
            Live Call with Bob
          </span>
          
          {/* Honest Active Agent Badge */}
          {isLiveGemini ? (
            <button
              onClick={() => setShowAgentsModal(true)}
              className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 hover:bg-emerald-500/30 transition-colors cursor-pointer"
              title="Click to view all available voice agents"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gemini Live API</span>
              <Info className="w-3 h-3 opacity-60 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={() => setShowAgentsModal(true)}
              className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 hover:bg-amber-500/30 transition-colors cursor-pointer"
              title="Primary Gemini Live quota reached / network interruption. Switched to fallback agent mode."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{activeAgent.badge}</span>
              <Info className="w-3 h-3 opacity-60 ml-0.5" />
            </button>
          )}

          {isKokoroInstalled ? (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-medium text-blue-300">
              Kokoro 82M Ready
            </span>
          ) : (
            <button
              onClick={() => openInstallCard('tts')}
              className="px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-semibold text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
              title="Download Kokoro 82M for near-human voice quality"
            >
              <span>Kokoro Voice</span>
              <span className="text-[9.5px] bg-amber-500/30 px-1 rounded uppercase">Get</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAgentsModal(true)}
            className="text-[12px] font-medium text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all cursor-pointer flex items-center gap-1"
            title="View Available Voice Agents"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agents</span>
          </button>
          <button
            onClick={handleEndCall}
            className="text-[12px] font-semibold text-neutral-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all cursor-pointer"
          >
            Exit to text
          </button>
        </div>
      </div>

      {/* Central Interactive Avatar Area */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-lg space-y-6">
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
        <div className="flex flex-col items-center gap-1.5">
          <div className="px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[12.5px] font-semibold flex items-center gap-2">
            {voiceState === 'LISTENING' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {isLiveGemini ? 'Listening · Speak freely (live talking active)' : 'Listening... speak or hold Spacebar'}
                </span>
              </>
            )}
            {voiceState === 'USER_SPEAKING' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{isSpaceHeld ? 'Recording speech (Hold Space)...' : 'Hearing you...'}</span>
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
                <span>Bob is speaking... (talk to interrupt anytime)</span>
              </>
            )}
          </div>

          <span className="text-[11px] text-neutral-400 text-center max-w-md">
            {isLiveGemini 
              ? (isBobTurn ? 'Bob is speaking · Talk over him anytime to barge-in' : 'Full-duplex conversation active · Speak naturally without push-to-talk')
              : (isBobTurn ? 'Bob is speaking (click avatar to interrupt)' : 'Speak clearly or hold Spacebar in noisy rooms')}
          </span>
        </div>

        {/* ChatGPT Style Real-time Audio Waveform */}
        <div className="w-full max-w-sm px-4 py-2 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
          <AudioWaveVisualizer
            active={voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING'}
            color={isBobTurn ? '#60a5fa' : '#f59e0b'}
            height={28}
          />
        </div>

        {/* Optional Push-to-Talk action for noisy rooms */}
        {isUserTurn && !isLiveGemini && (
          <button
            type="button"
            onClick={handleDoneSpeaking}
            title="Click when finished speaking to submit immediately without waiting for silence"
            className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-[12px] transition-all cursor-pointer shadow-lg ${
              isSpaceHeld
                ? 'bg-amber-500 text-neutral-950 ring-4 ring-amber-400/50 scale-105'
                : 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 active:scale-95'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
            <span>{isSpaceHeld ? 'Listening (Release Space to send)' : 'Done Speaking · Reply Now'}</span>
            <kbd className="ml-1 text-[9.5px] px-1.5 py-0.5 rounded bg-black/40 text-neutral-400 font-mono">SPACE</kbd>
          </button>
        )}

        {/* Dynamic Speech & Transcript Cards — Strictly 2 lines max to avoid infinite card expansion */}
        <div className="w-full space-y-2.5 max-h-[160px] overflow-hidden px-1">
          {/* User live speech card (clamped to max 2 lines) */}
          {currentTranscript.trim() && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left animate-in fade-in duration-200">
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-0.5">
                <Mic className="w-3 h-3 text-amber-400 shrink-0" />
                <span>You said</span>
              </div>
              <p className="text-[13px] text-neutral-200 m-0 leading-snug font-medium line-clamp-2 overflow-hidden text-ellipsis">
                {currentTranscript}
              </p>
            </div>
          )}

          {/* Bob speech response card (clamped to max 2 lines) */}
          {lastBobReply && (
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-left animate-in fade-in duration-200">
              <div className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5 mb-0.5">
                <Volume2 className="w-3 h-3 text-blue-400 shrink-0" />
                <span>Bob</span>
              </div>
              <p className="text-[13px] text-neutral-200 m-0 leading-snug line-clamp-2 overflow-hidden text-ellipsis">
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

      {/* Available Agents Info Modal */}
      {showAgentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" />
                <h3 className="text-[16px] font-bold text-white m-0">Available Voice Agents</h3>
              </div>
              <button
                onClick={() => setShowAgentsModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[12px] text-neutral-400 leading-relaxed m-0">
              Bob uses an automatic multi-tier routing architecture with primary priority execution and automatic failover safeguards:
            </p>

            <div className="space-y-2.5">
              {/* Agent 1: Gemini Live */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isLiveGemini 
                  ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                  : 'bg-neutral-950/60 border-neutral-800 opacity-75'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isLiveGemini ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                    <span className="font-bold text-[13px] text-white">Gemini Multimodal Live API</span>
                  </div>
                  {isLiveGemini ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase">
                      Active Now
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold">
                      Primary Default
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-neutral-400 mt-1 mb-0 leading-relaxed">
                  Real-time bi-directional audio WebSocket pipeline with native server VAD and instantaneous barge-in. Free tier 1,500 req/day.
                </p>
              </div>

              {/* Agent 2: Kokoro 82M Neural */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                !isLiveGemini && isKokoroInstalled
                  ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-neutral-950/60 border-neutral-800 opacity-75'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${!isLiveGemini && isKokoroInstalled ? 'bg-blue-400 animate-pulse' : 'bg-neutral-600'}`} />
                    <span className="font-bold text-[13px] text-white">Kokoro 82M Neural TTS</span>
                  </div>
                  {!isLiveGemini && isKokoroInstalled ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase">
                      Active Fallback
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold">
                      {isKokoroInstalled ? 'Standby Fallback' : 'Offline Model'}
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-neutral-400 mt-1 mb-0 leading-relaxed">
                  High-fidelity 82M parameter ONNX neural voice generator running locally inside the browser/desktop without cloud costs.
                </p>
              </div>

              {/* Agent 3: Browser Web Speech */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                !isLiveGemini && !isKokoroInstalled
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-neutral-950/60 border-neutral-800 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${!isLiveGemini && !isKokoroInstalled ? 'bg-amber-400' : 'bg-neutral-600'}`} />
                    <span className="font-bold text-[13px] text-white">Browser Speech Engine</span>
                  </div>
                  {!isLiveGemini && !isKokoroInstalled ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase">
                      Active Fallback
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold">
                      Tertiary Fallback
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-neutral-400 mt-1 mb-0 leading-relaxed">
                  System Web Speech API synthesizer and DualEngine Whisper/WebSpeech STT.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowAgentsModal(false)}
                className="w-full py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[12px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AudioWaveVisualizer as VoiceWaveform } from './AudioWaveVisualizer';
