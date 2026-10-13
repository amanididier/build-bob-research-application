import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Sun, 
  Moon, 
  Compass, 
  Sparkles, 
  Check, 
  CheckCircle2,
  Send
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  PageModel, 
  FactCardLayout, 
  OptionRowsLayout, 
  SegmentedChoiceLayout, 
  ChipSelectLayout, 
  SliderValueLayout, 
  TextInputComponent, 
  DropzoneOptionalLayout, 
  TimelineEstimateLayout, 
  StepListLayout 
} from './RoadmapLayouts';

// Standard 5 sticker sets and fallback art
const STICKER_SETS = ['construction', 'kitchen', 'holiday', 'launch', 'garden'];

export const RoadmapSheet: React.FC = () => {
  const { userName, triggerThinking } = useApp();
  const [open, setOpen] = useState(false);
  const [goalQuery, setGoalQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  // Theme support: Dark theme by default (#0E0D0B), Paper/Light theme toggle (#FBF8F2)
  const [themeMode, setThemeMode] = useState<'dark' | 'paper'>(() => {
    return (localStorage.getItem('bob_roadmap_theme') as 'dark' | 'paper') || 'dark';
  });

  // Active sticker set (saved or rotating)
  const [stickerSet, setStickerSet] = useState<string>(() => {
    return localStorage.getItem('bob_roadmap_sticker_set') || 'construction';
  });

  // User input answers stored per page_id
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [customText, setCustomText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);

  const isDark = themeMode === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'paper' : 'dark';
    setThemeMode(next);
    localStorage.setItem('bob_roadmap_theme', next);
  };

  useEffect(() => {
    const onOpen = (e: any) => {
      setOpen(true);
      setPageIndex(0);
      const query = e?.detail?.title || '';
      setGoalQuery(query);
      setAnswers({});
      setCustomText('');
      setUploadedFile(null);

      // Rotate or pick sticker set based on query
      const q = query.toLowerCase();
      let pickedSet = 'construction';
      if (/cook|bake|recipe|meal|food|kitchen/.test(q)) pickedSet = 'kitchen';
      else if (/travel|trip|holiday|vacation|tour/.test(q)) pickedSet = 'holiday';
      else if (/launch|ship|deploy|rocket|market/.test(q)) pickedSet = 'launch';
      else if (/garden|plant|nature|grow|habit/.test(q)) pickedSet = 'garden';
      setStickerSet(pickedSet);
    };

    window.addEventListener('bob-open-roadmap', onOpen);
    return () => window.removeEventListener('bob-open-roadmap', onOpen);
  }, []);

  // Build the multi-turn Page Sequence following the Build Guide v2 schema
  const pages: PageModel[] = useMemo(() => {
    const name = userName || 'Researcher';
    const goalTitle = goalQuery || 'your upcoming project';
    const totalSteps = 7;

    return [
      // Page 1: Hook (Fact Card)
      {
        page_id: 'hook',
        role: 'question',
        progress: { step: 1, of: totalSteps },
        eyebrow: 'YOUR SIGNAL',
        title: `${name}, focused roadmaps finish 4× faster.`,
        subtitle: 'A clear finish line saves weeks of aimless browsing.',
        layout: 'fact_card',
        fact: { number: '4×', sentence: 'Researchers who lock a single deliverable before researching finish in under 3 weeks.' },
        primary: { label: 'Get Started', action: 'next' },
        skip: { label: 'Skip overview' },
        sticker: { set: stickerSet, stage: 1 }
      },

      // Page 2: Goal (Option Rows)
      {
        page_id: 'goal',
        role: 'question',
        progress: { step: 2, of: totalSteps },
        eyebrow: 'YOUR GOAL',
        title: `${name}, what are you actually building?`,
        subtitle: 'One line is enough. We will tighten the finish line next.',
        layout: 'option_rows',
        options: [
          { value: 'app', label: 'A digital product or software feature', sublabel: 'Web app, mobile experience, or API' },
          { value: 'study', label: 'A research synthesis or market study', sublabel: 'Analysis with evidence, citations & tables' },
          { value: 'culinary', label: 'A culinary recipe or craft project', sublabel: 'Cooking technique, physical build or art' },
          { value: 'other', label: 'Something else...', reveals_input: true }
        ],
        primary: { label: 'Continue', action: 'next' },
        sticker: { set: stickerSet, stage: 2 }
      },

      // Page 3: Time Budget (Segmented Choice)
      {
        page_id: 'time_budget',
        role: 'question',
        progress: { step: 3, of: totalSteps },
        eyebrow: 'YOUR TIME',
        title: 'How much focused time can you give this each week?',
        subtitle: 'Pacing determines whether we recommend 2-week sprints or deep passes.',
        layout: 'segmented_choice',
        options: [
          { value: '3h', label: 'A few hours (2 - 4h)' },
          { value: '10h', label: 'Steady rhythm (5 - 12h)' },
          { value: '20h', label: 'Full immersion (15h+)' }
        ],
        primary: { label: 'Continue', action: 'next' },
        sticker: { set: stickerSet, stage: 2 }
      },

      // Page 4: Tools (Chip Select)
      {
        page_id: 'tools',
        role: 'question',
        progress: { step: 4, of: totalSteps },
        eyebrow: 'YOUR WORKBENCH',
        title: 'Select the primary tools you want on your bench:',
        subtitle: 'Pick the essential stack. Extra tools are how an afternoon disappears.',
        layout: 'chip_select',
        chips: [
          { value: 'chatgpt', label: 'ChatGPT Reasoning' },
          { value: 'claude', label: 'Claude Code Terminal' },
          { value: 'notes', label: 'Bob Research Notes' },
          { value: 'browser', label: 'Selected Browser Tabs' },
          { value: 'timer', label: 'Pomodoro / Timer' },
          { value: 'sheets', label: 'Data Sheets & Tables' },
          { value: 'git', label: 'Git & Terminal' }
        ],
        primary: { label: 'Confirm Tools', action: 'next' },
        sticker: { set: stickerSet, stage: 3 }
      },

      // Page 5: Optional Materials (Dropzone Optional)
      {
        page_id: 'materials',
        role: 'question',
        progress: { step: 5, of: totalSteps },
        eyebrow: 'REFERENCE MATERIALS',
        title: 'Have notes, a brief, or resume to anchor this?',
        subtitle: 'Optional. Bob extracts quotes and facts to tailor your roadmap steps.',
        layout: 'dropzone_optional',
        primary: { label: 'Continue', action: 'next' },
        skip: { label: 'I do not have one yet' },
        sticker: null
      },

      // Page 6: Reveal Timeline (Timeline Estimate - YOUR PATH)
      {
        page_id: 'reveal',
        role: 'reveal',
        progress: { step: 6, of: totalSteps },
        eyebrow: 'YOUR PATH',
        title: `${name}, your roadmap can reach completion in 3 to 5 weeks.`,
        subtitle: 'Here is how your phases sequence together before we generate execution steps.',
        layout: 'timeline_estimate',
        phases: ['Clarify', 'Structure', 'Execute', 'Ship'],
        current_phase: 0,
        estimate: {
          range: '3 to 5 weeks',
          basis: 'Based on 6 focused hours per week, verified tools, and zero dependency bloat.'
        },
        primary: { label: 'Generate Actionable Roadmap', action: 'next' },
        sticker: { set: stickerSet, stage: 4 }
      },

      // Page 7: The Roadmap (Step List)
      {
        page_id: 'roadmap_view',
        role: 'roadmap',
        progress: { step: 7, of: totalSteps },
        eyebrow: 'YOUR ROADMAP',
        title: 'Step-by-Step Action Roadmap',
        subtitle: 'Small, reliable momentum. Click ChatGPT to open any prompt directly.',
        layout: 'step_list',
        roadmap_phases: [
          {
            phase: 'Clarify & Evidence',
            steps: [
              {
                title: 'Lock one-sentence finish line',
                why: 'If you cannot say who uses it, subsequent engineering will wander.',
                tools: ['Bob Notes', 'ChatGPT'],
                status: 'done'
              },
              {
                title: 'Review 3 verified primary sources',
                why: 'Extract core quotes first to avoid assumptions.',
                tools: ['Selected Tabs', 'Notes'],
                status: 'todo'
              }
            ]
          },
          {
            phase: 'Structure & Prototyping',
            steps: [
              {
                title: 'Define data contracts & type signatures',
                why: 'Clean interfaces prevent refactoring downstream.',
                tools: ['Claude Code', 'TypeScript'],
                status: 'todo'
              },
              {
                title: 'Assemble core UI component & layouts',
                why: 'Build the lightest interactive version that proves the concept.',
                tools: ['Vite', 'React'],
                status: 'todo'
              }
            ]
          },
          {
            phase: 'Ship & Verification',
            steps: [
              {
                title: 'Run test validation & build verification',
                why: 'Confirm zero build warnings and verified runtime.',
                tools: ['Terminal', 'Git'],
                status: 'todo'
              }
            ]
          }
        ],
        primary: { label: 'Save & Close Roadmap', action: 'submit' },
        sticker: { set: stickerSet, stage: 5 }
      }
    ];
  }, [userName, goalQuery, stickerSet]);

  if (!open) return null;

  const currentPage = pages[pageIndex] || pages[0];
  const isLast = pageIndex === pages.length - 1;

  // Dynamic progress calculation for the top bar
  const progressRatio = (currentPage.progress.step) / currentPage.progress.of;
  const progressPercent = Math.round(progressRatio * 100);

  // Top Bar Color Changing Stages:
  // 0% - 40%: Warm Gold (#F5B82E)
  // 41% - 80%: Sky Teal (#2DBFB0 / #0EA5E9)
  // 81% - 100%: Vibrant Emerald (#10B981)
  const getProgressStyles = (ratio: number) => {
    if (ratio >= 0.85) {
      return {
        barBg: 'bg-emerald-500',
        textAccent: 'text-emerald-500',
        glow: 'rgba(16, 185, 129, 0.45)',
        badgeBg: isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    }
    if (ratio >= 0.45) {
      return {
        barBg: 'bg-[#2DBFB0]',
        textAccent: 'text-[#2DBFB0]',
        glow: 'rgba(45, 191, 176, 0.45)',
        badgeBg: isDark ? 'bg-[#2DBFB0]/15 text-[#2DBFB0] border-[#2DBFB0]/30' : 'bg-teal-50 text-teal-800 border-teal-200'
      };
    }
    return {
      barBg: 'bg-[var(--accent,#F5B82E)]',
      textAccent: 'text-[var(--accent,#F5B82E)]',
      glow: 'rgba(245, 184, 46, 0.45)',
      badgeBg: isDark ? 'bg-[var(--accent,#F5B82E)]/15 text-[var(--accent,#F5B82E)] border-[var(--accent,#F5B82E)]/30' : 'bg-amber-50 text-amber-800 border-amber-200'
    };
  };

  const progressStyle = getProgressStyles(progressRatio);

  const handleNext = () => {
    if (isLast) {
      // Save roadmap to local storage and exit
      const record = {
        title: goalQuery || 'My Roadmap',
        answers,
        completedAt: Date.now()
      };
      try {
        const prev = JSON.parse(localStorage.getItem('bob_roadmaps_v1') || '[]');
        localStorage.setItem('bob_roadmaps_v1', JSON.stringify([record, ...prev].slice(0, 15)));
      } catch {}
      setOpen(false);
      triggerThinking('Roadmap Saved', 'Your roadmap is stored in this workspace.', 'Saved');
    } else {
      setPageIndex((p) => Math.min(p + 1, pages.length - 1));
    }
  };

  const handleBack = () => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    } else {
      setOpen(false);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleSendToChatGPT = (title: string, why: string) => {
    const prompt = `Help me structure this roadmap step for my project "${goalQuery || 'my project'}":\nStep: ${title}\nRationale: ${why}\nProvide 3 concrete execution actions.`;
    const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Sticker path: /assets/stickers/{set}/{stage}.svg
  const stickerStage = currentPage.sticker?.stage || 1;
  const stickerPath = `/assets/stickers/${stickerSet}/${stickerStage}.svg`;

  return (
    <div 
      className={`fixed inset-0 z-[70] backdrop-blur-md flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-200 ${
        isDark ? 'bg-black/80 text-[#F4EFE6]' : 'bg-[#1F1A14]/40 text-[#1F1A14]'
      }`}
    >
      {/* Full-Page Centered Column (480px to 560px on desktop) */}
      <div 
        className={`w-full max-w-[620px] h-[94vh] max-h-[820px] rounded-[24px] border flex flex-col shadow-2xl overflow-hidden transition-colors duration-300 relative ${
          isDark 
            ? 'bg-[#0E0D0B] border-[#2A2620]' 
            : 'bg-[#FBF8F2] border-[#E7E0D3]'
        }`}
      >
        {/* TOP BAR: back chevron, wordmark, thin progress line across width, step count at right, theme toggle */}
        <header className={`px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${isDark ? 'border-[#2A2620] bg-[#14120e]' : 'border-[#E7E0D3] bg-[#faf8f2]'}`}>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark 
                  ? 'border-[#2A2620] hover:bg-[#1E1B15] text-[#8A8175] hover:text-white' 
                  : 'border-[#E7E0D3] hover:bg-white text-[#6B6358] hover:text-[#171717]'
              }`}
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span className={`text-[12px] font-mono font-bold tracking-tight uppercase ${isDark ? 'text-white' : 'text-[#1F1A14]'}`}>
              bob.
            </span>
          </div>

          {/* Dynamic Color Changing Progress Line */}
          <div className="flex-1 max-w-[240px] mx-2">
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-[#2A2620]' : 'bg-[#E7E0D3]'}`}>
              <div
                className={`h-full rounded-full ${progressStyle.barBg} transition-all duration-500 ease-out`}
                style={{
                  width: `${progressPercent}%`,
                  boxShadow: `0 0 8px ${progressStyle.glow}`
                }}
              />
            </div>
          </div>

          {/* Step Count at Right & Theme Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
              STEP {String(currentPage.progress.step).padStart(2, '0')} / {String(currentPage.progress.of).padStart(2, '0')}
            </span>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDark 
                  ? 'border-[#2A2620] bg-[#17150F] text-amber-400 hover:bg-[#201d16]' 
                  : 'border-[#E7E0D3] bg-white text-neutral-700 hover:bg-[#f6f2e8]'
              }`}
              title={`Switch to ${isDark ? 'Paper Light' : 'Dark'} mode`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark 
                  ? 'border-[#2A2620] text-[#8A8175] hover:text-white' 
                  : 'border-[#E7E0D3] text-[#6B6358] hover:text-[#171717]'
              }`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MAIN BODY: 1 Centred Column (480 to 560px), Eyebrow, Headline, Helper Line, Sticker */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6">
          <div className="max-w-[520px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Header Block with Eyebrow and Sticker */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <span className={`text-[11px] font-mono uppercase tracking-[0.15em] font-extrabold ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  {currentPage.eyebrow}
                </span>
                <h1 className={`text-[24px] sm:text-[28px] font-mono font-bold leading-tight tracking-[-0.03em] m-0 ${isDark ? 'text-[#F4EFE6]' : 'text-[#1F1A14]'}`}>
                  {currentPage.title}
                </h1>
                {currentPage.subtitle && (
                  <p className={`text-[13.5px] leading-relaxed m-0 ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                    {currentPage.subtitle}
                  </p>
                )}
              </div>

              {/* High Quality Bundled Sticker (Loaded from assets/stickers/{set}/{stage}.svg) */}
              {currentPage.sticker && (
                <div className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden p-0.5 animate-in zoom-in-95 duration-200" title={`Sticker Stage ${stickerStage}`}>
                  <img
                    src={stickerPath}
                    alt={`${stickerSet} stage ${stickerStage}`}
                    className="w-full h-full object-contain filter drop-shadow-sm select-none"
                    onError={(e) => {
                      // Fallback if SVG fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Dynamic Layout Rendering based on Page Model */}
            <div className="pt-2">
              {currentPage.layout === 'fact_card' && (
                <FactCardLayout
                  fact={currentPage.fact}
                  subtitle={currentPage.subtitle}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'option_rows' && (
                <OptionRowsLayout
                  options={currentPage.options}
                  value={answers[currentPage.page_id] || currentPage.options?.[0]?.value || ''}
                  customText={customText}
                  onChange={(val) => setAnswers({ ...answers, [currentPage.page_id]: val })}
                  onCustomTextChange={(txt) => setCustomText(txt)}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'segmented_choice' && (
                <SegmentedChoiceLayout
                  options={currentPage.options}
                  value={answers[currentPage.page_id] || currentPage.options?.[1]?.value || ''}
                  onChange={(val) => setAnswers({ ...answers, [currentPage.page_id]: val })}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'chip_select' && (
                <ChipSelectLayout
                  chips={currentPage.chips}
                  selectedValues={answers[currentPage.page_id] || ['chatgpt', 'notes']}
                  onChange={(vals) => setAnswers({ ...answers, [currentPage.page_id]: vals })}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'slider_value' && (
                <SliderValueLayout
                  slider={currentPage.slider}
                  value={answers[currentPage.page_id] ?? 10}
                  onChange={(val) => setAnswers({ ...answers, [currentPage.page_id]: val })}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'text_input' && (
                <TextInputComponent
                  value={answers[currentPage.page_id] || ''}
                  placeholder="Describe your goal..."
                  onChange={(val) => setAnswers({ ...answers, [currentPage.page_id]: val })}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'dropzone_optional' && (
                <DropzoneOptionalLayout
                  fileInfo={uploadedFile}
                  onFileSelect={(name, size) => setUploadedFile({ name, size })}
                  onSkipUpload={handleSkip}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'timeline_estimate' && (
                <TimelineEstimateLayout
                  phases={currentPage.phases}
                  current_phase={currentPage.current_phase}
                  estimate={currentPage.estimate}
                  isDark={isDark}
                />
              )}

              {currentPage.layout === 'step_list' && (
                <StepListLayout
                  phases={currentPage.roadmap_phases}
                  onSendToChatGPT={handleSendToChatGPT}
                  isDark={isDark}
                />
              )}
            </div>

          </div>
        </div>

        {/* FIXED FOOTER: Skip as text link on left, primary button on right. Same place on every page. */}
        <footer className={`px-6 sm:px-10 py-4 border-t flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-[#2A2620] bg-[#14120e]' : 'border-[#E7E0D3] bg-[#faf8f2]'}`}>
          <div>
            {currentPage.skip ? (
              <button
                type="button"
                onClick={handleSkip}
                className={`text-[13px] font-semibold transition-colors cursor-pointer ${
                  isDark ? 'text-[#8A8175] hover:text-white' : 'text-[#6B6358] hover:text-[#171717]'
                }`}
              >
                {currentPage.skip.label || 'Skip'}
              </button>
            ) : (
              <div />
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="h-11 px-6 rounded-[10px] bg-[var(--accent,#F5B82E)] hover:bg-[#e2a825] text-[#17150F] font-bold text-[13px] flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <span>{currentPage.primary.label}</span>
            {isLast ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </footer>

      </div>
    </div>
  );
};
