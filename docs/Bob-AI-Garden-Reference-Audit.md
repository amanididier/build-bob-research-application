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
