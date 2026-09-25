import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Circle, Plus, Filter, Calendar } from 'lucide-react';

export const TasksView: React.FC = () => {
  const { tasks, toggleTask, activeResearchId, projects } = useApp();
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const project = projects.find((p) => p.id === activeResearchId);

  const filteredTasks = tasks.filter((t) => {
    if (filterMode === 'pending') return !t.completed;
    if (filterMode === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="max-w-[850px] mx-auto py-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            RESEARCH ACTION PLAN
          </div>
          <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            Tasks & Deadlines
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Small steps. Clear finish lines. Tasks stay connected to the evidence that created them so your work never loses context.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-[var(--s2)] p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors ${
              filterMode === 'all'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors ${
              filterMode === 'pending'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors ${
              filterMode === 'completed'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Task List Card */}
      <div className="bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.03)] space-y-4">
        <div className="divide-y divide-[var(--line)]">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="py-3.5 flex items-start gap-3.5 cursor-pointer group hover:bg-[var(--s2)]/40 -mx-3 px-3 rounded-xl transition-colors"
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
                    className={`text-[13px] block font-semibold ${
                      task.completed
                        ? 'line-through text-[var(--m)]'
                        : 'text-[var(--t)]'
                    }`}
                  >
                    {task.title}
                  </b>
                  <span className="text-[10px] text-[var(--m)] font-medium flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3 text-[#aaa]" />
                    {task.dueDate}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2 py-0.5 rounded-full font-medium">
                    {task.sourceConnection}
                  </span>
                  <span className="text-[10px] text-[var(--m)]">
                    · Linked to {task.projectId}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add quick task */}
        <div className="pt-2 border-t border-[var(--line)]">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 text-[11px] font-semibold text-[var(--y)] hover:underline"
          >
            <Plus className="w-4 h-4" />
            <span>Add next research action</span>
          </button>
        </div>
      </div>
    </div>
  );
};
