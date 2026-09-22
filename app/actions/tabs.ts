'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { browserTab, researchSession } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getSessionTabs(projectId: string, sessionId: string) {
  const userId = await getUserId()
  const [ownedSession] = await db.select({ id: researchSession.id }).from(researchSession).where(and(eq(researchSession.id, sessionId), eq(researchSession.projectId, projectId), eq(researchSession.userId, userId))).limit(1)
  if (!ownedSession) throw new Error('Session not found')
  return db.select().from(browserTab).where(and(eq(browserTab.sessionId, sessionId), eq(browserTab.userId, userId))).orderBy(desc(browserTab.createdAt))
}

export async function saveBrowserTab(input: { projectId: string; sessionId: string; url: string; title: string; tabId: number; favicon?: string; selectedText?: string }) {
  const userId = await getUserId()
  const [ownedSession] = await db.select({ id: researchSession.id }).from(researchSession).where(and(eq(researchSession.id, input.sessionId), eq(researchSession.projectId, input.projectId), eq(researchSession.userId, userId))).limit(1)
  if (!ownedSession) throw new Error('Session not found')
  const [tab] = await db.insert(browserTab).values({ userId, sessionId: input.sessionId, url: input.url, title: input.title.trim() || input.url, tabId: input.tabId, favicon: input.favicon, selectedText: input.selectedText ?? '' }).returning()
  revalidatePath(`/projects/${input.projectId}`)
  return tab
}
