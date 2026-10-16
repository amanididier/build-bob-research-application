import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatView } from './ChatView';
import { SummaryView } from './SummaryView';
import { TabsView } from './TabsView';
import { TasksView } from './TasksView';
import { GitFork, BookOpen, X, Sparkles, Send, ChevronDown } from 'lucide-react';
import { BobAvatar } from '../../components/BobAvatar';

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
  } = useApp();

  const [subtopicPrompt, setSubtopicPrompt] = React.useState('');
  const [subtopicMessages, setSubtopicMessages] = React.useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Focused subtopic context active. How would you like to explore booking abandonment friction without losing parent study continuity?',
    },
  ]);

  const project = projects.find((p) => p.id === activeResearchId) || projects[0];
  const [dismissedPlanFor, setDismissedPlanFor] = useState<string | null>(null);
  useEffect(() => setDismissedPlanFor(null), [activeResearchId]);
  const recentConversation = messages.slice(-12);
  const userTurns = recentConversation.filter((message) => message.role === 'user');
  const recentUserText = userTurns.map((message) => message.text).join(' ');
  const planSignal = /\b(build|create|prepare|exam|deadline|study plan|launch|project|goal|practice|organize|learn|essay|assignment|business|app|website|finish|improve|deliver|research plan|roadmap|plan)\b/i.test(recentUserText);
  // Dynamic threshold: after enough substance (not a fixed turn count). Varies by project complexity.
  const hasEnoughContext = userTurns.length >= 3 && planSignal && recentUserText.length > 80;
  const showPlanSuggestion = hasEnoughContext && dismissedPlanFor !== activeResearchId;

  const handleSubtopicSend = () => {
    if (!subtopicPrompt.trim()) return;
    const text = subtopicPrompt.trim();
    setSubtopicPrompt('');
    setSubtopicMessages((prev) => [...prev, { role: 'user', text }]);
    triggerThinking('Analyzing subtopic', 'Isolating specific passenger friction patterns...', 'Synthesizing focused context', () => {
      setSubtopicMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `In this focused subtopic: 3 independent reviews verify that passengers abandon checkout primarily when payment currency conversion and mobile money carrier fees are revealed late in the flow.`,
        },
      ]);
    });
  };

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Research Top Context & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--line)]">
        <div>
          <div className="text-[10px] tracking-[0.09em] text-[#999] uppercase font-semibold">
            ACTIVE PROJECT
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project.dotColor }}
            />
            <h2 className="text-[20px] font-extrabold tracking-tight text-[var(--t)] m-0">
              {project.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notes Action — always opens this project's notes */}
          <button
            onClick={() => {
              try { localStorage.setItem('bob_notes_project_filter', activeResearchId || ''); } catch {}
              navigateTo('notes');
            }}
            className="h-8 px-3 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--m)]" />
            <span>Project Notes</span>
          </button>

          {/* Yellow + Add Subtopic button as requested */}
          <button
            onClick={() => openSubtopic('Booking friction & cancellation reasons')}
            className="h-8 px-3 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>+ Add Subtopic</span>
          </button>
        </div>
      </div>

      {showPlanSuggestion && (
        <div className="mb-6 rounded-[22px] border border-[#d4e2ff] dark:border-[#2e466b] bg-gradient-to-r from-[#edf4ff] via-white to-[#fff8dc] dark:from-[#17283d] dark:via-[#151b25] dark:to-[#2b2618] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-[#dbe8ff] dark:bg-[#243a5c] text-[#3474db] grid place-items-center"><Sparkles className="h-5 w-5" /></div>
            <div>
              <p className="m-0 text-[10px] uppercase tracking-[0.14em] font-extrabold text-[#3474db] dark:text-[#a9c8ff]">A LITTLE STRUCTURE, IF YOU WANT IT</p>
              <h3 className="mt-1 mb-1 text-sm font-extrabold text-[var(--t)]">Would a focus plan help with this?</h3>
              <p className="m-0 text-[12px] leading-relaxed text-[var(--m)]">Bob can use this conversation to shape a few next steps. You can keep chatting without making a plan.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setDismissedPlanFor(activeResearchId)} className="rounded-xl px-3 py-2 text-xs font-semibold text-[var(--m)] hover:bg-white/70 dark:hover:bg-black/20">Not now</button>
            <button type="button" onClick={() => {
              const context = recentConversation.map((message) => (message.role === 'user' ? 'User: ' : 'Bob: ') + message.text).join('\n').slice(-4500);
              window.dispatchEvent(new CustomEvent('bob-open-roadmap', { detail: { title: '', origin: 'chat', context, projectId: activeResearchId } }));
              setDismissedPlanFor(activeResearchId);
            }} className="rounded-xl bg-[#3474db] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#245fc0] shadow-sm">Build a focus plan</button>
          </div>
        </div>
      )}

      {/* Subtopic Dedicated Focused View Modal / Rail */}
      {activeSubtopic && (
        <div className="mb-7 bg-[var(--s)] border-2 border-[var(--y)] rounded-[20px] p-5 shadow-lg relative">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-[var(--ys)] text-[#765700]">
                <GitFork className="w-4 h-4 text-[var(--y)]" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--y)]">
                  Focused Child Research Thread
                </span>
                <h3 className="text-[15px] font-bold text-[var(--t)] m-0">
                  {activeSubtopic.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--m)]">
                Parent: {project.title}
              </span>
              <button
                onClick={closeSubtopic}
                className="p-1 rounded-full hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors"
                title="Close subtopic"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {subtopicMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && <BobAvatar size={24} />}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-[15px] text-[12px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--bs)] text-[#1e3a8a] dark:text-[#bfdbfe]'
                      : 'bg-[var(--s2)] text-[var(--t)]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3.5 pt-3 border-t border-[var(--line)] flex gap-2">
            <input
              type="text"
              value={subtopicPrompt}
              onChange={(e) => setSubtopicPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubtopicSend()}
              placeholder="Ask Bob specifically about this subtopic..."
              className="flex-1 h-9 px-3 text-[12px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none"
            />
            <button
              onClick={handleSubtopicSend}
              className="h-9 px-3.5 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-semibold text-[11px] flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* Research-specific Navigation (Research, Summary, Tabs, Tasks) */}
      <div className="h-12 border-b border-[var(--line)] flex gap-8 mb-6 sticky top-0 bg-[var(--bg)] z-10 pt-0.5">
        <button
          onClick={() => setResearchSubView('chat')}
          className={`h-12 transition-colors relative ${
            researchSubView === 'chat'
              ? 'font-bold text-[var(--t)] after:content-[""] after:h-[2px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px]'
              : 'text-[#888] hover:text-[var(--t)]'
          }`}
        >
          Research
        </button>

        <button
          onClick={() => setResearchSubView('summary')}
          className={`h-12 transition-colors relative ${
            researchSubView === 'summary'
              ? 'font-bold text-[var(--t)] after:content-[""] after:h-[2px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px]'
              : 'text-[#888] hover:text-[var(--t)]'
          }`}
        >
          Summary
        </button>

        <button
          onClick={() => setResearchSubView('tabs')}
          className={`h-12 transition-colors relative ${
            researchSubView === 'tabs'
              ? 'font-bold text-[var(--t)] after:content-[""] after:h-[2px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px]'
              : 'text-[#888] hover:text-[var(--t)]'
          }`}
        >
          Tabs
        </button>

        <button
          onClick={() => setResearchSubView('tasks')}
          className={`h-12 transition-colors relative ${
            researchSubView === 'tasks'
              ? 'font-bold text-[var(--t)] after:content-[""] after:h-[2px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px]'
              : 'text-[#888] hover:text-[var(--t)]'
          }`}
        >
          Tasks
        </button>
      </div>

      {/* Render Active Sub-View */}
      {researchSubView === 'chat' && <ChatView />}
      {researchSubView === 'summary' && <SummaryView />}
      {researchSubView === 'tabs' && <TabsView />}
      {researchSubView === 'tasks' && <TasksView />}

      {/* Floating Scroll Down button on right side above composer */}
      <button
        type="button"
        onClick={() => {
          const mainEl = document.querySelector('main');
          if (mainEl) {
            mainEl.scrollTo({ top: mainEl.scrollHeight, behavior: 'smooth' });
          } else {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }
        }}
        title="Scroll to bottom"
        aria-label="Scroll to bottom"
        className="fixed bottom-24 right-8 z-30 w-9 h-9 rounded-full bg-[var(--s)]/95 hover:bg-[var(--s2)] border border-[var(--line)] shadow-md flex items-center justify-center text-[var(--m)] hover:text-[var(--t)] transition-all active:scale-90 cursor-pointer backdrop-blur-md"
      >
        <ChevronDown className="w-4 h-4 stroke-[2.2]" />
      </button>
    </div>
  );
};
