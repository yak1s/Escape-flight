// Deterministic game state: conditions, effects and the reducer. Pure functions only —
// persistence, audio and UI react to the returned events.
import { CHAPTER_ORDER, type ChapterId, type Cond, type Effect, type GameEvent, type GameState } from './types';
import { CONTENT, chapterById, dialogueById, puzzleById } from '../content';

export const SAVE_SCHEMA = 1;
export const CONTENT_VERSION = 1;

export function newGameState(now = Date.now(), saveId = makeId()): GameState {
  const first = CONTENT.chapters[0];
  const state: GameState = {
    schema: SAVE_SCHEMA,
    saveId,
    createdAt: now,
    updatedAt: now,
    contentVersion: CONTENT_VERSION,
    chapter: first.id,
    scene: first.startScene,
    clock: first.time,
    flags: {},
    solved: {},
    hints: {},
    puzzle: {},
    items: [],
    docs: [],
    docsRead: [],
    people: [],
    dialogues: [],
    queue: [],
    log: [],
    visited: [first.startScene],
    unlocked: [first.startScene],
    seen: [],
    choices: {},
    chapterCards: [],
    ending: null,
    endings: [],
    playMs: 0,
  };
  return applyEffects(state, START_EFFECTS, now).state;
}

/** Inventory and documents the player carries from the first moment. */
export const START_EFFECTS: Effect[] = [
  { item: 'torch' },
  { item: 'brooch' },
  { item: 'box' },
  { doc: 'gran-letter' },
  { doc: 'solicitor' },
  { doc: 'inquiry-summary' },
  { doc: 'appendix-b' },
  { doc: 'map-1989' },
  { doc: 'wireless-note' },
];

export function makeId(): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `alb-${Date.now().toString(36)}-${rnd}`;
}

// ------------------------------------------------------------------ conditions

export function chapterIndex(id: ChapterId): number {
  return CHAPTER_ORDER.indexOf(id);
}

export function test(state: GameState, cond: Cond | undefined): boolean {
  if (cond === undefined) return true;
  if (Array.isArray(cond)) return cond.every((c) => test(state, c));
  if (typeof cond === 'object') {
    if ('any' in cond) return cond.any.some((c) => test(state, c));
    if ('not' in cond) return !test(state, cond.not);
    return false;
  }
  const token = cond.trim();
  if (token.startsWith('!')) return !test(state, token.slice(1));
  const colon = token.indexOf(':');
  if (token.startsWith('chapter>=')) {
    return chapterIndex(state.chapter) >= chapterIndex(token.slice(9) as ChapterId);
  }
  if (colon > 0) {
    const kind = token.slice(0, colon);
    const value = token.slice(colon + 1);
    switch (kind) {
      case 'solved':
        return Boolean(state.solved[value]);
      case 'item':
        return state.items.includes(value);
      case 'doc':
        return state.docs.includes(value);
      case 'visited':
        return state.visited.includes(value);
      case 'said':
        return state.dialogues.includes(value);
      case 'seen':
        return state.seen.includes(value);
      case 'choice': {
        const [key, val] = value.split('=');
        return state.choices[key] === val;
      }
      default:
        return false;
    }
  }
  return Boolean(state.flags[token]);
}

// ------------------------------------------------------------------ effects

export interface Result {
  state: GameState;
  events: GameEvent[];
}

