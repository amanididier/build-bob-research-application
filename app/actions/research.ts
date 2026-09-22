'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { researchProject, researchSession } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getProjects() {
  const userId = await getUserId()
  return db.select().from(researchProject).where(eq(researchProject.userId, userId)).orderBy(desc(researchProject.createdAt))
}

export async function createProject(name: string) {
  const userId = await getUserId()
  const [project] = await db.insert(researchProject).values({ userId, name: name.trim() || 'Untitled research' }).returning()
  revalidatePath('/')
  return project
}

export async function createSession(projectId: string) {
  const userId = await getUserId()
  const [session] = await db.insert(researchSession).values({ userId, projectId }).returning()
  revalidatePath('/')
  return session
}
