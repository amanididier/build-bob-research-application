import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Calendar, 
  Sparkles, 
  ArrowRight,
  Bot,
  User,
  ListTodo,
  Layers,
  Compass,
  Check,
  Clock,
  Terminal
} from 'lucide-react';

interface PhasedRoadmapData {
  goal: string;
  situation?: string;
  tools?: string[];
  cadence?: string;
  tasks?: Array<{
    id: string;
    phase: string;
    title: string;
    estimatedTime: string;
    priority: number;
    steps: Array<{
      id: string;
      stepNumber: number;
      title: string;
      instruction: string;
      tool: string;
    }>;
  }>;
  steps?: Array<{
    id: string;
    phase: string;
    title: string;
    why: string;
    tools: string[];
    dueDate: string;
    enabled: boolean;
  }>;
  createdAt?: number;
}

export const TasksPage: React.FC = () => {
  const { 
    tasks, 
    toggleTask, 
    addTask, 
    extractAiTasks, 
    projects, 
    activeResearchId,
    navigateTo 
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('Tomorrow');
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState<PhasedRoadmapData | null>(() => {
    try {
      const stored = localStorage.getItem('bob_phased_roadmap_v2');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  // Re-sync whenever a roadmap is finished or updated
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem('bob_phased_roadmap_v2');
        if (stored) setActiveRoadmap(JSON.parse(stored));
      } catch {}
    };

    window.addEventListener('bob:roadmap-updated', handleUpdate);
    window.addEventListener('bob:roadmap-finished', handleUpdate);
    return () => {
      window.removeEventListener('bob:roadmap-updated', handleUpdate);
      window.removeEventListener('bob:roadmap-finished', handleUpdate);
    };
  }, []);

  const activeProject = projects.find((p) => p.id === activeResearchId) || projects[0];

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask(newTitle.trim(), newDueDate, activeProject.id);
    setNewTitle('');
  };

  const handleAiExtract = async () => {
    setIsExtracting(true);
    try {
      await extractAiTasks();
    } finally {
      setIsExtracting(false);
    }
  };

  const openFullRoadmap = () => {
    window.dispatchEvent(new CustomEvent('bob-open-roadmap', {
      detail: { title: activeProject?.title || 'Project Roadmap', origin: 'tasks' }
    }));
  };

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            YOUR RESEARCH PLAN · HYBRID TASK WORKSPACE
          </div>
          <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            Tasks & Next Steps
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Combine your structured project roadmaps with manual to-dos and AI-extracted action items.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Create / Open Full Roadmap Wizard */}
          <button
            onClick={openFullRoadmap}
            className="h-9 px-4 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-[12px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activeRoadmap ? 'Edit Roadmap' : 'Create Roadmap'}</span>
          </button>

          {/* Sequential Step Execution View */}
          <button
            onClick={() => navigateTo('research', 'tasks')}
            className="h-9 px-4 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] font-bold text-[12px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ListTodo className="w-3.5 h-3.5 text-[var(--y)]" />
            <span>Sequential Execution View</span>
          </button>

          {/* AI Auto-Extract Button */}
          <button
            onClick={handleAiExtract}
            disabled={isExtracting}
            className="h-9 px-4 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] font-bold text-[12px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-blue-500" />
            <span>{isExtracting ? 'Analyzing evidence...' : '✨ AI Extract'}</span>
          </button>

          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-[var(--s2)] p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                  : 'text-[var(--m)] hover:text-[var(--t)]'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'pending'
                  ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                  : 'text-[var(--m)] hover:text-[var(--t)]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'completed'
                  ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                  : 'text-[var(--m)] hover:text-[var(--t)]'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE PHASED ROADMAP BANNER & SUMMARY */}
      {activeRoadmap && (
        <div className="mb-6 p-5 sm:p-6 rounded-[24px] bg-[var(--s)] border border-[var(--line)] shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--y)]/15 text-[var(--y)] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 text-[var(--y)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--y)]">
                    ACTIVE PROJECT ROADMAP
                  </span>
                  <span className="text-[11px] text-[var(--m)] font-semibold">
                    · {activeRoadmap.cadence === 'sprint' ? 'Hyper-Sprint (3-5 Days)' : activeRoadmap.cadence === 'month' ? '1 Month Milestone' : '2-Week Cadence'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--t)] m-0">
                  {activeRoadmap.goal || 'Engineering Roadmap'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openFullRoadmap}
                className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--line)] text-xs font-bold text-[var(--t)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Edit Steps</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Phased Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {activeRoadmap.steps && activeRoadmap.steps.length > 0 ? (
              activeRoadmap.steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="p-3.5 rounded-xl bg-[var(--s2)]/70 border border-[var(--line)] flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-md bg-[var(--y)]/20 text-[var(--y)] text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9.5px] font-mono uppercase text-[var(--y)] font-bold block">
                      {step.phase}
                    </span>
                    <b className="text-xs text-[var(--t)] block font-bold truncate">
                      {step.title}
                    </b>
                    <p className="text-[11px] text-[var(--m)] m-0 mt-0.5 line-clamp-1">
                      {step.why}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--m)]">Roadmap generated with all phases active.</p>
            )}
          </div>
        </div>
      )}

      {/* Manual Task Creator Input Form */}
      <form onSubmit={handleManualAdd} className="mb-6 p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex-1 w-full flex items-center gap-2.5">
          <Plus className="w-4 h-4 text-[var(--m)] ml-1 flex-shrink-0" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`Add a task for ${activeProject.title}...`}
            className="w-full bg-transparent border-0 outline-none text-[13px] text-[var(--t)] placeholder-[var(--m)]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <input
            type="text"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            placeholder="Due date (e.g. Friday)"
            className="h-8 px-2.5 rounded-lg bg-[var(--s2)] border border-[var(--line)] text-[11px] text-[var(--t)] outline-none w-28 text-center"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="h-8 px-4 rounded-lg bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11px] font-bold hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0 cursor-pointer"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* Task List Card */}
      <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.02)] space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <ListTodo className="w-10 h-10 text-[var(--m)] mx-auto mb-2 opacity-40" />
            <h4 className="text-[14px] font-bold text-[var(--t)]">No tasks in this filter</h4>
            <p className="text-[12px] text-[var(--m)]">Add a task above or click "Create Roadmap" to generate and structure your execution steps.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filtered.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="py-4 flex items-start gap-3.5 cursor-pointer group hover:bg-[var(--s2)]/40 -mx-3 px-3 rounded-xl transition-colors"
              >
                <button
                  type="button"
                  className="mt-0.5 text-neutral-400 group-hover:text-[var(--y)] transition-colors flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--g)] fill-current" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <b
                      className={`text-[13.5px] block font-bold ${
                        task.completed ? 'line-through text-[var(--m)]' : 'text-[var(--t)]'
                      }`}
                    >
                      {task.title}
                    </b>
                    <span className="text-[11px] text-[var(--m)] font-medium flex items-center gap-1 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-[#aaa]" />
                      {task.dueDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mt-2">
                    {task.isAiGenerated ? (
                      <span className="text-[9.5px] text-[var(--b)] bg-[var(--bs)] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        <span>Bob AI extracted</span>
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-[var(--m)] bg-[var(--s2)] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Manual</span>
                      </span>
                    )}

                    <span className="text-[10px] text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2.5 py-0.5 rounded-full font-semibold">
                      {task.sourceConnection}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo('research', 'chat', task.projectId);
                      }}
                      className="text-[11px] text-[var(--m)] hover:text-[var(--t)] hover:underline inline-flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <span>{task.projectId}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
