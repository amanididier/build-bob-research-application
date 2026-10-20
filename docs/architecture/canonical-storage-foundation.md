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
