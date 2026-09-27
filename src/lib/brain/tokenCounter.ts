export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function countTokens(textOrMessages: string | ChatMessage[]): number {
  if (typeof textOrMessages === 'string') {
    return Math.ceil(textOrMessages.length / 3.8);
  }
  let count = 0;
  for (const m of textOrMessages) {
    count += Math.ceil((m.content || '').length / 3.8) + 4;
  }
  return count;
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = Math.floor(maxTokens * 3.8);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}
