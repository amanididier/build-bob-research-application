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
  Clock,
  Clock3,
  Compass,
  Code2,
  Bot,
  Terminal,
  FileCode,
  Globe,
  Database,
  Palette,
  Bookmark,
  RefreshCw,
  Cpu,
  Layers,
  Edit2,
  Lightbulb,
  Flag,
  Pencil,
  Sprout,
  Download,
  ChevronDown,
  MoveUpRight,
  Route as RouteIcon,
  LayoutGrid
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveGeminiApiKey } from '../../lib/ai/keyManager';
import { GoogleGenAI } from '@google/genai';
import bobBuilder from '../../assets/images/bob-builder.png';
import bobOrb from '../../assets/images/bob_mascot_orb_1791540734514.jpg';

export interface RoadmapStepItem {
  id: string;
  phase: string;
  title: string;
  why: string;
  tools: string[];
  dueDate: string;
  enabled: boolean;
}

// Tech & tool chips with recognizable visual icons/logos
export const TOOL_PILLS = [
  { id: 'claude_code', label: 'Claude Code', icon: Terminal, color: '#D97706', category: 'coding' },
  { id: 'chatgpt', label: 'ChatGPT', icon: Bot, color: '#10B981', category: 'ideation' },
  { id: 'react_vite', label: 'React / Vite', icon: Code2, color: '#06B6D4', category: 'frontend' },
  { id: 'typescript', label: 'TypeScript', icon: FileCode, color: '#3B82F6', category: 'frontend' },
  { id: 'tailwind', label: 'Tailwind CSS', icon: Palette, color: '#38BDF8', category: 'frontend' },
  { id: 'supabase', label: 'Supabase / SQL', icon: Database, color: '#34D399', category: 'backend' },
  { id: 'gemini_api', label: 'Gemini AI', icon: Sparkles, color: '#8B5CF6', category: 'ai' },
  { id: 'browser_tabs', label: 'Selected Tabs', icon: Globe, color: '#F59E0B', category: 'research' },
  { id: 'local_notes', label: 'Bob Memory', icon: Bookmark, color: '#EC4899', category: 'research' },
];

export interface RoadmapSheetProps {
  isOpen?: boolean;
  onClose?: () => void;
  onFinish?: (steps: RoadmapStepItem[]) => void;
  initialGoal?: string;
  standalone?: boolean;
}

