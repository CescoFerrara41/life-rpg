# Life RPG

A self-hosted personal progress tracker that gamifies real-life skills as RPG stats. Built as a static React app you can host on GitHub Pages and add to your iPhone home screen.

## Features

- **24 stats** spanning physical, intellectual, creative, social, and practical domains
- **Character creation questionnaire** to set your starting levels
- **AI-powered XP allocation** — describe what you did, Claude figures out which stats it affects
- **No XP for unmatched tasks** — if a task doesn't relate to any tracked stat, no XP is awarded
- **Local-only storage** — everything stays in your browser's localStorage
- **Backup/restore** via JSON export & import
- **Undo last claim** and **delete individual log entries**
- **iPhone home-screen ready** (PWA manifest + Apple meta tags + safe-area handling)

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Deploy to GitHub Pages

### 1. Create the repo

Create a GitHub repository named **`life-rpg`** (the name matters — see step 3 if you want a different name).

Push this folder to it:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/life-rpg.git
git push -u origin main
```

### 2. Turn on Pages

In your repo, go to **Settings → Pages**. Under **Source**, pick **GitHub Actions**.

That's it — the workflow in `.github/workflows/deploy.yml` will build the app and publish it on every push to `main`. Your site will be live at:

```
https://YOUR-USERNAME.github.io/life-rpg/
```

The first deploy takes about 1–2 minutes. Check progress under the **Actions** tab.

### 3. If you use a different repo name

The Vite config has a `base: '/life-rpg/'` line. Open `vite.config.js` and change it to match your repo name, e.g. `'/my-tracker/'`. If you use a user/org site (`username.github.io`) or a custom domain, set `base: '/'`.

## Add to your iPhone home screen

1. Open the live URL in **Safari** on your iPhone (must be Safari, not Chrome).
2. Tap the **Share** button (the square with the arrow).
3. Scroll and tap **Add to Home Screen**.
4. Tap **Add**.

The app will now launch fullscreen from the home screen like a native app, with the dark theme respecting the iPhone's notch/safe areas.

## API key setup

The XP analysis uses the Google Gemini API — **completely free, no credit card required**.

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and sign in with your Google account.
2. Click **Create API key** and copy it (it starts with `AIza`).
3. In the app, tap **Settings** in the bottom bar.
4. Paste your key and tap **Save key**.

The key is stored only in your browser's localStorage and is never included in JSON exports. All requests go directly from your device to `generativelanguage.googleapis.com`.

The app uses **Gemini 2.5 Flash**, which is free with no expiration. The free tier allows around 10–15 requests per minute and hundreds of requests per day — far more than you'll ever need for logging personal tasks.

One caveat: on the free tier, Google may use your prompts to improve their models. Since you're just describing personal tasks like "went for a run" or "read a chapter", this is unlikely to matter in practice. If it does, you can enable billing on your Google Cloud project (same key, no other changes needed), and your data won't be used for training.

## Data

Everything is stored under two localStorage keys on your device:

- `life-rpg:v1:state` — your stats, log, and phase
- `life-rpg:v1:apikey` — your API key

Clearing browser data for the site will wipe these. Use **Settings → Export** for backups.

## Customizing the stats

The 24 stats are defined in `src/stats.js`. Add, remove, or rename freely — the AI will be told the new list at request time.

If you add stats *after* you've been using the app, your existing log entries and questionnaire data are unaffected; the new stats just start at level 0. Removing a stat that has history won't delete the log entries that reference it (they'll just render as nothing for that piece).

## License

Personal project. Do whatever you like with it.
