// THE most important test: the real airplane-mode scenario on a persistent Android-like profile.
//
//  1. Online, first visit: the service worker installs and verifies every file; the Prepare for
//     Offline checklist goes green; chapter 1 is played through the touch UI.
//  2. The browser is closed completely. The server is made unreachable AND the browser is started
//     in offline mode. The game is reopened from its URL, the save is continued, and play goes on.
//  3. Mid-game the browser is closed and reopened again, still offline (the app being killed).
//  4. The game is played through the touch UI to the ending, with every puzzle solved by its own
//     controls. Every request is inspected: nothing may reach (or even try to reach) the network.
import { expect, test, type Page } from '@playwright/test';
import { WALKTHROUGH } from '../walkthrough';
import { indexAfter, runSteps } from './driver';
import { APP, collectErrors, gameState, launchPhone, openPrepAndCheck, profileDir, recordNetwork, serveBuild, serverLog, serverOffline, swInfo, swVerify, waitForController } from './support';

type Hooks = { __albatross: Record<string, (...a: unknown[]) => unknown> };
const hooks = <T,>(page: Page, name: string) => page.evaluate((n) => (window as unknown as Hooks).__albatross[n](), name) as Promise<T>;

test.afterEach(async () => {
  await serverOffline(false);
});

test('airplane mode: prepare online, close, reopen with no network, continue and finish the game', async () => {
  await serveBuild('dist');
  await serverOffline(false);
  const dir = profileDir('airplane');
  const progress = (m: string) => console.log(`[airplane] ${m}`);

  // ---------------------------------------------------------------- 1. online first visit
  let ctx = await launchPhone(dir);
  let net = recordNetwork(ctx);
  let page = ctx.pages()[0] ?? (await ctx.newPage());
  let errors = collectErrors(page);
  await page.goto(APP);
  await expect(page.getByTestId('title')).toBeVisible();
  await waitForController(page);
  const info = await swInfo(page);
  expect(info.total).toBeGreaterThan(50);
  const verify = await swVerify(page);
  expect(verify).toMatchObject({ ok: true, hashed: true, missing: [], corrupt: [], total: info.total });

  await openPrepAndCheck(page);
  for (const id of ['secure', 'controller', 'files', 'media', 'storage', 'launch']) {
    await expect(page.getByTestId(`check-${id}`), id).toHaveAttribute('data-status', 'ok');
  }
  await expect(page.getByTestId('check-airplane')).toHaveAttribute('data-status', 'warn');
  await page.getByTestId('prep-back').tap();
  await expect(page.getByTestId('ready-chip')).toHaveAttribute('data-ready', 'ready');

  await page.getByTestId('new-game').tap();
  const endOfChapter1 = indexAfter('P04');
  await runSteps(page, 0, endOfChapter1, progress);
  await expect
    .poll(async () => ((await hooks<{ state: { solved: Record<string, unknown> } | null }>(page, 'loadSave')).state?.solved ?? {}).P04 !== undefined)
    .toBe(true);
  const saveId = (await gameState(page))!.saveId;
  expect(net.external(), 'no third-party requests').toEqual([]);
  expect(errors, 'no errors online').toEqual([]);
  await ctx.close();

  // ---------------------------------------------------------------- 2. airplane mode relaunch
  await serverOffline(true);
  await serverLog(true);
  ctx = await launchPhone(dir, { offline: true });
  net = recordNetwork(ctx);
  page = ctx.pages()[0] ?? (await ctx.newPage());
  errors = collectErrors(page);
  await page.goto(APP);
  await expect(page.getByTestId('title')).toBeVisible();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(page.getByTestId('continue')).toContainText('Chapter 2');
  await page.getByTestId('continue').tap();
  let st = (await gameState(page))!;
  expect(st.saveId).toBe(saveId);
  expect(st.chapter).toBe('c2');
  expect(st.solved.P04).toBeTruthy();

  const midGame = indexAfter('P13');
  await runSteps(page, endOfChapter1, midGame, progress);
  st = (await gameState(page))!;
  expect(st.chapter).toBe('c5');
  await page.waitForTimeout(800); // let the debounced autosave land, as on a real phone
  await ctx.close();

  // ---------------------------------------------------------------- 3. killed and reopened, still offline
  ctx = await launchPhone(dir, { offline: true });
  const net2 = recordNetwork(ctx);
  page = ctx.pages()[0] ?? (await ctx.newPage());
  const errors2 = collectErrors(page);
  await page.goto(APP);
  await expect(page.getByTestId('continue')).toContainText('Chapter 5');
  await page.getByTestId('continue').tap();
  st = (await gameState(page))!;
  expect(st.saveId).toBe(saveId);
  expect(st.solved.P13).toBeTruthy();

  // ---------------------------------------------------------------- 4. to the ending, offline
  await runSteps(page, midGame, WALKTHROUGH.length, progress);
  await expect(page.getByTestId('ending')).toBeVisible({ timeout: 30_000 });
  st = (await gameState(page))!;
  expect(st.ending).toBe('rewrite');
  expect(Object.keys(st.solved)).toHaveLength(27);

  // Bundled audio decoded from the offline cache with no errors.
  const audio = await hooks<{ errors: string[]; played: string[]; unlocked: boolean }>(page, 'audio');
  expect(audio.unlocked).toBe(true);
  expect(audio.errors).toEqual([]);
  expect(audio.played.length).toBeGreaterThan(5);
  // Bundled fonts loaded from the cache.
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''));
  });
  expect(fonts.length).toBeGreaterThan(3);

  // The readiness checklist now confirms an offline launch happened.
  await page.goto(APP);
  await openPrepAndCheck(page).catch(() => undefined);
  await expect(page.getByTestId('check-airplane')).toHaveAttribute('data-status', 'ok');

  // Network inspection: nothing reached, or tried to reach, the network while offline.
  for (const n of [net, net2]) {
    expect(n.external(), 'no third-party requests').toEqual([]);
    expect(n.failed(), 'no failed requests').toEqual([]);
    expect(n.network(), 'every request answered by the service worker').toEqual([]);
    expect(n.entries.length).toBeGreaterThan(10);
  }
  // The only thing allowed to knock on the server is the browser's own built-in check for a newer
  // sw.js (Playwright's offline emulation does not cover that internal fetch; on a real phone in
  // airplane mode it simply fails, and our worker never acts on it without consent).
  const hits = (await serverLog()).map((l) => l.path.split('?')[0]);
  expect(hits.filter((p) => !p.endsWith('/sw.js')), 'no game file was requested from the server while offline').toEqual([]);
  expect([...errors, ...errors2], 'no page errors offline').toEqual([]);
  await ctx.close();
});
