import { CanonicalWorkspaceRepository, canonicalWorkspace } from './canonicalRepository';
import { NoteEntity, SourceEntity, TaskEntity } from './canonicalModel';

export interface LegacyUiNote {
  id: string;
  title: string;
  selectedText: string;
  sourceTitle: string;
  sourceUrl: string;
  projectId: string;
  relevance: number;
  color: 'emerald' | 'blue' | 'yellow' | 'red';
  createdAt: string;
  isPolished?: boolean;
}

export interface LegacyUiTask {
  id: string;
  title: string;
  dueDate: string;
  sourceConnection: string;
  completed: boolean;
  projectId: string;
  isAiGenerated?: boolean;
  completedAt?: string;
}

function legacyId(id: string, prefix: string): string {
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

function projectId(id?: string): string {
  return id ? legacyId(id, 'project_') : 'general';
}

function sourceForNote(note: NoteEntity, repository: CanonicalWorkspaceRepository): SourceEntity | undefined {
  for (const sourceId of note.sourceIds) {
    const source = repository.get<SourceEntity>(sourceId);
    if (source?.kind === 'source') return source;
  }
  return undefined;
}

/** Convert canonical notes to the existing screen shape without changing the canonical records. */
export function canonicalNotesForLegacyUi(repository: CanonicalWorkspaceRepository = canonicalWorkspace): LegacyUiNote[] {
  return repository.list<NoteEntity>({ kind: 'note', limit: 500 }).map((note) => {
    const source = sourceForNote(note, repository);
    const metadata = source?.metadata ?? {};
    const colorValue = metadata.color;
    const color = colorValue === 'blue' || colorValue === 'yellow' || colorValue === 'red' || colorValue === 'emerald'
      ? colorValue
      : 'emerald';
    const createdAt = Number.isFinite(Date.parse(note.createdAt))
      ? note.createdAt
      : new Date().toISOString();
    return {
      id: typeof metadata.legacyNoteId === 'string' ? metadata.legacyNoteId : legacyId(note.id, 'note_'),
      title: note.title,
      selectedText: note.body,
      sourceTitle: source?.title ?? '',
      sourceUrl: source?.url ?? '',
      projectId: projectId(note.projectId),
      relevance: typeof metadata.relevance === 'number' ? metadata.relevance : 75,
      color,
      createdAt,
    };
  });
}

/** Convert canonical tasks to the existing task-list shape for a safe read fallback. */
export function canonicalTasksForLegacyUi(repository: CanonicalWorkspaceRepository = canonicalWorkspace): LegacyUiTask[] {
  return repository.list<TaskEntity>({ kind: 'task', limit: 500 }).map((task) => {
    const bodyLines = (task.body ?? '').split('\n');
    const context = bodyLines.find((line) => line.startsWith('Context: '))?.slice('Context: '.length) ?? '';
    const bodyDue = bodyLines.find((line) => line.startsWith('Due: '))?.slice('Due: '.length);
    const completed = task.status === 'completed';
    return {
      id: legacyId(task.id, 'task_'),
      title: task.title,
      dueDate: task.dueAt ?? bodyDue ?? 'Flexible',
      sourceConnection: context,
      completed,
      projectId: projectId(task.projectId),
      isAiGenerated: task.tags.includes('ai-generated'),
      completedAt: task.completedAt,
    };
  });
}
/**
 * Read a legacy collection when it is valid, otherwise fall back to canonical data.
 * A valid empty array is intentional and remains authoritative; we never merge both
 * stores here because that could duplicate records or resurrect deleted legacy items.
 */
export function readLegacyCollectionOrCanonical<T>(key: string, fallback: () => T[]): T[] {
  if (typeof window === 'undefined') return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    }
  } catch {
    // Missing or unreadable legacy data can be recovered from the canonical mirror.
  }
  return fallback();
}

/**
 * Reconcile canonical records that were previously mirrored from the legacy UI.
 * We track only IDs this adapter has mirrored, so canonical-only entities are not
 * deleted accidentally. A missing/corrupt marker is initialized conservatively.
 */
export function reconcileLegacyMirroredEntities(
  kind: 'note' | 'task',
  legacyIds: string[],
  repository: CanonicalWorkspaceRepository = canonicalWorkspace,
): number {
  if (typeof window === 'undefined') return 0;

  const safeIds = legacyIds
    .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    .map((id) => id.trim().replace(/[^a-zA-Z0-9_-]/g, '_'));
  const currentCanonicalIds = [...new Set(safeIds.map((id) => `${kind}_${id}`))];
  const markerKey = `bob_canonical_mirrored_${kind}_ids_v1`;

  try {
    const rawPrevious = window.localStorage.getItem(markerKey);
    if (rawPrevious === null) {
      window.localStorage.setItem(markerKey, JSON.stringify(currentCanonicalIds));
      return 0;
    }

    let previous: unknown;
    try {
      previous = JSON.parse(rawPrevious);
    } catch {
      // Never delete records based on an unreadable tracking marker.
      window.localStorage.setItem(markerKey, JSON.stringify(currentCanonicalIds));
      return 0;
    }
    if (!Array.isArray(previous) || !previous.every((id) => typeof id === 'string')) {
      window.localStorage.setItem(markerKey, JSON.stringify(currentCanonicalIds));
      return 0;
    }

    const current = new Set(currentCanonicalIds);
    let deleted = 0;
    for (const id of previous as string[]) {
      if (current.has(id) || !id.startsWith(kind + '_')) continue;
      if (repository.delete(id)) deleted += 1;
      if (kind === 'note') {
        const legacyId = id.slice('note_'.length);
        repository.delete(`source_legacy-note-${legacyId}`);
      }
    }

    window.localStorage.setItem(markerKey, JSON.stringify(currentCanonicalIds));
    return deleted;
  } catch (error) {
    console.warn('[Bob storage] Could not reconcile mirrored records:', error);
    return 0;
  }
}
