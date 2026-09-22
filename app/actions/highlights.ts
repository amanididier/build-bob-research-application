'use server'

import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { researchHighlight } from '@/lib/db/schema'
import { relevanceColor, scoreRelevance } from '@/../../packages/core/src/relevance'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function listHighlights(sessionId: string) {
  const userId = await getUserId()
  return db.select().from(researchHighlight).where(and(eq(researchHighlight.userId, userId), eq(researchHighlight.sessionId, sessionId))).orderBy(desc(researchHighlight.createdAt))
}

export async function saveHighlight(input: { sessionId: string; url: string; selectedText?: string; title?: string; goal: string }) {
  const userId = await getUserId()
  const score = scoreRelevance(input.title ?? '', input.url, input.goal)
  const [highlight] = await db.insert(researchHighlight).values({ userId, sessionId: input.sessionId, url: input.url, selectedText: input.selectedText ?? '', relevanceScore: score, color: relevanceColor(score) }).returning()
  revalidatePath(`/projects/${input.sessionId}`)
  return highlight
}
