// Pure interaction rules shared by the UI and the automated walkthrough.
import type { CloseupAction, CloseupText, GameState, Hotspot } from './types';
import { CONTENT, sceneById, puzzleById } from '../content';
import { test } from './state';

export type Behaviour =
  | { type: 'puzzle'; id: string }
  | { type: 'goto'; scene: string }
  | { type: 'doc'; id: string }
  | { type: 'closeup' }
  | { type: 'none' };

export function visibleHotspots(state: GameState, sceneId: string): Hotspot[] {
  return sceneById(sceneId).hotspots.filter((h) => test(state, h.show));
}

export function availablePuzzle(state: GameState, ids: string | string[] | undefined): string | null {
  if (!ids) return null;
  for (const id of Array.isArray(ids) ? ids : [ids]) {
    if (state.solved[id]) continue;
    if (test(state, puzzleById(id).req)) return id;
  }
  return null;
}

export function hotspotBehaviour(state: GameState, h: Hotspot): Behaviour {
  const p = availablePuzzle(state, h.puzzle);
  if (p) return { type: 'puzzle', id: p };
  if (h.goto && test(state, h.gotoWhen)) return { type: 'goto', scene: h.goto };
  if (h.doc) return { type: 'doc', id: h.doc };
  if (h.closeup) return { type: 'closeup' };
  return { type: 'none' };
}

export function pickText(state: GameState, entries: CloseupText[]): string {
  return (entries.find((e) => test(state, e.when)) || entries[entries.length - 1])?.text ?? '';
}

export function visibleActions(state: GameState, actions: CloseupAction[] | undefined): CloseupAction[] {
  return (actions || []).filter((a) => test(state, a.show) && (!a.puzzle || availablePuzzle(state, a.puzzle) !== null));
}

/** Puzzles played through the radio panel rather than at a location. */
export function radioPuzzles(state: GameState) {
  return CONTENT.puzzles.filter((p) => p.scene === 'radio' && !state.solved[p.id] && test(state, p.req));
}

export function travelScenes(state: GameState) {
  return CONTENT.scenes.filter((s) => state.unlocked.includes(s.id) && test(state, s.show));
}

/** A scene (or 'radio'/'inventory') where the player can make progress right now. */
export function whereNow(state: GameState): { where: string; text: string } | null {
  const ch = CONTENT.chapters.find((c) => c.id === state.chapter)!;
  if (state.queue.length) return { where: 'radio', text: 'Wren is waiting to talk to you.' };
  const obj = ch.objectives.find((o) => test(state, o.show) && !test(state, o.done));
  if (!obj) return null;
  return { where: obj.where || 'radio', text: obj.text };
}
