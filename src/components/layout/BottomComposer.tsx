import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Sparkles, Mic, Send } from 'lucide-react';

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
    openChromeBridge
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Do not show on Chrome side panel page because that page has its own dedicated dock composer
  if (currentPage === 'chrome') {
    return null;
  }

  const handleSend = async () => {
    if (!prompt.trim() || isAiGenerating) return;
    const text = prompt.trim();
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px';
    }

    if (currentPage !== 'research') {
      navigateTo('research', 'chat');
    }

    await sendMessage(text);
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

  return (
    <>
      {/* Chrome launcher button on the right */}
      <button
        onClick={openChromeBridge}
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
          placeholder="Message Bob..."
          className="w-full min-h-[38px] max-h-[120px] resize-none border-0 outline-none focus:outline-none bg-transparent px-2.5 py-1 text-[13.5px] text-[var(--t)] leading-normal"
          rows={1}
        />

        <div className="flex items-center gap-1 pt-1">
          {/* Add context button */}
          <button
            onClick={() => setIsAddFilesOpen(true)}
            title="Add research files"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[#666] dark:text-[#a8a199] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Tools menu button */}
          <button
            onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            title="Bob tools"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[#666] dark:text-[#a8a199] transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[var(--y)]" />
          </button>

          <span className="flex-1" />

          {/* Voice button */}
          <button
            onClick={() => handleSend()}
            title="Voice input"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[#666] dark:text-[#a8a199] transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || isAiGenerating}
            title="Send prompt"
            className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] grid place-items-center hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};
