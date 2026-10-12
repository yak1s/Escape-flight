# PWA architecture — how "offline" really means offline

## Build

- Vite + TypeScript + Preact, `base: './'` (all URLs relative; no hard-coded repository path).
- One JS bundle (`inlineDynamicImports`), one CSS file, self-hosted WOFF2 fonts, 39 MP3s, PNG/SVG
  icons. No CDN, no third-party request of any kind (checked by `scripts/verify-dist.mjs`).
- `scripts/offline-precache-plugin.mjs` runs after the bundle is written. It walks `dist/`, hashes
  every file (SHA-256), and generates `dist/sw.js` from `src/sw/sw-template.js` with the complete
  manifest embedded (url, hash, size, type, group). The **version** is a hash of the whole file list,
  so any content change produces a new version. It also writes `precache-manifest.json` and
  `.nojekyll`.
- `scripts/verify-dist.mjs` fails the build if any file is missing from the manifest, any hash is
  wrong, the web manifest is incomplete, or anything references an external URL.

## Service worker (`src/sw/sw-template.js`)

**Install** — downloads every file with `cache: 'no-store'` and a `?v=<hash>` cache-buster,
re-hashes each body and compares it with the manifest. Files unchanged since an older version are
copied from the old cache after re-verification instead of downloaded. Up to 3 attempts per file.
If **any** file fails, the new cache is deleted and the install throws, so the previous version
stays in control, untouched.

**Update consent** — an install while a version is already active (an update) is refused unless
the page has written a consent token (`albatross-control` cache, valid 20 minutes). The token is
single-use: it is consumed at the start of the install whatever the outcome, and the page deletes
it if a check finds nothing. The browser's own periodic `sw.js` checks therefore never install
anything behind the player's back.

**Activate** — verifies the new cache is complete, only then deletes older caches, then claims
clients. A downloaded update waits (`waiting` state) until the player taps *Restart with the new
version* (the save is flushed first) or fully closes and reopens the app.

**Fetch** — same-origin, in-scope GET only:
- navigations → the precached `index.html`, cache-only (offline-first);
- game files → precache first; network only for files not in the manifest; if that fails, a 503
  plus a `MISSING_RESOURCE` message → the app shows a banner pointing to *Repair*;
- no stale-while-revalidate, no background refresh, nothing third-party is ever touched.

**Messages** — `GET_INFO`, `VERIFY` (re-hashes every cached file), `REPAIR` (re-downloads only
missing or damaged files), `SKIP_WAITING`. Requests with `X-Albatross-Selftest: 1` are answered
from cache with `X-Albatross-Source: precache` (or 504), which the readiness check uses to prove
an offline launch would work.

Registered with `updateViaCache: 'none'` and scope `./`.

## Prepare for offline play (`src/engine/pwa.ts → runReadinessChecks`)

| Check | Required | How |
| --- | --- | --- |
| Secure, supported browser | yes | `isSecureContext`, SW + Cache + IndexedDB support |
| Offline engine running | yes | `navigator.serviceWorker.controller` |
| All game files stored | yes | `VERIFY`: every file present **and hash-verified** |
| Artwork, fonts, audio | yes | per-group counts from the same verification |
| Local save storage | yes | IndexedDB write/read/delete probe; persistent storage requested |
| Offline launch verified | yes | self-test fetch of the start page, bundle, CSS and one file per group |
| Installed as an app | no | `display-mode: standalone` |
| Opened in airplane mode | no | recorded when the app starts with `navigator.onLine === false` |

The result is stored with the version it was verified against; the title screen chip shows
"Ready for offline" only while that matches the running version.

## Saves (`src/engine/save.ts`, `src/engine/store.ts`)

- IndexedDB database `albatross` v1: store `saves` (`main`, `backup`), store `kv` (settings etc.).
- Each write puts the new state in `main` and moves the previous `main` to `backup` **in one
  transaction**. Every record carries the schema version and an FNV-1a checksum.
- Load: `main`; if unreadable, `backup` (the player is told); older schemas are migrated forward,
  never discarded; a save from a *newer* schema is refused, not mangled, and "New game" asks before
  replacing a save it cannot read.
- Autosave: immediately on solves, chapter changes, dialogue completion and endings; otherwise
  debounced 350 ms; flushed when the page is hidden or closed. Failures show "⚠ Not saved".
- Fallback to `localStorage` if IndexedDB is unavailable (with a warning).
- Export/import: JSON `{format:'albatross-save', schema, checksum, state}`; damaged or foreign files
  are rejected with a clear message; import and reset both require confirmation.
- Updates never touch saves (separate storage from Cache Storage).
