import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Sparkles, Mic, MicOff, CircleArrowUp, Volume2, Square, Chrome, Phone, AlertCircle, Check, Hand, Cable, FolderOpen, Github, X, Link2, ShieldCheck } from 'lucide-react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { voiceController } from '../../lib/voice/voiceController';
import { VoiceCallOverlay, VoiceWaveform } from '../voice/VoiceCallOverlay';
import { ModelInstallCard } from '../voice/ModelInstallCard';

export const BottomComposer: React.FC = () => {
  const { 
    currentPage, 
    activeResearchId,
    sendMessage,
    isAiGenerating,
    setIsAddFilesOpen, 
    setIsToolsMenuOpen, 
    isToolsMenuOpen,
    navigateTo,
    isSidebarClosed,
    setIsChromeModalOpen,
    setIsBridgeOpen,
    openChromeBridge,
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [launcherToast, setLauncherToast] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectContext, setProjectContext] = useState<any>({ connected: false, local: { connected: false }, github: { connected: false }, hasGitHubToken: false });
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [projectContextBusy, setProjectContextBusy] = useState(false);
  const [projectContextError, setProjectContextError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refreshProjectContext = useCallback(async () => {
    const bridge = typeof window !== 'undefined' ? (window as any).bob : null;
    if (!activeResearchId || !bridge?.conversationProjectStatus) {
      setProjectContext({ connected: false, local: { connected: false }, github: { connected: false }, hasGitHubToken: false });
      return;
    }
    try {
      const status = await bridge.conversationProjectStatus(activeResearchId);
      setProjectContext(status || { connected: false, local: { connected: false }, github: { connected: false }, hasGitHubToken: false });
      if (status?.github?.connected && !githubUrl) setGithubUrl(status.github.url || '');
    } catch {
      setProjectContextError('Could not load this conversation’s project context.');
    }
  }, [activeResearchId]);

  useEffect(() => { void refreshProjectContext(); }, [refreshProjectContext]);

  const attachLocalProject = async () => {
    const bridge = typeof window !== 'undefined' ? (window as any).bob : null;
    if (!activeResearchId || !bridge?.selectConversationProjectFolder) {
      setProjectContextError('Project folders can be attached in the installed Bob desktop app.');
      return;
    }
    setProjectContextBusy(true);
    setProjectContextError('');
    try {
      const result = await bridge.selectConversationProjectFolder(activeResearchId);
      if (result?.canceled) return;
      if (!result?.ok) throw new Error(result?.error || 'Could not attach that folder.');
      await refreshProjectContext();
      setProjectMenuOpen(false);
    } catch (error: any) {
      setProjectContextError(error?.message || 'Could not attach that folder.');
    } finally {
      setProjectContextBusy(false);
    }
  };

  const attachGitHubProject = async () => {
    const bridge = typeof window !== 'undefined' ? (window as any).bob : null;
    if (!activeResearchId || !bridge?.attachGitHubRepository) {
      setProjectContextError('GitHub project access is available in the installed Bob desktop app.');
      return;
    }
    if (!githubUrl.trim()) {
      setProjectContextError('Paste a GitHub repository URL first.');
      return;
    }
    setProjectContextBusy(true);
    setProjectContextError('');
    try {
      const result = await bridge.attachGitHubRepository(activeResearchId, { url: githubUrl.trim(), token: githubToken.trim() });
      if (!result?.ok) throw new Error(result?.error || 'Could not connect that repository.');
      setGithubToken('');
      await refreshProjectContext();
      setProjectMenuOpen(false);
    } catch (error: any) {
      setProjectContextError(error?.message || 'Could not connect that repository.');
    } finally {
      setProjectContextBusy(false);
    }
  };

  const disconnectProjectSource = async (source: 'local' | 'github') => {
    const bridge = typeof window !== 'undefined' ? (window as any).bob : null;
    if (!activeResearchId) return;
    setProjectContextBusy(true);
    setProjectContextError('');
    try {
      if (source === 'local') await bridge?.disconnectConversationProjectFolder?.(activeResearchId);
      else await bridge?.disconnectGitHubRepository?.(activeResearchId);
      await refreshProjectContext();
    } catch (error: any) {
      setProjectContextError(error?.message || 'Could not disconnect project context.');
    } finally {
      setProjectContextBusy(false);
    }
  };


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
        className={`fixed z-20 bottom-5 transform -translate-x-1/2 relative bg-[var(--s)] border border-[#d8d8d1] dark:border-[#3b3129] rounded-[23px] shadow-[0_20px_55px_rgba(0,0,0,0.12)] p-2.5 transition-all duration-300 ease-out ${
          isSidebarClosed
            ? isExpanded ? 'left-1/2 w-[min(800px,calc(100vw-70px))]' : 'left-1/2 w-[min(480px,calc(100vw-60px))]'
            : isExpanded ? 'left-[calc(275px+(100vw-275px)/2)] w-[min(800px,calc(100vw-275px-70px))]' : 'left-[calc(275px+(100vw-275px)/2)] w-[min(500px,calc(100vw-275px-60px))]'
        }`}
      >
        {isVoiceActive && voiceMode === 'prompt' && (
          <VoiceWaveform height={22} className="px-2 pb-1 opacity-80" />
        )}

        {projectContext.connected && (
          <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
            {projectContext.local?.connected && <span className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff2c4] dark:bg-[#403512] text-[#705400] dark:text-[#f5d76a] text-[10.5px] font-semibold"><FolderOpen className="w-3 h-3 shrink-0" /><span className="truncate max-w-[180px]">{projectContext.local.rootName}</span><button type="button" onClick={() => void disconnectProjectSource('local')} title="Remove folder from this chat"><X className="w-3 h-3" /></button></span>}
            {projectContext.github?.connected && <span className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--s2)] text-[var(--t)] text-[10.5px] font-semibold"><Github className="w-3 h-3 shrink-0" /><span className="truncate max-w-[180px]">{projectContext.github.owner}/{projectContext.github.repo}</span><button type="button" onClick={() => void disconnectProjectSource('github')} title="Remove GitHub repository from this chat"><X className="w-3 h-3" /></button></span>}
          </div>
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
          {/* Add files */}
          <button
            onClick={() => { setProjectMenuOpen((open) => !open); setProjectContextError(''); }}
            title="Add context or files"
            aria-label="Add context or files"
            aria-expanded={projectMenuOpen}
            className={`w-8 h-8 rounded-full grid place-items-center transition-colors cursor-pointer ${projectMenuOpen ? 'bg-[var(--ys)] text-[var(--t)]' : 'hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'}`}
          >
            <Plus className="w-4 h-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </button>

          {projectMenuOpen && (
            <div className="absolute bottom-[calc(100%+12px)] left-2 z-50 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-[var(--line)] bg-[var(--s)] shadow-[0_16px_48px_rgba(0,0,0,0.18)] p-3 space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-150">
              <div className="flex items-center justify-between gap-2 px-1">
                <div>
                  <p className="text-[13px] font-bold text-[var(--t)] m-0">Add to this chat</p>
                  <p className="text-[10.5px] text-[var(--m)] mt-0.5 m-0">Optional · read-only project context</p>
                </div>
                <button type="button" onClick={() => setProjectMenuOpen(false)} aria-label="Close add context menu" className="w-7 h-7 rounded-full grid place-items-center hover:bg-[var(--s2)] text-[var(--m)]"><X className="w-3.5 h-3.5" /></button>
              </div>

              <button type="button" onClick={() => void attachLocalProject()} disabled={projectContextBusy}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--line)] hover:bg-[var(--s2)] text-left disabled:opacity-50">
                <span className="w-9 h-9 rounded-xl bg-[#fff1bd] text-[#765700] grid place-items-center shrink-0"><FolderOpen className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold text-[var(--t)]">{projectContext.local?.connected ? 'Change project folder' : 'Add project folder'}</span>
                  <span className="block text-[10.5px] text-[var(--m)] mt-0.5">Choose a local directory for this conversation</span>
                </span>
              </button>

              <div className="rounded-xl border border-[var(--line)] p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-[var(--t)]" />
                  <span className="text-[12px] font-semibold text-[var(--t)]">{projectContext.github?.connected ? 'GitHub repository attached' : 'Add GitHub repository'}</span>
                </div>
                <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)}
                  placeholder="https://github.com/owner/repository"
                  aria-label="GitHub repository URL"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--s2)] text-[11.5px] text-[var(--t)] outline-none focus:ring-2 focus:ring-[#f5c842]/40" />
                <input value={githubToken} onChange={(event) => setGithubToken(event.target.value)}
                  type="password" autoComplete="off"
                  placeholder={projectContext.hasGitHubToken ? 'Read-only token saved securely (optional)' : 'Fine-grained read-only token (optional)'}
                  aria-label="GitHub read-only access token"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--s2)] text-[11.5px] text-[var(--t)] outline-none focus:ring-2 focus:ring-[#f5c842]/40" />
                <p className="text-[10px] leading-relaxed text-[var(--m)] m-0">Use a fine-grained token limited to this repository with Contents: Read-only. Bob stores it encrypted with your operating system’s secure storage. Public repositories work without a token.</p>
                {projectContext.hasGitHubToken && (
                  <button type="button" onClick={async () => {
                    try {
                      await (window as any).bob?.clearGitHubToken?.();
                      await refreshProjectContext();
                      setProjectContextError('');
                    } catch { setProjectContextError('Could not remove the saved GitHub token.'); }
                  }} className="text-[10px] font-semibold text-red-600 hover:underline">Forget saved GitHub token</button>
                )}
                <div className="flex items-center justify-between gap-2">
                  {projectContext.github?.connected ? (
                    <button type="button" onClick={() => void disconnectProjectSource('github')} disabled={projectContextBusy} className="text-[10.5px] font-semibold text-red-600 hover:underline">Disconnect repository</button>
                  ) : <span className="text-[10px] text-[var(--m)] flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Read-only</span>}
                  <button type="button" onClick={() => void attachGitHubProject()} disabled={projectContextBusy || !githubUrl.trim()}
                    className="px-3 py-2 rounded-lg bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[10.5px] font-bold disabled:opacity-40">
                    {projectContextBusy ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              </div>

              {projectContext.local?.connected && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--s2)]">
                  <FolderOpen className="w-3.5 h-3.5 text-[#b58b00] shrink-0" />
                  <span className="text-[10.5px] text-[var(--t)] flex-1 truncate">Folder: {projectContext.local.rootName}</span>
                  <button type="button" onClick={() => void disconnectProjectSource('local')} disabled={projectContextBusy} className="text-[10px] font-semibold text-red-600">Remove</button>
                </div>
              )}
              {projectContext.github?.connected && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--s2)]">
                  <Github className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10.5px] text-[var(--t)] flex-1 truncate">{projectContext.github.owner}/{projectContext.github.repo} · {projectContext.github.branch || 'default branch'}</span>
                </div>
              )}
              {projectContextError && <p role="alert" className="text-[10.5px] text-red-600 m-0">{projectContextError}</p>}
              <button type="button" onClick={() => { setProjectMenuOpen(false); setIsAddFilesOpen(true); }} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[11px] text-[var(--m)] hover:bg-[var(--s2)]">
                <Link2 className="w-3.5 h-3.5" /> Attach files instead
              </button>
            </div>
          )}

          {/* Context bridge — same action as extension bridge */}
          <button
            onClick={() => {
              setIsBridgeOpen?.(true);
              openChromeBridge?.();
            }}
            title="Bridge browser context"
            className="w-8 h-8 rounded-full hover:bg-[var(--s2)] grid place-items-center text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
          >
            <Cable className="w-4 h-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </button>

          {/* Tools menu */}
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

          {/* Send */}
          <button
            onClick={() => handleSend()}
            disabled={!prompt.trim() || isAiGenerating}
            title="Send"
            className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] grid place-items-center hover:opacity-90 active:scale-95 transition-all shadow-xs disabled:opacity-30 cursor-pointer"
          >
            <CircleArrowUp className="w-4 h-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </div>
      </div>
    </>
  );
};
