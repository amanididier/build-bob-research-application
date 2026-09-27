import { create } from 'zustand';
import { Session } from '../lib/memory/types';
import { listActiveSessions, createNewSession, removeSession } from '../lib/sessions/sessionManager';
import { createSubtopic } from '../lib/sessions/subtopicManager';

interface SessionStoreState {
  sessions: Session[];
  activeSessionId: string | null;
  isLoading: boolean;
  loadSessions: () => Promise<void>;
  setActiveSessionId: (id: string) => void;
  createSession: (title: string, goal?: string) => Promise<Session>;
  createSubtopicSession: (parentSessionId: string, title: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true });
    const list = await listActiveSessions();
    set({
      sessions: list,
      activeSessionId: get().activeSessionId || list[0]?.id || null,
      isLoading: false,
    });
  },

  setActiveSessionId: (id: string) => {
    set({ activeSessionId: id });
  },

  createSession: async (title: string, goal?: string) => {
    const s = await createNewSession(title, { goal });
    set((state) => ({
      sessions: [s, ...state.sessions],
      activeSessionId: s.id,
    }));
    return s;
  },

  createSubtopicSession: async (parentSessionId: string, title: string) => {
    const sub = await createSubtopic(parentSessionId, title);
    set((state) => ({
      sessions: [sub, ...state.sessions],
      activeSessionId: sub.id,
    }));
    return sub;
  },

  deleteSession: async (id: string) => {
    await removeSession(id);
    set((state) => {
      const remaining = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: remaining,
        activeSessionId: state.activeSessionId === id ? remaining[0]?.id || null : state.activeSessionId,
      };
    });
  },
}));
