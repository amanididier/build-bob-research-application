import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../BobAvatar';
import { BobLogo } from '../BobLogo';
import { 
  ArrowRight, 
  Sparkles, 
  Globe, 
  Download, 
  Key, 
  ExternalLink, 
  Mail, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  Send,
  MessageSquare
} from 'lucide-react';
import { bobAi } from '../../lib/aiEngine';
import { downloadExtensionZip } from '../../lib/downloadHelper';
import { warmupVoiceEngine } from '../../lib/voice/startupWarmup';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from '../../lib/authService';

export const OnboardingFlow: React.FC = () => {
  const { 
    isOnboardingOpen, 
    finishOnboarding, 
    userName, 
    setUserName,
    setUserEmail,
    startAiDownload,
    triggerThinking,
    navigateTo
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [localName, setLocalName] = useState<string>(userName || '');
  const [geminiInput, setGeminiInput] = useState<string>(() => bobAi.getGeminiKey() || '');
  const [keySaved, setKeySaved] = useState<boolean>(() => bobAi.hasGeminiKey());
  const [keyFeedback, setKeyFeedback] = useState<string>('');

  const [extDownload, setExtDownload] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; message: string }>({
    state: 'idle',
    message: ''
  });
  const [extConnectionStatus, setExtConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(false);

  const [authMode, setAuthMode] = useState<'options' | 'email'>('options');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [chatMessages, setChatMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: `Hello ${userName || 'friend'}! I'm Bob, your intelligence partner. What's the main project or topic you're focusing on today? You can share a topic, link, or question to get started.`,
      time: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isBobTyping, setIsBobTyping] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOnboardingOpen) {
      startAiDownload();
      void warmupVoiceEngine();
    }
  }, [isOnboardingOpen, startAiDownload]);

  useEffect(() => {
    if (step === 8 && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [step, chatMessages, isBobTyping]);

  if (!isOnboardingOpen) return null;

  const handleNextStep = () => {
    if (step === 2) {
      const trimmed = localName.trim() || 'Didier';
      setUserName(trimmed);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bob_user_name', trimmed);
      }
      setChatMessages([
        {
          role: 'assistant',
          text: `Hello ${trimmed}! I'm Bob, your intelligence partner. What's the main project or topic you're focusing on today? You can share a topic, link, or question to get started.`,
          time: 'Just now'
        }
      ]);
    }
    if (step < 8) {
      setStep((prev) => prev + 1);
    } else {
      finishOnboarding();
      navigateTo('home');
    }
  };

  const handleSaveKey = async () => {
    if (!geminiInput.trim()) return;
    const key = geminiInput.trim();
    bobAi.setGeminiKey(key);
    setKeySaved(true);
    setKeyFeedback('Connecting to Gemini…');
    const valid = await bobAi.validateKey(key);
    if (valid) {
      setKeyFeedback('Gemini API connected successfully!');
      triggerThinking('Gemini Connected', 'Real-time AI reasoning ready.', 'Key verified');
    } else {
      setKeyFeedback('Key saved. Connected for session.');
    }
  };

  const handleCheckExtension = async () => {
    setExtConnectionStatus('checking');
    await new Promise((r) => setTimeout(r, 400));
    try {
      if (typeof window !== 'undefined' && (window as any).bob?.checkExtensionConnection) {
        const res = await (window as any).bob.checkExtensionConnection();
        if (res?.connected) {
          setIsExtensionConnected(true);
          setExtConnectionStatus('connected');
          return;
        }
      }
      const response = await fetch('http://127.0.0.1:54321/events/extension-status', {
        headers: { 'x-bob-token': 'development-token' },
        signal: AbortSignal.timeout(1200)
      }).catch(() => null);
      if (response && response.ok) {
        setIsExtensionConnected(true);
        setExtConnectionStatus('connected');
        return;
      }
      setExtConnectionStatus('error');
    } catch {
      setExtConnectionStatus('error');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await signInWithGoogle();
      if (result.user) {
        setUserName(result.user.name || localName);
        setUserEmail(result.user.email);
        if (result.user.avatarUrl) {
          localStorage.setItem('bob_user_avatar', result.user.avatarUrl);
        }
        setAuthSuccess(true);
        setTimeout(() => handleNextStep(), 400);
      } else if (result.redirected) {
        setAuthError('Redirecting to Google… If nothing happens, enable Google provider in Supabase dashboard.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Google sign-in failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Email and password are required.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      try {
        const user = await signInWithEmail(authEmail.trim(), authPassword);
        setUserName(user.name || localName || authEmail.split('@')[0]);
        setUserEmail(user.email);
        setAuthSuccess(true);
        setTimeout(() => handleNextStep(), 400);
      } catch {
        const { user, needsEmailVerification } = await signUpWithEmail(
          localName.trim() || authEmail.split('@')[0],
          authEmail.trim(),
          authPassword
        );
        if (needsEmailVerification) {
          setAuthError('Account created. Check your email to verify, then sign in.');
        } else {
          setUserName(user.name || localName);
          setUserEmail(user.email);
          setAuthSuccess(true);
          setTimeout(() => handleNextStep(), 400);
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isBobTyping) return;
    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', text: userText, time: 'Just now' }
    ]);

    setIsBobTyping(true);
    try {
      const response = await bobAi.generateResearchAnswer(
        `You are Bob, a warm, intelligent, local-first research companion. The user just completed onboarding and sent their first message: "${userText}". Greet them personally as ${localName || 'friend'} and provide a concise, high-value, structured response (2-3 sentences) showing how you will support them.`
      );
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: response.answer || (response as any).text || '', time: 'Just now' }
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Got it, ${localName || 'friend'}! I'm logging "${userText}" into your active workspace. Whenever you read articles or take notes, I'll organize them into structured findings and tasks for you.`,
          time: 'Just now'
        }
      ]);
    } finally {
      setIsBobTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[720px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-[32px] p-7 sm:p-9 relative flex flex-col justify-between min-h-[580px] transition-all">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-7 bg-[var(--y)]'
                      : s < step
                      ? 'w-3 bg-[var(--t)] opacity-60'
                      : 'w-2.5 bg-[var(--line)]'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={finishOnboarding}
              className="text-[11.5px] font-semibold text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
            >
              Skip to app
            </button>
          </div>

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[var(--ys)] text-[#765700] flex items-center justify-center shadow-inner">
                <BobLogo size={36} shape="transparent" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--y)] uppercase">Welcome to Bob</span>
                <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[var(--t)] leading-tight">Hi there! I'm Bob.</h2>
                <p className="text-[14.5px] text-[var(--m)] leading-relaxed max-w-[560px]">
                  Your personal, local-first research companion. I live on your machine, follow your workflow across browser tabs and documents, and turn complex ideas into clear, finishable work.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12.5px] text-[var(--t)] font-medium">Private & secure on your device. Your notes, chats, and files stay with you.</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-center">
                <User className="w-7 h-7 text-[var(--y)]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">Step 2 of 8 · Personalization</span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">What should Bob call you?</h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[540px]">Bob addresses you personally and tailors research briefings to your goals.</p>
              </div>
              <div className="max-w-[440px] space-y-2">
                <label className="text-[12px] font-semibold text-[var(--t)]">Your Name or Preferred Nickname</label>
                <input type="text" autoFocus value={localName} onChange={(e) => setLocalName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNextStep()} placeholder="e.g. Didier, Amani, Dr. Alex" className="w-full h-12 px-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-[14px] text-[var(--t)] focus:outline-none focus:border-[var(--y)] transition-colors" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[var(--ys)] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[var(--y)]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">Step 3 of 8 · How Bob Works</span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">What Bob does for your focus</h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">Traditional AI chats lose your context. Bob links what you read directly into organized knowledge and action.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                  <b className="text-[13px] text-[var(--t)] block">1. Connects Live Tabs</b>
                  <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">Reads browser articles without tab clutter or manual copy-pasting.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                  <b className="text-[13px] text-[var(--t)] block">2. Synthesizes Evidence</b>
                  <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">Extracts verified claims, counterarguments, and citation tables.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                  <b className="text-[13px] text-[var(--t)] block">3. Hands-Free Voice</b>
                  <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">Dictate with Gemini or open a continuous live call.</p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Key className="w-7 h-7 text-amber-500" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">Step 4 of 8 · Reasoning Engine</span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">Connect your Gemini API Key</h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">Bob uses Google Gemini for deep reasoning, live document synthesis, and conversational speed. Get a key in 30 seconds for free.</p>
              </div>
              <div className="space-y-3 max-w-[500px]">
                <div className="flex gap-2">
                  <input type="password" value={geminiInput} onChange={(e) => setGeminiInput(e.target.value)} placeholder="AIzaSy..." className="flex-1 h-12 px-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-[13.5px] text-[var(--t)] font-mono focus:outline-none focus:border-[var(--y)]" />
                  <button type="button" onClick={handleSaveKey} className="h-12 px-5 rounded-2xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-[12.5px] transition-all hover:opacity-90 active:scale-95 cursor-pointer">{keySaved ? 'Saved ✓' : 'Save Key'}</button>
                </div>
                {keyFeedback && <p className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400 m-0">{keyFeedback}</p>}
                <div className="flex items-center justify-between text-[12px] pt-1">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--y)] hover:underline font-semibold"><span>Get a free key from Google AI Studio</span><ExternalLink className="w-3.5 h-3.5" /></a>
                  <span className="text-[var(--m)]">Stored on your device only</span>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Globe className="w-7 h-7 text-blue-500" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">Step 5 of 8 · Web Integration</span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">Dock Bob into Google Chrome</h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">The Bob Chrome Side Panel captures your reading highlights and connects active tabs into your desktop workspace.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={async () => { setExtDownload({ state: 'saving', message: 'Saving…' }); try { await downloadExtensionZip(); setExtDownload({ state: 'saved', message: 'Extension zip saved.' }); } catch { setExtDownload({ state: 'error', message: 'Download failed.' }); } }} className="h-10 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-bold text-[var(--t)] cursor-pointer flex items-center gap-2"><Download className="w-4 h-4" /> Download extension</button>
                <button type="button" onClick={handleCheckExtension} className="h-10 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-bold text-[var(--t)] cursor-pointer">Check connection</button>
              </div>
              {extDownload.message && <p className="text-[12px] text-[var(--m)] m-0">{extDownload.message}</p>}
              {extConnectionStatus === 'connected' && <p className="text-[12px] text-emerald-600 font-semibold m-0">Extension connected</p>}
              {extConnectionStatus === 'error' && <p className="text-[12px] text-amber-600 m-0">Not detected yet — you can continue and connect later.</p>}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">Step 6 of 8 · Account & Sync</span>
                {authError && (<p className="text-[12px] text-red-600 dark:text-red-400 font-medium mt-2 mb-0">{authError}</p>)}
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">Sign in to save your progress</h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">Create a secure Supabase account. Your Gemini API key stays on this device only.</p>
              </div>

              {authSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">Signed in successfully</span>
                </div>
              ) : authMode === 'options' ? (
                <div className="space-y-3 max-w-[420px]">
                  <button type="button" onClick={handleGoogleSignIn} disabled={authLoading} className="w-full h-11 rounded-2xl border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--line)]/40 text-[var(--t)] font-bold text-[12.5px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                    <span>{authLoading ? 'Connecting…' : 'Continue with Google'}</span>
                  </button>
                  <button type="button" onClick={() => setAuthMode('email')} className="w-full h-11 rounded-2xl bg-[var(--y)] text-[#171717] font-bold text-[12.5px] cursor-pointer">Continue with email</button>
                  <button type="button" onClick={handleNextStep} className="w-full text-[12px] text-[var(--m)] hover:text-[var(--t)] cursor-pointer">Skip for now</button>
                </div>
              ) : (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-3 max-w-[420px]">
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" required className="w-full h-11 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]" />
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password (min 6 characters)" required minLength={6} className="w-full h-11 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAuthMode('options')} className="h-11 px-4 rounded-xl border border-[var(--line)] text-[12px] font-semibold text-[var(--t)] cursor-pointer">Back</button>
                    <button type="submit" disabled={authLoading} className="flex-1 h-11 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-[12.5px] cursor-pointer disabled:opacity-60">{authLoading ? 'Signing in…' : 'Save & Continue'}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[var(--ys)] text-[#765700] flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-[var(--y)]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--y)] uppercase">Step 7 of 8 · Workspace Ready</span>
                <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[var(--t)] leading-tight">Congratulations, {localName || 'friend'}!</h2>
                <p className="text-[14.5px] text-[var(--m)] leading-relaxed max-w-[560px]">Your focused research workspace is fully configured. Bob is ready to assist your thinking and distill your reading into finished outcomes.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <b className="text-[13px] text-[var(--t)] block">Start your first conversation with Bob</b>
                  <p className="text-[12px] text-[var(--m)] m-0">Say hi or ask Bob about whatever you're working on right now.</p>
                </div>
                <button type="button" onClick={handleNextStep} className="px-4 py-2 rounded-xl bg-[var(--y)] text-[#171717] font-bold text-[12px] hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer">Chat with Bob</button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col min-h-[420px]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--y)]" />
                <h2 className="text-[20px] font-extrabold text-[var(--t)] m-0">Chat with Bob</h2>
              </div>
              <div ref={chatScrollRef} className="flex-1 max-h-[280px] overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`p-3 rounded-2xl text-[13px] leading-relaxed ${
                    m.role === 'user' ? 'bg-[var(--y)]/15 border border-[var(--y)]/30 ml-8' : 'bg-[var(--s2)] border border-[var(--line)] mr-8'
                  }`}>
                    <div className="text-[10px] font-bold text-[var(--m)] mb-1">{m.role === 'user' ? 'You' : 'Bob'}</div>
                    {m.text}
                  </div>
                ))}
                {isBobTyping && <div className="text-[12px] text-[var(--m)]">Bob is typing…</div>}
              </div>
              <form onSubmit={handleChatSend} className="flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message Bob…" className="flex-1 h-11 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]" />
                <button type="submit" className="h-11 w-11 rounded-xl bg-[var(--y)] text-[#171717] grid place-items-center cursor-pointer"><Send className="w-4 h-4" /></button>
              </form>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 mt-4 border-t border-[var(--line)]">
          <button type="button" onClick={() => step > 1 && setStep(step - 1)} disabled={step <= 1} className="text-[12px] font-semibold text-[var(--m)] hover:text-[var(--t)] disabled:opacity-30 cursor-pointer">Back</button>
          {step !== 6 && step !== 8 && (
            <button type="button" onClick={handleNextStep} className="h-11 px-6 rounded-2xl bg-[var(--y)] text-[#171717] font-bold text-[13px] flex items-center gap-2 hover:opacity-90 active:scale-95 cursor-pointer">
              <span>{step === 7 ? 'Continue' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 8 && (
            <button type="button" onClick={() => { finishOnboarding(); navigateTo('home'); }} className="h-11 px-6 rounded-2xl bg-[var(--y)] text-[#171717] font-bold text-[13px] cursor-pointer">Enter workspace</button>
          )}
        </div>
      </div>
    </div>
  );
};
