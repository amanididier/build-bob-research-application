/**
 * Merge streamed transcript chunks whether a provider sends deltas, overlapping
 * fragments, or cumulative snapshots. This keeps live captions readable.
 */
export function mergeStreamingText(previous: string, incoming: string): string {
  const prev = previous || '';
  const next = (incoming || '').trim();
  if (!next) return prev;
  if (!prev) return next;
  if (next === prev || prev.endsWith(next)) return prev;
  if (next.startsWith(prev)) return next;

  let overlap = Math.min(prev.length, next.length);
  while (overlap > 0 && prev.slice(-overlap).toLowerCase() !== next.slice(0, overlap).toLowerCase()) {
    overlap--;
  }
  if (overlap > 0) return prev + next.slice(overlap);

  const endsWithSpace = /\s$/.test(prev);
  const beginsWithPunctuation = /^[,.;:!?)}\]]/.test(next);
  const likelyWordFragment = next.length <= 3 && /[A-Za-z0-9]$/.test(prev) && /^[a-z0-9]/.test(next);
  return prev + (endsWithSpace || beginsWithPunctuation || likelyWordFragment ? '' : ' ') + next;
}
