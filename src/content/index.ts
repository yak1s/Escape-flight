// Assembles all bundled game content. Everything the game needs is here, compiled into the app.
import type { ChapterId, ContentBundle, DialogueDef, DocDef, PuzzleDef, SceneDef } from '../engine/types';
import { CHAPTERS } from './chapters';
import { SCENES } from './scenes';
import { PUZZLES } from './puzzles';
import { DOCS } from './docs';
import { PEOPLE } from './people';
import { ITEMS } from './items';
import { DIALOGUES } from './dialogues';
import { CIPHER_TEXT } from '../puzzles/logic';

const docs: DocDef[] = DOCS.map((d) =>
  d.id === 'cipher-text'
    ? { ...d, blocks: d.blocks.map((b) => ('p' in b && b.p === '__CIPHER__' ? { ...b, p: CIPHER_TEXT } : b)) }
    : d,
);

export const CONTENT: ContentBundle = {
  chapters: CHAPTERS,
  scenes: SCENES,
  puzzles: PUZZLES,
  docs,
  people: PEOPLE,
  items: ITEMS,
  dialogues: DIALOGUES,
};

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const chapterMap = byId(CONTENT.chapters);
const sceneMap = byId(CONTENT.scenes);
const puzzleMap = byId(CONTENT.puzzles);
const docMap = byId(CONTENT.docs);
const dialogueMap = byId(CONTENT.dialogues);
const itemMap = byId(CONTENT.items);
const personMap = byId(CONTENT.people);

function must<T>(map: Map<string, T>, id: string, kind: string): T {
  const v = map.get(id);
  if (!v) throw new Error(`Unknown ${kind}: ${id}`);
  return v;
}

export const chapterById = (id: ChapterId) => must(chapterMap, id, 'chapter');
export const sceneById = (id: string): SceneDef => must(sceneMap, id, 'scene');
export const puzzleById = (id: string): PuzzleDef => must(puzzleMap, id, 'puzzle');
export const docById = (id: string): DocDef => must(docMap, id, 'document');
export const dialogueById = (id: string): DialogueDef => must(dialogueMap, id, 'dialogue');
export const itemById = (id: string) => must(itemMap, id, 'item');
export const personById = (id: string) => must(personMap, id, 'person');
export const hasDoc = (id: string) => docMap.has(id);
export const hasScene = (id: string) => sceneMap.has(id);
