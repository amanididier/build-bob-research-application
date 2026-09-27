import { getGroqKey } from './keyManager';
import { ChatMessage } from '../brain/tokenCounter';

export interface GroqChatOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export async function callGroqChat(
  messages: ChatMessage[],
  options: GroqChatOptions = {}
): Promise<string> {
  const apiKey = getGroqKey();
  const model = options.model || 'llama-3.3-70b-versatile';

  if (!apiKey) {
    throw new Error('No Groq API key configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.max_tokens || 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
