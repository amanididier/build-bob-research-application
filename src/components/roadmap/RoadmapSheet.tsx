import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Sun, 
  Moon, 
  Sparkles, 
  Check, 
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Layers,
  Clock,
  Compass,
  Code2,
  Bot,
  Terminal,
  FileCode,
  Globe,
  Database,
  Palette,
  Cpu,
  Bookmark
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveGeminiApiKey } from '../../lib/ai/keyManager';
import { GoogleGenAI } from '@google/genai';

interface RoadmapStepItem {
  id: string;
  phase: string;
  title: string;
  why: string;
  tools: string[];
  dueDate: string;
  enabled: boolean;
}

// Tech & tool chips with recognizable visual icons/logos
const TOOL_PILLS = [
  { id: 'claude_code', label: 'Claude Code', icon: Terminal, color: '#D97706' },
  { id: 'chatgpt', label: 'ChatGPT', icon: Bot, color: '#10B981' },
  { id: 'react_vite', label: 'React / Vite', icon: Code2, color: '#06B6D4' },
  { id: 'typescript', label: 'TypeScript', icon: FileCode, color: '#3B82F6' },
  { id: 'tailwind', label: 'Tailwind CSS', icon: Palette, color: '#38BDF8' },
  { id: 'supabase', label: 'Supabase / SQL', icon: Database, color: '#34D399' },
  { id: 'gemini_api', label: 'Gemini AI', icon: Sparkles, color: '#8B5CF6' },
  { id: 'browser_tabs', label: 'Selected Tabs', icon: Globe, color: '#F59E0B' },
  { id: 'local_notes', label: 'Bob Memory', icon: Bookmark, color: '#EC4899' },
];

