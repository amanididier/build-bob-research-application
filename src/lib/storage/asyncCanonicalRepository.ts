import { CanonicalWorkspaceStore } from './canonicalModel';
import { CANONICAL_WORKSPACE_STORAGE_KEY, KeyValueStorage } from './canonicalRepository';

export interface AsyncCanonicalWorkspaceStorage {
  read(): Promise<CanonicalWorkspaceStore>;
  write(next: CanonicalWorkspaceStore, expectedRevision: number): Promise<void>;
}

export interface NativeWorkspaceStoreBridge {
  workspaceStoreRead?: () => Promise<unknown>;
  workspaceStoreWrite?: (
    store: CanonicalWorkspaceStore,
    expectedRevision: number,
  ) => Promise<{ ok: boolean; conflict?: boolean; currentRevision?: number }>;
}

function emptyStore(): CanonicalWorkspaceStore {
  return { schemaVersion: 1, revision: 0, entities: {}, migrations: [] };
}

function normalizeStore(value: unknown): CanonicalWorkspaceStore {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Canonical workspace storage returned an invalid value.');
  }
  const candidate = value as Partial<CanonicalWorkspaceStore>;
  if (
    candidate.schemaVersion !== 1 ||
    !Number.isInteger(candidate.revision) ||
    (candidate.revision ?? -1) < 0 ||
    !candidate.entities ||
    typeof candidate.entities !== 'object' ||
    Array.isArray(candidate.entities) ||
    !Array.isArray(candidate.migrations)
  ) {
    throw new Error('Canonical workspace storage returned an unsupported or invalid schema.');
  }
  for (const [id, entity] of Object.entries(candidate.entities)) {
    if (!entity || typeof entity !== 'object' || entity.id !== id || entity.schemaVersion !== 1) {
      throw new Error(`Canonical workspace entity "${id}" failed validation.`);
    }
  }
  return {
    schemaVersion: 1,
    revision: candidate.revision as number,
    entities: candidate.entities,
    migrations: candidate.migrations.filter((entry): entry is string => typeof entry === 'string'),
  };
}

/** Async adapter for the Electron main-process file store. It never falls back to localStorage
 * after a native read/write error, because split-brain writes would make recovery ambiguous. */
export class NativeCanonicalWorkspaceStorage implements AsyncCanonicalWorkspaceStorage {
  constructor(private readonly bridge: NativeWorkspaceStoreBridge) {
    if (!bridge.workspaceStoreRead || !bridge.workspaceStoreWrite) {
      throw new Error('Native canonical workspace bridge is unavailable.');
    }
  }

  async read(): Promise<CanonicalWorkspaceStore> {
    return normalizeStore(await this.bridge.workspaceStoreRead!());
  }

  async write(next: CanonicalWorkspaceStore, expectedRevision: number): Promise<void> {
    const normalized = normalizeStore(next);
    const result = await this.bridge.workspaceStoreWrite!(normalized, expectedRevision);
    if (!result?.ok) {
      if (result?.conflict) {
        throw new Error(`Canonical workspace write conflict: expected revision ${expectedRevision}, current revision ${result.currentRevision}.`);
      }
      throw new Error('Native canonical workspace write failed.');
    }
  }
}

/** Browser fallback for web builds and tests. Writes use revision checks within this instance;
 * browser localStorage does not provide cross-tab compare-and-swap guarantees. */
export class BrowserCanonicalWorkspaceStorage implements AsyncCanonicalWorkspaceStorage {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key = CANONICAL_WORKSPACE_STORAGE_KEY,
  ) {}

  async read(): Promise<CanonicalWorkspaceStore> {
    const raw = this.storage.getItem(this.key);
    if (!raw) return emptyStore();
    try {
      return normalizeStore(JSON.parse(raw));
    } catch (error) {
      throw new Error('Canonical browser workspace data is unreadable; original data was left untouched.', { cause: error });
    }
  }

  async write(next: CanonicalWorkspaceStore, expectedRevision: number): Promise<void> {
    const current = await this.read();
    if (current.revision !== expectedRevision) {
      throw new Error(`Canonical workspace write conflict: expected revision ${expectedRevision}, current revision ${current.revision}.`);
    }
    const normalized = normalizeStore(next);
    if (normalized.revision !== expectedRevision + 1) {
      throw new Error('Canonical workspace revision must increase by exactly one.');
    }
    this.storage.setItem(this.key, JSON.stringify(normalized));
  }
}

