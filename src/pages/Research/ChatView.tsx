import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../../components/BobAvatar';
import { 
  Sparkles, 
  ExternalLink, 
  Bookmark, 
  Layers, 
  GitFork, 
  Copy, 
  Check, 
  Share2, 
  RotateCcw 
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { 
    activeResearchId, 
    projects, 
    triggerThinking, 
    openSubtopic, 
    addNote, 
    navigateTo 
  } = useApp();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({});

  const project = projects.find((p) => p.id === activeResearchId) || projects[0];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveToNotes = (cardId: string, title: string, text: string) => {
    addNote({
      title,
      selectedText: text,
      sourceTitle: `${project.title} · Cross-AI synthesis`,
      sourceUrl: 'bob.local/research/' + project.id,
      projectId: project.id,
      relevance: 95,
      color: 'emerald',
    });
    setSavedNotes((prev) => ({ ...prev, [cardId]: true }));
    triggerThinking('Saved to Notes', 'Added evidence card to your research notebook.', 'Writing note entry');
  };

  return (
    <div className="max-w-[850px] mx-auto py-2">
      {/* Hero */}
      <div className="py-3 pb-7">
        <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
          TODAY · FOCUSED RESEARCH
        </div>
        <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
          What are you trying to understand?
        </h1>
        <p className="text-[var(--m)] leading-relaxed max-w-[680px] text-[13px]">
          Bob connects what you are reading, what you have asked other AIs, and what you need to finish next.
        </p>

        <div className="flex gap-2 flex-wrap mt-4">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
            12 browser tabs
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
            3 AI conversations
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
            2 deadlines this week
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-5">
        {/* Assistant initial greeting */}
        <div className="flex gap-3 items-start">
          <BobAvatar size={28} />
          <div className="max-w-[75%] bg-[var(--s2)] text-[var(--t)] px-4 py-3 rounded-[17px] text-[12px] leading-relaxed">
            I found a few threads across your research on <b>{project.title}</b>. What should we focus on first?
          </div>
        </div>

        {/* User query */}
        <div className="flex gap-3 items-start justify-end">
          <div className="max-w-[75%] bg-[var(--bs)] text-[#1e3a8a] dark:text-[#bfdbfe] px-4 py-3 rounded-[17px] text-[12px] leading-relaxed">
            Help me understand the strongest ideas and turn them into a plan I can actually finish.
          </div>
        </div>

        {/* Bob Synthesized Response Card */}
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[var(--t)] m-0">
              Here is the thread I see
            </h3>
            <span className="text-[9px] font-semibold tracking-wider uppercase text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2 py-0.5 rounded-full">
              Cross-Source Synthesis
            </span>
          </div>

          <p className="text-[12px] text-[#50504b] dark:text-[#d3ccc3] leading-relaxed m-0">
            Your sources are converging around three themes. I can compare them, surface contradictions, and turn the useful parts into concrete next steps.
          </p>

          <ul className="text-[12px] text-[#50504b] dark:text-[#d3ccc3] space-y-1.5 pl-4 list-disc leading-relaxed">
            <li>
              <b>Problem:</b> research is scattered across 12 tabs and 3 AI chats.
            </li>
            <li>
              <b>Signal:</b> independent evidence confirms booking and pricing friction before complexity is added.
            </li>
            <li>
              <b>Next move:</b> validate the highest-impact assumption with 2 user interviews.
            </li>
          </ul>

          {/* Sources Rail */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            <span className="px-2 py-1 bg-[var(--s2)] border border-[var(--line)] rounded-[9px] text-[10px] text-[#555] dark:text-[#ccc]">
              ↗ 5 browser sources
            </span>
            <span className="px-2 py-1 bg-[var(--s2)] border border-[var(--line)] rounded-[9px] text-[10px] text-[#555] dark:text-[#ccc]">
              Claude · 2 chats
            </span>
            <span className="px-2 py-1 bg-[var(--s2)] border border-[var(--line)] rounded-[9px] text-[10px] text-[#555] dark:text-[#ccc]">
              ChatGPT · 1 chat
            </span>
            <span className="px-2 py-1 bg-[var(--s2)] border border-[var(--line)] rounded-[9px] text-[10px] text-[#555] dark:text-[#ccc]">
              Task · Validate idea
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--line)]">
            <button
              onClick={() => handleCopy('main-card', 'Problem: research is scattered across tabs. Signal: independent evidence confirms booking friction. Next move: validate assumption.')}
              title="Copy text"
              className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)] transition-colors"
            >
              {copiedId === 'main-card' ? <Check className="w-4 h-4 text-[var(--g)]" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={() =>
                handleSaveToNotes(
                  'main-card',
                  'Synthesis: Problem & Signal Convergence',
                  'Your sources are converging around three themes: scattered context, high-impact friction, and immediate user validation.'
                )
              }
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium ${
                savedNotes['main-card']
                  ? 'text-[var(--g)] bg-[var(--s2)]'
                  : 'hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)]'
              }`}
              title="Save to Notes"
            >
              <Bookmark className="w-4 h-4" />
              <span>{savedNotes['main-card'] ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={() => openSubtopic('Transport booking friction deep dive')}
              className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)] transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="Create Subtopic"
            >
              <GitFork className="w-4 h-4 text-[var(--y)]" />
              <span>Create Subtopic</span>
            </button>

            <button
              onClick={() => navigateTo('research', 'summary')}
              className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)] transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="View full summary"
            >
              <Layers className="w-4 h-4 text-[var(--b)]" />
              <span>View Summary</span>
            </button>

            <span className="flex-1" />

            <button
              onClick={() => triggerThinking('Regenerating synthesis', 'Re-evaluating cross-tab contradictions...', 'Filtering noise')}
              className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)] transition-colors"
              title="Regenerate"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
