# Bob Intelligent Roadmap — implementation checkpoint

## Product direction
Bob's everyday Chat should remain a short, natural conversation. Roadmap creation is a dedicated full-screen experience that temporarily replaces the chat canvas, rather than a large modal or popup. The user can return to the same conversation without losing messages.

## Reference
Use the supplied `resumax-reference.pdf` for onboarding rhythm and reusable page patterns: restrained progress, one focused question per screen, clear hierarchy, consistent footer controls, choice rows/chips/fields, and a reveal. Do not copy Resumax branding. Keep Bob's sunflower-yellow and teal identity.

## Required behavior
- Empty Chat offers a compact **Create roadmap** action.
- When a user explicitly says they are ready to plan, show the action immediately; otherwise suggest it only after useful context and avoid repetitive nudges.
- Gemini uses Bob's existing BYOK integration. It returns one validated page description at a time, never React/HTML/CSS or executable code.
- The renderer supports an allow-listed set of page layouts: fact card, option rows, segmented choice, multi-select chips, slider, text input, optional file upload, timeline estimate, editable step list, and confirmation rows.
- Skip already-known facts; ask only the highest-value missing question. Usually clarify goal, audience, deadline/time budget, tools/skills, constraints/materials, then reveal a realistic plan.
- Roadmap state and answers persist per project. Back returns to the same chat context.
- Sticker art is decorative, from a fixed local registry; it must never be generated as a model-supplied path.
- Preserve existing chat, research, tasks, Gemini key settings, desktop, and Chrome extension behavior.

## Safety and release
Inspect the actual code before changing architecture. Validate all model output against a runtime schema and fall back safely on invalid JSON. Never log API keys. Run `npm run lint`, `npm run build`, and `npm run pack:extension` where the environment permits. Work on `feat/intelligent-roadmap-experience`; make small commits. Do not tag/release until checks pass and the app/extension are verified.

## Progress tracking
- [x] Roadmap product and implementation plan documented.
- [ ] Add compact Chat starter action and connect it to the existing roadmap event.
- [ ] Replace modal/sheet takeover with a full-canvas roadmap experience while preserving Chat state.
- [ ] Add validated dynamic page contract and one-page-at-a-time Gemini generation.
- [ ] Improve context-aware suggestions and skip known answers.
- [ ] Add fixtures, tests, build verification, and release notes.
