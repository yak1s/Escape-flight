// Game store: holds the current state, runs the reducer and autosaves. Saves are written after
// every meaningful change (debounced) and immediately on chapter changes, dialogue completion,
// puzzle solves and when the app is hidden or closed.
import type { GameEvent, GameState } from './types';
import { reduce, type Action } from './state';
import { saveGame } from './save';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Sub = () => void;
type EventSub = (events: GameEvent[]) => void;

const IMMEDIATE: Action['type'][] = ['solve', 'dialogueDone', 'chapterCard', 'resetEnding'];

export class GameStore {
  state: GameState;
  saveStatus: SaveStatus = 'idle';
  saveError: string | null = null;
  lastSavedAt = 0;
  backend: 'indexeddb' | 'localstorage' = 'indexeddb';
  private subs = new Set<Sub>();
  private eventSubs = new Set<EventSub>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private saving: Promise<void> | null = null;
  private disposed = false;

  constructor(initial: GameState) {
    this.state = initial;
  }

  subscribe(fn: Sub) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  onEvents(fn: EventSub) {
    this.eventSubs.add(fn);
    return () => this.eventSubs.delete(fn);
  }

  dispatch = (action: Action) => {
    if (this.disposed) return;
    const { state, events } = reduce(this.state, action);
    if (state === this.state && events.length === 0) return;
    this.state = state;
    for (const s of this.subs) s();
    if (events.length) for (const e of this.eventSubs) e(events);
    if (action.type === 'tick') {
      this.dirty = true; // play time is saved with the next real save
      return;
    }
    const immediate = IMMEDIATE.includes(action.type) || events.some((e) => e.kind === 'chapter' || e.kind === 'ending');
    this.schedule(immediate ? 0 : 350);
  };

  private schedule(delay: number) {
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  /** Mark dirty and persist immediately (e.g. right after creating a new game). */
  async flushNow(): Promise<void> {
    this.dirty = true;
    await this.flush();
  }

  /** Persist now if anything changed. Safe to call repeatedly. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.saving) await this.saving;
    if (!this.dirty || this.disposed) return;
    this.dirty = false;
    const snapshot = this.state;
    this.setStatus('saving');
    this.saving = (async () => {
      const result = await saveGame(snapshot);
      this.backend = result.backend;
      if (result.ok) {
        this.lastSavedAt = Date.now();
        this.saveError = result.backend === 'localstorage' ? result.error || null : null;
        this.setStatus('saved');
      } else {
        this.dirty = true;
        this.saveError = result.error || 'Unknown storage error';
        this.setStatus('error');
      }
    })();
    await this.saving;
    this.saving = null;
  }

  private setStatus(status: SaveStatus) {
    this.saveStatus = status;
    for (const s of this.subs) s();
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.subs.clear();
    this.eventSubs.clear();
  }
}
