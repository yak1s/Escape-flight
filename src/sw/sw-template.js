/* Albatross — service worker.
 *
 * GENERATED at build time from src/sw/sw-template.js by scripts/offline-precache-plugin.mjs.
 * The placeholders below are replaced with this build's version and its complete asset list.
 *
 * Design rules (see PWA_ARCHITECTURE.md):
 *  - Precache EVERY game file at install time, verifying each one's SHA-256 hash.
 *  - If any file fails, the install fails: the previous working version stays active and its
 *    cache is never touched. A half-filled new cache is deleted.
 *  - Updates are only downloaded when the player asks for them (consent flag written by the page).
 *    Without consent an update install is refused, so the browser's own background update checks
 *    can never replace content behind the player's back.
 *  - A downloaded update waits; it activates only when the player taps "Restart now" or the app is
 *    fully closed and reopened. Old caches are deleted only after the new one is complete.
 *  - Fetches are cache-first/cache-only for game files. No stale-while-revalidate, no background
 *    refresh, no third-party requests.
 */
'use strict';

const SW_VERSION = '__SW_VERSION__';
const BUILD_ID = '__BUILD_ID__';
const BUILD_TIME = '__BUILD_TIME__';
/** @type {{url:string, hash:string, size:number, type:string, group:string}[]} */
const PRECACHE = self.__PRECACHE_MANIFEST__;

const CACHE_PREFIX = 'albatross-precache-';
const CACHE_NAME = CACHE_PREFIX + SW_VERSION;
const CONTROL_CACHE = 'albatross-control';
const SCOPE = self.registration.scope; // always ends with '/'
const CONSENT_URL = new URL('__update-consent__', SCOPE).href;
const INDEX_URL = new URL('index.html', SCOPE).href;
const CONSENT_MAX_AGE_MS = 20 * 60 * 1000;
const PARALLEL = 6;

const absolute = (url) => new URL(url, SCOPE).href;
const BY_URL = new Map(PRECACHE.map((e) => [absolute(e.url), e]));

// ---------------------------------------------------------------- install

self.addEventListener('install', (event) => {
  event.waitUntil(install());
});

