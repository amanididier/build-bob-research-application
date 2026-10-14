# Changelog

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
- Desktop/web app: 1.0.70
- Chrome extension: 1.3.0
- Release automation runs TypeScript validation, web build, extension syntax checks, version checks, and artifact packaging before publishing.

Note: PDF/DOCX roadmap attachments are selectable but automatic text extraction is not enabled in this build. Plain-text formats (TXT, MD, CSV, JSON) can be read into the roadmap context. Browser-level end-to-end QA is still recommended after installation.
