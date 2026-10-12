// Page-side PWA control: service-worker registration, offline-readiness verification,
// deliberate updates and the install prompt. The page never fetches game content from the
// network itself; it only talks to the service worker and Cache Storage.
import { kvGet, kvSet, probeStorage } from './save';

export interface SwInfo {
  version: string;
  buildId: string;
  buildTime: string;
  total: number;
  bytes: number;
  cacheName: string;
  groups: Record<string, { files: number; bytes: number; sample: string }>;
}

export interface VerifyResult {
  ok: boolean;
  version: string;
  total: number;
  missing: string[];
  corrupt: string[];
  groups: Record<string, { total: number; ok: number }>;
  hashed: boolean;
}

export type CheckStatus = 'pending' | 'running' | 'ok' | 'warn' | 'fail';

export interface ReadinessCheck {
  id: 'secure' | 'controller' | 'files' | 'media' | 'storage' | 'launch' | 'installed' | 'airplane';
  label: string;
  status: CheckStatus;
  detail: string;
  required: boolean;
}

export interface ReadinessReport {
  ready: boolean;
  checks: ReadinessCheck[];
  info: SwInfo | null;
  verifiedAt: number;
}

type Listener = (msg: Record<string, unknown>) => void;

const listeners = new Set<Listener>();
let registration: ServiceWorkerRegistration | null = null;
let deferredPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
let applyingUpdate = false;
export const swEvents: Record<string, unknown>[] = [];

export function onSwMessage(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(msg: Record<string, unknown>) {
  swEvents.push(msg);
  if (swEvents.length > 80) swEvents.shift();
  for (const l of listeners) l(msg);
}

export function supportsOffline(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'caches' in window;
}

export function isStandalone(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supportsOffline()) return null;
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.source === 'albatross-sw') emit(data);
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    emit({ type: 'CONTROLLER_CHANGED' });
    if (applyingUpdate) window.location.reload();
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as typeof deferredPrompt;
    emit({ type: 'INSTALLABLE' });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit({ type: 'INSTALLED' });
  });
  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
    return registration;
  } catch (error) {
    emit({ type: 'REGISTER_FAILED', error: String(error) });
    return null;
  }
}

export function canPromptInstall() {
  return Boolean(deferredPrompt);
}

export async function promptInstall(): Promise<string> {
  if (!deferredPrompt) return 'unavailable';
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice.outcome;
}

function activeWorker(): ServiceWorker | null {
  return navigator.serviceWorker?.controller || registration?.active || null;
}

function ask<T>(message: Record<string, unknown>, timeoutMs = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = activeWorker();
    if (!worker) {
      reject(new Error('No active service worker'));
      return;
    }
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(new Error('Service worker did not answer')), timeoutMs);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data as T);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

export function getInfo(): Promise<SwInfo> {
  return ask<SwInfo>({ type: 'GET_INFO' }, 8000);
}

export function repairCache(): Promise<{ fixed: string[]; failed: string[]; ok: boolean }> {
  return ask({ type: 'REPAIR' }, 180000);
}

export function verifyCache(): Promise<VerifyResult> {
  return ask<VerifyResult>({ type: 'VERIFY' }, 60000);
}

/** Wait until a service worker controls this page (first install claims the page). */
export async function waitForController(timeoutMs = 90000): Promise<boolean> {
  if (!supportsOffline()) return false;
  if (navigator.serviceWorker.controller) return true;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(Boolean(navigator.serviceWorker.controller)), timeoutMs);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(timer);
      resolve(true);
    });
    navigator.serviceWorker.ready.then(() => {
      if (navigator.serviceWorker.controller) {
        clearTimeout(timer);
        resolve(true);
      }
    });
  });
}

/** Fetch key resources with a header that makes the service worker answer from cache ONLY. */
export async function selfTestOfflineLaunch(info: SwInfo): Promise<{ ok: boolean; detail: string }> {
  const urls = new Set<string>(['./', './index.html']);
  for (const g of Object.values(info.groups)) urls.add(`./${g.sample}`);
  document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]').forEach((s) => urls.add(s.src));
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((l) => urls.add(l.href));
  const failures: string[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'X-Albatross-Selftest': '1' }, cache: 'no-store' });
      if (!res.ok || res.headers.get('X-Albatross-Source') !== 'precache') failures.push(url);
    } catch {
      failures.push(url);
    }
  }
  return failures.length
    ? { ok: false, detail: `Not served from the offline cache: ${failures.map(short).join(', ')}` }
    : { ok: true, detail: `${urls.size} launch resources served from the offline cache with no network` };
}

