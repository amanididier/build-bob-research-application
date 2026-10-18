import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Check, Lock, Sparkles, Star } from 'lucide-react';
import { TaskStepExecutionView } from '../../components/roadmap/TaskStepExecutionView';
import type { PhasedTask } from '../../components/roadmap/RoadmapWizardModal';

interface TasksViewProps {
  isSidePanel?: boolean;
}

const PHASED_KEY = 'bob_phased_tasks_v1';
const COMPLETED_KEY = 'bob_phased_completed_v1';
const STARS_KEY = 'bob_roadmap_stars_v1';

function loadPhased(projectId: string): PhasedTask[] | null {
  try {
    const all = JSON.parse(localStorage.getItem(PHASED_KEY) || '{}');
    if (Array.isArray(all[projectId])) return all[projectId];

    // Migrate/read the adaptive RoadmapSheet's canonical roadmap for this project.
    const roadmap = JSON.parse(localStorage.getItem('bob_phased_roadmap_v2') || 'null');
    if (
      roadmap &&
      (!roadmap.projectId || roadmap.projectId === projectId) &&
      Array.isArray(roadmap.tasks)
    ) {
      return roadmap.tasks;
    }
    return null;
  } catch {
    return null;
  }
}

function savePhased(projectId: string, tasks: PhasedTask[]) {
  try {
    const all = JSON.parse(localStorage.getItem(PHASED_KEY) || '{}');
    all[projectId] = tasks;
    localStorage.setItem(PHASED_KEY, JSON.stringify(all));
  } catch {}
}

function loadCompleted(projectId: string): string[] {
  try {
    const all = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '{}');
    return all[projectId] || [];
  } catch {
    return [];
  }
}

function saveCompleted(projectId: string, ids: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '{}');
    all[projectId] = ids;
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(all));
  } catch {}
}

function loadStars(projectId: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(STARS_KEY) || '{}');
    return Number(all[projectId]) || 0;
  } catch {
    return 0;
  }
}

function saveStars(projectId: string, n: number) {
  try {
    const all = JSON.parse(localStorage.getItem(STARS_KEY) || '{}');
    all[projectId] = Math.min(5, n);
    localStorage.setItem(STARS_KEY, JSON.stringify(all));
  } catch {}
}

/** Demo seed only when no stored roadmap — short titles */
const SEED: PhasedTask[] = [
  {
    id: 'pt-1',
    phase: 'Phase 1',
    title: 'Understand the problem',
    estimatedTime: '30 mins',
    priority: 1,
    steps: [
      {
        id: 's-1',
        stepNumber: 1,
        title: 'Watch a short video on the topic',
        instruction: 'Open one of the links and watch the parts that match your goal. Write down two things that surprised you.',
        tool: 'youtube',
        links: [
          {
            title: 'YouTube search for this topic',
            url: 'https://youtube.com/results?search_query=research+planning+basics',
          },
        ],
      },
      {
        id: 's-2',
        stepNumber: 2,
        title: 'Ask ChatGPT three focused questions',
        instruction: 'Copy each prompt, paste it into ChatGPT, and save the best answers as notes.',
        tool: 'chatgpt',
        prompts: [
          'What are the main reasons people struggle with this problem?',
          'What is a simple first version I can finish this week?',
          'What should I ignore so I stay focused?',
        ],
      },
      {
        id: 's-3',
        stepNumber: 3,
        title: 'Write a one-sentence goal',
        instruction: 'In plain words, write what “done” looks like for this project. Keep it under 20 words.',
        tool: 'docs',
      },
    ],
  },
  {
    id: 'pt-2',
    phase: 'Phase 2',
    title: 'Build the first version',
    estimatedTime: '1 hour',
    priority: 2,
    steps: [
      {
        id: 's-4',
        stepNumber: 1,
        title: 'Make a tiny prototype',
        instruction: 'Build the smallest thing that shows the idea works. Skip polish for now.',
        tool: 'claude_code',
      },
      {
        id: 's-5',
        stepNumber: 2,
        title: 'Test with one real example',
        instruction: 'Run your prototype on one real case and note what broke.',
        tool: 'other',
      },
    ],
  },
  {
    id: 'pt-3',
    phase: 'Phase 3',
    title: 'Check and share',
    estimatedTime: '20 mins',
    priority: 3,
    steps: [
      {
        id: 's-6',
        stepNumber: 1,
        title: 'Review against your goal',
        instruction: 'Compare the result to your one-sentence goal. List one fix if something is missing.',
        tool: 'docs',
      },
    ],
  },
];