export const RoadmapSheet: React.FC = () => {
  const { userName, triggerThinking, addTask, navigateTo, activeResearchId, projects } = useApp();
  const [open, setOpen] = useState(false);
  const [goalQuery, setGoalQuery] = useState('');
  const [stepIndex, setStepIndex] = useState(0); // 0 to 4 (5 total dynamic pages)

  // Theme support: Dark theme by default (#0E0D0B), Paper/Light theme toggle (#FBF8F2)
  const [themeMode, setThemeMode] = useState<'dark' | 'paper'>(() => {
    return (localStorage.getItem('bob_roadmap_theme') as 'dark' | 'paper') || 'dark';
  });

  // Active sticker set (construction, kitchen, holiday, launch, garden)
  const [stickerSet, setStickerSet] = useState<string>('construction');

  // Dynamic user answers shaping subsequent turns
  const [selectedSituation, setSelectedSituation] = useState<string>('scratch');
  const [selectedTools, setSelectedTools] = useState<string[]>(['claude_code', 'react_vite', 'chatgpt']);
  const [selectedCadence, setSelectedCadence] = useState<string>('2weeks');
  const [customStepInput, setCustomStepInput] = useState<string>('');

  // Dynamically generated steps that the user can arrange
  const [arrangedSteps, setArrangedSteps] = useState<RoadmapStepItem[]>([]);

  const isDark = themeMode === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'paper' : 'dark';
    setThemeMode(next);
    localStorage.setItem('bob_roadmap_theme', next);
  };

  const activeProject = projects.find(p => p.id === activeResearchId) || projects[0];

  useEffect(() => {
    const onOpen = (e: any) => {
      setOpen(true);
      setStepIndex(0);
      const query = e?.detail?.title || activeProject?.title || 'Project Roadmap';
      setGoalQuery(query);

      // Rotate or pick sticker set based on query
      const q = query.toLowerCase();
      let pickedSet = 'construction';
      if (/cook|bake|recipe|meal|food|kitchen/.test(q)) pickedSet = 'kitchen';
      else if (/travel|trip|holiday|vacation|tour/.test(q)) pickedSet = 'holiday';
      else if (/launch|ship|deploy|rocket|market/.test(q)) pickedSet = 'launch';
      else if (/garden|plant|nature|grow|habit/.test(q)) pickedSet = 'garden';
      setStickerSet(pickedSet);

      // Initialize base steps for arranging
      generateInitialSteps(query, 'scratch', ['claude_code', 'react_vite', 'chatgpt'], '2weeks');
    };

    window.addEventListener('bob-open-roadmap', onOpen);
    return () => window.removeEventListener('bob-open-roadmap', onOpen);
  }, [activeProject]);

  // Generate customized steps based on user's exact inputs
  const generateInitialSteps = (goal: string, situation: string, tools: string[], cadence: string) => {
    const dueDateLabel = cadence === 'sprint' ? '3 Days' : cadence === 'month' ? 'Next Month' : '2 Weeks';
    
    let baseSteps: RoadmapStepItem[] = [
      {
        id: 's-1',
        phase: 'PHASE 1: FOUNDATION',
        title: `Define core architecture & boundaries for "${goal || 'Project'}"`,
        why: 'Clear boundaries ensure zero rework during subsequent coding.',
        tools: tools.slice(0, 2),
        dueDate: 'Day 1',
        enabled: true,
      },
      {
        id: 's-2',
        phase: 'PHASE 2: PROTOTYPE',
        title: 'Assemble responsive UI components & interactive state flow',
        why: 'Proves the user journey end-to-end with zero mock telemetry.',
        tools: tools.slice(0, 3),
        dueDate: dueDateLabel,
        enabled: true,
      },
      {
        id: 's-3',
        phase: 'PHASE 3: INTEGRATION',
        title: 'Connect local engine and background storage pipeline',
        why: 'Enables high reliability and offline-first capabilities.',
        tools: tools,
        dueDate: dueDateLabel,
        enabled: true,
      },
      {
        id: 's-4',
        phase: 'PHASE 4: VERIFICATION',
        title: 'Validate build compilation and automated test cases',
        why: 'Verifies zero compile warnings and production readiness.',
        tools: ['Terminal', 'Git'],
        dueDate: dueDateLabel,
        enabled: true,
      },
      {
        id: 's-5',
        phase: 'PHASE 5: RELEASE',
        title: 'Tag release and push deployment bundle to repository',
        why: 'Ships the verified version directly for testing and feedback.',
        tools: ['Git', 'GitHub Release'],
        dueDate: dueDateLabel,
        enabled: true,
      }
    ];

    if (situation === 'prototype') {
      baseSteps[0].title = `Refactor initial prototype for "${goal}" into clean production schema`;
    } else if (situation === 'unblock') {
      baseSteps[0].title = `Identify and resolve execution bottleneck in "${goal}"`;
    }

    setArrangedSteps(baseSteps);
  };

  // Reordering steps (Arrange steps up / down)
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= arrangedSteps.length) return;
    const copy = [...arrangedSteps];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setArrangedSteps(copy);
  };

  const toggleStepEnabled = (id: string) => {
    setArrangedSteps(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const addCustomStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStepInput.trim()) return;
    const newStep: RoadmapStepItem = {
      id: `s-${Date.now()}`,
      phase: 'CUSTOM STEP',
      title: customStepInput.trim(),
      why: 'User prioritized milestone.',
      tools: selectedTools.slice(0, 2),
      dueDate: selectedCadence === 'sprint' ? '3 Days' : '2 Weeks',
      enabled: true,
    };
    setArrangedSteps(prev => [...prev, newStep]);
    setCustomStepInput('');
  };

  const removeStep = (id: string) => {
    setArrangedSteps(prev => prev.filter(s => s.id !== id));
  };

  if (!open) return null;

  const totalSteps = 5;
  const progressRatio = (stepIndex + 1) / totalSteps;
  const progressPercent = Math.round(progressRatio * 100);

  // Top Bar Color Changing Stages:
  // 0% - 35%: Warm Gold (#F5B82E)
  // 36% - 75%: Sky Teal (#2DBFB0)
  // 76% - 100%: Vibrant Emerald (#10B981)
  const getProgressStyles = (ratio: number) => {
    if (ratio >= 0.75) {
      return {
        barBg: 'bg-emerald-500',
        textAccent: 'text-emerald-500',
        glow: 'rgba(16, 185, 129, 0.45)',
      };
    }
    if (ratio >= 0.36) {
      return {
        barBg: 'bg-[#2DBFB0]',
        textAccent: 'text-[#2DBFB0]',
        glow: 'rgba(45, 191, 176, 0.45)',
      };
    }
    return {
      barBg: 'bg-[#F5B82E]',
      textAccent: 'text-[#F5B82E]',
      glow: 'rgba(245, 184, 46, 0.45)',
    };
  };

  const progressStyle = getProgressStyles(progressRatio);

  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      handleFinishAndImplementIntoTasks();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    } else {
      setOpen(false);
    }
  };

  // Implement roadmap steps directly into Tasks Page
  const handleFinishAndImplementIntoTasks = () => {
    const enabledSteps = arrangedSteps.filter(s => s.enabled);
    
    // 1. Add each arranged step into AppContext tasks
    enabledSteps.forEach((step) => {
      addTask(step.title, step.dueDate, activeProject?.id);
    });

    // 2. Persist to local roadmaps storage
    const record = {
      title: goalQuery || 'My Roadmap',
      steps: enabledSteps,
      completedAt: Date.now()
    };
    try {
      const prev = JSON.parse(localStorage.getItem('bob_roadmaps_v1') || '[]');
      localStorage.setItem('bob_roadmaps_v1', JSON.stringify([record, ...prev].slice(0, 15)));
    } catch {}

    triggerThinking('Roadmap Implemented', `Added ${enabledSteps.length} structured steps to your Tasks page.`, 'Ready to execute');
    
    // 3. Close roadmap and navigate to Tasks Page
    setOpen(false);
    navigateTo('tasks');
  };

  const stickerPath = `/assets/stickers/${stickerSet}/${Math.min(5, stepIndex + 1)}.svg`;

  return (
    // Full Page Experience (Image 3 ResumeX Style): Edge-to-edge full window, replacing chat interface
    <div 
      className={`fixed inset-0 z-[100] w-screen h-screen flex flex-col select-text overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0E0D0B] text-[#F4EFE6]' : 'bg-[#FBF8F2] text-[#1F1A14]'
      }`}
    >
      {/* 1. TOP BAR: Back button, Wordmark, Dynamic Color-Shifting Progress Line, Step count, Theme Toggle, Close */}
      <header className={`w-full px-6 sm:px-12 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${
        isDark ? 'border-[#25221B] bg-[#12110D]' : 'border-[#E7E0D3] bg-[#F7F3EA]'
      }`}>
        <div className="flex items-center gap-3">
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

          <span className={`text-[13px] font-mono font-black tracking-tight uppercase ${isDark ? 'text-white' : 'text-[#1F1A14]'}`}>
            resumax.
          </span>
        </div>

        {/* Dynamic Color Changing Progress Line in Center */}
        <div className="flex-1 max-w-md mx-4">
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-[#25221B]' : 'bg-[#E7E0D3]'}`}>
            <div
              className={`h-full rounded-full ${progressStyle.barBg} transition-all duration-500 ease-out`}
              style={{
                width: `${progressPercent}%`,
                boxShadow: `0 0 10px ${progressStyle.glow}`
              }}
            />
          </div>
        </div>

        {/* Step Indicator & Theme Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
            STEP {String(stepIndex + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
          </span>

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
            title="Exit roadmap"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN FULL-PAGE READING COLUMN: Direct centered column without popup modal box */}
      <main className="flex-1 overflow-y-auto px-6 py-10 sm:py-14 flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">
          
          {/* STEP 1: Wide Selection Cards (ResumeX Style - Image 3) */}
          {stepIndex === 0 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[#8A8175]">
                  YOUR SITUATION
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Where are you right now, {userName || 'friend'}?
                </h1>
                <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  Targeting: <b className={isDark ? 'text-white' : 'text-neutral-900'}>{goalQuery}</b>. Your starting point shapes the depth of your steps.
                </p>
              </div>

              {/* Stacked Wide Selection Cards (Identical to Image 3) */}
              <div className="space-y-3">
                {[
                  { id: 'scratch', title: 'Starting completely from scratch (blank canvas)' },
                  { id: 'prototype', title: 'Already have an outline & initial prototype' },
                  { id: 'unblock', title: 'Mid-flight: need to unblock & structure execution' },
                  { id: 'release', title: 'Finalizing & preparing for release / review' },
                  { id: 'switch', title: 'Exploring alternative architecture or tech stack' }
                ].map((item) => {
                  const isSelected = selectedSituation === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSituation(item.id)}
                      className={`w-full p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? 'border-[var(--y)] ring-2 ring-[var(--y)]/25 ' + (isDark ? 'bg-[#1C1A14]' : 'bg-[#FFFDF7]')
                          : (isDark ? 'bg-[#14120D] hover:bg-[#1C1A14] border-[#2A2620]' : 'bg-white hover:bg-[#FAF6EC] border-[#E7E0D3]')
                      }`}
                    >
                      <span className={`text-sm sm:text-[15px] font-bold ${
                        isSelected 
                          ? (isDark ? 'text-white' : 'text-neutral-900') 
                          : (isDark ? 'text-[#D0C8B8]' : 'text-[#2D2820]')
                      }`}>
                        {item.title}
                      </span>
                      <div className={`w-5 h-5 rounded-full border grid place-items-center shrink-0 ml-3 ${
                        isSelected 
                          ? 'bg-[var(--y)] border-[var(--y)] text-[#171717]' 
                          : (isDark ? 'border-[#3D372E]' : 'border-[#D5CDBD]')
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Selection Pills / Chips with recognizable Logos & Icons */}
          {stepIndex === 1 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[#8A8175]">
                  YOUR WORKBENCH
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Select your primary tools & elements:
                </h1>
                <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  Pick the tools for this roadmap. Each tool adds specialized prompts and actions to your steps.
                </p>
              </div>

              {/* Selection Pills Grid with logos/icons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOOL_PILLS.map((tool) => {
                  const Icon = tool.icon;
                  const isSelected = selectedTools.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        setSelectedTools(prev => 
                          prev.includes(tool.id) 
                            ? prev.filter(t => t !== tool.id) 
                            : [...prev, tool.id]
                        );
                      }}
                      className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--y)] ring-2 ring-[var(--y)]/25 ' + (isDark ? 'bg-[#1C1A14]' : 'bg-[#FFFDF7]')
                          : (isDark ? 'bg-[#14120D] hover:bg-[#1A1813] border-[#2A2620]' : 'bg-white hover:bg-[#FAF6EC] border-[#E7E0D3]')
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-xl grid place-items-center shrink-0 shadow-sm"
                        style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-xs font-bold truncate ${
                          isSelected ? (isDark ? 'text-white' : 'text-neutral-900') : (isDark ? 'text-[#C5BCAC]' : 'text-[#3E382F]')
                        }`}>
                          {tool.label}
                        </span>
                        <span className="text-[10px] text-[#8A8175]">
                          {isSelected ? 'Selected' : 'Tap to add'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Cadence & Timeline */}
          {stepIndex === 2 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[#8A8175]">
                  PACING & CADENCE
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  What is your target delivery cadence?
                </h1>
                <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  Determines how your milestones sequence across deadlines.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'sprint', label: 'Hyper-Sprint (3 to 5 Days)', desc: 'Fast, focused prototype with minimal moving parts.' },
                  { id: '2weeks', label: 'Balanced Pace (2 Weeks)', desc: 'Recommended. Thorough design, code implementation, and testing.' },
                  { id: 'month', label: 'Deep Milestone (1 Month+)', desc: 'Full-stack production deployment with comprehensive documentation.' }
                ].map((c) => {
                  const isSelected = selectedCadence === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCadence(c.id)}
                      className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--y)] ring-2 ring-[var(--y)]/25 ' + (isDark ? 'bg-[#1C1A14]' : 'bg-[#FFFDF7]')
                          : (isDark ? 'bg-[#14120D] hover:bg-[#1A1813] border-[#2A2620]' : 'bg-white hover:bg-[#FAF6EC] border-[#E7E0D3]')
                      }`}
                    >
                      <div>
                        <b className={`block text-sm sm:text-[15px] font-bold ${
                          isSelected ? (isDark ? 'text-white' : 'text-neutral-900') : (isDark ? 'text-[#D0C8B8]' : 'text-[#2D2820]')
                        }`}>
                          {c.label}
                        </b>
                        <span className="block text-xs text-[#8A8175] mt-1">
                          {c.desc}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border grid place-items-center shrink-0 ml-3 ${
                        isSelected ? 'bg-[var(--y)] border-[var(--y)] text-[#171717]' : (isDark ? 'border-[#3D372E]' : 'border-[#D5CDBD]')
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Interactive Step Arranger (Rearrange, toggle, add steps) */}
          {stepIndex === 3 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[#8A8175]">
                  EXECUTION ROADMAP
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Arrange & prioritize your roadmap steps:
                </h1>
                <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  Use the up/down arrows to arrange step sequence. These will populate directly into your Tasks page.
                </p>
              </div>

              {/* Arranged Steps List */}
              <div className="space-y-3">
                {arrangedSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      step.enabled
                        ? (isDark ? 'bg-[#14120D] border-[#2A2620]' : 'bg-white border-[#E7E0D3]')
                        : 'opacity-40 line-through ' + (isDark ? 'bg-[#100E0A] border-[#201D17]' : 'bg-neutral-100 border-neutral-200')
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleStepEnabled(step.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md border grid place-items-center shrink-0 transition-colors cursor-pointer ${
                          step.enabled ? 'bg-[var(--y)] border-[var(--y)] text-[#171717]' : (isDark ? 'border-[#4A4235]' : 'border-[#C8BFB0]')
                        }`}
                      >
                        {step.enabled && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase text-[var(--y)]">
                            STEP {idx + 1}
                          </span>
                          <span className="text-[10px] text-[#8A8175] font-semibold">
                            {step.phase}
                          </span>
                        </div>
                        <h4 className={`text-xs sm:text-[13.5px] font-bold mt-1 mb-0.5 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                          {step.title}
                        </h4>
                        <p className="text-[11.5px] text-[#8A8175] m-0">
                          {step.why}
                        </p>
                      </div>
                    </div>

                    {/* Step Arrangement Arrows (Up / Down) */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, 'up')}
                        title="Move step up"
                        className={`p-1.5 rounded-lg border transition-all disabled:opacity-20 cursor-pointer ${
                          isDark ? 'border-[#2A2620] hover:bg-[#1F1C15] text-[#8A8175]' : 'border-[#E7E0D3] hover:bg-neutral-100 text-[#6B6358]'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arrangedSteps.length - 1}
                        onClick={() => moveStep(idx, 'down')}
                        title="Move step down"
                        className={`p-1.5 rounded-lg border transition-all disabled:opacity-20 cursor-pointer ${
                          isDark ? 'border-[#2A2620] hover:bg-[#1F1C15] text-[#8A8175]' : 'border-[#E7E0D3] hover:bg-neutral-100 text-[#6B6358]'
                        }`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        title="Remove step"
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isDark ? 'border-[#2A2620] hover:bg-red-950/30 text-[#8A8175] hover:text-red-400' : 'border-[#E7E0D3] hover:bg-red-50 text-[#6B6358] hover:text-red-600'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Step Input */}
              <form onSubmit={addCustomStep} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={customStepInput}
                  onChange={(e) => setCustomStepInput(e.target.value)}
                  placeholder="Insert custom step (e.g., Set up Stripe checkout webhook)..."
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-[var(--y)] ${
                    isDark ? 'bg-[#14120D] border-[#2A2620] text-white placeholder-[#686154]' : 'bg-white border-[#E7E0D3] text-neutral-900 placeholder-[#9C9385]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!customStepInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </form>
            </div>
          )}

          {/* STEP 5: Ready to Launch & Direct Implementation into Tasks */}
          {stepIndex === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl p-1 bg-gradient-to-tr from-amber-400/20 to-emerald-400/20 border border-[var(--y)]/40 shadow-xl grid place-items-center">
                <img
                  src={stickerPath}
                  alt="Roadmap milestone sticker"
                  className="w-16 h-16 object-contain filter drop-shadow-md select-none"
                  onError={(e) => {
                    // fallback to compass icon if svg path not available
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-emerald-500">
                  READY TO LAUNCH
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Your personalized roadmap is ready!
                </h1>
                <p className={`text-sm max-w-md mx-auto ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  We have structured <b className={isDark ? 'text-white' : 'text-neutral-900'}>{arrangedSteps.filter(s => s.enabled).length} sequential steps</b> tailored for <b className={isDark ? 'text-white' : 'text-neutral-900'}>{goalQuery}</b>.
                </p>
              </div>

              {/* Summary Overview Card */}
              <div className={`p-5 rounded-2xl border text-left space-y-3 ${
                isDark ? 'bg-[#14120D] border-[#2A2620]' : 'bg-white border-[#E7E0D3]'
              }`}>
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[var(--line)]">
                  <span className="text-[#8A8175]">Total Roadmap Steps:</span>
                  <span className="font-bold font-mono text-[var(--y)]">{arrangedSteps.filter(s => s.enabled).length} Actionable Steps</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[var(--line)]">
                  <span className="text-[#8A8175]">Target Cadence:</span>
                  <span className="font-bold">{selectedCadence === 'sprint' ? '3 to 5 Days' : selectedCadence === 'month' ? '1 Month+' : '2 Weeks'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8A8175]">Target Destination:</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tasks & Next Steps Page</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#8A8175]">
                Clicking below will save the roadmap and immediately populate your Tasks page with all of these steps.
              </p>
            </div>
          )}

          {/* 3. Bottom Action Bar */}
          <div className="pt-6 border-t border-[var(--line)] flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isDark 
                  ? 'border-[#2A2620] hover:bg-[#1E1B15] text-[#8A8175] hover:text-white' 
                  : 'border-[#E7E0D3] hover:bg-neutral-100 text-[#6B6358] hover:text-neutral-900'
              }`}
            >
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer ml-auto"
            >
              <span>{stepIndex === totalSteps - 1 ? 'Implement Roadmap into Tasks →' : 'Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};