function short(url: string) {
  return url.replace(location.origin, '').split('/').slice(-1)[0] || './';
}

function mb(bytes: number) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export async function runReadinessChecks(onUpdate: (checks: ReadinessCheck[]) => void): Promise<ReadinessReport> {
  const checks: ReadinessCheck[] = [
    { id: 'secure', label: 'Secure, supported browser', status: 'pending', detail: '', required: true },
    { id: 'controller', label: 'Offline engine (service worker) running', status: 'pending', detail: '', required: true },
    { id: 'files', label: 'All game files stored on this device', status: 'pending', detail: '', required: true },
    { id: 'media', label: 'Artwork, fonts and audio prepared', status: 'pending', detail: '', required: true },
    { id: 'storage', label: 'Local save storage available', status: 'pending', detail: '', required: true },
    { id: 'launch', label: 'Offline launch verified', status: 'pending', detail: '', required: true },
    { id: 'installed', label: 'Installed as an app', status: 'pending', detail: '', required: false },
    { id: 'airplane', label: 'Opened in airplane mode at least once', status: 'pending', detail: '', required: false },
  ];
  const set = (id: ReadinessCheck['id'], status: CheckStatus, detail: string) => {
    const c = checks.find((x) => x.id === id)!;
    c.status = status;
    c.detail = detail;
    onUpdate(checks.map((x) => ({ ...x })));
  };
  let info: SwInfo | null = null;
  const finish = (): ReadinessReport => {
    const ready = checks.filter((c) => c.required).every((c) => c.status === 'ok');
    const report = { ready, checks, info, verifiedAt: Date.now() };
    void kvSet('readiness', { ready, version: info?.version ?? null, verifiedAt: report.verifiedAt });
    return report;
  };

  // 1. Secure context
  set('secure', 'running', '');
  if (!window.isSecureContext) {
    set('secure', 'fail', 'This page is not on HTTPS. Open the published https:// address.');
    return finish();
  }
  if (!('serviceWorker' in navigator) || !('caches' in window) || !('indexedDB' in window)) {
    set('secure', 'fail', 'This browser lacks service workers, Cache Storage or IndexedDB. Use Chrome on Android.');
    return finish();
  }
  set('secure', 'ok', 'HTTPS · service workers · Cache Storage · IndexedDB');

  // 2. Controller
  set('controller', 'running', 'Waiting for the offline engine to start…');
  if (!registration) await registerServiceWorker();
  const controlled = await waitForController(120000);
  if (!controlled) {
    set('controller', 'fail', 'The offline engine has not taken control yet. Stay online, then reload the page.');
    return finish();
  }
  try {
    info = await getInfo();
    set('controller', 'ok', `Version ${info.version} (build ${info.buildId})`);
  } catch (error) {
    set('controller', 'fail', `Could not talk to the offline engine: ${(error as Error).message}`);
    return finish();
  }

  // 3–4. Files & media, verified by SHA-256 against the build manifest
  set('files', 'running', `Checking ${info.total} files (${mb(info.bytes)})…`);
  set('media', 'running', 'Checking artwork, fonts and audio…');
  let verify: VerifyResult;
  try {
    verify = await verifyCache();
  } catch (error) {
    set('files', 'fail', `Verification failed: ${(error as Error).message}`);
    set('media', 'fail', 'Not checked');
    return finish();
  }
  if (verify.ok) {
    set('files', 'ok', `${verify.total} of ${info.total} files present and hash-verified (${mb(info.bytes)})`);
  } else {
    set(
      'files',
      'fail',
      `${verify.missing.length} missing, ${verify.corrupt.length} damaged (e.g. ${[...verify.missing, ...verify.corrupt].slice(0, 3).join(', ')}). Stay online and tap “Repair offline files”.`,
    );
  }
  const media = ['art', 'fonts', 'audio'].map((g) => ({ g, v: verify.groups[g] }));
  const mediaOk = media.every((m) => m.v && m.v.total > 0 && m.v.ok === m.v.total);
  set(
    'media',
    mediaOk ? 'ok' : 'fail',
    media.map((m) => `${m.g}: ${m.v ? `${m.v.ok}/${m.v.total}` : 'none'}`).join(' · '),
  );

  // 5. Storage
  set('storage', 'running', '');
  const probe = await probeStorage();
  let persisted = false;
  try {
    persisted = (await navigator.storage?.persist?.()) ?? false;
  } catch {
    persisted = false;
  }
  if (!probe.ok) set('storage', 'fail', `Saving is not possible: ${probe.detail}`);
  else set('storage', 'ok', `${probe.detail}${persisted ? ' · protected from automatic clean-up' : ' · the browser may clear it only if the phone runs very low on space'}`);

  // 6. Offline launch path
  set('launch', 'running', '');
  const launch = await selfTestOfflineLaunch(info);
  set('launch', launch.ok && verify.ok ? 'ok' : 'fail', launch.detail);

  // 7–8. Informational
  set(
    'installed',
    isStandalone() ? 'ok' : 'warn',
    isStandalone() ? 'Running as an installed app' : 'Not installed yet — use “Install app” or Chrome menu ⋮ → Add to Home screen',
  );
  const seen = await kvGet<number>('offlineLaunchSeen');
  set(
    'airplane',
    seen ? 'ok' : 'warn',
    seen ? `Confirmed ${new Date(seen).toLocaleString()}` : 'Not yet — turn on airplane mode, close the app fully and reopen it',
  );
  return finish();
}

