'use client'

import { useMemo, useState, useTransition } from 'react'
import { deleteNote } from '@/app/actions/notes'

type Note = { id: string; selectedText: string; url: string; color: string; sourceTab: string | null; createdAt: Date }

export function NotesPanel({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const filtered = useMemo(() => notes.filter((note) => `${note.selectedText} ${note.url}`.toLowerCase().includes(query.toLowerCase())), [notes, query])

  return <section className="notes-section"><div className="workspace-intro notes-heading"><div><p className="eyebrow">Research memory</p><h2>Saved notes</h2></div><span className="status-pill">{notes.length} notes</span></div><label className="search-label" htmlFor="note-search">Search notes</label><input id="note-search" className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search text or source domain" />{filtered.length === 0 ? <div className="empty-state compact"><h3>{notes.length ? 'No matching notes' : 'No notes yet'}</h3><p>Select text in Chrome and choose Notes to save it here.</p></div> : <div className="notes-list">{filtered.map((note) => <article className="note-card" key={note.id}><div className="note-marker" /><p>{note.selectedText}</p><a href={note.url} target="_blank" rel="noreferrer">{new URL(note.url).hostname} ↗</a><button className="note-delete" disabled={isPending} onClick={() => startTransition(() => deleteNote(projectId, note.id))}>Delete</button></article>)}</div>}</section>
}
