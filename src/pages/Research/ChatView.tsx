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
  RotateCcw,
  CheckSquare,
  Cpu,
  Database
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { 
    activeResearchId, 
    projects, 
    triggerThinking, 
    openSubtopic, 
    addNote, 
    addTask,
    navigateTo,
    messages,
    isAiGenerating,
    sendMessage,
    memoryStats
  } = useApp();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({});
  const [extractedTasks, setExtractedTasks] = useState<Record<string, boolean>>({});

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
      sourceTitle: `${project.title} · Local PC Synthesis`,
      sourceUrl: 'bob.local/memory/' + project.id,
      projectId: project.id,
      relevance: 95,
      color: 'emerald',
    });
    setSavedNotes((prev) => ({ ...prev, [cardId]: true }));
    triggerThinking('Saved to Notes', 'Added evidence card to your research notebook and local PC memory.', 'Writing note entry');
  };

  const handleExtractTask = (cardId: string, text: string) => {
    addTask(`Validate findings: ${text.slice(0, 45)}...`, 'Due tomorrow', project.id);
    setExtractedTasks((prev) => ({ ...prev, [cardId]: true }));
    triggerThinking('Task created', 'Added research action item to your tasks list.', 'Task logged');
  };

  return (
    <div className="max-w-[850px] mx-auto py-2">
      {/* Hero */}
      <div className="py-3 pb-7">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            TODAY · FOCUSED ON-DEVICE RESEARCH
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--m)] font-mono bg-[var(--s2)] px-2.5 py-1 rounded-full border border-[var(--line)]">
            <Database className="w-3 h-3 text-[var(--y)]" />
            <span>{memoryStats.totalNodes} local memory items on PC</span>
          </div>
        </div>

        <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
          What are you trying to understand?
        </h1>
        <p className="text-[var(--m)] leading-relaxed max-w-[680px] text-[13px]">
          Bob connects what you are reading, notes stored on your PC, and what you need to finish next.
        </p>

        <div className="flex gap-2 flex-wrap mt-4">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
            {project.sourceCount} browser tabs
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
            {memoryStats.notesCount} local notes
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
            100% offline & private
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-5">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex gap-3 items-start justify-end">
                <div className="max-w-[78%] bg-[var(--bs)] text-[#1e3a8a] dark:text-[#bfdbfe] px-4 py-3 rounded-[17px] text-[12.5px] leading-relaxed shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          // Assistant synthesis message
          return (
            <div key={msg.id} className="space-y-3">
              <div className="flex gap-3 items-start">
                <BobAvatar size={28} />
                <div className="flex-1 bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.03)] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--y)]" />
                      <h3 className="text-[15px] font-bold text-[var(--t)] m-0">
                        Bob Synthesis & Reasoning
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.tokensPerSec && (
                        <span className="text-[9px] font-mono text-[var(--m)]">
                          {msg.tokensPerSec} t/s
                        </span>
                      )}
                      <span className="text-[9px] font-semibold tracking-wider uppercase text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2 py-0.5 rounded-full">
                        Local PC Model
                      </span>
                    </div>
                  </div>

                  <div className="text-[12.5px] text-[#50504b] dark:text-[#d3ccc3] leading-relaxed whitespace-pre-line">
                    {msg.text}
                  </div>

                  {/* Sources Rail if available */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-[var(--line)]">
                      <div className="text-[10px] font-bold text-[var(--m)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-[var(--b)]" />
                        <span>Grounded in Evidence from Your PC:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, idx) => (
                          <div
                            key={idx}
                            title={s.snippet || s.url}
                            className="px-2.5 py-1 bg-[var(--s2)] border border-[var(--line)] rounded-[9px] text-[10.5px] text-[#555] dark:text-[#ccc] flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3 h-3 text-[var(--y)]" />
                            <span className="truncate max-w-[200px] font-medium">{s.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--line)]">
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      title="Copy text"
                      className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)] transition-colors"
                    >
                      {copiedId === msg.id ? <Check className="w-4 h-4 text-[var(--g)]" /> : <Copy className="w-4 h-4 text-[var(--m)]" />}
                    </button>

                    <button
                      onClick={() =>
                        handleSaveToNotes(
                          msg.id,
                          `Synthesis on ${project.title}`,
                          msg.text.slice(0, 240) + '...'
                        )
                      }
                      className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium ${
                        savedNotes[msg.id]
                          ? 'text-[var(--g)] bg-[var(--s2)]'
                          : 'hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)]'
                      }`}
                      title="Save to Notes"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{savedNotes[msg.id] ? 'Saved to Notes' : 'Save to Notes'}</span>
                    </button>

                    <button
                      onClick={() => handleExtractTask(msg.id, msg.text)}
                      className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium ${
                        extractedTasks[msg.id]
                          ? 'text-[var(--g)] bg-[var(--s2)]'
                          : 'hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)]'
                      }`}
                      title="Turn into Task"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--b)]" />
                      <span>{extractedTasks[msg.id] ? 'Task Logged' : 'Turn into Task'}</span>
                    </button>

                    <button
                      onClick={() => openSubtopic('Focused investigation')}
                      className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)] transition-colors flex items-center gap-1 text-[11px] font-medium"
                      title="Create Subtopic"
                    >
                      <GitFork className="w-3.5 h-3.5 text-[var(--y)]" />
                      <span>Subtopic</span>
                    </button>

                    <span className="flex-1" />

                    <button
                      onClick={() => sendMessage('Can you re-synthesize this focusing on the biggest contradictions?')}
                      className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[#777] hover:text-[var(--t)] transition-colors"
                      title="Re-synthesize"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Generating Skeleton state */}
        {isAiGenerating && (
          <div className="flex gap-3 items-start animate-pulse">
            <BobAvatar size={28} />
            <div className="flex-1 bg-[var(--s)] border border-[var(--line)] rounded-[19px] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--y)] animate-ping" />
                <span className="text-[12px] font-semibold text-[var(--t)]">
                  Bob is running local on-device reasoning...
                </span>
              </div>
              <div className="h-3 bg-[var(--s2)] rounded w-3/4" />
              <div className="h-3 bg-[var(--s2)] rounded w-5/6" />
              <div className="h-3 bg-[var(--s2)] rounded w-1/2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
