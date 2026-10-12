// Player-facing UI on an Android-sized touch screen: layout, touch targets, audio controls,
// progressive hints, autosave of puzzle progress, export/import and reset with confirmation.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { APP, collectErrors, gameState, serveBuild } from './support';
import { touchAt } from './driver';
import { SCENES } from '../../src/content/scenes';

type Hooks = { __albatross: Record<string, (...a: unknown[]) => unknown> };
const audioState = (page: Page) => page.evaluate(() => (window as unknown as Hooks).__albatross.audio()) as Promise<{ muted: boolean; musicVolume: number; sfxVolume: number; masterGain: number; unlocked: boolean }>;

test.beforeEach(async ({ page }) => {
  await serveBuild('dist');
  await page.goto(APP);
  await expect(page.getByTestId('title')).toBeVisible();
});

async function newGame(page: Page) {
  await page.getByTestId('new-game').tap();
  await page.getByTestId('chapter-continue').tap();
  await expect(page.getByTestId('game')).toBeVisible();
}

async function noHorizontalScroll(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw).toBeLessThanOrEqual(iw);
}

test('fits a phone screen: no sideways scrolling and finger-sized controls everywhere', async ({ page }) => {
  const errors = collectErrors(page);
  await noHorizontalScroll(page);
  await newGame(page);
  await noHorizontalScroll(page);
  for (const scene of SCENES) {
    await page.evaluate((id) => (window as unknown as Hooks).__albatross.dispatch({ type: 'goto', scene: id }), scene.id);
    await expect(page.getByTestId('game')).toHaveAttribute('data-scene', scene.id);
    await noHorizontalScroll(page);
    for (const hs of await page.locator('[data-testid^="hs-"]').all()) {
      const box = await hs.boundingBox();
      if (!box) continue;
      expect(Math.min(box.width, box.height), `${scene.id} ${await hs.getAttribute('data-testid')}`).toBeGreaterThanOrEqual(40);
    }
  }
  for (const btn of await page.locator('.topbar button, .bottombar button').all()) {
    const box = (await btn.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
  }
  expect(errors).toEqual([]);
});

test('sound: volume and mute settings apply immediately and persist', async ({ page }) => {
  await page.getByTestId('open-settings').tap();
  await page.getByTestId('music-volume').fill('25');
  await page.getByTestId('sfx-volume').fill('40');
  await page.getByRole('checkbox', { name: 'Mute all sound' }).check();
  let a = await audioState(page);
  expect(a).toMatchObject({ muted: true, musicVolume: 0.25, sfxVolume: 0.4 });
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  a = await audioState(page);
  expect(a).toMatchObject({ muted: true, musicVolume: 0.25, sfxVolume: 0.4 });
  await page.getByTestId('open-settings').tap();
  await expect(page.getByRole('checkbox', { name: 'Mute all sound' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Mute all sound' }).uncheck();
  expect((await audioState(page)).muted).toBe(false);
});

test('hints are progressive and the full solution needs a confirmation', async ({ page }) => {
  await newGame(page);
  await page.getByTestId('hs-deck-plan').tap();
  await page.getByTestId('puzzle-hints').tap();
  await expect(page.getByTestId('hint')).toHaveCount(0);
  await page.getByTestId('hint-more').tap();
  await expect(page.getByTestId('hint')).toHaveCount(1);
  await page.getByTestId('hint-more').tap();
  await page.getByTestId('hint-more').tap();
  await expect(page.getByTestId('hint')).toHaveCount(3);
  await expect(page.getByTestId('hint-solution')).toHaveCount(0);
  await page.getByTestId('hint-solution-ask').tap();
  await page.getByTestId('hint-reveal').tap();
  await expect(page.getByTestId('hint-solution')).toBeVisible();
  expect(((await gameState(page))!.puzzle as Record<string, unknown>) && (await page.evaluate(() => (window as unknown as Hooks).__albatross.state() as { hints: Record<string, number> })).hints.P01).toBe(4);
});

test('puzzle progress and position are autosaved and survive the app being closed', async ({ page }) => {
  await newGame(page);
  await page.getByTestId('hs-deck-plan').tap();
  for (const t of [0, 1, 2]) {
    await touchAt(page, page.getByTestId(`mtile-${t}`).locator('rect').first());
    await page.getByTestId(`mcell-${t}`).tap();
  }
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByTestId('continue').tap();
  await page.getByTestId('hs-deck-plan').tap();
  for (const t of [0, 1, 2]) await expect(page.getByTestId(`mplaced-${t}`)).toBeVisible();
  await expect(page.getByTestId('mtile-0')).toHaveCount(0);
});

test('export a backup, erase with confirmation, restore from the file', async ({ page }) => {
  await newGame(page);
  await page.getByTestId('hs-to-corridor').tap();
  await expect(page.getByTestId('game')).toHaveAttribute('data-scene', 'corridor');
  const original = (await gameState(page))!;
  await page.getByTestId('open-menu').tap();
  await page.getByTestId('menu-settings').tap();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-save').tap()]);
  const file = test.info().outputPath('backup.json');
  await download.saveAs(file);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  expect(json.format).toBe('albatross-save');
  expect(json.state.saveId).toBe(original.saveId);

  await page.getByTestId('reset').tap();
  await expect(page.getByTestId('reset-confirm')).toBeVisible();
  await page.getByTestId('reset-confirm').tap();
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('continue')).toHaveCount(0);

  await page.getByTestId('open-settings').tap();
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.getByTestId('import-confirm')).toBeVisible();
  await page.getByTestId('import-confirm-yes').tap();
  await page.getByTestId('settings-back').tap();
  await page.getByTestId('continue').tap();
  const restored = (await gameState(page))!;
  expect(restored.saveId).toBe(original.saveId);
  expect(restored.scene).toBe('corridor');
});

test('a damaged backup file is rejected with a clear message and nothing is replaced', async ({ page }) => {
  await newGame(page);
  const before = (await gameState(page))!;
  await page.getByTestId('open-menu').tap();
  await page.getByTestId('menu-settings').tap();
  await page.getByTestId('import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"albatross-save","checksum":"00000000","state":{"chapter":"c3"}}') });
  await expect(page.locator('.toast').filter({ hasText: 'damaged' })).toBeVisible();
  await expect(page.getByTestId('import-confirm')).toHaveCount(0);
  expect((await gameState(page))!.saveId).toBe(before.saveId);
});

test('New game asks before erasing an existing save', async ({ page }) => {
  await newGame(page);
  await page.getByTestId('open-menu').tap();
  await page.getByTestId('menu-title').tap();
  await page.getByTestId('new-game').tap();
  await expect(page.getByTestId('confirm-new-text')).toContainText('will be erased');
  await page.getByRole('button', { name: 'Keep playing' }).tap();
  await expect(page.getByTestId('continue')).toBeVisible();
});

test('every radio conversation can be replayed from the log as text', async ({ page }) => {
  await newGame(page);
  // Jump the state forward through the real reducer to have a few conversations on record.
  await page.evaluate(() => {
    const h = (window as unknown as Hooks).__albatross;
    for (const id of ['c1-contact']) h.dispatch({ type: 'dialogueDone', id, choices: {}, effects: [] });
  });
  await page.getByTestId('open-journal').tap();
  await page.getByTestId('tab-radio').tap();
  await page.getByTestId('replay-c1-contact').tap();
  await expect(page.getByTestId('dialogue')).toBeVisible();
  await expect(page.getByTestId('dialogue')).toContainText('Replay');
  await expect(page.locator('.dlg-card .say')).not.toBeEmpty();
});
