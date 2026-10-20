# Canonical workspace storage foundation

## Goal

Create one typed, stable data contract for Bob's core workspace entities without breaking the current UI or assuming that desktop SQLite is active.

## Current-state finding

The app currently persists important collections through several independent localStorage keys. Examples include `bob_notes_v1`, `bob_tasks_v2`, `bob_research_sessions_v3`, `bob_session_messages_v3`, `bob_phased_roadmaps_by_project_v1`, and `bob_research_knowledge_graph_v1`. The local database wrapper also persists a JSON object in localStorage under `bob_local_sqlite_db_v1`; it only attempts native database IPC if `window.bob.dbRun` / `window.bob.dbAll` exist. The current preload bridge should be verified before treating SQLite as the source of truth.

## Added in Step 1

- Canonical, versioned entity contracts for projects, phases, tasks, Markdown notes, diary entries, sources, attachments, links, and revisions.
- A repository interface with CRUD, filtered search, stable IDs, revision tracking, and backlinks derived from link records.
- A browser localStorage adapter with safe parse/write handling and snapshot isolation.
- A repeatable legacy importer for the three primary collections (projects, notes, tasks).
- Migration IDs are recorded to avoid repeated imports; legacy keys are never deleted or rewritten by this importer.
- File attachments are references/metadata only. Importing a file does not silently copy its contents to a cloud service.

## Deliberate non-goals for this commit

- Existing pages and AI tools are not yet redirected to the new repository.
- No migration is automatically run at startup.
- No SQLite switch is made until the Electron main/preload IPC path is verified.
- No file contents are uploaded or moved.
- No sync or cloud permissions are changed.

This boundary is intentional: importing data into a second store before consumers are switched and verified reduces risk to existing user data.

## Step 2 entry criteria

1. Add tests for repository CRUD, invalid-store recovery, query filters, backlinks, and idempotent migration.
2. Run a fixture migration against representative legacy project/note/task records and compare counts/content.
3. Verify the actual desktop persistence bridge in `apps/desktop/main.cjs` and `apps/desktop/preload.cjs`.
4. Adapt one consumer at a time (start with note CRUD), with compatibility reads and a rollback plan.
5. Only after browser and desktop tests pass, define the storage adapter contract for native files/SQLite and then route AI tools through repository methods.

## Data rules

- Markdown body is canonical for notes; old `selectedText` maps to `body`.
- Personal diary entries are distinct from project diary entries via explicit scope and optional `projectId`.
- Relationships are typed records, not embedded backlinks, so backlinks can be derived and repaired.
- File metadata and local references are separate from file bytes; local-only storage remains possible.
- Deleting an entity does not cascade-delete references automatically.


## Stage completion assessment (October 2026)

The canonical storage foundation stage is complete for the **reversible model-and-mirroring scope**. The repository has typed entities, CRUD/query/backlink behavior, repeatable non-destructive legacy import, legacy UI adapters, mirrored project/note/task changes with guarded deletion reconciliation, and project-scoped roadmap phase/task snapshots. The quality workflow verifies these paths, including persistence across repository instances.

### Verified persistence boundary

The canonical repository uses the renderer's `localStorage` key `bob_canonical_workspace_v1`. This is browser-profile storage and is also the active canonical adapter in the Electron-rendered UI. The Electron preload does **not** expose `bob.dbRun` or `bob.dbAll`, and the desktop main process's `bob-workspace.json` is a separate store; therefore canonical entities are **not** backed by that native JSON file or by SQLite. The existing `src/lib/db/database.ts` is a separate localStorage-backed compatibility database despite its historical key name. This was checked directly rather than assumed.

This boundary is intentional for this stage: switching to a native main-process database requires an asynchronous storage contract and migration/rollback tests, not a synchronous IPC shim. It remains a clearly documented follow-up before promising one native database across desktop and web.

### Stage exit checklist

- [x] Canonical entity contracts and repository CRUD/query/backlinks.
- [x] Non-destructive, idempotent legacy import with retry behavior for invalid source records.
- [x] Legacy-first compatibility reads, canonical fallback for missing/corrupt collections, and preservation of valid empty collections.
- [x] Project, note, task dual-write and tracked-deletion regression tests.
- [x] Project-scoped roadmap phase/task mirror with nested step preservation, execution completion/status synchronization, and stale generated-record cleanup.
- [x] Persistence/reload regression test using a new repository instance over the same storage.
- [x] CI run passed for the latest project-deletion coverage.
- [x] Native main-process file adapter, async renderer bridge, revision-conflict handling, and guarded browser-to-native migration tooling added with regression tests.\n- [ ] Full app runtime cutover to the async native repository and canonical-only reads/writes remains open until all synchronous consumers are converted and packaged desktop verification passes.\n- [ ] Native SQLite is not implemented; the current native adapter is file-backed JSON.


## Native adapter implementation (October 2026 follow-up)

The desktop main process now exposes a dedicated canonical-workspace file store at `bob-canonical-workspace.json`, separate from the older `bob-workspace.json`. The store is validated, writes are revision-checked, and writes use a temporary file followed by rename. A corrupt native store is surfaced as an error instead of being silently replaced with an empty store.

The renderer preload exposes asynchronous read/write IPC, and `src/lib/storage/asyncCanonicalRepository.ts` adds an asynchronous native adapter, browser adapter, a small async repository, and a guarded browser-to-native migration helper. The migration creates an exact localStorage backup, refuses to overwrite a non-empty native store, verifies copied entities, and never deletes the browser source. Automated tests cover revision conflicts, backup preservation, idempotency, and refusal to overwrite native data.

**Important runtime boundary:** existing screens still call the synchronous `CanonicalWorkspaceRepository` and continue to use localStorage. The new asynchronous adapter is not yet the active repository for all screens. It is unsafe to claim the native file is the single source of truth until the remaining synchronous consumers are converted and the desktop packaged app is tested end to end. This follow-up does not claim SQLite; the native adapter is file-backed JSON.
