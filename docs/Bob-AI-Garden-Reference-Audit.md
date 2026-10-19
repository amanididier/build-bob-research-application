# Bob AI Garden Reference Archive Audit

**Date:** 2026-10-19  
**Scope:** Read-only audit of `public/bob-s-ai-garden-main (1).zip` and its Dashboard, Summary, Tasks, workspace shell, workspace state, route and stylesheet files.  
**Decision:** Use the archive as a visual/interaction reference only. Do not merge its seeded workspace provider or sample content into Bob's production data layer.

## Executive summary

The archive provides useful page and interaction patterns, but its data model is a standalone demo. It contains seeded project/task records, fixed dates, fabricated dashboard activity, and project-specific summary copy. Bob should adapt the UI patterns while retaining Bob's existing storage, project scoping, AI tools, and research-memory architecture.

## Inspected reference files

- `src/components/workspace/dashboard.tsx`
- `src/components/workspace/summary.tsx`
- `src/components/workspace/tasks.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/components/workspace/workspace-state.tsx`
- `src/routes/index.tsx`
- `src/routes/summary.tsx`
- `src/routes/tasks.tsx`
- `src/routes/__root.tsx`
- `src/styles.css`
- Package metadata and UI component inventory

The archive contains Dashboard, Summary and Tasks routes, a shared workspace shell, project selector, search overlay, collapsible sidebar, theme toggle, task filters and sorting, list/roadmap views, editable goal modal, summary export, and reusable shadcn-style UI components.

## Findings and risks

### 1. Seeded data is not production data

The reference provider initializes four projects (Urugendo, Stoke-Yange, Common App essay and Bob validation) and eight example tasks in constants. Project counts, source totals, task totals, statuses and task dates are example values. These must not appear as a real user's workspace.

### 2. Most of the reference state is in-memory only

The provider uses React state for task completion, task creation, active project, goal and theme. The inspected provider does not load or save these values to durable storage. Changes can disappear on reload and cannot serve as Bob's source of truth.

### 3. Dashboard has hardcoded metrics and activity

The greeting names Amani directly; active-project metrics and month-over-month change are hardcoded; the “Top project” snapshot has static copy and metrics; the consistency streak and calendar activity are generated from fixed rules rather than actual events. The displayed date is fixed in the shell.

### 4. Date handling is fixed to October 2026

Task defaults and “today/tomorrow” grouping use fixed ISO date strings. This will mislabel tasks over time and may mishandle local time zones. Bob must derive day boundaries from the user's current local date and explicitly distinguish overdue, due today, upcoming, completed and undated tasks.

### 5. Summary content is not grounded in research

The Summary component contains hardcoded project-specific and generic findings, source labels, open questions, a fixed “updated” date and a fixed reading time. Choosing a project ID changes copy, but does not retrieve evidence. In Bob, summaries must use saved project context and source-backed research, identify when evidence is missing, and preserve citations/URLs.

### 6. Some derived values can become invalid

Completion percentages divide by task/project totals without consistently guarding against zero. Project-level done/total/source counts can drift from task and source records if they are stored independently. Bob should derive counts from authoritative records where possible and guard empty states.

### 7. Reference project selection and navigation are coupled to demo routes

Project links route to Summary and set an in-memory active project. This is a useful interaction pattern, but Bob's active project identity must be shared across chat, research, tasks, notes and roadmap. Switching projects must not leak context or data from another project.

## Recommended adaptation map

| Reference component | Keep/adapt | Bob's data requirement |
|---|---|---|
| Workspace shell | Sidebar, page header, active navigation, responsive/collapsed navigation | Real active page, persisted theme preference, actual profile and navigation destinations |
| Dashboard | Overview cards, recent project list, focus/goal area, recent activity layout | Derive project/task/source counts from persisted records; use real activity; no seeded streaks or metrics |
| Summary | Working-brief layout, outline navigation, export interaction, next-move section | Generate from active project's saved evidence; source-backed claims; real updated timestamp; genuine next tasks |
| Tasks | Search, status filters, project filter, sorting, list/roadmap views, completion affordance | Persist task mutations; project scope; timezone-safe date groups; real priorities, deadlines and empty states |
| Project selector | Compact project switcher | Shared project ID and consistent context across all pages |
| Workspace state provider | General idea of shared state | Do not reuse as a replacement data layer; connect to Bob's existing state/storage/services |
| CSS and UI primitives | Spacing, hierarchy, tokens, component patterns, responsive behaviors | Adapt to Bob's visual system and test light/dark contrast and side-panel constraints |

