// Service-worker behaviour: complete verified precache, cache-first with no background refresh,
// updates only with consent, failed updates keep the old version, repair, and missing-file handling.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { APP, collectErrors, gameState, launchPhone, openPrepAndCheck, profileDir, recordNetwork, serveBuild, serverLog, serverOffline, swInfo, swVerify, waitForController } from './support';
import { runSteps } from './driver';

test.afterEach(async () => {
  await serverOffline(false);
  await serveBuild('dist');
});

async function freshPhone(name: string): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
  await serveBuild('dist');
  const ctx = await launchPhone(profileDir(name));
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const errors = collectErrors(page);
  await page.goto(APP);
  await expect(page.getByTestId('title')).toBeVisible();
  await waitForController(page);
  return { ctx, page, errors };
}

const cacheKeys = (page: Page) => page.evaluate(() => caches.keys());
const hasConsent = (page: Page) =>
  page.evaluate(async () => {
    const c = await caches.open('albatross-control');
    return Boolean(await c.match(new URL('__update-consent__', (await navigator.serviceWorker.getRegistration())!.scope).href));
  });

test('precache is complete and verified; game files are served cache-first with no revalidation', async () => {
  const { ctx, page, errors } = await freshPhone('precache');
  const info = await swInfo(page);
  const verify = await swVerify(page);
  expect(verify).toMatchObject({ ok: true, hashed: true, missing: [], corrupt: [] });
  expect(verify.total).toBe(info.total);
  expect((await cacheKeys(page)).filter((k) => k.startsWith('albatross-precache-'))).toEqual([info.cacheName]);

  // Everything the game ships is listed in the manifest: groups for code, fonts, audio and art.
  const manifest = await page.evaluate(async () => (await fetch('./precache-manifest.json', { cache: 'no-store' })).json());
  const groups = new Set((manifest.files as { group: string }[]).map((f) => f.group));
  for (const g of ['code', 'fonts', 'audio', 'art']) expect(groups.has(g), g).toBe(true);

  // Reload: every request is answered by the service worker; the server sees nothing but the
  // browser's own check of sw.js (which our worker refuses to act on without consent).
  const net = recordNetwork(ctx);
  await serverLog(true);
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await page.getByTestId('new-game').tap();
  await expect(page.getByTestId('chapter-card')).toBeVisible();
  await page.waitForTimeout(1500);
  const pageRequests = net.entries.filter((e) => !e.bySw && !e.url.startsWith('data:') && !e.url.startsWith('blob:'));
  expect(pageRequests.length).toBeGreaterThan(3);
  for (const e of pageRequests) expect(e.fromServiceWorker, e.url).toBe(true);
  const hits = (await serverLog()).map((l) => l.path.split('?')[0]);
  expect(hits.filter((p) => !p.endsWith('/sw.js')), 'no asset requests reach the server').toEqual([]);
  expect(net.external()).toEqual([]);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('updates: refused without consent, a failed update keeps the old version, a deliberate update keeps the save', async () => {
  const { ctx, page, errors } = await freshPhone('update');
  const v1 = await swInfo(page);
  await openPrepAndCheck(page);
  await page.getByTestId('prep-back').tap();
  await page.getByTestId('new-game').tap();
  await runSteps(page, 0, 2); // tap the deck plan, solve P01 through the UI
  const before = (await gameState(page))!;
  expect(before.solved.P01).toBeTruthy();
  await page.waitForTimeout(600);

  // 1. A new version is published. Reopening the game must NOT install it.
  await serveBuild('.e2e-tmp/dist-v2');
  await serverLog(true);
  await page.goto(APP);
  await expect(page.getByTestId('title')).toBeVisible();
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update().catch(() => undefined));
  await page.waitForTimeout(3000);
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())!.waiting))).toBe(false);
  expect((await swInfo(page)).version).toBe(v1.version);
  // The browser fetched the new sw.js, but the worker refused to download anything.
  const seen = (await serverLog()).map((l) => l.path);
  expect(seen.some((p) => p.includes('/sw.js'))).toBe(true);
  expect(seen.filter((p) => !p.includes('/sw.js')), 'no update files downloaded').toEqual([]);
  await page.getByTestId('continue').tap();
  expect((await gameState(page))!.solved.P01).toBeTruthy();
  await page.getByTestId('open-menu').tap();
  await page.getByTestId('menu-title').tap();

  // 2. The published update is broken (one file fails its integrity check). The player asks for it;
  //    it fails cleanly and the current version is untouched.
  await serveBuild('.e2e-tmp/dist-broken');
  await page.getByTestId('open-settings').tap();
  await page.getByTestId('check-update').tap();
  await expect(page.getByTestId('update-status')).toContainText('Update not installed', { timeout: 60_000 });
  expect((await swInfo(page)).version).toBe(v1.version);
  expect(await swVerify(page)).toMatchObject({ ok: true, missing: [], corrupt: [] });
  expect((await cacheKeys(page)).filter((k) => k.startsWith('albatross-precache-'))).toEqual([v1.cacheName]);
  expect(await hasConsent(page), 'consent is single-use').toBe(false);

  // ...and a later background check (navigation) still does not install anything.
  await serveBuild('.e2e-tmp/dist-v2');
  await page.goto(APP);
  await page.waitForTimeout(3000);
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())!.waiting))).toBe(false);
  expect((await swInfo(page)).version).toBe(v1.version);

  // 3. A good update, requested by the player: downloaded and verified, waits, applied on restart.
  await page.getByTestId('open-settings').tap();
  await page.getByTestId('check-update').tap();
  await expect(page.getByTestId('apply-update')).toBeVisible({ timeout: 60_000 });
  expect((await swInfo(page)).version, 'still running the old version until restart').toBe(v1.version);
  await Promise.all([page.waitForEvent('load', { timeout: 30_000 }), page.getByTestId('apply-update').tap()]);
  await expect(page.getByTestId('title')).toBeVisible();
  await waitForController(page);
  const v2 = await swInfo(page);
  expect(v2.version).not.toBe(v1.version);
  expect(v2.buildId).toBe('e2e-v2');
  expect(await swVerify(page)).toMatchObject({ ok: true });
  await expect.poll(async () => (await cacheKeys(page)).filter((k) => k.startsWith('albatross-precache-'))).toEqual([v2.cacheName]);

  // The save survived the update.
  await page.getByTestId('continue').tap();
  const after = (await gameState(page))!;
  expect(after.saveId).toBe(before.saveId);
  expect(after.solved.P01).toBeTruthy();
  expect(errors.filter((e) => !/Update not requested|Precache incomplete|integrity/i.test(e))).toEqual([]);
  await ctx.close();
});

