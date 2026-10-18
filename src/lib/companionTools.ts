/**
 * Explicit, bounded tools Bob may call to inspect and update the user's workspace.
 * These functions use the same localStorage records as the existing UI and emit
 * events so React views can refresh. No arbitrary code, URLs, or storage keys are accepted.
 */
type JsonRecord = Record<string, unknown>;

const TASKS_KEY = 'bob_tasks_v2';
const NOTES_KEY = 'bob_notes_v1';
const PROJECTS_KEY = 'bob_research_sessions_v3';
const ROADMAP_KEY = 'bob_phased_roadmap_v2';

function readArray(key: string): JsonRecord[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((item): item is JsonRecord => !!item && typeof item === 'object' && !Array.isArray(item)) : [];
  } catch {
    return [];
  }
}

function readObject(key: string): JsonRecord | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
  } catch {
    return null;
  }
}

function cleanString(value: unknown, max = 240): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function activeProjectId(args: JsonRecord): string {
  const requested = cleanString(args.projectId, 100);
  const active = cleanString(localStorage.getItem('bob_focus_project_id'), 100);
  const fallback = cleanString(localStorage.getItem('bob_active_research_id'), 100) || 'urugendo';
  const projects = readArray(PROJECTS_KEY);
  const candidate = requested || active || fallback;
  return projects.some((p) => p.id === candidate) ? candidate : (projects[0] ? cleanString(projects[0].id, 100) : 'urugendo');
}

function emitWorkspaceUpdated(kind: string): void {
  try {
    window.dispatchEvent(new CustomEvent('bob:workspace-updated', { detail: { kind, at: Date.now() } }));
  } catch {}
}

export const COMPANION_TOOL_DECLARATIONS = [
  {
    name: 'get_workspace_overview',
    description: 'Read the current project and a compact overview of its tasks, saved notes, and roadmap.',
    parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING', description: 'Optional project ID. Omit to use the current project.' } } },
  },
  {
    name: 'list_tasks',
    description: 'List tasks for a project. Use this before creating tasks if you need to avoid duplicates.',
    parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' }, includeCompleted: { type: 'BOOLEAN' } } },
  },
  {
    name: 'create_task',
    description: 'Create and save a real task in Bob for the selected project. Use only when the user asks to add or create a task.',
    parameters: { type: 'OBJECT', required: ['title'], properties: { title: { type: 'STRING', description: 'Short actionable task title.' }, dueDate: { type: 'STRING', description: 'Due date or timing as the user expressed it, such as Tomorrow or 2026-10-20.' }, projectId: { type: 'STRING' } } },
  },
  {
    name: 'complete_task',
    description: 'Mark one existing task completed by its exact task ID. List tasks first if the ID is unknown.',
    parameters: { type: 'OBJECT', required: ['taskId'], properties: { taskId: { type: 'STRING' }, projectId: { type: 'STRING' } } },
  },
  {
    name: 'search_saved_notes',
    description: 'Search saved Bob notes for a phrase or topic within the current project and general notes.',
    parameters: { type: 'OBJECT', required: ['query'], properties: { query: { type: 'STRING' }, projectId: { type: 'STRING' } } },
  },
  {
    name: 'save_note',
    description: 'Save a durable note to the Bob Notes workspace for the current project.',
    parameters: { type: 'OBJECT', required: ['title', 'content'], properties: { title: { type: 'STRING' }, content: { type: 'STRING', description: 'The exact concise information the user asked Bob to remember.' }, projectId: { type: 'STRING' }, sourceTitle: { type: 'STRING' } } },
  },
  {
    name: 'open_roadmap_builder',
    description: 'Open Bob’s interactive roadmap builder with the given goal and project context. This opens the planner; it does not claim the roadmap is saved until the user finishes it.',
    parameters: { type: 'OBJECT', required: ['goal'], properties: { goal: { type: 'STRING' }, context: { type: 'STRING' }, projectId: { type: 'STRING' } } },
  },
] as const;