## Existing Bob integration points confirmed separately

- `src/lib/ai/workspaceTools.ts` contains six read tools: `get_project_overview`, `list_tasks`, `search_notes`, `search_research_memory`, `get_roadmap`, and `list_selected_tabs`.
- It also contains three explicit write tools: `create_note`, `add_task`, and `complete_task`.
- `src/lib/roadmap/roadmapStorage.ts` stores roadmaps keyed by project ID and retains a legacy-key compatibility path.
- `scripts/test-workspace-tools.ts` exercises tool intent gating and project-scoped workspace behavior.

These are existing integration points, not a claim that every UI is already connected or every runtime path has been manually verified.

## Validation evidence

The GitHub Actions run associated with the temporary audit branch completed successfully. Its validation job reports success for:
- Test workspace tool behavior
- TypeScript validation
- Web app build and extension packaging
- Extension JavaScript syntax
- Release-version checks

These checks confirm the workflow run passed; they do not prove all UI interactions or data correctness.

## Non-goals for this audit

- Do not copy seeded projects, tasks, hardcoded metrics, fixed dates or static research findings into production.
- Do not replace Bob's existing persistence with the reference's in-memory provider.
- Do not redesign unrelated Bob pages during the audit.
- Do not claim runtime integration is complete without implementation and tests.

## Next implementation tasks

1. Trace each current Bob page/component to its actual state, persistence keys, project ID source, events and AI service calls.
2. Create a page-to-data-source matrix for Bob's real implementation and flag duplicate or disconnected sources of truth.
3. Fix synchronization/persistence gaps in the shared data layer before adapting page UI.
4. Adapt one end-to-end workflow first: open project → ask Bob to research → save evidence/note → create task → verify the right pages update and survive reload.
5. Run relevant tests, typecheck and production build; report exact files changed and remaining issues.


## Bob production architecture trace (Task 2)

**Scope note:** These findings are from tracing the current `main` branch's AppContext, AI engine/workspace tools, research-memory service, roadmap storage, task view, and Supabase client setup. They describe the inspected paths, not a claim that every file in the repository has been exhaustively reviewed.

### Source-of-truth map

| Data domain | Current observed source/persistence | Consumers and sync behavior | Risk / implication |
|---|---|---|---|
| Projects | `bob_research_sessions_v3` in browser localStorage; React `projects` state in `src/context/AppContext.tsx` | AI workspace context/tools read the key; desktop bridge syncs project summaries and can import new extension projects | React state and direct localStorage writes coexist; project source/task counts can be stale unless updated from underlying records |
| Active project | `bob_active_research_id` plus React `activeResearchId` | Used by chat, workspace tools, roadmap, tasks and extension bridge | Must stay consistent across pages and bridge messages; fallback IDs need careful handling when a project is deleted |
| Chat history | `bob_session_messages_v3`, keyed by project ID | AppContext chat, AI prompt context, desktop/extension bridge | Local browser storage is durable only in that browser profile; bridge merge deduplicates by ID or role/text, which may conflate identical repeated messages |
| Tasks | `bob_tasks_v2` plus React `tasks` state | AppContext persists state; AI context/tools read/write the same key; task UI renders project tasks | The workspace tool writes storage then emits an event for React state; this is an integration seam to regression-test. Tasks are not shown as part of the inspected desktop bridge sync contract |
| Notes | `bob_notes_v1` plus React `notes` state | Notebook UI, AI context/tools, extension note import; note changes are mirrored into `bob_local_research_memory_v1` | The same note is represented in the note list and retrieval memory; upsert tags reduce stale duplicates, but note and memory storage are still separate records |
| Local research memory | `bob_local_research_memory_v1` managed by `LocalResearchMemoryBank` | AI retrieval, workspace tool search and memory stats | Local-only keyword-weighted retrieval; it is not a cloud research database or verified external evidence store |
| Selected tabs | `bob_tabs_catalog_v2`; bridge also stores `bob_desktop_tabs` | AI context, workspace tools, Tabs view and bridge events | Two tab-related keys exist; confirm which is canonical for each path before changing tab behavior |
| Roadmap | `bob_phased_roadmaps_by_project_v1` with legacy mirror `bob_phased_roadmap_v2`; execution completion/stars use additional project-keyed maps | Roadmap UI, task execution view and AI workspace tools | Roadmap milestones and general task records are distinct structures; matching by title is used in at least one completion path and can be fragile |
| Auth | Supabase clients exist in `src/lib/supabaseClient.ts` and `lib/supabase-browser.ts`, with persisted auth sessions | Sign-in/session paths | In the inspected app data paths, project/task/note/chat/roadmap records are still read and written to localStorage; the presence of Supabase auth does not mean workspace data is synced to Supabase |