export function applyEffects(input: GameState, effects: Effect[], now = Date.now()): Result {
  let state: GameState = { ...input };
  const events: GameEvent[] = [];
  for (const effect of effects) {
    if ('set' in effect) {
      if (!state.flags[effect.set]) state = { ...state, flags: { ...state.flags, [effect.set]: now } };
    } else if ('unset' in effect) {
      if (state.flags[effect.unset]) {
        const flags = { ...state.flags };
        delete flags[effect.unset];
        state = { ...state, flags };
      }
    } else if ('item' in effect) {
      if (!state.items.includes(effect.item)) {
        state = { ...state, items: [...state.items, effect.item] };
        events.push({ kind: 'item', value: effect.item });
      }
    } else if ('drop' in effect) {
      state = { ...state, items: state.items.filter((i) => i !== effect.drop) };
    } else if ('doc' in effect) {
      if (!state.docs.includes(effect.doc)) {
        state = { ...state, docs: [...state.docs, effect.doc] };
        events.push({ kind: 'doc', value: effect.doc });
      }
    } else if ('person' in effect) {
      if (!state.people.includes(effect.person)) state = { ...state, people: [...state.people, effect.person] };
    } else if ('say' in effect) {
      if (!state.dialogues.includes(effect.say) && !state.queue.includes(effect.say)) {
        state = { ...state, queue: [...state.queue, effect.say] };
        events.push({ kind: 'say', value: effect.say });
      }
    } else if ('chapter' in effect) {
      if (chapterIndex(effect.chapter) > chapterIndex(state.chapter)) {
        const ch = chapterById(effect.chapter);
        state = { ...state, chapter: effect.chapter, clock: ch.time };
        events.push({ kind: 'chapter', value: effect.chapter });
      }
    } else if ('scene' in effect) {
      state = enterScene(state, effect.scene);
      events.push({ kind: 'scene', value: effect.scene });
    } else if ('unlock' in effect) {
      if (!state.unlocked.includes(effect.unlock)) state = { ...state, unlocked: [...state.unlocked, effect.unlock] };
    } else if ('toast' in effect) {
      events.push({ kind: 'toast', value: effect.toast });
    } else if ('sfx' in effect) {
      events.push({ kind: 'sfx', value: effect.sfx });
    } else if ('shimmer' in effect) {
      events.push({ kind: 'shimmer', value: 'shimmer' });
    } else if ('clock' in effect) {
      state = { ...state, clock: effect.clock };
    } else if ('log' in effect) {
      if (!state.log.some((l) => l.id === effect.log.id)) state = { ...state, log: [...state.log, effect.log] };
    } else if ('ending' in effect) {
      state = {
        ...state,
        flags: { ...state.flags, [`ending-${effect.ending}`]: now },
        ending: effect.ending,
        endings: state.endings.includes(effect.ending) ? state.endings : [...state.endings, effect.ending],
      };
      events.push({ kind: 'ending', value: effect.ending });
    }
  }
  return { state, events };
}

export function enterScene(state: GameState, scene: string): GameState {
  return {
    ...state,
    scene,
    visited: state.visited.includes(scene) ? state.visited : [...state.visited, scene],
    unlocked: state.unlocked.includes(scene) ? state.unlocked : [...state.unlocked, scene],
  };
}

// ------------------------------------------------------------------ reducer

export type Action =
  | { type: 'goto'; scene: string }
  | { type: 'effects'; effects: Effect[]; once?: string }
  | { type: 'seen'; id: string }
  | { type: 'solve'; id: string }
  | { type: 'hint'; id: string }
  | { type: 'puzzleState'; id: string; data: unknown }
  | { type: 'dialogueDone'; id: string; choices: Record<string, string>; effects: Effect[] }
  | { type: 'readDoc'; id: string }
  | { type: 'chapterCard'; id: string }
  | { type: 'tick'; ms: number }
  | { type: 'resetEnding' };

export function reduce(state: GameState, action: Action, now = Date.now()): Result {
  const first = reduceCore(state, action, now);
  if (first.state === state || action.type === 'tick' || action.type === 'puzzleState') return first;
  return postProcess(first, now);
}

