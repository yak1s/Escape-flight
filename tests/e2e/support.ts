// Shared helpers for the end-to-end tests: persistent Android-like browser profiles (so the service
// worker, Cache Storage and IndexedDB survive a full browser restart), the test server's control
// endpoints, and a recorder that inspects every network request the app makes.
import { chromium, devices, expect, type BrowserContext, type Page, type Request } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ORIGIN = 'http://localhost:4173';
export const BASE = `${ORIGIN}/Escape-flight/`;
export const APP = `${BASE}?e2e=1`;
const pixel = devices['Pixel 7'];

export async function control(path: string): Promise<string> {
  const res = await fetch(`${ORIGIN}/__control/${path}`);
  return res.text();
}
export const serveBuild = (dir: string) => control(`serve?dir=${encodeURIComponent(resolve(dir))}`);
export const serverOffline = (on: boolean) => control(`offline?value=${on ? 1 : 0}`);
export async function serverLog(reset = false): Promise<{ path: string; offline: boolean; at: number }[]> {
  return JSON.parse(await control(`log${reset ? '?reset=1' : ''}`));
}

export function profileDir(name: string, fresh = true) {
  const dir = resolve('.e2e-tmp/profiles', name);
  if (fresh) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** A Chromium profile with Pixel 7 metrics and touch. Survives close/relaunch like a real phone. */
export async function launchPhone(userDataDir: string, opts: { offline?: boolean } = {}) {
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    viewport: pixel.viewport,
    deviceScaleFactor: pixel.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    userAgent: pixel.userAgent,
    serviceWorkers: 'allow',
    offline: opts.offline ?? false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  // Hand-launched contexts don't inherit playwright.config `use` timeouts.
  ctx.setDefaultTimeout(15_000);
  ctx.setDefaultNavigationTimeout(30_000);
  return ctx;
}

export interface NetEntry {
  url: string;
  type: string;
  fromServiceWorker: boolean | null;
  status: number | null;
  failed: string | null;
  bySw: boolean;
}

/** Records every request made by pages and the service worker in a context. */
export function recordNetwork(context: BrowserContext) {
  const entries: NetEntry[] = [];
  const byReq = new Map<Request, NetEntry>();
  context.on('request', (req) => {
    const e: NetEntry = { url: req.url(), type: req.resourceType(), fromServiceWorker: null, status: null, failed: null, bySw: Boolean(req.serviceWorker()) };
    entries.push(e);
    byReq.set(req, e);
  });
  context.on('response', (res) => {
    const e = byReq.get(res.request());
    if (e) {
      e.status = res.status();
      e.fromServiceWorker = res.fromServiceWorker();
    }
  });
  context.on('requestfailed', (req) => {
    const e = byReq.get(req);
    if (e) e.failed = req.failure()?.errorText ?? 'failed';
  });
  return {
    entries,
    external: () => entries.filter((e) => !e.url.startsWith(ORIGIN) && !e.url.startsWith('data:') && !e.url.startsWith('blob:')),
    /** Requests that went to (or tried to go to) the network rather than being answered by the SW. */
    network: () => entries.filter((e) => e.bySw || (e.fromServiceWorker === false && !e.url.startsWith('data:') && !e.url.startsWith('blob:'))),
    failed: () => entries.filter((e) => e.failed),
    clear: () => entries.splice(0, entries.length),
  };
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Wait until the service worker is active and controlling the page. */
export async function waitForController(page: Page) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 60_000 });
}

export async function swInfo(page: Page): Promise<{ version: string; buildId: string; total: number; cacheName: string }> {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = (e) => resolve(e.data);
        navigator.serviceWorker.controller!.postMessage({ type: 'GET_INFO' }, [ch.port2]);
      }),
  );
}

export async function swVerify(page: Page): Promise<{ ok: boolean; missing: string[]; corrupt: string[]; total: number; hashed: boolean }> {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = (e) => resolve(e.data);
        navigator.serviceWorker.controller!.postMessage({ type: 'VERIFY' }, [ch.port2]);
      }),
  );
}

export async function openPrepAndCheck(page: Page) {
  await page.getByTestId('open-prep').click();
  await expect(page.getByTestId('prep')).toBeVisible();
  const banner = page.getByTestId('ready-banner');
  await expect(banner).toHaveAttribute('data-ready', /yes|no/, { timeout: 120_000 });
  if ((await banner.getAttribute('data-ready')) !== 'yes') {
    await page.getByTestId('verify-again').click();
    await expect(banner).toHaveAttribute('data-ready', 'yes', { timeout: 120_000 });
  }
}

export async function gameState(page: Page) {
  return page.evaluate(() => (window as unknown as { __albatross: { state: () => unknown } }).__albatross.state()) as Promise<{
    chapter: string;
    scene: string;
    solved: Record<string, unknown>;
    ending: string | null;
    saveId: string;
    items: string[];
    docs: string[];
    puzzle: Record<string, unknown>;
  } | null>;
}

export const shotPath = (name: string) => join('test-results', 'shots', `${name}.png`);
