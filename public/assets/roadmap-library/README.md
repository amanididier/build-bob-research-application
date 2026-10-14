# Bob Roadmap Asset Library

Place approved local assets for roadmap pages here. Keep the interface renderer allow-listed: Gemini may select a registered asset key, never an arbitrary file path or remote URL.

Suggested organization:
- `tools/` — recognizable product/tool logos (ChatGPT, Claude, Gemini, GitHub, VS Code, Notion, Google Docs/Sheets, Figma, Excel, etc.). Use assets you have permission to redistribute.
- `illustrations/` — small decorative illustrations for intro/reveal pages.
- `patterns/` — subtle backgrounds or textures; avoid gradients when the page reference calls for a flat dark canvas.

Prefer optimized SVG or transparent WebP/PNG; keep assets small, use consistent sizing, and provide a text/monochrome fallback. Register every asset by a fixed key in code before the model can use it. Never accept model-generated HTML, CSS, paths, or executable code.
