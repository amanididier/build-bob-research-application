import React, { useState } from 'react';
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
  ListTodo
} from 'lucide-react';

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

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
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
            Combine your own manual to-dos with AI-extracted action items from your local research notes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Auto-Extract Button */}
          <button
            onClick={handleAiExtract}
            disabled={isExtracting}
            className="h-9 px-4 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-[12px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isExtracting ? 'Analyzing evidence...' : '✨ AI Extract Tasks'}</span>
          </button>

          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-[var(--s2)] p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                  : 'text-[var(--m)] hover:text-[var(--t)]'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                  : 'text-[var(--m)] hover:text-[var(--t)]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors ${
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

      {/* Manual Task Creator Input Form (Software Operation) */}
      <form onSubmit={handleManualAdd} className="mb-6 p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex-1 w-full flex items-center gap-2.5">
          <Plus className="w-4 h-4 text-[var(--m)] ml-1 flex-shrink-0" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`Add a research task for ${activeProject.title}...`}
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
            className="h-8 px-4 rounded-lg bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11px] font-bold hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
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
            <p className="text-[12px] text-[var(--m)]">Add a task above or click "✨ AI Extract Tasks" to generate them automatically.</p>
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
                      className="text-[11px] text-[var(--m)] hover:text-[var(--t)] hover:underline inline-flex items-center gap-1 ml-auto"
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
