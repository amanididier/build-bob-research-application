import assert from 'node:assert/strict';
import { executeCompanionTool } from '../src/lib/companionTools';

const storage = new Map<string, string>();
const events: Array<{ type: string; detail?: unknown }> = [];

const localStorageMock = {
  getItem(key: string) { return storage.has(key) ? storage.get(key)! : null; },
  setItem(key: string, value: string) { storage.set(key, String(value)); },
  removeItem(key: string) { storage.delete(key); },
  clear() { storage.clear(); },
};

class MockCustomEvent<T = unknown> extends Event {
  detail: T;
  constructor(type: string, init?: { detail?: T }) {
    super(type);
    this.detail = init?.detail as T;
  }
}

(globalThis as any).localStorage = localStorageMock;
(globalThis as any).CustomEvent = (globalThis as any).CustomEvent || MockCustomEvent;
(globalThis as any).window = {
  localStorage: localStorageMock,
  dispatchEvent(event: Event) {
    events.push({ type: event.type, detail: (event as any).detail });
    return true;
  },
};

async function main() {
  storage.set('bob_active_research_id', 'project-a');
  storage.set('bob_research_sessions_v3', JSON.stringify([
    { id: 'project-a', title: 'Project A', summary: 'A scoped test project' },
    { id: 'project-b', title: 'Project B' },
  ]));
  storage.set('bob_tasks_v2', JSON.stringify([
    { id: 'existing-a', title: 'Existing task', projectId: 'project-a', completed: false },
    { id: 'existing-b', title: 'Private task from another project', projectId: 'project-b', completed: false },
  ]));
  storage.set('bob_notes_v1', JSON.stringify([
    { id: 'note-a', title: 'Research finding', selectedText: 'A relevant result', projectId: 'project-a' },
    { id: 'note-b', title: 'Other project note', selectedText: 'Do not leak this', projectId: 'project-b' },
  ]));

  const listed = await executeCompanionTool('list_tasks', {});
  assert.equal(listed.ok, true);
  assert.deepEqual((listed.tasks as any[]).map((task) => task.id), ['existing-a']);

  const created = await executeCompanionTool('create_task', { title: 'Ship the first test', dueDate: 'Tomorrow' });
  assert.equal(created.ok, true);
  assert.equal((created.task as any).projectId, 'project-a');
  assert.equal(storage.get('bob_tasks_v2')?.includes('Ship the first test'), true);
  assert.equal(events.some((event) => event.type === 'bob:workspace-updated'), true);

  const duplicate = await executeCompanionTool('create_task', { title: 'Ship the first test' });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.alreadyExists, true);

  const completed = await executeCompanionTool('complete_task', { taskId: 'existing-a' });
  assert.equal(completed.ok, true);
  assert.equal((completed.task as any).completed, true);

  const saved = await executeCompanionTool('save_note', { title: 'Next steps', content: 'Test the real user flow.' });
  assert.equal(saved.ok, true);
  assert.equal(storage.get('bob_notes_v1')?.includes('Test the real user flow.'), true);

  const searched = await executeCompanionTool('search_saved_notes', { query: 'relevant result' });
  assert.equal(searched.ok, true);
  assert.equal((searched.matches as any[]).length, 1);
  assert.equal(JSON.stringify(searched.matches).includes('Do not leak this'), false);

  const missing = await executeCompanionTool('complete_task', { taskId: 'missing-id' });
  assert.equal(missing.ok, false);

  const roadmap = await executeCompanionTool('open_roadmap_builder', { goal: 'Finish the project roadmap' });
  assert.equal(roadmap.ok, true);
  assert.equal(roadmap.opened, true);
  assert.equal(events.some((event) => event.type === 'bob-open-roadmap'), true);

  console.log('Companion tool tests passed: project scoping, create/deduplicate/complete task, save/search note, missing task, roadmap request.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
