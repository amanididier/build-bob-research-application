import assert from 'node:assert/strict';
import { getBobWorkspaceToolDeclarations, executeBobWorkspaceTool } from '../src/lib/ai/workspaceTools';
import { canonicalWorkspace } from '../src/lib/storage/canonicalRepository';
import { NoteEntity, TaskEntity } from '../src/lib/storage/canonicalModel';

const store = new Map<string, string>();
const emitted: Array<{ type: string; detail?: any }> = [];
const localStorageMock = {
  getItem(key: string) { return store.has(key) ? store.get(key)! : null; },
  setItem(key: string, value: string) { store.set(key, String(value)); },
  removeItem(key: string) { store.delete(key); },
  clear() { store.clear(); },
};

(globalThis as any).localStorage = localStorageMock;
(globalThis as any).window = {
  localStorage: localStorageMock,
  dispatchEvent(event: Event) {
    emitted.push({ type: event.type, detail: (event as CustomEvent).detail });
    return true;
  },
};

async function main() {
  assert.equal(getBobWorkspaceToolDeclarations('Hey Bob, how was your day?').length, 0, 'ordinary chat must not expose workspace tools');
  assert.equal(getBobWorkspaceToolDeclarations('How do I add a task to my list?').some((tool) => tool.name === 'add_task'), false, 'instructional questions must not expose write tools');
  assert.equal(getBobWorkspaceToolDeclarations('Please add a task to finish the report tomorrow').some((tool) => tool.name === 'add_task'), true, 'explicit task requests should expose add_task');
  assert.equal(getBobWorkspaceToolDeclarations('Please save a note about the interview').some((tool) => tool.name === 'create_note'), true, 'explicit note requests should expose create_note');

  store.set('bob_research_sessions_v3', JSON.stringify([
    { id: 'project-a', title: 'Project A', summary: 'Scoped project', sourceCount: 2 },
    { id: 'project-b', title: 'Project B', summary: 'Another project', sourceCount: 4 },
  ]));
  store.set('bob_tasks_v2', JSON.stringify([
    { id: 'task-a', title: 'Write project summary', projectId: 'project-a', completed: false, dueDate: 'Flexible' },
    { id: 'task-b', title: 'Private unrelated task', projectId: 'project-b', completed: false, dueDate: 'Tomorrow' },
  ]));
  store.set('bob_notes_v1', JSON.stringify([
    { id: 'note-a', title: 'Interview findings', selectedText: 'People need clearer pricing.', projectId: 'project-a', sourceTitle: 'Interview' },
    { id: 'note-b', title: 'Other project', selectedText: 'Do not expose this.', projectId: 'project-b', sourceTitle: 'Other' },
  ]));
  store.set('bob_tabs_catalog_v2', JSON.stringify([
    { title: 'Relevant tab', url: 'https://example.com/a', preview: 'A preview', selected: true, projectId: 'project-a' },
    { title: 'Other tab', url: 'https://example.com/b', preview: 'B preview', selected: true, projectId: 'project-b' },
  ]));

  const overview = await executeBobWorkspaceTool('get_project_overview', {}, 'project-a');
  assert.equal(overview.found, true);
  assert.equal((overview.project as any).title, 'Project A');

  const tasks = await executeBobWorkspaceTool('list_tasks', { status: 'open' }, 'project-a');
  assert.equal(tasks.total, 1);
  assert.equal(JSON.stringify(tasks).includes('Private unrelated task'), false, 'tasks must remain project-scoped');

  const notes = await executeBobWorkspaceTool('search_notes', { query: 'pricing' }, 'project-a');
  assert.equal(notes.count, 1);
  assert.equal(JSON.stringify(notes).includes('Do not expose this'), false, 'notes must remain project-scoped');

  const tabs = await executeBobWorkspaceTool('list_selected_tabs', {}, 'project-a');
  assert.equal(tabs.count, 1);

  const createdTask = await executeBobWorkspaceTool('add_task', { title: 'Test the saved task', due_date: 'Tomorrow' }, 'project-a', 'Please add a task to test the saved task tomorrow');
  assert.equal(createdTask.ok, true);
  assert.equal((JSON.parse(store.get('bob_tasks_v2') || '[]') as any[]).some((task) => task.title === 'Test the saved task' && task.projectId === 'project-a'), true);
  assert.equal(emitted.some((event) => event.type === 'bob:workspace-tool-action' && event.detail?.type === 'add_task'), true);

  const noInventedDate = await executeBobWorkspaceTool('add_task', { title: 'Task without a deadline', due_date: 'Tomorrow' }, 'project-a', 'Please add a task to read the notes');
  assert.equal(noInventedDate.dueDate, 'Flexible', 'tool must not invent a deadline that the user did not state');

  const ambiguousCompletion = await executeBobWorkspaceTool('complete_task', {}, 'project-a', 'Please mark the task complete');
  assert.equal(ambiguousCompletion.needsClarification, true, 'ambiguous completion must ask which task');

  const completed = await executeBobWorkspaceTool('complete_task', { task_id: 'task-a' }, 'project-a', 'Please mark the task complete');
  assert.equal(completed.ok, true);
  const completedTask = (JSON.parse(store.get('bob_tasks_v2') || '[]') as any[]).find((task) => task.id === 'task-a');
  assert.equal(completedTask?.completed, true);
  assert.equal(typeof completedTask?.completedAt, 'string', 'task completion should be timestamped for accurate dashboard progress');
  assert.equal(emitted.some((event) => event.type === 'bob:workspace-tool-action' && event.detail?.type === 'complete_task' && event.detail?.taskId === 'task-a' && event.detail?.projectId === 'project-a'), true, 'the app should receive the completed task and project IDs');

  const note = await executeBobWorkspaceTool('create_note', {
    title: 'Saved test note',
    content: 'Keep this finding.',
    source_title: 'Original research source',
    source_url: 'https://example.org/research/evidence',
  }, 'project-a', 'Please save a note about the finding');
  assert.equal(note.ok, true);
  const savedNote = (JSON.parse(store.get('bob_notes_v1') || '[]') as any[]).find((item) => item.title === 'Saved test note');
  assert.equal(savedNote?.sourceTitle, 'Original research source', 'source title should be preserved on saved notes');
  assert.equal(savedNote?.sourceUrl, 'https://example.org/research/evidence', 'source URL should be preserved on saved notes');

  const unsafeSource = await executeBobWorkspaceTool('create_note', {
    title: 'Note with unsafe source', content: 'Do not preserve a non-web URL.', source_url: 'javascript:alert(1)',
  }, 'project-a', 'Please save a note about the finding');
  assert.equal(unsafeSource.ok, true);
  const unsafeSavedNote = (JSON.parse(store.get('bob_notes_v1') || '[]') as any[]).find((item) => item.title === 'Note with unsafe source');
  assert.equal(unsafeSavedNote?.sourceUrl, '', 'only HTTP(S) source URLs should be retained');


  // When legacy collections are absent, AI retrieval should safely read canonical records.
  store.delete('bob_tasks_v2');
  store.delete('bob_notes_v1');
  const now = new Date().toISOString();
  const canonicalTask: TaskEntity = {
    id: 'task_canonical-fallback', kind: 'task', title: 'Canonical fallback task',
    body: 'Context: migrated workspace', projectId: 'project_project-a', status: 'open',
    tags: [], scope: 'project', createdAt: now, updatedAt: now, schemaVersion: 1,
  };
  const canonicalNote: NoteEntity = {
    id: 'note_canonical-fallback', kind: 'note', title: 'Canonical fallback note',
    body: 'Canonical evidence about durable storage.', projectId: 'project_project-a',
    scope: 'project', tags: [], sourceIds: [], attachmentIds: [],
    createdAt: now, updatedAt: now, schemaVersion: 1,
  };
  canonicalWorkspace.save(canonicalTask);
  canonicalWorkspace.save(canonicalNote);
  const canonicalTasks = await executeBobWorkspaceTool('list_tasks', { status: 'open' }, 'project-a');
  assert.equal(canonicalTasks.total, 1);
  assert.equal((canonicalTasks.tasks as any[])[0].title, 'Canonical fallback task');
  const canonicalNotes = await executeBobWorkspaceTool('search_notes', { query: 'durable storage' }, 'project-a');
  assert.equal(canonicalNotes.count, 1);
  assert.equal((canonicalNotes.notes as any[])[0].title, 'Canonical fallback note');

  console.log('Workspace tool regression tests passed: intent gating, project isolation, selected tabs, safe due dates, task add/complete, ambiguity handling, and note persistence, plus canonical read fallback.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
