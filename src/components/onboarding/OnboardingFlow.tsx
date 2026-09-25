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
  ExternalLink,
  Layers,
  HardDrive,
  DownloadCloud
} from 'lucide-react';
import { detectSystemHardware, MODEL_CATALOG } from '../../lib/hardware';

export const OnboardingFlow: React.FC = () => {
  const { 
    isOnboardingOpen, 
    finishOnboarding, 
    userName, 
    setUserName, 
    openChromeBridge,
    aiDownloadStatus,
    startAiDownload,
    accelerateAiDownload
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [localName, setLocalName] = useState<string>(userName || 'Amani');
  const [researchToolsReady, setResearchToolsReady] = useState<boolean>(false);
  const [localMemoryReady, setLocalMemoryReady] = useState<boolean>(false);
  const [chromeBridgeReady, setChromeBridgeReady] = useState<boolean>(false);

  // Hardware profile
  const [hardware] = useState(() => detectSystemHardware());
  const modelProfile = MODEL_CATALOG[hardware.recommendedTier];

  // Kick off background download of offline tools & models when onboarding mounts
  useEffect(() => {
    if (isOnboardingOpen) {
      startAiDownload();
    }
  }, [isOnboardingOpen, startAiDownload]);

  // When user lands on step 6, accelerate and finalize the checklist
  useEffect(() => {
    if (step === 6) {
      accelerateAiDownload();
      const t1 = setTimeout(() => setResearchToolsReady(true), 1200);
      const t2 = setTimeout(() => setLocalMemoryReady(true), 2000);
      const t3 = setTimeout(() => setChromeBridgeReady(true), 2800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step, accelerateAiDownload]);

  if (!isOnboardingOpen) return null;

  const totalMb = Math.round(aiDownloadStatus.totalBytes / (1024 * 1024));
  const downloadedMb = Math.round(aiDownloadStatus.downloadedBytes / (1024 * 1024));

  const handleNextStep = () => {
    if (step === 2) {
      if (localName.trim()) {
        setUserName(localName.trim());
      }
    }
    if (step < 7) {
      setStep((prev) => prev + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleSkipOrFinish = () => {
    finishOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[560px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-3xl p-8 relative flex flex-col justify-between min-h-[500px]">
        
        {/* Step Indicator & Ambient Download Status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((s) => (
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
              onClick={handleSkipOrFinish}
              className="text-[11px] font-semibold text-[var(--m)] hover:text-[var(--t)] transition-colors"
            >
              Skip intro
            </button>
          </div>

          {/* Ambient persistent download bar throughout steps 1-5 */}
          {step <= 5 && (
            <div className="mb-4 p-2 rounded-xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-[var(--m)]">
                <DownloadCloud className={`w-3.5 h-3.5 ${aiDownloadStatus.isReady ? 'text-[var(--g)]' : 'text-[var(--y)] animate-pulse'}`} />
                <span className="font-medium">
                  {aiDownloadStatus.isReady ? (
                    <span className="text-[var(--g)] font-semibold">Offline research tools ready ({totalMb} MB)</span>
                  ) : (
                    <span>Preparing offline tools: <b>{aiDownloadStatus.progressPercent}%</b> ({downloadedMb}/{totalMb} MB)</span>
                  )}
                </span>
              </div>
              <div className="w-24 h-1.5 bg-[var(--line)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--y)] transition-all duration-300 rounded-full"
                  style={{ width: `${aiDownloadStatus.progressPercent}%` }}
                />
              </div>
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
                Your private research companion. Connects your browser tabs, notes, and local memory directly on your PC.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[11px] text-[var(--m)] font-mono">
              <HardDrive className="w-3.5 h-3.5 text-[var(--y)]" />
              <span>Detected {hardware.detectedRamGb}GB RAM · 100% Free On-Device Brain</span>
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
                Bob will personalize your research workspace and local notes.
              </p>
            </div>
            <div className="max-w-[320px] mx-auto space-y-2">
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-11 px-4 text-[14px] font-medium rounded-2xl bg-[var(--s2)] border border-[var(--line)] focus:border-[var(--y)] outline-none transition-all text-center text-[var(--t)] shadow-inner"
                autoFocus
              />
              <p className="text-[11px] text-center text-[var(--m)]">
                Everything is stored locally on this computer.
              </p>
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
                No more losing critical facts across 20 browser tabs. Bob organizes everything in one place.
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
                <div className="text-[11px] font-bold text-[var(--t)]">Local Notes</div>
                <div className="text-[9.5px] text-[var(--m)]">Permanent evidence</div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-center space-y-1.5">
                <Sparkles className="w-5 h-5 mx-auto text-[var(--g)]" />
                <div className="text-[11px] font-bold text-[var(--t)]">Auto Tasks</div>
                <div className="text-[9.5px] text-[var(--m)]">Actionable plans</div>
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
                Bob cites your notes and tabs instead of hallucinating answers.
              </p>
            </div>
            <div className="w-full max-w-[380px] mx-auto rounded-2xl bg-[var(--s2)] border border-[var(--line)] p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2">
                <BobAvatar size={24} />
                <span className="text-[11px] font-bold text-[var(--t)]">Bob Synthesis</span>
                <span className="ml-auto text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-[var(--ys)] text-[#765700] font-bold">
                  96% Match
                </span>
              </div>
              <p className="text-[11px] text-[var(--m)] leading-relaxed italic border-l-2 border-[var(--y)] pl-2.5">
                "Users leave booking flows when fees appear unexpectedly right before payment confirmation."
              </p>
              <div className="text-[9.5px] text-[#888] flex items-center gap-1">
                <span>Source:</span>
                <span className="font-mono underline truncate">research.example.com/transport-booking</span>
              </div>
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
              <div className="p-2 rounded-lg bg-[var(--s)]/70 text-[11px] text-[var(--m)] italic border border-[var(--line)]/50">
                "Highlight any sentence to instantly save a note or ask Bob."
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: PREPARING BOB & BACKGROUND TOOL DOWNLOAD */}
        {step === 6 && (
          <div className="my-auto space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Preparing Bob
              </h2>
              <p className="text-[13px] text-[var(--m)]">
                Configuring research tools for your {hardware.detectedRamGb}GB RAM PC...
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5 max-w-[380px] mx-auto">
              {/* Research Tools & Offline Engine */}
              <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] space-y-2">
                <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--t)]">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-[var(--y)]" />
                    <span>Research tools & offline engine</span>
                  </div>
                  {aiDownloadStatus.isReady ? (
                    <span className="flex items-center gap-1 text-[11px] text-[var(--g)] font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-[var(--g)]" />
                      <span>Ready ({totalMb} MB)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--y)] font-mono font-semibold">
                      {aiDownloadStatus.progressPercent}% ({downloadedMb}/{totalMb} MB)
                    </span>
                  )}
                </div>
                {/* Real download progress bar */}
                <div className="h-2 w-full bg-[var(--line)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--y)] transition-all duration-300 rounded-full"
                    style={{ width: `${aiDownloadStatus.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--m)] font-mono">
                  <span>Optimized for {hardware.detectedRamGb}GB RAM ({modelProfile.name.split(' ')[0]})</span>
                  <span>{aiDownloadStatus.isReady ? 'Cached locally' : `${aiDownloadStatus.downloadSpeedMbps} MB/s`}</span>
                </div>
              </div>

              {/* Research Workspace Tools */}
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

              {/* Local Memory Bank */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Local memory bank on PC</span>
                </div>
                {localMemoryReady || aiDownloadStatus.isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)] animate-in zoom-in-75" />
                ) : (
                  <span className="text-[11px] text-[var(--m)] font-mono">allocating...</span>
                )}
              </div>

              {/* Chrome Extension Bridge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[var(--y)]" />
                  <span>Chrome extension bridge</span>
                </div>
                {chromeBridgeReady || aiDownloadStatus.isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)] animate-in zoom-in-75" />
                ) : (
                  <span className="text-[11px] text-[var(--m)] font-mono">listening...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: READY TO RESEARCH */}
        {step === 7 && (
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
                Your offline research brain is configured for your computer. Everything stays private on your PC with zero token fees.
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
            disabled={step === 6 && !aiDownloadStatus.isReady && aiDownloadStatus.progressPercent < 90}
            className="h-11 px-6 rounded-2xl bg-[#171717] dark:bg-[#f5f4f0] text-white dark:text-[#171717] font-bold text-[13px] flex items-center gap-2 hover:opacity-95 shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            <span>
              {step === 1
                ? "Let's get started"
                : step === 7
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
