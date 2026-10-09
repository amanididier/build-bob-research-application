import { create } from 'zustand';
import { Message } from '../lib/memory/types';
import { getMessages, saveMessage } from '../lib/db/queries';
import { buildContext } from '../lib/brain/contextBuilder';
import { classifyThinkingLevel, getThinkingMessage } from '../lib/brain/thinkingRouter';
import { parseKezaResponse, ParsedKezaResponse } from '../lib/brain/responseParser';
import { scheduleCompression } from '../lib/brain/memoryCompressor';
import { extractFactsFromText } from '../lib/memory/factExtractor';
import { recordSessionEnd } from '../lib/memory/memoryManager';
import { bobAi } from '../lib/aiEngine';

interface ChatStoreState {
  messages: Message[];
  isThinking: boolean;
  thinkingMessage: string;
  thinkingLevel: 'instant' | 'standard' | 'deep';
  lastParsedResponse: ParsedKezaResponse | null;
  loadMessagesForSession: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, userText: string, options?: { deepThink?: boolean }) => Promise<ParsedKezaResponse | null>;
  clearChat: () => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: [],
  isThinking: false,
  thinkingMessage: '',
  thinkingLevel: 'standard',
  lastParsedResponse: null,

  loadMessagesForSession: async (sessionId: string) => {
    const list = await getMessages(sessionId, { limit: 12 });
    set({ messages: list });
  },

  sendMessage: async (sessionId: string, userText: string, options = {}) => {
    const text = userText.trim();
    if (!text) return null;

    // 1. Classify complexity
    const level = classifyThinkingLevel(text);
    const deepThink = options.deepThink || level === 'deep';

    // 2. Save user message to SQLite DB
    const userMsg = await saveMessage({
      session_id: sessionId,
      role: 'user',
      content: text,
    });

    set((state) => ({
      messages: [...state.messages, userMsg],
      isThinking: true,
      thinkingLevel: level,
      thinkingMessage: getThinkingMessage(level, 0),
    }));

    // Start thinking ticker
    let elapsed = 0;
    const ticker = setInterval(() => {
      elapsed += 1;
      set({ thinkingMessage: getThinkingMessage(level, elapsed) });
    }, 1000);

    try {
      // 3. Assemble full 5-layer context
      const context = await buildContext(sessionId, text, { deepThink });

      // 4. Generate AI response (using KEZA prompt & brain)
      const aiResult = await bobAi.generateResearchAnswer(
        text,
        sessionId,
        undefined,
        bobAi.getTastePreference()
      );
      const parsed = parseKezaResponse(aiResult.answer);

      // 5. Save assistant message to SQLite
      const assistantMsg = await saveMessage({
        session_id: sessionId,
        role: 'assistant',
        content: parsed.summary || parsed.rawText,
        thinking_process: parsed.thinking,
      });

      clearInterval(ticker);

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isThinking: false,
        thinkingMessage: '',
        lastParsedResponse: parsed,
      }));

      // 6. Asynchronous memory extraction & compression (never blocks UI)
      setTimeout(async () => {
        // Extract facts
        await extractFactsFromText(text);
        if (parsed.new_facts_about_user.length > 0) {
          for (const f of parsed.new_facts_about_user) {
            await extractFactsFromText(`I ${f}`);
          }
        }
        // Memory compression if >15 messages
        scheduleCompression(sessionId);
        // Record session end stats
        if (parsed.summary) {
          recordSessionEnd(parsed.summary);
        }
      }, 0);

      return parsed;
    } catch (err: any) {
      clearInterval(ticker);
      set({ isThinking: false, thinkingMessage: '' });
      console.warn('KEZA chat error:', err);
      return null;
    }
  },

  clearChat: () => {
    set({ messages: [], isThinking: false, thinkingMessage: '', lastParsedResponse: null });
  },
}));
