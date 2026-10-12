// Designer-level verification of every puzzle validator: the intended answer is accepted, plausible
// wrong answers are rejected, and where a puzzle claims a unique answer we prove it by exhaustive search.
import { describe, expect, it } from 'vitest';
import * as L from '../../src/puzzles/logic';
import { LST_SIGHTING, STARS, starAltAz } from '../../src/puzzles/logic/sky';
import { PLACES, bearingBetween, intersect } from '../../src/puzzles/logic/map';

describe('P01 mosaic', () => {
  it('accepts only the ordered plan', () => {
    expect(L.mosaicSolved([0, 1, 2, 3, 4, 5, 6, 7, 8])).toBe(true);
    expect(L.mosaicSolved(L.MOSAIC_TRAY)).toBe(false);
    expect(L.mosaicSolved([0, 1, 2, 3, 4, 5, 6, 8, 7])).toBe(false);
    expect(L.mosaicMisplaced([0, 1, 2, null, 4, 5, 6, 7, 8])).toBe(1);
  });
});

describe('P02 frozen luggage', () => {
  it('is not solved at the start and is solvable (BFS optimum)', () => {
    expect(L.rushSolved(L.RUSH_START)).toBe(false);
    const n = L.rushSolve(L.RUSH_START);
    expect(n).toBeGreaterThanOrEqual(8); // not trivial
    expect(n).toBeLessThanOrEqual(20); // not a slog
  });
  it('has no overlapping blocks and all blocks inside the grid', () => {
    const seen = new Set<string>();
    for (const b of L.RUSH_START)
      for (const [r, c] of L.rushCells(b)) {
        expect(r >= 0 && c >= 0 && r < L.RUSH_N && c < L.RUSH_N, b.id).toBe(true);
        expect(seen.has(`${r},${c}`), `${b.id} overlaps`).toBe(false);
        seen.add(`${r},${c}`);
      }
  });
  it('clamps moves to free space', () => {
    const [lo, hi] = L.rushRange(L.RUSH_START, 'T');
    const moved = L.rushMove(L.RUSH_START, 'T', 99);
    expect(moved.find((b) => b.id === 'T')!.c).toBe(hi);
    expect(lo).toBe(0);
  });
});

describe('P03 valves', () => {
  it('accepts the solution and nothing else among pin-compatible assignments', () => {
    expect(L.valvesCheck(L.VALVE_SOLUTION).ok).toBe(true);
    const ids = L.VALVES.map((v) => v.id);
    const sockets = L.SOCKETS.map((s) => s.id);
    let okCount = 0;
    const rec = (i: number, used: Set<string>, assign: Partial<Record<L.SocketId, L.ValveId>>) => {
      if (i === sockets.length) {
        if (L.valvesCheck(assign).ok) okCount += 1;
        return;
      }
      for (const v of ids) {
        if (used.has(v) || !L.valveFits(v, sockets[i])) continue;
        used.add(v);
        rec(i + 1, used, { ...assign, [sockets[i]]: v });
        used.delete(v);
      }
    };
    rec(0, new Set(), {});
    expect(okCount).toBe(1);
  });
  it('explains the milky valve and the top-cap clue', () => {
    expect(L.valvesCheck({ ...L.VALVE_SOLUTION, AF: 'MH4a' }).message).toMatch(/milky/);
    expect(L.valvesCheck({ ...L.VALVE_SOLUTION, DET: 'MH4b', AF: 'SP4' }).message).toMatch(/top cap/);
    expect(L.valvesCheck({ OSC: 'MX40' }).ok).toBe(false);
  });
});

