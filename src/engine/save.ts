// Local save system. Progress lives in IndexedDB on this device only — never on a server.
//
//  - Each save writes the new state AND moves the previous state to a "backup" record inside a
//    single readwrite transaction, so a crash mid-write can never leave a half-written save.
//  - Every record carries a schema version and an FNV-1a checksum of its JSON.
//  - On load, an invalid main record falls back to the backup; saves from older schemas are
//    migrated forward, never discarded.
//  - If IndexedDB is unavailable (some private modes), saves fall back to localStorage and the UI
//    warns the player.
import { CHAPTER_ORDER, type GameState } from './types';
import { CONTENT_VERSION, SAVE_SCHEMA } from './state';
import { CONTENT } from '../content';

const DB_NAME = 'albatross';
const DB_VERSION = 1;
const SAVES = 'saves';
const KV = 'kv';
const LS_PREFIX = 'albatross:';

export interface SaveRecord {
  slot: 'main' | 'backup';
  schema: number;
  savedAt: number;
  checksum: string;
  state: GameState;
}

export interface LoadResult {
  state: GameState | null;
  source: 'main' | 'backup' | 'none';
  recovered: boolean;
  problems: string[];
}

export interface SaveResult {
  ok: boolean;
  error?: string;
  backend: 'indexeddb' | 'localstorage';
}

export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ------------------------------------------------------------------ validation & migration

const KNOWN_SCENES = () => new Set(CONTENT.scenes.map((s) => s.id));
const KNOWN_PUZZLES = () => new Set(CONTENT.puzzles.map((p) => p.id));

/** Bring an older (or slightly malformed) state up to the current schema. Throws if hopeless. */
export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Save data is not an object');
  const s = { ...(raw as Record<string, unknown>) } as unknown as GameState;
  const schema = typeof s.schema === 'number' ? s.schema : 0;
  if (schema > SAVE_SCHEMA) throw new Error(`Save is from a newer version of the game (schema ${schema})`);
  // Schema 0 → 1 would be handled here. Future migrations append below, never remove.
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const obj = <T,>(v: unknown, fallback: T): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : fallback);
  if (!CHAPTER_ORDER.includes(s.chapter)) throw new Error('Save has an unknown chapter');
  const scenes = KNOWN_SCENES();
  const puzzles = KNOWN_PUZZLES();
  const solvedRaw = obj<Record<string, { at: number; hints: number }>>(s.solved, {});
  const solved: GameState['solved'] = {};
  for (const [k, v] of Object.entries(solvedRaw)) if (puzzles.has(k)) solved[k] = v;
  const chapter = CONTENT.chapters.find((c) => c.id === s.chapter)!;
  const state: GameState = {
    schema: SAVE_SCHEMA,
    saveId: typeof s.saveId === 'string' ? s.saveId : `alb-migrated-${Date.now()}`,
    createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
    updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
    contentVersion: CONTENT_VERSION,
    chapter: s.chapter,
    scene: typeof s.scene === 'string' && scenes.has(s.scene) ? s.scene : chapter.startScene,
    clock: typeof s.clock === 'string' ? s.clock : chapter.time,
    flags: obj(s.flags, {}),
    solved,
    hints: obj(s.hints, {}),
    puzzle: obj(s.puzzle, {}),
    items: arr(s.items),
    docs: arr(s.docs),
    docsRead: arr(s.docsRead),
    people: arr(s.people),
    dialogues: arr(s.dialogues),
    queue: arr(s.queue),
    log: Array.isArray(s.log) ? s.log.filter((l) => l && typeof l.id === 'string') : [],
    visited: arr(s.visited),
    unlocked: arr(s.unlocked),
    seen: arr(s.seen),
    choices: obj(s.choices, {}),
    chapterCards: arr(s.chapterCards),
    ending: s.ending === 'rewrite' || s.ending === 'record' ? s.ending : null,
    endings: arr(s.endings),
    playMs: typeof s.playMs === 'number' ? s.playMs : 0,
  };
  return state;
}

export function makeRecord(slot: 'main' | 'backup', state: GameState, now = Date.now()): SaveRecord {
  return { slot, schema: SAVE_SCHEMA, savedAt: now, checksum: checksum(JSON.stringify(state)), state };
}

export function readRecord(record: unknown): GameState {
  if (!record || typeof record !== 'object') throw new Error('missing record');
  const r = record as SaveRecord;
  if (!r.state) throw new Error('record has no state');
  if (typeof r.checksum === 'string' && r.checksum !== checksum(JSON.stringify(r.state))) {
    throw new Error('checksum mismatch (save corrupted)');
  }
  return migrate(r.state);
}

// ------------------------------------------------------------------ IndexedDB helpers

let dbPromise: Promise<IDBDatabase> | null = null;
let backend: 'indexeddb' | 'localstorage' = 'indexeddb';

