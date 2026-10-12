// Save system: atomic main/backup writes, corruption recovery, migration, export/import, and the
// localStorage fallback. Runs against fake-indexeddb with a fresh database per test.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { newGameState, reduce } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

type SaveModule = typeof import('../../src/engine/save');
let save: SaveModule;

beforeEach(async () => {
  (globalThis as { indexedDB?: unknown }).indexedDB = new IDBFactory();
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  vi.resetModules();
  save = await import('../../src/engine/save');
});

function progressed(n: number): GameState {
  let s = newGameState(1000, 'test');
  s = reduce(s, { type: 'goto', scene: s.scene }, 2000).state;
  return { ...s, playMs: n * 60000, flags: { ...s.flags, [`marker-${n}`]: 1 } };
}

async function rawPut(record: unknown) {
  await save.probeStorage(); // let the game create its schema first
  const db: IDBDatabase = await new Promise((res, rej) => {
    const r = indexedDB.open('albatross', 1);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await new Promise<void>((res, rej) => {
    const tx = db.transaction('saves', 'readwrite');
    tx.objectStore('saves').put(record);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

describe('save / load', () => {
  it('round-trips a game state through IndexedDB', async () => {
    const s = progressed(1);
    const r = await save.saveGame(s);
    expect(r).toMatchObject({ ok: true, backend: 'indexeddb' });
    const l = await save.loadGame();
    expect(l.source).toBe('main');
    expect(l.state).toEqual(s);
  });

  it('keeps the previous save as a backup and restores it if the main record is corrupted', async () => {
    await save.saveGame(progressed(1));
    await save.saveGame(progressed(2));
    // Corrupt the main record (state changed after the checksum was computed).
    const bad = save.makeRecord('main', progressed(2));
    bad.state = { ...bad.state, playMs: 999 };
    await rawPut(bad);
    const l = await save.loadGame();
    expect(l.source).toBe('backup');
    expect(l.recovered).toBe(true);
    expect(l.state!.flags['marker-1']).toBe(1);
    expect(l.problems.join()).toMatch(/checksum/);
  });

  it('reports (does not crash) when both records are unreadable', async () => {
    await rawPut({ slot: 'main', state: { chapter: 'nope' } });
    await rawPut({ slot: 'backup', state: null });
    const l = await save.loadGame();
    expect(l.state).toBeNull();
    expect(l.problems.length).toBeGreaterThan(0);
  });

  it('migrates an old/partial save instead of discarding it', async () => {
    const old = progressed(3) as unknown as Record<string, unknown>;
    delete old.schema;
    delete old.docsRead;
    old.scene = 'a-scene-that-was-removed';
    old.solved = { P01: { at: 1, hints: 0 }, P99: { at: 1, hints: 0 } };
    await rawPut({ slot: 'main', state: old });
    const l = await save.loadGame();
    expect(l.state).not.toBeNull();
    expect(l.state!.schema).toBe(1);
    expect(l.state!.docsRead).toEqual([]);
    expect(l.state!.solved).toEqual({ P01: { at: 1, hints: 0 } });
    expect(l.state!.scene).not.toBe('a-scene-that-was-removed');
    expect(l.state!.flags['marker-3']).toBe(1);
  });

  it('refuses a save from a newer schema rather than mangling it', () => {
    expect(() => save.migrate({ ...progressed(1), schema: 99 })).toThrow(/newer version/);
  });

  it('deleteSave clears everything (used only by confirmed reset / new game)', async () => {
    await save.saveGame(progressed(1));
    await save.deleteSave();
    expect((await save.loadGame()).state).toBeNull();
  });

  it('falls back to localStorage when IndexedDB is unavailable', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
    vi.resetModules();
    save = await import('../../src/engine/save');
    const r = await save.saveGame(progressed(4));
    expect(r.ok).toBe(true);
    expect(r.backend).toBe('localstorage');
    const l = await save.loadGame();
    expect(l.state!.flags['marker-4']).toBe(1);
    expect(save.storageBackend()).toBe('localstorage');
    expect((await save.probeStorage()).backend).toBe('localstorage');
  });

  it('kv store and storage probe work', async () => {
    expect(await save.kvSet('k', { a: 1 })).toBe(true);
    expect(await save.kvGet('k')).toEqual({ a: 1 });
    expect(await save.probeStorage()).toMatchObject({ ok: true, backend: 'indexeddb' });
  });
});

describe('export / import', () => {
  it('round-trips and validates the checksum', () => {
    const s = progressed(5);
    const text = save.exportSave(s, 'test');
    expect(JSON.parse(text).format).toBe('albatross-save');
    expect(save.parseImport(text)).toEqual(s);
  });

  it('rejects damaged, foreign and non-JSON files with a clear message', () => {
    const text = save.exportSave(progressed(5), 'test');
    const tampered = JSON.parse(text);
    tampered.state.playMs = 1;
    expect(() => save.parseImport(JSON.stringify(tampered))).toThrow(/damaged/);
    expect(() => save.parseImport('{"hello":1}')).toThrow(/not an Albatross save/);
    expect(() => save.parseImport('garbage')).toThrow(/not JSON/);
  });

  it('describes a save for the title screen', () => {
    expect(save.describeSave(progressed(5))).toMatch(/Chapter 1 · .* · 0 puzzles · 5 min played/);
  });
});