async function install() {
  const isUpdate = Boolean(self.registration.active);
  if (isUpdate) {
    if (!(await hasConsent())) {
      await broadcast({ type: 'UPDATE_DEFERRED', version: SW_VERSION });
      throw new Error('Update not requested by the player; keeping the current version.');
    }
    // Consent is single-use: whether this install succeeds or fails, a later background check
    // must not reuse it.
    await clearConsent();
  }

  const cache = await caches.open(CACHE_NAME);
  const older = (await caches.keys()).filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME);
  const total = PRECACHE.length;
  const failures = [];
  let done = 0;

  const progress = () => {
    done += 1;
    if (done === total || done % 4 === 0) {
      broadcast({ type: 'PRECACHE_PROGRESS', version: SW_VERSION, done, total, isUpdate });
    }
  };

  await runPool(PRECACHE, PARALLEL, async (entry) => {
    const url = absolute(entry.url);
    // Already present and intact (e.g. a retried install)?
    if (await isIntact(await cache.match(url), entry)) return progress();
    // Unchanged file from an older version: copy locally instead of downloading again.
    for (const name of older) {
      const previous = await (await caches.open(name)).match(url);
      if (await isIntact(previous, entry)) {
        await cache.put(url, await rebuild(previous, entry));
        return progress();
      }
    }
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // The query string defeats stale CDN copies; GitHub Pages ignores it.
        const response = await fetch(`${url}?v=${entry.hash.slice(0, 12)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.arrayBuffer();
        if ((await sha256(body)) !== entry.hash) throw new Error('integrity check failed');
        await cache.put(url, makeResponse(body, entry));
        return progress();
      } catch (error) {
        lastError = error;
        await sleep(500 * (attempt + 1));
      }
    }
    failures.push({ url: entry.url, error: String(lastError && lastError.message ? lastError.message : lastError) });
  });

  if (failures.length) {
    await caches.delete(CACHE_NAME);
    await broadcast({ type: 'INSTALL_FAILED', version: SW_VERSION, failures, isUpdate });
    throw new Error(`Precache incomplete: ${failures.length} file(s) failed.`);
  }
  await clearConsent();
  await broadcast({ type: 'INSTALL_COMPLETE', version: SW_VERSION, total, isUpdate });
}

// ---------------------------------------------------------------- activate

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const report = await verifyAll(false);
      if (report.ok) {
        // Only now — with the new version complete — are older versions removed.
        for (const key of await caches.keys()) {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
        }
      }
      await self.clients.claim();
      await broadcast({ type: 'ACTIVATED', version: SW_VERSION });
    })(),
  );
});

// ---------------------------------------------------------------- fetch

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch third-party requests
  if (!url.href.startsWith(SCOPE)) return;
  const selfTest = request.headers.get('X-Albatross-Selftest') === '1';
  const path = url.origin + url.pathname;
  if (request.mode === 'navigate' || path === SCOPE || path === INDEX_URL) {
    event.respondWith(serveIndex(request, selfTest));
    return;
  }
  event.respondWith(serveAsset(request, path, selfTest));
});

async function serveIndex(request, selfTest) {
  const cached = await matchPrecache(INDEX_URL);
  if (cached) return selfTest ? tagged(cached) : cached;
  if (selfTest) return new Response('not cached', { status: 504 });
  try {
    return await fetch(request);
  } catch (error) {
    return diagnosticPage();
  }
}

async function serveAsset(request, path, selfTest) {
  const cached = await matchPrecache(path);
  if (cached) return selfTest ? tagged(cached) : cached;
  if (selfTest) return new Response('not cached', { status: 504 });
  try {
    return await fetch(request);
  } catch (error) {
    broadcast({ type: 'MISSING_RESOURCE', url: path, mandatory: BY_URL.has(path) });
    return new Response(`Albatross: offline resource missing (${path})`, {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function matchPrecache(url) {
  const current = await caches.open(CACHE_NAME);
  const hit = await current.match(url);
  if (hit) return hit;
  // Defensive fallback: any other complete Albatross cache (e.g. mid-activation).
  for (const key of await caches.keys()) {
    if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
      const other = await (await caches.open(key)).match(url);
      if (other) return other;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------- messages

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  const reply = (message) => {
    if (port) port.postMessage(message);
    else if (event.source) event.source.postMessage(message);
  };
  if (data.type === 'GET_INFO') {
    reply(info());
  } else if (data.type === 'VERIFY') {
    event.waitUntil(verifyAll(true).then((report) => reply({ type: 'VERIFY_RESULT', ...report })));
  } else if (data.type === 'REPAIR') {
    event.waitUntil(repair().then((report) => reply({ type: 'REPAIR_RESULT', ...report })));
  } else if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/** Re-download (and verify) only files that are missing or damaged in this version's cache. */
async function repair() {
  const cache = await caches.open(CACHE_NAME);
  const fixed = [];
  const failed = [];
  await runPool(PRECACHE, PARALLEL, async (entry) => {
    const url = absolute(entry.url);
    if (await isIntact(await cache.match(url), entry)) return;
    try {
      const response = await fetch(`${url}?v=${entry.hash.slice(0, 12)}`, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.arrayBuffer();
      if ((await sha256(body)) !== entry.hash) throw new Error('integrity check failed');
      await cache.put(url, makeResponse(body, entry));
      fixed.push(entry.url);
    } catch (error) {
      failed.push(entry.url);
    }
  });
  return { fixed, failed, ok: failed.length === 0 };
}

function info() {
  const groups = {};
  for (const e of PRECACHE) {
    groups[e.group] = groups[e.group] || { files: 0, bytes: 0, sample: e.url };
    groups[e.group].files += 1;
    groups[e.group].bytes += e.size;
  }
  return {
    type: 'INFO',
    version: SW_VERSION,
    buildId: BUILD_ID,
    buildTime: BUILD_TIME,
    total: PRECACHE.length,
    bytes: PRECACHE.reduce((a, e) => a + e.size, 0),
    cacheName: CACHE_NAME,
    groups,
  };
}

/** Check every precached file exists in this version's cache (and optionally re-hash it). */
async function verifyAll(checkHashes) {
  const cache = await caches.open(CACHE_NAME);
  const missing = [];
  const corrupt = [];
  const groups = {};
  await runPool(PRECACHE, PARALLEL, async (entry) => {
    const g = (groups[entry.group] = groups[entry.group] || { total: 0, ok: 0 });
    g.total += 1;
    const response = await cache.match(absolute(entry.url));
    if (!response) return missing.push(entry.url);
    if (checkHashes) {
      const body = await response.arrayBuffer();
      if ((await sha256(body)) !== entry.hash) return corrupt.push(entry.url);
    }
    g.ok += 1;
  });
  return {
    ok: missing.length === 0 && corrupt.length === 0,
    version: SW_VERSION,
    buildId: BUILD_ID,
    total: PRECACHE.length,
    missing,
    corrupt,
    groups,
    hashed: checkHashes,
  };
}

// ---------------------------------------------------------------- helpers

async function hasConsent() {
  try {
    const response = await (await caches.open(CONTROL_CACHE)).match(CONSENT_URL);
    if (!response) return false;
    const { at } = await response.json();
    return typeof at === 'number' && Date.now() - at < CONSENT_MAX_AGE_MS;
  } catch (error) {
    return false;
  }
}

async function clearConsent() {
  try {
    await (await caches.open(CONTROL_CACHE)).delete(CONSENT_URL);
  } catch (error) {
    /* ignore */
  }
}

function makeResponse(body, entry) {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': entry.type, 'Content-Length': String(entry.size), 'X-Albatross-Hash': entry.hash },
  });
}

async function rebuild(response, entry) {
  return makeResponse(await response.arrayBuffer(), entry);
}

async function isIntact(response, entry) {
  if (!response) return false;
  try {
    return (await sha256(await response.clone().arrayBuffer())) === entry.hash;
  } catch (error) {
    return false;
  }
}

function tagged(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Albatross-Source', 'precache');
  headers.set('X-Albatross-Version', SW_VERSION);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function runPool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function broadcast(message) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const client of clients) client.postMessage({ source: 'albatross-sw', ...message });
  } catch (error) {
    /* ignore */
  }
}

function diagnosticPage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Albatross — offline files missing</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1020;color:#e9e4d6;font:16px/1.5 system-ui,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:30rem}h1{font-size:1.4rem;color:#c9a45c}a{color:#9fe3d0}</style></head><body><main>
<h1>Albatross couldn't find its offline files</h1>
<p>The game's start page is not in the offline cache on this device, and there is no internet connection.</p>
<p>When you are back online, open the game once, go to <b>Prepare for offline play</b> and wait for the green
<b>Ready for your flight</b> message. Your saved progress is stored separately and is not affected.</p>
<p><a href="./">Try again</a></p></main></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
