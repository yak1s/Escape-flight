# Project status

_Last updated 2026-10-12._

## State: feature-complete, tested in emulation, awaiting real-device check

| Area | Status |
| --- | --- |
| Story, 9 chapters, twist, two endings | Done |
| 27 puzzles with ≥ 3 progressive hints + full solution each | Done, all verified (unit + full UI playthrough) |
| Art (SVG scenes, close-ups, documents, icons) | Done; serviceable, could be richer |
| Audio (5 music tracks, 2 ambiences, 32 SFX/notes), volume/mute, text for all dialogue | Done |
| Offline engine (verified precache, consent-only updates, repair) | Done, E2E-tested |
| Prepare for Offline checklist | Done |
| Saves (IndexedDB, backup slot, migration, export/import, reset) | Done, unit + E2E tested |
| GitHub Pages workflow | Done; needs Settings → Pages → Source: **GitHub Actions** |
| Docs | README, GAME_DESIGN, PUZZLE_REGISTER, PWA_ARCHITECTURE, QA_REPORT, this file |

## Blocking for players
- **GitHub Pages Source must be set to "GitHub Actions"** (repository settings). Until then GitHub
  publishes the unbuilt source and the page stays on the loading screen.

## Known issues / to verify
- First tap after the frost-wipe swipe was swallowed in emulation (see QA_REPORT). Check on a phone.
- Not yet tried on a real Android phone (install, airplane mode, kill/relaunch).
- Playtime (3–4 h) is estimated, not measured with players.

## Next steps
1. Set the Pages source, open the site on Android Chrome, run *Prepare for offline*, install, and do
   the airplane-mode check described in the README.
2. Playtest with someone new to the game; tune hints and timings.
3. Optional polish: richer scene art, more ambient variation.

## Layout
- `src/engine` — reducer, saves, audio, PWA/readiness, dialogue
- `src/content` — chapters, scenes, puzzles, documents, dialogue, items, people
- `src/puzzles/logic` — pure puzzle validators (single source of truth)
- `src/ui` — screens, overlays, puzzle UIs; `src/art` — SVG art
- `src/sw/sw-template.js` — service worker; `scripts/` — build plugin, verification, local server
- `tests/unit`, `tests/e2e`, `tests/walkthrough.ts` (the full route shared by both)
