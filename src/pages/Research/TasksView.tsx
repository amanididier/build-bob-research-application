import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Filter, 
  Calendar, 
  Sparkles, 
  Lock, 
  Layers, 
  ArrowRight,
  ListTodo
} from 'lucide-react';
import { TaskStepExecutionView } from '../../components/roadmap/TaskStepExecutionView';
import { RoadmapWizardModal, PhasedTask } from '../../components/roadmap/RoadmapWizardModal';

interface TasksViewProps {
  isSidePanel?: boolean;
}

export const TasksView: React.FC<TasksViewProps> = ({ isSidePanel = false }) => {
  const { tasks, toggleTask, activeResearchId, projects, addTask, triggerThinking, sendMessage, navigateTo } = useApp();
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'step_execution' | 'list'>('step_execution');
  const [isRoadmapWizardOpen, setIsRoadmapWizardOpen] = useState(false);

  // Active phased roadmap tasks
  const [phasedTasks, setPhasedTasks] = useState<PhasedTask[]>([
    {
      id: 'pt-1',
      phase: 'Phase 1: Architecture & TTS Research',
      title: 'Analyze TTS models & evaluate latency benchmarks',
      estimatedTime: '45 mins',
      priority: 1,
      steps: [
        {
          id: 's-1',
          stepNumber: 1,
          title: 'Watch TTS & Streaming Audio Architectural breakdown',
          instruction: 'Watch suggested high-yield video breakdowns on how modern real-time Web Audio and speech synthesis pipelines achieve sub-500ms voice output.',
          tool: 'youtube',
          links: [
            { title: 'YouTube: Ultra-low latency TTS streaming architectures', url: 'https://youtube.com/results?search_query=low+latency+tts+streaming+architecture' },
            { title: 'YouTube: Web Audio API & AudioBuffer worklets deep dive', url: 'https://youtube.com/results?search_query=web+audio+api+streaming+playback' }
          ]
        },
        {
          id: 's-2',
          stepNumber: 2,
          title: 'Plan integration prompts with ChatGPT / Claude',
          instruction: 'Prompt your AI reasoning model using the structured deep inquiry prompts below. Click Copy to clipboard on each prompt.',
          tool: 'chatgpt',
          prompts: [
            'How does streaming TTS work under the hood and which lightweight models or Web Speech fallbacks work best for immediate feedback?',
            'Which streaming architecture delivers faster Time-To-First-Byte (TTFB) and feels genuinely real-time to users?',
            'How do I integrate a zero-latency audio buffer and speech synthesizer directly into my Bob Companion project?',
            'Create for me a strong complete prompt to provide my building AI (Claude Code) including verification tests and error boundaries.'
          ]
        },
        {
          id: 's-3',
          stepNumber: 3,
          title: 'Execute implementation prompts in Claude Code',
          instruction: 'Paste the generated prompts into Claude Code in your terminal. Paste them one at a time and run the verification tests between each step.',
          tool: 'claude_code'
        }
      ]
    },
    {
      id: 'pt-2',
      phase: 'Phase 2: Local Audio Pipeline Integration',
      title: 'Connect Web Audio Chime generator & synthesis fallback',
      estimatedTime: '1 hour',
      priority: 2,
      steps: [
        {
          id: 's-4',
          stepNumber: 1,
          title: 'Verify audio worklet and chime frequencies',
          instruction: 'Test dual harmonic chime oscillators (659Hz, 830Hz, 987Hz) for proactive speech rings.',
          tool: 'docs'
        },
        {
          id: 's-5',
          stepNumber: 2,
          title: 'Benchmark memory allocation',
          instruction: 'Ensure Web Audio context never leaks oscillators and handles browser autoplay policies.',
          tool: 'chatgpt'
        }
      ]
    },
    {
      id: 'pt-3',
      phase: 'Phase 3: End-to-End User Verification',
      title: 'Validate 45s proactive speech ring and focus pacing',
      estimatedTime: '30 mins',
      priority: 3,
      steps: [
        {
          id: 's-6',
          stepNumber: 1,
          title: 'Simulate idle and active tab transitions',
          instruction: 'Trigger the green outer arc and verify the 45-second timer transitions smoothly to white if unanswered.',
          tool: 'other'
        }
      ]
    }
  ]);

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [activeTaskIndex, setActiveTaskIndex] = useState<number>(0);

  const handleTaskCompleted = (taskId: string) => {
    setCompletedTaskIds((prev) => [...prev, taskId]);
    if (activeTaskIndex < phasedTasks.length - 1) {
      setActiveTaskIndex((prev) => prev + 1);
    }
  };

  const handleAskBobHelp = (query: string) => {
    triggerThinking('Analyzing Blockage', 'Bob is reading your open tabs and codebase context...', 'Synthesizing unblocker');
    navigateTo('research', 'chat');
    sendMessage(query);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterMode === 'pending') return !t.completed;
    if (filterMode === 'completed') return t.completed;
    return true;
  });

  const currentActivePhasedTask = phasedTasks[activeTaskIndex] || phasedTasks[0];

  return (
    <div className={isSidePanel ? "w-full py-1 pb-6" : "max-w-[880px] mx-auto py-2 pb-24"}>
      {/* Header */}
      {!isSidePanel && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 pb-6 border-b border-[var(--line)] mb-6">
          <div>
            <div className="text-[10px] tracking-[0.08em] text-[var(--m)] uppercase font-semibold">
              RESEARCH ROADMAP & SEQUENTIAL EXECUTION
            </div>
            <h1 className="text-2xl sm:text-3xl tracking-tight font-extrabold my-1.5 text-[var(--t)]">
              Tasks & Action Plans
            </h1>
            <p className="text-[var(--m)] text-xs leading-relaxed max-w-[620px] m-0">
              Tasks are sequentially paced. To unlock phase 2, confirm completion of phase 1 steps to stay focused and eliminate overwhelm.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsRoadmapWizardOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Roadmap</span>
            </button>
          </div>
        </div>
      )}

      {isSidePanel && (
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--line)]">
          <div>
            <span className="text-[9px] font-bold text-[var(--m)] uppercase tracking-wider block">Roadmap Steps</span>
            <span className="text-xs font-bold text-[var(--t)]">{currentActivePhasedTask.phase}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsRoadmapWizardOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-[var(--y)] text-[#171717] font-bold text-[10px] flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Roadmap</span>
          </button>
        </div>
      )}

      {/* Mode Switcher (Step Guidance vs Full List) */}
      <div className="flex items-center justify-between gap-3 mb-6 bg-[var(--s)] p-1.5 rounded-2xl border border-[var(--line)]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('step_execution')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'step_execution'
                ? 'bg-[var(--y)] text-[#171717] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Step-by-Step Guidance (Phase {activeTaskIndex + 1})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-[var(--s2)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>All Tasks ({tasks.length})</span>
          </button>
        </div>

        {/* Phase Pill Progress */}
        <div className="flex items-center gap-1.5 pr-2">
          {phasedTasks.map((pt, idx) => {
            const isUnlocked = idx <= activeTaskIndex;
            const isFinished = completedTaskIds.includes(pt.id);

            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => {
                  if (isUnlocked) {
                    setActiveTaskIndex(idx);
                    setViewMode('step_execution');
                  }
                }}
                disabled={!isUnlocked}
                className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all ${
                  isFinished
                    ? 'bg-[var(--g)] text-white'
                    : idx === activeTaskIndex
                    ? 'bg-[var(--y)] text-[#171717]'
                    : isUnlocked
                    ? 'bg-[var(--s2)] text-[var(--t)]'
                    : 'bg-[var(--s2)]/40 text-[var(--m)] opacity-40 cursor-not-allowed'
                }`}
                title={pt.title}
              >
                {isFinished ? '✓' : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected View */}
      {viewMode === 'step_execution' ? (
        <TaskStepExecutionView
          task={currentActivePhasedTask}
          allTasks={phasedTasks}
          onTaskCompleted={handleTaskCompleted}
          onRequestHelp={handleAskBobHelp}
        />
      ) : (
        /* Full Task List View */
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <span className="text-xs font-bold text-[var(--t)]">Task Milestones</span>
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'completed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    filterMode === mode
                      ? 'bg-[var(--s2)] text-[var(--t)]'
                      : 'text-[var(--m)] hover:text-[var(--t)]'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="py-3.5 flex items-start gap-3.5 cursor-pointer group hover:bg-[var(--s2)]/40 -mx-3 px-3 rounded-xl transition-colors"
              >
                <button
                  type="button"
                  className="mt-0.5 text-neutral-400 group-hover:text-[var(--y)] transition-colors shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--g)] fill-current" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <b className={`text-xs block font-semibold ${task.completed ? 'line-through text-[var(--m)]' : 'text-[var(--t)]'}`}>
                      {task.title}
                    </b>
                    <span className="text-[10px] text-[var(--m)] font-mono flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3 text-[var(--m)]" />
                      {task.dueDate}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--m)] mt-1">
                    {task.sourceConnection} · Linked to active study
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap Wizard Modal */}
      <RoadmapWizardModal
        isOpen={isRoadmapWizardOpen}
        onClose={() => setIsRoadmapWizardOpen(false)}
        onFinishRoadmap={(data) => {
          setPhasedTasks(data.tasks);
          setActiveTaskIndex(0);
          setViewMode('step_execution');
          data.tasks.forEach((t) => {
            addTask(t.title, data.deadline);
          });
        }}
      />
    </div>
  );
};
