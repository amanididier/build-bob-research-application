import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { researchProject, researchSession, researchHighlight } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getSessionTabs } from '@/app/actions/tabs'
import { getProjectNotes } from '@/app/actions/notes'
import { ProjectClient } from './client'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params

  const [project] = await db
    .select()
    .from(researchProject)
    .where(and(eq(researchProject.id, id), eq(researchProject.userId, session.user.id)))
    .limit(1)

  if (!project) redirect('/')

  const [researchSessionRow] = await db
    .select()
    .from(researchSession)
    .where(and(eq(researchSession.projectId, id), eq(researchSession.userId, session.user.id)))
    .orderBy(desc(researchSession.createdAt))
    .limit(1)

  const tabs = researchSessionRow ? await getSessionTabs(id, researchSessionRow.id) : []
  const notes = researchSessionRow ? await getProjectNotes(id, researchSessionRow.id) : []
  const highlights = researchSessionRow
    ? await db
        .select()
        .from(researchHighlight)
        .where(and(eq(researchHighlight.userId, session.user.id), eq(researchHighlight.sessionId, researchSessionRow.id)))
        .orderBy(desc(researchHighlight.relevanceScore))
    : []

  return (
    <ProjectClient
      project={project}
      session={researchSessionRow}
      tabs={tabs}
      notes={notes}
      highlights={highlights}
    />
  )
}
