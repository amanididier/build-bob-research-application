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
  const [launcherToast, setLauncherToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    voiceState,
    startVoiceMode,
    stopVoiceMode,
    interrupt,
    voiceMode,
    setVoiceMode,
    errorMessage,
  } = useVoiceStore();

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

  // Do not show on Chrome side panel or Chat page because those have their own dedicated composers
  if (currentPage === 'chrome' || currentPage === 'chat') {
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

  const isVoiceActive = voiceState !== 'IDLE' && voiceState !== 'ERROR' && voiceState !== 'STOPPING';
  const isExpanded = Boolean(prompt.trim()) || isVoiceActive;
  const isBusy = voiceState === 'TRANSCRIBING' || voiceState === 'SUBMITTING' || voiceState === 'THINKING';

  const handleToggleMic = async () => {
    if (voiceState === 'SPEAKING') {
      interrupt();
      return;
    }
    if (isVoiceActive) {
      stopVoiceMode();
    } else {
      setVoiceMode('prompt');
      await startVoiceMode('prompt');
    }
  };

  const handleStartCall = async () => {
    if (voiceState === 'SPEAKING') {
      interrupt();
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
              : 'Message Bob...'
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

          {/* Direct Hands-Free Mic Button (ChatGPT / Gemini style dictation) */}
          <button
            onClick={handleToggleMic}
            title={
              voiceState === 'SPEAKING'
                ? 'Interrupt speech'
                : isVoiceActive && voiceMode === 'prompt'
                ? 'Stop dictation'
                : 'Dictate message (hands-free)'
            }
            className={`w-8 h-8 rounded-full grid place-items-center transition-all cursor-pointer ${
              isVoiceActive && voiceMode === 'prompt'
                ? 'bg-[var(--y)] text-neutral-900 shadow-md ring-2 ring-[var(--y)]/40 scale-105'
                : 'hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            {isVoiceActive && voiceMode === 'prompt' ? (
              <MicOff className="w-4 h-4 stroke-[2]" />
            ) : (
              <Mic className="w-4 h-4 stroke-[1.8]" />
            )}
          </button>

          {/* Direct Live Call Mode Button (ChatGPT Advanced Voice / Gemini Live style) */}
          <button
            onClick={handleStartCall}
            title="Start live voice call with Bob"
            className="w-8 h-8 rounded-full grid place-items-center transition-all cursor-pointer bg-[var(--s2)] hover:bg-[var(--y)] text-[var(--t)] hover:text-[#171717] hover:shadow-xs active:scale-95"
          >
            <Phone className="w-3.5 h-3.5 stroke-[2]" />
          </button>

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
