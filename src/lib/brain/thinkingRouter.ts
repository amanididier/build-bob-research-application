export type ThinkingLevel = 'instant' | 'standard' | 'deep';

export function classifyThinkingLevel(message: string): ThinkingLevel {
  const lower = message.toLowerCase().trim();

  // Instant: greetings, simple factual, status questions
  const instantPatterns = [
    /^(hi|hello|hey|muraho|good morning|morning)/,
    /^(how are you|how.s it going|what.s up)/,
    /^(yes|no|okay|sure|thanks|murakoze)/,
    /what time/,
    /^(open|close|show|hide)/,
  ];

  if (instantPatterns.some((p) => p.test(lower))) return 'instant';

  // Deep: research, analysis, complex reasoning needed
  const deepPatterns = [
    /compare|versus|difference between|pros and cons/,
    /why does|how does|explain|analyze|research/,
    /should i|what do you think about|help me decide/,
    /write|essay|report|document|summarize all/,
    /best way to|how to build|architecture|design/,
    /what are the implications|what does this mean for/,
  ];

  if (deepPatterns.some((p) => p.test(lower))) return 'deep';

  // Long messages usually need deeper thinking
  if (message.split(/\s+/).length > 30) return 'deep';

  return 'standard';
}

export const DEEP_THINKING_ADDITION = `
DEEP THINKING MODE ACTIVE.
Before answering, think through this carefully:
1. What is the user ACTUALLY asking? (not just the surface question)
2. What do I know for certain vs what am I uncertain about?
3. What are 2-3 different ways to approach this?
4. What is the most useful response for THIS specific person?
Show your thinking in the "thinking" field of your JSON response.
Take the time needed. A thoughtful answer is worth the wait.
`.trim();

export function getThinkingMessage(level: ThinkingLevel, elapsedSeconds: number): string {
  if (level === 'instant' || elapsedSeconds < 2) {
    return 'thinking...';
  }
  if (elapsedSeconds < 8) {
    return 'Let me think about this carefully...';
  }
  if (elapsedSeconds < 16) {
    return 'Considering different angles & synthesising evidence...';
  }
  return 'Checking what I know for certain & organizing response...';
}