export async function executeCompanionTool(name: string, rawArgs: unknown): Promise<JsonRecord> {
  if (typeof window === 'undefined') return { ok: false, error: 'Workspace tools require the Bob app window.' };
  const args: JsonRecord = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs) ? rawArgs as JsonRecord : {};

  switch (name) {
    case 'get_workspace_overview': {
      const projectId = activeProjectId(args);
      const project = readArray(PROJECTS_KEY).find((p) => p.id === projectId) || null;
      const tasks = readArray(TASKS_KEY).filter((t) => t.projectId === projectId);
      const notes = readArray(NOTES_KEY).filter((n) => n.projectId === projectId || n.projectId === 'general');
      const roadmap = readObject(ROADMAP_KEY);
      return {
        ok: true,
        project: project ? { id: project.id, title: project.title, summary: project.summary, status: project.status } : { id: projectId, title: 'Current project' },
        tasks: tasks.slice(0, 12).map((t) => ({ id: t.id, title: t.title, completed: t.completed === true, dueDate: t.dueDate })),
        notes: notes.slice(0, 8).map((n) => ({ id: n.id, title: n.title, content: cleanString(n.selectedText || n.content, 300) })),
        roadmap: roadmap && (!roadmap.projectId || roadmap.projectId === projectId) ? { goal: roadmap.goal, milestones: Array.isArray(roadmap.tasks) ? (roadmap.tasks as JsonRecord[]).slice(0, 10).map((t) => t.title) : [] } : null,
      };
    }
    case 'list_tasks': {
      const projectId = activeProjectId(args);
      const includeCompleted = args.includeCompleted === true;
      const tasks = readArray(TASKS_KEY).filter((t) => t.projectId === projectId && (includeCompleted || t.completed !== true));
      return { ok: true, projectId, tasks: tasks.slice(0, 40).map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, completed: t.completed === true })) };
    }
    case 'create_task': {
      const title = cleanString(args.title, 180);
      if (!title) return { ok: false, error: 'A non-empty task title is required.' };
      const projectId = activeProjectId(args);
      const tasks = readArray(TASKS_KEY);
      const duplicate = tasks.find((t) => t.projectId === projectId && t.completed !== true && cleanString(t.title, 180).toLowerCase() === title.toLowerCase());
      if (duplicate) return { ok: true, alreadyExists: true, task: { id: duplicate.id, title: duplicate.title, dueDate: duplicate.dueDate }, message: 'An open task with this title already exists; no duplicate was created.' };
      const task = {
        id: 'bob-tool-task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        title,
        dueDate: cleanString(args.dueDate, 80) || 'No due date',
        sourceConnection: 'Created by Bob companion',
        completed: false,
        projectId,
        isAiGenerated: true,
      };
      localStorage.setItem(TASKS_KEY, JSON.stringify([task, ...tasks]));
      emitWorkspaceUpdated('tasks');
      return { ok: true, task };
    }
    case 'complete_task': {
      const taskId = cleanString(args.taskId, 120);
      if (!taskId) return { ok: false, error: 'A task ID is required.' };
      const projectId = activeProjectId(args);
      const tasks = readArray(TASKS_KEY);
      const target = tasks.find((t) => t.id === taskId && t.projectId === projectId);
      if (!target) return { ok: false, error: 'That task was not found in the selected project. List tasks to get the correct task ID.' };
      if (target.completed === true) return { ok: true, alreadyCompleted: true, task: { id: target.id, title: target.title } };
      const updated = tasks.map((t) => t.id === taskId && t.projectId === projectId ? { ...t, completed: true } : t);
      localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
      emitWorkspaceUpdated('tasks');
      return { ok: true, task: { id: target.id, title: target.title, completed: true } };
    }
    case 'search_saved_notes': {
      const query = cleanString(args.query, 160).toLowerCase();
      if (!query) return { ok: false, error: 'A search query is required.' };
      const projectId = activeProjectId(args);
      const notes = readArray(NOTES_KEY).filter((n) => n.projectId === projectId || n.projectId === 'general');
      const matches = notes.filter((n) => [n.title, n.selectedText, n.content, n.sourceTitle].some((v) => cleanString(v, 2000).toLowerCase().includes(query)));
      return { ok: true, projectId, matches: matches.slice(0, 10).map((n) => ({ id: n.id, title: n.title, content: cleanString(n.selectedText || n.content, 700), sourceTitle: n.sourceTitle, sourceUrl: n.sourceUrl })) };
    }
    case 'save_note': {
      const title = cleanString(args.title, 160);
      const content = cleanString(args.content, 3000);
      if (!title || !content) return { ok: false, error: 'Both a note title and note content are required.' };
      const projectId = activeProjectId(args);
      const notes = readArray(NOTES_KEY);
      const duplicate = notes.find((n) => n.projectId === projectId && cleanString(n.title, 160).toLowerCase() === title.toLowerCase() && cleanString(n.selectedText || n.content, 3000) === content);
      if (duplicate) return { ok: true, alreadyExists: true, note: { id: duplicate.id, title: duplicate.title } };
      const note = {
        id: 'bob-tool-note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        title,
        selectedText: content,
        sourceTitle: cleanString(args.sourceTitle, 160) || 'Bob companion',
        sourceUrl: '',
        projectId,
        relevance: 90,
        color: 'yellow',
        createdAt: new Date().toLocaleString(),
      };
      localStorage.setItem(NOTES_KEY, JSON.stringify([note, ...notes]));
      emitWorkspaceUpdated('notes');
      return { ok: true, note: { id: note.id, title: note.title, projectId } };
    }
    case 'open_roadmap_builder': {
      const goal = cleanString(args.goal, 240);
      if (!goal) return { ok: false, error: 'A roadmap goal is required.' };
      const projectId = activeProjectId(args);
      const project = readArray(PROJECTS_KEY).find((p) => p.id === projectId);
      const context = [
        'Project ID: ' + projectId,
        'Project: ' + cleanString(project?.title, 160),
        cleanString(args.context, 1200),
      ].filter(Boolean).join('\n');
      const currentPage = cleanString(localStorage.getItem('bob_current_page'), 40);
      const origin = currentPage === 'research' ? 'research-tasks' : currentPage === 'chat' ? 'chat' : 'desktop';
      window.dispatchEvent(new CustomEvent('bob-open-roadmap', {
        detail: { title: goal, context, origin, projectId },
      }));
      return { ok: true, opened: true, goal, message: 'The interactive roadmap builder has been opened. Do not claim the roadmap is saved until the user completes it.' };
    }
    default:
      return { ok: false, error: 'Unknown or unavailable Bob tool: ' + cleanString(name, 80) };
  }
}
