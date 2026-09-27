export type MemoryType =
  | 'identity'
  | 'preference'
  | 'behavior'
  | 'interest'
  | 'goal'
  | 'working_style'
  | 'project_fact'
  | 'research_interest';

export type MemoryScope = 'global' | 'project' | 'research' | 'subtopic' | 'session';

export interface PersistentMemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  scope: MemoryScope;
  confidence: number; // 0.0 - 1.0
  importance: number; // 0.0 - 1.0
  stability: number; // 0.0 - 1.0
  source?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  domain: string;
  author?: string;
  publishedAt?: string;
  accessedAt: string;
  credibilityScore: number; // 0.0 - 1.0
  snippet: string;
  contentHash?: string;
}

export interface ResearchClaim {
  id: string;
  claim: string;
  sourceId?: string;
  confidence: number;
  extractedAt: string;
}

export interface ResearchFinding {
  id: string;
  researchId: string;
  subtopicId?: string | null;
  claim: string;
  summary: string;
  evidence: string;
  confidence: number;
  importance: number;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchQuestion {
  id: string;
  researchId: string;
  question: string;
  status: 'open' | 'investigating' | 'resolved';
  resolvedFindingId?: string;
  createdAt: string;
}

export interface ContextCandidate {
  content: string;
  sourceType: 'memory' | 'parent_finding' | 'highlight' | 'session_summary' | 'goal';
  sourceId: string;
  relevanceScore: number;
  importance: number;
  recency: number;
  scope: MemoryScope;
  estimatedTokens: number;
}
