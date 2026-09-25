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

// Seed default initial research memory bank if empty
const DEFAULT_MEMORIES: MemoryNode[] = [
  {
    id: 'mem-1',
    type: 'note',
    title: 'Transport checkout abandonment rate',
    content: 'Passenger drop-off occurs most frequently (over 45%) during price calculation when unexpected mobile carrier surcharges and booking fees appear right before payment confirmation.',
    sourceUrl: 'https://research.example.com/transport-booking',
    projectId: 'urugendo',
    tags: ['pricing', 'friction', 'checkout'],
    relevanceWeight: 0.95,
    timestamp: Date.now() - 3600000 * 24,
  },
  {
    id: 'mem-2',
    type: 'highlight',
    title: 'Seat availability ambiguity',
    content: 'Unlike ride-hailing in mature markets, regional inter-city transport passengers require explicit physical station location and vehicle plate validation before paying.',
    sourceUrl: 'https://research.example.com/transport-booking',
    projectId: 'urugendo',
    tags: ['dispatch', 'seat-inventory', 'trust'],
    relevanceWeight: 0.91,
    timestamp: Date.now() - 3600000 * 18,
  },
  {
    id: 'mem-3',
    type: 'tab',
    title: 'Rwanda transport booking workflow notes',
    content: 'Field observations indicate bus operators prioritize offline ticket booth walk-ups unless digital reservations are guaranteed via real-time SMS webhook.',
    sourceUrl: 'https://docs.google.com/document/d/transport-rwanda',
    projectId: 'urugendo',
    tags: ['rwanda', 'operations', 'sms'],
    relevanceWeight: 0.88,
    timestamp: Date.now() - 3600000 * 12,
  },
  {
    id: 'mem-4',
    type: 'synthesis',
    title: 'Operator fee tolerance threshold',
    content: 'Cooperatives show willingness to pay a 2.5% to 3.5% ticketing commission if fraud chargebacks and daily cash reconciliation are automated.',
    sourceUrl: 'https://chatgpt.com/share/transport-economics',
    projectId: 'urugendo',
    tags: ['commission', 'fintech', 'cooperatives'],
    relevanceWeight: 0.85,
    timestamp: Date.now() - 3600000 * 4,
  },
  {
    id: 'mem-5',
    type: 'note',
    title: 'Local AI quantization benchmark',
    content: 'Sub-500MB quantized models (Q4_K_M) achieve 35+ tokens per second on low-end quad-core CPUs with 4GB RAM, making on-device private inference viable without cloud tokens.',
    sourceUrl: 'https://arxiv.org/abs/2401.00001',
    projectId: 'local-ai',
    tags: ['ai', 'quantization', '4gb-ram', 'offline'],
    relevanceWeight: 0.94,
    timestamp: Date.now() - 3600000 * 2,
  },
];

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
        this.memoryCache = JSON.parse(raw);
      } else {
        this.memoryCache = [...DEFAULT_MEMORIES];
        this.saveToDisk();
      }
    } catch {
      this.memoryCache = [...DEFAULT_MEMORIES];
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

    const queryWords = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const pool = this.getAllMemories(projectId);

    const scored = pool.map((item) => {
      const textToScan = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
      let matchScore = 0;

      for (const word of queryWords) {
        if (textToScan.includes(word)) {
          matchScore += 2;
          // exact title match gets higher weight
          if (item.title.toLowerCase().includes(word)) matchScore += 3;
        }
      }

      // Weight by initial relevance and recency
      const recencyBonus = Math.max(0, 1 - (Date.now() - item.timestamp) / (1000 * 60 * 60 * 24 * 7));
      const totalScore = matchScore * 1.5 + item.relevanceWeight * 2 + recencyBonus;

      return { item, totalScore };
    });

    return scored
      .filter((s) => s.totalScore > 0.5)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((s) => s.item);
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
