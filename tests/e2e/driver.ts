// Plays the game through the real touch UI, exactly as a player would: tapping hotspots, using
// the travel/items/radio panels, reading dialogue, and solving every puzzle with its own controls
// (taps, touch drags, sliders, pickers). No puzzle is marked solved through a back door.
import { expect, type Page } from '@playwright/test';
import { WALKTHROUGH, type WStep } from '../walkthrough';
import * as L from '../../src/puzzles/logic';

const tid = (page: Page, id: string) => page.getByTestId(id);
async function tap(page: Page, id: string, times = 1) {
  for (let i = 0; i < times; i += 1) await tid(page, id).tap();
}
async function tapButton(page: Page, nearTestId: string, name: string, times = 1) {
  const btn = tid(page, nearTestId).locator('xpath=..').getByRole('button', { name, exact: true });
  for (let i = 0; i < times; i += 1) await btn.tap();
}
const visible = (page: Page, id: string) => tid(page, id).first().isVisible();
/** A finger tap at the centre of an element's box (for SVG groups whose box spans clipped art). */
export async function touchAt(page: Page, locator: ReturnType<Page['locator']>) {
  await locator.scrollIntoViewIfNeeded();
  const b = (await locator.boundingBox())!;
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}

/** A real one-finger drag (touchstart → touchmove… → touchend) via the DevTools protocol. */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 10) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let i = 1; i <= steps; i += 1) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

// ------------------------------------------------------------------ puzzle solvers (UI only)

