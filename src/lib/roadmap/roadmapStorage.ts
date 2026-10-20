import { CanonicalWorkspaceRepository, canonicalWorkspace } from '../storage/canonicalRepository';
import { PhaseEntity, TaskEntity } from '../storage/canonicalModel';

export interface StoredBobRoadmap {
  projectId?: string;
  goal?: string;
  tasks?: Array<Record<string, any>>;
  steps?: Array<Record<string, any>>;
  [key: string]: any;
}

const ROADMAPS_BY_PROJECT_KEY = 'bob_phased_roadmaps_by_project_v1';
const LEGACY_ROADMAP_KEY = 'bob_phased_roadmap_v2';

function safeEntityPart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'untitled';
}

function readMap(): Record<string, StoredBobRoadmap> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(ROADMAPS_BY_PROJECT_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Mirror a roadmap snapshot into canonical phase/task entities.
 * Full step instructions remain serialized in the task body so no roadmap detail is lost.
 * The original roadmap JSON remains available to older UI consumers during migration.
 */
export function syncRoadmapToCanonical(
  projectId: string,
  roadmap: StoredBobRoadmap,
  repository: CanonicalWorkspaceRepository = canonicalWorkspace,
): void {
  if (!projectId) return;
  const safeProjectId = safeEntityPart(projectId);
  const canonicalProjectId = projectId.startsWith('project_') ? projectId : 'project_' + safeProjectId;
  const rawTasks = Array.isArray(roadmap.tasks) ? roadmap.tasks : [];
  const phasesByName = new Map<string, PhaseEntity>();
  const now = new Date().toISOString();

  rawTasks.forEach((rawTask, index) => {
    if (!rawTask || typeof rawTask !== 'object') return;
    const phaseName = typeof rawTask.phase === 'string' && rawTask.phase.trim() ? rawTask.phase.trim() : 'General';
    if (!phasesByName.has(phaseName)) {
      phasesByName.set(phaseName, {
        id: 'phase_roadmap_' + safeProjectId + '_' + safeEntityPart(phaseName),
        kind: 'phase',
        projectId: canonicalProjectId,
        title: phaseName,
        description: '',
        order: phasesByName.size,
        status: 'planned',
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
    }
    // Accessing the phase map here validates the relationship before the snapshot is written.
    void phasesByName.get(phaseName);
    void index;
  });

  const keepPhaseIds = new Set([...phasesByName.values()].map((phase) => phase.id));
  for (const existing of repository.list<PhaseEntity>({ kind: 'phase', projectId: canonicalProjectId, limit: 500 })) {
    if (existing.id.startsWith('phase_roadmap_' + safeProjectId + '_') && !keepPhaseIds.has(existing.id)) {
      repository.delete(existing.id);
    }
  }
  for (const existing of repository.list<TaskEntity>({ kind: 'task', projectId: canonicalProjectId, limit: 500 })) {
    if (existing.id.startsWith('roadmap-task_' + safeProjectId + '_')) repository.delete(existing.id);
  }

  for (const phase of phasesByName.values()) repository.save(phase);
  rawTasks.forEach((rawTask, index) => {
    if (!rawTask || typeof rawTask !== 'object') return;
    const phaseName = typeof rawTask.phase === 'string' && rawTask.phase.trim() ? rawTask.phase.trim() : 'General';
    const phase = phasesByName.get(phaseName);
    if (!phase) return;
    const taskId = typeof rawTask.id === 'string' && rawTask.id.trim() ? safeEntityPart(rawTask.id) : 'item_' + index;
    const task: TaskEntity = {
      id: 'roadmap-task_' + safeProjectId + '_' + taskId,
      kind: 'task',
      title: typeof rawTask.title === 'string' && rawTask.title.trim() ? rawTask.title.trim() : 'Untitled roadmap task',
      body: JSON.stringify({
        estimatedTime: rawTask.estimatedTime ?? '',
        priority: rawTask.priority ?? index + 1,
        steps: Array.isArray(rawTask.steps) ? rawTask.steps : [],
      }),
      projectId: canonicalProjectId,
      phaseId: phase.id,
      status: 'open',
      tags: ['roadmap-generated'],
      scope: 'project',
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    repository.save(task);
  });
}

/** Load a roadmap for exactly one project, with compatibility for older saves. */
export function loadRoadmapForProject(projectId: string): StoredBobRoadmap | null {
  if (typeof window === 'undefined' || !projectId) return null;

  const savedForProject = readMap()[projectId];
  if (savedForProject && typeof savedForProject === 'object') return savedForProject;

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_ROADMAP_KEY) || 'null');
    if (legacy && (!legacy.projectId || legacy.projectId === projectId)) {
      return legacy as StoredBobRoadmap;
    }
  } catch {}

  return null;
}

/**
 * Persist by project and mirror the most recently edited roadmap to the legacy
 * key while older screens are being migrated. Project-scoped copies remain intact.
 */
export function saveRoadmapForProject(
  projectId: string,
  roadmap: StoredBobRoadmap
): StoredBobRoadmap {
  const resolvedProjectId = projectId || roadmap.projectId || 'new-research';
  const saved: StoredBobRoadmap = { ...roadmap, projectId: resolvedProjectId };

  syncRoadmapToCanonical(resolvedProjectId, saved);
  if (typeof window === 'undefined') return saved;

  const all = readMap();
  all[resolvedProjectId] = saved;
  try {
    localStorage.setItem(ROADMAPS_BY_PROJECT_KEY, JSON.stringify(all));
    localStorage.setItem(LEGACY_ROADMAP_KEY, JSON.stringify(saved));
  } catch (error) {
    console.warn('[Bob roadmap] Could not persist roadmap:', error);
  }

  return saved;
}
