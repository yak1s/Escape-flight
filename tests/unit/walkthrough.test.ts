import { describe, expect, it } from 'vitest';
import { Sim } from './simulate';
import { WALKTHROUGH } from '../walkthrough';
import { CONTENT } from '../../src/content';
import { activeObjectives } from '../../src/engine/state';

describe('full mandatory walkthrough (reducer level)', () => {
  it('reaches the true ending with every puzzle solved', () => {
    const sim = new Sim().run(WALKTHROUGH);
    expect(sim.state.ending).toBe('rewrite');
    expect(sim.state.chapter).toBe('c9');
    for (const p of CONTENT.puzzles) expect(sim.state.solved[p.id], p.id).toBeTruthy();
    expect(sim.state.queue).toEqual([]);
  });

  it('records every radio log entry used by Appendix C', () => {
    const sim = new Sim().run(WALKTHROUGH);
    const ids = sim.state.log.map((l) => l.id);
    for (const id of ['log-contact', 'log-engine', 'log-captain', 'log-vasseur', 'log-ballast', 'log-valve']) expect(ids).toContain(id);
  });

  it('always has a current objective until the ending (no dead ends)', () => {
    const sim = new Sim();
    for (const step of WALKTHROUGH) {
      if (!sim.state.ending) {
        const hasWork = sim.state.queue.length > 0 || activeObjectives(sim.state).length > 0;
        expect(hasWork, `no objective before ${JSON.stringify(step)} in ${sim.state.chapter}`).toBe(true);
      }
      sim.step(step);
    }
  });

  it('can reach the record ending instead', () => {
    const steps = WALKTHROUGH.slice(0, WALKTHROUGH.length - 2);
    const sim = new Sim().run(steps);
    sim.do({ type: 'effects', effects: [{ say: 'c9-record' }] });
    sim.talkAll();
    expect(sim.state.ending).toBe('record');
    expect(sim.state.flags['ending-record']).toBeTruthy();
  });
});