function rushPath(): { id: string; to: number }[] {
  const key = (bs: L.Block[]) => bs.map((b) => (b.horiz ? b.c : b.r)).join(',');
  const prev = new Map<string, { from: string; id: string; to: number } | null>([[key(L.RUSH_START), null]]);
  const states = new Map<string, L.Block[]>([[key(L.RUSH_START), L.RUSH_START]]);
  let frontier = [L.RUSH_START];
  while (frontier.length) {
    const next: L.Block[][] = [];
    for (const s of frontier) {
      if (L.rushSolved(s)) {
        const moves: { id: string; to: number }[] = [];
        for (let k = key(s); prev.get(k); k = prev.get(k)!.from) moves.unshift({ id: prev.get(k)!.id, to: prev.get(k)!.to });
        return moves;
      }
      for (const b of s) {
        const [lo, hi] = L.rushRange(s, b.id);
        for (let p = lo; p <= hi; p += 1) {
          if (p === (b.horiz ? b.c : b.r)) continue;
          const n = L.rushMove(s, b.id, p);
          const k = key(n);
          if (prev.has(k)) continue;
          prev.set(k, { from: key(s), id: b.id, to: p });
          states.set(k, n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  throw new Error('rush unsolvable');
}

function mirrorTarget(): Record<string, number> {
  const cells = L.MIRROR_GRID.flatMap((row, r) => row.split('').flatMap((ch, c) => (ch === 'M' ? [`${r},${c}`] : [])));
  for (let mask = 0; mask < 1 << cells.length; mask += 1) {
    const o: Record<string, number> = {};
    cells.forEach((k, i) => (o[k] = (mask >> i) & 1));
    if (L.mirrorSolved(o)) return o;
  }
  throw new Error('mirror unsolvable');
}

function ratPlan(): L.RatNode[] {
  let frontier: L.RatNode[][] = [[]];
  for (let t = 0; t < L.RAT_MAX_STEPS; t += 1) {
    const next: L.RatNode[][] = [];
    for (const plan of frontier) {
      const pos = plan.length ? plan[plan.length - 1] : 'L';
      for (const n of L.RAT_NODES) {
        if (n !== pos && !L.ratAdjacent(pos, n)) continue;
        const p = [...plan, n];
        const r = L.ratSimulate(p);
        if (r.ok) return p;
        if (r.caughtAt === undefined) next.push(p);
      }
    }
    frontier = next;
  }
  throw new Error('rat run unsolvable');
}

function catwalkPath(): string[] {
  const nodes = L.CW_FRAMES.flatMap((f) => L.CW_ROWS.map((r) => `${f}${r}`));
  const prev = new Map<string, string>([[L.CW_START, '']]);
  const q = [L.CW_START];
  while (q.length) {
    const n = q.shift()!;
    for (const m of nodes) {
      const k = L.cwEdgeKey(n, m);
      if (!k || !L.cwEdgeSafe(k) || prev.has(m)) continue;
      prev.set(m, n);
      q.push(m);
    }
  }
  const path: string[] = [];
  for (let n = L.CW_GOAL; n; n = prev.get(n)!) path.unshift(n);
  return path;
}

export const SOLVERS: Record<string, (page: Page) => Promise<void>> = {
  async P01(page) {
    for (let t = 0; t < 9; t += 1) {
      // Tap the tile's own square (the group's box also spans the clipped drawing).
      await touchAt(page, tid(page, `mtile-${t}`).locator('rect').first());
      await tap(page, `mcell-${t}`);
    }
  },
  async P02(page) {
    const svg = tid(page, 'rush');
    for (const m of rushPath()) {
      const box = (await svg.boundingBox())!;
      const scale = box.width / 600;
      const blk = (await tid(page, `blk-${m.id}`).boundingBox())!;
      const b = L.RUSH_START.find((x) => x.id === m.id)!;
      const state = await page.evaluate(() => (window as never as { __albatross: { state: () => { puzzle: Record<string, { pos?: number[] }> } } }).__albatross.state().puzzle.P02?.pos);
      const idx = L.RUSH_START.findIndex((x) => x.id === m.id);
      const cur = state ? state[idx] : b.horiz ? b.c : b.r;
      // Start the drag inside the block's first cell (labels can overhang the block).
      const cell = 92 * scale;
      const from = { x: blk.x + cell / 2, y: blk.y + cell / 2 };
      const d = (m.to - cur) * cell;
      await touchDrag(page, from, b.horiz ? { x: from.x + d, y: from.y } : { x: from.x, y: from.y + d });
      await page.waitForTimeout(220);
    }
  },
  async P03(page) {
    for (const [socket, valve] of Object.entries(L.VALVE_SOLUTION)) {
      await tap(page, `valve-${valve}`);
      await tap(page, `socket-${socket}`);
    }
    await tap(page, 'valves-test');
  },
  async P04(page) {
    for (let r = 0; r < 5; r += 1)
      for (let c = 0; c < 5; c += 1) {
        if (L.NET_FIXED.has(`${r},${c}`)) continue;
        const n = (4 - (L.NET_SCRAMBLE[r][c] % 4)) % 4;
        if (n) await tap(page, `net-${r}-${c}`, n);
      }
    await expect(tid(page, 'tuner')).toBeVisible();
    await tid(page, 'tune').fill(String(L.TUNE_TARGET));
    await tap(page, 'tune-lock');
  },
  async P05(page) {
    // Wipe the frost off the lid with horizontal finger swipes.
    const svg = tid(page, 'piano');
    await svg.scrollIntoViewIfNeeded();
    const box = (await svg.boundingBox())!;
    const k = box.width / 600;
    for (let y = 25; y <= 400 && !(await visible(page, 'piano-options')); y += 50) {
      await touchDrag(page, { x: box.x + 5 * k, y: box.y + y * k }, { x: box.x + 595 * k, y: box.y + y * k }, 24);
    }
    await tap(page, `piano-${L.PIANO_FALSE}`);
  },
  async P06(page) {
    await tap(page, `nm-${L.NEXT_MINUTE_ANSWER}`);
    await tap(page, 'nm-tell');
  },
  async P07(page) {
    await tap(page, `hide-${L.HIDING_ANSWER}`);
  },
  async P08(page) {
    await tap(page, `win-${L.SILHOUETTE_ANSWER}`);
    await tap(page, 'sil-tell');
  },
  async P09(page) {
    const d = L.CORRIDOR_DOORS.find((x) => x.real === 6)!;
    await tap(page, `door-${d.side}-${d.pos}`);
  },
  async P10(page) {
    await tap(page, 'cipher-right', L.CIPHER_OFFSET);
    await tap(page, 'cipher-try');
  },
  async P11(page) {
    for (const [i, card] of L.STACK_ANSWER.entries()) {
      const ups = card.v - 1;
      if (ups <= 6) await tap(page, `lock-${i}-up`, ups);
      else await tap(page, `lock-${i}-down`, 13 - ups);
      await tap(page, `lock-${i}-${card.s}`);
    }
    await tap(page, 'stack-open');
  },
  async P12(page) {
    const target = mirrorTarget();
    for (const [k, v] of Object.entries(target)) {
      if ((L.MIRROR_INITIAL[k] ?? 0) !== v) await tap(page, `mir-${k.replace(',', '-')}`);
    }
  },
  async P13(page) {
    let pos: L.RatNode = 'L';
    for (const n of ratPlan()) {
      await tap(page, n === pos ? 'rat-wait' : `rat-go-${n}`);
      pos = n;
    }
    await tap(page, 'rat-send');
  },
  async P14(page) {
    await tap(page, `hand-${L.HAND_ANSWER}`);
    await tap(page, 'hand-accuse');
  },
  async P15(page) {
    await tap(page, 'wave-freq-up', L.WAVE_TARGET.freq - 4);
    await tap(page, 'wave-amp-up', L.WAVE_TARGET.amp - 2);
    await tap(page, 'wave-phase-up', L.WAVE_TARGET.phase / 30);
    await tap(page, 'wave-lock');
  },
  async P16(page) {
    for (let col = 0; col < 16; col += 1) if (!L.LULLABY_PRESENT.includes(col)) await tap(page, `pin-${col}-${L.LULLABY[col]}`);
    await tap(page, 'lullaby-play');
  },
  async P17(page) {
    for (const m of L.BROOCH_SEQUENCE) await tap(page, `brooch-${m}`);
  },
  async P18(page) {
    for (const n of catwalkPath().slice(1)) await tap(page, `node-${n}`);
    await tap(page, 'cw-cross');
  },
  async P19(page) {
    for (const b of L.BALLAST_SOLUTION) await tap(page, `bag-${b}`);
    await tap(page, 'ballast-release');
  },
  async P20(page) {
    await tap(page, `handle-${L.CORD_ANSWER}`);
  },
  async P21(page) {
    // Heading starts at 180°.
    await tapButton(page, 'heading-value', '+10', 5);
    await tap(page, 'heading-plus', L.STAR_TARGET_AZ - 230);
    await expect(tid(page, 'heading-value')).toHaveText('233°');
    await tap(page, 'star-tell');
  },
  async P22(page) {
    await tid(page, 'light-a').selectOption(L.LIGHT_A.answer);
    await tid(page, 'light-b').selectOption(L.LIGHT_B.answer);
    await tapButton(page, 'bear-a-value', '−10', 3); // 090 → 060
    await tapButton(page, 'bear-b-value', '−10', 5); // 000 → 310
    await tap(page, 'bear-b-minus', 5); // → 305
    await expect(tid(page, 'bear-a-value')).toHaveText('060°');
    await expect(tid(page, 'bear-b-value')).toHaveText('305°');
    await tap(page, 'lights-fix');
  },
  async P23(page) {
    await tapButton(page, 'compass-value', '+10', 8);
    await tap(page, 'compass-plus', 1);
    await expect(tid(page, 'compass-value')).toHaveText('081');
    await tap(page, 'course-tell');
  },
  async P24(page) {
    await tid(page, 'gears').scrollIntoViewIfNeeded();
    await page.locator('[data-testid^="gear-3-"]').first().tap();
    await tap(page, 'peg-A');
    await page.locator('[data-testid^="gear-2-"]').first().tap();
    await tap(page, 'peg-E');
    await tap(page, 'gears-turn');
  },
  async P26(page) {
    for (const a of L.ANOMALIES) {
      await tap(page, `anom-${a.id}`);
      await tap(page, `logpick-${a.log}`);
    }
    await tap(page, 'appendix-compare');
  },
  async P27(page) {
    await tap(page, 'decide-rewrite');
    await tap(page, 'digit-1-up', 8);
    await tap(page, 'digit-2-up', 1);
    await tid(page, 'card-underline').check();
    await tap(page, 'card-give');
    await tid(page, 'descent-slider').fill('3');
    await tap(page, 'rate-210');
    await tap(page, 'descent-go');
    await tid(page, 'tel-SA').selectOption('1');
    await tid(page, 'tel-PA').selectOption('-1');
    await tid(page, 'tel-PF').selectOption('0');
    await tap(page, 'landing-ring');
  },
};

// ------------------------------------------------------------------ dialogue & flow

/** Reads through queued radio conversations (and chapter cards) until the scene is free. */
export async function playThroughDialogue(page: Page, opts: { expect?: boolean } = {}) {
  if (opts.expect) {
    await expect(page.locator('[data-testid=dialogue], [data-testid=chapter-card], [data-testid=ending]').first()).toBeVisible({ timeout: 15_000 });
  }
  const quiz = new Map<string, number>();
  let quiet = 0;
  for (let guard = 0; guard < 2000 && quiet < 4; guard += 1) {
    if (await visible(page, 'ending')) return;
    if (await visible(page, 'chapter-card')) {
      await tap(page, 'chapter-continue');
      quiet = 0;
      continue;
    }
    if (await visible(page, 'dialogue')) {
      quiet = 0;
      if (await visible(page, 'dlg-skip')) {
        await tid(page, 'dlg-skip').tap({ timeout: 2000 }).catch(() => undefined);
        continue;
      }
      const choices = tid(page, 'dlg-choice');
      const n = await choices.count();
      if (n) {
        const texts = (await choices.allTextContents()).join('|');
        const who = (await page.locator('.dlg-card .who').first().textContent())?.trim();
        let idx = 0;
        if (who !== 'You') {
          // A quiz: answer like a player, trying options until one is accepted.
          idx = quiz.get(texts) ?? 0;
          quiz.set(texts, idx + 1);
        }
        await choices.nth(Math.min(idx, n - 1)).tap({ timeout: 2000 }).catch(() => undefined);
        continue;
      }
      if (await visible(page, 'dlg-next')) await tid(page, 'dlg-next').tap({ timeout: 2000 }).catch(() => undefined);
      continue;
    }
    quiet += 1;
    await page.waitForTimeout(250);
  }
}

async function closeLooseSheets(page: Page) {
  for (let i = 0; i < 4; i += 1) {
    if (await visible(page, 'puzzle')) return;
    const sheet = page.locator('[data-testid=doc], [data-testid=closeup], [data-testid=item-sheet], [data-testid=items], [data-testid=travel], [data-testid=radio]').last();
    if (!(await sheet.isVisible())) return;
    await sheet.getByTestId('sheet-close').first().tap();
    await page.waitForTimeout(150);
  }
}

async function ensurePuzzle(page: Page, id: string) {
  const frame = page.locator(`[data-testid=puzzle][data-puzzle=${id}]`);
  if (await frame.isVisible()) return;
  await closeLooseSheets(page);
  await tap(page, 'open-radio');
  await tap(page, `radio-task-${id}`);
  await expect(frame).toBeVisible();
}

export async function runStep(page: Page, s: WStep) {
  if ('talk' in s) {
    await playThroughDialogue(page, { expect: true });
    return;
  }
  await playThroughDialogue(page);
  if ('travel' in s) {
    await closeLooseSheets(page);
    await tap(page, 'open-travel');
    await tap(page, `go-${s.travel}`);
    await expect(tid(page, 'game')).toHaveAttribute('data-scene', s.travel);
    return;
  }
  if ('item' in s) {
    await closeLooseSheets(page);
    await tap(page, 'open-items');
    await tap(page, `item-${s.item}`);
    await tid(page, 'item-action').filter({ hasText: s.action }).tap();
    return;
  }
  if ('solve' in s) {
    await ensurePuzzle(page, s.solve);
    await SOLVERS[s.solve](page);
    await expect(tid(page, 'puzzle-solved')).toBeVisible({ timeout: 20_000 });
    await tap(page, 'puzzle-continue');
    await expect(tid(page, 'puzzle')).toHaveCount(0);
    return;
  }
  await closeLooseSheets(page);
  await tid(page, `hs-${s.tap}`).tap();
  if (s.action) await tid(page, 'closeup-action').filter({ hasText: s.action }).tap();
  await page.waitForTimeout(150);
  // Evidence opened by a tap is read and put away before moving on.
  if (await visible(page, 'doc')) await closeLooseSheets(page);
}

/** Index of the walkthrough step just after a puzzle is solved and its conversation is over. */
export function indexAfter(puzzleId: string): number {
  let j = WALKTHROUGH.findIndex((s) => 'solve' in s && s.solve === puzzleId) + 1;
  while (j < WALKTHROUGH.length && 'talk' in WALKTHROUGH[j]) j += 1;
  return j;
}

export async function runSteps(page: Page, from: number, to: number, log?: (msg: string) => void) {
  for (let i = from; i < to; i += 1) {
    const s = WALKTHROUGH[i];
    log?.(`step ${i}: ${JSON.stringify(s)}`);
    try {
      await runStep(page, s);
    } catch (error) {
      throw new Error(`Walkthrough step ${i} ${JSON.stringify(s)} failed: ${(error as Error).message}`);
    }
  }
}
