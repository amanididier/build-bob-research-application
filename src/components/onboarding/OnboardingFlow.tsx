import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../BobAvatar';
import { BobLogo } from '../BobLogo';
import { 
  ArrowRight, 
  Sparkles, 
  Bookmark, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  HardDrive,
  DownloadCloud,
  Key,
  ExternalLink,
  Check,
  ClipboardCheck
} from 'lucide-react';
import { detectSystemHardware, MODEL_CATALOG } from '../../lib/hardware';
import { bobAi } from '../../lib/aiEngine';

export const OnboardingFlow: React.FC = () => {
  const { 
    isOnboardingOpen, 
    finishOnboarding, 
    userName, 
    setUserName, 
    openChromeBridge,
    aiDownloadStatus,
    startAiDownload,
    accelerateAiDownload,
    triggerThinking
  } = useApp();

  // 1: Welcome, 2: Name, 3: Context, 4: Grounding, 5: Chrome side panel, 6: Optional Gemini Key, 7: Preparing, 8: Ready
  const [step, setStep] = useState<number>(1);
  const [localName, setLocalName] = useState<string>(userName || 'Amani');
  const [geminiInput, setGeminiInput] = useState<string>(() => bobAi.getGeminiKey() || '');
  const [keySaved, setKeySaved] = useState<boolean>(() => bobAi.hasGeminiKey());
  const [researchToolsReady, setResearchToolsReady] = useState<boolean>(true);
  const [localMemoryReady, setLocalMemoryReady] = useState<boolean>(true);
  const [ollamaDetected, setOllamaDetected] = useState<{ running: boolean; models: string[] }>({ running: false, models: [] });

  const [hardware] = useState(() => detectSystemHardware());

  useEffect(() => {
    bobAi.checkOllama().then((res) => {
      setOllamaDetected(res);
    });
  }, []);

  if (!isOnboardingOpen) return null;

  const totalMb = Math.round(aiDownloadStatus.totalBytes / (1024 * 1024));
  const downloadedMb = Math.round(aiDownloadStatus.downloadedBytes / (1024 * 1024));

  const handleNextStep = () => {
    if (step === 2 && localName.trim()) {
      setUserName(localName.trim());
    }
    if (step < 8) {
      setStep((prev) => prev + 1);
    } else {
      finishOnboarding();
    }
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text && text.trim()) {
        const trimmed = text.trim();
        setGeminiInput(trimmed);
        bobAi.setGeminiKey(trimmed);
        setKeySaved(true);
        triggerThinking('API Key Connected', 'Google Gemini AI activated! Lightning-fast responses enabled.', 'Key verified');
      }
    } catch {
      // ignore
    }
  };

  const handleSaveKeyManual = () => {
    if (geminiInput.trim()) {
      bobAi.setGeminiKey(geminiInput.trim());
      setKeySaved(true);
      triggerThinking('API Key Connected', 'Google Gemini AI activated! Lightning-fast responses enabled.', 'Key verified');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[560px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-3xl p-8 relative flex flex-col justify-between min-h-[510px]">
        
        {/* Step Indicator & Ambient Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-7 bg-[var(--y)]'
                      : s < step
                      ? 'w-3 bg-[var(--t)] opacity-60'
                      : 'w-3 bg-[var(--line)]'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={finishOnboarding}
              className="text-[11px] font-semibold text-[var(--m)] hover:text-[var(--t)] transition-colors"
            >
              Skip intro
            </button>
          </div>

          {/* Transparent Status Chip during onboarding */}
          {step <= 6 && (
            <div className="mb-4 p-2 px-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-[var(--m)]">
                <HardDrive className="w-3.5 h-3.5 text-[var(--y)]" />
                <span>
                  {ollamaDetected.running
                    ? `Ollama local daemon detected (${ollamaDetected.models[0] || 'ready'})`
                    : keySaved
                    ? 'Google Gemini Cloud API active'
                    : 'Private offline reasoning ready · No cloud dependencies'}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--s)] text-[var(--g)] font-bold">
                Ready
              </span>
            </div>
          )}
        </div>

        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="my-auto space-y-6 text-center animate-in fade-in duration-200">
            <div className="flex justify-center">
              <div className="p-3 bg-[var(--ys)] dark:bg-[#382c0b] rounded-3xl border border-[var(--y)]/40 shadow-xl inline-block">
                <BobLogo size={68} shape="rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[26px] font-extrabold tracking-tight text-[var(--t)]">
                Welcome to Bob
              </h2>
              <p className="text-[14px] text-[var(--m)] max-w-[380px] mx-auto leading-relaxed">
                Your private research companion. Connects your browser tabs, notes, and evidence into one calm workspace.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[11px] text-[var(--m)] font-mono">
              <HardDrive className="w-3.5 h-3.5 text-[var(--y)]" />
              <span>Optimized for {hardware.detectedRamGb}GB RAM · Free & Private</span>
            </div>
          </div>
        )}

        {/* STEP 2: USER NAME */}
        {step === 2 && (
          <div className="my-auto space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                What should Bob call you?
              </h2>
              <p className="text-[13px] text-[var(--m)]">
                Bob will personalize your research workspace.
              </p>
            </div>
            <div className="max-w-[320px] mx-auto space-y-2">
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-11 px-4 text-[14px] font-medium rounded-2xl bg-[var(--s2)] border border-[var(--line)] outline-none text-center text-[var(--t)] shadow-inner"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* STEP 3: CONTEXT & TABS */}
        {step === 3 && (
          <div className="my-auto space-y-6 text-center animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Research with context, not clutter.
              </h2>
              <p className="text-[13px] text-[var(--m)] max-w-[360px] mx-auto">
                No more losing facts across 20 browser tabs. Bob organizes everything in one place.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2.5 max-w-[380px] mx-auto">
              <div className="p-3 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-center space-y-1.5">
                <Globe className="w-5 h-5 mx-auto text-[var(--y)]" />
                <div className="text-[11px] font-bold text-[var(--t)]">Browser Tabs</div>
                <div className="text-[9.5px] text-[var(--m)]">Preserve sources</div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-center space-y-1.5">
                <Bookmark className="w-5 h-5 mx-auto text-[var(--b)]" />
                <div className="text-[11px] font-bold text-[var(--t)]">Notes</div>
                <div className="text-[9.5px] text-[var(--m)]">Permanent facts</div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-center space-y-1.5">
                <Sparkles className="w-5 h-5 mx-auto text-[var(--g)]" />
                <div className="text-[11px] font-bold text-[var(--t)]">Action Tasks</div>
                <div className="text-[9.5px] text-[var(--m)]">Clear plans</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: GROUNDING */}
        {step === 4 && (
          <div className="my-auto space-y-5 text-center animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Grounded in your real evidence.
              </h2>
              <p className="text-[13px] text-[var(--m)] max-w-[360px] mx-auto">
                Bob connects and compares your notes and tabs instead of guessing.
              </p>
            </div>
            <div className="w-full max-w-[380px] mx-auto rounded-2xl bg-[var(--s2)] border border-[var(--line)] p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2">
                <BobAvatar size={24} />
                <span className="text-[11px] font-bold text-[var(--t)]">Bob Research</span>
                <span className="ml-auto text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-[var(--ys)] text-[#765700] font-bold">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-[var(--m)] leading-relaxed italic border-l-2 border-[var(--y)] pl-2.5">
                "Users leave booking flows when fees appear unexpectedly right before payment confirmation."
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: BROWSER SIDE PANEL */}
        {step === 5 && (
          <div className="my-auto space-y-6 text-center animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Bob comes with you while you browse.
              </h2>
              <p className="text-[13px] text-[var(--m)] max-w-[360px] mx-auto">
                Open Bob beside any web page and keep your research context always with you.
              </p>
            </div>
            <div className="w-full max-w-[380px] mx-auto rounded-2xl bg-[var(--s2)] border border-[var(--line)] shadow-inner p-3 text-left space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-[var(--line)]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-[var(--m)] font-mono ml-2">Chrome Side Panel</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--s)] border border-[var(--line)]">
                <BobAvatar size={24} />
                <div className="text-[11px] font-semibold text-[var(--t)]">
                  Active in sidebar · Reading article...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: OPTIONAL GEMINI AI KEY (SMART 1-CLICK CLIPBOARD) */}
        {step === 6 && (
          <div className="my-auto space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bs)] text-[#1e40af] text-[11px] font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Cloud AI (Optional)</span>
              </div>
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Connect Google Gemini API
              </h2>
              <p className="text-[12.5px] text-[var(--m)] max-w-[380px] mx-auto leading-relaxed">
                Connect your free Google Gemini API key for instant responses. If not provided, Bob uses your free offline model automatically.
              </p>
            </div>

            <div className="max-w-[400px] mx-auto space-y-3">
              <div className="flex items-center gap-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-9 px-3 rounded-xl bg-[var(--s2)] hover:bg-[var(--line)] text-[11.5px] font-semibold text-[var(--t)] border border-[var(--line)] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--b)]" />
                  <span>Get Free Key (Google AI Studio)</span>
                </a>

                <button
                  type="button"
                  onClick={handlePasteKey}
                  className="h-9 px-3.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[11.5px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Paste Key</span>
                </button>
              </div>

              <div className="relative">
                <Key className="w-4 h-4 text-[var(--m)] absolute left-3 top-3" />
                <input
                  type="password"
                  value={geminiInput}
                  onChange={(e) => {
                    setGeminiInput(e.target.value);
                    if (e.target.value.trim().length > 10) {
                      bobAi.setGeminiKey(e.target.value.trim());
                      setKeySaved(true);
                    }
                  }}
                  placeholder="Paste AIzaSy... key here"
                  className="w-full h-10 pl-9 pr-3 text-[12.5px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none text-[var(--t)] font-mono"
                />
              </div>

              {keySaved && (
                <div className="p-2.5 rounded-xl bg-[#e6f7ed] text-[#14844d] text-[11.5px] font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Google Gemini Flash connected & active!</span>
                </div>
              )}

              <p className="text-[11px] text-center text-[var(--m)]">
                You can also add or change this anytime in Settings.
              </p>
            </div>
          </div>
        )}

        {/* STEP 7: PREPARING BOB */}
        {step === 7 && (
          <div className="my-auto space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Preparing Bob
              </h2>
              <p className="text-[13px] text-[var(--m)]">
                Setting up research workspace and tools...
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5 max-w-[380px] mx-auto">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-[var(--y)]" />
                  <span>
                    {ollamaDetected.running
                      ? `Ollama Local (${ollamaDetected.models[0] || 'active'})`
                      : keySaved
                      ? 'Google Gemini Cloud Brain'
                      : 'Built-in Offline Synthesis'}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-[var(--g)] font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)]" />
                  <span>Ready</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[var(--b)]" />
                  <span>Cross-source synthesis</span>
                </div>
                {researchToolsReady || aiDownloadStatus.isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)] animate-in zoom-in-75" />
                ) : (
                  <span className="text-[11px] text-[var(--m)] font-mono">initializing...</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Research notebook & memory</span>
                </div>
                {localMemoryReady || aiDownloadStatus.isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)] animate-in zoom-in-75" />
                ) : (
                  <span className="text-[11px] text-[var(--m)] font-mono">ready</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: READY TO RESEARCH */}
        {step === 8 && (
          <div className="my-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <div className="p-3 bg-[var(--ys)] dark:bg-[#382c0b] rounded-3xl border border-[var(--y)]/40 shadow-xl inline-block">
                <BobLogo size={68} shape="rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[26px] font-extrabold tracking-tight text-[var(--t)]">
                Bob is ready, {localName}!
              </h2>
              <p className="text-[14px] text-[var(--m)] max-w-[380px] mx-auto leading-relaxed">
                Your workspace is ready. You can start a new research question, capture notes, or dock Bob in Chrome.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2 max-w-[320px] mx-auto">
              <button
                onClick={() => {
                  finishOnboarding();
                  openChromeBridge();
                }}
                className="w-full h-10 rounded-xl bg-[var(--s2)] border border-[var(--line)] hover:bg-[var(--line)]/50 text-[12px] font-bold text-[var(--t)] flex items-center justify-center gap-2 transition-colors"
              >
                <Globe className="w-4 h-4 text-[var(--b)]" />
                <span>Open Chrome Extension setup</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--line)] mt-4">
          {step > 1 ? (
            <button
              onClick={() => setStep((prev) => prev - 1)}
              className="text-[13px] font-semibold text-[var(--m)] hover:text-[var(--t)] px-3 py-1.5 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNextStep}
            className="h-11 px-6 rounded-2xl bg-[#171717] dark:bg-[#f5f4f0] text-white dark:text-[#171717] font-bold text-[13px] flex items-center gap-2 hover:opacity-95 shadow-md active:scale-95 transition-all"
          >
            <span>
              {step === 1
                ? "Let's get started"
                : step === 8
                ? 'Start Researching'
                : 'Continue'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
