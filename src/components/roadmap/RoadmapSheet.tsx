import React, { useEffect, useMemo, useState } from 'react';
import { 
  Utensils, 
  Flame, 
  Sparkles, 
  ChefHat, 
  Wrench, 
  Code2, 
  Layers, 
  Compass, 
  BookOpen, 
  Search, 
  Target, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  Calendar,
  Clock,
  Send,
  ExternalLink,
  Plus,
  X,
  Award,
  Zap,
  BookmarkCheck,
  CheckCircle2
} from 'lucide-react';

export type Step = {
  kicker: string;
  title: string;
  body: string;
  sticker?: {
    badge: string;
    label: string;
    emoji?: string;
    bg: string;
    border: string;
    textColor: string;
    subtext?: string;
  };
  marks?: Array<{ label: string; icon?: React.ReactNode }>;
  field?: string;
  placeholder?: string;
};

export interface RoadmapDomain {
  category: string;
  icon: React.ReactNode;
  color: string;
  steps: Step[];
}

export function stepsFor(title: string): RoadmapDomain {
  const t = title.toLowerCase();
  
  // Cooking Domain
  if (/cook|recipe|meal|bake|kitchen|food|dinner|lunch|breakfast|stew|soup/.test(t)) {
    return {
      category: 'Cooking & Culinary Flow',
      icon: <ChefHat className="w-5 h-5 text-amber-500" />,
      color: '#f59e0b',
      steps: [
        { 
          kicker: 'Dish & Finish Line', 
          title: 'What dish are you cooking tonight?', 
          body: 'Name the plate in clear words. A recipe roadmap succeeds when the finish line is a hot plate, not an ambiguous mood.', 
          sticker: {
            badge: 'CHEF LEVEL 1',
            label: 'Mise en Place',
            emoji: '🍳',
            bg: 'bg-amber-500/10 dark:bg-amber-500/20',
            border: 'border-amber-500/40',
            textColor: 'text-amber-700 dark:text-amber-300',
            subtext: 'Preparation before heat'
          },
          marks: [
            { label: 'Chop Prep', icon: <Utensils className="w-3.5 h-3.5" /> },
            { label: 'Heat & Sauté', icon: <Flame className="w-3.5 h-3.5" /> },
            { label: 'Season & Taste', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { label: 'Plate & Serve', icon: <ChefHat className="w-3.5 h-3.5" /> },
          ],
          field: 'Dish & Serving target',
          placeholder: 'e.g. Sunday roasted chicken tagine with lemon couscous for four'
        },
        { 
          kicker: 'Done Criteria', 
          title: 'How will you know the dish succeeded?', 
          body: 'Specify the physical texture, golden crust, or reduction you can observe before turning off the fire. Skip vague adjectives.', 
          field: 'Done looks & tastes like',
          placeholder: 'e.g. Deep golden crust, tender center (75°C internal), reduced thick sauce'
        },
        { 
          kicker: 'Counter & Tools', 
          title: 'What tools must be on the counter?', 
          body: 'List only cookware and tools you have ready right now. Prepping tools before heat prevents scrambling mid-sauté.', 
          sticker: {
            badge: 'TOOLKIT',
            label: 'Ready Bench',
            emoji: '🔪',
            bg: 'bg-orange-500/10 dark:bg-orange-500/20',
            border: 'border-orange-500/40',
            textColor: 'text-orange-700 dark:text-orange-300',
            subtext: 'No mid-cook scramble'
          },
          marks: [
            { label: 'Chef Knife' },
            { label: 'Heavy Skillet' },
            { label: 'Tongs & Spatula' },
            { label: 'Timer & Board' },
          ], 
          field: 'Tools & pantry items on counter',
          placeholder: 'e.g. 12-inch heavy pan, tongs, wooden cutting board, kitchen timer'
        },
        { 
          kicker: 'Cooking Order', 
          title: 'Execute these in strict sequence.', 
          body: 'Mise en place before fire. Sear before braising. Rest the meat before carving. Taste and adjust acid right before serving.' 
        },
        { 
          kicker: 'First 20 Minutes', 
          title: 'What happens in the next 20 minutes?', 
          body: 'One concrete kitchen action right now to start momentum. Not the whole dinner menu.', 
          sticker: {
            badge: 'MOMENTUM',
            label: 'Heat Starts',
            emoji: '🔥',
            bg: 'bg-red-500/10 dark:bg-red-500/20',
            border: 'border-red-500/40',
            textColor: 'text-red-700 dark:text-red-300',
            subtext: 'First sitting active'
          },
          field: 'Immediate kitchen action',
          placeholder: 'e.g. Chop onions and garlic, preheat oven to 200°C'
        },
      ]
    };
  }
  
  // Software Building Domain
  if (/build|app|code|software|design|ship|make|desk|feature|bug|api|frontend|backend/.test(t)) {
    return {
      category: 'Software Engineering & Build',
      icon: <Code2 className="w-5 h-5 text-indigo-500" />,
      color: '#6366f1',
      steps: [
        { 
          kicker: 'Problem Statement', 
          title: 'What are you building, in one sentence?', 
          body: 'If you cannot say who uses it and what click changes their work, subsequent engineering will wander.', 
          sticker: {
            badge: 'BLUEPRINT',
            label: 'Core Contract',
            emoji: '⚡',
            bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
            border: 'border-indigo-500/40',
            textColor: 'text-indigo-700 dark:text-indigo-300',
            subtext: 'Clear input & output'
          },
          marks: [
            { label: 'Architecture', icon: <Layers className="w-3.5 h-3.5" /> },
            { label: 'Code Slice', icon: <Code2 className="w-3.5 h-3.5" /> },
            { label: 'Verify Build', icon: <Wrench className="w-3.5 h-3.5" /> },
            { label: 'Ship & Test', icon: <Target className="w-3.5 h-3.5" /> },
          ],
          field: 'One-line user capability',
          placeholder: 'e.g. Users can filter research tabs by relevance score with instant response'
        },
        { 
          kicker: 'Deliverable', 
          title: 'What can someone do when this is done?', 
          body: 'A finished slice has a working verification test, not a speculative list of backlog ideas.', 
          field: 'Verification criteria',
          placeholder: 'e.g. Passes TypeScript compile, renders responsive modal, persists to local state'
        },
        { 
          kicker: 'Workbench', 
          title: 'Tools for this specific pass only.', 
          body: 'Keep the active stack minimal. Introducing three new libraries is how an afternoon disappears.', 
          sticker: {
            badge: 'WORKBENCH',
            label: 'Clean Stack',
            emoji: '🛠️',
            bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
            border: 'border-cyan-500/40',
            textColor: 'text-cyan-700 dark:text-cyan-300',
            subtext: 'Zero dependency bloat'
          },
          marks: [
            { label: 'Vite / React' },
            { label: 'TypeScript' },
            { label: 'Claude Code' },
            { label: 'Terminal Tests' },
          ], 
          field: 'Workbench dependencies',
          placeholder: 'e.g. Vite dev server, Chrome devtools, editor'
        },
        { 
          kicker: 'Execution Order', 
          title: 'Sequence over simultaneous ideas.', 
          body: 'Define type contracts first. Implement minimal pure helper. Bind to UI component. Run compile verification.' 
        },
        { 
          kicker: 'Immediate Step', 
          title: 'The single task for this sitting.', 
          body: 'Write the exact block you will complete without opening any other project or context switch.', 
          sticker: {
            badge: 'DEEP WORK',
            label: 'Focus Block',
            emoji: '🎯',
            bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            border: 'border-emerald-500/40',
            textColor: 'text-emerald-700 dark:text-emerald-300',
            subtext: 'Single sitting complete'
          },
          field: 'First 30-minute code block',
          placeholder: 'e.g. Create RoadmapCard component and wire click handler'
        },
      ]
    };
  }

  // Deep Research & Strategic Domain (Default)
  return {
    category: 'Research & Strategic Analysis',
    icon: <Search className="w-5 h-5 text-emerald-500" />,
    color: '#10b981',
    steps: [
      { 
        kicker: 'Core Inquiry', 
        title: 'What question are you actually answering?', 
        body: 'A research exploration without a sharp thesis becomes a pile of open browser tabs.', 
        sticker: {
          badge: 'THESIS',
          label: 'North Star',
          emoji: '🧭',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          border: 'border-emerald-500/40',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          subtext: 'Targeted synthesis'
        },
        marks: [
          { label: 'Hypothesis', icon: <Target className="w-3.5 h-3.5" /> },
          { label: 'Source Review', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { label: 'Compare Findings', icon: <Compass className="w-3.5 h-3.5" /> },
          { label: 'Synthesis Decision', icon: <Sparkles className="w-3.5 h-3.5" /> },
        ],
        field: 'Core research question',
        placeholder: 'e.g. Why do inter-city passengers hesitate during mobile payment checkout?'
      },
      { 
        kicker: 'Success Metric', 
        title: 'What counts as a completed answer?', 
        body: 'A comparison table, a 1-page hypothesis brief, or an executive decision. Pick one format.', 
        field: 'Tangible artifact',
        placeholder: 'e.g. A 3-column table comparing operator fee structures with recommendation'
      },
      { 
        kicker: 'Trusted Sources', 
        title: 'Sources you will trust for this pass.', 
        body: 'Identify 2 to 3 high-yield sources. More than that and you are hoarding tabs instead of synthesizing.', 
        sticker: {
          badge: 'EVIDENCE',
          label: 'Primary Sources',
          emoji: '📚',
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          border: 'border-blue-500/40',
          textColor: 'text-blue-700 dark:text-blue-300',
          subtext: 'Quality over quantity'
        },
        field: 'Selected primary sources',
        placeholder: 'e.g. East Africa transport survey, regional mobile carrier fee documentation'
      },
      { 
        kicker: 'Order of Inquiry', 
        title: 'Read, then compare, then decide.', 
        body: 'Do not write the final conclusion while only the first source is open. Extract quotes first, compare discrepancies, then conclude.' 
      },
      { 
        kicker: 'Initial Sitting', 
        title: 'Open one source and take one structured note.', 
        body: 'That is the entire first block. Small, reliable momentum beats cognitive overload.', 
        sticker: {
          badge: 'VERIFIED',
          label: 'Synthesis Ready',
          emoji: '✨',
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          border: 'border-amber-500/40',
          textColor: 'text-amber-700 dark:text-amber-300',
          subtext: 'First note logged'
        },
        field: 'First source & note goal',
        placeholder: 'e.g. Read section 2 of carrier fee whitepaper and save 2 quotes to notes'
      },
    ]
  };
}

export const RoadmapSheet: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [named, setNamed] = useState(false);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    const onOpen = (e: any) => {
      setOpen(true);
      setNamed(false);
      setPage(0);
      setTitle(e?.detail?.title || '');
      setAnswers({});
    };
    window.addEventListener('bob-open-roadmap', onOpen);
    return () => window.removeEventListener('bob-open-roadmap', onOpen);
  }, []);

  const roadmapData = useMemo(() => stepsFor(title || 'research'), [title]);
  const steps = roadmapData.steps;

  if (!open) return null;
  const step = steps[page];
  const last = page === steps.length - 1;

  // Dynamic progress percentage & color calculation for top bar
  const progressRatio = named ? (page + 1) / steps.length : 0.08;
  const progressPercent = Math.round(progressRatio * 100);

  // Top Bar color stages: Warm Start (Yellow/Gold) -> Mid-Progress (Cyan/Blue) -> Milestone Complete (Emerald/Green)
  const getProgressTheme = (ratio: number) => {
    if (ratio >= 0.85) {
      return {
        barBg: 'bg-emerald-500',
        textAccent: 'text-emerald-500',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        glow: 'rgba(16, 185, 129, 0.45)',
      };
    }
    if (ratio >= 0.45) {
      return {
        barBg: 'bg-sky-500',
        textAccent: 'text-sky-500',
        badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        glow: 'rgba(14, 165, 233, 0.45)',
      };
    }
    return {
      barBg: 'bg-[var(--y)]',
      textAccent: 'text-amber-500',
      badgeBg: 'bg-[var(--ys)] text-[#765700] dark:text-[#f4d35e] border-[var(--y)]/40',
      glow: 'rgba(245, 158, 11, 0.45)',
    };
  };

  const currentTheme = getProgressTheme(progressRatio);

  return (
    <div className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Full-Page Modal Card Container */}
      <div className="w-full max-w-[960px] h-[92vh] max-h-[860px] bg-white dark:bg-[#121212] text-[#171717] dark:text-[#f4f2ee] rounded-[36px] border border-[#e6e1d6] dark:border-[#2a2a2a] shadow-[0_30px_90px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden relative">
        
        {/* Dynamic Multi-Stage Color Changing Top Bar */}
        <header className="px-6 sm:px-8 py-4 border-b border-[#eee] dark:border-[#222] bg-[#fafaf8] dark:bg-[#181818] flex items-center justify-between gap-4 shrink-0 transition-colors duration-500">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => (page > 0 ? setPage(page - 1) : setOpen(false))} 
              className="h-9 px-3 rounded-xl border border-[#e6e1d6] dark:border-[#2a2a2a] hover:bg-white dark:hover:bg-[#202020] text-[12.5px] font-bold text-[#666] dark:text-[#aaa] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{page > 0 ? 'Back' : 'Exit'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${currentTheme.badgeBg} transition-colors duration-500`}>
                {named ? `${roadmapData.category} · Step ${page + 1} of ${steps.length}` : 'New Roadmap'}
              </span>
            </div>
          </div>

          {/* Dynamic Progress Indicator with smooth color fill */}
          <div className="flex-1 max-w-[340px] flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-[#e8e4dc] dark:bg-[#2a2a2a] overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full ${currentTheme.barBg} transition-all duration-500 ease-out`} 
                style={{ 
                  width: `${progressPercent}%`,
                  boxShadow: `0 0 10px ${currentTheme.glow}`
                }} 
              />
            </div>
            <span className="text-[12px] font-mono font-extrabold text-[#777] dark:text-[#999] shrink-0">
              {progressPercent}%
            </span>
          </div>

          <button 
            type="button" 
            onClick={() => setOpen(false)} 
            className="w-9 h-9 rounded-xl border border-[#e6e1d6] dark:border-[#2a2a2a] hover:bg-white dark:hover:bg-[#202020] text-[#777] hover:text-[#171717] dark:hover:text-white transition-all cursor-pointer grid place-items-center"
            title="Close roadmap"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Modal Main Content: Full Screen Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8">
          {!named ? (
            /* Screen 1: Naming & Category Kickoff */
            <div className="max-w-[680px] mx-auto space-y-6 pt-4 animate-in fade-in duration-300">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ys)] dark:bg-[#332a10] border border-[var(--y)]/40 text-[11.5px] font-extrabold uppercase tracking-wider text-[#765700] dark:text-[#f4d35e]">
                <Compass className="w-4 h-4" />
                <span>Adaptive Step-by-Step Generator</span>
              </div>

              <div>
                <h1 className="text-[36px] sm:text-[44px] leading-[1.08] tracking-[-0.035em] font-black text-[#171717] dark:text-white m-0">
                  Name the work before you plan it.
                </h1>
                <p className="text-[15px] sm:text-[16px] text-[#5c564c] dark:text-[#a09a8e] leading-relaxed mt-3 max-w-[600px]">
                  Bob generates a focused sequence of full steps tailored to your craft. Each stage specifies tools, criteria, and actionable blocks.
                </p>
              </div>

              {/* Inspiration Chips */}
              <div className="space-y-2 pt-2">
                <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#888] block">
                  Select a starting pattern or type your own:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTitle('Sunday homemade roast chicken')}
                    className="p-3.5 rounded-2xl border border-[#e6e1d6] dark:border-[#2a2a2a] bg-[#fafaf8] dark:bg-[#1a1a1a] hover:border-amber-400 dark:hover:border-amber-500/60 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ChefHat className="w-4 h-4 text-amber-500" />
                      <b className="text-[13px] text-[#171717] dark:text-white group-hover:text-amber-600 transition-colors">Cooking & Food</b>
                    </div>
                    <small className="text-[11px] text-[#777] block leading-tight">Roast chicken, sauces, bakery flows</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTitle('Build interactive data table with filters')}
                    className="p-3.5 rounded-2xl border border-[#e6e1d6] dark:border-[#2a2a2a] bg-[#fafaf8] dark:bg-[#1a1a1a] hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Code2 className="w-4 h-4 text-indigo-500" />
                      <b className="text-[13px] text-[#171717] dark:text-white group-hover:text-indigo-500 transition-colors">Software & Code</b>
                    </div>
                    <small className="text-[11px] text-[#777] block leading-tight">Components, APIs, architecture</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTitle('Analyze passenger friction during bus booking')}
                    className="p-3.5 rounded-2xl border border-[#e6e1d6] dark:border-[#2a2a2a] bg-[#fafaf8] dark:bg-[#1a1a1a] hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="w-4 h-4 text-emerald-500" />
                      <b className="text-[13px] text-[#171717] dark:text-white group-hover:text-emerald-500 transition-colors">Deep Research</b>
                    </div>
                    <small className="text-[11px] text-[#777] block leading-tight">Interviews, synthesis, briefs</small>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div className="pt-2">
                <label className="block text-[12px] font-bold text-[#555] dark:text-[#aaa] mb-2">
                  Project / Goal Name:
                </label>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Build authentication pipeline or Cook Thai red curry" 
                  className="w-full h-14 px-5 rounded-2xl border border-[#e6e1d6] dark:border-[#2e2e2e] bg-[#fafaf8] dark:bg-[#1c1c1c] text-[15px] text-[#171717] dark:text-[#f4f2ee] font-semibold outline-none focus:border-[var(--y)] focus:ring-2 focus:ring-[var(--y)]/25 transition-all shadow-inner" 
                />
              </div>

              <button 
                type="button" 
                disabled={!title.trim()} 
                onClick={() => setNamed(true)} 
                className="w-full h-14 rounded-2xl bg-[#171717] dark:bg-[var(--y)] text-white dark:text-[#171717] font-black text-[14px] disabled:opacity-40 transition-all active:scale-[0.99] cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Generate Full-Page Roadmap</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Screen 2: Full Step Page with High Quality Stickers & Dynamic Badges */
            <div className="max-w-[760px] mx-auto space-y-6 animate-in fade-in duration-300">
              
              {/* Category Breadcrumb & High Quality Sticker Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#eee] dark:border-[#222]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-[#fafaf8] dark:bg-[#1e1e1e] border border-[#e6e1d6] dark:border-[#2a2a2a] shadow-xs">
                    {roadmapData.icon}
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#888]">
                      {roadmapData.category}
                    </span>
                    <h3 className="text-[14px] font-bold text-[#171717] dark:text-white m-0 truncate max-w-[380px]">
                      {title}
                    </h3>
                  </div>
                </div>

                {/* High Quality Sticker Display */}
                {step.sticker && (
                  <div className={`px-3.5 py-1.5 rounded-2xl border ${step.sticker.bg} ${step.sticker.border} flex items-center gap-2.5 shadow-sm animate-in zoom-in-95 duration-200`}>
                    <span className="text-lg leading-none select-none">{step.sticker.emoji}</span>
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-wider ${step.sticker.textColor} leading-tight`}>
                        {step.sticker.badge}
                      </div>
                      <div className="text-[11.5px] font-extrabold text-[#171717] dark:text-white leading-tight">
                        {step.sticker.label}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Header */}
              <div>
                <p className={`text-[11.5px] tracking-[0.14em] uppercase font-black ${currentTheme.textAccent} m-0`}>
                  {step.kicker} · Step {page + 1} of {steps.length}
                </p>
                <h2 className="text-[32px] sm:text-[38px] leading-[1.12] tracking-[-0.03em] font-black mt-2 mb-3 text-[#171717] dark:text-white">
                  {step.title}
                </h2>
                <p className="text-[15px] text-[#5c564c] dark:text-[#a09a8e] leading-relaxed m-0 max-w-[680px]">
                  {step.body}
                </p>
              </div>

              {/* Process Milestone Chips */}
              {step.marks && (
                <div className="p-5 rounded-2xl bg-[#fafaf8] dark:bg-[#181818] border border-[#e6e1d6] dark:border-[#262626]">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#888] block mb-3">
                    Execution Milestones for this Step:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {step.marks.map((m, mIdx) => (
                      <div 
                        key={mIdx} 
                        className="px-3 py-2 rounded-xl border border-[#e6e1d6] dark:border-[#2a2a2a] bg-white dark:bg-[#121212] text-[12px] font-extrabold flex items-center gap-2 text-[#171717] dark:text-[#f4f2ee] shadow-2xs"
                      >
                        {m.icon || <Check className="w-3.5 h-3.5 text-[var(--y)] shrink-0" />}
                        <span className="truncate">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Input Response Field */}
              {step.field && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[12.5px] font-black text-[#444] dark:text-[#bbb]">
                      {step.field}
                    </label>
                    <span className="text-[11px] text-[#888]">Saved with your roadmap</span>
                  </div>
                  <textarea 
                    value={answers[page] || ''} 
                    onChange={(e) => setAnswers({ ...answers, [page]: e.target.value })} 
                    placeholder={step.placeholder || 'Type your notes or response for this step...'}
                    rows={4} 
                    className="w-full rounded-2xl border border-[#e6e1d6] dark:border-[#2e2e2e] bg-[#fafaf8] dark:bg-[#181818] p-4 text-[13.5px] font-medium outline-none focus:border-[var(--y)] focus:ring-2 focus:ring-[var(--y)]/20 text-[#171717] dark:text-[#f4f2ee] transition-all leading-relaxed shadow-inner" 
                  />
                </div>
              )}

              {/* Navigation Steps Bar */}
              <div className="pt-4 flex items-center justify-between gap-4 border-t border-[#eee] dark:border-[#222]">
                <button
                  type="button"
                  onClick={() => (page > 0 ? setPage(page - 1) : setNamed(false))}
                  className="px-5 py-3 rounded-2xl border border-[#e6e1d6] dark:border-[#2a2a2a] hover:bg-[#fafaf8] dark:hover:bg-[#1e1e1e] text-[13px] font-bold text-[#666] dark:text-[#aaa] transition-all cursor-pointer flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!last) {
                      setPage(page + 1);
                    } else {
                      const record = { 
                        title, 
                        category: roadmapData.category,
                        answers, 
                        at: Date.now() 
                      };
                      try {
                        const prev = JSON.parse(localStorage.getItem('bob_roadmaps_v1') || '[]');
                        localStorage.setItem('bob_roadmaps_v1', JSON.stringify([record, ...prev].slice(0, 15)));
                      } catch {}
                      setOpen(false);
                    }
                  }}
                  className={`px-8 py-3.5 rounded-2xl ${
                    last 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25' 
                      : 'bg-[#171717] dark:bg-[var(--y)] text-white dark:text-[#171717] shadow-neutral-900/15'
                  } font-black text-[13.5px] transition-all active:scale-[0.98] cursor-pointer shadow-lg flex items-center gap-2`}
                >
                  <span>{last ? 'Complete & Start Roadmap' : 'Next Step'}</span>
                  {last ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
