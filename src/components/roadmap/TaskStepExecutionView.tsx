import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Copy, 
  Check, 
  Youtube, 
  Terminal, 
  Sparkles, 
  Lock, 
  ArrowRight,
  Clock,
  Play
} from 'lucide-react';
import { PhasedTask } from './RoadmapWizardModal';
import { TaskUnlockModal } from './TaskUnlockModal';
import { useApp } from '../../context/AppContext';

interface TaskStepExecutionViewProps {
  task: PhasedTask;
  allTasks: PhasedTask[];
  onTaskCompleted: (taskId: string) => void;
  onRequestHelp?: (topic: string) => void;
}

export const TaskStepExecutionView: React.FC<TaskStepExecutionViewProps> = ({
  task,
  allTasks,
  onTaskCompleted,
  onRequestHelp,
}) => {
  const { triggerThinking } = useApp();
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleCopyPrompt = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    triggerThinking('Prompt Copied', 'Prompt copied to clipboard. Ready to paste.', 'Clipboard updated');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const nextTask = allTasks.find((t) => t.priority === task.priority + 1);

  return (
    <div className="space-y-6">
      {/* Task Header & Context */}
      <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-[var(--y)]/20 text-[var(--y)] font-extrabold text-[11px] uppercase tracking-wider">
              {task.phase}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[var(--m)] font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Est. {task.estimatedTime}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUnlockModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[var(--g)] hover:bg-[#16a34a] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Task Complete & Unlock Next</span>
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--t)] tracking-tight">
          {task.title}
        </h2>
        <p className="text-xs text-[var(--m)] mt-1.5 leading-relaxed">
          Follow the sequential action steps below. Check off each milestone as you progress.
        </p>
      </div>

      {/* Step by Step Breakdown Cards */}
      <div className="space-y-4">
        {task.steps.map((st, idx) => {
          const isDone = !!completedSteps[st.id];

          return (
            <div
              key={st.id}
              className={`rounded-[22px] border transition-all p-5 sm:p-6 ${
                isDone
                  ? 'bg-[var(--s)]/60 border-[var(--line)] opacity-85'
                  : 'bg-[var(--s)] border-[var(--line)] shadow-sm'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStep(st.id)}
                    className="mt-0.5 text-[var(--m)] hover:text-[var(--y)] transition-colors shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-[var(--g)] fill-current" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--y)]">
                      Step {st.stepNumber}
                    </div>
                    <h3 className={`text-base font-extrabold text-[var(--t)] ${isDone ? 'line-through opacity-70' : ''}`}>
                      {st.title}
                    </h3>
                  </div>
                </div>

                {st.tool === 'youtube' && (
                  <span className="p-2 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                    <Youtube className="w-4 h-4" />
                  </span>
                )}
                {st.tool === 'chatgpt' && (
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </span>
                )}
                {st.tool === 'claude_code' && (
                  <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                    <Terminal className="w-4 h-4" />
                  </span>
                )}
              </div>

              {/* Instructions */}
              <p className="text-xs text-[var(--m)] leading-relaxed pl-8 mb-4">
                {st.instruction}
              </p>

              {/* Step 1: YouTube Suggested Videos / External Links */}
              {st.links && st.links.length > 0 && (
                <div className="pl-8 space-y-2 mb-2">
                  <div className="text-[11px] font-bold text-[var(--t)]">Recommended Deep Dives:</div>
                  <div className="space-y-1.5">
                    {st.links.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-[var(--s2)]/60 hover:bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between text-xs font-semibold text-[var(--t)] group transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Play className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate">{link.title}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[var(--m)] group-hover:text-[var(--t)] shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Suggested Prompts with Copy Buttons */}
              {st.prompts && st.prompts.length > 0 && (
                <div className="pl-8 space-y-2.5 mb-2">
                  <div className="text-[11px] font-bold text-[var(--t)]">
                    Deep Inquiry Prompts (Copy one-by-one to your AI):
                  </div>
                  <div className="space-y-2">
                    {st.prompts.map((promptText, pIdx) => {
                      const letter = String.fromCharCode(97 + pIdx); // a, b, c, d
                      const isCopied = copiedIndex === pIdx;

                      return (
                        <div
                          key={pIdx}
                          className="p-3 rounded-xl bg-[var(--s2)]/70 border border-[var(--line)] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="leading-relaxed text-[var(--t)]">
                            <span className="font-extrabold text-[var(--y)] mr-2">{letter}.</span>
                            <span>{promptText}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(promptText, pIdx)}
                            className={`p-1.5 rounded-lg border shrink-0 transition-all ${
                              isCopied
                                ? 'bg-[var(--g)] text-white border-[var(--g)]'
                                : 'bg-[var(--s)] hover:bg-[var(--line)] text-[var(--m)] hover:text-[var(--t)] border-[var(--line)]'
                            }`}
                            title="Copy prompt"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Coding tool terminal instruction card */}
              {st.tool === 'claude_code' && (
                <div className="pl-8">
                  <div className="p-3 rounded-xl bg-black/40 border border-neutral-800 text-xs text-neutral-300 font-mono space-y-1.5">
                    <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                      <Terminal className="w-3.5 h-3.5 text-purple-400" />
                      <span>Terminal (Claude Code):</span>
                    </div>
                    <div className="text-emerald-400">$ claude "Paste prompt here"</div>
                    <p className="text-[11px] text-neutral-400 font-sans mt-1">
                      Tip: Run one task prompt at a time, check git diff, and run your build command before next prompt.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sequential Unlock Gate Card */}
      {nextTask && (
        <div className="p-6 rounded-[24px] bg-[var(--s2)]/40 border border-[var(--line)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--s)] border border-[var(--line)] flex items-center justify-center text-[var(--m)]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[var(--m)] uppercase">Next Phase Locked</div>
              <div className="text-sm font-extrabold text-[var(--t)]">{nextTask.title}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUnlockModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <span>Confirm & Unlock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unlock Confirmation Modal */}
      <TaskUnlockModal
        isOpen={isUnlockModalOpen}
        taskTitle={task.title}
        nextTaskTitle={nextTask ? nextTask.title : 'All Phases Completed!'}
        estimatedTime={task.estimatedTime}
        onClose={() => setIsUnlockModalOpen(false)}
        onConfirmUnlock={() => onTaskCompleted(task.id)}
        onRequestHelp={onRequestHelp}
      />
    </div>
  );
};
