import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bookmark, 
  Search, 
  Copy, 
  Check, 
  Sparkles, 
  Plus, 
  HardDrive,
  ExternalLink,
  Bot
} from 'lucide-react';

export const NotesPage: React.FC = () => {
  const { 
    notes, 
    projects, 
    addNote, 
    polishNote, 
    memoryStats, 
    activeResearchId 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Note Modal/Form toggle
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newSource, setNewSource] = useState('');

  const filteredNotes = notes.filter((n) => {
    const matchesProj = selectedProject === 'all' || n.projectId === selectedProject;
    const matchesQuery =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.selectedText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.sourceTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProj && matchesQuery;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    addNote({
      title: newTitle.trim(),
      selectedText: newText.trim(),
      sourceTitle: newSource.trim() || 'Manual research note',
      sourceUrl: newSource.trim() || 'local://notebook',
      projectId: activeResearchId,
      relevance: 95,
      color: 'emerald',
    });

    setNewTitle('');
    setNewText('');
    setNewSource('');
    setIsAddingNote(false);
  };

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
              LOCAL PC REPOSITORY · PERMANENT MEMORY
            </span>
            <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-[var(--ys)] text-[#765700] font-bold flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>{memoryStats.totalNodes} Items Saved Locally ({memoryStats.storageSizeKb} KB)</span>
            </span>
          </div>

          <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            Saved Notes & Evidence
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Passages, quotes, and AI synthesis stored directly on your computer. Bob uses this local memory to answer questions without cloud token costs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddingNote(!isAddingNote)}
            className="h-9 px-3.5 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-[12px] flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes..."
              className="h-9 pl-8 pr-3 text-[12px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none w-44 focus:w-56 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-[var(--m)] absolute left-2.5 top-3" />
          </div>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-9 px-3 text-[12px] rounded-xl bg-[var(--s)] border border-[var(--line)] text-[var(--t)] outline-none cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Manual Note Creation Card (Software Operation) */}
      {isAddingNote && (
        <form onSubmit={handleCreateNote} className="mb-6 p-5 rounded-2xl bg-[var(--s)] border-2 border-[var(--y)] shadow-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--t)]">Add Note to Local PC Memory</h3>
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              className="text-[11px] text-[var(--m)] hover:text-[var(--t)]"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Note title (e.g. Booking abandonment reason)"
            className="w-full h-9 px-3 text-[13px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none"
            required
          />
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Key evidence passage, observation, or quote..."
            rows={3}
            className="w-full p-3 text-[12.5px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none resize-none"
            required
          />
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Source URL or document name (optional)"
              className="flex-1 h-9 px-3 text-[12px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none"
            />
            <button
              type="submit"
              className="h-9 px-5 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold text-[12px] shadow-sm"
            >
              Save to PC
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-8">
          <Bookmark className="w-10 h-10 text-[var(--m)] mx-auto mb-3 opacity-40" />
          <h3 className="text-[15px] font-bold text-[var(--t)] m-0 mb-1">No notes found</h3>
          <p className="text-[12px] text-[var(--m)] max-w-sm mx-auto">
            Add a note manually or highlight text in Chrome to grow Bob's local knowledge bank on this PC.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--y)] flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m)]">
                      {note.projectId}
                    </span>
                    {note.isPolished && (
                      <span className="text-[9px] font-semibold text-[var(--b)] bg-[var(--bs)] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Bot className="w-2.5 h-2.5" />
                        <span>Bob Polished</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--ys)] text-[#765700] font-bold">
                    {note.relevance}% relevance
                  </span>
                </div>

                <h3 className="text-[15px] font-bold text-[var(--t)] m-0 mb-2 leading-snug">
                  {note.title}
                </h3>

                <blockquote className="text-[12px] text-[#50504b] dark:text-[#d3ccc3] leading-relaxed border-l-2 border-[var(--y)] pl-3 my-3 italic whitespace-pre-line">
                  {note.selectedText}
                </blockquote>
              </div>

              <div className="pt-3 border-t border-[var(--line)] mt-3 flex items-center justify-between text-[11px] text-[var(--m)]">
                <div className="truncate max-w-[200px]">
                  <b className="text-[var(--t)] block truncate">{note.sourceTitle}</b>
                  <span className="text-[10px] block truncate">{note.sourceUrl}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Hybrid Polish Button */}
                  {!note.isPolished && (
                    <button
                      onClick={() => polishNote(note.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[var(--y)] transition-colors flex items-center gap-1 text-[10.5px] font-semibold"
                      title="Polish with Bob AI"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Polish</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCopy(note.id, note.selectedText)}
                    className="p-1.5 rounded-lg hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors"
                    title="Copy quote"
                  >
                    {copiedId === note.id ? (
                      <Check className="w-3.5 h-3.5 text-[var(--g)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="text-[10px]">{note.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
