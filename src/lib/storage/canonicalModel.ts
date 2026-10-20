/**
 * Canonical workspace entities shared by UI, AI tools, and future storage adapters.
 * These types are additive: legacy screens can keep their current shapes during migration.
 */

export type EntityId = string;
export type VisibilityScope = 'personal' | 'project' | 'workspace';
export type WorkspaceEntityKind =
  | 'project'
  | 'phase'
  | 'task'
  | 'note'
  | 'diary-entry'
  | 'source'
  | 'attachment'
  | 'link'
  | 'revision';

export interface BaseEntity {
  id: EntityId;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface ProjectEntity extends BaseEntity {
  kind: 'project';
  title: string;
  description?: string;
  status?: 'active' | 'paused' | 'completed' | 'archived';
  color?: string;
  tags: string[];
}

export interface PhaseEntity extends BaseEntity {
  kind: 'phase';
  projectId: EntityId;
  title: string;
  description?: string;
  order: number;
  status: 'planned' | 'active' | 'completed' | 'archived';
}

export interface TaskEntity extends BaseEntity {
  kind: 'task';
  title: string;
  body?: string;
  projectId?: EntityId;
  phaseId?: EntityId;
  dueAt?: string;
  completedAt?: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  tags: string[];
  scope: VisibilityScope;
}

export interface NoteEntity extends BaseEntity {
  kind: 'note';
  title: string;
  /** Markdown is the canonical note body; rich editors can be added without changing storage. */
  body: string;
  projectId?: EntityId;
  scope: VisibilityScope;
  tags: string[];
  sourceIds: EntityId[];
  attachmentIds: EntityId[];
}

export interface DiaryEntryEntity extends BaseEntity {
  kind: 'diary-entry';
  /** Local calendar date, YYYY-MM-DD, intentionally separate from createdAt. */
  entryDate: string;
  title?: string;
  body: string;
  projectId?: EntityId;
  scope: 'personal' | 'project';
  tags: string[];
  linkedEntityIds: EntityId[];
}

export interface SourceEntity extends BaseEntity {
  kind: 'source';
  title: string;
  sourceType: 'url' | 'file' | 'manual' | 'conversation';
  url?: string;
  /** Stable local reference or app-managed path; never assume a cloud URL. */
  localRef?: string;
  excerpt?: string;
  contentHash?: string;
  projectId?: EntityId;
  metadata: Record<string, unknown>;
}

export interface AttachmentEntity extends BaseEntity {
  kind: 'attachment';
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  storage: 'local-file' | 'app-managed' | 'remote';
  localRef?: string;
  remoteUrl?: string;
  extractionStatus: 'not-started' | 'pending' | 'complete' | 'failed' | 'unsupported';
  extractedTextRef?: string;
  projectId?: EntityId;
}

export interface LinkEntity extends BaseEntity {
  kind: 'link';
  fromId: EntityId;
  toId: EntityId;
  relation: 'references' | 'mentions' | 'supports' | 'contradicts' | 'related-to' | 'parent-of';
  origin: 'explicit' | 'wikilink' | 'mention' | 'import';
}

export interface RevisionEntity extends BaseEntity {
  kind: 'revision';
  entityId: EntityId;
  entityKind: Exclude<WorkspaceEntityKind, 'revision'>;
  bodySnapshot?: string;
  titleSnapshot?: string;
  changeSummary?: string;
}

export type WorkspaceEntity =
  | ProjectEntity
  | PhaseEntity
  | TaskEntity
  | NoteEntity
  | DiaryEntryEntity
  | SourceEntity
  | AttachmentEntity
  | LinkEntity
  | RevisionEntity;

export interface CanonicalWorkspaceStore {
  schemaVersion: 1;
  revision: number;
  entities: Record<EntityId, WorkspaceEntity>;
  /** Completed migration IDs make migration repeatable and safe. */
  migrations: string[];
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeEntityId(prefix: string): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + '_' + randomPart;
}