test('a damaged offline cache is detected and repaired', async () => {
  const { ctx, page } = await freshPhone('repair');
  const info = await swInfo(page);
  await page.evaluate(async (name) => {
    const c = await caches.open(name);
    const keys = await c.keys();
    await c.delete(keys.find((k) => k.url.endsWith('.mp3'))!);
    await c.delete(keys.find((k) => k.url.endsWith('.woff2'))!);
  }, info.cacheName);
  expect((await swVerify(page)).missing.length).toBe(2);
  await page.getByTestId('open-prep').tap();
  await expect(page.getByTestId('ready-banner')).toHaveAttribute('data-ready', 'no', { timeout: 60_000 });
  await expect(page.getByTestId('check-files')).toHaveAttribute('data-status', 'fail');
  await page.getByTestId('repair').tap();
  await expect(page.getByTestId('ready-banner')).toHaveAttribute('data-ready', 'yes', { timeout: 60_000 });
  expect(await swVerify(page)).toMatchObject({ ok: true, missing: [] });
  await ctx.close();
});

test('offline with a file missing from the cache: clear message, game keeps running, no crash', async () => {
  const { ctx, page } = await freshPhone('missing');
  const info = await swInfo(page);
  await page.getByTestId('new-game').tap();
  await page.getByTestId('chapter-continue').tap();
  await page.evaluate(async (name) => {
    const c = await caches.open(name);
    const keys = await c.keys();
    await c.delete(keys.find((k) => k.url.endsWith('/audio/ui_open.mp3'))!);
  }, info.cacheName);
  await serverOffline(true);
  await ctx.setOffline(true);
  await page.getByTestId('hs-deck-plan').tap(); // plays ui_open, which is now missing
  await expect(page.getByTestId('missing-banner')).toBeVisible();
  await expect(page.getByTestId('missing-banner')).toContainText('ui_open.mp3');
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await ctx.close();
});
