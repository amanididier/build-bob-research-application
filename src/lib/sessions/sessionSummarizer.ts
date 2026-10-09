import { getMessages, updateSessionSummary } from '../db/queries';
import { bobAi } from '../aiEngine';

export async function generateSessionSummary(sessionId: string): Promise<string> {
  const messages = await getMessages(sessionId, { limit: 15 });
  if (messages.length === 0) return '';

  const conversationText = messages
    .filter((m) => m.content)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  try {
    const response = await bobAi.generateResearchAnswer(
      `Summarize this research conversation into 2-3 concise, high-impact bullet points:\n${conversationText}`,
      sessionId,
      undefined,
      bobAi.getTastePreference()
    );
    const summary = response.answer.slice(0, 300);
    await updateSessionSummary(sessionId, summary);
    return summary;
  } catch (err) {
    const fallback = `Research focused on ${messages.length} inquiries.`;
    await updateSessionSummary(sessionId, fallback);
    return fallback;
  }
}
