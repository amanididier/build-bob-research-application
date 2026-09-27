import { getSession, getMessages, getHighlights } from '../db/queries';
import { loadMemory, selectRelevantFacts } from '../memory/memoryManager';
import { countTokens, ChatMessage } from './tokenCounter';
import { buildSystemPrompt } from './systemPrompt';
import { DEEP_THINKING_ADDITION } from './thinkingRouter';
import { Session } from '../memory/types';

export interface ContextResult {
  messages: ChatMessage[];
  totalTokens: number;
  thinkingEnabled: boolean;
}

export async function buildContext(
  sessionId: string,
  newUserMessage: string,
  options: { deepThink?: boolean; isSubtopic?: boolean } = {}
): Promise<ContextResult> {
  const memory = loadMemory(); // Already in RAM - 0ms
  let session = await getSession(sessionId); // SQLite - <5ms

  if (!session) {
    session = {
      id: sessionId,
      title: 'Current Research',
      message_count: 0,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    } as Session;
  }

  // 1. SYSTEM PROMPT — Always first, always required
  let systemPrompt = buildSystemPrompt(memory, session);
  if (options.deepThink) {
    systemPrompt += `\n\n${DEEP_THINKING_ADDITION}`;
  }

  // 2. LOAD RECENT MESSAGES — Hot path, must be fast
  const recentMessages = await getMessages(sessionId, {
    limit: 12,
    onlyNotSummarized: false,
    orderBy: 'created_at DESC',
  });
  recentMessages.reverse();

  // 3. SESSION SUMMARY — If session has many messages
  let sessionSummary = '';
  if (session.message_count > 15 && session.summary) {
    sessionSummary = session.summary;
  }

  // 4. PARENT CONTEXT — If this is a sub-topic
  let parentContext = '';
  if (options.isSubtopic && session.parent_id) {
    const parent = await getSession(session.parent_id);
    if (parent?.summary) {
      parentContext =
        `Parent research context: ${parent.title}\n` +
        `Goal: ${parent.goal || 'General study'}\n` +
        `Summary: ${parent.summary}`;
    }
  }

  // 5. RELEVANT HIGHLIGHTS — Top 3 most relevant to current message
  let highlightContext = '';
  if (session.session_type === 'research') {
    const highlights = await getHighlights(sessionId, { limit: 3 });
    if (highlights.length > 0) {
      highlightContext =
        'Saved research notes:\n' +
        highlights.map((h) => `[${(h.color || 'yellow').toUpperCase()}] ${h.content}`).join('\n');
    }
  }

  // 6. RELEVANT MEMORY FACTS — Top 5 most relevant to current message
  const relevantFacts = selectRelevantFacts(
    memory.important_facts,
    newUserMessage,
    { limit: 5 }
  );

  // 7. ASSEMBLE FINAL CONTEXT
  const contextMessages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        systemPrompt,
        relevantFacts.length > 0
          ? `\nKnown facts about ${memory.identity.name}:\n` +
            relevantFacts.map((f) => `- ${f}`).join('\n')
          : '',
        parentContext ? `\n${parentContext}` : '',
        sessionSummary ? `\nEarlier in this conversation: ${sessionSummary}` : '',
        highlightContext ? `\n${highlightContext}` : '',
        session.goal ? `\nCurrent research goal: ${session.goal}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
    ...recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content || '',
    })),
    { role: 'user', content: newUserMessage },
  ];

  return {
    messages: contextMessages,
    totalTokens: countTokens(contextMessages),
    thinkingEnabled: options.deepThink ?? false,
  };
}
