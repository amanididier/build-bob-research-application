import { loadMemory, saveMemory } from './memoryManager';

export async function compressMemorySummariesIfNeeded(): Promise<boolean> {
  const mem = loadMemory();
  if (mem.conversation_summaries.length <= 200) {
    return false;
  }

  const oldest = mem.conversation_summaries.slice(0, 100);
  mem.conversation_summaries = mem.conversation_summaries.slice(100);

  const newArchiveText = oldest
    .map((s) => (typeof s === 'string' ? s : s.summary))
    .join('\n');

  mem.archive_summary = (mem.archive_summary ? mem.archive_summary + '\n' : '') + newArchiveText;
  await saveMemory({
    conversation_summaries: mem.conversation_summaries,
    archive_summary: mem.archive_summary,
  });

  return true;
}
