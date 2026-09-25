import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../../components/BobAvatar';
import { AuthModal } from '../../components/modals/AuthModal';
import { 
  Copy, 
  Check, 
  Bookmark, 
  CheckSquare, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { 
    activeResearchId, 
    projects, 
    triggerThinking, 
    addNote, 
    addTask,
    messages,
    isAiGenerating,
    sendMessage,
    userName
  } = useApp();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({});
  const [extractedTasks, setExtractedTasks] = useState<Record<string, boolean>>({});
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  
  // Auth pop-up after first response
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const project = projects.find((p) => p.id === activeResearchId) || projects[0];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveToNotes = (cardId: string, text: string) => {
    addNote({
      title: `Synthesis on ${project.title}`,
      selectedText: text,
      sourceTitle: `${project.title} · Research Notebook`,
      sourceUrl: 'bob.local/' + project.id,
      projectId: project.id,
      relevance: 95,
      color: 'emerald',
    });
    setSavedNotes((prev) => ({ ...prev, [cardId]: true }));
    triggerThinking('Saved to Notes', 'Added to your research notebook.', 'Writing note');
  };

  const handleExtractTask = (cardId: string, text: string) => {
    addTask(`Follow up on: ${text.slice(0, 48)}...`, 'Due tomorrow', project.id);
    setExtractedTasks((prev) => ({ ...prev, [cardId]: true }));
    triggerThinking('Task created', 'Added research action item to your tasks.', 'Task logged');
  };

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to render markdown tables and formatted text cleanly like ChatGPT
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const flushTable = (key: number) => {
      if (tableBuffer.length < 2) {
        elements.push(
          <p key={key} className="my-2 leading-relaxed">
            {tableBuffer.join('\n')}
          </p>
        );
        tableBuffer = [];
        return;
      }

      // Parse markdown table
      const headerLine = tableBuffer[0];
      const headers = headerLine
        .split('|')
        .map((h) => h.trim())
        .filter(Boolean);

      const rows = tableBuffer.slice(2).map((rowLine) =>
        rowLine
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || arr.length <= 2)
      );

      elements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-[var(--line)] shadow-sm">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--s2)] border-b border-[var(--line)]">
                {headers.map((h, i) => (
                  <th key={i} className="py-2.5 px-3.5 font-bold text-[var(--t)]">
                    {h.replace(/\*\*/g, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] bg-[var(--s)]">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[var(--s2)]/50 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3.5 text-[#444] dark:text-[#ccc]">
                      {cell.replace(/\*\*/g, '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        inTable = false;
        flushTable(i);
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="text-[14px] font-bold text-[var(--t)] mt-3 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      } else if (line.startsWith('* ') || line.startsWith('• ') || line.startsWith('- ')) {
        elements.push(
          <li key={i} className="ml-4 list-disc text-[12.5px] leading-relaxed my-0.5 text-[var(--t)]">
            {line.replace(/^(\*|•|-)\s+/, '')}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="h-1.5" />);
      } else {
        elements.push(
          <p key={i} className="text-[12.5px] leading-relaxed my-1 text-[var(--t)]">
            {line}
          </p>
        );
      }
    }

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  const starterPrompts = [
    'Help me understand the core problems in my research',
    'Compare the evidence across my tabs into a table',
    'What are the strongest next steps I should take?',
  ];

  return (
    <div className="max-w-[850px] mx-auto py-2">
      {/* Introduction Hero - Clean & Zero Data Initial State */}
      <div className="py-4 pb-6">
        <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
          TODAY · FOCUSED RESEARCH
        </div>
        <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
          What are you trying to understand?
        </h1>
        <p className="text-[var(--m)] leading-relaxed max-w-[640px] text-[13px]">
          Bob connects what you are reading, what you have saved, and turns it into clear answers.
        </p>

        {/* Suggestion Starter Pills */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {starterPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(p)}
                className="px-3.5 py-2 rounded-xl bg-[var(--s)] border border-[var(--line)] hover:border-[#bbb] dark:hover:border-[#555] text-[12px] text-[var(--t)] font-medium transition-all shadow-sm hover:shadow"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="space-y-6">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex gap-3 items-start justify-end">
                <div className="max-w-[80%] bg-[var(--bs)] text-[#1e3a8a] dark:text-[#bfdbfe] px-4 py-3 rounded-[18px] text-[13px] leading-relaxed shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          // ChatGPT-Style Assistant Response
          return (
            <div key={msg.id} className="space-y-2">
              <div className="flex gap-3.5 items-start">
                <BobAvatar size={28} />

                <div className="flex-1 space-y-3">
                  {/* Subtle, Encapsulated Thought Toggle (Like ChatGPT / Claude) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleReasoning(msg.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-[var(--m)] hover:text-[var(--t)] bg-[var(--s2)] border border-[var(--line)]/60 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-[var(--y)]" />
                        <span>Analyzed {msg.sources.length} sources</span>
                        {expandedReasoning[msg.id] ? (
                          <ChevronDown className="w-3 h-3 ml-0.5" />
                        ) : (
                          <ChevronRight className="w-3 h-3 ml-0.5" />
                        )}
                      </button>

                      {/* Collapsed Details only shown when user explicitly clicks */}
                      {expandedReasoning[msg.id] && (
                        <div className="mt-2 p-3 bg-[var(--s2)] rounded-xl border border-[var(--line)] space-y-2 animate-in fade-in duration-150">
                          <div className="text-[10.5px] font-bold text-[var(--m)] uppercase">
                            Referenced Sources:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((s, sIdx) => (
                              <a
                                key={sIdx}
                                href={s.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-md bg-[var(--s)] border border-[var(--line)] text-[10.5px] text-[var(--t)] hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-2.5 h-2.5 text-[var(--m)]" />
                                <span className="truncate max-w-[180px]">{s.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clean Formatted Response Card */}
                  <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.02)] space-y-3">
                    <div className="text-[13px] leading-relaxed">
                      {renderMessageContent(msg.text)}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center gap-2 pt-3 border-t border-[var(--line)] text-[11.5px]">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors flex items-center gap-1 font-medium"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-[var(--g)]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleSaveToNotes(msg.id, msg.text)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium ${
                          savedNotes[msg.id]
                            ? 'text-[var(--g)] bg-[var(--s2)]'
                            : 'hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
                        }`}
                        title="Save to notes"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{savedNotes[msg.id] ? 'Saved' : 'Save to Notes'}</span>
                      </button>

                      <button
                        onClick={() => handleExtractTask(msg.id, msg.text)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium ${
                          extractedTasks[msg.id]
                            ? 'text-[var(--g)] bg-[var(--s2)]'
                            : 'hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
                        }`}
                        title="Convert into actionable task"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-[var(--b)]" />
                        <span>{extractedTasks[msg.id] ? 'Task Added' : 'Turn into Task'}</span>
                      </button>

                      <span className="flex-1" />

                      <button
                        onClick={() => sendMessage('Can you rephrase this with a comparison table?')}
                        className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors flex items-center gap-1"
                        title="Regenerate response"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Generating Indicator */}
        {isAiGenerating && (
          <div className="flex gap-3.5 items-start animate-pulse">
            <BobAvatar size={28} />
            <div className="flex-1 bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--y)] animate-ping" />
                <span className="text-[12.5px] font-semibold text-[var(--t)]">
                  Bob is thinking...
                </span>
              </div>
              <div className="h-3 bg-[var(--s2)] rounded w-3/4" />
              <div className="h-3 bg-[var(--s2)] rounded w-5/6" />
            </div>
          </div>
        )}
      </div>

      {/* Auth Pop-up Card on First Response */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setIsAuthOpen(false);
          triggerThinking('Account Synced', `Welcome back, ${user.name}! Workspace records synced.`, 'Ready');
        }}
      />
    </div>
  );
};
