import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bookmark, ExternalLink, Search, Trash2, Copy, Check, Filter } from 'lucide-react';

export const NotesPage: React.FC = () => {
  const { notes, projects } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 pb-6 border-b border-[var(--line)] mb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            RESEARCH REPOSITORY
          </div>
          <h1 className="text-[31px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            Saved Notes & Evidence
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Passages, quotes, and AI synthesis captured across all your research projects. Each item retains its origin URL and timestamp.
          </p>
        </div>

        {/* Filter by project */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes..."
              className="h-9 pl-8 pr-3 text-[12px] rounded-xl bg-[var(--s2)] border border-[var(--line)] outline-none w-48 focus:w-60 transition-all"
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

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-[var(--s)] border border-[var(--line)] rounded-[20px] p-8">
          <Bookmark className="w-10 h-10 text-[var(--m)] mx-auto mb-3 opacity-40" />
          <h3 className="text-[15px] font-bold text-[var(--t)] m-0 mb-1">No notes found</h3>
          <p className="text-[12px] text-[var(--m)] max-w-sm mx-auto">
            Highlight text in Chrome or save synthesis cards during research to build your persistent knowledge base.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-[var(--s)] border border-[var(--line)] rounded-[18px] p-5 shadow-[0_5px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--y)] flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m)]">
                      {note.projectId}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--ys)] text-[#765700] font-bold">
                    {note.relevance}% relevance
                  </span>
                </div>

                <h3 className="text-[15px] font-bold text-[var(--t)] m-0 mb-2 leading-snug">
                  {note.title}
                </h3>

                <blockquote className="text-[12px] text-[#50504b] dark:text-[#d3ccc3] leading-relaxed border-l-2 border-[var(--y)] pl-3 my-3 italic">
                  "{note.selectedText}"
                </blockquote>
              </div>

              <div className="pt-3 border-t border-[var(--line)] mt-3 flex items-center justify-between text-[11px] text-[var(--m)]">
                <div className="truncate max-w-[240px]">
                  <b className="text-[var(--t)] block truncate">{note.sourceTitle}</b>
                  <span className="text-[10px] block truncate">{note.sourceUrl}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
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
