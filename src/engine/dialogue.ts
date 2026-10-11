// Pure dialogue runner: walks a DialogueDef line by line, branching on choices, retrying quizzes
// until answered correctly, and collecting mid-dialogue effects. Used by the UI and by tests.
import type { Cond, DialogueDef, DialogueLine, Effect } from './types';

export type Step =
  | { kind: 'line'; speaker: 'wren' | 'you' | 'narration' | 'other'; name?: string; text: string }
  | { kind: 'choice'; key?: string; options: { id: string; t: string }[] }
  | { kind: 'quiz'; prompt: string; options: { t: string }[] }
  | { kind: 'fx'; effects: Effect[] };

export class DialogueRunner {
  private stack: DialogueLine[][];
  private pending: DialogueLine | null = null;
  readonly choices: Record<string, string> = {};
  readonly effects: Effect[] = [];
  /** Effects from chosen options only (fx lines are applied live by the UI). */
  readonly choiceEffects: Effect[] = [];
  private test: (cond: Cond) => boolean;

  constructor(def: DialogueDef, test: (cond: Cond) => boolean) {
    this.stack = [[...def.lines]];
    this.test = test;
  }

  /** Advance to the next presentable step. Returns null at the end. */
  next(): Step | null {
    while (this.stack.length) {
      const frame = this.stack[this.stack.length - 1];
      if (!frame.length) {
        this.stack.pop();
        continue;
      }
      const line = frame.shift()!;
      if ('w' in line) return { kind: 'line', speaker: 'wren', name: 'Wren', text: line.w };
      if ('y' in line) return { kind: 'line', speaker: 'you', name: 'You', text: line.y };
      if ('n' in line) return { kind: 'line', speaker: 'narration', text: line.n };
      if ('s' in line) return { kind: 'line', speaker: 'other', name: line.s, text: line.t };
      if ('fx' in line) {
        this.effects.push(...line.fx);
        return { kind: 'fx', effects: line.fx };
      }
      if ('if' in line) {
        const branch = this.test(line.if) ? line.then : line.else || [];
        this.stack.push([...branch]);
        continue;
      }
      if ('choice' in line) {
        this.pending = line;
        return { kind: 'choice', key: line.key, options: line.choice.map((c) => ({ id: c.id, t: c.t })) };
      }
      if ('quiz' in line) {
        this.pending = line;
        return { kind: 'quiz', prompt: line.quiz, options: line.options.map((o) => ({ t: o.t })) };
      }
    }
    return null;
  }

  /** Answer the pending choice/quiz. Returns whether the answer was accepted (quizzes may retry). */
  choose(index: number): boolean {
    const line = this.pending;
    if (!line) return false;
    this.pending = null;
    if ('choice' in line) {
      const opt = line.choice[index];
      if (!opt) return false;
      if (line.key) this.choices[line.key] = opt.id;
      if (opt.effects) {
        this.effects.push(...opt.effects);
        this.choiceEffects.push(...opt.effects);
      }
      this.stack.push([...(opt.then || [])]);
      return true;
    }
    if ('quiz' in line) {
      const opt = line.options[index];
      if (!opt) return false;
      if (opt.correct) {
        this.stack.push([...opt.reply]);
        return true;
      }
      // Wrong: show the reply, then ask again.
      this.stack.push([...opt.reply, line]);
      return false;
    }
    return false;
  }
}

/** Run a whole dialogue non-interactively (tests): picks the given option ids, else the first / correct one. */
export function autoRun(def: DialogueDef, test: (cond: Cond) => boolean, picks: Record<string, string> = {}) {
  const runner = new DialogueRunner(def, test);
  const transcript: Step[] = [];
  for (let guard = 0; guard < 500; guard += 1) {
    const step = runner.next();
    if (!step) break;
    transcript.push(step);
    if (step.kind === 'choice') {
      const wanted = step.key ? picks[step.key] : undefined;
      const idx = Math.max(0, step.options.findIndex((o) => o.id === wanted));
      runner.choose(idx);
    } else if (step.kind === 'quiz') {
      const line = def.lines.find((l) => 'quiz' in l && l.quiz === step.prompt) as Extract<DialogueLine, { quiz: string }> | undefined;
      const idx = line ? line.options.findIndex((o) => o.correct) : 0;
      runner.choose(Math.max(0, idx));
    }
  }
  return { effects: runner.effects, choices: runner.choices, transcript };
}
