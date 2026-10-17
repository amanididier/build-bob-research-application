import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Plus,
  Pencil,
  X,
  Star,
  ExternalLink,
  Copy,
  Check,
  Save,
} from 'lucide-react';

/** Soft pastel faces matching the Docket-style reference */
const CARD_TONES = [
  { bg: 'bg-[#FFE08A]', text: 'text-[#3d3420]', muted: 'text-[#6b5e3a]', accent: 'bg-[#f5c842]' },
  { bg: 'bg-[#FF9F7A]', text: 'text-[#4a2a1c]', muted: 'text-[#7a4a38]', accent: 'bg-[#e07a50]' },
  { bg: 'bg-[#C8F07A]', text: 'text-[#2a3a18]', muted: 'text-[#4a5e2e]', accent: 'bg-[#8bc34a]' },
  { bg: 'bg-[#C9B6FF]', text: 'text-[#2e2450]', muted: 'text-[#5a4a7a]', accent: 'bg-[#9b7cf0]' },
  { bg: 'bg-[#B8F0C8]', text: 'text-[#1e3a28]', muted: 'text-[#3a5e48]', accent: 'bg-[#4caf7a]' },
  { bg: 'bg-[#7AD4FF]', text: 'text-[#1a3040]', muted: 'text-[#3a5a6a]', accent: 'bg-[#29b6f6]' },
  { bg: 'bg-[#FFB3D1]', text: 'text-[#4a2038]', muted: 'text-[#7a4a60]', accent: 'bg-[#ec6ba8]' },
  { bg: 'bg-[#FFE0B2]', text: 'text-[#4a3820]', muted: 'text-[#7a5e3a]', accent: 'bg-[#ffb74d]' },
];

function toneFor(noteId: string, index: number) {
  let h = index;
  for (let i = 0; i < noteId.length; i++) h = (h + noteId.charCodeAt(i) * (i + 1)) % CARD_TONES.length;
  return CARD_TONES[h % CARD_TONES.length];
}

function formatNoteDate(raw: string) {
  if (!raw) return '';
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return raw;
}

