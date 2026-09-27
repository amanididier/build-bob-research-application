import { UserMemory } from './types';

const DEFAULT_MEMORY: UserMemory = {
  version: '1.0',
  identity: {
    name: 'Amani',
    nickname: null,
    nickname_approved: false,
    nickname_denied: false,
    location: 'Musanze, Rwanda',
    language_preference: 'mixed',
    session_count: 0,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  },
  personality: {
    communication_style: 'casual',
    response_length_preference: 'short',
    works_late: false,
    motivation_triggers: [],
    distraction_patterns: [],
    emotional_patterns: [],
    learning_style: 'visual',
  },
  projects: [],
  important_facts: [],
  conversation_summaries: [],
  preferences: {
    theme: 'dark',
    voice_on: true,
    voice_speed: 1.0,
    proactivity_level: 'balanced',
    api_key_type: 'shared',
  },
  statistics: {
    total_sessions: 0,
    total_messages: 0,
    total_highlights: 0,
    streak_days: 0,
    last_streak_date: null,
  },
};

// ALWAYS in RAM - module scope cache
let memoryCache: UserMemory | null = null;
const SENSITIVE_KEYWORDS = [
  'password', 'secret', 'credit card', 'cvv', 'bank account', 'ssn', 'nid',
  'national id', 'medical history', 'diagnosis', 'health record', 'private key'
];

function sanitizeFact(fact: string): boolean {
  const lower = fact.toLowerCase();
  return !SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function loadMemory(): UserMemory {
  if (memoryCache) {
    return memoryCache;
  }

  // Check Electron IPC first
  if (typeof window !== 'undefined' && (window as any).bob?.getMemory) {
    try {
      const electronMem = (window as any).bob.getMemory();
      if (electronMem && typeof electronMem === 'object') {
        const mem: UserMemory = { ...DEFAULT_MEMORY, ...electronMem };
        memoryCache = mem;
        return mem;
      }
    } catch {}
  }

  // Browser / LocalStorage fallback
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('keza_memory_v1');
      if (stored) {
        memoryCache = { ...DEFAULT_MEMORY, ...JSON.parse(stored) };
        return memoryCache!;
      }
    } catch {}
  }

  memoryCache = JSON.parse(JSON.stringify(DEFAULT_MEMORY));
  return memoryCache!;
}

export async function saveMemory(updates?: Partial<UserMemory>): Promise<UserMemory> {
  const current = loadMemory();
  const updated: UserMemory = {
    ...current,
    ...updates,
    identity: {
      ...current.identity,
      ...(updates?.identity || {}),
      last_seen: new Date().toISOString(),
    },
    statistics: {
      ...current.statistics,
      ...(updates?.statistics || {}),
    },
  };

  memoryCache = updated;

  // Asynchronous non-blocking save
  setTimeout(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('keza_memory_v1', JSON.stringify(updated));
        if ((window as any).bob?.saveMemory) {
          (window as any).bob.saveMemory(updated);
        }
      }
    } catch (e) {
      console.warn('Asynchronous save memory warning:', e);
    }
  }, 0);

  return updated;
}

export function addImportantFact(fact: string): void {
  const trimmed = fact.trim();
  if (!trimmed || !sanitizeFact(trimmed)) return;

  const mem = loadMemory();
  if (!mem.important_facts.includes(trimmed)) {
    mem.important_facts.push(trimmed);
    if (mem.important_facts.length > 50) {
      // Keep most recent 50
      mem.important_facts = mem.important_facts.slice(-50);
    }
    saveMemory({ important_facts: mem.important_facts });
  }
}

export function recordSessionEnd(summary: string): void {
  const mem = loadMemory();
  mem.identity.session_count += 1;
  mem.statistics.total_sessions += 1;

  if (summary && summary.trim()) {
    mem.conversation_summaries.push({
      sessionId: `sess_${Date.now()}`,
      summary: summary.trim(),
      timestamp: new Date().toISOString(),
    });
  }

  // Cap at 200 summaries
  if (mem.conversation_summaries.length > 200) {
    const oldest100 = mem.conversation_summaries.slice(0, 100);
    mem.conversation_summaries = mem.conversation_summaries.slice(100);
    mem.archive_summary = (mem.archive_summary ? mem.archive_summary + '\n' : '') +
      oldest100.map((s) => (typeof s === 'string' ? s : s.summary)).join('; ');
  }

  saveMemory({
    identity: mem.identity,
    statistics: mem.statistics,
    conversation_summaries: mem.conversation_summaries,
    archive_summary: mem.archive_summary,
  });
}

export function selectRelevantFacts(
  facts: string[],
  userMessage: string,
  options: { limit?: number } = {}
): string[] {
  const limit = options.limit || 5;
  if (!facts || facts.length === 0) return [];
  const words = userMessage.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  // Score facts by relevance to user query
  const scored = facts.map((fact) => {
    const fLower = fact.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (fLower.includes(w)) score += 1;
    }
    return { fact, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.fact);
}
