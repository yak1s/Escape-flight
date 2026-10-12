// Content integrity: every cross-reference in the bundled story resolves, every puzzle has a
// progressive hint ladder and a UI, and every sound the code asks for is actually bundled.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT } from '../../src/content';
import { CHAPTER_ORDER, type Cond, type Effect } from '../../src/engine/types';
import { SCENE_ART } from '../../src/art/scenes';
import { CLOSEUP_ART } from '../../src/art/closeups';
import { DOC_ART } from '../../src/art/docart';
import { PUZZLE_COMPONENTS } from '../../src/ui/puzzles';

const ids = {
  scene: new Set(CONTENT.scenes.map((s) => s.id)),
  puzzle: new Set(CONTENT.puzzles.map((p) => p.id)),
  doc: new Set(CONTENT.docs.map((d) => d.id)),
  item: new Set(CONTENT.items.map((i) => i.id)),
  person: new Set(CONTENT.people.map((p) => p.id)),
  dialogue: new Set(CONTENT.dialogues.map((d) => d.id)),
  chapter: new Set<string>(CHAPTER_ORDER),
};

/** Walks any content object and yields every Effect and Cond-looking value with a path. */
function walk(node: unknown, path: string, out: { effects: [string, Effect][]; conds: [string, Cond][] }) {
  if (Array.isArray(node)) {
    node.forEach((n, i) => walk(n, `${path}[${i}]`, out));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    const p = `${path}.${k}`;
    if (['effects', 'onSolve', 'onOpen', 'onEnd', 'firstEffects', 'fx'].includes(k) && Array.isArray(v)) {
      v.forEach((e, i) => out.effects.push([`${p}[${i}]`, e as Effect]));
    }
    if (['show', 'done', 'when', 'req', 'gotoWhen', 'autoSolve', 'if'].includes(k) && v !== undefined) out.conds.push([p, v as Cond]);
    walk(v, p, out);
  }
}
const found = { effects: [] as [string, Effect][], conds: [] as [string, Cond][] };
walk(CONTENT, 'CONTENT', found);

function tokens(c: Cond): string[] {
  if (typeof c === 'string') return [c];
  if (Array.isArray(c)) return c.flatMap(tokens);
  if ('any' in c) return c.any.flatMap(tokens);
  if ('not' in c) return tokens(c.not);
  return [];
}