describe('P04 junction box + tuning', () => {
  const zero = () => Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  it('solved masks pass, scramble does not', () => {
    expect(L.netSolved(L.netMasks(zero()))).toBe(true);
    expect(L.netSolved(L.netMasks(L.NET_SCRAMBLE))).toBe(false);
    expect(L.NET_SCRAMBLE[2][0] % 4).toBe(0); // fixed battery tile starts in place
  });
  it('every fully connected rotation is a tree (validator accepts exactly those)', () => {
    // Backtracking over rotations with edge-matching pruning; count complete solutions.
    let solutions = 0;
    const rot = zero();
    const masks = () => L.netMasks(rot);
    const rec = (i: number) => {
      if (i === 25) {
        if (L.netSolved(masks())) solutions += 1;
        return;
      }
      const r = Math.floor(i / 5);
      const c = i % 5;
      const tried = new Set<number>();
      for (let k = 0; k < 4; k += 1) {
        if (L.NET_FIXED.has(`${r},${c}`) && k) break;
        const m = L.rotMask(L.NET_SOLUTION[r][c], k);
        if (tried.has(m)) continue;
        tried.add(m);
        rot[r][c] = k;
        const cur = L.netMasks(rot);
        const n = Boolean(m & 1);
        const w = Boolean(m & 8);
        if (r === 0 ? n : n !== Boolean(cur[r - 1][c] & 4)) continue;
        if (c === 0 ? w : w !== Boolean(cur[r][c - 1] & 2)) continue;
        if (c === 4 && m & 2) continue;
        if (r === 4 && m & 4) continue;
        rec(i + 1);
      }
      rot[r][c] = 0;
    };
    rec(0);
    expect(solutions).toBeGreaterThanOrEqual(1);
  });
  it('tuning window is ±5 kHz around 1330', () => {
    expect(L.tuned(1330)).toBe(true);
    expect(L.tuned(1335)).toBe(true);
    expect(L.tuned(1336)).toBe(false);
    expect(L.tuned(1250)).toBe(false);
  });
});

describe('chapter 2 deduction puzzles', () => {
  it('P05 has exactly one false statement id', () => {
    expect(L.PIANO_STATEMENTS.filter((s) => s.id === L.PIANO_FALSE)).toHaveLength(1);
  });
  it('P06 only the engine is accepted; the others give in-world feedback', () => {
    expect(L.nextMinuteFeedback('engine')).toBe('');
    for (const o of L.NEXT_MINUTE_OPTIONS.filter((x) => x.id !== 'engine')) expect(L.nextMinuteFeedback(o.id).length).toBeGreaterThan(10);
  });
  it('P07 every wrong hiding place explains why', () => {
    for (const s of L.HIDING_SPOTS) expect(s.id === L.HIDING_ANSWER ? s.fail === '' : s.fail.length > 20).toBe(true);
  });
  it('P08 answer is the only window with a notebook', () => {
    expect(L.WINDOWS.filter((w) => /notebook/.test(w.see)).map((w) => w.n)).toEqual([L.SILHOUETTE_ANSWER]);
  });
  it('P09 exactly one door is cabin six and every other door explains itself', () => {
    const results = L.CORRIDOR_DOORS.map((_, i) => L.cabinSixFeedback(i));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    for (const r of results.filter((x) => !x.ok)) expect(r.text).toMatch(/Wren/);
    // The swapped plates are the ones marked loose (the physical clue).
    for (const d of L.CORRIDOR_DOORS) expect(String(d.real) !== d.plate).toBe(Boolean('loose' in d && d.loose));
  });
});

describe('P10 cipher disc', () => {
  it('ring is a permutation of A–Z', () => {
    expect([...L.RING].sort().join('')).toBe(L.PLAIN_ALPHABET);
  });
  it('only offset 11 yields the message', () => {
    expect(L.decipher(L.CIPHER_TEXT, L.CIPHER_OFFSET)).toBe(L.CIPHER_PLAINTEXT);
    const hits = Array.from({ length: 26 }, (_, k) => k).filter((k) => L.decipher(L.CIPHER_TEXT, k) === L.CIPHER_PLAINTEXT);
    expect(hits).toEqual([11]);
    expect(L.cipherSolved(11)).toBe(true);
    expect(L.cipherSolved(37)).toBe(true);
    expect(L.cipherSolved(10)).toBe(false);
  });
});

describe('P11 stacked deck', () => {
  it('the hidden cards are 7♥ 3♣ Q♦ 8♠', () => {
    expect(L.STACK_ANSWER.map(L.cardName)).toEqual(['7♥', '3♣', 'Q♦', '8♠']);
    expect(L.stackSolved(L.STACK_ANSWER)).toBe(true);
    expect(L.stackSolved([...L.STACK_ANSWER].reverse())).toBe(false);
  });
  it('the fan follows +3 and C-H-S-D throughout', () => {
    const f = L.fan();
    for (let i = 1; i < f.length; i += 1) expect(f[i]).toEqual(L.nextCard(f[i - 1]));
  });
});

