'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { researchMessage } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function sendMessage(sessionId: string, content: string) {
  const userId = await getUserId()

  const [userMsg] = await db
    .insert(researchMessage)
    .values({ userId, sessionId, role: 'user', content: content.trim() })
    .returning()

  const messages = await db
    .select()
    .from(researchMessage)
    .where(and(eq(researchMessage.sessionId, sessionId), eq(researchMessage.userId, userId)))
    .orderBy(desc(researchMessage.createdAt))
    .limit(10)

  const conversationContext = messages
    .reverse()
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')

  const recentContext = conversationContext.slice(-900)
  const responseText = `I’m running in free local mode, so your research stays on your device. I’ve captured this direction: “${content.trim().slice(0, 160)}”. Next, compare the strongest evidence across your saved tabs and notes.\n\nContext tracked: ${recentContext ? 'yes' : 'not yet'}`

  const [assistantMsg] = await db
    .insert(researchMessage)
    .values({ userId, sessionId, role: 'assistant', content: responseText })
    .returning()

  revalidatePath('/')
  return { userMsg, assistantMsg }
}

export async function getSessionMessages(sessionId: string) {
  const userId = await getUserId()
  return db
    .select()
    .from(researchMessage)
    .where(and(eq(researchMessage.sessionId, sessionId), eq(researchMessage.userId, userId)))
    .orderBy(desc(researchMessage.createdAt))
}
