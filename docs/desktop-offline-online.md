# Desktop app: offline vs online

## Why the window was blank
The packaged app tried to load `http://localhost:3000`, but no server ships inside
the installer, and `main.cjs` called `startBridge()` which was never defined, so the
app crashed on start. The installer only contained `main.cjs` - no interface at all.

## What changed (v0.2.0)
- The window always loads a bundled offline interface (`apps/desktop/renderer`).
- Data is stored on the computer in `bob-workspace.json` (app data folder); logs in `bob.log`.
- The browser-extension bridge on `127.0.0.1:54321` is implemented (`/health`, `/events/tab`, `/events/note`, `/events/ask`).
- The release workflow no longer builds the website; it only checks and packages the desktop app.

## Works offline
Notes, sources, extension captures, search, local "Ask" over saved research.

## Needs internet
Account / sign-in, cloud sync, cloud AI chat - via "Open Bob online", which opens the website in the browser.
The website stays a separate Vercel deployment.