export const RoadmapSheet: React.FC<RoadmapSheetProps> = ({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  onFinish: propsOnFinish,
  initialGoal,
}) => {
  const { userName, triggerThinking, addTask, navigateTo, activeResearchId, projects, currentPage } = useApp();
  const [internalOpen, setInternalOpen] = useState(false);
  const [goalQuery, setGoalQuery] = useState(initialGoal || '');
  const [stepIndex, setStepIndex] = useState(0); // 0 = Intro, 1..4 Questions, 5 = Arranger, 6 = Result
  const [originSource, setOriginSource] = useState<'chat' | 'desktop' | 'tasks'>('chat');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  // Theme support: Dark theme (#0E0D0B) / Paper Light (#FBF8F2)
  const [themeMode, setThemeMode] = useState<'dark' | 'paper'>(() => {
    return (localStorage.getItem('bob_roadmap_theme') as 'dark' | 'paper') || 'dark';
  });

  // Dynamic user answers shaping subsequent turns
  const [selectedSituation, setSelectedSituation] = useState<string>('unspecified');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedTimeOption, setSelectedTimeOption] = useState<string>('Flexible');
  const [selectedCadence, setSelectedCadence] = useState<string>('flexible');
  const [customToolInput, setCustomToolInput] = useState<string>('');
  const [customStepInput, setCustomStepInput] = useState<string>('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepTitle, setEditingStepTitle] = useState<string>('');
  const [isAiSynthesizing, setIsAiSynthesizing] = useState<boolean>(false);
  const [completedMilestoneIds, setCompletedMilestoneIds] = useState<Record<string, boolean>>({});

  type AdaptiveQuestion = { question: string; helperText: string; options: Array<{ label: string; description?: string; value: string }> };
  const [adaptiveQuestion, setAdaptiveQuestion] = useState<AdaptiveQuestion>({
    question: 'What matters most for this goal?',
    helperText: 'Choose the closest fit. Bob will use your answer to tailor the next question.',
    options: [
      { label: 'Get a working first version', description: 'Focus on the essentials first', value: 'working first version' },
      { label: 'Validate the idea', description: 'Learn what is worth building', value: 'validate the idea' },
      { label: 'Improve something existing', description: 'Build on what already exists', value: 'improve an existing solution' },
    ],
  });
  const [adaptiveAnswers, setAdaptiveAnswers] = useState<string[]>([]);
  const [isGeneratingAdaptiveQuestion, setIsGeneratingAdaptiveQuestion] = useState(false);

  // Dynamically generated steps that the user can arrange
  const [arrangedSteps, setArrangedSteps] = useState<RoadmapStepItem[]>([]);

  const isDark = themeMode === 'dark';
  const open = propsIsOpen !== undefined ? propsIsOpen : internalOpen;

  const toggleTheme = () => {
    const next = isDark ? 'paper' : 'dark';
    setThemeMode(next);
    localStorage.setItem('bob_roadmap_theme', next);
  };

  const activeProject = projects.find(p => p.id === activeResearchId) || projects[0];

  useEffect(() => {
    const onOpen = (e: any) => {
      setInternalOpen(true);
      setStepIndex(0);
      const query = e?.detail?.title || initialGoal || activeProject?.title || 'Project Roadmap';
      setGoalQuery(query);
      if (e?.detail?.origin) {
        setOriginSource(e.detail.origin);
      } else if (currentPage === 'chat') {
        setOriginSource('chat');
      } else {
        setOriginSource('desktop');
      }

      // Initialize base steps for arranging
      generateInitialSteps(query, 'unspecified', [], 'flexible');
    };

    window.addEventListener('bob-open-roadmap', onOpen);
    return () => window.removeEventListener('bob-open-roadmap', onOpen);
  }, [activeProject, initialGoal, currentPage]);

  // When Situation changes, dynamically adapt workbench tools
  const handleSelectSituation = (situationId: string) => {
    setSelectedSituation(situationId);
    if (situationId === 'scratch') {
      setSelectedTools(['claude_code', 'react_vite', 'chatgpt', 'tailwind']);
    } else if (situationId === 'prototype') {
      setSelectedTools(['typescript', 'supabase', 'gemini_api', 'react_vite']);
    } else if (situationId === 'unblock') {
      setSelectedTools(['claude_code', 'browser_tabs', 'chatgpt', 'local_notes']);
    } else if (situationId === 'release') {
      setSelectedTools(['claude_code', 'gemini_api', 'typescript', 'local_notes']);
    } else if (situationId === 'switch') {
      setSelectedTools(['react_vite', 'supabase', 'typescript', 'claude_code']);
    }
  };

  // Generate customized steps based on user's exact inputs
  const generateInitialSteps = (goal: string, situation: string, tools: string[], cadence: string) => {
    const normalizedGoal = goal.toLowerCase();
    const dueDateLabel = cadence === 'sprint' ? '3–5 days' : cadence === 'month' ? 'Within a month' : 'When ready';
    const isBusiness = /business|startup|customer|sell|revenue|market|company/.test(normalizedGoal);
    const isLearning = /learn|study|skill|course|master|practice/.test(normalizedGoal);
    const isEvent = /event|workshop|conference|trip|community|campaign/.test(normalizedGoal);
    const isProduct = /product|launch|brand|content|service/.test(normalizedGoal);
    const isSoftware = /app|website|software|platform|code|ai|application|tool/.test(normalizedGoal);
    const plan = isBusiness ? [
      ['Clarify the customer and problem', 'Describe who this is for and the problem they would pay or act to solve.'],
      ['Test demand with a small experiment', 'Talk to potential customers and gather evidence before investing heavily.'],
      ['Build and launch a simple offer', 'Deliver the smallest useful version and learn from real responses.'],
      ['Review results and choose the next move', 'Use feedback and basic numbers to decide what to improve or expand.'],
    ] : isLearning ? [
      ['Choose a clear skill target', 'Define what you want to be able to do in practice.'],
      ['Practice the essential foundations', 'Learn the smallest set of concepts needed to make progress.'],
      ['Complete a real-world practice project', 'Apply the skill in a concrete piece of work.'],
      ['Get feedback and improve', 'Review what worked, address gaps, and choose the next challenge.'],
    ] : isEvent ? [
      ['Define the purpose and audience', 'Decide who the event serves and what a successful outcome looks like.'],
      ['Set the format, budget, and logistics', 'Choose a realistic size, location, timeline, and responsibilities.'],
      ['Invite people and prepare materials', 'Promote the event and make sure participants know what to expect.'],
      ['Run the event and capture feedback', 'Deliver the experience and record what should change next time.'],
    ] : isProduct ? [
      ['Define the audience and value', 'Clarify who the product serves and why they would choose it.'],
      ['Create the smallest useful version', 'Turn the idea into something people can experience or review.'],
      ['Test with real people and refine', 'Use feedback to improve the most important parts.'],
      ['Launch to a focused audience', 'Release the product in a manageable way and learn from results.'],
    ] : isSoftware ? [
      ['Define the core user problem and first version', 'Choose the essential outcome and keep the first scope small.'],
      ['Design and build the core experience', 'Implement only the essential flow needed to test the idea.'],
      ['Test the experience with real scenarios', 'Fix the highest-impact issues and verify the main user journey.'],
      ['Release a small version and learn', 'Share it with a focused group and use feedback to decide what comes next.'],
    ] : [
      ['Define the outcome and who it helps', 'Make the intended result concrete and easy to recognize.'],
      ['Break the goal into the smallest useful actions', 'Choose the first actions that create evidence or visible progress.'],
      ['Complete a first version and review it', 'Try the plan in practice and notice what needs adjustment.'],
      ['Improve the result using feedback', 'Keep what works and adjust the next steps based on what you learn.'],
    ];
    const baseSteps: RoadmapStepItem[] = plan.map(([title, why], index) => ({
      id: `fallback-${Date.now()}-${index}`,
      phase: `MILESTONE ${index + 1}`,
      title,
      why,
      tools: tools.length ? tools.slice(0, 2) : [],
      dueDate: index === 0 ? 'First' : dueDateLabel,
      enabled: true,
    }));
    setArrangedSteps(baseSteps);
  };

  // AI-powered step synthesis using Gemini (or fallback heuristic)
  const synthesizeStepsWithAi = async (extraAnswers: string[] = adaptiveAnswers) => {
    setIsAiSynthesizing(true);
    const key = resolveGeminiApiKey();
    const toolLabels = selectedTools.map(t => TOOL_PILLS.find(p => p.id === t)?.label || t).join(', ') || 'Not specified; infer only tools that genuinely fit the goal';
    const situationMap: Record<string, string> = {
      scratch: 'Starting from scratch (blank canvas)',
      prototype: 'Refactoring existing prototype into production schema',
      unblock: 'Mid-flight: unblocking bottlenecks and clarifying steps',
      release: 'Finalizing, verifying test suite, and releasing',
      switch: 'Refactoring to alternative modern stack'
    };
    const situationText = situationMap[selectedSituation] || 'Not specified; infer the right starting point from the goal and answers';
    const dueDateLabel = selectedCadence === 'sprint' ? '3 to 5 Days' : selectedCadence === 'month' ? 'Within 1 Month' : 'Flexible; infer realistic timing from the scope';

    if (key) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const prompt = `You are Bob's adaptive project-planning engine. Create a roadmap specific to the user's actual goal, not a generic template. Project: "${goalQuery || 'User project'}". Create the first three essential milestones first, then add only the further milestones required for confident completion. Return 3–12 milestones based on complexity: 3–4 for a small clear goal, 5–8 for medium work, 9–12 for complex work. Never force a fixed count or include irrelevant engineering/deployment tasks. Make each phase project-specific, ordered, actionable, and outcome-based. If the goal is unclear, use early milestones to clarify it.
User situation: "${situationText}".
Selected tools: "${toolLabels}".
Target cadence: "${dueDateLabel}".
Weekly commitment: "${selectedTimeOption}".
Additional answers collected from the user's previous roadmap pages: ${JSON.stringify(extraAnswers)}.
Use these answers to customize milestone names, order, scope, and tools. Do not add unrelated generic software tasks unless the goal actually requires them.

Output strict JSON array with this exact structure:
[
  {
    "phase": "PHASE 1: FOUNDATION",
    "title": "Actionable imperative title",
    "why": "Clear 1-sentence rationale",
    "tools": ["Tool1", "Tool2"],
    "dueDate": "Day 1"
  }
]
No markdown codeblocks or prose, only valid JSON array.`;

        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = res.text?.trim() || '';
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length >= 3) {
          const mapped: RoadmapStepItem[] = parsed.slice(0, 12).map((item, idx) => ({
            id: `ai-step-${Date.now()}-${idx}`,
            phase: item.phase || `PHASE ${idx + 1}`,
            title: item.title || `Milestone ${idx + 1}`,
            why: item.why || 'Critical execution milestone.',
            tools: Array.isArray(item.tools) && item.tools.length > 0 ? item.tools : selectedTools.slice(0, 2),
            dueDate: idx === 0 ? 'Today' : (item.dueDate || dueDateLabel),
            enabled: true,
          }));
          setArrangedSteps(mapped);
          setIsAiSynthesizing(false);
          return;
        }
      } catch (err) {
        console.warn('Gemini dynamic roadmap synthesis fallback:', err);
      }
    }

    // Heuristic generator fallback
    generateInitialSteps(goalQuery, selectedSituation, selectedTools, selectedCadence);
    setIsAiSynthesizing(false);
  };

  // Reordering steps (Arrange steps up / down)
  const generateAdaptiveQuestion = async (questionNumber: number, answers: string[]) => {
    setIsGeneratingAdaptiveQuestion(true);
    const key = resolveGeminiApiKey();
    const fallbackQuestions: AdaptiveQuestion[] = [
      {
        question: 'What matters most for this goal?',
        helperText: 'Pick the outcome that best matches what you want to achieve first.',
        options: [
          { label: 'Get a working first version', description: 'Focus on the essentials first', value: 'working first version' },
          { label: 'Validate the idea', description: 'Learn what is worth building', value: 'validate the idea' },
          { label: 'Improve something existing', description: 'Build on what already exists', value: 'improve an existing solution' },
          { label: 'Prepare to launch', description: 'Polish and release confidently', value: 'prepare to launch' },
        ],
      },
      {
        question: 'What is the biggest constraint right now?',
        helperText: 'This helps Bob keep the plan realistic for your situation.',
        options: [
          { label: 'Time', description: 'I need a focused, achievable plan', value: 'limited time' },
          { label: 'Budget or resources', description: 'Use what is available to me', value: 'limited budget or resources' },
          { label: 'Knowing what to do', description: 'I need clarity and direction', value: 'unclear next steps' },
          { label: 'Technical or practical blockers', description: 'I know the goal but need help executing', value: 'execution blockers' },
        ],
      },
    ];
    if (!key) {
      setAdaptiveQuestion(fallbackQuestions[Math.min(questionNumber - 1, fallbackQuestions.length - 1)]);
      setIsGeneratingAdaptiveQuestion(false);
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `You are Bob's adaptive project discovery assistant. The goal is: "${goalQuery || 'the user has not specified a detailed goal'}". Previous answers: ${JSON.stringify(answers)}. Generate the next concise multiple-choice question for roadmap discovery (question ${questionNumber + 1} of 3). Ask only about a meaningful unknown not already answered, and make the options specific to this goal and prior answers. Do not ask the user to type. Return strict JSON only: {"question":"...","helperText":"...","options":[{"label":"short choice","description":"brief explanation","value":"meaningful value"}]}. Include 3–5 distinct options.`;
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      const cleaned = (response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.question === 'string' && Array.isArray(parsed.options) && parsed.options.length >= 3) {
        setAdaptiveQuestion({
          question: parsed.question,
          helperText: typeof parsed.helperText === 'string' ? parsed.helperText : 'Choose the option that best fits your situation.',
          options: parsed.options.slice(0, 5).map((option: any) => ({
            label: String(option.label || option.value || 'Option'),
            description: typeof option.description === 'string' ? option.description : '',
            value: String(option.value || option.label || 'Option'),
          })),
        });
        setIsGeneratingAdaptiveQuestion(false);
        return;
      }
    } catch (error) {
      console.warn('Adaptive roadmap question fallback:', error);
    }
    setAdaptiveQuestion(fallbackQuestions[Math.min(questionNumber - 1, fallbackQuestions.length - 1)]);
    setIsGeneratingAdaptiveQuestion(false);
  };

  const handleAdaptiveChoice = (option: AdaptiveQuestion['options'][number]) => {
    const answer = `${adaptiveQuestion.question}: ${option.value}`;
    const nextAnswers = [...adaptiveAnswers, answer];
    setAdaptiveAnswers(nextAnswers);
    if (stepIndex === 2) {
      void generateAdaptiveQuestion(2, nextAnswers);
      setStepIndex(3);
      return;
    }
    void synthesizeStepsWithAi(nextAnswers);
    setStepIndex(5);
  };

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
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      phase: `PHASE ${arrangedSteps.length + 1}: CUSTOM`,
      title: customStepInput.trim(),
      why: 'User prioritized milestone step.',
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

  const startEditStep = (step: RoadmapStepItem) => {
    setEditingStepId(step.id);
    setEditingStepTitle(step.title);
  };

  const saveEditStep = (id: string) => {
    if (!editingStepTitle.trim()) return;
    setArrangedSteps(prev => prev.map(s => s.id === id ? { ...s, title: editingStepTitle.trim() } : s));
    setEditingStepId(null);
  };

  const toggleMilestoneComplete = (id: string) => {
    setCompletedMilestoneIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const exportPlan = () => {
    const enabledSteps = arrangedSteps.filter(s => s.enabled);
    const content = `# Roadmap: ${goalQuery || 'Project Roadmap'}
Target Cadence: ${selectedCadence} (${selectedTimeOption} per week)
Generated with Bob Companion

${enabledSteps.map((s, idx) => `## Milestone ${idx + 1}: ${s.title}
Phase: ${s.phase}
Why: ${s.why}
Tools: ${s.tools.join(', ')}
Due Date: ${s.dueDate}
`).join('\n')}
`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(goalQuery || 'roadmap').toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    triggerThinking('Roadmap Exported', 'Downloaded markdown file.', 'Ready');
  };

  if (!open) return null;

  const totalQuestionSteps = 3; // Goal plus two Gemini-adaptive multiple-choice pages

  const handleNext = () => {
    if (stepIndex === 1) {
      setAdaptiveAnswers([]);
      void generateAdaptiveQuestion(1, []);
      setStepIndex(2);
      return;
    }
    if (stepIndex < 6) {
      setStepIndex(prev => prev + 1);
    } else {
      handleFinishAndImplementIntoTasks();
    }
  };

  const handleBack = () => {
    if (stepIndex === 5) {
      setStepIndex(3);
    } else if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setInternalOpen(false);
    propsOnClose?.();
  };

  // Implement roadmap steps directly into Tasks Page
  const handleFinishAndImplementIntoTasks = () => {
    const enabledSteps = arrangedSteps.filter(s => s.enabled);
    
    // 1. Add each arranged step into AppContext tasks with unique ID & source connection
    enabledSteps.forEach((step, idx) => {
      addTask(
        step.title,
        step.dueDate,
        activeProject?.id || activeResearchId || 'urugendo',
        { sourceConnection: 'Bob Roadmap · ' + (step.phase || ('Phase ' + (idx + 1))), isAiGenerated: true }
      );
    });

    // 2. Build full phased tasks data for the sequential execution view
    const phasedTasksData = enabledSteps.map((step, idx) => ({
      id: `pt-${idx + 1}-${Date.now()}`,
      phase: step.phase,
      title: step.title,
      estimatedTime: selectedCadence === 'sprint' ? '1 hour' : selectedCadence === 'month' ? '1 day' : '3 hours',
      priority: idx + 1,
      steps: [
        {
          id: `s-${idx + 1}-1`,
          stepNumber: 1,
          title: `Analyze requirements for ${step.title}`,
          instruction: step.why || `Review documentation and setup for ${step.tools.join(', ')}.`,
          tool: step.tools[0] || 'chatgpt',
        },
        {
          id: `s-${idx + 1}-2`,
          stepNumber: 2,
          title: `Execute implementation using ${step.tools[0] || 'Claude Code'}`,
          instruction: `Build the core components, configure parameters, and verify execution.`,
          tool: step.tools[1] || 'claude_code',
        }
      ]
    }));

    // 3. Persist to localStorage for both TasksPage and TasksView
    try {
      localStorage.setItem('bob_phased_roadmap_v2', JSON.stringify({
        goal: goalQuery || 'Project Roadmap',
        projectId: activeProject?.id || activeResearchId || 'urugendo',
        situation: selectedSituation,
        tools: selectedTools,
        cadence: selectedCadence,
        time: selectedTimeOption,
        tasks: phasedTasksData,
        steps: enabledSteps,
        createdAt: Date.now()
      }));

      // Fire synchronization event so TasksPage and TasksView re-render immediately
      window.dispatchEvent(new CustomEvent('bob:roadmap-updated', { detail: phasedTasksData }));
      window.dispatchEvent(new CustomEvent('bob:roadmap-finished', { 
        detail: { 
          goal: goalQuery || 'Project Roadmap', 
          count: enabledSteps.length,
          origin: originSource 
        } 
      }));
    } catch {}

    triggerThinking('Roadmap Implemented', `Added ${enabledSteps.length} structured steps to your Tasks page.`, 'Ready to execute');
    propsOnFinish?.(enabledSteps);

    // 4. Close roadmap full page
    setInternalOpen(false);
    propsOnClose?.();

    // 5. Navigate based on origin
    if (originSource === 'tasks') {
      navigateTo('tasks');
    } else if (originSource === 'desktop') {
      navigateTo('tasks');
    } else {
      navigateTo('chat');
    }
  };

  const completedCount = arrangedSteps.filter(s => completedMilestoneIds[s.id]).length;

  return (
    <div 
      className={`fixed inset-0 z-[100] w-screen h-screen flex flex-col select-text overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0E0D0B] text-[#F4EFE6]' : 'bg-[#FBF8F2] text-[#1F1A14]'
      }`}
    >
      {/* 1. TOP HEADER (Refined with brand, project switcher, theme toggle & exit) */}
      <header className={`w-full px-6 sm:px-12 py-3 border-b flex items-center justify-between gap-4 shrink-0 ${
        isDark ? 'border-[#25221B] bg-[#12110D]' : 'border-[#E7E0D3] bg-[#F7F3EA]'
      }`}>
        <div className="flex items-center gap-3">
          {stepIndex > 0 ? (
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
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[var(--peach)]/20 text-[var(--peach)] grid place-items-center">
              <Sparkles className="w-4 h-4" />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className={`text-[15px] font-mono font-black tracking-tight uppercase ${isDark ? 'text-white' : 'text-[#1F1A14]'}`}>
              bob.
            </span>
            <span className="text-xs text-[#8A8175] font-semibold hidden sm:inline">
              / roadmap refined
            </span>
          </div>
        </div>

        {/* Project Switcher in Center */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${
              isDark ? 'border-[#2A2620] bg-[#17150F] text-white hover:bg-[#201D17]' : 'border-[#E7E0D3] bg-white text-neutral-900 hover:bg-[#f6f2e8]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[var(--mint)]" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{goalQuery || 'Project Roadmap'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8A8175]" />
          </button>

          {projectMenuOpen && (
            <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-64 p-2 rounded-xl border shadow-xl z-50 text-xs space-y-1 ${
              isDark ? 'bg-[#181612] border-[#2A2620]' : 'bg-white border-[#E7E0D3]'
            }`}>
              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase text-[#8A8175]">
                SAMPLE TEMPLATES
              </div>
              {[
                { title: 'My creative studio', desc: 'Brand identity & client work' },
                { title: 'Learn web development', desc: 'Code skills & personal site' },
                { title: 'My balcony garden', desc: 'Plants & mindful routine' },
                { title: activeProject?.title || 'Current Project', desc: 'Active workspace' }
              ].map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setGoalQuery(p.title);
                    setProjectMenuOpen(false);
                    generateInitialSteps(p.title, selectedSituation, selectedTools, selectedCadence);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    goalQuery === p.title
                      ? 'bg-[var(--y)] text-black font-bold'
                      : isDark ? 'hover:bg-[#221f19] text-[#D0C8B8]' : 'hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <span className="truncate">{p.title}</span>
                  {goalQuery === p.title && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side controls: Step count, theme toggle, close */}
        <div className="flex items-center gap-2.5 shrink-0">
          {stepIndex > 0 && stepIndex <= totalQuestionSteps && (
            <span className={`text-[11px] font-mono font-bold uppercase tracking-wider hidden sm:inline ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
              STEP {String(stepIndex).padStart(2, '0')} / {String(totalQuestionSteps).padStart(2, '0')}
            </span>
          )}

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
            onClick={handleClose}
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

      {/* Segmented Wizard Progress across top when on question steps */}
      {stepIndex > 0 && stepIndex <= 3 && (
        <div className="w-full flex gap-1 px-6 sm:px-12 pt-2 shrink-0">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                s <= stepIndex ? 'bg-[var(--y)]' : (isDark ? 'bg-[#25221B]' : 'bg-[#E7E0D3]')
              }`}
            />
          ))}
        </div>
      )}

      {/* 2. MAIN SCROLLABLE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto px-6 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto animate-in fade-in duration-300">

          {/* STEP 0: Bob Builder Scene Intro Screen (from roadmap-refined) */}
          {stepIndex === 0 && (
            <div className="text-center space-y-6">
              {/* Journey Tag */}
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--y)]" />
                <span className="text-[10px] font-mono tracking-[0.16em] uppercase font-bold text-[#8A8175]">
                  A ROADMAP AS UNIQUE AS YOUR IDEA
                </span>
              </div>

              {/* Bob Builder Hero Scene Artwork */}
              <div className="relative w-72 sm:w-80 h-56 mx-auto my-2">
                <img
                  src={bobBuilder}
                  alt="Bob planning with blueprint"
                  className="w-56 h-56 object-contain mx-auto filter drop-shadow-xl select-none"
                />
                {/* Speech Badge Left */}
                <div className={`absolute left-0 top-18 -rotate-6 px-3 py-1.5 rounded-xl border shadow-sm flex items-center gap-1.5 text-[10px] font-bold ${
                  isDark ? 'bg-[#181612] border-[#2A2620] text-amber-400' : 'bg-white border-[#E7E0D3] text-neutral-800'
                }`}>
                  <Lightbulb className="w-3.5 h-3.5 text-[var(--y)]" />
                  <span>A little spark</span>
                </div>
                {/* Speech Badge Right */}
                <div className={`absolute right-0 top-28 rotate-6 px-3 py-1.5 rounded-xl border shadow-sm flex items-center gap-1.5 text-[10px] font-bold ${
                  isDark ? 'bg-[#181612] border-[#2A2620] text-emerald-400' : 'bg-white border-[#E7E0D3] text-neutral-800'
                }`}>
                  <Flag className="w-3.5 h-3.5 text-[var(--mint)]" />
                  <span>A real beginning</span>
                </div>
                {/* Hand-drawn stars */}
                <span className="absolute right-4 top-4 text-2xl text-[var(--y)] select-none animate-pulse">✳</span>
                <span className="absolute left-6 bottom-4 text-xl text-[var(--peach)] select-none">✦</span>
              </div>

              {/* Intro Title & Description */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Bring your big idea<br />
                  <span className="text-[var(--y)]">into a clear reality.</span>
                </h1>
                <p className={`text-sm max-w-md mx-auto leading-relaxed ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  Big ideas feel better with a small first step.<br />
                  Let’s make a path that feels like you.
                </p>
              </div>

              {/* Start Button */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setStepIndex(1)}
                  className="px-8 py-3.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-extrabold text-sm flex items-center justify-center gap-3 mx-auto shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>Let’s build my roadmap</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8A8175]">
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>A few thoughtful minutes. At your pace.</span>
                </div>
              </div>

              {/* 3 Preview Cards (Peach, Mint, Lilac) */}
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t ${
                isDark ? 'border-[#25221B]' : 'border-[#E7E0D3]'
              }`}>
                <div className="text-left p-3.5 rounded-2xl border flex items-start gap-3 border-transparent">
                  <div className="w-9 h-10 rounded-xl bg-[var(--peach-bg)] text-[var(--peach)] grid place-items-center shrink-0">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#8A8175] font-bold block">01 · YOUR VISION</span>
                    <b className="text-xs font-bold block mt-0.5">Start with your idea</b>
                    <p className="text-[11px] text-[#8A8175] m-0 mt-0.5">A little about where you want to go.</p>
                  </div>
                </div>

                <div className="text-left p-3.5 rounded-2xl border flex items-start gap-3 border-transparent">
                  <div className="w-9 h-10 rounded-xl bg-[var(--mint-bg)] text-[var(--mint)] grid place-items-center shrink-0">
                    <RouteIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#8A8175] font-bold block">02 · YOUR RHYTHM</span>
                    <b className="text-xs font-bold block mt-0.5">Make it work for you</b>
                    <p className="text-[11px] text-[#8A8175] m-0 mt-0.5">Your time. Your tools. Your way.</p>
                  </div>
                </div>

                <div className="text-left p-3.5 rounded-2xl border flex items-start gap-3 border-transparent">
                  <div className="w-9 h-10 rounded-xl bg-[var(--lilac-bg)] text-[var(--lilac)] grid place-items-center shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#8A8175] font-bold block">03 · YOUR PATH</span>
                    <b className="text-xs font-bold block mt-0.5">Find your next step</b>
                    <p className="text-[11px] text-[#8A8175] m-0 mt-0.5">From big possibility to clear plan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Question 1 - Big Picture Goal (Textarea) */}
          {stepIndex === 1 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[var(--y)]">
                  THE BIG PICTURE
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  What would success look like, {userName || 'friend'}?
                </h1>
                <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  A little clarity now makes every following step easier and faster to complete.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { title: 'Build an app', goal: 'Build an app or website', tone: 'bg-[#eaf4ff] border-[#cfe4ff] dark:bg-[#18283b] dark:border-[#29425c]' },
                  { title: 'Grow a business', goal: 'Grow a business or startup', tone: 'bg-[#fff4d5] border-[#f1dfaa] dark:bg-[#332b18] dark:border-[#5b4b27]' },
                  { title: 'Learn a skill', goal: 'Learn a new skill and reach a practical level', tone: 'bg-[#e9f8ef] border-[#ccebd8] dark:bg-[#172d23] dark:border-[#2d5941]' },
                  { title: 'Launch a product', goal: 'Design, validate, and launch a product', tone: 'bg-[#f0ebff] border-[#ddd2ff] dark:bg-[#251f39] dark:border-[#45356d]' },
                  { title: 'Create something', goal: 'Create and share something meaningful', tone: 'bg-[#ffece5] border-[#f7d2c3] dark:bg-[#38231e] dark:border-[#694032]' },
                  { title: 'Something else', goal: '', tone: 'bg-white border-[#e7e0d3] dark:bg-[#14120d] dark:border-[#2a2620]' },
                ].map((option) => (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() => setGoalQuery(option.goal)}
                    className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition-all hover:-translate-y-0.5 ${option.tone} ${goalQuery === option.goal ? 'ring-2 ring-[var(--y)] border-[var(--y)]' : ''}`}
                  >
                    {option.title}
                    <span className="block text-[10px] font-normal opacity-70 mt-1">{option.goal || 'Describe your own goal below'}</span>
                  </button>
                ))}
              </div>

              <p className={`text-xs ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>Choose a starting point or add a little detail below. You can continue without writing a long description.</p>

              <textarea
                rows={3}
                value={goalQuery}
                onChange={(e) => setGoalQuery(e.target.value)}
                placeholder="I want to build and launch a responsive application that solves..."
                className={`w-full p-4 rounded-2xl border text-sm outline-none focus:border-[var(--y)] focus:ring-2 focus:ring-[var(--y)]/20 resize-none ${
                  isDark ? 'bg-[#14120D] border-[#2A2620] text-white placeholder-[#686154]' : 'bg-white border-[#E7E0D3] text-neutral-900 placeholder-[#9C9385]'
                }`}
              />

              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                <span className="text-xs text-[#8A8175]">One small step closer.</span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* GEMINI-ADAPTIVE QUESTION PAGES: each answer determines the next question. */}
          {(stepIndex === 2 || stepIndex === 3) && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[var(--mint)]">
                  {stepIndex === 2 ? 'DISCOVERING YOUR PRIORITIES' : 'TAILORING YOUR PLAN'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{isGeneratingAdaptiveQuestion ? 'Thinking about your answers…' : adaptiveQuestion.question}</h1>
                <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>{adaptiveQuestion.helperText}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {adaptiveQuestion.options.map((option, index) => {
                  const colors = [
                    'bg-[#eaf4ff] border-[#cfe4ff] dark:bg-[#18283b] dark:border-[#29425c]',
                    'bg-[#fff4d5] border-[#f1dfaa] dark:bg-[#332b18] dark:border-[#5b4b27]',
                    'bg-[#e9f8ef] border-[#ccebd8] dark:bg-[#172d23] dark:border-[#2d5941]',
                    'bg-[#f0ebff] border-[#ddd2ff] dark:bg-[#251f39] dark:border-[#45356d]',
                    'bg-[#ffece5] border-[#f7d2c3] dark:bg-[#38231e] dark:border-[#694032]',
                  ];
                  return (
                    <button key={option.value} type="button" disabled={isGeneratingAdaptiveQuestion} onClick={() => handleAdaptiveChoice(option)}
                      className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${colors[index % colors.length]}`}>
                      <span className="flex items-center justify-between gap-2 text-sm font-bold text-[var(--t)]">
                        {option.label}<ArrowRight className="w-4 h-4 shrink-0" />
                      </span>
                      {option.description && <span className="block mt-1.5 text-xs leading-relaxed text-[var(--m)]">{option.description}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                <span className="text-xs text-[#8A8175]">Question {stepIndex} of 3 · Your answers shape the next page</span>
                <button type="button" onClick={handleBack} className={`px-4 py-2.5 rounded-xl border text-xs font-semibold ${isDark ? 'border-[#2A2620] text-[#8A8175]' : 'border-[#E7E0D3] text-[#6B6358]'}`}>
                  Back
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Question 4 - Pacing & Time Commitment (3-Column Time Options) */}
          {stepIndex === 4 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[var(--lilac)]">
                  YOUR RHYTHM
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  How much time feels right each week?
                </h1>
                <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  A plan that fits your life. Not the other way around.
                </p>
              </div>

              {/* 3-Column Time Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'A few hours', sub: 'Gentle side project', cadence: 'month' },
                  { id: '5–10 hours', sub: 'Balanced steady pace', cadence: '2weeks' },
                  { id: '10+ hours', sub: 'Fast immersion sprint', cadence: 'sprint' }
                ].map((opt) => {
                  const isSelected = selectedTimeOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedTimeOption(opt.id);
                        setSelectedCadence(opt.cadence);
                      }}
                      className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[130px] relative cursor-pointer ${
                        isSelected
                          ? 'border-[var(--y)] ring-2 ring-[var(--y)]/25 ' + (isDark ? 'bg-[#1C1A14]' : 'bg-[#FFFDF7]')
                          : (isDark ? 'bg-[#14120D] hover:bg-[#1A1813] border-[#2A2620]' : 'bg-white hover:bg-[#FAF6EC] border-[#E7E0D3]')
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Clock3 className={`w-5 h-5 ${isSelected ? 'text-[var(--y)]' : 'text-[#8A8175]'}`} />
                        <div className={`w-4 h-4 rounded-full border grid place-items-center ${
                          isSelected ? 'bg-[var(--y)] border-[var(--y)] text-[#171717]' : (isDark ? 'border-[#3D372E]' : 'border-[#D5CDBD]')
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div>
                        <b className={`block text-sm font-bold ${
                          isSelected ? (isDark ? 'text-white' : 'text-neutral-900') : (isDark ? 'text-[#D0C8B8]' : 'text-[#2D2820]')
                        }`}>
                          {opt.id}
                        </b>
                        <span className="text-[11px] text-[#8A8175] block mt-0.5">{opt.sub}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                <span className="text-xs text-[#8A8175]">Target weekly rhythm.</span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>Synthesize Roadmap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Execution Roadmap Step Arranger (Reorder, toggle, edit, add custom steps) */}
          {stepIndex === 5 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[var(--y)]">
                    DYNAMIC EXECUTION ROADMAP
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Arrange & prioritize your roadmap steps:
                  </h1>
                  <p className={`text-sm ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                    Generated dynamically for {goalQuery || 'your project'}. Use arrows to arrange step sequence.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void synthesizeStepsWithAi()}
                  disabled={isAiSynthesizing}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                    isDark ? 'border-[#2A2620] bg-[#17150F] hover:bg-[#201D17]' : 'border-[#E7E0D3] bg-white hover:bg-neutral-100'
                  }`}
                  title="Regenerate steps with Gemini AI"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiSynthesizing ? 'animate-spin text-[var(--y)]' : 'text-[#8A8175]'}`} />
                  <span className="hidden sm:inline">{isAiSynthesizing ? 'Synthesizing…' : 'AI Regenerate'}</span>
                </button>
              </div>

              {/* Arranged Steps List */}
              <div className="space-y-3">
                {arrangedSteps.map((step, idx) => {
                  const isEditing = editingStepId === step.id;
                  return (
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
                            {step.tools && step.tools.length > 0 && (
                              <span className="text-[9.5px] px-2 py-0.2 rounded bg-neutral-500/10 text-[#8A8175] font-mono">
                                {step.tools.join(' · ')}
                              </span>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                value={editingStepTitle}
                                onChange={(e) => setEditingStepTitle(e.target.value)}
                                className={`flex-1 px-2.5 py-1 text-xs rounded-lg border outline-none ${
                                  isDark ? 'bg-[#1E1B15] border-[#3D372E] text-white' : 'bg-white border-[#C8BFB0] text-black'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => saveEditStep(step.id)}
                                className="px-2 py-1 rounded bg-[var(--y)] text-[#171717] font-bold text-[11px] cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <h4 
                              onClick={() => startEditStep(step)}
                              title="Click to edit title"
                              className={`text-xs sm:text-[13.5px] font-bold mt-1 mb-0.5 cursor-pointer hover:underline ${
                                isDark ? 'text-white' : 'text-neutral-900'
                              }`}
                            >
                              {step.title}
                            </h4>
                          )}

                          <p className="text-[11.5px] text-[#8A8175] m-0">
                            {step.why}
                          </p>
                        </div>
                      </div>

                      {/* Step Arrangement Arrows (Up / Down) */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => startEditStep(step)}
                          title="Edit step title"
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isDark ? 'border-[#2A2620] hover:bg-[#1F1C15] text-[#8A8175]' : 'border-[#E7E0D3] hover:bg-neutral-100 text-[#6B6358]'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
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
                  );
                })}
              </div>

              {/* Add Custom Step Form */}
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

              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={handleBack}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    isDark ? 'border-[#2A2620] hover:bg-[#1E1B15] text-[#8A8175]' : 'border-[#E7E0D3] hover:bg-neutral-100 text-[#6B6358]'
                  }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex(6)}
                  className="px-6 py-2.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 ml-auto"
                >
                  <span>See My Roadmap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Result / Roadmap Milestone Timeline (from roadmap-refined) */}
          {stepIndex === 6 && (
            <div className="space-y-6">
              {/* Heading */}
              <div className="space-y-1">
                <span className="text-xs font-mono tracking-[0.16em] uppercase font-bold text-[var(--mint)]">
                  YOUR NEXT CHAPTER
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  A little clearer.<br />
                  <span className="text-[var(--y)]">A lot more possible.</span>
                </h1>
                <p className={`text-xs ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                  {goalQuery || 'Project Roadmap'} · {selectedTimeOption} each week
                </p>
              </div>

              {/* Goal Quote Block */}
              {goalQuery && (
                <blockquote className="border-l-2 border-[var(--y)] pl-4 py-1 italic text-sm text-[#8A8175]">
                  “{goalQuery}”
                </blockquote>
              )}

              {/* Path Heading with Milestones count */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] text-xs text-[#8A8175] font-semibold">
                <span>YOUR PATH</span>
                <span>{completedCount} / {arrangedSteps.filter(s => s.enabled).length} milestones complete</span>
              </div>

              {/* Interactive Timeline */}
              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-[var(--line)]">
                {arrangedSteps.filter(s => s.enabled).map((step, idx) => {
                  const isDone = completedMilestoneIds[step.id];
                  return (
                    <div key={step.id} className="relative flex items-start gap-4">
                      {/* Milestone Number Button (Clickable to mark complete) */}
                      <button
                        type="button"
                        onClick={() => toggleMilestoneComplete(step.id)}
                        className={`absolute -left-6 w-5 h-5 rounded-full border grid place-items-center text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                          isDone 
                            ? 'bg-[var(--mint)] border-[var(--mint)] text-black' 
                            : isDark ? 'bg-[#181612] border-[#3D372E] text-white hover:border-[var(--y)]' : 'bg-white border-[#C8BFB0] text-neutral-800 hover:border-[var(--y)]'
                        }`}
                        title="Click to toggle milestone completion"
                      >
                        {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                      </button>

                      <div className="min-w-0 flex-1 pl-2">
                        <span className="text-[9.5px] font-mono uppercase text-[#8A8175] font-bold block">
                          {idx === 0 ? 'START HERE · PHASE 1' : `MILESTONE ${idx + 1}`}
                        </span>
                        <h3 className={`text-sm sm:text-base font-bold mt-0.5 ${
                          isDone ? 'line-through text-[#8A8175]' : (isDark ? 'text-white' : 'text-neutral-900')
                        }`}>
                          {step.title}
                        </h3>
                        <p className="text-xs text-[#8A8175] leading-relaxed mt-1">
                          {step.why}
                        </p>
                        {step.tools && step.tools.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {step.tools.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-neutral-500/10 font-mono text-[#8A8175]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStepIndex(1)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    isDark ? 'border-[#2A2620] hover:bg-[#1E1B15] text-[#8A8175]' : 'border-[#E7E0D3] hover:bg-neutral-100 text-[#6B6358]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Refine my answers</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={exportPlan}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'border-[#2A2620] hover:bg-[#1E1B15] text-[#8A8175]' : 'border-[#E7E0D3] hover:bg-neutral-100 text-[#6B6358]'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishAndImplementIntoTasks}
                    className="px-5 py-2.5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Implement into Tasks →</span>
                  </button>
                </div>
              </div>

              <p className="text-center text-[11px] text-[#8A8175] m-0">
                A starting path for your project. Yours to shape as you go.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* 3. APP FOOTER */}
      <footer className={`w-full px-6 sm:px-12 py-3 border-t flex items-center justify-between text-[11px] text-[#8A8175] shrink-0 ${
        isDark ? 'border-[#25221B] bg-[#12110D]' : 'border-[#E7E0D3] bg-[#F7F3EA]'
      }`}>
        <span>
          <b className={isDark ? 'text-white' : 'text-neutral-900'}>bob.</b> A little guidance. A world of possibilities.
        </span>
        <span className="hidden sm:inline">
          {arrangedSteps.filter(s => s.enabled).length} milestones · Synchronized to your workspace
        </span>
      </footer>
    </div>
  );
};
