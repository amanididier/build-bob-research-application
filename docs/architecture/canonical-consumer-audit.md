# Canonical workspace consumer audit

## Purpose

Move Bob toward a consistent workspace data model without making a risky one-shot storage replacement. The current UI remains compatible with the existing localStorage collections while canonical records are introduced and verified.

## Current consumer map

| Area | Current storage behavior | Migration status / risk |
| --- | --- | --- |
| `src/context/AppContext.tsx` notes and tasks | Legacy arrays are still written for UI compatibility; changes are mirrored into canonical note/task entities. Startup reads legacy arrays first and now uses the shared canonical fallback when a legacy collection is missing or unreadable. | First UI read-path adapter is in place. Writes remain dual-write; deletion reconciliation is still required before canonical data can become authoritative. |
| `src/lib/ai/workspaceTools.ts` | Reads legacy notes/tasks first, with canonical fallback; other workspace tools still have separate storage paths. | Partial migration; audit individual tools before redirecting writes. |
| `src/lib/aiEngine.ts` | Project AI context reads notes/tasks through the same shared legacy-first/canonical-fallback rule. Chat messages and personalization still use legacy keys. | Partial migration; leave chat-history and preferences paths unchanged for now. |
| `src/lib/roadmap/roadmapStorage.ts` | Reads/writes roadmap maps in legacy localStorage keys. | Separate data shape; do not map it to canonical phases until field mapping and UI expectations are tested. |
| `src/views/Research/TasksView.tsx` | Stores phased task ordering, completion, and star state in separate legacy maps. | These are UI state around tasks, not the same entity as task records. Preserve them until a deliberate phase/relationship design exists. |
| Desktop bridge / local DB wrapper | Canonical repository currently uses browser `localStorage`; desktop database IPC must be verified before calling SQLite authoritative. | Explicit follow-up; no database switch in this pass. |

## Safe migration sequence

1. Keep the existing note/task arrays as compatibility reads and writes while using a shared fallback helper. A valid legacy array, including an empty array, remains authoritative.
2. Add UI-focused tests for legacy precedence, missing/corrupt fallback, and preservation of intentionally empty collections.
3. Before switching note/task reads to canonical-only, implement and test deletion reconciliation so removed legacy records cannot be resurrected from canonical storage.
4. Migrate roadmap and phased-task state only after mapping their separate semantics to canonical project/phase/task entities.
5. Verify desktop main/preload persistence and define a storage adapter contract before choosing SQLite or file-backed persistence.
6. Remove legacy dual-writes only after browser, desktop, recovery, and rollback tests prove the canonical path is safe.

## Non-goals for this pass

- Do not replace the entire storage layer.
- Do not remove or rewrite legacy collections.
- Do not claim SQLite persistence is active.
- Do not migrate roadmap phases or task-view presentation state by guesswork.