describe('content integrity', () => {
  it('ids are unique within each kind', () => {
    for (const [kind, list] of Object.entries({ scenes: CONTENT.scenes, puzzles: CONTENT.puzzles, docs: CONTENT.docs, items: CONTENT.items, people: CONTENT.people, dialogues: CONTENT.dialogues })) {
      const all = (list as { id: string }[]).map((x) => x.id);
      expect(new Set(all).size, kind).toBe(all.length);
    }
  });

  it('every effect points at something that exists', () => {
    expect(found.effects.length).toBeGreaterThan(100);
    for (const [p, e] of found.effects) {
      if ('doc' in e) expect(ids.doc.has(e.doc), `${p} doc ${e.doc}`).toBe(true);
      if ('item' in e) expect(ids.item.has(e.item), `${p} item ${e.item}`).toBe(true);
      if ('drop' in e) expect(ids.item.has(e.drop), `${p} drop ${e.drop}`).toBe(true);
      if ('person' in e) expect(ids.person.has(e.person), `${p} person ${e.person}`).toBe(true);
      if ('say' in e) expect(ids.dialogue.has(e.say), `${p} say ${e.say}`).toBe(true);
      if ('scene' in e) expect(ids.scene.has(e.scene), `${p} scene ${e.scene}`).toBe(true);
      if ('unlock' in e) expect(ids.scene.has(e.unlock), `${p} unlock ${e.unlock}`).toBe(true);
      if ('chapter' in e) expect(ids.chapter.has(e.chapter), `${p} chapter ${e.chapter}`).toBe(true);
    }
  });

  it('every condition token refers to something that exists', () => {
    for (const [p, c] of found.conds)
      for (const t of tokens(c)) {
        const [kind, id] = t.replace(/^!/, '').split(':');
        if (id === undefined) continue; // plain flag
        if (kind === 'solved') expect(ids.puzzle.has(id), `${p} ${t}`).toBe(true);
        else if (kind === 'item') expect(ids.item.has(id), `${p} ${t}`).toBe(true);
        else if (kind === 'doc') expect(ids.doc.has(id), `${p} ${t}`).toBe(true);
        else if (kind === 'said') expect(ids.dialogue.has(id), `${p} ${t}`).toBe(true);
        else if (kind === 'visited') expect(ids.scene.has(id), `${p} ${t}`).toBe(true);
        else if (kind === 'choice') expect(id).toMatch(/=/);
        else throw new Error(`Unknown condition kind in ${p}: ${t}`);
      }
  });

  it('scenes: hotspots link to real scenes, puzzles and docs; art exists', () => {
    for (const s of CONTENT.scenes) {
      expect(SCENE_ART[s.art], `art for ${s.id}`).toBeTruthy();
      for (const h of s.hotspots) {
        const where = `${s.id}/${h.id}`;
        if (h.goto) expect(ids.scene.has(h.goto), where).toBe(true);
        for (const pz of [h.puzzle ?? []].flat()) expect(ids.puzzle.has(pz), where).toBe(true);
        if (h.doc) expect(ids.doc.has(h.doc), where).toBe(true);
        if (h.closeup?.art) expect(CLOSEUP_ART[h.closeup.art], `${where} closeup art ${h.closeup.art}`).toBeTruthy();
        for (const a of h.closeup?.actions ?? []) {
          if (a.puzzle) expect(ids.puzzle.has(a.puzzle), where).toBe(true);
          if (a.doc) expect(ids.doc.has(a.doc), where).toBe(true);
          if (a.goto) expect(ids.scene.has(a.goto), where).toBe(true);
        }
        expect(h.rect.x >= 0 && h.rect.y >= 0 && h.rect.x + h.rect.w <= 1000 && h.rect.y + h.rect.h <= 1500, `${where} rect inside the scene`).toBe(true);
        // Touch target: at least ~44 CSS px on a 390 px wide phone (1000 units → 390 px).
        expect(Math.min(h.rect.w, h.rect.h), `${where} touch target`).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it('puzzles: 22–32 total, each with a UI, ≥3 progressive hints, an explanation, clues that exist and a real scene', () => {
    expect(CONTENT.puzzles.length).toBeGreaterThanOrEqual(22);
    expect(CONTENT.puzzles.length).toBeLessThanOrEqual(32);
    for (const p of CONTENT.puzzles) {
      expect(PUZZLE_COMPONENTS[p.kind], `component for ${p.id} (${p.kind})`).toBeTruthy();
      expect(p.hints.length, `${p.id} hints`).toBeGreaterThanOrEqual(3);
      expect(new Set(p.hints).size, `${p.id} hints distinct`).toBe(p.hints.length);
      expect(p.explanation.length, `${p.id} explanation`).toBeGreaterThan(40);
      expect(ids.scene.has(p.scene) || ['radio', 'inventory'].includes(p.scene), `${p.id} scene`).toBe(true);
      for (const c of p.clues) expect(ids.doc.has(c), `${p.id} clue ${c}`).toBe(true);
    }
  });

  it('every puzzle has its own interaction (no reused mechanic)', () => {
    expect(new Set(CONTENT.puzzles.map((p) => p.kind)).size).toBe(CONTENT.puzzles.length);
  });

  it('documents: art blocks exist; text is non-empty', () => {
    for (const d of CONTENT.docs) {
      expect(d.blocks.length, d.id).toBeGreaterThan(0);
      for (const b of d.blocks) if ('art' in b) expect(DOC_ART[b.art], `${d.id} art ${b.art}`).toBeTruthy();
    }
    expect(JSON.stringify(CONTENT.docs)).not.toContain('__CIPHER__');
  });

  it('chapters: each starts in a real scene and has objectives with known "where" scenes', () => {
    expect(CONTENT.chapters.map((c) => c.id)).toEqual(CHAPTER_ORDER);
    for (const c of CONTENT.chapters) {
      expect(ids.scene.has(c.startScene), c.id).toBe(true);
      expect(c.objectives.length, c.id).toBeGreaterThan(0);
      // 'radio' and 'inventory' are the two panels reachable from every scene.
      for (const o of c.objectives) if (o.where) expect(ids.scene.has(o.where) || ['radio', 'inventory'].includes(o.where), `${c.id}/${o.id}`).toBe(true);
    }
  });
});

describe('bundled audio', () => {
  const audioDir = join(process.cwd(), 'public/audio');
  const files = new Set(readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, '')));
  const srcFiles: string[] = [];
  const collect = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) collect(p);
      else if (/\.(ts|tsx)$/.test(f)) srcFiles.push(p);
    }
  };
  collect(join(process.cwd(), 'src'));

  it('every sound name used in code and content is a bundled file', () => {
    const used = new Set<string>();
    for (const f of srcFiles) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/(?:sfx|music|ambience)\(\s*'([a-zA-Z0-9_]+)'/g)) used.add(m[1]);
      for (const m of text.matchAll(/(?:sfx|music|ambience):\s*'([a-zA-Z0-9_]+)'/g)) used.add(m[1]);
    }
    for (const c of CONTENT.chapters) used.add(c.music);
    for (const s of CONTENT.scenes) if (s.ambience) used.add(s.ambience);
    expect(used.size).toBeGreaterThan(15);
    for (const u of used) expect(files.has(u), `missing audio ${u}.mp3`).toBe(true);
  });

  it('all seven music-box notes exist and credits are documented', () => {
    for (const n of ['E4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5']) expect(files.has(`box_${n}`), n).toBe(true);
    expect(existsSync(join(audioDir, 'CREDITS.txt'))).toBe(true);
  });
});
