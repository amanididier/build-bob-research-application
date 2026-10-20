# Canonical workspace consumer audit

## Purpose

Move Bob toward a consistent workspace data model without making a risky one-shot storage replacement. The current UI remains compatible with the existing localStorage collections while canonical records are introduced and verified.

## Current consumer map

| Area | Current storage behavior | Migration status / risk |
| --- | --- | --- |
| `src/context/AppContext.tsx` projects, notes, and tasks | Legacy arrays remain for UI and desktop compatibility; current project/note/task changes are mirrored into canonical entities. Startup prefers valid legacy arrays and falls back to canonical adapters when collections are missing or unreadable. | Dual-write and guarded deletion reconciliation are in place. Canonical-only reads are not enabled yet; valid empty legacy arrays remain authoritative. |
| `src/lib/ai/workspaceTools.ts` | Reads legacy notes/tasks first, with canonical fallback; other workspace tools still have separate storage paths. | Partial migration; audit individual tools before redirecting writes. |
| `src/lib/aiEngine.ts` | Project AI context reads notes/tasks through the same shared legacy-first/canonical-fallback rule. Chat messages and personalization still use legacy keys. | Partial migration; leave chat-history and preferences paths unchanged for now. |
| `src/lib/roadmap/roadmapStorage.ts` | Retains project-scoped and legacy roadmap JSON for existing screens, and mirrors roadmap phase/task snapshots into canonical entities. Roadmap-generated canonical tasks carry a dedicated tag and are excluded from the ordinary task fallback. | Initial reversible mapping and regression tests are in place. Roadmap completion/star presentation state remains in its existing keys and still needs a separate lifecycle design. |
| `src/views/Research/TasksView.tsx` | Stores phased task ordering, completion, and star state in separate legacy maps. | These are UI state around tasks, not the same entity as task records. Preserve them until a deliberate phase/relationship design exists. |
| Desktop bridge / local DB wrapper | Canonical repository currently uses browser `localStorage`; desktop database IPC must be verified before calling SQLite authoritative. | Explicit follow-up; no database switch in this pass. |

## Safe migration sequence

1. Keep the existing note/task arrays as compatibility reads and writes while using a shared fallback helper. A valid legacy array, including an empty array, remains authoritative.
2. Add UI-focused tests for legacy precedence, missing/corrupt fallback, and preservation of intentionally empty collections.
3. Mirror project changes and reconcile tracked project deletions, while retaining the legacy project array for compatibility.
4. Mirror roadmap tasks and named phases into canonical phase/task entities; preserve full roadmap JSON and execution-view presentation state in the legacy format until separately migrated.
5. Verify desktop main/preload persistence and define a storage adapter contract before choosing SQLite or file-backed persistence.
6. Remove legacy dual-writes only after browser, desktop, recovery, and rollback tests prove the canonical path is safe.

## Non-goals for this pass

- Do not replace the entire storage layer.
- Do not remove or rewrite legacy collections.
- Do not claim SQLite persistence is active.
- Do not migrate roadmap phases or task-view presentation state by guesswork.
