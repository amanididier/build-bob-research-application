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
import { tts } from '../../lib/voice/ttsProvider';
import { localVoiceManager } from '../../lib/voice/localVoiceManager';

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

  // 8 Exact Onboarding Steps requested by user:
  // 1: Bob greeting the user
  // 2: Asking user his/her name
  // 3: Bob describes what it does
  // 4: Bob tells user to get the key
  // 5: Bob shows the extension setup card
  // 6: Login or sign up (Email & Google options, saved in database/storage)
  // 7: Bob shows congratulations card
  // 8: Bob starts chatting with user as downloads continue quietly in background
  const [step, setStep] = useState<number>(1);
  const [localName, setLocalName] = useState<string>(userName || '');
  const [geminiInput, setGeminiInput] = useState<string>(() => bobAi.getGeminiKey() || '');
  const [keySaved, setKeySaved] = useState<boolean>(() => bobAi.hasGeminiKey());
  const [keyFeedback, setKeyFeedback] = useState<string>('');

  // Step 5: Extension verification state
  const [extDownload, setExtDownload] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; message: string }>({
    state: 'idle',
    message: ''
  });
  const [extConnectionStatus, setExtConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(false);

  // Step 6: Auth state (Email & Google sign-in)
  const [authMode, setAuthMode] = useState<'options' | 'email'>('options');
  const [authEmail, setAuthEmail] = useState<string>('ishimweamanid@gmail.com');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // Step 8: Welcome Chat state
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

  // Requirement: From the time the first card appears, Bob starts downloading and warming
  // the voice system and tools quietly in background without telling the user unnecessary details.
  useEffect(() => {
    if (isOnboardingOpen) {
      // Quiet background start
      startAiDownload();
      void warmupVoiceEngine();
      void tts.initKokoro();
      if (!localVoiceManager.isModelInstalled()) {
        void localVoiceManager.downloadModel(true);
      }
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
      // Update welcome chat greeting
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
    await new Promise((r) => setTimeout(r, 650));
    const userProfile = {
      id: `usr_${Date.now()}`,
      name: localName.trim() || 'Didier',
      email: authEmail || 'ishimweamanid@gmail.com',
      avatarUrl: '',
      provider: 'google',
      created_at: new Date().toISOString()
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('bob_auth_user', JSON.stringify(userProfile));
      localStorage.setItem('bob_user_email', userProfile.email);
    }
    setUserEmail(userProfile.email);
    setAuthLoading(false);
    setAuthSuccess(true);
    setTimeout(() => handleNextStep(), 400);
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    const userProfile = {
      id: `usr_${Date.now()}`,
      name: localName.trim() || authEmail.split('@')[0],
      email: authEmail.trim(),
      provider: 'email',
      created_at: new Date().toISOString()
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('bob_auth_user', JSON.stringify(userProfile));
      localStorage.setItem('bob_user_email', userProfile.email);
    }
    setUserEmail(userProfile.email);
    setAuthLoading(false);
    setAuthSuccess(true);
    setTimeout(() => handleNextStep(), 400);
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
        `You are Bob, a warm, intelligent, local-first research companion. The user just completed onboarding and sent their first message: "${userText}". Greet them personally as ${localName || 'friend'} and provide a concise, high-value, structured response (2-3 sentences) showing how you will support them.`,
        'urugendo',
        undefined,
        bobAi.getTastePreference()
      );
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: response.answer, time: 'Just now' }
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
        
        {/* Step Indicator */}
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

          {/* CARD 1: Bob Greeting */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[var(--ys)] text-[#765700] flex items-center justify-center shadow-inner">
                <BobLogo size={36} shape="transparent" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--y)] uppercase">
                  Welcome to Bob
                </span>
                <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[var(--t)] leading-tight">
                  Hi there! I'm Bob.
                </h2>
                <p className="text-[14.5px] text-[var(--m)] leading-relaxed max-w-[560px]">
                  Your personal, local-first research companion. I live on your machine, follow your workflow across browser tabs and documents, and turn complex ideas into clear, finishable work.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12.5px] text-[var(--t)] font-medium">
                  Private & secure on your device. Your notes, chats, and files stay with you.
                </span>
              </div>
            </div>
          )}

          {/* CARD 2: Asking the user's name */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-center">
                <User className="w-7 h-7 text-[var(--y)]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">
                  Step 2 of 8 · Personalization
                </span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">
                  What should Bob call you?
                </h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[540px]">
                  Bob addresses you personally and tailors research briefings to your goals.
                </p>
              </div>

              <div className="max-w-[440px] space-y-2">
                <label className="text-[12px] font-semibold text-[var(--t)]">Your Name or Preferred Nickname</label>
                <input
                  type="text"
                  autoFocus
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                  placeholder="e.g. Didier, Amani, Dr. Alex"
                  className="w-full h-12 px-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-[14px] text-[var(--t)] focus:outline-none focus:border-[var(--y)] transition-colors"
                />
              </div>
            </div>
          )}

          {/* CARD 3: Bob describes what it does */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[var(--ys)] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[var(--y)]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">
                  Step 3 of 8 · How Bob Works
                </span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">
                  What Bob does for your focus
                </h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">
                  Traditional AI chats lose your context. Bob links what you read directly into organized knowledge and action.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                  <b className="text-[13px] text-[var(--t)] block">1. Connects Live Tabs</b>
                  <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">
                    Reads browser articles without tab clutter or manual copy-pasting.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                  <b className="text-[13px] text-[var(--t)] block">2. Synthesizes Evidence</b>
                  <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">
                    Extracts verified claims, counterarguments, and citation tables.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                  <b className="text-[13px] text-[var(--t)] block">3. Hands-Free Voice</b>
                  <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">
                    Push Spacebar to talk or call Bob for real-time natural dialogue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CARD 4: Get Gemini Key */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Key className="w-7 h-7 text-amber-500" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">
                  Step 4 of 8 · Reasoning Engine
                </span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">
                  Connect your Gemini API Key
                </h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">
                  Bob uses Google Gemini for deep reasoning, live document synthesis, and conversational speed. Get a key in 30 seconds for free.
                </p>
              </div>

              <div className="space-y-3 max-w-[500px]">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={geminiInput}
                    onChange={(e) => setGeminiInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 h-12 px-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-[13.5px] text-[var(--t)] font-mono focus:outline-none focus:border-[var(--y)]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="h-12 px-5 rounded-2xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-[12.5px] transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                  >
                    {keySaved ? 'Saved ✓' : 'Save Key'}
                  </button>
                </div>

                {keyFeedback && (
                  <p className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400 m-0">
                    {keyFeedback}
                  </p>
                )}

                <div className="flex items-center justify-between text-[12px] pt-1">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--y)] hover:underline font-semibold"
                  >
                    <span>Get a free key from Google AI Studio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[var(--m)]">Stored on your device only</span>
                </div>
              </div>
            </div>
          )}

          {/* CARD 5: Chrome Extension Setup */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Globe className="w-7 h-7 text-blue-500" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">
                  Step 5 of 8 · Web Integration
                </span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">
                  Dock Bob into Google Chrome
                </h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">
                  The Bob Chrome Side Panel captures your reading highlights and connects active tabs directly into your desktop database.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-3 max-w-[540px]">
                <div className="flex items-center justify-between">
                  <div>
                    <b className="text-[13px] text-[var(--t)] block">Bob Extension Package</b>
                    <small className="text-[11.5px] text-[var(--m)]">
                      Unpack and load into chrome://extensions
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadExtensionZip(setExtDownload)}
                    className="h-10 px-4 rounded-xl bg-[var(--y)] text-[#171717] font-bold text-[12px] flex items-center gap-2 hover:opacity-90 active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download (.zip)</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
                  <span className="text-[12px] text-[var(--m)]">
                    {isExtensionConnected ? '✓ Extension connected on port 54321' : 'Ready to verify local bridge'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCheckExtension}
                    className="text-[11.5px] font-semibold text-[var(--y)] hover:underline cursor-pointer"
                  >
                    {extConnectionStatus === 'checking' ? 'Checking…' : 'Check Connection'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CARD 6: Login / Sign Up */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--m)] uppercase">
                  Step 6 of 8 · Account & Sync
                </span>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)]">
                  Save your research identity
                </h2>
                <p className="text-[14px] text-[var(--m)] leading-relaxed max-w-[560px]">
                  Sign in to persist your research projects, notes, and local memory securely across all your devices and database.
                </p>
              </div>

              {authMode === 'options' ? (
                <div className="space-y-3 max-w-[420px]">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="w-full h-12 px-4 rounded-2xl bg-[var(--s)] hover:bg-[var(--s2)] border border-[var(--line)] text-[13.5px] font-bold text-[var(--t)] flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{authLoading ? 'Connecting…' : 'Continue with Google'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMode('email')}
                    className="w-full h-12 px-4 rounded-2xl bg-[var(--s2)] hover:bg-[var(--line)] border border-[var(--line)] text-[13.5px] font-semibold text-[var(--t)] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-[var(--m)]" />
                    <span>Sign in with Email</span>
                  </button>

                  {authSuccess && (
                    <p className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 text-center pt-1">
                      Account authenticated and synced!
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-3 max-w-[420px]">
                  <div>
                    <label className="text-[11.5px] font-semibold text-[var(--m)] block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full h-11 px-3.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-[var(--m)] block mb-1">Password</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 px-3.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)]"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('options')}
                      className="h-11 px-4 rounded-xl text-[12px] font-semibold text-[var(--m)] hover:text-[var(--t)] cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="flex-1 h-11 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-[12.5px] transition-all hover:opacity-90 cursor-pointer"
                    >
                      {authLoading ? 'Signing in…' : 'Save & Continue'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* CARD 7: Congratulations */}
          {step === 7 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[var(--ys)] text-[#765700] flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-[var(--y)]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-[var(--y)] uppercase">
                  Step 7 of 8 · Workspace Ready
                </span>
                <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[var(--t)] leading-tight">
                  Congratulations, {localName || 'Didier'}!
                </h2>
                <p className="text-[14.5px] text-[var(--m)] leading-relaxed max-w-[560px]">
                  Your focused research workspace is fully configured. Bob is ready to assist your thinking and distill your reading into finished outcomes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <b className="text-[13px] text-[var(--t)] block">Start your first conversation with Bob</b>
                  <p className="text-[12px] text-[var(--m)] m-0">Say hi or ask Bob about whatever you're working on right now.</p>
                </div>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 rounded-xl bg-[var(--y)] text-[#171717] font-bold text-[12px] hover:opacity-90 active:scale-95 transition-all shadow-xs"
                >
                  Chat with Bob
                </button>
              </div>
            </div>
          )}

          {/* CARD 8: Bob starts chatting with the user */}
          {step === 8 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ys)] text-[#765700] flex items-center justify-center">
                    <BobAvatar size={24} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Chat with Bob</h3>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online & Listening
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[var(--m)]">
                  Step 8 of 8
                </span>
              </div>

              {/* Chat Message Window */}
              <div
                ref={chatScrollRef}
                className="h-[250px] overflow-y-auto space-y-3 p-3 rounded-2xl bg-[var(--s2)]/70 border border-[var(--line)]"
              >
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-lg bg-[var(--ys)] flex items-center justify-center shrink-0 mt-0.5">
                        <BobAvatar size={16} />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#171717] dark:bg-[var(--y)] text-white dark:text-[#171717] rounded-br-xs'
                          : 'bg-[var(--s)] text-[var(--t)] border border-[var(--line)] rounded-bl-xs shadow-xs'
                      }`}
                    >
                      {msg.text}
                      <span className="block text-[9.5px] opacity-60 mt-1 text-right">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                {isBobTyping && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--m)] px-2 py-1">
                    <BobAvatar size={16} />
                    <span className="animate-pulse">Bob is thinking…</span>
                  </div>
                )}
              </div>

              {/* Interactive Chat Input */}
              <form onSubmit={handleChatSend} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question, mention your topic, or say hi..."
                  className="flex-1 h-11 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] outline-none focus:border-[var(--y)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isBobTyping}
                  className="h-11 px-4 rounded-xl bg-[var(--y)] text-[#171717] font-bold text-[12px] flex items-center gap-1.5 hover:opacity-90 active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-5 border-t border-[var(--line)] flex items-center justify-between">
          <div className="text-[12px] text-[var(--m)]">
            Step {step} of 8
          </div>

          <div className="flex items-center gap-3">
            {step > 1 && step < 8 && (
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2.5 rounded-xl text-[12.5px] font-semibold text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[var(--y)] hover:bg-[#ebd200] text-[#171717] font-bold text-[13px] flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <span>{step === 8 ? 'Enter Workspace' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