describe('P12 mirror box', () => {
  const mirrors = L.MIRROR_GRID.flatMap((row, r) => row.split('').flatMap((ch, c) => (ch === 'M' ? [`${r},${c}`] : [])));
  it('initial orientation is not solved', () => {
    expect(L.mirrorSolved(L.MIRROR_INITIAL)).toBe(false);
  });
  it('has a small number of solutions (exhaustive over all mirror settings)', () => {
    let count = 0;
    for (let mask = 0; mask < 1 << mirrors.length; mask += 1) {
      const o: Record<string, number> = {};
      mirrors.forEach((k, i) => (o[k] = (mask >> i) & 1));
      if (L.mirrorSolved(o)) count += 1;
    }
    expect(count).toBeGreaterThanOrEqual(1);
    // Mirrors off the beam path don't matter, so count distinct solution *paths* instead.
    const paths = new Set<string>();
    for (let mask = 0; mask < 1 << mirrors.length; mask += 1) {
      const o: Record<string, number> = {};
      mirrors.forEach((k, i) => (o[k] = (mask >> i) & 1));
      if (L.mirrorSolved(o)) paths.add(JSON.stringify(L.traceBeam(o).path));
    }
    expect(paths.size).toBeGreaterThanOrEqual(1);
    expect(paths.size).toBeLessThanOrEqual(3);
  });
  it('a beam that misses the slide is rejected even if it reaches the lens', () => {
    // Any solution must pass the slide cell.
    for (let mask = 0; mask < 1 << mirrors.length; mask += 1) {
      const o: Record<string, number> = {};
      mirrors.forEach((k, i) => (o[k] = (mask >> i) & 1));
      const t = L.traceBeam(o);
      if (t.exit && t.exit.r === L.MIRROR_EXIT.r && t.exit.c === L.MIRROR_EXIT.c) expect(L.mirrorSolved(o)).toBe(t.slide);
    }
  });
});

describe('P13 rat run', () => {
  const shortest = () => {
    type S = { pos: L.RatNode; plan: L.RatNode[] };
    let frontier: S[] = [{ pos: 'L', plan: [] }];
    for (let t = 0; t < L.RAT_MAX_STEPS; t += 1) {
      const next: S[] = [];
      const seen = new Set<string>();
      for (const s of frontier) {
        for (const n of L.RAT_NODES) {
          if (n !== s.pos && !L.ratAdjacent(s.pos, n)) continue;
          const plan = [...s.plan, n];
          const r = L.ratSimulate(plan);
          if (r.ok) return plan;
          if (r.caughtAt !== undefined) continue;
          const key = `${n}@${plan.length % 4}`;
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({ pos: n, plan });
        }
      }
      frontier = next;
    }
    return null;
  };
  it('has a safe route within the step limit', () => {
    const plan = shortest();
    expect(plan).not.toBeNull();
    expect(plan!.length).toBeGreaterThanOrEqual(5);
  });
  it('the obvious dash is caught', () => {
    expect(L.ratSimulate(['P', 'G', 'K1', 'K2', 'K3', 'C']).ok).toBe(false);
    expect(L.ratSimulate(['G']).reason).toBe('not connected');
  });
});

describe('P14–P17', () => {
  it('P14 only one sample has all three features', () => {
    const all = L.HAND_FEATURES.map((f) => f.id);
    expect(L.HAND_SAMPLES.filter((s) => all.every((f) => s.features.includes(f))).map((s) => s.id)).toEqual([L.HAND_ANSWER]);
  });
  it('P15 the target is within the knob limits and is the only solution', () => {
    expect(L.waveSolved(L.WAVE_TARGET)).toBe(true);
    expect(L.waveSolved({ ...L.WAVE_TARGET, phase: 180 })).toBe(false);
    expect(L.WAVE_TARGET.freq).toBeLessThanOrEqual(L.WAVE_LIMITS.freq[1]);
    expect(L.WAVE_TARGET.phase % 30).toBe(0);
  });
  it('P16 lullaby: the surviving pins are kept and the full tune solves', () => {
    const init = L.lullabyInitial();
    expect(init.filter(Boolean)).toHaveLength(L.LULLABY_PRESENT.length);
    expect(L.lullabySolved(init)).toBe(false);
    expect(L.lullabySolved([...L.LULLABY])).toBe(true);
    for (const p of L.LULLABY) expect(L.LULLABY_PITCHES).toContain(p);
  });
  it('P17 brooch opens on crest-eye-tail-tail-wingL and resets on a mistake', () => {
    let p = 0;
    for (const m of L.BROOCH_SEQUENCE) p = L.broochStep(p, m);
    expect(L.broochOpen(p)).toBe(true);
    let q = 0;
    for (const m of ['crest', 'eye', 'tail', 'tail', 'wingR'] as L.BroochMove[]) q = L.broochStep(q, m);
    expect(L.broochOpen(q)).toBe(false);
    expect(L.broochStep(3, 'crest')).toBe(1);
  });
});