export const NotesPage: React.FC = () => {
  const { notes, projects, addNote, updateNote, polishNote, activeResearchId } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>(() => {
    try {
      const fromResearch = localStorage.getItem('bob_notes_project_filter');
      if (fromResearch) {
        localStorage.removeItem('bob_notes_project_filter');
        return fromResearch;
      }
    } catch {}
    return activeResearchId || 'general';
  });

  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isEditingExpanded, setIsEditingExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editSource, setEditSource] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newSource, setNewSource] = useState('');

  // When opened from Research, lock to that project; don't auto-switch away from intentional filters
  useEffect(() => {
    try {
      const fromResearch = localStorage.getItem('bob_notes_project_filter');
      if (fromResearch) {
        localStorage.removeItem('bob_notes_project_filter');
        setSelectedProject(fromResearch);
      }
    } catch {}
  }, []);

  const activeProject = projects.find((p) => p.id === selectedProject);

  /** Strict isolation: project notes never mix; general is only non-project notes */
  const scopedNotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (selectedProject === 'general') {
        const isGeneral =
          !n.projectId ||
          n.projectId === 'general' ||
          n.projectId === 'all' ||
          n.projectId === '';
        if (!isGeneral) return false;
      } else if (selectedProject === 'all') {
        // "all" only for browsing from side panel — still show source project label
      } else {
        // Exact project match only — never leak other projects
        if (n.projectId !== selectedProject) return false;
      }
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.selectedText.toLowerCase().includes(q) ||
        (n.sourceTitle || '').toLowerCase().includes(q)
      );
    });

    // Recent → oldest
    return [...list].sort((a, b) => {
      const ta = Date.parse(a.createdAt) || 0;
      const tb = Date.parse(b.createdAt) || 0;
      if (ta !== tb) return tb - ta;
      return b.id.localeCompare(a.id);
    });
  }, [notes, selectedProject, searchTerm]);

  const expandedNote = expandedNoteId ? notes.find((n) => n.id === expandedNoteId) : null;

  const openNote = (id: string) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    setExpandedNoteId(id);
    setIsEditingExpanded(false);
    setEditTitle(n.title);
    setEditText(n.selectedText);
    setEditSource(n.sourceUrl || n.sourceTitle || '');
  };

  const saveExpanded = () => {
    if (!expandedNoteId || !editTitle.trim() || !editText.trim()) return;
    const source = editSource.trim();
    updateNote(expandedNoteId, {
      title: editTitle.trim(),
      selectedText: editText.trim(),
      sourceTitle: source || 'Manual note',
      sourceUrl: /^https?:\/\//i.test(source)
        ? source
        : source
          ? `local://${encodeURIComponent(source)}`
          : 'local://notebook',
    });
    setIsEditingExpanded(false);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;
    const projectId =
      selectedProject === 'all' || selectedProject === 'general'
        ? 'general'
        : selectedProject || activeResearchId || 'general';
    const colors = ['emerald', 'blue', 'yellow', 'red'] as const;
    addNote({
      title: newTitle.trim(),
      selectedText: newText.trim(),
      sourceTitle: newSource.trim() || 'Manual note',
      sourceUrl: newSource.trim() || 'local://notebook',
      projectId,
      relevance: 95,
      color: colors[scopedNotes.length % colors.length],
    });
    setNewTitle('');
    setNewText('');
    setNewSource('');
    setIsAddingNote(false);
  };

  const pageTitle =
    selectedProject === 'general'
      ? 'General notes'
      : selectedProject === 'all'
        ? 'Notes'
        : `${activeProject?.title || 'Project'}-notes`;

  return (
    <div className="min-h-full bg-[#f7f8fc] dark:bg-[var(--bg)] pb-28">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 pt-8">
        {/* Header row — Docket-inspired */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsAddingNote(true)}
              className="shrink-0 w-10 h-10 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 grid place-items-center shadow-md hover:scale-105 transition-transform"
              title="Add note"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <h1 className="text-[32px] sm:text-[40px] font-extrabold tracking-tight text-neutral-900 dark:text-white m-0 truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="h-10 w-44 sm:w-56 pl-9 pr-3 rounded-full bg-white dark:bg-[var(--s)] border border-neutral-200/80 dark:border-[var(--line)] text-[13px] outline-none focus:ring-2 focus:ring-[#f5c842]/40 shadow-sm"
              />
            </div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="h-10 px-3 rounded-full bg-white dark:bg-[var(--s)] border border-neutral-200/80 dark:border-[var(--line)] text-[12px] font-semibold text-neutral-700 dark:text-[var(--t)] outline-none shadow-sm cursor-pointer"
            >
              <option value="general">General notes</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
              <option value="all">All (read-only mix)</option>
            </select>
          </div>
        </div>

        <p className="text-[12px] text-neutral-500 dark:text-[var(--m)] mb-6 m-0">
          {selectedProject === 'general'
            ? 'Notes saved from the browser when no research project was active. Kept separate from project notes.'
            : selectedProject === 'all'
              ? 'Browsing every note. Prefer a single project filter so nothing mixes by mistake.'
              : `Only notes attached to this project. Nothing from other projects appears here.`}
        </p>

        {/* Add note form */}
        {isAddingNote && (
          <form
            onSubmit={handleCreateNote}
            className="mb-8 p-5 rounded-[22px] bg-white dark:bg-[var(--s)] border border-neutral-200 dark:border-[var(--line)] shadow-lg space-y-3 max-w-xl"
          >
            <div className="flex items-center justify-between">
              <b className="text-[14px] text-neutral-900 dark:text-white">New note</b>
              <button type="button" onClick={() => setIsAddingNote(false)} className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-[var(--s2)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-[var(--s2)] border border-neutral-200 dark:border-[var(--line)] text-[13px] outline-none"
              required
            />
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Note content…"
              rows={4}
              className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-[var(--s2)] border border-neutral-200 dark:border-[var(--line)] text-[13px] outline-none resize-none"
              required
            />
            <input
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Source (URL or document name)"
              className="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-[var(--s2)] border border-neutral-200 dark:border-[var(--line)] text-[12px] outline-none"
            />
            <button type="submit" className="h-10 px-5 rounded-full bg-neutral-900 dark:bg-[#f5c842] text-white dark:text-[#171717] text-[13px] font-bold">
              Save note
            </button>
          </form>
        )}

        {/* 5-column colorful grid */}
        {scopedNotes.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-neutral-300 dark:border-[var(--line)] bg-white/60 dark:bg-[var(--s)]/50 py-20 text-center">
            <p className="text-[15px] font-semibold text-neutral-700 dark:text-white m-0">No notes here yet</p>
            <p className="text-[13px] text-neutral-500 mt-1 m-0">
              Save from the browser extension or add one with the + button.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingNote(true)}
              className="mt-5 h-10 px-5 rounded-full bg-neutral-900 text-white text-[13px] font-bold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {scopedNotes.map((note, index) => {
              const tone = toneFor(note.id, index);
              const preview =
                note.selectedText.length > 120
                  ? note.selectedText.slice(0, 120).trim() + '…'
                  : note.selectedText;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => openNote(note.id)}
                  className={`relative aspect-square rounded-[18px] p-4 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all ${tone.bg} ${tone.text} flex flex-col`}
                >
                  {note.isPolished && (
                    <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/10 grid place-items-center">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </span>
                  )}
                  <h3 className="text-[14px] sm:text-[15px] font-bold leading-snug line-clamp-4 pr-6 m-0">
                    {note.title}
                  </h3>
                  <p className={`mt-2 text-[11px] leading-relaxed line-clamp-3 flex-1 m-0 opacity-90 ${tone.muted}`}>
                    {preview}
                  </p>
                  <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`block text-[10px] font-semibold truncate ${tone.muted}`}>
                        {note.sourceTitle || 'Source'}
                      </span>
                      <span className={`block text-[10px] mt-0.5 ${tone.muted}`}>
                        {formatNoteDate(note.createdAt)}
                      </span>
                    </div>
                    <span
                      className="shrink-0 w-7 h-7 rounded-full bg-black/10 grid place-items-center hover:bg-black/15"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNote(note.id);
                        setIsEditingExpanded(true);
                      }}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Full note overlay */}
      {expandedNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            setExpandedNoteId(null);
            setIsEditingExpanded(false);
          }}
        >
          <div
            className={`relative w-full max-w-lg max-h-[85vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden ${
              toneFor(expandedNote.id, 0).bg
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 pb-2">
              {isEditingExpanded ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-[18px] font-extrabold bg-white/40 rounded-xl px-3 py-2 outline-none border border-black/10"
                />
              ) : (
                <h2 className={`text-[18px] font-extrabold leading-snug m-0 pr-2 ${toneFor(expandedNote.id, 0).text}`}>
                  {expandedNote.title}
                </h2>
              )}
              <button
                type="button"
                onClick={() => {
                  setExpandedNoteId(null);
                  setIsEditingExpanded(false);
                }}
                className="shrink-0 w-8 h-8 rounded-full bg-black/10 hover:bg-black/15 grid place-items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`px-5 pb-2 text-[11px] font-semibold flex items-center gap-2 flex-wrap ${
                toneFor(expandedNote.id, 0).muted
              }`}
            >
              <span>{formatNoteDate(expandedNote.createdAt)}</span>
              <span>·</span>
              <span className="truncate max-w-[220px]">{expandedNote.sourceTitle}</span>
              {/^https?:\/\//i.test(expandedNote.sourceUrl) && (
                <a
                  href={expandedNote.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" /> Open source
                </a>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
              {isEditingExpanded ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={10}
                  className="w-full min-h-[200px] p-3 rounded-xl bg-white/50 border border-black/10 text-[14px] leading-relaxed outline-none resize-y"
                />
              ) : (
                <p className={`text-[14px] leading-[1.7] whitespace-pre-wrap m-0 ${toneFor(expandedNote.id, 0).text}`}>
                  {expandedNote.selectedText}
                </p>
              )}
            </div>

            {isEditingExpanded && (
              <div className="px-5 pb-2">
                <input
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  placeholder="Source URL or name"
                  className="w-full h-9 px-3 rounded-xl bg-white/50 border border-black/10 text-[12px] outline-none"
                />
              </div>
            )}

            <div className="p-4 pt-2 flex items-center justify-between gap-2 border-t border-black/10">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(expandedNote.selectedText);
                    setCopiedId(expandedNote.id);
                    setTimeout(() => setCopiedId(null), 1500);
                  }}
                  className="h-9 px-3 rounded-full bg-black/10 hover:bg-black/15 text-[12px] font-semibold inline-flex items-center gap-1.5"
                >
                  {copiedId === expandedNote.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === expandedNote.id ? 'Copied' : 'Copy'}
                </button>
                {!expandedNote.isPolished && (
                  <button
                    type="button"
                    onClick={() => polishNote(expandedNote.id)}
                    className="h-9 px-3 rounded-full bg-black/10 hover:bg-black/15 text-[12px] font-semibold"
                  >
                    Polish
                  </button>
                )}
              </div>
              {isEditingExpanded ? (
                <button
                  type="button"
                  onClick={saveExpanded}
                  className="h-9 px-4 rounded-full bg-neutral-900 text-white text-[12px] font-bold inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingExpanded(true)}
                  className="h-9 px-4 rounded-full bg-black/10 hover:bg-black/15 text-[12px] font-bold inline-flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
