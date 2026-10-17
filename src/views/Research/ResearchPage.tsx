import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatView } from './ChatView';
import { SummaryView } from './SummaryView';
import { TabsView } from './TabsView';
import { TasksView } from './TasksView';
import {
  GitFork,
  BookOpen,
  X,
  Sparkles,
  Send,
  Pencil,
  Pin,
  Check,
  PanelLeftClose,
  Bell,
  User,
} from 'lucide-react';

export const ResearchPage: React.FC = () => {
  const {
    researchSubView,
    setResearchSubView,
    activeResearchId,
    projects,
    activeSubtopic,
    openSubtopic,
    closeSubtopic,
    navigateTo,
    triggerThinking,
    messages,
    renameProject,
    togglePinProject,
    toggleSidebar,
    unreadNotifications,
    markNotificationsRead,
  } = useApp();

  const [subtopicPrompt, setSubtopicPrompt] = React.useState('');
  const [subtopicMessages, setSubtopicMessages] = React.useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([
    {
      role: 'assistant',
      text: 'Focused subtopic context active. How would you like to explore this without losing parent study continuity?',
    },
  ]);

  const project = projects.find((p) => p.id === activeResearchId) || projects[0];
  const [dismissedPlanFor, setDismissedPlanFor] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => setDismissedPlanFor(null), [activeResearchId]);
  useEffect(() => {
    setIsRenaming(false);
    setRenameDraft(project?.title || '');
  }, [project?.id, project?.title]);

  const recentConversation = messages.slice(-12);
  const userTurns = recentConversation.filter((message) => message.role === 'user');
  const recentUserText = userTurns.map((message) => message.text).join(' ');
  const planSignal =
    /\b(build|create|prepare|exam|deadline|study plan|launch|project|goal|practice|organize|learn|essay|assignment|business|app|website|finish|improve|deliver|research plan|roadmap|plan)\b/i.test(
      recentUserText
    );
  const hasEnoughContext = userTurns.length >= 3 && planSignal && recentUserText.length > 80;
  const showPlanSuggestion = hasEnoughContext && dismissedPlanFor !== activeResearchId;

  const handleSubtopicSend = () => {
    if (!subtopicPrompt.trim()) return;
    const text = subtopicPrompt.trim();
    setSubtopicPrompt('');
    setSubtopicMessages((prev) => [...prev, { role: 'user', text }]);
    triggerThinking('Analyzing subtopic', 'Isolating focused patterns...', 'Synthesizing focused context', () => {
      setSubtopicMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Noted in this focused thread. Ask the next concrete question and I’ll keep answers tight to this subtopic.',
        },
      ]);
    });
  };

  const commitRename = () => {
    if (!project?.id) return;
    const clean = renameDraft.trim();
    if (clean && clean !== project.title) renameProject(project.id, clean);
    setIsRenaming(false);
  };

  const tabs: Array<{ id: typeof researchSubView; label: string }> = [
    { id: 'chat', label: 'Research' },
    { id: 'summary', label: 'Summary' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'tasks', label: 'Tasks' },
  ];

  return (
    <div className="max-w-[1130px] mx-auto px-4 md:px-8 pt-3 pb-36">
      {/* Top bar: sidebar | centered project pill | notifications + profile */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-[var(--s)] text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)] transition-colors"
          title="Close side panel"
          aria-label="Toggle sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>

        {/* Centered project name pill */}
        <div className="group relative flex-1 max-w-[min(420px,70%)] mx-auto">
          <div className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-full border border-[var(--line)] bg-[var(--s)] shadow-sm">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: project?.dotColor || '#f5c842' }}
            />
            {isRenaming ? (
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') {
                    setIsRenaming(false);
                    setRenameDraft(project?.title || '');
                  }
                }}
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] font-semibold text-[var(--t)] text-center"
              />
            ) : (
              <span
                className="text-[13px] font-semibold text-[var(--t)] truncate max-w-[180px] sm:max-w-[260px] group-hover:max-w-none transition-all"
                title={project?.title}
              >
                {project?.title || 'Research'}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setRenameDraft(project?.title || '');
                setIsRenaming(true);
              }}
              className="p-1 rounded-lg text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)]"
              title="Rename project"
            >
              {isRenaming ? <Check className="w-3.5 h-3.5 text-[var(--y)]" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => project?.id && togglePinProject(project.id)}
              className={`p-1 rounded-lg hover:bg-[var(--s2)] ${
                project?.pinned ? 'text-[var(--y)]' : 'text-[var(--m)] hover:text-[var(--t)]'
              }`}
              title={project?.pinned ? 'Unpin from dashboard' : 'Pin to dashboard'}
            >
              <Pin className={`w-3.5 h-3.5 ${project?.pinned ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              markNotificationsRead();
              navigateTo('notifications');
            }}
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-[var(--s)] text-[var(--m)] hover:text-[var(--t)]"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[var(--y)] text-[#171717] text-[9px] font-bold grid place-items-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigateTo('profile')}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-[var(--s)] text-[var(--m)] hover:text-[var(--t)]"
            title="Profile"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs moved up — Research / Summary / Tabs / Tasks / Project Notes */}
      <div className="h-11 border-b border-[var(--line)] flex items-center gap-5 sm:gap-7 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setResearchSubView(tab.id)}
            className={`h-11 shrink-0 text-[13px] transition-colors relative ${
              researchSubView === tab.id
                ? 'font-bold text-[var(--t)] after:content-[""] after:h-[2.5px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px]'
                : 'text-[#888] hover:text-[var(--t)] font-medium'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem('bob_notes_project_filter', activeResearchId || '');
            } catch {}
            navigateTo('notes');
          }}
          className="h-11 shrink-0 text-[13px] font-medium text-[#888] hover:text-[var(--t)] flex items-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Project notes
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => openSubtopic('New focused subtopic')}
          className="h-8 px-3 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[11px] font-bold flex items-center gap-1.5 shrink-0"
        >
          <GitFork className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Subtopic</span>
        </button>
      </div>

      {showPlanSuggestion && (
        <div className="mb-5 rounded-[20px] border border-[#d4e2ff] dark:border-[#2e466b] bg-gradient-to-r from-[#edf4ff] via-white to-[#fff8dc] dark:from-[#17283d] dark:via-[#151b25] dark:to-[#2b2618] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-2xl bg-[#dbe8ff] dark:bg-[#243a5c] text-[#3474db] grid place-items-center">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="m-0 text-sm font-extrabold text-[var(--t)]">Would a focus plan help?</h3>
              <p className="m-0 mt-0.5 text-[12px] text-[var(--m)]">Bob can shape next steps from this conversation.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDismissedPlanFor(activeResearchId)}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-[var(--m)]"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => {
                const context = recentConversation
                  .map((m) => (m.role === 'user' ? 'User: ' : 'Bob: ') + m.text)
                  .join('\n')
                  .slice(-4500);
                window.dispatchEvent(
                  new CustomEvent('bob-open-roadmap', {
                    detail: { title: '', origin: 'chat', context, projectId: activeResearchId },
                  })
                );
                setDismissedPlanFor(activeResearchId);
              }}
              className="rounded-xl bg-[#3474db] px-4 py-2 text-xs font-extrabold text-white"
            >
              Build a focus plan
            </button>
          </div>
        </div>
      )}

      {activeSubtopic && (
        <div className="mb-5 bg-[var(--s)] border-2 border-[var(--y)] rounded-[20px] p-4 shadow-lg relative">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-3">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-[var(--y)]" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--y)]">Focused subtopic</span>
                <h3 className="text-[14px] font-bold text-[var(--t)] m-0">{activeSubtopic.title}</h3>
              </div>
            </div>
            <button type="button" onClick={closeSubtopic} className="p-1.5 rounded-lg hover:bg-[var(--s2)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
            {subtopicMessages.map((m, i) => (
              <p key={i} className={`text-[12px] m-0 ${m.role === 'user' ? 'text-right text-[var(--t)]' : 'text-[var(--m)]'}`}>
                {m.text}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={subtopicPrompt}
              onChange={(e) => setSubtopicPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubtopicSend()}
              placeholder="Ask about this subtopic…"
              className="flex-1 h-9 px-3 text-[12px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none"
            />
            <button
              type="button"
              onClick={handleSubtopicSend}
              className="h-9 px-3 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-semibold text-[11px]"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {researchSubView === 'chat' && <ChatView />}
      {researchSubView === 'summary' && <SummaryView />}
      {researchSubView === 'tabs' && <TabsView />}
      {researchSubView === 'tasks' && <TasksView />}
    </div>
  );
};
