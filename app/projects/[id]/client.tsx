'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChatView } from '@/components/chat-view'
import { SessionNav, type SessionView } from '@/components/session-nav'
import { HighlightRail } from '@/components/highlight-rail'
import { NotesPanel } from '@/components/notes-panel'
import type { researchProject, researchSession, browserTab, researchNote, researchHighlight } from '@/lib/db/schema'

interface ProjectClientProps {
  project: typeof researchProject.$inferSelect
  session: typeof researchSession.$inferSelect | null
  tabs: (typeof browserTab.$inferSelect)[]
  notes: (typeof researchNote.$inferSelect)[]
  highlights: (typeof researchHighlight.$inferSelect)[]
}

export function ProjectClient({ project, session, tabs, notes, highlights }: ProjectClientProps) {
  const [activeView, setActiveView] = useState<SessionView>('chat')

  if (!session) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand-lockup">
            <Link className="secondary-link" href="/">
              Back
            </Link>
            <div className={`project-color ${project.color}`} />
            <div>
              <p className="eyebrow">Research project</p>
              <h1>{project.name}</h1>
            </div>
          </div>
        </header>
        <section className="workspace">
          <div className="empty-state">
            <span className="empty-icon">+</span>
            <h3>No active research session</h3>
            <p>Start a session from the desktop companion to begin tracking tabs.</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="bob-app">
      <aside className="bob-sidebar">
        <Link href="/" className="bob-brand"><span className="bob-logo">B</span><span>Bob</span></Link>
        <button className="bob-search" type="button"><span>⌕</span><span>Search</span><kbd>⌘ K</kbd></button>
        <nav className="bob-nav" aria-label="Workspace navigation">
          <button className={activeView === 'chat' ? 'active' : ''} onClick={() => setActiveView('chat')}>✦ <span>New research</span></button>
          <Link href="/">⌂ <span>Dashboard</span></Link>
          <button className={activeView === 'tasks' ? 'active' : ''} onClick={() => setActiveView('tasks')}>✓ <span>Due soon</span></button>
          <button className={activeView === 'tabs' ? 'active' : ''} onClick={() => setActiveView('tabs')}>◉ <span>Chrome side panel</span></button>
        </nav>
        <p className="bob-section-label">CURRENT PROJECT</p>
        <button className="bob-project active"><span className={`project-color ${project.color}`} />{project.name}</button>
        <div className="bob-sidebar-bottom"><Link href="/">← All projects</Link><span className="bob-upgrade"><strong>Upgrade</strong><small>More research power</small><b>PRO</b></span></div>
      </aside>
      <section className="bob-main">
        <header className="bob-topbar"><button className="bob-icon-button" type="button" aria-label="Toggle sidebar">☰</button><span className="bob-top-title">Research workspace</span><div className="bob-top-actions"><button className="bob-icon-button" type="button" aria-label="Notifications">♧</button><span className={`project-color ${project.color}`} /><span className="bob-user">Research companion</span></div></header>
        <div className="bob-project-header"><div><p className="eyebrow">TODAY · FOCUSED RESEARCH</p><h1>{project.name}</h1><p>Connect what you are reading, what you have asked other AIs, and what you need to finish next.</p></div><span className="port-label">Desktop companion</span></div>
        <SessionNav activeView={activeView} onViewChange={setActiveView} />
        <section className="bob-content">
          {activeView === 'chat' && <ChatView sessionId={session.id} projectName={project.name} />}
          {activeView === 'tabs' && <div className="view-container"><h2>Connected browser tabs</h2><p className="card-copy">These pages are part of your current research session.</p>{tabs.length === 0 ? <div className="empty-state"><span className="empty-icon">⌁</span><h3>No connected tabs</h3><p>Open pages in Chrome with the Bob extension installed.</p></div> : <div className="project-grid">{tabs.map((tab) => <article className="project-card" key={tab.id}><div className="project-card-top">{tab.favicon ? <img className="tab-favicon" src={tab.favicon} alt="" /> : <span className="project-color violet" />}<span className="project-date">Tab {tab.tabId}</span></div><h3>{tab.title}</h3><p className="tab-url">{tab.url}</p><a className="card-link" href={tab.url} target="_blank" rel="noreferrer">Open source <span>↗</span></a></article>)}</div>}<HighlightRail highlights={highlights} /></div>}
          {activeView === 'summary' && <div className="view-container"><h2>Research summary</h2><p className="card-copy">AI-synthesized overview of your exploration.</p><div className="summary-card"><p>Synthesis generates from your chat messages, highlights, and connected sources.</p></div></div>}
          {activeView === 'tasks' && <div className="view-container"><h2>Research tasks</h2><p className="card-copy">Action items derived from your research.</p><div className="summary-card"><p>Turn your research into finishable actions.</p></div></div>}
          <NotesPanel projectId={project.id} notes={notes} />
        </section>
      </section>
    </main>
  )
}
