import assert from 'node:assert/strict';
import {
  CanonicalWorkspaceRepository,
  CANONICAL_WORKSPACE_STORAGE_KEY,
} from '../src/lib/storage/canonicalRepository';
import { canonicalWorkspace } from '../src/lib/storage/canonicalRepository';
import { migrateLegacyWorkspace, getLegacyMigrationId } from '../src/lib/storage/migrateLegacyWorkspace';
import { NoteEntity, ProjectEntity, LinkEntity, SourceEntity, TaskEntity, WorkspaceEntity } from '../src/lib/storage/canonicalModel';
import { canonicalNotesForLegacyUi, canonicalTasksForLegacyUi } from '../src/lib/storage/legacyUiAdapters';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const storage = new MemoryStorage();
const repo = new CanonicalWorkspaceRepository(storage, 'test_workspace');

function base<T extends WorkspaceEntity>(entity: Omit<T, 'createdAt' | 'updatedAt' | 'schemaVersion'>): T {
  const now = new Date().toISOString();
  return { ...entity, createdAt: now, updatedAt: now, schemaVersion: 1 as const } as T;
}

function testRepositoryCrudAndSearch() {
  const project = base<ProjectEntity>({
    id: 'project_alpha', kind: 'project', title: 'Alpha project', description: 'Inventory planning',
    status: 'active', tags: ['planning'],
  });
  repo.save(project);
  const note = base<NoteEntity>({
    id: 'note_alpha', kind: 'note', title: 'Meeting notes', body: 'Remember the inventory audit.',
    projectId: project.id, scope: 'project', tags: ['Audit', 'Urgent'], sourceIds: [], attachmentIds: [],
  });
  repo.save(note);

  assert.equal(repo.get<ProjectEntity>(project.id)?.title, 'Alpha project');
  assert.equal(repo.list({ kind: 'note', projectId: project.id, text: 'INVENTORY' }).length, 1);
  assert.equal(repo.list({ kind: 'note', tags: ['urgent'] }).length, 1);
  assert.equal(repo.list({ kind: 'note', scope: 'personal' }).length, 0);

  const snapshot = repo.snapshot();
  (snapshot.entities[note.id] as NoteEntity).body = 'mutated snapshot';
  assert.equal(repo.get<NoteEntity>(note.id)?.body, 'Remember the inventory audit.', 'snapshots must not mutate stored entities');

  const updated = repo.save({ ...note, title: 'Updated meeting notes' });
  assert.equal(updated.createdAt, note.createdAt, 'updates must preserve the original creation timestamp');
  assert.equal(repo.get<NoteEntity>(note.id)?.title, 'Updated meeting notes');
  assert.equal(repo.delete(note.id), true);
  assert.equal(repo.get(note.id), null);
  assert.equal(repo.delete('missing'), false);
}

function testBacklinks() {
  const now = new Date().toISOString();
  const noteA: NoteEntity = { id: 'note_a', kind: 'note', title: 'A', body: 'Source note', scope: 'personal', tags: [], sourceIds: [], attachmentIds: [], createdAt: now, updatedAt: now, schemaVersion: 1 };
  const noteB: NoteEntity = { id: 'note_b', kind: 'note', title: 'B', body: 'Target note', scope: 'personal', tags: [], sourceIds: [], attachmentIds: [], createdAt: now, updatedAt: now, schemaVersion: 1 };
  const link: LinkEntity = { id: 'link_a_b', kind: 'link', fromId: noteA.id, toId: noteB.id, relation: 'references', origin: 'explicit', createdAt: now, updatedAt: now, schemaVersion: 1 };
  repo.save(noteA); repo.save(noteB); repo.save(link);
  assert.equal(repo.backlinks(noteB.id).some((entity) => entity.id === noteA.id), true);
}

