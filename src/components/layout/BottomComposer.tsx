import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Sparkles, Mic, MicOff, Send, Volume2, Square, Chrome, Phone, AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { voiceController } from '../../lib/voice/voiceController';
import { VoiceCallOverlay, VoiceWaveform } from '../voice/VoiceCallOverlay';
import { geminiTranscriptionService } from '../../lib/ai/GeminiTranscriptionService';
import { resolveGeminiApiKey } from '../../lib/ai/keyManager';

/**
 * Prompt-mode dictation: MediaRecorder → Gemini STT → insert into composer (never auto-send).
 * Call mode: continuous Gemini Live via voiceController.
 */
export const BottomComposer: React.FC = () => {
  const {
    currentPage,
    sendMessage,
    isAiGenerating,
    setIsAddFilesOpen,
    setIsToolsMenuOpen,
    isToolsMenuOpen,
    navigateTo,
    isSidebarClosed,
    setIsChromeModalOpen,
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [micMenuOpen, setMicMenuOpen] = useState(false);
  const [launcherToast, setLauncherToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Gemini Prompt dictation state
  type DictationPhase = 'idle' | 'recording' | 'processing' | 'error';
  const [dictationPhase, setDictationPhase] = useState<DictationPhase>('idle');
  const [dictationError, setDictationError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const levelsRef = useRef<number[]>([0.2, 0.35, 0.5, 0.4, 0.25, 0.45, 0.3]);
  const [levels, setLevels] = useState<number[]>(levelsRef.current);
  const animRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const {
    voiceState,
    startVoiceMode,
    stopVoiceMode,
    interrupt,
    voiceMode,
    setVoiceMode,
    errorMessage,
  } = useVoiceStore();

  const stopLevelAnim = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  const releaseMic = () => {
    stopLevelAnim();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { void audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  };

  const startLevelAnim = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const bars = 7;
        const step = Math.floor(data.length / bars);
        const next: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] || 0;
          next.push(Math.min(1, (sum / step) / 180));
        }
        levelsRef.current = next;
        setLevels([...next]);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    } catch {
      // decorative fallback if analyser fails
      const fake = () => {
        setLevels((prev) => prev.map(() => 0.15 + Math.random() * 0.7));
        animRef.current = requestAnimationFrame(fake);
      };
      animRef.current = requestAnimationFrame(fake);
    }
  };

  const startPromptDictation = async () => {
    setMicMenuOpen(false);
    setDictationError(null);

    const key = resolveGeminiApiKey();
    if (!key) {
      setDictationError('Add your Gemini API key in Settings to use dictation.');
      setDictationPhase('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250);
      setDictationPhase('recording');
      startLevelAnim(stream);
    } catch (err: any) {
      setDictationError(err?.message || 'Microphone permission denied');
      setDictationPhase('error');
      releaseMic();
    }
  };

  const cancelDictation = () => {
    releaseMic();
    setDictationPhase('idle');
    setDictationError(null);
  };

  const confirmDictation = async () => {
    if (dictationPhase !== 'recording') return;
    setDictationPhase('processing');
    stopLevelAnim();

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      cancelDictation();
      return;
    }

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        resolve(new Blob(chunksRef.current, { type }));
      };
      try {
        recorder.stop();
      } catch {
        resolve(new Blob([]));
      }
    });

    // Release mic immediately after stop
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;

    if (!blob || blob.size < 500) {
      setDictationError('No speech captured. Try again.');
      setDictationPhase('error');
      releaseMic();
      return;
    }

    const result = await geminiTranscriptionService.transcribeAudio(blob, blob.type || 'audio/webm');
    releaseMic();

    if (result.error || !result.text.trim()) {
      setDictationError(result.error || 'Empty transcription. Try speaking a bit longer.');
      setDictationPhase('error');
      return;
    }

    // Insert / append into composer — never auto-send
    const existing = prompt.trim();
    const next = existing ? `${existing} ${result.text.trim()}` : result.text.trim();
    setPrompt(next);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      textareaRef.current.focus();
    }
    setDictationPhase('idle');
    setDictationError(null);
  };

  // Cleanup on unmount
  useEffect(() => () => releaseMic(), []);

  const handleSend = useCallback(async (textToSend?: string) => {
    const text = (textToSend || prompt).trim();
    if (!text || isAiGenerating) return;

    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px';
    }

    if (currentPage !== 'research') {
      navigateTo('research', 'chat');
    }

    await sendMessage(text);
  }, [prompt, isAiGenerating, currentPage, navigateTo, sendMessage]);

  // Call-mode still wires through voiceController for continuous Gemini Live
  useEffect(() => {
    voiceController.registerHandlers({
      onTranscriptUpdate: (transcript: string) => {
        if (voiceController.getMode() !== 'prompt') return;
        // Prompt dictation now uses Gemini path above; keep legacy listener safe
        setPrompt(transcript);
      },
      onSubmitMessage: async (voiceText: string) => {
        await handleSend(voiceText);
      },
    });
  }, [handleSend]);

  useEffect(() => {
    if (!launcherToast) return;
    const t = setTimeout(() => setLauncherToast(null), 6000);
    return () => clearTimeout(t);
  }, [launcherToast]);

  if (currentPage === 'chrome') {
    return null;
  }

  const handleChromeLaunch = async () => {
    const bob = typeof window !== 'undefined' ? (window as any).bob : null;
    if (bob?.requestExtensionPanel) {
      const res = await bob.requestExtensionPanel();
      setLauncherToast(res?.queued ? 'Opening Bob Side Panel in Chrome…' : 'Connecting to Chrome side panel…');
      setTimeout(() => setLauncherToast(null), 3000);
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:54321/events/pending', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-bob-token': 'development-token' },
        body: JSON.stringify({ reason: 'user-clicked-chrome' })
      });
      if (res.ok) {
        setLauncherToast('Opening Bob Side Panel in Chrome…');
        setTimeout(() => setLauncherToast(null), 3000);
        return;
      }
    } catch {}
    setIsChromeModalOpen(true);
  };

  const handleToggleVoice = async () => {
    if (dictationPhase === 'recording' || dictationPhase === 'processing') {
      cancelDictation();
      return;
    }
    if (voiceState === 'SPEAKING') {
      interrupt();
      return;
    }
    if (voiceState !== 'IDLE' && voiceState !== 'ERROR') {
      stopVoiceMode();
      setMicMenuOpen(false);
    } else {
      setMicMenuOpen((v) => !v);
    }
  };

  const startMode = async (m: 'prompt' | 'call') => {
    setMicMenuOpen(false);
    if (m === 'prompt') {
      await startPromptDictation();
      return;
    }
    setVoiceMode('call');
    await startVoiceMode('call');
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isVoiceActive = voiceState !== 'IDLE' && voiceState !== 'ERROR' && voiceState !== 'STOPPING';
  const isDictating = dictationPhase === 'recording' || dictationPhase === 'processing';
  const isExpanded = Boolean(prompt.trim()) || isVoiceActive || isDictating;

  if (isVoiceActive && voiceMode === 'call') {
    return <VoiceCallOverlay onClose={() => stopVoiceMode()} />;
  }

  return (
    <>
      <button
        onClick={handleChromeLaunch}
        title="Open Bob in Chrome"
        className={`fixed z-30 bottom-5 w-11 h-11 rounded-full bg-[var(--s)] border border-[var(--line)] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 grid place-items-center ${
          isSidebarClosed
            ? isExpanded ? 'left-[calc(50%+430px)]' : 'left-[calc(50%+270px)]'
            : isExpanded ? 'left-[calc(275px+(100vw-275px)/2+430px)]' : 'left-[calc(275px+(100vw-275px)/2+290px)]'
        } hidden xl:grid`}
      >
        <Chrome className="w-5 h-5 text-[#4285f4]" strokeWidth={1.8} />
      </button>

      {launcherToast && (
        <div className="fixed z-40 bottom-20 right-6 max-w-[300px] p-3 rounded-2xl bg-[var(--s)] border border-[var(--line)] shadow-xl text-[11.5px] leading-relaxed text-[var(--t)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          {launcherToast}
        </div>
      )}

      <div
        className={`fixed z-20 bottom-5 transform -translate-x-1/2 bg-[var(--s)] border border-[#d8d8d1] dark:border-[#3b3129] rounded-[23px] shadow-[0_20px_55px_rgba(0,0,0,0.12)] p-2.5 transition-all duration-300 ease-out ${
          isSidebarClosed
            ? isExpanded ? 'left-1/2 w-[min(800px,calc(100vw-70px))]' : 'left-1/2 w-[min(480px,calc(100vw-60px))]'
            : isExpanded ? 'left-[calc(275px+(100vw-275px)/2)] w-[min(800px,calc(100vw-275px-70px))]' : 'left-[calc(275px+(100vw-275px)/2)] w-[min(500px,calc(100vw-275px-60px))]'
        }`}
      >
        {/* Gemini Prompt recording pill */}
        {isDictating && (
          <div className="flex items-center justify-center gap-3 px-3 py-2.5 mb-1.5 rounded-2xl bg-[var(--s2)] border border-[var(--line)] animate-in fade-in duration-150">
            {dictationPhase === 'recording' && (
              <>
                <div className="flex items-end gap-0.5 h-6">
                  {levels.map((l, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-[var(--y)] transition-all duration-75"
                      style={{ height: `${Math.max(4, Math.round(l * 22))}px` }}
                    />
                  ))}
                </div>
                <span className="text-[12px] font-semibold text-[var(--t)] select-none">Recording…</span>
                <button
                  type="button"
                  onClick={confirmDictation}
                  title="Confirm & transcribe"
                  className="w-9 h-9 rounded-full bg-[var(--y)] text-[#171717] grid place-items-center shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  <Check className="w-4.5 h-4.5" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={cancelDictation}
                  title="Cancel"
                  className="w-8 h-8 rounded-full bg-[var(--s)] border border-[var(--line)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            {dictationPhase === 'processing' && (
              <>
                <Loader2 className="w-5 h-5 text-[var(--y)] animate-spin" />
                <span className="text-[12px] font-semibold text-[var(--t)] select-none">Transcribing with Gemini…</span>
              </>
            )}
          </div>
        )}

        {dictationPhase === 'error' && dictationError && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1.5 rounded-2xl bg-[#fdecea] dark:bg-[#3a1512] border border-[#e5484d]/40 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-[#e5484d] shrink-0" />
            <span className="text-[11.5px] font-medium text-[#c0392b] dark:text-[#ff9d9a] flex-1">{dictationError}</span>
            <button
              type="button"
              onClick={() => { setDictationPhase('idle'); setDictationError(null); }}
              className="text-[11px] font-bold text-[var(--t)] px-2 py-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {isVoiceActive && voiceMode === 'prompt' && !isDictating && (
          <VoiceWaveform height={22} className="px-2 pb-1 opacity-80" />
        )}

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            dictationPhase === 'recording'
              ? 'Speak now… tap ✓ when done'
              : dictationPhase === 'processing'
              ? 'Transcribing with Gemini…'
              : voiceState === 'SPEAKING'
              ? 'Bob is speaking (click mic to interrupt)...'
              : 'Message Bob…'
          }
          disabled={dictationPhase === 'processing'}
          className="w-full min-h-[38px] max-h-[120px] resize-none border-0 outline-none focus:outline-none bg-transparent px-2.5 py-1 text-[13.5px] text-[var(--t)] leading-normal placeholder:text-[var(--m)] disabled:opacity-60"
          rows={1}
        />

        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => setIsAddFilesOpen(true)}
            title="Add research files"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} />
          </button>

          <button
            onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            title="Bob tools"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[var(--y)]" strokeWidth={1.8} />
          </button>

          <span className="flex-1" />

          {errorMessage && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdecea] dark:bg-[#3a1512] border border-[#e5484d]/40 mr-1 max-w-[260px]">
              <AlertCircle className="w-3.5 h-3.5 text-[#e5484d] shrink-0" />
              <span className="text-[10.5px] font-semibold text-[#c0392b] dark:text-[#ff9d9a] truncate">{errorMessage}</span>
            </div>
          )}

          {voiceState === 'SPEAKING' && (
            <button
              onClick={interrupt}
              title="Interrupt Bob"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 mr-1 shadow-xs cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span className="text-[11.5px] font-semibold text-blue-500 select-none">Bob speaking</span>
              <Square className="w-2.5 h-2.5 text-blue-500 fill-current" />
            </button>
          )}

          {/* Mic + Prompt / Call selector */}
          <div className="relative">
            {micMenuOpen && !isVoiceActive && !isDictating && (
              <div className="absolute bottom-10 right-0 z-40 flex items-center gap-1 p-1 rounded-full bg-[var(--s)] border border-[var(--line)] shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => startMode('prompt')}
                  title="Dictate with Gemini — review text, then send yourself"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--s2)] hover:bg-[var(--line)]/60 text-[11px] font-bold text-[var(--t)] transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Prompt</span>
                </button>
                <button
                  onClick={() => startMode('call')}
                  title="Continuous live call via Gemini Live"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
              </div>
            )}
            <button
              onClick={handleToggleVoice}
              title={
                isDictating
                  ? 'Cancel dictation'
                  : voiceState === 'SPEAKING'
                  ? 'Interrupt'
                  : isVoiceActive
                  ? 'End voice'
                  : 'Dictate or call Bob'
              }
              className={`w-8 h-8 rounded-full grid place-items-center transition-all cursor-pointer ${
                isDictating || isVoiceActive
                  ? 'bg-[var(--y)] text-neutral-900 shadow-md ring-2 ring-[var(--y)]/40 scale-105'
                  : 'hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
              }`}
            >
              {isDictating || isVoiceActive ? (
                <MicOff className="w-4 h-4" strokeWidth={1.8} />
              ) : (
                <Mic className="w-4 h-4" strokeWidth={1.8} />
              )}
            </button>
          </div>

          <button
            onClick={() => handleSend()}
            disabled={!prompt.trim() || isAiGenerating || isDictating}
            title="Send message"
            className={`w-8 h-8 rounded-full grid place-items-center transition-all ${
              prompt.trim() && !isAiGenerating && !isDictating
                ? 'bg-[var(--y)] text-neutral-900 shadow-md cursor-pointer hover:scale-105'
                : 'bg-[var(--s2)] text-[var(--m)] opacity-50 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
};
