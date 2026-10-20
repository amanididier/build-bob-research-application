import { CanonicalWorkspaceRepository, KeyValueStorage, canonicalWorkspace } from './canonicalRepository';
import { NoteEntity, TaskEntity, ProjectEntity, nowIso } from './canonicalModel';

export interface LegacyMigrationReport {
  alreadyRan: boolean;
  imported: { projects: number; notes: number; tasks: number };
  skipped: { invalid: number; duplicates: number };
  warnings: string[];
}

const MIGRATION_ID = 'legacy-localstorage-to-canonical-v1';
const LEGACY_KEYS = {
  projects: 'bob_research_sessions_v3',
  notes: 'bob_notes_v1',
  tasks: 'bob_tasks_v2',
};

function readArray(key: string, report: LegacyMigrationReport, storage: KeyValueStorage | null): unknown[] {
  if (!storage) return [];
  const raw = storage.getItem(key);
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) return value;
    report.skipped.invalid += 1;
    report.warnings.push(`Legacy collection "${key}" is not an array; its contents were left untouched for recovery.`);
    return [];
  } catch {
    report.skipped.invalid += 1;
    report.warnings.push(`Legacy collection "${key}" contains invalid JSON; its contents were left untouched for recovery.`);
    return [];
  }
}

function asObject(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}

function cleanString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

/**
 * Import a snapshot of the three most established workspace collections.
 * Legacy keys are deliberately retained as rollback sources. This migration does not
 * change the active UI storage path; switching consumers is a separate verified step.
 */
export function migrateLegacyWorkspace(options: {
  storage?: KeyValueStorage | null;
  repository?: CanonicalWorkspaceRepository;
} = {}): LegacyMigrationReport {
  const report: LegacyMigrationReport = {
    alreadyRan: false,
    imported: { projects: 0, notes: 0, tasks: 0 },
    skipped: { invalid: 0, duplicates: 0 },
    warnings: [],
  };

  let storage = options.storage;
  if (storage === undefined) {
    try { storage = typeof window !== 'undefined' ? window.localStorage : null; } catch { storage = null; }
  }
  if (!storage) {
    report.warnings.push('Migration requires a browser storage context.');
    return report;
  }
  const repository = options.repository ?? canonicalWorkspace;
  if (repository.hasMigration(MIGRATION_ID)) {
    report.alreadyRan = true;
    return report;
  }

  const now = nowIso();
  const existing = repository.snapshot().entities;
  const seenIds = new Set(Object.keys(existing));
  // Preserve referential integrity when legacy IDs are namespaced in the canonical store.
  const projectIdMap = new Map<string, string>();

  for (const raw of readArray(LEGACY_KEYS.projects, report, storage)) {
    const item = asObject(raw);
    if (!item || !cleanString(item.id) || !cleanString(item.title)) {
      report.skipped.invalid += 1;
      continue;
    }
    const legacyId = cleanString(item.id);
    const id = 'project_' + legacyId.replace(/[^a-zA-Z0-9_-]/g, '_');
    projectIdMap.set(legacyId, id);
    if (seenIds.has(id)) { report.skipped.duplicates += 1; continue; }
    const project: ProjectEntity = {
      id, kind: 'project', title: cleanString(item.title), description: cleanString(item.summary),
      status: item.status === 'completed' || item.status === 'paused' ? item.status : 'active',
      color: cleanString(item.dotColor) || undefined, tags: [],
      createdAt: now, updatedAt: now, schemaVersion: 1,
    };
    repository.save(project);
    seenIds.add(id);
    report.imported.projects += 1;
  }

  for (const raw of readArray(LEGACY_KEYS.notes, report, storage)) {
    const item = asObject(raw);
    if (!item || !cleanString(item.id) || !cleanString(item.title)) {
      report.skipped.invalid += 1;
      continue;
    }
    const id = 'note_' + cleanString(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (seenIds.has(id)) { report.skipped.duplicates += 1; continue; }
    const note: NoteEntity = {
      id, kind: 'note', title: cleanString(item.title),
      body: cleanString(item.body, cleanString(item.selectedText)),
      projectId: (() => { const legacyProjectId = cleanString(item.projectId); return !legacyProjectId || legacyProjectId === 'general' ? undefined : (projectIdMap.get(legacyProjectId) ?? legacyProjectId); })(),
      scope: cleanString(item.projectId) && item.projectId !== 'general' ? 'project' : 'personal',
      tags: Array.isArray(item.tags) ? item.tags.filter((tag: unknown): tag is string => typeof tag === 'string') : [],
      sourceIds: [], attachmentIds: [],
      createdAt: cleanString(item.createdAt, now), updatedAt: cleanString(item.updatedAt, cleanString(item.createdAt, now)),
      schemaVersion: 1,
    };
    repository.save(note);
    seenIds.add(id);
    report.imported.notes += 1;
  }

  for (const raw of readArray(LEGACY_KEYS.tasks, report, storage)) {
    const item = asObject(raw);
    if (!item || !cleanString(item.id) || !cleanString(item.title)) {
      report.skipped.invalid += 1;
      continue;
    }
    const id = 'task_' + cleanString(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (seenIds.has(id)) { report.skipped.duplicates += 1; continue; }
    const completed = item.completed === true || item.status === 'completed';
    const task: TaskEntity = {
      id, kind: 'task', title: cleanString(item.title), body: cleanString(item.description) || undefined,
      projectId: (() => { const legacyProjectId = cleanString(item.projectId); return !legacyProjectId || legacyProjectId === 'general' ? undefined : (projectIdMap.get(legacyProjectId) ?? legacyProjectId); })(),
      dueAt: cleanString(item.dueDate) && cleanString(item.dueDate) !== 'Flexible' ? cleanString(item.dueDate) : undefined,
      completedAt: completed ? cleanString(item.completedAt, now) : undefined,
      status: completed ? 'completed' : 'open',
      tags: [], scope: cleanString(item.projectId) ? 'project' : 'personal',
      createdAt: cleanString(item.createdAt, now), updatedAt: cleanString(item.updatedAt, cleanString(item.createdAt, now)),
      schemaVersion: 1,
    };
    repository.save(task);
    seenIds.add(id);
    report.imported.tasks += 1;
  }

  if (report.skipped.invalid > 0) {
    report.warnings.push(
      'Some legacy records were invalid and were left untouched. Repair them and rerun migration; successfully imported records are protected from duplication.'
    );
  }

  // Do not permanently close a partial migration. On a later run, already imported
  // entities are recognized as duplicates while repaired records can still be imported.
  if (report.skipped.invalid === 0) {
    repository.markMigration(MIGRATION_ID);
  }
  return report;
}

/** Exported for future migration UI/diagnostics without exposing internal storage keys. */
export function getLegacyMigrationId(): string {
  return MIGRATION_ID;
}