/** Remember that the app was opened with no connection (the real airplane-mode test). */
export async function recordOfflineLaunch() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false && navigator.serviceWorker?.controller) {
    await kvSet('offlineLaunchSeen', Date.now());
  }
}

export async function lastReadiness(): Promise<{ ready: boolean; version: string | null; verifiedAt: number } | undefined> {
  return kvGet('readiness');
}

// ------------------------------------------------------------------ updates

export type UpdateState =
  | { status: 'idle' }
  | { status: 'offline' }
  | { status: 'checking' }
  | { status: 'none' }
  | { status: 'downloading'; done: number; total: number }
  | { status: 'ready' }
  | { status: 'failed'; error: string };

/**
 * Deliberately check for and download a new version. Grants the service worker one-time consent,
 * asks the browser to re-check sw.js, and reports progress. The current version keeps running and
 * stays intact; a failed download changes nothing.
 */
export async function checkForUpdate(onState: (s: UpdateState) => void): Promise<UpdateState> {
  if (!registration) registration = (await navigator.serviceWorker?.getRegistration()) ?? null;
  if (!registration) {
    const s: UpdateState = { status: 'failed', error: 'Offline engine not registered' };
    onState(s);
    return s;
  }
  if (registration.waiting) {
    onState({ status: 'ready' });
    return { status: 'ready' };
  }
  if (!navigator.onLine) {
    onState({ status: 'offline' });
    return { status: 'offline' };
  }
  onState({ status: 'checking' });
  const consentUrl = new URL('__update-consent__', registration.scope).href;
  await (await caches.open('albatross-control')).put(consentUrl, new Response(JSON.stringify({ at: Date.now() })));
  const reg = registration;
  return new Promise<UpdateState>((resolve) => {
    let finished = false;
    const end = (s: UpdateState) => {
      if (finished) return;
      finished = true;
      off();
      // Unused consent must not linger for a later background check to pick up.
      if (s.status !== 'ready') void caches.open('albatross-control').then((c) => c.delete(consentUrl));
      onState(s);
      resolve(s);
    };
    const off = onSwMessage((msg) => {
      if (msg.type === 'PRECACHE_PROGRESS' && msg.isUpdate) {
        onState({ status: 'downloading', done: Number(msg.done), total: Number(msg.total) });
      } else if (msg.type === 'INSTALL_FAILED' && msg.isUpdate) {
        end({ status: 'failed', error: `${(msg.failures as unknown[]).length} file(s) could not be downloaded` });
      }
    });
    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') end({ status: 'ready' });
        if (worker.state === 'redundant' && !reg.waiting) end({ status: 'failed', error: 'The new version could not be prepared. Your current version is unchanged.' });
      });
    };
    reg.addEventListener('updatefound', () => watch(reg.installing));
    reg
      .update()
      .then(() => {
        setTimeout(() => {
          if (!reg.installing && !reg.waiting) end({ status: 'none' });
          else if (reg.waiting) end({ status: 'ready' });
          else watch(reg.installing);
        }, 1500);
      })
      .catch((error) => end({ status: 'failed', error: `Could not reach the game site (${String(error)})` }));
  });
}

export function updateWaiting(): boolean {
  return Boolean(registration?.waiting);
}

export function applyUpdate() {
  const waiting = registration?.waiting;
  if (!waiting) return false;
  applyingUpdate = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export function getRegistration() {
  return registration;
}
