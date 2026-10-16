# Bob companion media (overlay bubble + routines)

Put **images** and **videos** here. The overlay tries **video first**, then **image**, then the yellow “B” fallback.

## Videos (preferred for motion) — `.webm` or `.mp4`

| Your asset | Save as |
|------------|---------|
| Bob meditating | `bob-meditating.webm` |
| Bob cooking | `bob-cooking.webm` |
| Bob listening to music | `bob-listening-music.webm` |
| (optional) idle / speaking / thinking / listening | `bob-idle.webm`, `bob-speaking.webm`, `bob-thinking.webm`, `bob-listening.webm` |

Keep clips **2–6 seconds**, loop-friendly, **256–512px** square.

## Images (stills / when no video) — `.png` preferred

| Your asset | Save as |
|------------|---------|
| Bob reading a book | `bob-reading-book.png` |
| Bob waking up | `bob-waking-up.png` |
| Bob sleeping | `bob-sleeping.png` |
| Bob eating | `bob-eating.png` |
| Bob painting | `bob-painting.png` (optional still) |
| Bob surfing | `bob-surfing.png` (optional still) |
| Bob reading a blueprint | `bob-blueprint.png` |
| Cooking pan / ingredients | `bob-cooking.png` or `cooking-pan.png` |
| Engineering tools | see roadmap below |
| Building / construction | see roadmap below |
| Finished skyscraper | see roadmap below |
| Roadmap 3D | see roadmap below |

## Path in repo

```
public/assets/companion-loops/     ← overlay bubble loops & routine stills
public/assets/roadmap-library/     ← roadmap / construction / tools art
  illustrations/
  patterns/
  tools/
```

## Roadmap pages

Place construction / tools / skyscraper / **roadmap 3D** under:

```
public/assets/roadmap-library/illustrations/
  roadmap-3d.png
  skyscraper-finished.png
  building-construction.png
  engineering-tools.png
  bob-blueprint.png
```

The Tasks / Roadmap UI can reference:

`/assets/roadmap-library/illustrations/<filename>`

## Overlay behavior (code)

- Desktop Chrome page: `src/components/companion/BobOverlayBubble.tsx`  
  Uses `mediaForRoutine()` → files in this folder.
- Real Chrome tabs: `chrome-extension/content.js` floating bubble + slide-up panel  
  Uses Gemini `CHAT` via background; selection **Ask** opens the panel with excerpt.

## Chat reply style (Gemini)

Bubble/chat mode is guided to: **1–3 short sentences**, casual, no long reports.  
Deep research is redirected to side panel / desktop Research.