function testMigrationIsNonDestructiveAndIdempotent() {
  const localStorage = new MemoryStorage();
  (globalThis as any).localStorage = localStorage;
  (globalThis as any).window = { localStorage };

  const projects = [{ id: 'legacy-project-a', title: 'Legacy project', summary: 'Keep this project' }];
  const notes = [{ id: 'legacy-note-a', title: 'Legacy note', selectedText: 'The original note body', projectId: 'legacy-project-a' }];
  const tasks = [{ id: 'legacy-task-a', title: 'Legacy task', projectId: 'legacy-project-a', completed: false, dueDate: 'Flexible' }];
  localStorage.setItem('bob_research_sessions_v3', JSON.stringify(projects));
  localStorage.setItem('bob_notes_v1', JSON.stringify(notes));
  localStorage.setItem('bob_tasks_v2', JSON.stringify(tasks));

  // The production singleton resolves window.localStorage lazily, after the browser shim is set.
  const report = migrateLegacyWorkspace();
  assert.deepEqual(report.imported, { projects: 1, notes: 1, tasks: 1 });
  assert.equal(canonicalWorkspace.get<NoteEntity>('note_legacy-note-a')?.body, 'The original note body');
  assert.equal(canonicalWorkspace.get<NoteEntity>('note_legacy-note-a')?.projectId, 'project_legacy-project-a');
  assert.equal(canonicalWorkspace.get('task_legacy-task-a')?.kind, 'task');
  assert.deepEqual(JSON.parse(localStorage.getItem('bob_notes_v1') || 'null'), notes, 'legacy source data must remain unchanged');
  assert.equal(canonicalWorkspace.hasMigration(getLegacyMigrationId()), true);

  const secondRun = migrateLegacyWorkspace();
  assert.equal(secondRun.alreadyRan, true, 'migration should not duplicate data on a second run');
  assert.equal(canonicalWorkspace.list({ kind: 'note' }).length, 1);
}


function testCanonicalLegacyUiAdapters() {
  const now = new Date().toISOString();
  const source: SourceEntity = {
    id: 'source_legacy-ui-note', kind: 'source', title: 'Original source',
    sourceType: 'url', url: 'https://example.com/evidence',
    metadata: { legacyNoteId: 'legacy-ui-note', relevance: 91, color: 'blue' },
    createdAt: now, updatedAt: now, schemaVersion: 1,
  };
  const note: NoteEntity = {
    id: 'note_legacy-ui-note', kind: 'note', title: 'Canonical note', body: 'Markdown evidence',
    projectId: 'project_alpha', scope: 'project', tags: [], sourceIds: [source.id], attachmentIds: [],
    createdAt: now, updatedAt: now, schemaVersion: 1,
  };
  const task: TaskEntity = {
    id: 'task_legacy-ui-task', kind: 'task', title: 'Canonical task',
    body: 'Context: Evidence review\\nDue: Flexible', projectId: 'project_alpha',
    status: 'completed', completedAt: now, tags: ['ai-generated'], scope: 'project',
    createdAt: now, updatedAt: now, schemaVersion: 1,
  };
  repo.save(source); repo.save(note); repo.save(task);
  const [uiNote] = canonicalNotesForLegacyUi(repo).filter((item) => item.id === 'legacy-ui-note');
  assert.equal(uiNote.title, 'Canonical note');
  assert.equal(uiNote.selectedText, 'Markdown evidence');
  assert.equal(uiNote.sourceTitle, 'Original source');
  assert.equal(uiNote.sourceUrl, 'https://example.com/evidence');
  assert.equal(uiNote.projectId, 'alpha');
  assert.equal(uiNote.relevance, 91);
  assert.equal(uiNote.color, 'blue');

  const [uiTask] = canonicalTasksForLegacyUi(repo).filter((item) => item.id === 'legacy-ui-task');
  assert.equal(uiTask.title, 'Canonical task');
  assert.equal(uiTask.projectId, 'alpha');
  assert.equal(uiTask.completed, true);
  assert.equal(uiTask.isAiGenerated, true);
  assert.equal(uiTask.sourceConnection, 'Evidence review');
  assert.equal(uiTask.dueDate, 'Flexible');
}

function main() {
  assert.equal(CANONICAL_WORKSPACE_STORAGE_KEY, 'bob_canonical_workspace_v1');
  testRepositoryCrudAndSearch();
  testBacklinks();
  testCanonicalLegacyUiAdapters();
  testMigrationIsNonDestructiveAndIdempotent();
  console.log('Canonical storage tests passed: CRUD, search filters, snapshots, timestamps, backlinks, non-destructive migration, project relationships, idempotency, and canonical-to-legacy UI adapters.');
}

main();
