import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { loadRoadmapForProject } from '../../lib/roadmap/roadmapStorage';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Sparkles,
  ArrowRight,
  Bot,
  ListTodo,
  Layers,
  Compass,
  Clock,
  Search,
  ChevronDown
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

  const activeProject = projects.find((p) => p.id === activeResearchId) || projects[0];
  const activeProjectId = activeProject?.id || activeResearchId || 'urugendo';

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [taskExtractNotice, setTaskExtractNotice] = useState<string | null>(null);
  const [activeRoadmap, setActiveRoadmap] = useState<PhasedRoadmapData | null>(() =>
    loadRoadmapForProject(activeProjectId) as PhasedRoadmapData | null
  );

  // Re-sync the roadmap for the currently selected project.
  useEffect(() => {
    const handleUpdate = () => {
      setActiveRoadmap(loadRoadmapForProject(activeProjectId) as PhasedRoadmapData | null);
    };

    handleUpdate();
    window.addEventListener('bob:roadmap-updated', handleUpdate);
    window.addEventListener('bob:roadmap-finished', handleUpdate);
    return () => {
      window.removeEventListener('bob:roadmap-updated', handleUpdate);
      window.removeEventListener('bob:roadmap-finished', handleUpdate);
    };
  }, [activeProjectId]);

  const visibleTasks = tasks.filter((task) =>
    projectFilter === 'all' || task.projectId === projectFilter
  );
  const filtered = visibleTasks.filter((task) => {
    if (filter === 'pending' && task.completed) return false;
    if (filter === 'completed' && !task.completed) return false;
    return task.title.toLowerCase().includes(search.toLowerCase().trim());
  });
  const pendingCount = visibleTasks.filter((task) => !task.completed).length;
  const completedCount = visibleTasks.filter((task) => task.completed).length;
  const dueSoonCount = visibleTasks.filter((task) => {
    if (task.completed) return false;
    const due = String(task.dueDate || '').toLowerCase().trim();
    if (!due || due === 'flexible' || due === 'not set') return false;
    if (/today|tomorrow|this week|next few days|overdue/.test(due)) return true;
    const parsed = Date.parse(due);
    if (Number.isNaN(parsed)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(parsed);
    date.setHours(0, 0, 0, 0);
    const daysAway = (date.getTime() - today.getTime()) / 86400000;
    return daysAway >= 0 && daysAway <= 7;
  });
  const isDueSoon = (dueDate: string) => {
    const due = String(dueDate || '').toLowerCase().trim();
    if (!due || due === 'flexible' || due === 'not set') return false;
    if (/today|tomorrow|this week|next few days|overdue/.test(due)) return true;
    const parsed = Date.parse(due);
    if (Number.isNaN(parsed)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(parsed);
    date.setHours(0, 0, 0, 0);
    const daysAway = (date.getTime() - today.getTime()) / 86400000;
    return daysAway >= 0 && daysAway <= 7;
  };
  const taskGroups = [
    { key: 'soon', label: 'Due soon', items: filtered.filter((task) => !task.completed && isDueSoon(task.dueDate)) },
    { key: 'later', label: 'Later or flexible', items: filtered.filter((task) => !task.completed && !isDueSoon(task.dueDate)) },
    { key: 'done', label: 'Completed', items: filtered.filter((task) => task.completed) },
  ];

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const destinationProjectId = projectFilter === 'all' ? activeProjectId : projectFilter;
    addTask(newTitle.trim(), newDueDate.trim() || 'Flexible', destinationProjectId);
    setNewTitle('');
  };

  const handleAiExtract = async () => {
    setIsExtracting(true);
    setTaskExtractNotice(null);
    try {
      const count = await extractAiTasks();
      setTaskExtractNotice(
        count > 0
          ? `Added ${count} task${count === 1 ? '' : 's'} from this project's saved evidence.`
          : 'No tasks were added. Bob only creates tasks supported by real project evidence—check that this project has relevant notes or research and that Gemini is connected in Settings.'
      );
    } catch {
      setTaskExtractNotice('Bob could not extract tasks right now. Nothing new was added; please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const openFullRoadmap = () => {
    const projectTasks = tasks
      .filter((task) => task.projectId === activeProjectId)
      .slice(0, 10)
      .map((task) => `- [${task.completed ? 'done' : 'open'}] ${task.title}`)
      .join('\n');
    window.dispatchEvent(new CustomEvent('bob-open-roadmap', {
      detail: {
        context: [
          activeProject?.title ? `Active project: ${activeProject.title}` : '',
          projectTasks ? `Existing tasks:\n${projectTasks}` : '',
        ].filter(Boolean).join('\n'),
        origin: 'tasks',
        projectId: activeProjectId,
      }
    }));
  };

  return (
    <div className="mx-auto max-w-[1080px] px-5 md:px-8 py-7 pb-32 animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--m)] m-0">Make progress at your own pace</p>
          <h1 className="text-[30px] sm:text-[34px] leading-tight font-bold tracking-tight text-[var(--t)] mt-2 mb-1">Tasks<span className="text-[#e7b820]">.</span></h1>
          <p className="text-[13px] text-[var(--m)] m-0">One clear next step is enough. Your tasks stay connected to their projects.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openFullRoadmap} className="h-9 px-3.5 rounded-xl bg-[#e7b820] hover:bg-[#d8aa14] text-[#171717] text-[12px] font-semibold inline-flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />{activeRoadmap ? 'Edit roadmap' : 'Create roadmap'}</button>
          <button type="button" onClick={handleAiExtract} disabled={isExtracting} className="h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--s)] text-[12px] font-semibold text-[var(--t)] inline-flex items-center gap-2 hover:bg-[var(--s2)] disabled:opacity-50"><Bot className="w-3.5 h-3.5" />{isExtracting ? 'Finding tasks…' : 'AI extract'}</button>
          <button type="button" onClick={() => navigateTo('research', 'tasks')} className="h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--s)] text-[12px] font-semibold text-[var(--t)] inline-flex items-center gap-2 hover:bg-[var(--s2)]"><ListTodo className="w-3.5 h-3.5" />Guided steps</button>
        </div>
      </header>

      {taskExtractNotice && (
        <p role="status" className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--s)] px-4 py-3 text-xs text-[var(--m)]">
          {taskExtractNotice}
        </p>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-4 flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-[#e8f2ff] text-[#3474db] grid place-items-center"><ListTodo className="w-4 h-4" /></span><span><strong className="block text-[22px] leading-none text-[var(--t)]">{pendingCount}</strong><span className="block text-[11px] text-[var(--m)] mt-1">Open tasks</span></span></article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-4 flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-[#fff4d6] dark:bg-[#473914] text-[#9b7200] grid place-items-center"><Clock className="w-4 h-4" /></span><span><strong className="block text-[22px] leading-none text-[var(--t)]">{dueSoonCount}</strong><span className="block text-[11px] text-[var(--m)] mt-1">Due within a week</span></span></article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-4 flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-[#e7f7ed] text-[#24804b] grid place-items-center"><CheckCircle2 className="w-4 h-4" /></span><span><strong className="block text-[22px] leading-none text-[var(--t)]">{completedCount}</strong><span className="block text-[11px] text-[var(--m)] mt-1">Completed</span></span></article>
      </section>

      {activeRoadmap && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1"><Compass className="w-4 h-4 text-[#b88900]" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--m)]">Active project roadmap</span></div>
              <h2 className="text-[15px] font-bold text-[var(--t)] m-0 truncate">{activeRoadmap.goal || 'Project roadmap'}</h2>
              <p className="text-[12px] text-[var(--m)] mt-1 mb-0">{activeRoadmap.steps?.length || activeRoadmap.tasks?.length || 0} planned milestones · {activeProject?.title || 'Current project'}</p>
            </div>
            <button type="button" onClick={openFullRoadmap} className="h-8 px-3 rounded-lg border border-[var(--line)] text-[12px] font-semibold text-[var(--t)] hover:bg-[var(--s2)] shrink-0">Edit roadmap <ArrowRight className="inline w-3.5 h-3.5 ml-1" /></button>
          </div>

        </section>
      )}

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--s)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--line)]">
          <form onSubmit={handleManualAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input type="text" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={"Add a clear next step for " + (activeProject?.title || "this project") + "…"} aria-label="New task title" className="flex-1 min-w-0 h-10 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--t)] placeholder:text-[var(--m)] outline-none focus:ring-2 focus:ring-[#e7b820]/40" />
            <input type="text" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} placeholder="Due date (optional)" aria-label="New task due date" className="h-10 sm:w-40 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 text-[12px] text-[var(--t)] placeholder:text-[var(--m)] outline-none focus:ring-2 focus:ring-[#e7b820]/40" />
            <button type="submit" disabled={!newTitle.trim()} className="h-10 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"><Plus className="w-3.5 h-3.5" />Add task</button>
          </form>
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="flex items-center gap-1 rounded-xl bg-[var(--s2)] p-1 w-fit" role="tablist" aria-label="Task status">
              <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')} className={filter === 'all' ? 'px-3 py-1.5 rounded-lg bg-[var(--s)] shadow-sm text-[12px] font-semibold text-[var(--t)]' : 'px-3 py-1.5 rounded-lg text-[12px] text-[var(--m)]'}>All <span className="ml-1">{visibleTasks.length}</span></button>
              <button type="button" role="tab" aria-selected={filter === 'pending'} onClick={() => setFilter('pending')} className={filter === 'pending' ? 'px-3 py-1.5 rounded-lg bg-[var(--s)] shadow-sm text-[12px] font-semibold text-[var(--t)]' : 'px-3 py-1.5 rounded-lg text-[12px] text-[var(--m)]'}>Open <span className="ml-1">{pendingCount}</span></button>
              <button type="button" role="tab" aria-selected={filter === 'completed'} onClick={() => setFilter('completed')} className={filter === 'completed' ? 'px-3 py-1.5 rounded-lg bg-[var(--s)] shadow-sm text-[12px] font-semibold text-[var(--t)]' : 'px-3 py-1.5 rounded-lg text-[12px] text-[var(--m)]'}>Done <span className="ml-1">{completedCount}</span></button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="relative flex items-center gap-2 h-9 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 min-w-0"><Search className="w-3.5 h-3.5 text-[var(--m)] shrink-0" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" className="w-full sm:w-36 bg-transparent outline-none text-[12px] text-[var(--t)] placeholder:text-[var(--m)]" /></label>
              <label className="flex items-center gap-2 h-9 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3"><Layers className="w-3.5 h-3.5 text-[var(--m)]" /><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Filter tasks by project" className="bg-transparent outline-none text-[12px] text-[var(--t)] max-w-[180px]"><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select><ChevronDown className="w-3.5 h-3.5 text-[var(--m)]" /></label>
            </div>
          </div>
        </div>

        {filtered.length ? (
          <div className="px-4 sm:px-5">
            {taskGroups.filter((group) => group.items.length > 0).map((group) => (
              <section key={group.key} className="py-2">
                <div className="flex items-center justify-between gap-3 py-3"><h3 className="text-[12px] font-bold text-[var(--t)] m-0">{group.label}</h3><span className="text-[11px] text-[var(--m)]">{group.items.length}</span></div>
                <div className="divide-y divide-[var(--line)]">
                  {group.items.map((task) => {
                    const taskProject = projects.find((project) => project.id === task.projectId);
                    return <div key={task.id} className="flex items-start gap-3 py-4">
                      <button type="button" onClick={() => toggleTask(task.id)} aria-label={task.completed ? 'Reopen ' + task.title : 'Complete ' + task.title} className="w-5 h-5 mt-0.5 rounded-full shrink-0 text-[var(--m)] hover:text-[#24804b]">{task.completed ? <CheckCircle2 className="w-5 h-5 text-[#24804b]" /> : <Circle className="w-5 h-5" />}</button>
                      <div className="min-w-0 flex-1"><p className={task.completed ? 'text-[13px] font-medium text-[var(--m)] line-through m-0' : 'text-[13px] font-semibold text-[var(--t)] m-0'}>{task.title}</p><div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[var(--m)]"><span>{taskProject?.title || 'Unassigned project'}</span><span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{task.dueDate || 'No due date'}</span>{task.isAiGenerated && <span className="inline-flex items-center gap-1 text-[#3474db]"><Bot className="w-3 h-3" />Suggested by Bob</span>}</div></div>
                      <button type="button" onClick={() => navigateTo('research', 'chat', task.projectId)} className="text-[11px] text-[var(--m)] hover:text-[var(--t)] shrink-0">Open project <ArrowRight className="inline w-3 h-3 ml-1" /></button>
                    </div>;
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center"><CheckCircle2 className="w-8 h-8 text-[#3a9b68] mx-auto mb-3" /><h2 className="text-[15px] font-bold text-[var(--t)] m-0">{search ? 'No matching tasks' : filter === 'completed' ? 'Nothing completed yet' : 'All clear for now'}</h2><p className="text-[12px] text-[var(--m)] mt-2 mb-0">{search ? 'Try another search or project filter.' : 'Add a task or create a roadmap when you are ready for your next step.'}</p></div>
        )}
      </section>
    </div>
  );
};
