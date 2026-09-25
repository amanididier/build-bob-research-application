import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../BobAvatar';
import { BobLogo } from '../BobLogo';
import { 
  ArrowRight, 
  Check, 
  Sparkles, 
  Bookmark, 
  BookOpen, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  ArrowDown
} from 'lucide-react';

export const OnboardingFlow: React.FC = () => {
  const { 
    isOnboardingOpen, 
    finishOnboarding, 
    userName, 
    setUserName, 
    openChromeBridge 
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [localName, setLocalName] = useState<string>(userName || 'Amani');
  const [prepProgress, setPrepProgress] = useState<number>(20);
  const [aiEngineReady, setAiEngineReady] = useState<boolean>(true);
  const [researchToolsReady, setResearchToolsReady] = useState<boolean>(false);
  const [localMemoryReady, setLocalMemoryReady] = useState<boolean>(false);
  const [chromeBridgeReady, setChromeBridgeReady] = useState<boolean>(false);

  // Animate the tool preparation step when user enters step 6
  useEffect(() => {
    if (step === 6) {
      setPrepProgress(25);
      const timer1 = setTimeout(() => {
        setResearchToolsReady(true);
        setPrepProgress(50);
      }, 700);

      const timer2 = setTimeout(() => {
        setLocalMemoryReady(true);
        setPrepProgress(75);
      }, 1400);

      const timer3 = setTimeout(() => {
        setChromeBridgeReady(true);
        setPrepProgress(100);
      }, 2100);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [step]);

  if (!isOnboardingOpen) return null;

  const handleNextStep = () => {
    if (step === 2) {
      if (localName.trim()) {
        setUserName(localName.trim());
      }
    }
    if (step < 7) {
      setStep(prev => prev + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleSkipOrFinish = () => {
    finishOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[560px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-3xl p-8 relative flex flex-col justify-between min-h-[480px]">
        {/* Step Indicator dots */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-[var(--y)]'
                    : s < step
                    ? 'w-2 bg-[var(--y)]/60'
                    : 'w-2 bg-[var(--line)]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkipOrFinish}
            className="text-[12px] font-semibold text-[var(--m)] hover:text-[var(--t)] transition-colors"
          >
            Skip to Dashboard
          </button>
        </div>

        {/* STEP 1: HELLO */}
        {step === 1 && (
          <div className="my-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <div className="p-3 bg-[var(--s2)] rounded-3xl border border-[var(--line)] shadow-lg inline-block">
                <BobLogo size={76} shape="rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--t)]">
                Hi. I'm Bob.
              </h1>
              <p className="text-[15px] text-[var(--m)] max-w-[380px] mx-auto leading-relaxed">
                I'm your AI companion for focused research, evidence synthesis, and deep work.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: NAME */}
        {step === 2 && (
          <div className="my-auto space-y-6 text-center animate-in fade-in duration-200">
            <div className="flex justify-center">
              <BobAvatar size={52} />
            </div>
            <div className="space-y-2">
              <h2 className="text-[24px] font-extrabold tracking-tight text-[var(--t)]">
                What should I call you?
              </h2>
              <p className="text-[13px] text-[var(--m)] max-w-[340px] mx-auto">
                I personalize suggestions, memory summaries, and research briefs to your flow.
              </p>
            </div>
            <div className="max-w-[320px] mx-auto">
              <input
                type="text"
                autoFocus
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                placeholder="Your name"
                className="w-full h-12 text-center text-[16px] font-semibold rounded-2xl bg-[var(--s2)] border border-[var(--line)] focus:border-[var(--y)] focus:ring-2 focus:ring-[var(--y)]/20 outline-none text-[var(--t)] transition-all"
              />
            </div>
          </div>
        )}

        {/* STEP 3: WHAT BOB DOES */}
        {step === 3 && (
          <div className="my-auto space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Research without losing the thread.
              </h2>
              <p className="text-[13px] text-[var(--m)]">
                Bob is built to replace messy bookmarks with real structured knowledge.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--y)]/15 text-[var(--y)] grid place-items-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div className="text-[13px] font-bold text-[var(--t)]">Research tabs</div>
                <div className="text-[11px] text-[var(--m)] leading-snug">
                  Never lose where an insight came from.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--b)]/15 text-[var(--b)] grid place-items-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="text-[13px] font-bold text-[var(--t)]">Highlights & Notes</div>
                <div className="text-[11px] text-[var(--m)] leading-snug">
                  Preserve exact passages as living evidence.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/15 text-[#8b5cf6] grid place-items-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-[13px] font-bold text-[var(--t)]">AI conversations</div>
                <div className="text-[11px] text-[var(--m)] leading-snug">
                  Ask questions grounded in your selected tabs.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--g)]/15 text-[var(--g)] grid place-items-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-[13px] font-bold text-[var(--t)]">Executive summaries</div>
                <div className="text-[11px] text-[var(--m)] leading-snug">
                  Turn hours of reading into a 1-page brief.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RESEARCH PIPELINE */}
        {step === 4 && (
          <div className="my-auto space-y-6 text-center animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Bob keeps your research connected.
              </h2>
              <p className="text-[13px] text-[var(--m)] max-w-[360px] mx-auto">
                Every thought travels through a continuous, verified loop instead of disappearing into a tab graveyard.
              </p>
            </div>

            {/* Pipeline flowchart */}
            <div className="py-2 flex items-center justify-center gap-2 max-w-[460px] mx-auto overflow-x-auto">
              {[
                { label: 'Tabs', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                { label: 'Highlights', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                { label: 'Notes', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                { label: 'Summary', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                { label: 'Brief', color: 'bg-[var(--y)]/20 text-[#995a21] dark:text-[#fcd34d]' },
              ].map((item, idx, arr) => (
                <React.Fragment key={item.label}>
                  <div className={`px-2.5 py-2 rounded-xl text-[12px] font-bold border border-[var(--line)] ${item.color}`}>
                    {item.label}
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--m)] flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="p-3 bg-[var(--s2)] rounded-2xl border border-[var(--line)] text-[12px] text-[var(--m)] max-w-[420px] mx-auto text-left flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[var(--y)] flex-shrink-0 mt-0.5" />
              <span>
                When you draft summaries or ask questions, Bob cites your collected evidence rather than hallucinating generic answers.
              </span>
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

            {/* Visual simulation of Chrome Side Panel */}
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

        {/* STEP 6: PREPARING BOB */}
        {step === 6 && (
          <div className="my-auto space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)]">
                Preparing Bob
              </h2>
              <p className="text-[13px] text-[var(--m)]">
                Initializing your local workspace and research engines...
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5 max-w-[360px] mx-auto">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-[var(--y)]" />
                  <span>AI engine</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[var(--g)]" />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[var(--b)]" />
                  <span>Research tools</span>
                </div>
                {researchToolsReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)] animate-in zoom-in-75" />
                ) : (
                  <span className="text-[11px] text-[var(--m)] font-mono">setting up...</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Local memory</span>
                </div>
                {localMemoryReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)] animate-in zoom-in-75" />
                ) : (
                  <span className="text-[11px] text-[var(--m)] font-mono">allocating...</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] font-semibold text-[var(--t)]">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[var(--y)]" />
                  <span>Chrome extension bridge</span>
                </div>
                {chromeBridgeReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--g)] animate-in zoom-in-75" />
                ) : (
                  <span className="text-[11px] text-[var(--m)] font-mono">listening...</span>
                )}
              </div>
            </div>

            {/* Smooth progress bar */}
            <div className="max-w-[360px] mx-auto space-y-1">
              <div className="h-2 w-full bg-[var(--s2)] rounded-full overflow-hidden border border-[var(--line)]">
                <div 
                  className="h-full bg-[var(--y)] transition-all duration-500 rounded-full"
                  style={{ width: `${prepProgress}%` }}
                />
              </div>
              <div className="text-right text-[10.5px] font-mono text-[var(--m)]">
                {prepProgress}% ready
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
                Your workspace is configured. You can start a new research session, capture evidence, or connect Bob to Chrome anytime.
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
              onClick={() => setStep(prev => prev - 1)}
              className="text-[13px] font-semibold text-[var(--m)] hover:text-[var(--t)] px-3 py-1.5 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNextStep}
            disabled={step === 6 && prepProgress < 100}
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
