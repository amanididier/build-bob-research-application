import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Circle, Plus, Calendar, Check, ArrowRight } from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { tasks, toggleTask, projects, navigateTo } = useApp();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [selectedProj, setSelectedProj] = useState(projects[0]?.id || 'urugendo');

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            YOUR RESEARCH PLAN
          </div>
          <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            Tasks & Next Steps
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Small steps. Clear finish lines. Tasks stay attached to the evidence that created them, so your work never loses context.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-[var(--s2)] p-1 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
              filter === 'pending'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
              filter === 'completed'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            Done
          </button>
        </div>
      </div>

      {/* Task List Card */}
      <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.02)] space-y-4">
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
                    className={`text-[14px] block font-bold ${
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

                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2.5 py-0.5 rounded-full font-semibold">
                    {task.sourceConnection}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo('research', 'chat', task.projectId);
                    }}
                    className="text-[11px] text-[var(--m)] hover:text-[var(--t)] hover:underline inline-flex items-center gap-1"
                  >
                    {task.projectId} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
