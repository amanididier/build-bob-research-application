/**
 * Local PC Memory Bank for Bob Research Companion
 * 
 * Stores research highlights, notes, web clips, and chat interactions
 * directly on the user's PC (localStorage / IndexedDB) without sending any
 * data to external cloud servers.
 * 
 * Provides fast local semantic & keyword retrieval to ground Bob's local AI.
 */

export interface MemoryNode {
  id: string;
  type: 'note' | 'highlight' | 'tab' | 'synthesis' | 'chat';
  title: string;
  content: string;
  sourceUrl?: string;
  projectId: string;
  tags: string[];
  relevanceWeight: number;
  timestamp: number;
}

export interface MemoryBankStats {
  totalNodes: number;
  notesCount: number;
  highlightsCount: number;
  tabsCount: number;
  storageSizeKb: number;
  lastUpdated: number;
}

const STORAGE_KEY = 'bob_local_research_memory_v1';

// Start empty for new users; only real user-created research is stored here.
export class LocalResearchMemoryBank {
  private memoryCache: MemoryNode[] = [];

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const memories = Array.isArray(parsed) ? parsed : [];
        // Older builds seeded fake example research into real users' memory.
        // Remove those known demo IDs during migration so they are never cited
        // as if the user actually researched these topics.
        const knownDemoMemories = new Set([
          'mem-1|Transport checkout abandonment rate|https://research.example.com/transport-booking',
          'mem-2|Seat availability ambiguity|https://research.example.com/transport-booking',
          'mem-3|Rwanda transport booking workflow notes|https://docs.google.com/document/d/transport-rwanda',
          'mem-4|Operator fee tolerance threshold|https://chatgpt.com/share/transport-economics',
          'mem-5|Local AI quantization benchmark|https://arxiv.org/abs/2401.00001',
        ]);
        this.memoryCache = memories.filter((node: Partial<MemoryNode>) =>
          !knownDemoMemories.has(`${String(node?.id || '')}|${String(node?.title || '')}|${String(node?.sourceUrl || '')}`)
        );
        if (this.memoryCache.length !== memories.length) this.saveToDisk();
      } else {
        this.memoryCache = [];
      }
    } catch {
      this.memoryCache = [];
    }
  }

  private saveToDisk(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memoryCache));
    } catch (e) {
      console.warn('Failed to persist memory node to local disk:', e);
    }
  }

  /**
   * Add a new knowledge node to the PC memory bank
   */
  public addMemory(node: Omit<MemoryNode, 'id' | 'timestamp'>): MemoryNode {
    const newNode: MemoryNode = {
      ...node,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    this.memoryCache.unshift(newNode);
    this.saveToDisk();
    return newNode;
  }

  /**
   * Retrieve all memories for a project or globally
   */
  public getAllMemories(projectId?: string): MemoryNode[] {
    if (!projectId || projectId === 'all') {
      return [...this.memoryCache];
    }
    return this.memoryCache.filter((m) => m.projectId === projectId || m.projectId === 'all');
  }

  /**
   * Search local memories using keyword relevance and semantic recency
   */
  public searchMemories(query: string, projectId?: string, limit: number = 4): MemoryNode[] {
    if (!query.trim()) {
      return this.getAllMemories(projectId).slice(0, limit);
    }

    const stopwords = new Set([
      'about', 'after', 'again', 'also', 'and', 'are', 'because', 'been', 'being',
      'but', 'can', 'could', 'did', 'does', 'doing', 'for', 'from', 'had', 'has',
      'have', 'her', 'here', 'him', 'his', 'how', 'into', 'its', 'just', 'like',
      'may', 'me', 'more', 'most', 'my', 'not', 'our', 'out', 'please', 'remember', 'memory', 'memories', 'should', 'some',
      'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'tell',
      'this', 'those', 'through', 'too', 'very', 'was', 'were', 'what', 'when',
      'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
    ]);
    const pool = this.getAllMemories(projectId);
    const explicitRecallRequest = /\b(what do you remember|what can you remember|what have we discussed|previous conversations|tell me what you remember)\b/i.test(query);
    if (explicitRecallRequest) return pool.slice(0, limit);

    const queryWords = [...new Set(
      query.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !stopwords.has(w))
    )];

    // Research memories must earn their place through relevance to this query.
    // Recency and a manually assigned weight may rank matching memories, but must
    // never inject an unrelated memory into an ordinary conversation.
    if (queryWords.length === 0) return [];

    const scored = pool.map((item) => {
      const title = String(item.title || '').toLowerCase();
      const textToScan = `${item.title} ${item.content} ${(item.tags || []).join(' ')}`.toLowerCase();
      let matchScore = 0;

      for (const word of queryWords) {
        if (textToScan.includes(word)) {
          matchScore += 2;
          if (title.includes(word)) matchScore += 3;
        }
      }

      const recencyBonus = Math.max(0, 1 - (Date.now() - item.timestamp) / (1000 * 60 * 60 * 24 * 7));
      const totalScore = matchScore * 1.5 + item.relevanceWeight * 0.25 + recencyBonus * 0.25;

      return { item, matchScore, totalScore };
    });

    return scored
      .filter((s) => s.matchScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((s) => s.item);
  }

  /**
   * Create or update the memory record associated with a notebook note.
   * The stable note tag prevents edits from leaving stale copies in retrieval.
   */
  public upsertNoteMemory(
    noteId: string,
    node: Omit<MemoryNode, 'id' | 'timestamp'>
  ): MemoryNode {
    const noteTag = `app-note:${noteId}`;
    const existing = this.memoryCache.find((item) =>
      item.tags.includes(noteTag)
    ) || this.memoryCache.find((item) =>
      item.type === 'note' &&
      item.projectId === node.projectId &&
      item.title === node.title &&
      item.tags.includes('notebook')
    );

    const updated: MemoryNode = {
      ...node,
      id: existing?.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tags: [...new Set([...(node.tags || []), noteTag])],
      timestamp: Date.now(),
    };

    if (existing) {
      this.memoryCache = this.memoryCache.map((item) =>
        item.id === existing.id ? updated : item
      );
    } else {
      this.memoryCache.unshift(updated);
    }

    this.saveToDisk();
    return updated;
  }

  /**
   * Delete a memory node
   */
  public deleteMemory(id: string): void {
    this.memoryCache = this.memoryCache.filter((m) => m.id !== id);
    this.saveToDisk();
  }

  /**
   * Get stats for the memory bank
   */
  public getStats(): MemoryBankStats {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || '' : '';
    return {
      totalNodes: this.memoryCache.length,
      notesCount: this.memoryCache.filter((m) => m.type === 'note').length,
      highlightsCount: this.memoryCache.filter((m) => m.type === 'highlight').length,
      tabsCount: this.memoryCache.filter((m) => m.type === 'tab').length,
      storageSizeKb: Math.round((raw.length * 2) / 1024), // 2 bytes per char approx
      lastUpdated: this.memoryCache[0]?.timestamp || Date.now(),
    };
  }

  /**
   * Format retrieved memories into context block for Bob's local AI reasoning
   */
  public buildPromptContext(query: string, projectId?: string): { contextText: string; citedNodes: MemoryNode[] } {
    const matches = this.searchMemories(query, projectId, 4);
    if (matches.length === 0) {
      return { contextText: '', citedNodes: [] };
    }

    const contextLines = matches.map(
      (m, idx) => `[Source ${idx + 1} (${m.type})]: ${m.title} — "${m.content}" (URL: ${m.sourceUrl || 'local notebook'})`
    );

    return {
      contextText: `\n### RELEVANT LOCAL RESEARCH MEMORY RETRIEVED FROM PC:\n${contextLines.join('\n')}\n`,
      citedNodes: matches,
    };
  }
}

// Global singleton instance
export const localMemoryBank = new LocalResearchMemoryBank();
