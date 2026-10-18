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
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  CheckCircle2,
  ListTodo,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { RoadmapWizardModal } from '../../components/roadmap/RoadmapWizardModal';
import { resolveGeminiApiKey } from '../../lib/ai/keyManager';
import { GoogleGenAI } from '@google/genai';
import { buildSharedCompanionContext } from '../../lib/companionContext';

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

  const [isRoadmapWizardOpen, setIsRoadmapWizardOpen] = useState(false);
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
  const doneToday = doneTasks.filter((t) => {
    const d = (t as { completedAt?: string }).completedAt || t.dueDate || '';
    return String(d).toLowerCase().includes('today') || t.completed;
  }).length;
  // Prefer counting completed tasks as today's progress when timestamps missing
  const doneTodayCount = Math.max(
    doneToday,
    doneTasks.filter((t) => t.completed).length > 0
      ? Math.min(doneTasks.length, goals.daily)
      : 0
  );

  const focusProject = projects.find((p) => p.id === selectedFocusProjectId) || projects[0] || null;
  const projectTasks = focusProject ? tasks.filter((t) => t.projectId === focusProject.id) : [];
  const projectOpenTasks = projectTasks.filter((t) => !t.completed);
  const dueSoon = openTasks
    .filter((t) => {
      const d = (t.dueDate || '').toLowerCase();
      return d.includes('today') || d.includes('tomorrow') || d.includes('week') || !d;
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
      const ai = new GoogleGenAI({ apiKey: key });
      const sharedWorkspaceContext = buildSharedCompanionContext(activeResearchId);
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are Bob. Answer briefly about this user's dashboard using the JSON context and relevant shared workspace facts. Be clear and practical (2–5 sentences max).\n\nDashboard context:\n${dashboardContext}\n\nShared workspace context:\n${sharedWorkspaceContext || 'No additional workspace context available.'}\n\nQuestion: ${q}`,
              },
            ],
          },
        ],
        config: { maxOutputTokens: 220 },
      });
      const text =
        (result as { text?: string }).text ||
        (result as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ||
        'I could not read the dashboard just now.';
      setDashReply(String(text).trim());
    } catch {
      setDashReply('Something went wrong talking to Gemini. Try again in a moment.');
    } finally {
      setDashBusy(false);
      setDashDraft('');
    }
  };

  return (
    <div className="w-full min-h-full bg-[#fafafa] dark:bg-[var(--bg)] pb-28 animate-in fade-in duration-300">
      {/* Header */}
      <header className="max-w-[1120px] mx-auto px-5 md:px-8 pt-8 pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400 m-0">Overview</p>
        <div className="mt-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-neutral-900 dark:text-white m-0">
              Dashboard
            </h1>
            <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-[var(--m)] m-0 max-w-md">
              {userName ? `${userName}, ` : ''}a calm view of progress, focus, and what’s due.
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

      {/* Pinned projects — quick access from research pin */}
      {projects.some((p) => p.pinned) && (
        <div className="max-w-[1120px] mx-auto px-5 md:px-8 mb-5">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-neutral-400 m-0 mb-3">Pinned</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects
              .filter((p) => p.pinned)
              .map((proj) => {
                const pTasks = tasks.filter((t) => t.projectId === proj.id);
                const done = pTasks.filter((t) => t.completed).length;
                const open = pTasks.filter((t) => !t.completed).length;
                const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => navigateTo('research', 'chat', proj.id)}
                    className="text-left rounded-[18px] border border-neutral-200/80 dark:border-[var(--line)] bg-white dark:bg-[var(--s)] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.dotColor || '#f5c842' }} />
                      <b className="text-[13px] text-neutral-900 dark:text-white truncate">{proj.title}</b>
                    </div>
                    <p className="text-[11px] text-neutral-500 m-0 line-clamp-2 min-h-[2.4em]">{proj.summary || 'Pinned project'}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-neutral-400">
                      <span>
                        {done} done · {open} open
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#f5c842]" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Card grid */}
      <div className="max-w-[1120px] mx-auto px-5 md:px-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Streak / stars — Duolingo-inspired */}
        <div className="rounded-[22px] border border-[#ffd4b8] bg-gradient-to-br from-[#fff4ec] to-white dark:from-[#3a2a22] dark:to-[var(--s)] dark:border-[#5a4030] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-[#ffe0cc] dark:bg-[#5a3a28] text-[#e06b2c] grid place-items-center">
                <Flame className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white m-0">Streak</h3>
                <p className="text-[11px] text-neutral-500 m-0">Come back daily</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#e06b2c]">
              {[0, 1, 2].map((i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.min(3, streak.count) ? 'fill-current' : 'opacity-30'}`} />
              ))}
            </div>
          </div>
          <p className="text-[36px] font-black tracking-tight text-neutral-900 dark:text-white m-0 leading-none">
            {streak.count}
            <span className="text-[14px] font-bold text-neutral-400 ml-1.5">days</span>
          </p>
          <p className="mt-2 text-[12px] text-neutral-500 m-0">Keep a calm rhythm — open Bob once a day to grow the streak.</p>
        </div>

        {/* Today’s focus */}
        <div className="rounded-[22px] border border-[#f5e7b4] bg-gradient-to-br from-[#fff8df] to-white dark:from-[#332b18] dark:to-[var(--s)] dark:border-[#5b4b27] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-[#f5c842]/25 text-[#b88900] grid place-items-center">
                <Compass className="w-4.5 h-4.5" />
              </span>
              <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white m-0">Today’s focus</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setFocusPickerStep('project');
                setIsSetFocusModalOpen(true);
              }}
              className="text-[11px] font-bold text-[#b88900] hover:underline"
            >
              Change
            </button>
          </div>
          <p className="text-[15px] font-bold text-neutral-900 dark:text-white leading-snug m-0 line-clamp-2">{activeFocusTitle}</p>
          <p className="mt-1 text-[11px] text-neutral-500 m-0">{focusProject?.title || 'No project yet'}</p>
          <div className="mt-4 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-[#f5c842] transition-all" style={{ width: `${focusProgress}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-neutral-500 m-0">{focusProgress}% of project tasks done</p>
        </div>

        {/* Daily goal progress */}
        <div className="rounded-[22px] border border-[#c9e9d0] bg-gradient-to-br from-[#e9f7ec] to-white dark:from-[#1b3025] dark:to-[var(--s)] dark:border-[#31543f] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-[#c9e9d0] dark:bg-[#31543f] text-[#1f7a4a] grid place-items-center">
                <Target className="w-4.5 h-4.5" />
              </span>
              <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white m-0">Daily goal</h3>
            </div>
            <button type="button" onClick={() => setIsGoalsOpen(true)} className="text-[11px] font-bold text-[#1f7a4a] hover:underline">
              Set goals
            </button>
          </div>
          <p className="text-[28px] font-black text-neutral-900 dark:text-white m-0">
            {Math.min(doneTodayCount, goals.daily)}
            <span className="text-[14px] font-bold text-neutral-400"> / {goals.daily} tasks</span>
          </p>
          <div className="mt-3 h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-[#34c759] transition-all" style={{ width: `${dailyPct}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 m-0">Bob checks goals against completed tasks on your projects.</p>
        </div>

        {/* Stats: done vs open */}
        <div className="rounded-[22px] border border-[#cbdfff] bg-gradient-to-br from-[#eaf3ff] to-white dark:from-[#1b293b] dark:to-[var(--s)] dark:border-[#2d4565] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-9 h-9 rounded-2xl bg-[#dbe8ff] dark:bg-[#2d4565] text-[#3474db] grid place-items-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </span>
            <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white m-0">Task balance</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/70 dark:bg-black/20 p-3 border border-black/5 dark:border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 m-0">Done</p>
              <p className="text-[22px] font-black text-[#3474db] m-0 mt-1">{doneTasks.length}</p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-black/20 p-3 border border-black/5 dark:border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 m-0">Open</p>
              <p className="text-[22px] font-black text-neutral-800 dark:text-white m-0 mt-1">{openTasks.length}</p>
            </div>
          </div>
        </div>

        {/* Due soon */}
        <div className="rounded-[22px] border border-[#f2d0c5] bg-gradient-to-br from-[#fff0eb] to-white dark:from-[#38251f] dark:to-[var(--s)] dark:border-[#674035] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-2xl bg-[#ffd8cc] dark:bg-[#674035] text-[#c45c2a] grid place-items-center">
              <Clock className="w-4.5 h-4.5" />
            </span>
            <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white m-0">Due soon</h3>
          </div>
          {dueSoon.length === 0 ? (
            <p className="text-[12px] text-neutral-500 m-0">Nothing urgent. Enjoy the calm.</p>
          ) : (
            <ul className="space-y-2 m-0 p-0 list-none">
              {dueSoon.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="font-semibold text-neutral-800 dark:text-white truncate">{t.title}</span>
                  <span className="text-[10px] font-bold text-neutral-400 shrink-0">{t.dueDate || 'Soon'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent projects */}
        <div className="rounded-[22px] border border-[#e0d0f5] bg-gradient-to-br from-[#f3eaff] to-white dark:from-[#2a1f3d] dark:to-[var(--s)] dark:border-[#4a3a65] p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-[#e8d9ff] dark:bg-[#4a3a65] text-[#6b4bb8] grid place-items-center">
                <ListTodo className="w-4.5 h-4.5" />
              </span>
              <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white m-0">Recent projects</h3>
            </div>
            <button type="button" onClick={() => navigateTo('research', 'chat')} className="text-[11px] font-bold text-[#6b4bb8] hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-1">
            {projects.slice(0, 4).map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => navigateTo('research', 'chat', proj.id)}
                className="w-full flex items-center justify-between gap-2 py-2.5 px-2 -mx-1 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/5 text-left transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.dotColor || '#f59e0b' }} />
                  <span className="min-w-0">
                    <b className="block text-[13px] text-neutral-900 dark:text-white truncate">{proj.title}</b>
                    <small className="text-[10px] text-neutral-400">
                      {proj.sourceCount} sources · {proj.status}
                    </small>
                  </span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
              </button>
            ))}
            {projects.length === 0 && <p className="text-[12px] text-neutral-500 m-0">Start a study from Home to see projects here.</p>}
          </div>
        </div>

        {/* Top project highlight */}
        <div className="rounded-[22px] border border-[#c9e6f5] bg-gradient-to-br from-[#e8f6fc] to-white dark:from-[#1a2e38] dark:to-[var(--s)] dark:border-[#2d4f5c] p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-2xl bg-[#cfeaf5] dark:bg-[#2d4f5c] text-[#2a8fad] grid place-items-center">
              <Sparkles className="w-4.5 h-4.5" />
            </span>
            <div>
              <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white m-0">Top project</h3>
              <p className="text-[11px] text-neutral-500 m-0">Most active workspace</p>
            </div>
          </div>
          {focusProject ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[18px] font-extrabold text-neutral-900 dark:text-white m-0">{focusProject.title}</p>
                <p className="mt-1 text-[12px] text-neutral-500 m-0">
                  {focusProject.sourceCount} sources · {projectOpenTasks.length} open · {doneInProject} done
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('research', 'chat', focusProject.id)}
                className="h-10 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[12px] font-bold inline-flex items-center gap-1.5 shrink-0"
              >
                Open research
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-neutral-500 m-0">Create a project to pin your top workspace.</p>
          )}
        </div>
      </div>

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

      <RoadmapWizardModal
        isOpen={isRoadmapWizardOpen}
        onClose={() => setIsRoadmapWizardOpen(false)}
        onFinishRoadmap={(data) => {
          data.tasks.forEach((t) => addTask(t.title, data.deadline));
          navigateTo('research', 'tasks');
        }}
      />
    </div>
  );
};