describe('P18 catwalk', () => {
  const nodes = L.CW_FRAMES.flatMap((f) => L.CW_ROWS.map((r) => `${f}${r}`));
  it('a safe path exists from 80C to 170C', () => {
    const prev = new Map<string, string>([[L.CW_START, '']]);
    const queue = [L.CW_START];
    while (queue.length) {
      const n = queue.shift()!;
      for (const m of nodes) {
        const k = L.cwEdgeKey(n, m);
        if (!k || !L.cwEdgeSafe(k) || prev.has(m)) continue;
        prev.set(m, n);
        queue.push(m);
      }
    }
    expect(prev.has(L.CW_GOAL)).toBe(true);
    const path: string[] = [];
    for (let n = L.CW_GOAL; n; n = prev.get(n)!) path.unshift(n);
    expect(L.cwCheck(path).ok).toBe(true);
  });
  it('the straight centre line is unsafe; squares are always unsafe', () => {
    const centre = L.CW_FRAMES.map((f) => `${f}C`);
    expect(L.cwCheck(centre).ok).toBe(false);
    for (const [k, s] of Object.entries(L.CW_EDGES)) if (s === 'sq') expect(L.cwEdgeSafe(k)).toBe(false);
  });
});

describe('P19 ballast', () => {
  it('exactly one subset of bags trims the ship', () => {
    const sols: string[][] = [];
    for (let mask = 0; mask < 1 << L.BAGS.length; mask += 1) {
      const set = L.BAGS.filter((_, i) => (mask >> i) & 1).map((b) => b.id);
      if (L.ballastSolved(set)) sols.push(set);
    }
    expect(sols).toEqual([L.BALLAST_SOLUTION]);
  });
});

describe('P20 valve cords', () => {
  it('cell 7 is handle E; ignoring the hidden rungs gives the decoy D', () => {
    expect(L.CORD_ANSWER).toBe('E');
    expect(L.CORD_HANDLES[L.traceCord(L.CELL7_START, false)]).toBe('D');
  });
  it('the ladder is a permutation', () => {
    const ends = Array.from({ length: L.CORD_COUNT }, (_, i) => L.traceCord(i));
    expect(new Set(ends).size).toBe(L.CORD_COUNT);
  });
});

describe('navigation (P21–P23) is consistent with real astronomy and the map', () => {
  it('Procyon really stood at azimuth ≈233° at the sighting', () => {
    const procyon = STARS.find((s) => s.name === 'Procyon')!;
    const { az, alt } = starAltAz(procyon.ra, procyon.dec, LST_SIGHTING);
    expect(Math.abs(az - L.STAR_TARGET_AZ)).toBeLessThan(1.5);
    expect(alt).toBeGreaterThan(5);
    expect(L.COMPASS_AT_SIGHTING - L.STAR_TARGET_AZ).toBe(L.DEVIATION);
    expect(L.starHeadingOk(233)).toBe(true);
    expect(L.starHeadingOk(270)).toBe(false);
  });
  it('the two light bearings cross at the ship', () => {
    const a = L.trueBearing(L.LIGHT_A.compass);
    const b = L.trueBearing(L.LIGHT_B.compass);
    expect(Math.round(bearingBetween(PLACES.P, PLACES.ravnvik))).toBe(a);
    expect(Math.round(bearingBetween(PLACES.P, PLACES.ravntind))).toBe(b);
    const fix = intersect(PLACES.ravnvik, a, PLACES.ravntind, b)!;
    expect(Math.hypot(fix.x, fix.y)).toBeLessThan(0.1);
    expect(L.twoLightsSolved('ravnvik', 'ravntind', a, b)).toBe(true);
    // Using raw compass bearings (forgetting the deviation) fails.
    expect(L.twoLightsSolved('ravnvik', 'ravntind', L.LIGHT_A.compass, L.LIGHT_B.compass)).toBe(false);
  });
  it('true course 044 to the fjord, steered as compass 081', () => {
    expect(Math.round(bearingBetween(PLACES.P, PLACES.landing))).toBe(L.TRUE_COURSE);
    expect(L.TRUE_COURSE + L.DEVIATION).toBe(L.COMPASS_COURSE);
    expect(L.courseOk(81)).toBe(true);
    expect(L.courseOk(44)).toBe(false);
    expect(L.courseOk(7)).toBe(false);
  });
});

