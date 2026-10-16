import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Play,
  Terminal,
  FileText,
  Sparkles,
  Youtube,
  Globe,
} from 'lucide-react';
import { PhasedTask } from './RoadmapWizardModal';
import { TaskUnlockModal } from './TaskUnlockModal';
import { useApp } from '../../context/AppContext';

interface TaskStepExecutionViewProps {
  task: PhasedTask;
  allTasks: PhasedTask[];
  onTaskCompleted: (taskId: string) => void;
  onRequestHelp?: (topic: string) => void;
  onStepToggled?: (stepId: string, done: boolean) => void;
}

const toolMeta: Record<
  PhasedTask['steps'][0]['tool'],
  { label: string; icon: React.ElementType; tint: string }
> = {
  youtube: { label: 'YouTube', icon: Youtube, tint: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
  chatgpt: { label: 'ChatGPT', icon: Sparkles, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
  claude_code: { label: 'Code', icon: Terminal, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
  docs: { label: 'Docs', icon: FileText, tint: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30' },
  other: { label: 'Link', icon: Globe, tint: 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800' },
};

function shortTitle(title: string) {
  return title.replace(/\s{2,}/g, ' ').trim();
}

export const TaskStepExecutionView: React.FC<TaskStepExecutionViewProps> = ({
  task,
  allTasks,
  onTaskCompleted,
  onRequestHelp,
  onStepToggled,
}) => {
  const { triggerThinking } = useApp();
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const doneCount = useMemo(
    () => task.steps.filter((s) => completedSteps[s.id]).length,
    [task.steps, completedSteps]
  );
  const allDone = task.steps.length > 0 && doneCount === task.steps.length;

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      onStepToggled?.(stepId, !!next[stepId]);
      return next;
    });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    triggerThinking('Copied', 'Ready to paste.', 'Clipboard');
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const nextTask = allTasks.find((t) => t.priority === task.priority + 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--m)] m-0 truncate">{task.phase}</p>
          <p className="text-[14px] font-semibold text-[var(--t)] m-0 mt-0.5 truncate">{task.title}</p>
        </div>
        <span className="text-[11px] font-medium text-[var(--m)] shrink-0">
          {doneCount}/{task.steps.length} · {task.estimatedTime}
        </span>
      </div>

      <div className="space-y-2">
        {task.steps.map((st) => {
          const done = !!completedSteps[st.id];
          const open = expandedId === st.id;
          const meta = toolMeta[st.tool] || toolMeta.other;
          const Icon = meta.icon;

          return (
            <div
              key={st.id}
              className={`rounded-2xl border bg-[var(--s)] transition-all ${
                done ? 'border-emerald-300/60 dark:border-emerald-800' : 'border-[var(--line)]'
              }`}
            >
              <div className="flex items-center gap-3 px-3.5 py-3">
                <button
                  type="button"
                  onClick={() => toggleStep(st.id)}
                  className="shrink-0"
                  aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                >
                  {done ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white grid place-items-center">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                  )}
                </button>

                <span className="text-[12px] font-bold text-[var(--m)] tabular-nums shrink-0 w-5">
                  {st.stepNumber}
                </span>

                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : st.id)}
                  className={`flex-1 min-w-0 text-left text-[13.5px] font-medium leading-snug ${
                    done ? 'text-[var(--m)] line-through' : 'text-[var(--t)]'
                  }`}
                >
                  {shortTitle(st.title)}
                </button>

                <span
                  className={`shrink-0 w-8 h-8 rounded-xl grid place-items-center ${meta.tint}`}
                  title={meta.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>

                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : st.id)}
                  className="shrink-0 p-1 rounded-lg text-[var(--m)] hover:bg-[var(--s2)]"
                  aria-label={open ? 'Collapse' : 'Open full step'}
                >
                  {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {open && (
                <div className="px-3.5 pb-4 pt-0 border-t border-[var(--line)]/70 space-y-3">
                  <p className="text-[13px] leading-relaxed text-[var(--t)] m-0 pt-3">{st.instruction}</p>

                  {st.links && st.links.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-[var(--m)] m-0">Watch or open</p>
                      {st.links.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12.5px] font-medium text-[var(--t)] hover:border-[var(--y)]/50 transition-colors"
                        >
                          <Play className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="truncate flex-1">{link.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[var(--m)] shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}

                  {st.prompts && st.prompts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-[var(--m)] m-0">Copy a prompt</p>
                      {st.prompts.map((promptText, i) => {
                        const key = `${st.id}-p${i}`;
                        return (
                          <div
                            key={key}
                            className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] flex gap-2 items-start"
                          >
                            <p className="flex-1 text-[12.5px] leading-relaxed text-[var(--t)] m-0">{promptText}</p>
                            <button
                              type="button"
                              onClick={() => handleCopy(promptText, key)}
                              className="shrink-0 h-8 px-2.5 rounded-lg bg-[var(--s)] border border-[var(--line)] text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              {copiedKey === key ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              {copiedKey === key ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {st.tool === 'claude_code' && !st.prompts?.length && (
                    <div className="relative p-3 rounded-xl bg-neutral-900 text-neutral-100 text-[12px] font-mono leading-relaxed">
                      <pre className="m-0 whitespace-pre-wrap break-words">{st.instruction}</pre>
                      <button
                        type="button"
                        onClick={() => handleCopy(st.instruction, `${st.id}-code`)}
                        className="absolute top-2 right-2 h-7 px-2 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-semibold inline-flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  )}

                  {onRequestHelp && (
                    <button
                      type="button"
                      onClick={() => onRequestHelp(st.title)}
                      className="text-[12px] font-semibold text-[#3474db] hover:underline"
                    >
                      Ask Bob for help with this step
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--m)] m-0">
          {nextTask
            ? allDone
              ? `Next phase unlocks: ${nextTask.phase}`
              : 'Finish every step here to unlock the next phase.'
            : allDone
              ? 'Last phase — great work.'
              : 'Complete these steps to finish the plan.'}
        </p>
        <button
          type="button"
          disabled={!allDone}
          onClick={() => setIsUnlockModalOpen(true)}
          className="h-10 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white text-[12.5px] font-semibold shadow-sm transition-colors"
        >
          Mark phase complete
        </button>
      </div>

      <TaskUnlockModal
        isOpen={isUnlockModalOpen}
        taskTitle={task.title}
        nextTaskTitle={nextTask?.title || nextTask?.phase || 'All done'}
        estimatedTime={nextTask?.estimatedTime || task.estimatedTime}
        onClose={() => setIsUnlockModalOpen(false)}
        onConfirmUnlock={() => {
          setIsUnlockModalOpen(false);
          onTaskCompleted(task.id);
        }}
      />
    </div>
  );
};