export const TasksView: React.FC<TasksViewProps> = ({ isSidePanel = false }) => {
  const {
    tasks,
    toggleTask,
    activeResearchId,
    projects,
    triggerThinking,
    sendMessage,
    navigateTo,
    messages,
  } = useApp();

  const project = projects.find((p) => p.id === activeResearchId) || projects[0];
  const projectId = project?.id || 'default';

  const [phasedTasks, setPhasedTasks] = useState<PhasedTask[]>(() => loadPhased(projectId) || []);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => loadCompleted(projectId));
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [stars, setStars] = useState(() => loadStars(projectId));
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasRoadmap, setHasRoadmap] = useState(() => (loadPhased(projectId) || []).length > 0);

  useEffect(() => {
    const loaded = loadPhased(projectId);
    const done = loadCompleted(projectId);
    setPhasedTasks(loaded || []);
    setCompletedTaskIds(done);
    setStars(loadStars(projectId));
    setHasRoadmap(!!(loaded && loaded.length));
    setActiveTaskIndex(0);
  }, [projectId]);

  // Keep the sequential execution view connected to the adaptive RoadmapSheet.
  // RoadmapSheet persists the full plan before emitting these events.
  useEffect(() => {
    const syncRoadmap = () => {
      try {
        const raw = localStorage.getItem('bob_phased_roadmap_v2');
        if (!raw) return;
        const roadmap = JSON.parse(raw);
        if (roadmap?.projectId && roadmap.projectId !== projectId) return;
        if (!Array.isArray(roadmap?.tasks)) return;

        const loaded = roadmap.tasks as PhasedTask[];
        setPhasedTasks(loaded);
        savePhased(projectId, loaded);
        setHasRoadmap(loaded.length > 0);
        setCompletedTaskIds((previous) => {
          const validIds = new Set(loaded.map((task) => task.id));
          const next = previous.filter((id) => validIds.has(id));
          saveCompleted(projectId, next);
          return next;
        });
        setActiveTaskIndex(0);
      } catch (error) {
        console.warn('[Bob roadmap] Could not sync roadmap into the execution view:', error);
      }
    };

    window.addEventListener('bob:roadmap-updated', syncRoadmap);
    window.addEventListener('bob:roadmap-finished', syncRoadmap);
    window.addEventListener('bob-roadmap-saved', syncRoadmap);
    return () => {
      window.removeEventListener('bob:roadmap-updated', syncRoadmap);
      window.removeEventListener('bob:roadmap-finished', syncRoadmap);
      window.removeEventListener('bob-roadmap-saved', syncRoadmap);
    };
  }, [projectId]);

  const phaseCount = phasedTasks.length;
  const usePhases = phaseCount > 1;
  const totalSteps = phasedTasks.reduce((n, p) => n + p.steps.length, 0);

  /** Stars: max 5, spread evenly across phases (or steps if single phase) */
  const starsFromProgress = useMemo(() => {
    if (phaseCount === 0) return 0;
    const finished = completedTaskIds.length;
    if (phaseCount === 1) {
      // single phase → stars by step ratio
      const steps = phasedTasks[0]?.steps.length || 1;
      // approximate via completed phases only in this model
      return finished >= 1 ? 5 : 0;
    }
    return Math.min(5, Math.round((finished / phaseCount) * 5));
  }, [completedTaskIds, phaseCount, phasedTasks]);

  const displayStars = Math.max(stars, starsFromProgress);

  const handleTaskCompleted = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      if (prev.includes(taskId)) return prev;
      const next = [...prev, taskId];
      saveCompleted(projectId, next);
      const finished = next.length;
      const earned =
        phaseCount <= 1
          ? 5
          : Math.min(5, Math.round((finished / phaseCount) * 5));
      setStars(earned);
      saveStars(projectId, earned);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2200);
      if (activeTaskIndex < phasedTasks.length - 1) {
        setActiveTaskIndex((i) => i + 1);
      }
      triggerThinking('Phase complete', `You earned progress stars (${earned}/5).`, 'Nice work');
      return next;
    });
  };

  const handleAskBobHelp = (query: string) => {
    navigateTo('research', 'chat');
    sendMessage(`Help me with this step: ${query}`);
  };

  const openCreateRoadmap = () => {
    const recentContext = [
      project?.title ? `Active project: ${project.title}` : '',
      ...(messages || [])
        .slice(-10)
        .map((message) => `${message.role === 'user' ? 'User' : 'Bob'}: ${message.text}`),
    ]
      .filter(Boolean)
      .join('\\n')
      .slice(-4500);

    // Use the adaptive, AI-powered roadmap flow that is shared with TasksPage,
    // the tools menu, and research chat instead of the legacy prefilled wizard.
    window.dispatchEvent(new CustomEvent('bob-open-roadmap', {
      detail: {
        // Keep the goal blank: a project name is context, not the user's actual goal.
        context: recentContext,
        origin: 'tasks',
        projectId,
      },
    }));
  };

  const seedDemo = () => {
    setPhasedTasks(SEED);
    savePhased(projectId, SEED);
    setHasRoadmap(true);
    setCompletedTaskIds([]);
    saveCompleted(projectId, []);
    setActiveTaskIndex(0);
  };

  // Empty state — no roadmap yet
  if (!hasRoadmap || phasedTasks.length === 0) {
    return (
      <div className={`mx-auto ${isSidePanel ? 'px-1' : 'max-w-[560px]'} min-h-[50vh] flex flex-col items-center justify-center py-16 px-4`}>
        <div className="w-14 h-14 rounded-2xl bg-[var(--y)]/20 text-[#b88900] grid place-items-center mb-5">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-[20px] font-semibold text-[var(--t)] m-0 text-center tracking-tight">
          No plan yet
        </h2>
        <p className="mt-2 text-[13px] text-[var(--m)] text-center max-w-sm m-0 leading-relaxed">
          Create a roadmap with clear steps. Bob will ask a few short questions so the plan fits what you want to do.
        </p>
        <button
          type="button"
          onClick={openCreateRoadmap}
          className="mt-6 h-11 px-6 rounded-full bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[14px] font-semibold shadow-sm"
        >
          Create roadmap
        </button>
        <button
          type="button"
          onClick={seedDemo}
          className="mt-3 text-[12px] font-medium text-[var(--m)] hover:text-[var(--t)]"
        >
          Preview sample steps
        </button>


      </div>
    );
  }

  const current = phasedTasks[activeTaskIndex] || phasedTasks[0];

  return (
    <div className={`relative mx-auto ${isSidePanel ? 'px-1 pb-8' : 'max-w-[640px] py-4 pb-24'}`}>
      {/* Confetti burst */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div className="relative bg-white dark:bg-[var(--s)] rounded-[24px] px-8 py-7 shadow-2xl text-center animate-in zoom-in-95 fade-in duration-200">
            <div className="flex justify-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-7 h-7 ${i < displayStars ? 'text-[var(--y)] fill-[var(--y)]' : 'text-neutral-300'}`}
                />
              ))}
            </div>
            <p className="text-[18px] font-bold text-[var(--t)] m-0">Nice work!</p>
            <p className="text-[13px] text-[var(--m)] mt-1 m-0">
              {displayStars}/5 stars · phase unlocked
            </p>
          </div>
        </div>
      )}

      {/* Slim top: stars + short description — no bulky titles */}
      <div className="flex items-center justify-between gap-3 mb-4 px-0.5">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < displayStars ? 'text-[var(--y)] fill-[var(--y)]' : 'text-neutral-300 dark:text-neutral-600'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={openCreateRoadmap}
          className="text-[12px] font-semibold text-[var(--m)] hover:text-[var(--t)]"
        >
          New roadmap
        </button>
      </div>

      <p className="text-[13px] text-[var(--m)] m-0 mb-5 leading-relaxed">
        {usePhases
          ? `For this project you have ${phaseCount} phases (${totalSteps} steps). Finish one phase to unlock the next.`
          : `For this project you have ${totalSteps} steps to follow.`}
      </p>

      {/* Phase dots — locked ahead */}
      {usePhases && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {phasedTasks.map((pt, idx) => {
            const unlocked = idx <= activeTaskIndex || completedTaskIds.includes(pt.id);
            const finished = completedTaskIds.includes(pt.id);
            const active = idx === activeTaskIndex;
            return (
              <button
                key={pt.id}
                type="button"
                disabled={!unlocked && !finished}
                onClick={() => {
                  if (unlocked || finished) setActiveTaskIndex(idx);
                }}
                className={`shrink-0 h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 border transition-all ${
                  finished
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : active
                      ? 'bg-[var(--y)] border-[var(--y)] text-[#171717]'
                      : unlocked
                        ? 'bg-[var(--s)] border-[var(--line)] text-[var(--t)]'
                        : 'bg-[var(--s2)] border-transparent text-[var(--m)] opacity-60 cursor-not-allowed'
                }`}
              >
                {finished ? (
                  <Check className="w-3.5 h-3.5" />
                ) : !unlocked ? (
                  <Lock className="w-3 h-3" />
                ) : null}
                {pt.phase}
              </button>
            );
          })}
        </div>
      )}

      <TaskStepExecutionView
        task={current}
        allTasks={phasedTasks}
        onTaskCompleted={handleTaskCompleted}
        onRequestHelp={handleAskBobHelp}
      />

      {/* Optional simple checklist of loose tasks */}
      {tasks.filter((t) => t.projectId === projectId).length > 0 && (
        <div className="mt-10 pt-6 border-t border-[var(--line)]">
          <p className="text-[12px] font-semibold text-[var(--m)] m-0 mb-3">Also on your list</p>
          <ul className="m-0 p-0 list-none space-y-1.5">
            {tasks
              .filter((t) => t.projectId === projectId)
              .slice(0, 8)
              .map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[var(--s2)] text-left"
                  >
                    {t.completed ? (
                      <span className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white grid place-items-center">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="w-4.5 h-4.5 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                    )}
                    <span
                      className={`text-[13px] ${t.completed ? 'text-[var(--m)] line-through' : 'text-[var(--t)]'}`}
                    >
                      {t.title}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <RoadmapWizardModal
        isOpen={isRoadmapWizardOpen}
        onClose={() => setIsRoadmapWizardOpen(false)}
        onFinishRoadmap={(data) => {
          const tasksOut = data.tasks?.length ? data.tasks : SEED;
          setPhasedTasks(tasksOut);
          savePhased(projectId, tasksOut);
          setHasRoadmap(true);
          setCompletedTaskIds([]);
          saveCompleted(projectId, []);
          setStars(0);
          saveStars(projectId, 0);
          setActiveTaskIndex(0);
          data.tasks?.forEach((t) => addTask(t.title, data.deadline, projectId));
          setIsRoadmapWizardOpen(false);
        }}
      />
    </div>
  );
};
