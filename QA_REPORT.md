# QA report

Verified locally (Chromium 141 via Playwright 1.56, Pixel 7 emulation with touch) on 2026-10-12,
and in GitHub Actions on `ubuntu-latest`. This report separates what was **verified** from what was
**not tested**.

## Automated — verified

### Static checks
- `npm run typecheck` (strict TypeScript, app and tests): passes.
- `npm run build` + `scripts/verify-dist.mjs`: 61 precached files, 6.28 MB, every file hashed and
  listed, all references relative, manifest complete, no external URLs.
- `npm audit`: 0 vulnerabilities.

### Unit tests — 66 passing (`npm test`)
- **Puzzle validators** (`tests/unit/puzzles.test.ts`): every puzzle accepts its intended answer and
  rejects plausible wrong ones. Uniqueness/solvability proved by exhaustive search where it matters:
  valves (1 of all pin-compatible assignments), ballast (1 of 1,024 subsets), gears (1 working train),
  cipher (only offset 11), mirror box (2 beam paths over all 2^15 settings), sliding blocks (BFS
  optimum 14 moves), rat run (shortest safe plan exists ≤ 12 minutes), catwalk (safe path exists),
  descent (16 valid settings reachable with the slider), landing, card. Navigation puzzles are
  checked against real astronomy (Procyon's azimuth at the stated time and place) and map geometry
  (the two light bearings intersect at the ship; course 044° true = 081° compass).
- **Content integrity** (`content.test.ts`): every effect, condition, hotspot, closeup action,
  clue, art reference and sound name resolves; each puzzle has its own interaction, ≥ 3 distinct
  hints and an explanation; hotspots are inside the scene and finger-sized.
- **Save system** (`save.test.ts`, fake IndexedDB): round-trip; corrupted main → backup restored
  and reported; both unreadable → reported, no crash; old/partial saves migrated; newer schema
  refused; delete; localStorage fallback; kv + probe; export/import incl. damaged/foreign/non-JSON.
- **Full walkthrough** (`walkthrough.test.ts`): the complete route reaches the true ending with
  all 27 puzzles solved, an objective is always shown (no dead ends), and the alternative ending.

### End-to-end — 13 passing (`npm run test:e2e`, production build served like GitHub Pages)
- **Airplane mode, full game** (`offline.spec.ts`): fresh profile online → service worker installs
  and hash-verifies every file → *Prepare for offline* checklist all green → chapter 1 played →
  **browser closed**, server made unreachable **and** browser started offline → game reopened from
  its URL, save continued → played to chapter 5 → **browser killed and reopened offline** → played to
  the **ending**. All 27 puzzles were solved through their own touch controls (taps, real one-finger
  touch drags, sliders, pickers); no puzzle was marked solved through a back door. Verified while
  offline: no request failed, every request was answered by the service worker, no third-party
  request, no game file reached the server, no page errors, audio decoded with no errors, fonts
  loaded, and the "Opened in airplane mode" check turned green.
- **Service worker** (`pwa.spec.ts`): precache complete and hash-verified; after reload nothing but
  the browser's own `sw.js` check reaches the server (cache-first, no revalidation). Updates: a newly
  published version is **not** installed on reopen or background check; a broken update (a changed
  file corrupted on the server) fails cleanly with the old version and cache intact and consent
  consumed; a good update requested by the player downloads, waits, applies on restart, deletes the
  old cache, and **keeps the save**. Damaged cache detected and repaired. A file missing while offline
  shows a clear banner and the game keeps running.
- **UI** (`ui.spec.ts`): no sideways scrolling on any scene; hotspots and bars ≥ 40 px; volume and
  mute apply and persist; hints progressive with a confirmation before the full solution; puzzle
  progress autosaved across reload; backup export → erase (confirmed) → restore; damaged backup
  rejected without replacing anything; New game confirms before erasing; conversations replayable
  as text from the radio log.

### Bugs found and fixed by this testing
- Update consent could be reused by a background check after a failed update → now single-use.
- "New game" could erase an unreadable save without asking → now confirms.
- Frost wipe could lose wiped cells during fast swipes → fixed.
- Small and bottom-bar buttons were 36–38 px → now 44 px.
- Rat-run clock showed "01:60"-style times → fixed.
- Boot screen hung silently if the app could not start → now explains after 10 s.

## Notes and caveats (honest)
- **The browser's built-in `sw.js` update check** is not blocked by Playwright's offline emulation,
  so the test server saw those requests during the offline run. On a real phone in airplane mode
  they simply fail; the worker never acts on them without consent. No game file was requested.
- **Swallowed first tap after the frost-wipe swipe** (P05): in emulated touch, Chromium did not
  synthesise a click for the first tap right after the swipe gesture; the second tap worked. Not
  yet checked on a real phone. If it happens there, the fix is to react on `pointerup` for those
  option buttons.
- The end-to-end job runs on every push but does not block deployment.

## Not tested
- **A real Android device**: installation from Chrome, the home-screen icon, true airplane mode,
  app-switcher kill, storage eviction under low disk, audio output through a real speaker,
  vibration. All of the above was verified only in emulation.
- iOS/Safari, Firefox, desktop browsers other than Chromium.
- Human playtesting of difficulty and the 3–4 hour duration (the duration is an estimate from
  content volume, not measured).
- Screen readers beyond the semantic roles/labels present in the markup.
- The live GitHub Pages site end-to-end (the deploy depends on the Pages *Source* setting; see
  README).
