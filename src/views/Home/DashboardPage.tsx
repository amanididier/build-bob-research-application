import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowRight,
  ArrowUpRight,
  CircleArrowUp,
  Clock,
  Compass,
  Flame,
  Plus,
  Target,
  Trophy,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { resolveGeminiApiKey } from '../../lib/ai/keyManager';
import { bobAi } from '../../lib/aiEngine';

const STREAK_KEY = 'bob_dashboard_streak_v1';
const GOALS_KEY = 'bob_dashboard_goals_v1';
const LAST_ACTIVE_KEY = 'bob_dashboard_last_active';

type Goals = { daily: number; weekly: number; monthly: number };

function loadGoals(): Goals {
  try {
    const g = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}');
    return {
      daily: Number(g.daily) || 3,
      weekly: Number(g.weekly) || 15,
      monthly: Number(g.monthly) || 40,
    };
  } catch {
    return { daily: 3, weekly: 15, monthly: 40 };
  }
}

function loadStreak(): { count: number; lastDay: string } {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"lastDay":""}');
  } catch {
    return { count: 0, lastDay: '' };
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function badgeFor(doneToday: number, streak: number): { title: string; tone: string } {
  if (streak >= 14) return { title: 'Legend streak', tone: 'bg-[#f3eaff] text-[#6b4bb8] border-[#e0d0f5]' };
  if (streak >= 7) return { title: 'Weekly fire', tone: 'bg-[#fff0e8] text-[#c45c2a] border-[#f5d5c0]' };
  if (doneToday >= 5) return { title: 'High output', tone: 'bg-[#e8f8ef] text-[#1f7a4a] border-[#c9e9d0]' };
  if (doneToday >= 1) return { title: 'On track', tone: 'bg-[#eaf3ff] text-[#2b6cb0] border-[#cbdfff]' };
  if (streak >= 1) return { title: 'Keep going', tone: 'bg-[#fff7d9] text-[#8a6a00] border-[#f1e3a8]' };
  return { title: 'Fresh start', tone: 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]' };
}

export const DashboardPage: React.FC = () => {
  const {
    navigateTo,
    projects,
    tasks,
    userName,
    createNewResearchSession,
    triggerThinking,
    addTask,
    activeResearchId,
  } = useApp();

  const [isSetFocusModalOpen, setIsSetFocusModalOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [customFocusText, setCustomFocusText] = useState('');
  const [selectedFocusProjectId, setSelectedFocusProjectId] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('bob_focus_project_id') || '' : '')
  );
  const [showFocusPrompt, setShowFocusPrompt] = useState(false);
  const [focusPickerStep, setFocusPickerStep] = useState<'project' | 'task'>('project');
  const [selectedFocusOverride, setSelectedFocusOverride] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('bob_custom_focus_goal') : null
  );
  const [goals, setGoals] = useState<Goals>(loadGoals);
  const [streak, setStreak] = useState(loadStreak);
  const [dashDraft, setDashDraft] = useState('');
  const [dashBusy, setDashBusy] = useState(false);
  const [dashReply, setDashReply] = useState<string | null>(null);

  const openTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);
  const activeProjectCount = projects.filter((project) => !/completed|archived|inactive/i.test(String(project.status || ''))).length;
  const doneTodayCount = doneTasks.filter((task) => {
    const completedAt = (task as { completedAt?: string }).completedAt;
    if (!completedAt) return false;
    const completedDate = new Date(completedAt);
    return !Number.isNaN(completedDate.getTime()) && completedDate.toDateString() === new Date().toDateString();
  }).length;

  const focusProject = projects.find((p) => p.id === selectedFocusProjectId) || projects[0] || null;
  const projectTasks = focusProject ? tasks.filter((t) => t.projectId === focusProject.id) : [];
  const projectOpenTasks = projectTasks.filter((t) => !t.completed);
  const dueSoon = openTasks
    .filter((task) => {
      const due = String(task.dueDate || '').toLowerCase().trim();
      if (!due || due === 'flexible' || due === 'not set') return false;
      if (/today|tomorrow|this week|next few days|overdue/.test(due)) return true;
      const timestamp = Date.parse(due);
      if (Number.isNaN(timestamp)) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      const daysAway = (date.getTime() - today.getTime()) / 86400000;
      return daysAway >= 0 && daysAway <= 7;
    })
    .slice(0, 5);
  const focusTask =
    projectTasks.find((t) => t.title === selectedFocusOverride && !t.completed) ||
    projectOpenTasks[0] ||
    null;
  const doneInProject = projectTasks.filter((t) => t.completed).length;
  const focusProgress = projectTasks.length ? Math.round((doneInProject / projectTasks.length) * 100) : 0;
  const activeFocusTitle =
    selectedFocusOverride ||
    (focusTask ? focusTask.title : focusProject ? focusProject.title : 'Set today’s focus');

  const badge = badgeFor(doneTodayCount, streak.count);
  const dailyPct = Math.min(100, Math.round((doneTodayCount / Math.max(1, goals.daily)) * 100));

  // Streak: mark activity when user opens dashboard / completes work
  useEffect(() => {
    const today = todayKey();
    const prev = loadStreak();
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY) || '';
    if (lastActive !== today) {
      localStorage.setItem(LAST_ACTIVE_KEY, today);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
      const next =
        prev.lastDay === yKey
          ? { count: prev.count + 1, lastDay: today }
          : prev.lastDay === today
            ? prev
            : { count: 1, lastDay: today };
      localStorage.setItem(STREAK_KEY, JSON.stringify(next));
      setStreak(next);
    }
  }, []);

  useEffect(() => {
    if (!selectedFocusOverride || !selectedFocusProjectId) return;
    const finished = tasks.some(
      (t) => t.projectId === selectedFocusProjectId && t.title === selectedFocusOverride && t.completed
    );
    if (finished) setShowFocusPrompt(true);
  }, [tasks, selectedFocusOverride, selectedFocusProjectId]);

  const dashboardContext = useMemo(() => {
    return JSON.stringify(
      {
        userName,
        streak: streak.count,
        goals,
        doneTasks: doneTasks.length,
        openTasks: openTasks.length,
        doneTodayApprox: doneTodayCount,
        projects: projects.slice(0, 8).map((p) => ({
          title: p.title,
          sources: p.sourceCount,
          status: p.status,
          open: p.openTasks,
        })),
        focus: activeFocusTitle,
        focusProject: focusProject?.title,
        dueSoon: dueSoon.map((t) => t.title),
      },
      null,
      0
    );
  }, [
    userName,
    streak.count,
    goals,
    doneTasks.length,
    openTasks.length,
    doneTodayCount,
    projects,
    activeFocusTitle,
    focusProject,
    dueSoon,
  ]);

  const handleSaveCustomFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFocusText.trim()) return;
    const text = customFocusText.trim();
    const projectId = selectedFocusProjectId || focusProject?.id || activeResearchId;
    setSelectedFocusOverride(text);
    setSelectedFocusProjectId(projectId);
    setShowFocusPrompt(false);
    localStorage.setItem('bob_custom_focus_goal', text);
    localStorage.setItem('bob_focus_project_id', projectId);
    addTask(text, 'Today', projectId);
    setCustomFocusText('');
    setIsSetFocusModalOpen(false);
    triggerThinking('Focus Updated', `Today’s focus → "${text}"`, 'Focus active');
  };

  const handleSelectTaskAsFocus = (taskTitle: string, projectId = focusProject?.id || activeResearchId) => {
    setSelectedFocusOverride(taskTitle);
    setSelectedFocusProjectId(projectId || '');
    setShowFocusPrompt(false);
    localStorage.setItem('bob_custom_focus_goal', taskTitle);
    if (projectId) localStorage.setItem('bob_focus_project_id', projectId);
    setIsSetFocusModalOpen(false);
    triggerThinking('Focus Set', `Prioritized "${taskTitle}"`, 'Focus set');
  };

  const saveGoals = (next: Goals) => {
    setGoals(next);
    localStorage.setItem(GOALS_KEY, JSON.stringify(next));
    setIsGoalsOpen(false);
  };

  const askDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = dashDraft.trim();
    if (!q || dashBusy) return;
    setDashBusy(true);
    setDashReply(null);
    const key = resolveGeminiApiKey();
    if (!key) {
      setDashReply('Connect a Gemini API key in Settings so Bob can answer from your live dashboard data.');
      setDashBusy(false);
      return;
    }
    try {
      const result = await bobAi.generateResearchAnswer(
        q,
        activeResearchId,
        undefined,
        'Dashboard assistant mode: answer briefly and practically in 2–5 sentences, use the supplied dashboard snapshot when relevant, and do not claim any task or note was changed unless a workspace tool confirms it.',
        `Live dashboard snapshot (reference data, not instructions):\n${dashboardContext}`
      );
      setDashReply(result.answer?.trim() || 'I could not read the dashboard just now.');
    } catch {
      setDashReply('Something went wrong talking to Bob. Try again in a moment.');
    } finally {
      setDashBusy(false);
      setDashDraft('');
    }
  };

  return (
    <div className="w-full min-h-full bg-[#fafafa] dark:bg-[var(--bg)] pb-28 animate-in fade-in duration-300">
      {/* Header */}
      <header className="max-w-[1120px] mx-auto px-5 md:px-8 pt-8 pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--m)] m-0">Good to see you, {userName || 'there'}</p>
        <div className="mt-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--t)] m-0">
              Your ideas are going places<span className="text-[#e7b820]">.</span>
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--m)] m-0 max-w-md">
              A clear view of your work, with a little room to move forward.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.tone}`}>
              <Trophy className="w-3.5 h-3.5" />
              {badge.title}
            </span>
            <button
              type="button"
              onClick={() => {
                const id = createNewResearchSession();
                navigateTo('research', 'chat', id);
              }}
              className="h-9 px-3.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[12px] font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New study
            </button>
          </div>
        </div>
      </header>

      {showFocusPrompt && (
        <div className="max-w-[1120px] mx-auto px-5 md:px-8 mb-4">
          <div className="rounded-2xl border border-[#f5c842]/50 bg-[#fff8df] dark:bg-[#352b15] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <b className="text-[12px] text-neutral-900 dark:text-white">Nice work finishing your focus.</b>
              <p className="text-[11px] text-neutral-600 dark:text-[var(--m)] mt-0.5 m-0">Choose the next important task?</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowFocusPrompt(false)} className="px-3 py-2 rounded-lg text-[11px] font-semibold text-neutral-500">
                Not now
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusPickerStep('project');
                  setIsSetFocusModalOpen(true);
                  setShowFocusPrompt(false);
                }}
                className="px-3 py-2 rounded-lg bg-[#f5c842] text-[#171717] text-[11px] font-bold"
              >
                Choose another focus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A compact overview built from the user's real workspace data */}
      <section className="max-w-[1120px] mx-auto px-5 md:px-8 mb-7">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold text-[var(--m)]">Active projects</span>
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-[#e8f2ff] text-[#3474db]"><Compass className="w-4 h-4" /></span>
            </div>
            <p className="text-[30px] leading-none font-bold tracking-tight text-[var(--t)] mt-4 mb-1">{activeProjectCount}</p>
            <p className="text-[12px] text-[var(--m)] m-0">{projects.filter((p) => p.pinned).length} pinned for quick access</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold text-[var(--m)]">Tasks completed</span>
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-[#e7f7ed] text-[#24804b]"><CheckCircle2 className="w-4 h-4" /></span>
            </div>
            <p className="text-[30px] leading-none font-bold tracking-tight text-[var(--t)] mt-4 mb-1">{doneTasks.length}<span className="text-[14px] font-medium text-[var(--m)] ml-1">/ {tasks.length}</span></p>
            <div className="h-1.5 rounded-full bg-[var(--s2)] overflow-hidden mt-3"><div className="h-full rounded-full bg-[#3a9b68]" style={{ width: (tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0) + '%' }} /></div>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold text-[var(--m)]">Due soon</span>
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-[#fff4d6] text-[#9b7200]"><Clock className="w-4 h-4" /></span>
            </div>
            <p className="text-[30px] leading-none font-bold tracking-tight text-[var(--t)] mt-4 mb-1">{dueSoon.length}</p>
            <p className="text-[12px] text-[var(--m)] m-0">{dueSoon.length ? 'Upcoming items to keep in view' : 'Nothing urgent in your current task list'}</p>
          </article>
        </div>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 md:px-8 mb-7 grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-5 sm:p-6 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--t)] m-0">Recent projects</h2>
              <p className="text-[12px] text-[var(--m)] mt-1 mb-0">Your latest work, all in one place.</p>
            </div>
            <button type="button" onClick={() => navigateTo('research', 'chat')} className="text-[12px] font-semibold text-[#3474db] hover:underline shrink-0">View all</button>
          </div>
          {projects.length ? (
            <div className="divide-y divide-[var(--line)]">
              {projects.slice(0, 5).map((proj) => {
                const projectTaskItems = tasks.filter((task) => task.projectId === proj.id);
                const completed = projectTaskItems.filter((task) => task.completed).length;
                const percent = projectTaskItems.length ? Math.round((completed / projectTaskItems.length) * 100) : 0;
                return (
                  <button key={proj.id} type="button" onClick={() => navigateTo('research', 'chat', proj.id)} className="w-full py-3.5 flex items-center gap-3 text-left hover:bg-[var(--s2)]/60 rounded-xl px-2 transition-colors">
                    <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 text-[12px] font-bold" style={{ backgroundColor: (proj.dotColor || '#f5c842') + '20', color: proj.dotColor || '#b88900' }}>{(proj.title || 'P').slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 min-w-0"><b className="text-[13px] text-[var(--t)] truncate">{proj.title}</b>{proj.pinned && <span className="text-[10px] text-[var(--m)] border border-[var(--line)] rounded-full px-2 py-0.5 shrink-0">Pinned</span>}</span>
                      <span className="block text-[11px] text-[var(--m)] mt-1 truncate">{proj.sourceCount} sources · {projectTaskItems.length - completed} open tasks · {proj.status || 'In progress'}</span>
                      <span className="block h-1 rounded-full bg-[var(--s2)] overflow-hidden mt-2"><span className="block h-full rounded-full bg-[#e7b820]" style={{ width: percent + '%' }} /></span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-[var(--m)] shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Compass className="w-7 h-7 text-[var(--m)] mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-[var(--t)] m-0">Your first project starts here.</p>
              <p className="text-[12px] text-[var(--m)] mt-1 mb-0">Create a study to keep your research and next steps together.</p>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-5 sm:p-6 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--t)] m-0">Due soon</h2>
              <p className="text-[12px] text-[var(--m)] mt-1 mb-0">A short list, not another thing to manage.</p>
            </div>
            <button type="button" onClick={() => navigateTo('tasks')} className="text-[12px] font-semibold text-[#3474db] hover:underline shrink-0">Open tasks</button>
          </div>
          {dueSoon.length ? (
            <div className="divide-y divide-[var(--line)]">
              {dueSoon.slice(0, 5).map((task) => (
                <button key={task.id} type="button" onClick={() => navigateTo('tasks')} className="w-full flex items-start gap-3 py-3 text-left rounded-lg hover:bg-[var(--s2)]/60 px-2 transition-colors">
                  <span className="mt-0.5 w-7 h-7 rounded-lg bg-[#fff4d6] dark:bg-[#473914] text-[#9b7200] grid place-items-center shrink-0"><Calendar className="w-3.5 h-3.5" /></span>
                  <span className="min-w-0 flex-1"><b className="block text-[12px] font-semibold text-[var(--t)] leading-snug">{task.title}</b><span className="block text-[11px] text-[var(--m)] mt-1">{task.dueDate || 'Date not set'}</span></span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--m)] mt-1 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-7 h-7 text-[#3a9b68] mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-[var(--t)] m-0">You have room to breathe.</p>
              <p className="text-[12px] text-[var(--m)] mt-1 mb-0">No upcoming tasks need attention right now.</p>
            </div>
          )}
        </article>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 md:px-8 mb-7">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div><h2 className="text-[16px] font-bold text-[var(--t)] m-0">Make today count</h2><p className="text-[12px] text-[var(--m)] mt-1 mb-0">Choose one useful next step and leave the rest for later.</p></div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.tone}`}><Trophy className="w-3.5 h-3.5" />{badge.title}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3"><div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-[#fff4d6] dark:bg-[#473914] text-[#9b7200] grid place-items-center"><Target className="w-4 h-4" /></span><h3 className="text-[14px] font-bold text-[var(--t)] m-0">Today's focus</h3></div><button type="button" onClick={() => { setFocusPickerStep('project'); setIsSetFocusModalOpen(true); }} className="text-[12px] font-semibold text-[#3474db] hover:underline">Change</button></div>
            <p className="text-[18px] font-bold text-[var(--t)] leading-snug m-0">{activeFocusTitle}</p>
            <p className="text-[12px] text-[var(--m)] mt-1 mb-0">{focusProject?.title || 'Choose a project to set your focus.'}</p>
            <div className="flex items-center justify-between text-[11px] text-[var(--m)] mt-5 mb-2"><span>Project progress</span><strong className="text-[var(--t)]">{focusProgress}%</strong></div>
            <div className="h-1.5 rounded-full bg-[var(--s2)] overflow-hidden"><div className="h-full rounded-full bg-[#e7b820]" style={{ width: focusProgress + '%' }} /></div>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--s)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><h3 className="text-[14px] font-bold text-[var(--t)] m-0">Your rhythm</h3><Flame className="w-4 h-4 text-[#e06b2c]" /></div>
            <div className="flex items-end gap-2 mt-4"><p className="text-[30px] leading-none font-bold text-[var(--t)] m-0">{streak.count}</p><p className="text-[12px] text-[var(--m)] m-0 pb-0.5">day streak</p></div>
            <div className="flex items-center justify-between gap-3 mt-5"><span className="text-[12px] text-[var(--m)]">Daily goal</span><button type="button" onClick={() => setIsGoalsOpen(true)} className="text-[12px] font-semibold text-[#3474db] hover:underline">Edit goal</button></div>
            <div className="flex items-center justify-between text-[12px] mt-2"><span className="text-[var(--m)]">{Math.min(doneTodayCount, goals.daily)} of {goals.daily} tasks</span><strong className="text-[var(--t)]">{dailyPct}%</strong></div>
            <div className="h-1.5 rounded-full bg-[var(--s2)] overflow-hidden mt-2"><div className="h-full rounded-full bg-[#3a9b68]" style={{ width: dailyPct + '%' }} /></div>
          </article>
        </div>
      </section>

      {/* Minimized ChatGPT-style composer for dashboard Q&A */}
      <div className="fixed bottom-6 inset-x-0 z-20 px-4 pointer-events-none">
        <div className="max-w-[560px] mx-auto pointer-events-auto">
          {dashReply && (
            <div className="mb-2 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[var(--s)] shadow-lg px-4 py-3 text-[13px] text-neutral-800 dark:text-white leading-relaxed">
              {dashReply}
            </div>
          )}
          <form
            onSubmit={askDashboard}
            className="flex items-center gap-1.5 p-1.5 pl-4 rounded-full bg-white dark:bg-[var(--s)] border border-black/8 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
          >
            <input
              value={dashDraft}
              onChange={(e) => setDashDraft(e.target.value)}
              placeholder="Ask about your stats, focus, or streak…"
              className="flex-1 min-w-0 h-10 bg-transparent outline-none text-[13px] text-neutral-900 dark:text-white placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={!dashDraft.trim() || dashBusy}
              className="shrink-0 grid h-10 w-10 place-items-center rounded-full bg-neutral-900 dark:bg-[#f5c842] text-white dark:text-[#171717] disabled:opacity-30 transition-all"
              aria-label="Ask Bob"
            >
              <CircleArrowUp className="w-5 h-5" strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>

      {/* Focus modal */}
      {isSetFocusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-[var(--s)] border border-black/5 dark:border-[var(--line)] rounded-[24px] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#f5c842]" />
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white m-0">Set today’s focus</h3>
              </div>
              <button type="button" onClick={() => setIsSetFocusModalOpen(false)} className="p-1.5 rounded-full hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-4 px-3 py-2 rounded-xl bg-[#f5c842]/15 border border-[#f5c842]/40 text-[11px] text-neutral-800 dark:text-white">
              This focus is always used to customize your experience with Bob.
            </div>
            {focusPickerStep === 'project' ? (
              <div className="mb-4">
                <div className="text-[11px] font-bold text-neutral-500 mb-2">1 · Choose your main project</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedFocusProjectId(project.id);
                        setSelectedFocusOverride(null);
                        localStorage.setItem('bob_focus_project_id', project.id);
                        localStorage.removeItem('bob_custom_focus_goal');
                        setFocusPickerStep('task');
                      }}
                      className={`w-full px-3.5 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        (selectedFocusProjectId || focusProject?.id) === project.id
                          ? 'bg-[#f5c842]/15 border-[#f5c842]'
                          : 'bg-neutral-50 dark:bg-[var(--s2)] border-neutral-200 dark:border-[var(--line)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <b className="block text-[12px] truncate">{project.title}</b>
                        <small className="block mt-0.5 text-[10px] opacity-70">
                          {project.sourceCount} sources · {project.openTasks} open
                        </small>
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFocusPickerStep('task')}
                  className="mt-3 w-full px-3 py-2.5 rounded-xl border border-dashed border-neutral-300 text-[11px] font-semibold text-neutral-500"
                >
                  Other · define a custom focus
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[11px] font-bold text-neutral-500">2 · What matters most?</div>
                  <button type="button" onClick={() => setFocusPickerStep('project')} className="text-[10px] font-semibold text-[#b88900]">
                    Change project
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {projectOpenTasks.length ? (
                    projectOpenTasks.slice(0, 8).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleSelectTaskAsFocus(task.title, focusProject?.id)}
                        className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-[var(--line)] text-left text-xs font-semibold flex items-center justify-between"
                      >
                        <span className="truncate">{task.title}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">{task.dueDate}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-[11px] text-neutral-500 py-2">No open tasks — add a custom focus below.</p>
                  )}
                </div>
              </div>
            )}
            {focusPickerStep === 'task' && (
              <form onSubmit={handleSaveCustomFocus} className="space-y-3">
                <div className="text-[11px] font-bold text-neutral-500">Or custom goal</div>
                <input
                  type="text"
                  value={customFocusText}
                  onChange={(e) => setCustomFocusText(e.target.value)}
                  placeholder="e.g. Finish the intro section…"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[var(--s2)] border border-neutral-200 dark:border-[var(--line)] text-xs outline-none focus:border-[#f5c842]"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsSetFocusModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-neutral-500">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-xs font-bold bg-[#f5c842] text-[#171717] rounded-xl">
                    Set as today’s focus
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Goals modal */}
      {isGoalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[var(--s)] rounded-[24px] border border-black/5 dark:border-[var(--line)] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold m-0">Goal settings</h3>
              <button type="button" onClick={() => setIsGoalsOpen(false)} className="p-1.5 rounded-full hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12px] text-neutral-500 mb-4 m-0">Bob verifies goals from completed tasks across your projects.</p>
            {(['daily', 'weekly', 'monthly'] as const).map((key) => (
              <label key={key} className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[13px] font-semibold capitalize">{key} tasks</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={goals[key]}
                  onChange={(e) => setGoals((g) => ({ ...g, [key]: Number(e.target.value) || 1 }))}
                  className="w-20 h-9 px-2 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-center text-sm font-bold outline-none"
                />
              </label>
            ))}
            <button type="button" onClick={() => saveGoals(goals)} className="mt-2 w-full h-10 rounded-xl bg-[#f5c842] text-[#171717] text-[13px] font-bold">
              Save goals
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
