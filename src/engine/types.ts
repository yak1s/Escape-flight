// Core content and state types. All content is static, bundled data — nothing is fetched.
import type { ComponentChildren } from 'preact';

export type ChapterId = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8' | 'c9';
export const CHAPTER_ORDER: ChapterId[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];

/**
 * Condition tokens (all must hold when given as an array):
 *  "flagName"        flag is set           "!flagName"     flag is not set
 *  "solved:P01"      puzzle solved         "item:torch"    item held
 *  "doc:letter"      document found        "chapter>=c3"   chapter reached
 *  "visited:lounge"  scene visited
 */
export type Cond = string | string[] | { any: Cond[] } | { not: Cond };

export type Effect =
  | { set: string }
  | { unset: string }
  | { item: string }
  | { drop: string }
  | { doc: string }
  | { person: string }
  | { say: string }
  | { chapter: ChapterId }
  | { scene: string }
  | { unlock: string }
  | { toast: string }
  | { sfx: string }
  | { shimmer: true }
  | { clock: string }
  | { log: { id: string; time: string; text: string } }
  | { ending: 'rewrite' | 'record' };

export interface GameEvent {
  kind: 'toast' | 'sfx' | 'shimmer' | 'chapter' | 'item' | 'doc' | 'say' | 'ending' | 'scene';
  value: string;
}

export interface LogEntry {
  id: string;
  time: string;
  text: string;
}

export interface GameState {
  schema: number;
  saveId: string;
  createdAt: number;
  updatedAt: number;
  contentVersion: number;
  chapter: ChapterId;
  scene: string;
  clock: string;
  flags: Record<string, number>;
  solved: Record<string, { at: number; hints: number }>;
  hints: Record<string, number>;
  puzzle: Record<string, unknown>;
  items: string[];
  docs: string[];
  docsRead: string[];
  people: string[];
  dialogues: string[];
  queue: string[];
  log: LogEntry[];
  visited: string[];
  unlocked: string[];
  seen: string[];
  choices: Record<string, string>;
  chapterCards: string[];
  ending: null | 'rewrite' | 'record';
  endings: string[];
  playMs: number;
}

// ------------------------------------------------------------------ content

export interface Objective {
  id: string;
  text: string;
  show?: Cond;
  done: Cond;
  /** Scene where progress can be made — used by "Where now?" guidance. */
  where?: string;
}

export interface ChapterDef {
  id: ChapterId;
  n: number;
  title: string;
  subtitle: string;
  time: string;
  epigraph: string;
  intro: string[];
  startScene: string;
  objectives: Objective[];
  music: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CloseupAction {
  label: string;
  show?: Cond;
  effects: Effect[];
  /** Close the closeup after the action. Default true. */
  close?: boolean;
  /** Open a puzzle instead of / after effects. */
  puzzle?: string;
  /** Open a document. */
  doc?: string;
  /** Go to a scene. */
  goto?: string;
  sfx?: string;
}

export interface CloseupText {
  when?: Cond;
  text: string;
}

export interface CloseupDef {
  title: string;
  art?: string;
  /** First matching entry wins; entries without `when` always match. */
  text: CloseupText[];
  actions?: CloseupAction[];
}

export interface Hotspot {
  id: string;
  label: string;
  rect: Rect;
  show?: Cond;
  /** Behaviour, in priority order: an available unsolved puzzle; goto (if gotoWhen holds); doc; closeup. */
  goto?: string;
  gotoWhen?: Cond;
  puzzle?: string | string[];
  doc?: string;
  closeup?: CloseupDef;
  radio?: boolean;
  /** Effects applied the first time the hotspot is used. */
  firstEffects?: Effect[];
  /** Mark as important for "Look around" pulsing. */
  key?: boolean;
}

export interface SceneDef {
  id: string;
  title: string;
  short: string;
  art: string;
  ambience?: string;
  /** Scenes are reachable from the travel menu once visited and when `show` holds. */
  show?: Cond;
  hotspots: Hotspot[];
  /** Effects applied once when the scene is entered and the condition holds. */
  onEnter?: { when?: Cond; effects: Effect[] }[];
}

export type DocBlock = (
  | { h: string }
  | { h2: string }
  | { p: string; hand?: string; align?: 'center' | 'right' }
  | { list: string[] }
  | { table: string[][]; head?: boolean }
  | { rule: true }
  | { sign: string; hand?: string }
  | { art: string; caption?: string }
  | { stamp: string }
  | { note: string }
) & { when?: Cond };

export interface DocDef {
  id: string;
  title: string;
  /** Short description used in the evidence list. */
  summary: string;
  style: 'typed' | 'letter' | 'note' | 'clipping' | 'card' | 'notebook' | 'drawing' | 'telegram' | 'plan';
  hand?: string;
  blocks: DocBlock[];
  /** Optional discovery (not needed to finish). */
  optional?: boolean;
}

export interface PersonDef {
  id: string;
  name: string;
  role: string;
  initials: string;
  bio: CloseupText[];
}

export interface ItemDef {
  id: string;
  name: string;
  description: CloseupText[];
  icon: string;
  actions?: CloseupAction[];
}

export type DialogueLine =
  | { w: string }
  | { y: string }
  | { n: string }
  | { s: string; t: string }
  | { choice: { id: string; t: string; then?: DialogueLine[]; effects?: Effect[] }[]; key?: string }
  | { quiz: string; options: { t: string; correct?: boolean; reply: DialogueLine[] }[] }
  | { if: Cond; then: DialogueLine[]; else?: DialogueLine[] }
  | { fx: Effect[] };

export interface DialogueDef {
  id: string;
  title: string;
  time?: string;
  lines: DialogueLine[];
  onEnd?: Effect[];
  /** Static noise intensity 0..1 for flavour. */
  static?: number;
}

export interface PuzzleDef {
  id: string;
  chapter: ChapterId;
  title: string;
  kind: string;
  scene: string;
  intro: string;
  clues: string[];
  hints: string[];
  explanation: string;
  onSolve: Effect[];
  req?: Cond;
  /** Message shown after solving, before closing. */
  solvedText?: string;
  /** Solved automatically as soon as this condition holds (search-type puzzles). */
  autoSolve?: Cond;
  /** Effects applied once, the first time the puzzle is opened (e.g. evidence that is part of it). */
  onOpen?: Effect[];
}

export interface ContentBundle {
  chapters: ChapterDef[];
  scenes: SceneDef[];
  puzzles: PuzzleDef[];
  docs: DocDef[];
  people: PersonDef[];
  items: ItemDef[];
  dialogues: DialogueDef[];
}

export type Children = ComponentChildren;
