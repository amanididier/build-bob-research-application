import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Circle, ArrowUpRight, Plus, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigateTo, projects, tasks, toggleTask, userName } = useApp();

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Tab bar consistent with design reference */}
      <div className="h-12 border-b border-[var(--line)] flex gap-8 mb-6">
        <button className="h-12 text-[var(--t)] font-bold relative after:content-[''] after:h-[2px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px]">
          Overview
        </button>
        <button
          onClick={() => navigateTo('research', 'chat')}
          className="h-12 text-[#888] hover:text-[var(--t)] transition-colors"
        >
          Research
        </button>
        <button
          onClick={() => navigateTo('tasks')}
          className="h-12 text-[#888] hover:text-[var(--t)] transition-colors"
        >
          Tasks
        </button>
      </div>

      {/* Hero Header */}
      <div className="py-2 mb-7">
        <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
          TODAY · FOCUSED WORKSPACE · HELLO {userName.toUpperCase()}
        </div>
        <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
          Welcome back, {userName}.
        </h1>
        <p className="text-[var(--m)] leading-relaxed max-w-[680px] text-[13px]">
          Bob turns scattered research, browser tabs, and AI notes into a small set of finishable actions you can move forward today.
        </p>
      </div>

      {/* Dashboard Grid from index(5).html */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        {/* Today's Focus Card */}
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Today's focus</h3>
              <span className="text-[10px] font-semibold text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2.5 py-1 rounded-full">
                Active Goal
              </span>
            </div>
            <h2 className="text-[26px] font-extrabold mt-3 mb-2 tracking-tight text-[var(--t)]">
              Validate the core problem
            </h2>
            <p className="text-[12px] text-[#50504b] dark:text-[#d3ccc3] leading-relaxed m-0">
              68% of this research goal is connected across 9 sources and 2 AI discussions.
            </p>

            {/* Progress bar */}
            <div className="h-[6px] bg-[var(--s2)] rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-[var(--b)] rounded-full transition-all duration-500"
                style={{ width: '68%' }}
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mt-5 pt-3 border-t border-[var(--line)]">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              12 tabs
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              7 sources
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              2 tasks due
            </span>
            <button
              onClick={() => navigateTo('research', 'chat', 'urugendo')}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--t)] hover:underline"
            >
              Open research <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Goal progress</h3>

          <div>
            <div className="flex justify-between text-[11px] font-medium text-[var(--t)] mb-1.5">
              <span>Problem validation</span>
              <span className="font-mono">68%</span>
            </div>
            <div className="h-[6px] bg-[var(--s2)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--b)] rounded-full" style={{ width: '68%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-medium text-[var(--t)] mb-1.5">
              <span>Competitive research</span>
              <span className="font-mono">42%</span>
            </div>
            <div className="h-[6px] bg-[var(--s2)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--y)] rounded-full" style={{ width: '42%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-medium text-[var(--t)] mb-1.5">
              <span>User evidence</span>
              <span className="font-mono">31%</span>
            </div>
            <div className="h-[6px] bg-[var(--s2)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--g)] rounded-full" style={{ width: '31%' }} />
            </div>
          </div>
        </div>

        {/* Due Soon Tasks */}
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Due soon</h3>
            <button
              onClick={() => navigateTo('tasks')}
              className="text-[11px] text-[var(--m)] hover:text-[var(--t)]"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {tasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="py-2.5 flex items-start gap-3 cursor-pointer group"
              >
                <div className="mt-0.5 text-neutral-400 group-hover:text-[var(--y)] transition-colors">
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--g)]" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <b
                    className={`block text-[12px] ${
                      task.completed ? 'line-through text-[var(--m)]' : 'text-[var(--t)]'
                    }`}
                  >
                    {task.title}
                  </b>
                  <small className="block text-[10px] text-[var(--m)] mt-0.5">
                    {task.dueDate} · {task.sourceConnection}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Research / Projects */}
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[16px] font-bold text-[var(--t)] m-0">Top research</h3>
            <button
              onClick={() => navigateTo('research', 'chat')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--y)] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> New study
            </button>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => navigateTo('research', 'chat', proj.id)}
                className="py-2.5 flex items-start gap-3 cursor-pointer hover:bg-[var(--s2)] -mx-2 px-2 rounded-lg transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: proj.dotColor }}
                />
                <div className="flex-1 min-w-0">
                  <b className="block text-[12px] text-[var(--t)] truncate">{proj.title}</b>
                  <small className="block text-[10px] text-[var(--m)] mt-0.5">
                    {proj.sourceCount} sources · {proj.status}
                  </small>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#aaa] mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
