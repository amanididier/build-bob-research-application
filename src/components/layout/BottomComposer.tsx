import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Sparkles, Mic, MicOff, Send, Volume2, Square, Chrome, Phone, AlertCircle, Check, Hand } from 'lucide-react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { voiceController } from '../../lib/voice/voiceController';
import { VoiceCallOverlay, VoiceWaveform } from '../voice/VoiceCallOverlay';
import { ModelInstallCard } from '../voice/ModelInstallCard';

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
  const [holdSeconds, setHoldSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    voiceState,
    startVoiceMode,
    stopVoiceMode,
    interrupt,
    voiceMode,
    setVoiceMode,
    errorMessage,
    beginPushToTalk,
    endPushToTalk,
  } = useVoiceStore();

  const holdingRef = useRef(false);
  const holdTickerRef = useRef<any>(null);
  const callOverlayActiveRef = useRef(false);

  const startHold = useCallback(async () => {
    if (holdingRef.current) return;
    holdingRef.current = true;
    setHoldSeconds(0);
    holdTickerRef.current = setInterval(() => setHoldSeconds((s) => s + 1), 1000);
    await beginPushToTalk('prompt');
  }, [beginPushToTalk]);

  const endHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    if (holdTickerRef.current) {
      clearInterval(holdTickerRef.current);
      holdTickerRef.current = null;
    }
    setHoldSeconds(0);
    void endPushToTalk();
  }, [endPushToTalk]);

  // Hold Space to talk: press = record, release = transcribe. Text fields keep the space bar.
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      if (!node || !node.tagName) return false;
      const tag = node.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable === true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (callOverlayActiveRef.current) return; // the call overlay owns the space bar
      e.preventDefault();
      void startHold();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (callOverlayActiveRef.current) return;
      endHold();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', endHold);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', endHold);
      if (holdTickerRef.current) clearInterval(holdTickerRef.current);
    };
  }, [startHold, endHold]);

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

  // Connect Voice Controller to existing composer & send pipeline
  useEffect(() => {
    voiceController.registerHandlers({
      onTranscriptUpdate: (transcript: string) => {
        if (voiceController.getMode() !== 'prompt') return;
        setPrompt(transcript);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
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

  // Do not show on Chrome side panel page because that page has its own dedicated dock composer
  if (currentPage === 'chrome') {
    return null;
  }

  const handleChromeLaunch = async () => {
    const bob = typeof window !== 'undefined' ? (window as any).bob : null;
    if (bob?.requestExtensionPanel) {
      const res = await bob.requestExtensionPanel();
      setLauncherToast(
        res?.queued
          ? 'Opening Bob Side Panel in Chrome…'
          : 'Connecting to Chrome side panel…'
      );
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
    setVoiceMode(m);
    setMicMenuOpen(false);
    await startVoiceMode(m);
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
  const isExpanded = Boolean(prompt.trim()) || isVoiceActive;
  callOverlayActiveRef.current = isVoiceActive && voiceMode === 'call';
  const isRecording = holdingRef.current || voiceState === 'USER_SPEAKING';
  const isBusy = voiceState === 'TRANSCRIBING' || voiceState === 'SUBMITTING' || voiceState === 'THINKING';

  if (isVoiceActive && voiceMode === 'call') {
    return <VoiceCallOverlay onClose={() => stopVoiceMode()} />;
  }

  return (
    <>
      {/* Clean White Card for on-demand local model installation */}
      <ModelInstallCard />

      {/* Chrome launcher button on the right */}
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

      {/* Main Bottom Floating Composer */}
      <div
        className={`fixed z-20 bottom-5 transform -translate-x-1/2 bg-[var(--s)] border border-[#d8d8d1] dark:border-[#3b3129] rounded-[23px] shadow-[0_20px_55px_rgba(0,0,0,0.12)] p-2.5 transition-all duration-300 ease-out ${
          isSidebarClosed
            ? isExpanded ? 'left-1/2 w-[min(800px,calc(100vw-70px))]' : 'left-1/2 w-[min(480px,calc(100vw-60px))]'
            : isExpanded ? 'left-[calc(275px+(100vw-275px)/2)] w-[min(800px,calc(100vw-275px-70px))]' : 'left-[calc(275px+(100vw-275px)/2)] w-[min(500px,calc(100vw-275px-60px))]'
        }`}
      >
        {isVoiceActive && voiceMode === 'prompt' && (
          <VoiceWaveform height={22} className="px-2 pb-1 opacity-80" />
        )}

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            voiceState === 'REQUESTING_PERMISSION'
              ? 'Requesting microphone access…'
              : voiceState === 'LISTENING'
              ? voiceMode === 'prompt'
                ? 'Dictation active... speak naturally, live words appear here...'
                : 'Call connected... speak naturally...'
              : voiceState === 'USER_SPEAKING'
              ? 'Listening to your speech...'
              : voiceState === 'TRANSCRIBING'
              ? 'Transcribing your recording…'
              : voiceState === 'TRANSCRIPT_READY'
              ? 'Dictation transcribed. Review and send when ready.'
              : voiceState === 'SPEAKING'
              ? 'Bob is speaking (click mic or talk to interrupt)...'
              : 'Message Bob... (hold Space to talk)'
          }
          className="w-full min-h-[38px] max-h-[120px] resize-none border-0 outline-none focus:outline-none bg-transparent px-2.5 py-1 text-[13.5px] text-[var(--t)] leading-normal placeholder:text-[var(--m)]"
          rows={1}
        />

        <div className="flex items-center gap-1.5 pt-1">
          {/* Add context button */}
          <button
            onClick={() => setIsAddFilesOpen(true)}
            title="Add research files"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </button>

          {/* Tools menu button */}
          <button
            onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            title="Bob tools"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[var(--y)]" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </button>

          <span className="flex-1" />

          {errorMessage && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdecea] dark:bg-[#3a1512] border border-[#e5484d]/40 mr-1 max-w-[260px]">
              <AlertCircle className="w-3.5 h-3.5 text-[#e5484d] shrink-0" />
              <span className="text-[10.5px] font-semibold text-[#c0392b] dark:text-[#ff9d9a] truncate">{errorMessage}</span>
            </div>
          )}

          {/* Dynamic Voice State Indicators */}
          {voiceState === 'REQUESTING_PERMISSION' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 animate-in fade-in duration-150 mr-1 shadow-xs">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              <span className="text-[11.5px] font-semibold text-amber-500 select-none">Allow microphone…</span>
            </div>
          )}

          {voiceState === 'TRANSCRIPT_READY' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 animate-in fade-in duration-150 mr-1 shadow-xs">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400 select-none">Transcribed ✓</span>
            </div>
          )}

          {voiceState === 'LISTENING' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ys)] dark:bg-[#382c0b] border border-[var(--y)]/50 animate-in fade-in duration-150 mr-1 shadow-xs">
              <span className="w-1.5 h-1.5 bg-[var(--y)] rounded-full animate-ping" />
              <span className="text-[11.5px] font-semibold text-[var(--y)] select-none">
                {voiceMode === 'call' ? 'Call connected' : 'Listening...'}
              </span>
            </div>
          )}

          {voiceState === 'USER_SPEAKING' && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 animate-in fade-in duration-150 mr-1 shadow-xs">
              <span className="w-1 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-3.5 bg-amber-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:300ms]" />
              <span className="w-1 h-4 bg-amber-500 rounded-full animate-bounce [animation-delay:75ms]" />
              <span className="text-[11.5px] font-semibold text-amber-500 pl-1 select-none">Speaking</span>
            </div>
          )}

          {voiceState === 'SPEAKING' && (
            <button
              onClick={interrupt}
              title="Click to interrupt Bob"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 animate-in fade-in duration-150 mr-1 shadow-xs cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-500 animate-pulse" strokeWidth={1.8} />
              <span className="text-[11.5px] font-semibold text-blue-500 select-none">Bob speaking (click to stop)</span>
              <Square className="w-2.5 h-2.5 text-blue-500 fill-current ml-0.5" />
            </button>
          )}

          {isBusy && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/40 animate-in fade-in duration-150 mr-1 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
              <span className="text-[11.5px] font-semibold text-violet-600 dark:text-violet-300 select-none">
                {voiceState === 'THINKING' ? 'Bob is thinking…' : 'Transcribing…'}
              </span>
              <button
                onClick={() => stopVoiceMode()}
                title="Stop and discard"
                className="ml-0.5 grid place-items-center w-4 h-4 rounded-full bg-violet-500/25 hover:bg-violet-500/40 transition-colors cursor-pointer"
              >
                <Square className="w-2 h-2 text-violet-600 dark:text-violet-200 fill-current" />
              </button>
            </div>
          )}

          {/* Hold to talk: press-and-hold with the pointer, or hold the space bar */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              void startHold();
            }}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            title="Hold to record, release to transcribe (or hold the space bar)"
            className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-[11px] font-bold transition-all select-none touch-none cursor-pointer border ${
              isRecording
                ? 'bg-[#e5484d] border-[#e5484d] text-white shadow-md scale-105'
                : 'bg-[var(--s2)] border-[var(--line)] text-[var(--t)] hover:bg-[var(--line)]/60'
            }`}
          >
            {isRecording ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>{holdSeconds > 0 ? `Recording ${holdSeconds}s — release` : 'Recording — release'}</span>
              </>
            ) : (
              <>
                <Hand className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Hold to talk</span>
              </>
            )}
          </button>

          {/* Voice button + mode pill */}
          <div className="relative">
            {micMenuOpen && !isVoiceActive && (
              <div className="absolute bottom-10 right-0 z-40 flex items-center gap-1 p-1 rounded-full bg-[var(--s)] border border-[var(--line)] shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => startMode('prompt')}
                  title="Dictate into the composer, review, then send yourself"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--s2)] hover:bg-[var(--line)]/60 text-[11px] font-bold text-[var(--t)] transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Prompt</span>
                </button>
                <button
                  onClick={() => startMode('call')}
                  title="Hands-free call: Bob answers when you stop talking"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[11px] font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
              </div>
            )}
            <button
              onClick={handleToggleVoice}
              title={
                voiceState === 'SPEAKING'
                  ? 'Interrupt speech'
                  : isVoiceActive
                  ? 'Stop voice mode'
                  : 'Dictate or call Bob'
              }
              className={`w-8 h-8 rounded-full grid place-items-center transition-all cursor-pointer ${
                voiceState === 'SPEAKING'
                  ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-400/40'
                  : isVoiceActive
                  ? 'bg-[var(--y)] text-neutral-900 shadow-md ring-2 ring-[var(--y)]/40 scale-105'
                  : 'hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
              }`}
            >
              {isVoiceActive ? (
                <MicOff className="w-4 h-4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <Mic className="w-4 h-4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              )}
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={!prompt.trim() || isAiGenerating}
            title="Send prompt"
            className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] grid place-items-center hover:opacity-90 active:scale-95 transition-all shadow-xs disabled:opacity-30 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </div>
      </div>
    </>
  );
};