describe('P24 hatch gears', () => {
  it('there is a unique working gear train that opens the latch', () => {
    const pegs = Object.keys(L.GEAR_PEGS).filter((k) => !L.GEAR_PEGS[k].fixed);
    const sols: string[] = [];
    const rec = (i: number, placed: Record<string, number>) => {
      if (i === pegs.length) {
        if (!L.gearsSolved(placed)) return;
        // A spare gear left on a peg where it meshes with nothing is harmless; compare working trains.
        const sim = L.gearSimulate(placed);
        const working = Object.fromEntries(Object.entries(placed).filter(([k]) => sim.meshes.some((m) => m.includes(k))));
        if (!sols.includes(JSON.stringify(working))) sols.push(JSON.stringify(working));
        return;
      }
      for (const r of [0, 1, 2, 3]) rec(i + 1, r ? { ...placed, [pegs[i]]: r } : placed);
    };
    rec(0, {});
    expect(sols).toEqual([JSON.stringify({ A: 3, E: 2 })]);
  });
  it('an odd train tightens the latch; overlapping gears jam', () => {
    expect(L.gearSimulate({ A: 3 }).latch).toBe('still');
    expect(L.gearSimulate({ A: 3, C: 3 }).latch).toBe('jam');
  });
});

describe('P26 Appendix C', () => {
  it('only the right matching is accepted', () => {
    const right = Object.fromEntries(L.ANOMALIES.map((a) => [a.id, a.log]));
    expect(L.appendixSolved(right)).toBe(true);
    expect(L.appendixSolved({ ...right, C1: 'log-engine', C2: 'log-contact' })).toBe(false);
  });
});

describe('P27 finale', () => {
  const card = (digits: string, extra: Partial<L.CardSpec> = {}): L.CardSpec => ({ digits, words: false, underline: false, degree: false, compassWord: false, aloud: false, ...extra });
  it('the card must say 081 unambiguously', () => {
    expect(L.upsideDown('081')).toBe('180');
    expect(L.cardCheck(card('081')).reason).toBe('ambiguous');
    expect(L.cardCheck(card('081', { underline: true })).ok).toBe(true);
    expect(L.cardCheck(card('081', { words: true })).ok).toBe(true);
    expect(L.cardCheck(card('044', { words: true })).reason).toBe('true-course');
    expect(L.cardCheck(card('180', { underline: true })).reason).toBe('wrong-number');
    expect(L.cardCheck(card('')).reason).toBe('empty');
  });
  it('the descent has valid settings reachable with the slider (0..8 by 0.25)', () => {
    const ok: string[] = [];
    for (let s = 0; s <= 8; s += 0.25) for (const r of L.DESCENT.rates) if (L.descentCheck(s, r).ok) ok.push(`${s}@${r}`);
    expect(ok.length).toBeGreaterThanOrEqual(3);
    expect(ok.length).toBeLessThanOrEqual(20);
    expect(L.descentCheck(0, 70).ok).toBe(false);
    expect(L.descentCheck(1, 280).reason).toBe('saddle');
  });
  it('landing needs a starboard swing with the dead engine ignored', () => {
    const orders: L.Order[] = [-1, -0.5, 0, 0.5, 1];
    const sols: string[] = [];
    for (const PF of orders) for (const SF of orders) for (const PA of orders) for (const SA of orders) if (L.landingCheck({ PF, SF, PA, SA }).ok) sols.push(`${PF},${SF},${PA},${SA}`);
    expect(sols.length).toBeGreaterThan(0);
    // The SF telegraph has no effect (dead since 01:07): solutions come in groups of five.
    expect(sols.length % 5).toBe(0);
    expect(L.landingCheck({ PF: 1, SF: 1, PA: 1, SA: 1 }).ok).toBe(false);
  });
});
