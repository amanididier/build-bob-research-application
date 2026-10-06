import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useVoiceStore } from '../../store/useVoiceStore';
import { micManager } from '../../lib/voice/microphoneManager';
import { PhoneOff, Mic, MicOff, MessageSquare, Volume2, Sparkles, Brain, AlertCircle, Activity } from 'lucide-react';
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
    errorMessage,
    notice,
    provider,
    diagnostics,
  } = useVoiceStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const isBobTurn = voiceState === 'SPEAKING' || voiceState === 'THINKING';
  const isLive = provider.startsWith('Gemini Live');
  const isUserTurn = voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING';

  const handleToggleMute = () => {
    if (isBobTurn) {
      interrupt();
    }
    const next = !isMuted;
    micManager.setMuted(next);
    setIsMuted(next);
  };

  const handleEndCall = () => {
    micManager.setMuted(false);
    stopVoiceMode();
    onClose();
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
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
              voiceState === 'CONNECTING'
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                : isLive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            {voiceState === 'CONNECTING'
              ? 'Connecting to Bob...'
              : isLive
              ? 'Live voice connected'
              : 'Backup voice active'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug((v) => !v)}
            title="Voice diagnostics"
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showDebug
                ? 'text-white bg-neutral-800 border-neutral-700'
                : 'text-neutral-400 hover:text-white border-transparent hover:border-neutral-800 hover:bg-neutral-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Debug
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
                <span>Hearing you...</span>
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
            {voiceState === 'CONNECTING' && (
              <>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>Connecting to Bob...</span>
              </>
            )}
            {voiceState === 'TRANSCRIBING' && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span>Transcribing your voice...</span>
              </>
            )}
            {voiceState === 'FALLBACK' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Switching to backup voice...</span>
              </>
            )}
            {voiceState === 'ERROR' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Voice stopped</span>
              </>
            )}
          </div>

          <span className="text-[11px] text-neutral-400">
            {isBobTurn
              ? isLive
                ? 'Realtime Gemini Live voice'
                : 'Natural voice (chunked streaming)'
              : 'Bob answers ~1.5s after you stop talking'}
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

      {/* Errors and provider notices are always visible — never silent */}
      {(errorMessage || notice) && (
        <div className="w-full max-w-lg mb-3 flex justify-center px-4">
          <div
            className={`px-3.5 py-2 rounded-2xl border text-[12px] font-medium flex items-start gap-2 ${
              errorMessage
                ? 'bg-red-500/10 border-red-500/30 text-red-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage || notice}</span>
          </div>
        </div>
      )}

      {showDebug && (
        <div className="w-full max-w-lg mb-3 px-4">
          <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800 font-mono text-[10.5px] leading-relaxed text-neutral-300 max-h-[220px] overflow-y-auto">
            <div className="text-[11px] font-bold text-neutral-100 mb-1.5 tracking-wide">VOICE DEBUG</div>
            <div>Mode: {diagnostics.mode}</div>
            <div>Provider: {diagnostics.provider}</div>
            <div>Model: {diagnostics.model}</div>
            <div>Connection: {diagnostics.connection}</div>
            <div>Microphone: {diagnostics.microphone}</div>
            <div>VAD: {diagnostics.vad}</div>
            <div>STT: {diagnostics.stt}</div>
            <div>TTS: {diagnostics.tts}</div>
            <div>Audio: {diagnostics.audio}</div>
            <div>Stage: {diagnostics.stage}</div>
            <div className="mt-1.5">Last event: {diagnostics.lastEvent}</div>
            {diagnostics.lastError && (
              <div className="mt-1 text-red-300">
                ERROR: {diagnostics.lastError.code} — {diagnostics.lastError.message}
              </div>
            )}
            {Object.keys(diagnostics.latency).length > 0 && (
              <div className="mt-1.5 text-sky-300">
                Latency:{' '}
                {Object.entries(diagnostics.latency)
                  .map(([k, v]) => `${k} ${v}ms`)
                  .join(' · ')}
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
};

export { AudioWaveVisualizer as VoiceWaveform } from './AudioWaveVisualizer';
