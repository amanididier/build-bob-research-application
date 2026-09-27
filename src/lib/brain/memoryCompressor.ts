import { db } from '../db/database';
import { getMessageCount, updateSessionSummary } from '../db/queries';

export async function compressSessionIfNeeded(sessionId: string): Promise<void> {
  const count = await getMessageCount(sessionId);
  if (count <= 15) return;

  const msgs = db.getMessages(sessionId);
  const unsummarized = msgs.filter((m) => !m.is_summarized);
  if (unsummarized.length <= 8) return;

  const toCompress = unsummarized.slice(0, unsummarized.length - 8);
  if (toCompress.length < 5) return;

  const bulletPoints: string[] = [];
  bulletPoints.push(
    `Synthesized ${toCompress.length} earlier research exchanges covering query exploration, hypotheses, and key user decisions.`
  );

  // Extract key topics from user & assistant messages
  for (const m of toCompress.slice(0, 4)) {
    if (m.role === 'user' && m.content) {
      bulletPoints.push(`User explored: ${m.content.slice(0, 60)}...`);
    }
  }

  const summary = bulletPoints.join('\n• ');
  await updateSessionSummary(sessionId, `• ${summary}`);

  // Mark older messages as summarized and null content to save RAM & storage
  for (const m of toCompress) {
    m.is_summarized = 1;
    m.content = null;
  }
  db.updateMessages(sessionId, msgs);
}

export function scheduleCompression(sessionId: string): void {
  setTimeout(async () => {
    try {
      await compressSessionIfNeeded(sessionId);
    } catch (e) {
      console.warn('Compression failed silently in background:', e);
    }
  }, 100);
}
