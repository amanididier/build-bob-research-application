import assert from 'node:assert/strict';
import {
  AsyncCanonicalWorkspaceRepository,
  BrowserCanonicalWorkspaceStorage,
  NativeCanonicalWorkspaceStorage,
  migrateBrowserCanonicalStoreToNative,
} from '../src/lib/storage/asyncCanonicalRepository';
import { CANONICAL_WORKSPACE_STORAGE_KEY, KeyValueStorage } from '../src/lib/storage/canonicalRepository';
import { CanonicalWorkspaceStore, ProjectEntity } from '../src/lib/storage/canonicalModel';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function emptyStore(): CanonicalWorkspaceStore {
  return { schemaVersion: 1, revision: 0, entities: {}, migrations: [] };
}

function makeProject(id: string, title: string): ProjectEntity {
  const now = '2026-10-20T00:00:00.000Z';
  return { id, kind: 'project', title, status: 'active', tags: [], createdAt: now, updatedAt: now, schemaVersion: 1 };
}

async function testBrowserRepositoryAndRevisionGuard() {
  const browser = new MemoryStorage();
  const storage = new BrowserCanonicalWorkspaceStorage(browser);
  const repository = new AsyncCanonicalWorkspaceRepository(storage);
  await repository.save(makeProject('project-a', 'First project'));
  const snapshot = await repository.snapshot();
  assert.equal(snapshot.revision, 1);
  assert.equal(snapshot.entities['project-a']?.kind, 'project');
  assert.equal((snapshot.entities['project-a'] as ProjectEntity).title, 'First project');

  await storage.write({ ...snapshot, revision: 2 }, 1);
  await assert.rejects(() => storage.write({ ...snapshot, revision: 2 }, 1), /write conflict/i);
  assert.equal((await repository.delete('project-a')), true);
  assert.equal((await repository.snapshot()).entities['project-a'], undefined);
}

async function testNativeBridgeAndCompareAndSwap() {
  let persisted = emptyStore();
  const bridge = {
    workspaceStoreRead: async () => JSON.parse(JSON.stringify(persisted)),
    workspaceStoreWrite: async (next: CanonicalWorkspaceStore, expectedRevision: number) => {
      if (persisted.revision !== expectedRevision) {
        return { ok: false, conflict: true, currentRevision: persisted.revision };
      }
      persisted = JSON.parse(JSON.stringify(next));
      return { ok: true, revision: persisted.revision };
    },
  };
  const native = new NativeCanonicalWorkspaceStorage(bridge);
  const repository = new AsyncCanonicalWorkspaceRepository(native);
  await repository.save(makeProject('project-native', 'Native project'));
  assert.equal((await native.read()).revision, 1);
  assert.equal((await native.read()).entities['project-native']?.kind, 'project');
  assert.equal(((await native.read()).entities['project-native'] as ProjectEntity).title, 'Native project');
  await assert.rejects(() => native.write({ ...persisted, revision: 2 }, 0), /write conflict/i);
}

async function testNonDestructiveNativeMigration() {
  const browser = new MemoryStorage();
  const sourceStore: CanonicalWorkspaceStore = {
    schemaVersion: 1,
    revision: 3,
    entities: { 'project-source': makeProject('project-source', 'Source project') },
    migrations: ['old-import'],
  };
  const raw = JSON.stringify(sourceStore);
  browser.setItem(CANONICAL_WORKSPACE_STORAGE_KEY, raw);

  let nativeStore = emptyStore();
  const native = new NativeCanonicalWorkspaceStorage({
    workspaceStoreRead: async () => JSON.parse(JSON.stringify(nativeStore)),
    workspaceStoreWrite: async (next, expectedRevision) => {
      if (nativeStore.revision !== expectedRevision) {
        return { ok: false, conflict: true, currentRevision: nativeStore.revision };
      }
      nativeStore = JSON.parse(JSON.stringify(next));
      return { ok: true, revision: nativeStore.revision };
    },
  });

  const result = await migrateBrowserCanonicalStoreToNative(native, browser);
  assert.equal(result.status, 'migrated');
  assert.equal(result.entities, 1);
  assert.equal(browser.getItem(CANONICAL_WORKSPACE_STORAGE_KEY), raw, 'source browser data must remain unchanged');
  assert.equal(browser.getItem(result.backupKey!), raw, 'exact source bytes must be backed up');
  assert.equal((await native.read()).entities['project-source']?.kind, 'project');
  assert.equal(((await native.read()).entities['project-source'] as ProjectEntity).title, 'Source project');

  const repeat = await migrateBrowserCanonicalStoreToNative(native, browser);
  assert.equal(repeat.status, 'already-migrated');

  nativeStore = {
    ...nativeStore,
    revision: nativeStore.revision + 1,
    entities: { ...nativeStore.entities, 'project-extra': makeProject('project-extra', 'Existing native data') },
  };
  const conflict = await migrateBrowserCanonicalStoreToNative(native, browser);
  assert.equal(conflict.status, 'native-store-not-empty');
  assert.equal((await native.read()).entities['project-extra']?.kind, 'project');
  assert.equal(((await native.read()).entities['project-extra'] as ProjectEntity).title, 'Existing native data');
}

async function testCorruptBrowserDataIsPreserved() {
  const browser = new MemoryStorage();
  const raw = '{invalid-json';
  browser.setItem(CANONICAL_WORKSPACE_STORAGE_KEY, raw);
  const native = new NativeCanonicalWorkspaceStorage({
    workspaceStoreRead: async () => emptyStore(),
    workspaceStoreWrite: async () => ({ ok: true, revision: 1 }),
  });
  await assert.rejects(() => migrateBrowserCanonicalStoreToNative(native, browser));
  assert.equal(browser.getItem(CANONICAL_WORKSPACE_STORAGE_KEY), raw);
}

async function main() {
  await testBrowserRepositoryAndRevisionGuard();
  await testNativeBridgeAndCompareAndSwap();
  await testNonDestructiveNativeMigration();
  await testCorruptBrowserDataIsPreserved();
  console.log('Async canonical storage tests passed: browser repository, revision conflict guard, native bridge, non-destructive migration, exact backup, idempotency, native-store conflict protection, and corrupt-source preservation.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
