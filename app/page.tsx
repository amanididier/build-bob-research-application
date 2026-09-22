import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getProjects } from '@/app/actions/research'
import { SignOutButton } from '@/components/sign-out-button'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const projects = await getProjects()

  return <main className="app-shell"><header className="topbar"><div className="brand-lockup"><div className="brand-mark">B</div><div><p className="eyebrow">Research operating system</p><h1>Bob workspace</h1></div></div><div className="topbar-actions"><span className="user-label">{session.user.email}</span><SignOutButton /></div></header><section className="workspace"><div className="workspace-intro"><div><p className="eyebrow">Your memory, organized</p><h2>What are you investigating?</h2><p className="card-copy">Projects keep your sources, notes, and conversations together across the desktop app and browser companion.</p></div><Link className="primary-link" href="/projects/new">New project <span>+</span></Link></div><div className="project-grid">{projects.length === 0 ? <div className="empty-state"><span className="empty-icon">+</span><h3>Start your first research project</h3><p>Create a project to give Bob context for your next question.</p><Link className="secondary-link" href="/projects/new">Create project</Link></div> : projects.map((project) => <article className="project-card" key={project.id}><div className="project-card-top"><span className={`project-color ${project.color}`} /><span className="project-date">{project.createdAt.toLocaleDateString()}</span></div><h3>{project.name}</h3><p>Research project</p><Link className="card-link" href={`/projects/${project.id}`}>Open workspace <span>→</span></Link></article>)}</div></section><footer><span>Bob Research System</span><span>Phase 02 · Persistent memory</span></footer></main>
}