/** Scene entry events and auto-solving puzzles, repeated until nothing changes. */
function postProcess(result: Result, now: number): Result {
  let { state } = result;
  const events = [...result.events];
  for (let guard = 0; guard < 8; guard += 1) {
    let changed = false;
    const scene = CONTENT.scenes.find((s) => s.id === state.scene);
    (scene?.onEnter || []).forEach((entry, i) => {
      const key = `enter:${scene!.id}:${i}`;
      if (!state.seen.includes(key) && test(state, entry.when)) {
        const r = applyEffects({ ...state, seen: [...state.seen, key] }, entry.effects, now);
        state = r.state;
        events.push(...r.events);
        changed = true;
      }
    });
    for (const p of CONTENT.puzzles) {
      if (p.autoSolve && !state.solved[p.id] && test(state, p.req) && test(state, p.autoSolve)) {
        const r = applyEffects({ ...state, solved: { ...state.solved, [p.id]: { at: now, hints: state.hints[p.id] || 0 } } }, p.onSolve, now);
        state = r.state;
        events.push({ kind: 'sfx', value: 'success' }, ...r.events);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { state, events };
}

function reduceCore(state: GameState, action: Action, now: number): Result {
  const touch = (s: GameState): GameState => ({ ...s, updatedAt: now });
  switch (action.type) {
    case 'goto':
      return { state: touch(enterScene(state, action.scene)), events: [] };
    case 'seen':
      if (state.seen.includes(action.id)) return { state, events: [] };
      return { state: touch({ ...state, seen: [...state.seen, action.id] }), events: [] };
    case 'effects': {
      if (action.once && state.seen.includes(action.once)) return { state, events: [] };
      const base = action.once ? { ...state, seen: [...state.seen, action.once] } : state;
      const r = applyEffects(base, action.effects, now);
      return { state: touch(r.state), events: r.events };
    }
    case 'solve': {
      if (state.solved[action.id]) return { state, events: [] };
      const def = puzzleById(action.id);
      const solved = { ...state.solved, [action.id]: { at: now, hints: state.hints[action.id] || 0 } };
      const r = applyEffects({ ...state, solved }, def.onSolve, now);
      return { state: touch(r.state), events: [{ kind: 'sfx', value: 'success' }, ...r.events] };
    }
    case 'hint': {
      const def = puzzleById(action.id);
      const current = state.hints[action.id] || 0;
      if (current >= def.hints.length + 1) return { state, events: [] };
      return { state: touch({ ...state, hints: { ...state.hints, [action.id]: current + 1 } }), events: [] };
    }
    case 'puzzleState':
      return { state: { ...state, puzzle: { ...state.puzzle, [action.id]: action.data }, updatedAt: now }, events: [] };
    case 'dialogueDone': {
      const def = dialogueById(action.id);
      const already = state.dialogues.includes(action.id);
      let next: GameState = {
        ...state,
        queue: state.queue.filter((q) => q !== action.id),
        dialogues: already ? state.dialogues : [...state.dialogues, action.id],
        choices: { ...state.choices, ...action.choices },
      };
      if (already) return { state: touch(next), events: [] };
      if (def.time) next = { ...next, clock: def.time };
      const r = applyEffects(next, [...action.effects, ...(def.onEnd || [])], now);
      return { state: touch(r.state), events: r.events };
    }
    case 'readDoc':
      if (state.docsRead.includes(action.id)) return { state, events: [] };
      return { state: touch({ ...state, docsRead: [...state.docsRead, action.id] }), events: [] };
    case 'chapterCard':
      if (state.chapterCards.includes(action.id)) return { state, events: [] };
      return { state: touch({ ...state, chapterCards: [...state.chapterCards, action.id] }), events: [] };
    case 'tick':
      return { state: { ...state, playMs: state.playMs + Math.max(0, Math.min(action.ms, 60_000)) }, events: [] };
    case 'resetEnding': {
      if (!state.ending) return { state, events: [] };
      const flags = { ...state.flags };
      delete flags[`ending-${state.ending}`];
      return { state: touch({ ...state, ending: null, flags }), events: [] };
    }
    default:
      return { state, events: [] };
  }
}

// ------------------------------------------------------------------ queries

export function activeObjectives(state: GameState) {
  const ch = chapterById(state.chapter);
  return ch.objectives.filter((o) => test(state, o.show) && !test(state, o.done));
}

export function completedObjectives(state: GameState) {
  const ch = chapterById(state.chapter);
  return ch.objectives.filter((o) => test(state, o.show) && test(state, o.done));
}

export function isPuzzleAvailable(state: GameState, id: string): boolean {
  const def = puzzleById(id);
  return test(state, def.req);
}

export function hintsRevealed(state: GameState, id: string): number {
  return state.hints[id] || 0;
}

export function totalSolved(state: GameState): number {
  return Object.keys(state.solved).length;
}

export { CONTENT };
