export type ModelTier = 'ultra-light-4gb' | 'balanced-8gb' | 'high-perf-16gb';

export interface ModelProfile {
  id: ModelTier;
  name: string;
  parameters: string;
  quantization: string;
  minRamGb: number;
  memoryUsageMb: number;
  tokensPerSec: number;
  description: string;
  recommendedFor: string;
  hfModelId: string;
}

export interface ResearchProject {
  id: string;
  name: string;
  color: 'violet' | 'emerald' | 'amber' | 'blue' | 'rose';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrowserTabItem {
  id: string;
  sessionId: string;
  tabId: number;
  title: string;
  url: string;
  favicon?: string;
  selectedText?: string;
  addedAt: string;
}

export interface ResearchHighlight {
  id: string;
  sessionId: string;
  url: string;
  selectedText: string;
  relevanceScore: number;
  color: 'emerald' | 'amber' | 'violet' | 'blue';
  sourceTitle?: string;
  timestamp: string;
}

export interface ResearchNote {
  id: string;
  projectId: string;
  sessionId: string;
  title: string;
  body: string;
  url?: string;
  color: 'yellow' | 'violet' | 'blue' | 'green';
  sourceTab?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  isOfflineSynthesis?: boolean;
}

export interface BridgeEvent {
  id: string;
  type: 'tab' | 'note' | 'ask';
  timestamp: string;
  payload: Record<string, any>;
  origin: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  userEmail?: string;
}
