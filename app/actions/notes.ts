'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { researchNote, researchSession } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getProjectNotes(projectId: string, sessionId: string) {
  const userId = await getUserId()
  const [ownedSession] = await db.select({ id: researchSession.id }).from(researchSession).where(and(eq(researchSession.id, sessionId), eq(researchSession.projectId, projectId), eq(researchSession.userId, userId))).limit(1)
  if (!ownedSession) throw new Error('Session not found')
  return db.select().from(researchNote).where(and(eq(researchNote.projectId, projectId), eq(researchNote.sessionId, sessionId), eq(researchNote.userId, userId))).orderBy(desc(researchNote.createdAt))
}

export async function saveNote(input: { projectId: string; sessionId: string; selectedText: string; url: string; sourceTab?: string }) {
  const userId = await getUserId()
  const text = input.selectedText.trim()
  if (!text || text.length > 10000) throw new Error('Invalid note')
  const [ownedSession] = await db.select({ id: researchSession.id }).from(researchSession).where(and(eq(researchSession.id, input.sessionId), eq(researchSession.projectId, input.projectId), eq(researchSession.userId, userId))).limit(1)
  if (!ownedSession) throw new Error('Session not found')
  const [note] = await db.insert(researchNote).values({ userId, projectId: input.projectId, sessionId: input.sessionId, selectedText: text, url: input.url, sourceTab: input.sourceTab, color: 'yellow' }).returning()
  revalidatePath(`/projects/${input.projectId}`)
  return note
}

export async function deleteNote(projectId: string, noteId: string) {
  const userId = await getUserId()
  await db.delete(researchNote).where(and(eq(researchNote.id, noteId), eq(researchNote.projectId, projectId), eq(researchNote.userId, userId)))
  revalidatePath(`/projects/${projectId}`)
}
