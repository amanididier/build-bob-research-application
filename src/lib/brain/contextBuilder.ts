import { getSession, getMessages, getHighlights } from '../db/queries';
import { loadMemory } from '../memory/memoryManager';
import { countTokens, ChatMessage } from './tokenCounter';
import { buildSystemPrompt } from './systemPrompt';
import { DEEP_THINKING_ADDITION } from './thinkingRouter';
import { Session } from '../memory/types';
import { researchGraph } from '../research/researchGraph';
import { ContextCandidate } from '../research/researchTypes';

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
  const memory = loadMemory(); // In RAM
  let session = await getSession(sessionId);

  if (!session) {
    session = {
      id: sessionId,
      title: 'Current Research',
      message_count: 0,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    } as Session;
  }

  // 1. System Prompt (Soul of KEZA)
  let systemPrompt = buildSystemPrompt(memory, session);
  if (options.deepThink) {
    systemPrompt += `\n\n${DEEP_THINKING_ADDITION}`;
  }

  // 2. Hot messages (last 10-12 verbatim)
  const recentMessages = await getMessages(sessionId, {
    limit: 12,
    onlyNotSummarized: false,
    orderBy: 'created_at DESC',
  });
  recentMessages.reverse();

  // 3. Dynamic Relevance-Driven Candidate Retrieval Engine
  const candidates: ContextCandidate[] = [];
  const queryTerms = newUserMessage.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  // A. Score Memory Facts
  for (const fact of memory.important_facts) {
    const fLower = fact.toLowerCase();
    let matchScore = 0;
    for (const t of queryTerms) {
      if (fLower.includes(t)) matchScore += 2;
    }
    candidates.push({
      content: `- ${fact}`,
      sourceType: 'memory',
      sourceId: 'mem_fact',
      relevanceScore: matchScore + 1, // small baseline
      importance: 0.8,
      recency: 1,
      scope: 'global',
      estimatedTokens: countTokens(fact),
    });
  }

  // B. Retrieve Parent Structured Findings (if subtopic)
  if (session.parent_id) {
    const parentFindings = researchGraph.getFindingsForResearch(session.parent_id);
    for (const f of parentFindings) {
      let matchScore = 0;
      const combined = `${f.claim} ${f.summary}`.toLowerCase();
      for (const t of queryTerms) {
        if (combined.includes(t)) matchScore += 2;
      }
      candidates.push({
        content: `Parent Finding: ${f.claim} — ${f.summary}`,
        sourceType: 'parent_finding',
        sourceId: f.id,
        relevanceScore: matchScore + 2,
        importance: f.importance,
        recency: 1,
        scope: 'research',
        estimatedTokens: countTokens(f.summary),
      });
    }
  }

  // C. Cross-Research Findings (Knowledge Graph search)
  const crossFindings = researchGraph.searchCrossResearch(newUserMessage, sessionId, 3);
  for (const cf of crossFindings) {
    candidates.push({
      content: `Cross-Research Reference: ${cf.claim} (${cf.summary.slice(0, 150)})`,
      sourceType: 'parent_finding',
      sourceId: cf.id,
      relevanceScore: 2,
      importance: cf.importance,
      recency: 0.5,
      scope: 'project',
      estimatedTokens: countTokens(cf.summary),
    });
  }

  // D. Saved Highlights
  const highlights = await getHighlights(sessionId, { limit: 5 });
  for (const h of highlights) {
    let matchScore = 0;
    const hLower = h.content.toLowerCase();
    for (const t of queryTerms) {
      if (hLower.includes(t)) matchScore += 2;
    }
    candidates.push({
      content: `[Note]: ${h.content}`,
      sourceType: 'highlight',
      sourceId: h.id,
      relevanceScore: matchScore + 1.5,
      importance: h.importance_score ?? 0.6,
      recency: 1,
      scope: 'subtopic',
      estimatedTokens: countTokens(h.content),
    });
  }

  // 4. Rank Candidates by Composite Relevance & Dynamic Budget Allocation
  // Composite Score = relevanceScore * 2 + importance * 1.5
  candidates.sort((a, b) => {
    const scoreA = a.relevanceScore * 2 + a.importance * 1.5;
    const scoreB = b.relevanceScore * 2 + b.importance * 1.5;
    return scoreB - scoreA;
  });

  const MAX_DYNAMIC_BUDGET_TOKENS = 1600;
  let allocatedTokens = 0;
  const selectedContextChunks: string[] = [];

  for (const c of candidates) {
    if (allocatedTokens + c.estimatedTokens <= MAX_DYNAMIC_BUDGET_TOKENS) {
      selectedContextChunks.push(c.content);
      allocatedTokens += c.estimatedTokens;
    }
  }

  // 5. Build Assembled Context
  const systemSections = [
    systemPrompt,
    session.goal ? `\nActive research goal: ${session.goal}` : '',
    session.summary ? `\nPrior conversation summary: ${session.summary}` : '',
    selectedContextChunks.length > 0
      ? `\nRelevant research knowledge & context:\n${selectedContextChunks.join('\n')}`
      : '',
  ].filter(Boolean);

  const contextMessages: ChatMessage[] = [
    {
      role: 'system',
      content: systemSections.join('\n'),
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
