import {
  CanonicalWorkspaceStore,
  EntityId,
  WorkspaceEntity,
  WorkspaceEntityKind,
  makeEntityId,
  nowIso,
} from './canonicalModel';

export const CANONICAL_WORKSPACE_STORAGE_KEY = 'bob_canonical_workspace_v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type NewWorkspaceEntity = WorkspaceEntity extends infer Entity
  ? Entity extends WorkspaceEntity
    ? Omit<Entity, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
    : never
  : never;

export interface EntityQuery {
  kind?: WorkspaceEntityKind;
  projectId?: EntityId;
  scope?: string;
  text?: string;
  tags?: string[];
  limit?: number;
}

function emptyStore(): CanonicalWorkspaceStore {
  return { schemaVersion: 1, revision: 0, entities: {}, migrations: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStore(value: unknown): CanonicalWorkspaceStore {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.entities)) return emptyStore();
  const entities: Record<string, WorkspaceEntity> = {};
  for (const [id, candidate] of Object.entries(value.entities)) {
    if (isRecord(candidate) && candidate.id === id && typeof candidate.kind === 'string') {
      entities[id] = candidate as unknown as WorkspaceEntity;
    }
  }
  return {
    schemaVersion: 1,
    revision: typeof value.revision === 'number' ? value.revision : 0,
    entities,
    migrations: Array.isArray(value.migrations)
      ? value.migrations.filter((entry): entry is string => typeof entry === 'string')
      : [],
  };
}

/**
 * The canonical repository is intentionally opt-in while existing screens are migrated.
 * Storage is resolved lazily so importing this module during SSR/tests does not permanently
 * bind the singleton to a null storage adapter.
 */
export class CanonicalWorkspaceRepository {
  constructor(
    private readonly storageOverride?: KeyValueStorage | null,
    private readonly storageKey = CANONICAL_WORKSPACE_STORAGE_KEY,
  ) {}

  private getStorage(): KeyValueStorage | null {
    if (this.storageOverride !== undefined) return this.storageOverride;
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  private readStore(): CanonicalWorkspaceStore {
    const storage = this.getStorage();
    if (!storage) return emptyStore();
    try {
      const raw = storage.getItem(this.storageKey);
      return raw ? normalizeStore(JSON.parse(raw)) : emptyStore();
    } catch (error) {
      console.warn('[Bob storage] Could not read canonical workspace store:', error);
      return emptyStore();
    }
  }

  private writeStore(store: CanonicalWorkspaceStore): boolean {
    const storage = this.getStorage();
    if (!storage) return false;
    try {
      storage.setItem(this.storageKey, JSON.stringify(store));
      return true;
    } catch (error) {
      console.warn('[Bob storage] Could not persist canonical workspace store:', error);
      return false;
    }
  }

  /** Read-only snapshot; callers cannot mutate repository state by editing this object. */
  snapshot(): CanonicalWorkspaceStore {
    return JSON.parse(JSON.stringify(this.readStore())) as CanonicalWorkspaceStore;
  }

  get<T extends WorkspaceEntity = WorkspaceEntity>(id: EntityId): T | null {
    return (this.readStore().entities[id] as T | undefined) ?? null;
  }

  list<T extends WorkspaceEntity = WorkspaceEntity>(query: EntityQuery = {}): T[] {
    const needle = query.text?.trim().toLocaleLowerCase();
    const wantedTags = query.tags?.map((tag) => tag.toLocaleLowerCase()) ?? [];
    const values = Object.values(this.readStore().entities) as T[];
    return values
      .filter((entity) => !query.kind || entity.kind === query.kind)
      .filter((entity) => !query.projectId || ('projectId' in entity && entity.projectId === query.projectId))
      .filter((entity) => !query.scope || ('scope' in entity && entity.scope === query.scope))
      .filter((entity) => !wantedTags.length || ('tags' in entity && wantedTags.every((tag) =>
        Array.isArray(entity.tags) && entity.tags.some((saved) => saved.toLocaleLowerCase() === tag))))
      .filter((entity) => {
        if (!needle) return true;
        const haystack = [
          'title' in entity ? entity.title : '',
          'body' in entity ? entity.body : '',
          'description' in entity ? entity.description : '',
          'excerpt' in entity ? entity.excerpt : '',
        ].filter(Boolean).join('\n').toLocaleLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, Math.max(1, query.limit ?? 500));
  }

  save<T extends WorkspaceEntity>(entity: T): T {
    if (!entity.id || !entity.kind) throw new Error('A workspace entity must have an id and kind.');
    const store = this.readStore();
    const now = nowIso();
    const existing = store.entities[entity.id];
    const saved = {
      ...entity,
      schemaVersion: 1 as const,
      createdAt: existing?.createdAt ?? entity.createdAt ?? now,
      updatedAt: now,
    } as T;
    store.entities[saved.id] = saved;
    store.revision += 1;
    if (!this.writeStore(store)) throw new Error('Unable to save workspace data in this browser/device.');
    return saved;
  }

  create(input: NewWorkspaceEntity, idPrefix: string): WorkspaceEntity {
    const now = nowIso();
    const entity = {
      ...input,
      id: makeEntityId(idPrefix),
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1 as const,
    } as unknown as WorkspaceEntity;
    return this.save(entity);
  }

  delete(id: EntityId): boolean {
    const store = this.readStore();
    if (!store.entities[id]) return false;
    delete store.entities[id];
    // Do not cascade-delete references; unresolved links can be repaired or surfaced later.
    store.revision += 1;
    return this.writeStore(store);
  }

  /** Backlinks are derived from link entities, avoiding duplicated backlink state. */
  backlinks(entityId: EntityId): WorkspaceEntity[] {
    const store = this.readStore();
    const linkedIds = Object.values(store.entities)
      .filter((entity) => entity.kind === 'link' && entity.toId === entityId)
      .map((entity) => (entity as Extract<WorkspaceEntity, { kind: 'link' }>).fromId);
    return linkedIds.map((id) => store.entities[id]).filter(Boolean);
  }

  hasMigration(migrationId: string): boolean {
    return this.readStore().migrations.includes(migrationId);
  }

  markMigration(migrationId: string): void {
    const store = this.readStore();
    if (store.migrations.includes(migrationId)) return;
    store.migrations.push(migrationId);
    store.revision += 1;
    if (!this.writeStore(store)) throw new Error('Unable to record workspace migration.');
  }
}

export const canonicalWorkspace = new CanonicalWorkspaceRepository();