### Confirmed integration behavior

1. `src/context/AppContext.tsx` is the central React state provider for projects, per-project chat messages, tasks and notes. It persists these to localStorage and syncs some content through the desktop/Chrome bridge.
2. `src/lib/aiEngine.ts` assembles a bounded project-specific prompt snapshot directly from localStorage keys and the project roadmap. It also imports the function-calling tools. The AI context is therefore coupled to those key names and record shapes.
3. `src/lib/ai/workspaceTools.ts` reads/writes the same task and note keys directly. Writes dispatch `bob:workspace-tool-action`; AppContext mirrors tool mutations into React state, and TasksView separately handles roadmap completion events. The existing tests cover intent gating, project isolation, task/note writes and completion ambiguity.
4. `src/lib/researchMemory.ts` persists a local memory cache and filters legacy known demo memories. AppContext upserts notebook notes into this memory so they can be retrieved later.
5. `src/lib/roadmap/roadmapStorage.ts` keeps project-specific roadmaps but mirrors the latest roadmap into a legacy single-roadmap key for older consumers.
6. `src/lib/research/researchOrchestrator.ts` extracts finding-like lines from Bob's generated answer and creates graph/evidence records with fixed confidence/importance values. This extraction is not itself external source verification; UI must not present those values as independently verified evidence without stronger provenance.
7. The desktop bridge path can sync projects, notes, messages and tab state through preload APIs or local HTTP polling. In the inspected sync flow, tasks and roadmaps are not included in the same explicit cross-surface synchronization path.

### Priority gaps before adapting the reference UI

- **No single data service boundary:** React UI, AI tools and AI context each read/write localStorage directly. This makes schema drift and partial updates easier.
- **Cross-surface coverage is uneven:** projects/chat/notes/tabs have bridge behavior, but tasks/roadmaps do not share an equivalent documented bridge contract in the inspected paths.
- **Persistence is device/profile-local for workspace records:** Supabase auth exists, but the traced workspace records are not shown syncing to database tables. Data will not automatically follow a user to another browser/device.
- **Evidence provenance needs a clear boundary:** extracted AI response bullets are useful candidate findings, not automatically verified evidence. Preserve source URLs and separate sourced evidence from generated synthesis.
- **Roadmap/task synchronization is multi-ledger:** roadmap tasks, general tasks, completion IDs and star counts are stored separately. Any UI adaptation must avoid silently duplicating tasks or reporting mismatched completion totals.

## Updated implementation sequence

1. **Architecture trace — completed for the core data paths listed above.** Remaining work is to check any page-specific data consumers before modifying shared contracts.
2. Define a minimal shared workspace data boundary around existing storage keys first; avoid a broad migration or destructive key rename.
3. Close the highest-value synchronization gaps for the selected end-to-end workflow, keeping project IDs stable and preserving existing saved data.
4. Implement and verify one end-to-end flow: active project → grounded research response/source → saved note/evidence → task creation → dashboard/task/note refresh → reload persistence.
5. Only then adapt the reference Dashboard/Summary/Tasks patterns to Bob's real records.
6. Run workspace regression tests, TypeScript validation, web build and extension packaging; report actual results and any unverified runtime cases.
