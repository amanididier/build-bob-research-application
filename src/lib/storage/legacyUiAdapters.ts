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
