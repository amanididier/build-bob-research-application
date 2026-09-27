export interface UserIdentity {
  name: string;
  nickname: string | null;
  nickname_approved: boolean;
  nickname_denied: boolean;
  location: string;
  language_preference: string;
  session_count: number;
  first_seen: string;
  last_seen: string;
}

export interface UserPersonality {
  communication_style: string;
  response_length_preference: string;
  works_late: boolean;
  motivation_triggers: string[];
  distraction_patterns: string[];
  emotional_patterns: string[];
  learning_style: string;
}

export interface UserPreferences {
  theme: string;
  voice_on: boolean;
  voice_speed: number;
  proactivity_level: string;
  api_key_type: string;
}

export interface UserStatistics {
  total_sessions: number;
  total_messages: number;
  total_highlights: number;
  streak_days: number;
  last_streak_date: string | null;
}

export interface ConversationSummaryItem {
  sessionId: string;
  summary: string;
  timestamp: string;
}

export interface UserMemory {
  version: string;
  identity: UserIdentity;
  personality: UserPersonality;
  projects: string[];
  important_facts: string[];
  conversation_summaries: (string | ConversationSummaryItem)[];
  archive_summary?: string;
  preferences: UserPreferences;
  statistics: UserStatistics;
}

export interface Session {
  id: string;
  parent_id?: string | null;
  project_id?: string | null;
  title: string;
  goal?: string | null;
  session_type?: string;
  status?: string;
  message_count: number;
  token_count?: number;
  summary?: string | null;
  summary_updated_at?: string | null;
  tags?: string;
  created_at: string;
  last_active: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | null;
  content_compressed?: string | null;
  token_count?: number;
  is_summarized?: number | boolean;
  thinking_process?: string | null;
  highlight_color?: string | null;
  created_at: string;
}

export interface Highlight {
  id: string;
  session_id: string;
  content: string;
  source_url?: string | null;
  source_title?: string | null;
  color: string;
  importance_score?: number;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  session_count: number;
  created_at: string;
  last_active: string;
}
