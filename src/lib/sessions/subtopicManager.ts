import { getSession, getHighlights } from '../db/queries';
import { db } from '../db/database';
import { createNewSession } from './sessionManager';
import { Session, Highlight } from '../memory/types';

export async function createSubtopic(
  parentSessionId: string,
  title: string
): Promise<Session> {
  const parent = await getSession(parentSessionId);
  const subtopicGoal = parent?.goal
    ? `Explore "${title}" as part of: ${parent.goal}`
    : `Explore: ${title}`;

  return createNewSession(title, {
    parent_id: parentSessionId,
    goal: subtopicGoal,
    session_type: parent?.session_type || 'research',
    tags: parent?.tags || '[]',
    project_id: parent?.project_id || undefined,
  });
}

export async function loadSubtopicContext(subtopicId: string): Promise<{
  subtopic: Session | null;
  parentContext: {
    title: string;
    goal: string | null;
    summary: string | null;
    keyHighlights: Highlight[];
  } | null;
}> {
  const subtopic = await getSession(subtopicId);
  if (!subtopic || !subtopic.parent_id) {
    return { subtopic, parentContext: null };
  }

  const parent = await getSession(subtopic.parent_id);
  if (!parent) {
    return { subtopic, parentContext: null };
  }

  const keyHighlights = await getHighlights(parent.id, { limit: 5 });

  return {
    subtopic,
    parentContext: {
      title: parent.title,
      goal: parent.goal || null,
      summary: parent.summary || null,
      keyHighlights,
    },
  };
}

export async function getParentWithSubtopicSummaries(parentId: string): Promise<{
  parent: Session | null;
  subtopics: Session[];
  crossSessionSummary: string;
}> {
  const parent = await getSession(parentId);
  const subtopics = (await db.all(
    'SELECT * FROM sessions WHERE parent_id = ? ORDER BY created_at',
    [parentId]
  )) as Session[];

  const crossSessionSummary = subtopics
    .filter((s) => s.summary)
    .map((s) => `${s.title}: ${s.summary}`)
    .join('\n');

  return { parent, subtopics, crossSessionSummary };
}
