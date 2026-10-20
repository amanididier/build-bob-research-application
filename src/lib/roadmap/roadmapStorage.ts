export interface StoredBobRoadmap {
  projectId?: string;
  goal?: string;
  tasks?: Array<Record<string, any>>;
  steps?: Array<Record<string, any>>;
  [key: string]: any;
}

const ROADMAPS_BY_PROJECT_KEY = 'bob_phased_roadmaps_by_project_v1';
const LEGACY_ROADMAP_KEY = 'bob_phased_roadmap_v2';

function readMap(): Record<string, StoredBobRoadmap> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(ROADMAPS_BY_PROJECT_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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
