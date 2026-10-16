import React, { useEffect, useState } from 'react';
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
  Bot,
  Pencil,
  Save,
  X
} from 'lucide-react';

export const NotesPage: React.FC = () => {
  const { 
    notes, 
    projects, 
    addNote, 
    updateNote,
    polishNote, 
    memoryStats, 
    activeResearchId 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>(() => {
    try {
      const fromResearch = localStorage.getItem('bob_notes_project_filter');
      if (fromResearch) {
        localStorage.removeItem('bob_notes_project_filter');
        return fromResearch;
      }
    } catch {}
    return activeResearchId || 'all';
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editSource, setEditSource] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Note Modal/Form toggle
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newSource, setNewSource] = useState('');

  useEffect(() => {
    if (activeResearchId) setSelectedProject(activeResearchId);
  }, [activeResearchId]);

  const startEditing = (note: (typeof notes)[number]) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditText(note.selectedText);
    setEditSource(note.sourceUrl || note.sourceTitle || '');
  };

  const saveEditing = (id: string) => {
    if (!editTitle.trim() || !editText.trim()) return;
    const source = editSource.trim();
    updateNote(id, {
      title: editTitle.trim(),
      selectedText: editText.trim(),
      sourceTitle: source || 'Manual research note',
      sourceUrl: /^https?:\/\//i.test(source) ? source : (source ? `local://${encodeURIComponent(source)}` : 'local://notebook')
    });
    setEditingId(null);
  };

  const filteredNotes = notes.filter((n) => {
    // 'general' = notes from browser when no active research project was selected
    const matchesProj =
      selectedProject === 'all' ||
      (selectedProject === 'general' &&
        (!n.projectId || n.projectId === 'general' || n.projectId === 'all')) ||
      n.projectId === selectedProject;
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
            {selectedProject !== 'all'
              ? `${projects.find((p) => p.id === selectedProject)?.title || 'Project'} Notes`
              : 'Saved Notes & Evidence'}
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            {selectedProject !== 'all'
              ? 'Notes for this project only — each card keeps its source, date, and edit history on this device.'
              : 'Passages, quotes, and AI synthesis stored on your computer. Each note stays attached to its project.'}
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
            <option value="all">All notes</option>
            <option value="general">General (browser / no project)</option>
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

      {/* Project-scoped notes board */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[17px] font-extrabold text-[var(--t)]">
            {projects.find((project) => project.id === selectedProject)?.title || 'All project notes'}
          </h2>
          <p className="text-[11px] text-[var(--m)] mt-1">Each note keeps its project, date, and original source attached.</p>
        </div>
        <span className="text-[11px] font-semibold text-[var(--m)]">{filteredNotes.length} notes</span>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-8">
          <Bookmark className="w-10 h-10 text-[var(--m)] mx-auto mb-3 opacity-40" />
          <h3 className="text-[15px] font-bold text-[var(--t)] m-0 mb-1">No notes in this project yet</h3>
          <p className="text-[12px] text-[var(--m)] max-w-sm mx-auto">
            Save a passage from a source or add a note manually. Bob will keep it attached to this project.
          </p>
          <button onClick={() => setIsAddingNote(true)} className="mt-4 h-9 px-4 rounded-xl bg-[var(--y)] text-[#171717] font-bold text-[12px] inline-flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add the first note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNotes.map((note, index) => {
            const palette = ['emerald', 'blue', 'yellow', 'red', 'purple', 'pink'] as const;
            const colorClass = {
              emerald: 'bg-[#e9f7ec] border-[#c9e9d0] dark:bg-[#1b3025] dark:border-[#31543f]',
              blue: 'bg-[#eaf3ff] border-[#cbdfff] dark:bg-[#1b293b] dark:border-[#2d4565]',
              yellow: 'bg-[#fff7d9] border-[#f1e3a8] dark:bg-[#352e19] dark:border-[#5a4c25]',
              red: 'bg-[#fff0eb] border-[#f2d0c5] dark:bg-[#38251f] dark:border-[#674035]',
              purple: 'bg-[#f3eaff] border-[#e0d0f5] dark:bg-[#2a1f3d] dark:border-[#4a3a65]',
              pink: 'bg-[#ffeaf3] border-[#f5cfe0] dark:bg-[#3a1f2d] dark:border-[#65405a]'
            }[note.color || palette[index % palette.length]];
            const projectName = projects.find((project) => project.id === note.projectId)?.title || 'Unassigned project';
            const isEditing = editingId === note.id;
            return (
              <article key={note.id} className={`min-h-[260px] rounded-[22px] border p-5 flex flex-col shadow-sm hover:shadow-md transition-all ${colorClass}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-[0.14em] font-extrabold opacity-65">{projectName}</span>
                    {isEditing ? (
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-black/10 bg-white/70 dark:bg-black/20 px-2.5 py-2 text-[14px] font-bold outline-none" aria-label="Edit note title" />
                    ) : (
                      <h3 className="text-[16px] font-extrabold leading-snug mt-2">{note.title}</h3>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.isPolished && <span className="p-1.5 rounded-full bg-white/50 dark:bg-black/15" title="Polished by Bob"><Bot className="w-3.5 h-3.5" /></span>}
                    <button onClick={() => isEditing ? setEditingId(null) : startEditing(note)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-black/15" title={isEditing ? 'Cancel edit' : 'Edit note'}>
                      {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={5} className="w-full flex-1 rounded-xl border border-black/10 bg-white/70 dark:bg-black/20 p-3 text-[12px] leading-relaxed outline-none resize-y" aria-label="Edit note content" />
                ) : (
                  <p className="text-[12px] leading-[1.75] opacity-85 whitespace-pre-line flex-1">{note.selectedText}</p>
                )}

                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input value={editSource} onChange={(e) => setEditSource(e.target.value)} placeholder="Source URL or document name" className="w-full rounded-lg border border-black/10 bg-white/70 dark:bg-black/20 px-2.5 py-2 text-[11px] outline-none" aria-label="Edit note source" />
                      <button onClick={() => saveEditing(note.id)} disabled={!editTitle.trim() || !editText.trim()} className="w-full h-9 rounded-xl bg-[#171717] text-white dark:bg-[#f2eee7] dark:text-[#171717] font-bold text-[11px] inline-flex items-center justify-center gap-2 disabled:opacity-40"><Save className="w-3.5 h-3.5" /> Save changes</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold truncate">{note.sourceTitle}</span>
                          <span className="block text-[9px] opacity-65 truncate">{note.createdAt}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!note.isPolished && <button onClick={() => polishNote(note.id)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-black/15" title="Polish note with Bob"><Sparkles className="w-3.5 h-3.5" /></button>}
                          <button onClick={() => handleCopy(note.id, note.selectedText)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-black/15" title="Copy note">{copiedId === note.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
                        </div>
                      </div>
                      {/^https?:\/\//i.test(note.sourceUrl) && <a href={note.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] underline underline-offset-2 opacity-75"><ExternalLink className="w-3 h-3" /> Open original source</a>}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
