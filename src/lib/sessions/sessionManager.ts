import { createSession, getSession, getRecentSessions, deleteSession } from '../db/queries';
import { Session } from '../memory/types';

export async function createNewSession(
  title: string,
  options: {
    goal?: string;
    parent_id?: string;
    project_id?: string;
    session_type?: string;
    tags?: string;
  } = {}
): Promise<Session> {
  return createSession({
    title,
    goal: options.goal,
    parent_id: options.parent_id,
    project_id: options.project_id,
    session_type: options.session_type || 'research',
    tags: options.tags || '[]',
  });
}

export async function loadSession(sessionId: string): Promise<Session | null> {
  return getSession(sessionId);
}

export async function listActiveSessions(limit = 20): Promise<Session[]> {
  return getRecentSessions(limit);
}

export async function removeSession(sessionId: string): Promise<void> {
  return deleteSession(sessionId);
}
