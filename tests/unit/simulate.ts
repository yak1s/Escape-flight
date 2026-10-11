// Reducer-level player simulator: executes walkthrough steps exactly as the UI would, failing
// loudly if a step is not possible in the current state (missing clue, locked door, etc.).
import { newGameState, reduce, test, type Action } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { autoRun } from '../../src/engine/dialogue';
import { dialogueById, itemById, puzzleById, sceneById } from '../../src/content';
import { hotspotBehaviour, travelScenes, visibleActions, visibleHotspots } from '../../src/engine/interact';
import type { WStep } from '../walkthrough';

export class Sim {
  state: GameState;
  log: string[] = [];
  constructor(state?: GameState) {
    this.state = state ?? newGameState(1_000_000, 'test-save');
  }
  do(action: Action) {
    this.state = reduce(this.state, action, 1_000_000 + this.log.length).state;
  }
  private openPuzzle(id: string) {
    const def = puzzleById(id);
    if (def.onOpen) this.do({ type: 'effects', effects: def.onOpen, once: `open:${id}` });
  }
  talkAll(picks: Record<string, string> = {}) {
    let guard = 0;
    while (this.state.queue.length && guard < 20) {
      guard += 1;
      const id = this.state.queue[0];
      const def = dialogueById(id);
      const { effects, choices } = autoRun(def, (c) => test(this.state, c), picks);
      this.do({ type: 'dialogueDone', id, choices, effects });
      this.log.push(`talk ${id}`);
    }
  }
  step(s: WStep) {
    const where = `[${this.state.chapter}/${this.state.scene}] ${JSON.stringify(s)}`;
    if ('talk' in s) {
      if (!this.state.queue.length) throw new Error(`Nothing to talk about: ${where}`);
      this.talkAll();
      return;
    }
    if ('travel' in s) {
      if (!travelScenes(this.state).some((x) => x.id === s.travel)) throw new Error(`Cannot travel: ${where}`);
      this.do({ type: 'goto', scene: s.travel });
      this.log.push(`travel ${s.travel}`);
      return;
    }
    if ('solve' in s) {
      const def = puzzleById(s.solve);
      if (this.state.solved[s.solve]) throw new Error(`Already solved: ${where}`);
      if (!test(this.state, def.req)) throw new Error(`Puzzle not available: ${where}`);
      this.openPuzzle(s.solve);
      this.do({ type: 'solve', id: s.solve });
      this.log.push(`solve ${s.solve}`);
      return;
    }
    if ('item' in s) {
      if (!this.state.items.includes(s.item)) throw new Error(`Item not held: ${where}`);
      const action = visibleActions(this.state, itemById(s.item).actions).find((a) => a.label === s.action);
      if (!action) throw new Error(`Item action not available: ${where}`);
      this.runAction(action, where);
      return;
    }
    const h = visibleHotspots(this.state, this.state.scene).find((x) => x.id === s.tap);
    if (!h) throw new Error(`Hotspot not visible: ${where} (have ${sceneById(this.state.scene).hotspots.map((x) => x.id).join(',')})`);
    this.do({ type: 'seen', id: `${this.state.scene}:${h.id}` });
    if (h.firstEffects) this.do({ type: 'effects', effects: h.firstEffects, once: `first:${this.state.scene}:${h.id}` });
    const b = hotspotBehaviour(this.state, h);
    if (s.action) {
      if (b.type !== 'closeup') throw new Error(`Expected a closeup, got ${b.type}: ${where}`);
      const action = visibleActions(this.state, h.closeup!.actions).find((a) => a.label === s.action);
      if (!action) throw new Error(`Action not available: ${where}`);
      this.runAction(action, where);
      return;
    }
    if (b.type === 'puzzle') this.openPuzzle(b.id);
    else if (b.type === 'goto') this.do({ type: 'goto', scene: b.scene });
    else if (b.type === 'doc') this.do({ type: 'effects', effects: [{ doc: b.id }] });
    else if (b.type === 'none') throw new Error(`Hotspot does nothing: ${where}`);
    this.log.push(`tap ${h.id} -> ${b.type}`);
  }
  private runAction(action: NonNullable<ReturnType<typeof visibleActions>[number]>, where: string) {
    if (action.effects.length) this.do({ type: 'effects', effects: action.effects });
    if (action.doc) this.do({ type: 'effects', effects: [{ doc: action.doc }] });
    if (action.puzzle) {
      if (this.state.solved[action.puzzle]) throw new Error(`Action opens solved puzzle: ${where}`);
      this.openPuzzle(action.puzzle);
    }
    if (action.goto) this.do({ type: 'goto', scene: action.goto });
    this.log.push(`action ${action.label}`);
  }
  run(steps: WStep[]) {
    steps.forEach((s) => this.step(s));
    return this;
  }
}
