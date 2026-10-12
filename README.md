# Albatross — A Frozen Signal

An original solo escape adventure for phones. In 1989 you climb into the wreck of the airship
*Albatross*, frozen into a Norwegian glacier since 1938, carrying your late grandmother's tin box.
Her old wireless set still works — and someone aboard, on the night of the crash, answers.

- **27 puzzles** across 9 chapters, roughly 3–4 hours of play
- Touch-only, portrait, built for Android phones
- **Works fully offline** (airplane mode) once prepared; progress is saved on the device
- Installable as an app (PWA) from Chrome
- Original art (SVG), music and sound (generated and bundled), progressive hints for every puzzle

## Playing on Android

1. Open the game's address in **Chrome** (see *Deploying* below for the address).
2. Tap **Prepare for offline**. Wait until every required check is green and the banner says the
   game is ready. This downloads and verifies every file (about 6 MB).
3. *(Recommended)* Install it: tap **Install app** on that screen, or Chrome menu **⋮ → Add to Home
   screen / Install app**. It then opens full-screen from your home screen.
4. Test it once before relying on it: turn on **airplane mode**, close the app completely (swipe it
   away from recent apps), reopen it. The checklist's "Opened in airplane mode" item turns green.

Progress saves automatically after every action. **Settings → Download a backup file** exports
your save; **Restore from a backup file** brings it back (on this or another device).

The game never updates itself in the background. **Settings → Check for a new version** downloads
an update only when you ask; it is verified completely and applied only when you tap *Restart*. If
anything fails, the version you have keeps working and your save is untouched.

## Deploying (GitHub Pages)

The repository includes `.github/workflows/pages.yml`, which type-checks, runs the unit tests,
builds and publishes the game. A separate job runs the browser (end-to-end) suite on every push.

**One-time setup — required:**

1. Repository **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
   (With *Deploy from a branch*, GitHub publishes the unbuilt source files and the page stays on the
   "ALBATROSS" loading screen.)
2. Push to `main` or `claude/escape-adventure-pwa-game-mhyhdq` (or run the workflow manually from
   the **Actions** tab). The deploy step prints the address, normally
   `https://<owner>.github.io/<repository>/`.
3. If the deploy job says the branch is not allowed to deploy, add it under **Settings →
   Environments → github-pages → Deployment branches**, or merge into the default branch.

The build uses relative paths only, so it works under any repository name or sub-path.

## Development

```bash
npm ci
npm run dev          # local dev server (no offline engine in dev mode)
npm run build        # production build into dist/ + service worker + verification
npm run preview      # serve dist/ the way GitHub Pages does, at http://localhost:4173/Escape-flight/
npm run typecheck    # app + tests
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright, needs `npm run build` first)
```

Regenerating assets (outputs are committed, so CI doesn't need these): `npm run icons`
(Playwright Chromium) and `npm run audio` (Python 3 + numpy).

## Documentation

| File | What's in it |
| --- | --- |
| [GAME_DESIGN.md](GAME_DESIGN.md) | Story, twist and its fair-play clues, chapters, characters |
| [PUZZLE_REGISTER.md](PUZZLE_REGISTER.md) | Every puzzle: mechanics, clues, solution, verification |
| [PWA_ARCHITECTURE.md](PWA_ARCHITECTURE.md) | Offline engine, caching, updates, saves |
| [QA_REPORT.md](QA_REPORT.md) | What was tested, how, and what was not |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Current state, known issues, next steps |