export function storageBackend() {
  return backend;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAVES)) db.createObjectStore(SAVES, { keyPath: 'slot' });
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV, { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB blocked by another tab'));
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ------------------------------------------------------------------ public API

export async function saveGame(state: GameState): Promise<SaveResult> {
  const now = Date.now();
  try {
    const db = await openDb();
    const tx = db.transaction(SAVES, 'readwrite');
    const store = tx.objectStore(SAVES);
    const previous = await request(store.get('main'));
    if (previous && (previous as SaveRecord).state) {
      store.put({ ...(previous as SaveRecord), slot: 'backup' });
    }
    store.put(makeRecord('main', state, now));
    await done(tx);
    backend = 'indexeddb';
    return { ok: true, backend };
  } catch (error) {
    // Fall back to localStorage so progress is not silently lost.
    try {
      const prev = localStorage.getItem(LS_PREFIX + 'main');
      if (prev) localStorage.setItem(LS_PREFIX + 'backup', prev);
      localStorage.setItem(LS_PREFIX + 'main', JSON.stringify(makeRecord('main', state, now)));
      backend = 'localstorage';
      return { ok: true, backend, error: `IndexedDB unavailable: ${(error as Error).message}` };
    } catch (lsError) {
      return { ok: false, backend, error: `${(error as Error).message}; ${(lsError as Error).message}` };
    }
  }
}

async function readSlots(): Promise<{ main?: unknown; backup?: unknown }> {
  try {
    const db = await openDb();
    const tx = db.transaction(SAVES, 'readonly');
    const store = tx.objectStore(SAVES);
    const [main, backup] = await Promise.all([request(store.get('main')), request(store.get('backup'))]);
    if (main || backup) return { main, backup };
  } catch {
    /* fall through to localStorage */
  }
  try {
    const main = localStorage.getItem(LS_PREFIX + 'main');
    const backup = localStorage.getItem(LS_PREFIX + 'backup');
    if (main || backup) backend = 'localstorage';
    return { main: main ? JSON.parse(main) : undefined, backup: backup ? JSON.parse(backup) : undefined };
  } catch {
    return {};
  }
}

export async function loadGame(): Promise<LoadResult> {
  const problems: string[] = [];
  const { main, backup } = await readSlots();
  if (main) {
    try {
      return { state: readRecord(main), source: 'main', recovered: false, problems };
    } catch (error) {
      problems.push(`Main save unreadable: ${(error as Error).message}`);
    }
  }
  if (backup) {
    try {
      return { state: readRecord(backup), source: 'backup', recovered: Boolean(main), problems };
    } catch (error) {
      problems.push(`Backup save unreadable: ${(error as Error).message}`);
    }
  }
  return { state: null, source: 'none', recovered: false, problems };
}

export async function deleteSave(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(SAVES, 'readwrite');
    tx.objectStore(SAVES).clear();
    await done(tx);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LS_PREFIX + 'main');
    localStorage.removeItem(LS_PREFIX + 'backup');
  } catch {
    /* ignore */
  }
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    const tx = db.transaction(KV, 'readonly');
    const row = await request(tx.objectStore(KV).get(key));
    if (row) return (row as { value: T }).value;
  } catch {
    /* fall back */
  }
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<boolean> {
  let ok = false;
  try {
    const db = await openDb();
    const tx = db.transaction(KV, 'readwrite');
    tx.objectStore(KV).put({ key, value });
    await done(tx);
    ok = true;
  } catch {
    /* fall back */
  }
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    ok = true;
  } catch {
    /* ignore */
  }
  return ok;
}

/** Write/read/delete probe used by the offline readiness check. */
export async function probeStorage(): Promise<{ ok: boolean; backend: string; detail: string }> {
  try {
    const db = await openDb();
    const token = `probe-${Date.now()}`;
    let tx = db.transaction(KV, 'readwrite');
    tx.objectStore(KV).put({ key: '__probe__', value: token });
    await done(tx);
    tx = db.transaction(KV, 'readonly');
    const row = (await request(tx.objectStore(KV).get('__probe__'))) as { value: string } | undefined;
    tx = db.transaction(KV, 'readwrite');
    tx.objectStore(KV).delete('__probe__');
    await done(tx);
    if (!row || row.value !== token) return { ok: false, backend: 'indexeddb', detail: 'read-back mismatch' };
    return { ok: true, backend: 'indexeddb', detail: 'IndexedDB read/write OK' };
  } catch (error) {
    try {
      localStorage.setItem(LS_PREFIX + '__probe__', '1');
      localStorage.removeItem(LS_PREFIX + '__probe__');
      return { ok: true, backend: 'localstorage', detail: `IndexedDB unavailable (${(error as Error).message}); using localStorage` };
    } catch {
      return { ok: false, backend: 'none', detail: (error as Error).message };
    }
  }
}

// ------------------------------------------------------------------ export / import

export const EXPORT_FORMAT = 'albatross-save';

export function exportSave(state: GameState, gameVersion: string): string {
  const payload = {
    format: EXPORT_FORMAT,
    schema: SAVE_SCHEMA,
    contentVersion: CONTENT_VERSION,
    gameVersion,
    exportedAt: new Date().toISOString(),
    checksum: checksum(JSON.stringify(state)),
    state,
  };
  return JSON.stringify(payload, null, 1);
}

export function parseImport(text: string): GameState {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid save (not JSON).');
  }
  if (data.format !== EXPORT_FORMAT || !data.state) throw new Error('That file is not an Albatross save.');
  if (typeof data.checksum === 'string' && data.checksum !== checksum(JSON.stringify(data.state))) {
    throw new Error('The save file is damaged (checksum mismatch).');
  }
  return migrate(data.state);
}

export function describeSave(state: GameState): string {
  const chapter = CONTENT.chapters.find((c) => c.id === state.chapter);
  const mins = Math.round(state.playMs / 60000);
  const solved = Object.keys(state.solved).length;
  return `Chapter ${chapter?.n ?? '?'} · ${chapter?.title ?? ''} · ${solved} puzzles · ${mins} min played`;
}
