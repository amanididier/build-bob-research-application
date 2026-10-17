# Deploying the Bob website (Vercel)

Production URL: https://build-bob-research-application.vercel.app

## Auto-deploy from GitHub (recommended)

1. Open https://vercel.com/amanididiers-projects/build-bob-research-application
2. Click **Connect Git** (if shown) and choose:
   - Repository: `amanididier/build-bob-research-application`
   - Production branch: **main**
3. Framework preset should be **Next.js** (forced by `vercel.json`).
4. Build command: `npm run build:web` (set in `vercel.json`).
5. Every push to `main` redeploys Production automatically.

## Manual redeploy

- Vercel dashboard → **Deployments** → ⋯ on latest → **Redeploy** (use current main commit).
- Or: **Deployments** → create deployment from `main`.

## What gets deployed

- Marketing homepage (Lovable garden design) — `app/page.tsx`
- Sign in / Sign up — `app/sign-in`, `app/sign-up` + Supabase
- Auth callback — `app/auth/callback`
- Download buttons → GitHub latest Windows installer + `/bob-chrome-extension.zip`

Desktop Electron app is **not** hosted on Vercel; it ships via GitHub Releases.