export function createAsyncCanonicalWorkspaceStorage(
  browserStorage?: KeyValueStorage | null,
  bridge?: NativeWorkspaceStoreBridge | null,
): AsyncCanonicalWorkspaceStorage {
  const resolvedBridge = bridge ?? (
    typeof window !== 'undefined' ? (window as Window & { bob?: NativeWorkspaceStoreBridge }).bob : undefined
  );
  if (resolvedBridge?.workspaceStoreRead && resolvedBridge.workspaceStoreWrite) {
    return new NativeCanonicalWorkspaceStorage(resolvedBridge);
  }
  let resolvedStorage = browserStorage;
  if (resolvedStorage === undefined) {
    try {
      resolvedStorage = typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      resolvedStorage = null;
    }
  }
  if (!resolvedStorage) throw new Error('No canonical workspace storage adapter is available.');
  return new BrowserCanonicalWorkspaceStorage(resolvedStorage);
}

export interface NativeMigrationResult {
  status: 'migrated' | 'already-migrated' | 'no-browser-data' | 'native-store-not-empty';
  entities: number;
  backupKey?: string;
}

/**
 * Copy canonical browser data into native storage only when the native store is empty.
 * The source localStorage value is never removed; an exact backup is made before writing.
 */
export async function migrateBrowserCanonicalStoreToNative(
  nativeStorage: AsyncCanonicalWorkspaceStorage,
  browserStorage: KeyValueStorage,
  backupKey = `${CANONICAL_WORKSPACE_STORAGE_KEY}_backup_before_native_migration`,
): Promise<NativeMigrationResult> {
  const raw = browserStorage.getItem(CANONICAL_WORKSPACE_STORAGE_KEY);
  if (!raw) return { status: 'no-browser-data', entities: 0 };
  const browserStore = normalizeStore(JSON.parse(raw));
  const nativeStore = await nativeStorage.read();
  const sameContent = JSON.stringify({ ...nativeStore, revision: browserStore.revision }) === JSON.stringify(browserStore);
  if (sameContent) {
    return { status: 'already-migrated', entities: Object.keys(nativeStore.entities).length, backupKey };
  }
  if (Object.keys(nativeStore.entities).length > 0 || nativeStore.revision > 0 || nativeStore.migrations.length > 0) {
    return { status: 'native-store-not-empty', entities: Object.keys(nativeStore.entities).length };
  }

  // Preserve the exact source bytes so recovery does not depend on re-serialization.
  browserStorage.setItem(backupKey, raw);
  const nextStore: CanonicalWorkspaceStore = {
    ...browserStore,
    revision: nativeStore.revision + 1,
  };
  await nativeStorage.write(nextStore, nativeStore.revision);
  const verified = await nativeStorage.read();
  if (JSON.stringify(verified.entities) !== JSON.stringify(nextStore.entities) ||
      JSON.stringify(verified.migrations) !== JSON.stringify(nextStore.migrations)) {
    throw new Error('Native workspace migration verification failed. Browser source and backup were preserved.');
  }
  return { status: 'migrated', entities: Object.keys(verified.entities).length, backupKey };
}

/** A small async repository for new/migrated consumers. Existing synchronous consumers must
 * be converted deliberately before the app can switch fully to the native adapter. */
export class AsyncCanonicalWorkspaceRepository {
  constructor(private readonly storage: AsyncCanonicalWorkspaceStorage) {}

  snapshot(): Promise<CanonicalWorkspaceStore> {
    return this.storage.read().then((store) => JSON.parse(JSON.stringify(store)) as CanonicalWorkspaceStore);
  }

  async save<T extends CanonicalWorkspaceStore['entities'][string]>(entity: T): Promise<T> {
    const store = await this.storage.read();
    const now = new Date().toISOString();
    const existing = store.entities[entity.id];
    const saved = {
      ...entity,
      schemaVersion: 1 as const,
      createdAt: existing?.createdAt ?? entity.createdAt ?? now,
      updatedAt: now,
    } as T;
    const next: CanonicalWorkspaceStore = {
      ...store,
      revision: store.revision + 1,
      entities: { ...store.entities, [saved.id]: saved },
    };
    await this.storage.write(next, store.revision);
    return saved;
  }

  async delete(id: string): Promise<boolean> {
    const store = await this.storage.read();
    if (!store.entities[id]) return false;
    const entities = { ...store.entities };
    delete entities[id];
    await this.storage.write({ ...store, revision: store.revision + 1, entities }, store.revision);
    return true;
  }
}
