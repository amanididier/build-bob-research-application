import { db } from './database';
import { Session, Message, Highlight } from '../memory/types';

export async function getSession(sessionId: string): Promise<Session | null> {
  return db.getSession(sessionId);
}

export async function getMessages(
  sessionId: string,
  options: {
    limit?: number;
    onlyNotSummarized?: boolean;
    orderBy?: 'created_at ASC' | 'created_at DESC' | string;
  } = {}
): Promise<Message[]> {
  let msgs = db.getMessages(sessionId);
  if (options.onlyNotSummarized) {
    msgs = msgs.filter((m) => !m.is_summarized);
  }
  if (options.orderBy === 'created_at DESC') {
    msgs = [...msgs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else {
    msgs = [...msgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
  if (options.limit && options.limit > 0) {
    msgs = msgs.slice(-options.limit);
  }
  return msgs;
}

export async function getHighlights(
  sessionId: string,
  options: { limit?: number } = {}
): Promise<Highlight[]> {
  const list = db.getHighlights(sessionId);
  if (options.limit && options.limit > 0) {
    return list.slice(-options.limit);
  }
  return list;
}

export async function getMessageCount(sessionId: string): Promise<number> {
  return db.getMessages(sessionId).length;
}

export async function createSession(data: Partial<Session> & { title: string }): Promise<Session> {
  const session: Session = {
    id: data.id || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    parent_id: data.parent_id || null,
    project_id: data.project_id || null,
    title: data.title,
    goal: data.goal || null,
    session_type: data.session_type || 'research',
    status: data.status || 'active',
    message_count: 0,
    token_count: 0,
    summary: data.summary || null,
    summary_updated_at: null,
    tags: data.tags || '[]',
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };
  db.saveSession(session);
  return session;
}

export async function saveMessage(data: Partial<Message> & { session_id: string; role: 'user' | 'assistant' | 'system'; content: string }): Promise<Message> {
  const msg: Message = {
    id: data.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    session_id: data.session_id,
    role: data.role,
    content: data.content,
    content_compressed: null,
    token_count: Math.ceil(data.content.length / 4),
    is_summarized: 0,
    thinking_process: data.thinking_process || null,
    highlight_color: data.highlight_color || null,
    created_at: new Date().toISOString(),
  };
  db.addMessage(msg);
  return msg;
}

export async function addHighlight(data: Partial<Highlight> & { session_id: string; content: string }): Promise<Highlight> {
  const highlight: Highlight = {
    id: data.id || `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    session_id: data.session_id,
    content: data.content,
    source_url: data.source_url || null,
    source_title: data.source_title || null,
    color: data.color || 'yellow',
    importance_score: data.importance_score ?? 0.5,
    created_at: new Date().toISOString(),
  };
  db.addHighlight(highlight);
  return highlight;
}

export async function updateSessionSummary(sessionId: string, summary: string): Promise<void> {
  const s = db.getSession(sessionId);
  if (s) {
    s.summary = summary;
    s.summary_updated_at = new Date().toISOString();
    db.saveSession(s);
  }
}

export async function getRecentSessions(limit = 20): Promise<Session[]> {
  return db.getAllSessions().slice(0, limit);
}

export async function deleteSession(sessionId: string): Promise<void> {
  db.deleteSession(sessionId);
}
