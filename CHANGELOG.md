# Changelog

## Bob v1.0.74 — 2026-10-15

### Adaptive companion workflow
- Carry recent research conversation context into optional focus-plan discovery; never force a roadmap on every session.
- Ask three goal-specific multiple-choice questions by default, use answers to shape the next question, and ask up to two more only when Gemini judges that an important unknown remains.
- Let Gemini choose between card, pill, and timeline choice layouts; use saved profile preferences and explicitly shared interests when they are relevant.
- Apply saved profile tone and evidence/action preferences to research answers.
- Replace stale update messaging with the installed version, real latest-release check, honest error states, and a visible checking/downloading progress bar.
- Persist profile identity and personalization controls; make Profile accessible directly inside Settings.


## Bob v1.0.73 — 2026-10-15

### Experience fixes
- Extend the sunflower garden backdrop across the homepage, with centered greeting/composer, legible suggestion cards, and a visible navigation toggle while the sidebar starts closed.
- Restore the dashboard as a separate white workspace with distinct recent, focus, and discovery cards that adapt to dark mode.
- Keep casual chat focused on the user, remember explicitly shared preference statements locally, and avoid scripted fallback answers when Gemini is unavailable.
- Keep Bob's replies visually concise and preserve the two adaptive multiple-choice roadmap questions before goal-specific milestone synthesis.


## Bob v1.0.72 — 2026-10-15

### Navigation and daily start
- Restored the dashboard as a real route, separate from the homepage.
- First launch of each local calendar day opens the sunflower homepage; later launches that day open the dashboard.
- Removed the blocking daily greeting overlay so the homepage itself is the daily welcome.
- Homepage now has a focused sunflower hero, centered composer and suggestion cards, with the sidebar/top bar hidden on first daily launch.
- Dashboard retains a separate compact garden banner and colorful, dark-mode-aware workspace cards; its permanent Project Roadmap button is removed.
- Homepage prompts now start a research conversation instead of opening a roadmap immediately.

### Adaptive roadmaps and tasks
- Gemini can return 3–12 goal-specific milestones based on project complexity instead of a fixed five-step plan.
- Roadmap tasks are marked as AI-generated with phase/source metadata and tied to the active project.
- Saved roadmap data includes its project ID.
- Roadmap discovery now uses two Gemini-generated multiple-choice follow-up pages based on prior answers, with optional goal starter cards and goal-specific fallback plans.
- The first generated milestone is due Today so it can surface in the dashboard's Today's Focus card.

### Chat polish
- Updated casual chat to a clean white/blue/yellow visual language with dark-mode support.
- Removed unsolicited project/task reminders and made the conversation prompt more broadly useful and user-focused.
- Gemini now receives recent chat history; blue Instagram-inspired message bubbles and lifestyle-focused follow-ups replace the old flat dotted chat treatment.
- Search results are built from live workspace projects and tasks rather than static placeholder entries.

## Bob v1.0.71 — 2026-10-15

### Roadmap refinement & dynamic multi-input flow
- Integrated full-page interactive roadmap workspace with Bob Builder illustration, star accents, and customizable sample journeys.
- Dynamic question sequencing: each user response shapes subsequent options, tooling pills, starting stage cards, and weekly rhythm selector.
- Added interactive milestone arrangement: reorder steps up/down, toggle active milestones, edit titles inline, add custom milestones, or re-synthesize with Gemini AI.
- Finished roadmap automatically populates the user's active Tasks board with proper phase tags, dates, and source metadata.
- Added live Active Roadmap banner at the top of the Tasks page with real-time milestone sync.

### WhatsApp-style edge-to-edge Chat Lounge
- Full-page WhatsApp-style interface with dotted background pattern and streamlined single-header design.
- Chat operates casually as a supportive companion rather than research dumps; smoothly transitions to the full-page roadmap upon request and seamlessly returns upon completion.
- Chat conversations saved securely to local device storage.

## Bob v1.0.70 — 2026-10-14

### Research and roadmap
- Added a research-first start page with a centered composer and four suggested starting points.
- Separated the dashboard into its own page and added project-scoped focus selection.
- Added adaptive, one-page-at-a-time roadmap generation using the configured Gemini API key, validated page data, varied page layouts, and a safe fallback plan.
- Roadmap steps are saved to the current project's Tasks with roadmap source metadata.
- Roadmap suggestions are now based on project-conversation readiness.

### Workspace polish
- Redesigned project notes as colorful editable cards with source and date details.
- Simplified casual chat and clarified that casual chat history is saved on this device.
- Kept casual chat separate from unsolicited research/project reminders.
- Added optional local Bob companion animation loop support with static fallbacks.
- Added asset-library folders for roadmap artwork and companion loops.

### Chrome extension
- Added missing manual selection-highlighting handling.
- Added a retry path for pages where the content script has not loaded yet.
- Added clearer error notifications when highlighting is blocked or cannot be saved.

### Versions and verification
- Desktop/web app: 1.0.71
- Chrome extension: 1.3.0
- Release automation runs TypeScript validation, web build, extension syntax checks, version checks, and artifact packaging before publishing.
