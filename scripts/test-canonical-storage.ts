import assert from 'node:assert/strict';
import {
  CanonicalWorkspaceRepository,
  CANONICAL_WORKSPACE_STORAGE_KEY,
} from '../src/lib/storage/canonicalRepository';
import { canonicalWorkspace } from '../src/lib/storage/canonicalRepository';
import { migrateLegacyWorkspace, getLegacyMigrationId } from '../src/lib/storage/migrateLegacyWorkspace';
import { NoteEntity, ProjectEntity, LinkEntity, SourceEntity, TaskEntity, WorkspaceEntity } from '../src/lib/storage/canonicalModel';
import { canonicalNotesForLegacyUi, canonicalTasksForLegacyUi, readLegacyCollectionOrCanonical } from '../src/lib/storage/legacyUiAdapters';

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
    body: 'Context: Evidence review\nDue: Flexible', projectId: 'project_alpha',
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

function testLegacyCollectionFallbackRules() {
  const localStorage = new MemoryStorage();
  (globalThis as any).localStorage = localStorage;
  (globalThis as any).window = { localStorage };
  const fallback = () => [{ id: 'canonical-record' }];

  assert.deepEqual(readLegacyCollectionOrCanonical('missing_collection', fallback), fallback(),
    'missing legacy collection should fall back to canonical records');

  localStorage.setItem('broken_collection', '{not valid json');
  assert.deepEqual(readLegacyCollectionOrCanonical('broken_collection', fallback), fallback(),
    'corrupt legacy JSON should fall back to canonical records');

  localStorage.setItem('wrong_shape_collection', JSON.stringify({ records: [] }));
  assert.deepEqual(readLegacyCollectionOrCanonical('wrong_shape_collection', fallback), fallback(),
    'non-array legacy data should fall back to canonical records');

  localStorage.setItem('intentionally_empty_collection', '[]');
  assert.deepEqual(readLegacyCollectionOrCanonical('intentionally_empty_collection', fallback), [],
    'a valid empty legacy array is authoritative and must not resurrect deleted canonical records');
}

function testMigrationCanRecoverAfterInvalidRecords() {
  const localStorage = new MemoryStorage();
  (globalThis as any).localStorage = localStorage;
  (globalThis as any).window = { localStorage };

  const projects = [{ id: 'recovery-project', title: 'Recovery project' }];
  const notes = [{ id: 'recovery-note', title: 'Recovery note', selectedText: 'Keep this evidence.', projectId: 'recovery-project' }];
  localStorage.setItem('bob_research_sessions_v3', JSON.stringify(projects));
  localStorage.setItem('bob_notes_v1', JSON.stringify(notes));
  localStorage.setItem('bob_tasks_v2', JSON.stringify([{ id: '', title: 'Invalid task without an ID' }]));

  const first = migrateLegacyWorkspace();
  assert.deepEqual(first.imported, { projects: 1, notes: 1, tasks: 0 });
  assert.equal(first.skipped.invalid, 1);
  assert.equal(canonicalWorkspace.hasMigration(getLegacyMigrationId()), false,
    'a partial migration must remain retryable');
  assert.equal(JSON.parse(localStorage.getItem('bob_tasks_v2') || '[]')[0].title, 'Invalid task without an ID',
    'invalid source data must not be deleted or rewritten');

  localStorage.setItem('bob_tasks_v2', JSON.stringify([
    { id: 'repaired-task', title: 'Recovered task', projectId: 'recovery-project', completed: false, dueDate: 'Flexible' },
  ]));
  const second = migrateLegacyWorkspace();
  assert.equal(second.imported.tasks, 1, 'a repaired record should import on retry');
  assert.equal(second.skipped.duplicates, 2, 'previously imported project and note should not be duplicated');
  assert.equal(canonicalWorkspace.hasMigration(getLegacyMigrationId()), true,
    'migration should be marked complete once every source record is valid');
  assert.equal(canonicalWorkspace.list({ kind: 'project' }).filter((item) => item.id === 'project_recovery-project').length, 1);
  assert.equal(canonicalWorkspace.list({ kind: 'note' }).filter((item) => item.id === 'note_recovery-note').length, 1);
  assert.equal(canonicalWorkspace.list({ kind: 'task' }).filter((item) => item.id === 'task_repaired-task').length, 1);
}

function testMigrationCanRetryCorruptCollection() {
  const localStorage = new MemoryStorage();
  (globalThis as any).localStorage = localStorage;
  (globalThis as any).window = { localStorage };

  localStorage.setItem('bob_research_sessions_v3', JSON.stringify([
    { id: 'corrupt-recovery-project', title: 'Corrupt recovery project' },
  ]));
  const originalCorruptValue = '{invalid json';
  localStorage.setItem('bob_tasks_v2', originalCorruptValue);

  const first = migrateLegacyWorkspace();
  assert.equal(first.imported.projects, 1);
  assert.equal(first.skipped.invalid, 1, 'corrupt collection should be reported as invalid');
  assert.equal(canonicalWorkspace.hasMigration(getLegacyMigrationId()), false,
    'corrupt collections must not permanently close migration');
  assert.equal(localStorage.getItem('bob_tasks_v2'), originalCorruptValue,
    'corrupt legacy bytes must be preserved for recovery');

  localStorage.setItem('bob_tasks_v2', JSON.stringify([
    { id: 'after-corruption', title: 'Task after recovery', projectId: 'corrupt-recovery-project', completed: false },
  ]));
  const second = migrateLegacyWorkspace();
  assert.equal(second.imported.tasks, 1, 'repaired collection should be imported on retry');
  assert.equal(second.skipped.duplicates, 1, 'the project imported before recovery must not be duplicated');
  assert.equal(canonicalWorkspace.hasMigration(getLegacyMigrationId()), true);
  assert.equal(canonicalWorkspace.list({ kind: 'task' }).filter((item) => item.id === 'task_after-corruption').length, 1);
}

function main() {
  assert.equal(CANONICAL_WORKSPACE_STORAGE_KEY, 'bob_canonical_workspace_v1');
  testRepositoryCrudAndSearch();
  testBacklinks();
  testCanonicalLegacyUiAdapters();
  testLegacyCollectionFallbackRules();
  testMigrationIsNonDestructiveAndIdempotent();
  testMigrationCanRecoverAfterInvalidRecords();
  testMigrationCanRetryCorruptCollection();
  console.log('Canonical storage tests passed: CRUD, search filters, snapshots, timestamps, backlinks, non-destructive migration, project relationships, idempotency, canonical-to-legacy UI adapters, missing/corrupt collection fallback, valid-empty preservation, retryable partial migration recovery, and corrupt-JSON migration recovery.');
}

main();
