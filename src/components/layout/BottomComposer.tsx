import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Sparkles, Mic, MicOff, Send, Volume2, Square } from 'lucide-react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { voiceController } from '../../lib/voice/voiceController';

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
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    voiceState,
    startVoiceMode,
    stopVoiceMode,
    interrupt,
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

  // Do not show on Chrome side panel page because that page has its own dedicated dock composer
  if (currentPage === 'chrome') {
    return null;
  }

  const handleToggleVoice = async () => {
    if (voiceState === 'SPEAKING') {
      // Barge-in / Interrupt
      interrupt();
      return;
    }

    if (voiceState !== 'IDLE' && voiceState !== 'ERROR') {
      stopVoiceMode();
    } else {
      await startVoiceMode();
    }
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

  return (
    <>
      {/* Chrome launcher button on the right */}
      <button
        onClick={() => navigateTo('chrome')}
        title="Open Bob in Chrome"
        className={`fixed z-30 bottom-5 w-11 h-11 rounded-full bg-[var(--s)] border border-[var(--line)] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all grid place-items-center ${
          isSidebarClosed
            ? 'left-[calc(50%+430px)]'
            : 'left-[calc(275px+(100vw-275px)/2+430px)]'
        } hidden xl:grid`}
      >
        <span className="w-6 h-6 rounded-full relative p-1 bg-[conic-gradient(from_-35deg,#db4437_0_31%,#f4b400_31%_64%,#0f9d58_64%_100%)] flex items-center justify-center">
          <span className="w-3.5 h-3.5 rounded-full bg-[#4285f4] ring-2 ring-white" />
        </span>
      </button>

      {/* Main Bottom Floating Composer */}
      <div
        className={`fixed z-20 bottom-5 transform -translate-x-1/2 bg-[var(--s)] border border-[#d8d8d1] dark:border-[#3b3129] rounded-[23px] shadow-[0_20px_55px_rgba(0,0,0,0.12)] p-2.5 transition-all ${
          isSidebarClosed
            ? 'left-1/2 w-[min(800px,calc(100vw-70px))]'
            : 'left-[calc(275px+(100vw-275px)/2)] w-[min(800px,calc(100vw-275px-70px))]'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            voiceState === 'LISTENING'
              ? 'Listening... speak naturally...'
              : voiceState === 'USER_SPEAKING'
              ? 'Transcribing your voice...'
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

          {/* Dynamic Voice State Indicators */}
          {voiceState === 'LISTENING' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ys)] dark:bg-[#382c0b] border border-[var(--y)]/50 animate-in fade-in duration-150 mr-1 shadow-xs">
              <span className="w-1.5 h-1.5 bg-[var(--y)] rounded-full animate-ping" />
              <span className="text-[11.5px] font-semibold text-[var(--y)] select-none">Listening...</span>
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

          {/* Voice button */}
          <button
            onClick={handleToggleVoice}
            title={
              voiceState === 'SPEAKING'
                ? 'Interrupt speech'
                : isVoiceActive
                ? 'Stop voice mode'
                : 'Start hands-free voice companion'
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
