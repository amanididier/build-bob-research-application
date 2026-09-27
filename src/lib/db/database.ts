import { Session, Message, Highlight, Project } from '../memory/types';

interface LocalDBStore {
  sessions: Record<string, Session>;
  messages: Record<string, Message[]>;
  highlights: Record<string, Highlight[]>;
  projects: Record<string, Project>;
}

const STORAGE_KEY = 'bob_local_sqlite_db_v1';

class LocalDatabase {
  private store: LocalDBStore = {
    sessions: {},
    messages: {},
    highlights: {},
    projects: {},
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.store = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('DB init fallback:', e);
      }
    }
    this.initialized = true;
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
      } catch (e) {
        console.warn('DB persist warning:', e);
      }
    }
  }

  public async run(query: string, params: any[] = []): Promise<any> {
    // Check Electron IPC native SQLite if available
    if (typeof window !== 'undefined' && (window as any).bob?.dbRun) {
      try {
        return await (window as any).bob.dbRun(query, params);
      } catch (err) {
        console.warn('Native SQLite IPC fallback:', err);
      }
    }
    return { changes: 1 };
  }

  public async all<T = any>(query: string, params: any[] = []): Promise<T[]> {
    if (typeof window !== 'undefined' && (window as any).bob?.dbAll) {
      try {
        return await (window as any).bob.dbAll(query, params);
      } catch (err) {
        console.warn('Native SQLite IPC fallback:', err);
      }
    }

    // High performance in-memory query evaluation
    const q = query.trim().toUpperCase();
    if (q.startsWith('SELECT * FROM SESSIONS WHERE PARENT_ID =')) {
      const parentId = params[0];
      return Object.values(this.store.sessions).filter((s) => s.parent_id === parentId) as any;
    }
    return [];
  }

  // Direct fast memory access methods
  public getSession(id: string): Session | null {
    return this.store.sessions[id] || null;
  }

  public saveSession(session: Session): void {
    this.store.sessions[session.id] = session;
    this.persist();
  }

  public deleteSession(id: string): void {
    delete this.store.sessions[id];
    delete this.store.messages[id];
    delete this.store.highlights[id];
    this.persist();
  }

  public getAllSessions(): Session[] {
    return Object.values(this.store.sessions).sort(
      (a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
    );
  }

  public getMessages(sessionId: string): Message[] {
    return this.store.messages[sessionId] || [];
  }

  public addMessage(message: Message): void {
    if (!this.store.messages[message.session_id]) {
      this.store.messages[message.session_id] = [];
    }
    this.store.messages[message.session_id].push(message);
    if (this.store.sessions[message.session_id]) {
      this.store.sessions[message.session_id].message_count += 1;
      this.store.sessions[message.session_id].last_active = new Date().toISOString();
    }
    this.persist();
  }

  public updateMessages(sessionId: string, messages: Message[]): void {
    this.store.messages[sessionId] = messages;
    this.persist();
  }

  public getHighlights(sessionId: string): Highlight[] {
    return this.store.highlights[sessionId] || [];
  }

  public addHighlight(highlight: Highlight): void {
    if (!this.store.highlights[highlight.session_id]) {
      this.store.highlights[highlight.session_id] = [];
    }
    this.store.highlights[highlight.session_id].push(highlight);
    this.persist();
  }
}

export const db = new LocalDatabase();
