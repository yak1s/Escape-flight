// Pure puzzle logic: data + validators. No DOM, no randomness at check time. These functions are
// the single source of truth for "is this answer correct" and are unit-tested exhaustively.

// ================================================================ P01 Deck plan mosaic
/** Tile ids 0..8 belong in cells 0..8 (row-major). Initial tray order is a fixed shuffle. */
export const MOSAIC_SIZE = 3;
export const MOSAIC_TRAY = [6, 2, 8, 0, 4, 7, 3, 5, 1];
export function mosaicMisplaced(cells: (number | null)[]): number {
  let wrong = 0;
  for (let i = 0; i < 9; i += 1) if (cells[i] !== i) wrong += 1;
  return wrong;
}
export function mosaicSolved(cells: (number | null)[]): boolean {
  return cells.length === 9 && mosaicMisplaced(cells) === 0;
}

// ================================================================ P02 Frozen luggage (sliding blocks)
export interface Block {
  id: string;
  r: number;
  c: number;
  len: number;
  horiz: boolean;
  label: string;
  target?: boolean;
}
export const RUSH_N = 6;
export const RUSH_EXIT_ROW = 2;
export const RUSH_START: Block[] = [
  { id: 'T', r: 2, c: 0, len: 2, horiz: true, label: "Steward's trolley", target: true },
  { id: 'b1', r: 3, c: 2, len: 2, horiz: true, label: 'A. PELL — NORTHERN CROWN' },
  { id: 'b2', r: 1, c: 2, len: 2, horiz: false, label: 'MME O. VASSEUR — THÉÂTRE' },
  { id: 'b3', r: 4, c: 1, len: 2, horiz: true, label: 'MRS G. LUND' },
  { id: 'b4', r: 4, c: 0, len: 2, horiz: false, label: 'P. PELL (stickers)' },
  { id: 'b5', r: 0, c: 5, len: 2, horiz: false, label: 'HERR O. BRANDT' },
  { id: 'b6', r: 0, c: 2, len: 2, horiz: true, label: 'PROF. I. SOLBERG — INSTRUMENTS · FRAGILE' },
  { id: 'b7', r: 2, c: 5, len: 3, horiz: false, label: 'FINCH — LINEN' },
  { id: 'b8', r: 5, c: 2, len: 2, horiz: true, label: 'MR & MRS WHITCOMBE' },
  { id: 'b9', r: 0, c: 0, len: 2, horiz: true, label: 'E. SORREL' },
  { id: 'bA', r: 4, c: 3, len: 2, horiz: true, label: 'MISS A. FENWICK — PRESS' },
  { id: 'bB', r: 3, c: 0, len: 2, horiz: true, label: 'MR T. KRAG' },
  { id: 'bC', r: 0, c: 4, len: 2, horiz: false, label: 'J. AAKRE — CANVASES' },
];
export function rushCells(b: Block): [number, number][] {
  return Array.from({ length: b.len }, (_, k) => (b.horiz ? [b.r, b.c + k] : [b.r + k, b.c]) as [number, number]);
}
export function rushGrid(blocks: Block[]): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: RUSH_N }, () => Array(RUSH_N).fill(null));
  for (const b of blocks) for (const [r, c] of rushCells(b)) g[r][c] = b.id;
  return g;
}
/** Range of positions a block can occupy along its axis given the others. */
export function rushRange(blocks: Block[], id: string): [number, number] {
  const b = blocks.find((x) => x.id === id)!;
  const g = rushGrid(blocks);
  let lo = b.horiz ? b.c : b.r;
  let hi = lo;
  const free = (r: number, c: number) => r >= 0 && c >= 0 && r < RUSH_N && c < RUSH_N && (g[r][c] === null || g[r][c] === id);
  if (b.horiz) {
    while (free(b.r, lo - 1)) lo -= 1;
    while (free(b.r, hi + b.len)) hi += 1;
  } else {
    while (free(lo - 1, b.c)) lo -= 1;
    while (free(hi + b.len, b.c)) hi += 1;
  }
  return [lo, hi];
}
export function rushMove(blocks: Block[], id: string, pos: number): Block[] {
  const [lo, hi] = rushRange(blocks, id);
  const p = Math.max(lo, Math.min(hi, pos));
  return blocks.map((b) => (b.id !== id ? b : b.horiz ? { ...b, c: p } : { ...b, r: p }));
}
export function rushSolved(blocks: Block[]): boolean {
  const t = blocks.find((b) => b.target)!;
  return t.r === RUSH_EXIT_ROW && t.c + t.len === RUSH_N;
}
/** Breadth-first minimal number of moves (a move = sliding one block any distance). */
export function rushSolve(start: Block[]): number {
  const key = (bs: Block[]) => bs.map((b) => (b.horiz ? b.c : b.r)).join(',');
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let depth = 0; depth < 60; depth += 1) {
    const next: Block[][] = [];
    for (const s of frontier) {
      if (rushSolved(s)) return depth;
      for (const b of s) {
        const [lo, hi] = rushRange(s, b.id);
        const cur = b.horiz ? b.c : b.r;
        for (let p = lo; p <= hi; p += 1) {
          if (p === cur) continue;
          const n = rushMove(s, b.id, p);
          const k = key(n);
          if (!seen.has(k)) {
            seen.add(k);
            next.push(n);
          }
        }
      }
    }
    frontier = next;
  }
  return -1;
}

// ================================================================ P03 Wireless valves
export type SocketId = 'OSC' | 'DET' | 'AF' | 'OUT';
export type ValveId = 'MX40' | 'SP4' | 'MH4a' | 'MH4b' | 'PX4';
export const VALVES: { id: ValveId; type: string; pins: number; cap: boolean; milky: boolean }[] = [
  { id: 'MH4a', type: 'MH4', pins: 5, cap: false, milky: true },
  { id: 'PX4', type: 'PX4', pins: 4, cap: false, milky: false },
  { id: 'SP4', type: 'SP4', pins: 5, cap: true, milky: false },
  { id: 'MX40', type: 'MX40', pins: 7, cap: false, milky: false },
  { id: 'MH4b', type: 'MH4', pins: 5, cap: false, milky: false },
];
export const SOCKETS: { id: SocketId; label: string; pins: number; capLead: boolean }[] = [
  { id: 'OSC', label: 'OSC', pins: 7, capLead: false },
  { id: 'DET', label: 'DET', pins: 5, capLead: true },
  { id: 'AF', label: 'AF', pins: 5, capLead: false },
  { id: 'OUT', label: 'OUTPUT', pins: 4, capLead: false },
];
export const VALVE_SOLUTION: Record<SocketId, ValveId> = { OSC: 'MX40', DET: 'SP4', AF: 'MH4b', OUT: 'PX4' };
export function valveFits(valve: ValveId, socket: SocketId): boolean {
  const v = VALVES.find((x) => x.id === valve)!;
  const s = SOCKETS.find((x) => x.id === socket)!;
  return v.pins === s.pins;
}
export function valvesCheck(assign: Partial<Record<SocketId, ValveId>>): { ok: boolean; message: string } {
  for (const s of SOCKETS) if (!assign[s.id]) return { ok: false, message: 'Every socket needs a valve before you switch on.' };
  for (const s of SOCKETS) {
    const v = VALVES.find((x) => x.id === assign[s.id])!;
    if (v.milky) return { ok: false, message: 'The set hums, then one valve stays dark — its getter is milky white. That one has let the air in.' };
  }
  if (assign.DET !== 'SP4') return { ok: false, message: 'A crackle and nothing more. The valve with the top cap belongs under the clip lead.' };
  const ok = (Object.keys(VALVE_SOLUTION) as SocketId[]).every((k) => assign[k] === VALVE_SOLUTION[k]);
  return ok ? { ok: true, message: 'Four filaments glow orange.' } : { ok: false, message: 'Something is in the wrong socket.' };
}

// ================================================================ P04 Power junction (Net) + tuning
export const NET_SIZE = 5;
/** Solved connection masks, row-major. N=1 E=2 S=4 W=8. */
export const NET_SOLUTION = [
  [6, 14, 10, 8, 4],
  [1, 3, 12, 4, 5],
  [2, 14, 11, 11, 9],
  [6, 11, 10, 10, 12],
  [3, 10, 10, 8, 1],
];
export const NET_SOURCE: [number, number] = [2, 0];
export const NET_SINKS: [number, number][] = [
  [0, 4],
  [4, 4],
];
/** Fixed tiles cannot be rotated (the battery terminal). */
export const NET_FIXED = new Set(['2,0']);
/** Initial rotation (quarter turns clockwise applied to the solved mask). */
export const NET_SCRAMBLE = [
  [1, 2, 1, 3, 2],
  [2, 1, 3, 0, 1],
  [0, 3, 2, 1, 3],
  [2, 1, 1, 3, 2],
  [3, 2, 1, 2, 0],
];
export function rotMask(m: number, k: number): number {
  const q = ((k % 4) + 4) % 4;
  return ((m << q) | (m >> (4 - q))) & 15;
}
export function netMasks(rotations: number[][]): number[][] {
  return NET_SOLUTION.map((row, r) => row.map((m, c) => rotMask(m, rotations[r][c])));
}
const DIRS: [number, number, number][] = [
  [-1, 0, 1],
  [0, 1, 2],
  [1, 0, 4],
  [0, -1, 8],
];
const OPP: Record<number, number> = { 1: 4, 2: 8, 4: 1, 8: 2 };
/** Returns the set of powered cells (connected to the source through matching connectors). */
export function netPowered(masks: number[][]): Set<string> {
  const seen = new Set<string>([NET_SOURCE.join(',')]);
  const stack: [number, number][] = [NET_SOURCE];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc, bit] of DIRS) {
      if (!(masks[r][c] & bit)) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= NET_SIZE || nc >= NET_SIZE) continue;
      if (!(masks[nr][nc] & OPP[bit])) continue;
      const k = `${nr},${nc}`;
      if (!seen.has(k)) {
        seen.add(k);
        stack.push([nr, nc]);
      }
    }
  }
  return seen;
}
export function netLooseEnds(masks: number[][]): number {
  let loose = 0;
  for (let r = 0; r < NET_SIZE; r += 1)
    for (let c = 0; c < NET_SIZE; c += 1)
      for (const [dr, dc, bit] of DIRS) {
        if (!(masks[r][c] & bit)) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= NET_SIZE || nc >= NET_SIZE || !(masks[nr][nc] & OPP[bit])) loose += 1;
      }
  return loose;
}
export function netSolved(masks: number[][]): boolean {
  return netPowered(masks).size === NET_SIZE * NET_SIZE && netLooseEnds(masks) === 0;
}
export const TUNE_TARGET = 1330;
export const TUNE_TOLERANCE = 5;
export function tuned(freq: number) {
  return Math.abs(freq - TUNE_TARGET) <= TUNE_TOLERANCE;
}

// ================================================================ P05 Piano lid
export const PIANO_STATEMENTS = [
  { id: 'toward', text: 'The albatross flies toward the moon.' },
  { id: 'stars', text: 'There are seven stars on its wing.' },
  { id: 'masts', text: 'Beneath it sails a three-masted ship.' },
  { id: 'moon', text: 'The moon is full.' },
];
export const PIANO_FALSE = 'masts';

// ================================================================ P06 Next minute
export const NEXT_MINUTE_OPTIONS = [
  { id: 'tromso', gmt: '23:58', text: 'Last wireless contact with Tromsø Radio.' },
  { id: 'engine', gmt: '00:07', text: 'Starboard forward engine stops (carburettor icing).' },
  { id: 'windows', gmt: '00:31', text: 'Two port lounge windows crack under ice load.' },
  { id: 'cell11', gmt: '01:07', text: 'Gas cell 11 reported leaking slightly.' },
  { id: 'ice', gmt: '01:40', text: 'Ice on the envelope estimated at four tons.' },
];
export const NEXT_MINUTE_ANSWER = 'engine';
export function nextMinuteFeedback(id: string): string {
  switch (id) {
    case 'engine':
      return '';
    case 'tromso':
      return 'Wren: "Tromsø? We lost them six minutes ago. That\'s not a prediction, that\'s gossip."';
    case 'cell11':
      return 'Wren: "Cell eleven? Haugen walked the gas cells at midnight — tight as drums. And it\'s four minutes past one now, not seven." (Whose clock is that table using?)';
    case 'windows':
      return 'Wren: "That\'s not the next five minutes, though, is it?"';
    default:
      return 'Wren: "That\'s hours away. I said the next five minutes."';
  }
}

// ================================================================ P07 Fifty years
export const HIDING_SPOTS = [
  { id: 'drawer', label: 'The desk drawer', fail: 'Wren tucks a pencil stub into the desk drawer. In your wreck the desk is crushed flat under a fallen beam; the drawer is a splintered sandwich of ice. Nothing can be got out.' },
  { id: 'tin', label: 'The spare-parts tin on the shelf', fail: 'She drops a button into the spare-parts tin. Your shelf has collapsed; the tins lie burst and rusted into one frozen lump.' },
  { id: 'floor', label: 'Under the loose floor panel', fail: 'She lifts the loose panel and slides a hairpin beneath. Your floor is under a foot of solid ice.' },
  { id: 'chart', label: 'Behind the frequency chart', fail: 'She slips a matchbook behind the frequency chart. Your chart\'s backing has rotted away; whatever was behind it fell and was lost decades ago.' },
  { id: 'clock', label: 'Inside the wall clock', fail: '' },
];
export const HIDING_ANSWER = 'clock';

// ================================================================ P08 Silhouettes
export const WINDOWS = [
  { n: 1, see: 'Fur hat · a teacup' },
  { n: 2, see: 'Face and hat lost in shadow · a large brandy glass' },
  { n: 3, see: 'A headscarf · a coffee cup' },
  { n: 4, see: 'Face and hat lost in shadow · hands in pockets, a notebook on the sill' },
  { n: 5, see: 'A beret · a cup of cocoa' },
];
export const SILHOUETTE_ANSWER = 4;

// ================================================================ P09 Cabin six
/** Doors as they appear in the corridor (plate shown) and the cabin they really are. */
export const CORRIDOR_DOORS = [
  { side: 'port', pos: 1, plate: '1', real: 1 },
  { side: 'port', pos: 2, plate: '3', real: 3 },
  { side: 'port', pos: 3, plate: '5', real: 5 },
  { side: 'port', pos: 4, plate: '7', real: 7 },
  { side: 'port', pos: 5, plate: '6', real: 9, loose: true },
  { side: 'port', pos: 6, plate: '11', real: 11 },
  { side: 'starboard', pos: 1, plate: '2', real: 2 },
  { side: 'starboard', pos: 2, plate: '4', real: 4 },
  { side: 'starboard', pos: 3, plate: '9', real: 6, loose: true },
  { side: 'starboard', pos: 4, plate: '8', real: 8 },
  { side: 'starboard', pos: 5, plate: '10', real: 10 },
  { side: 'starboard', pos: 6, plate: '12', real: 12 },
] as const;
export function cabinSixFeedback(index: number): { ok: boolean; text: string } {
  const d = CORRIDOR_DOORS[index];
  if (d.real === 6) return { ok: true, text: '' };
  if (d.real === 9) return { ok: false, text: 'Wren: "That\'s the one with the bank-vault lock. Finch\'s spare cabin wouldn\'t have that."' };
  const who: Record<number, string> = {
    1: 'the Morrows — snoring like walruses',
    2: 'the Whitcombes',
    3: 'Mrs Lund\'s — she\'s in the lounge, but her door\'s locked',
    4: 'the Krags\'',
    5: 'Herr Brandt and Mr Aakre — I can hear Aakre humming',
    7: 'the professor\'s own cabin, seven — locked',
    8: 'Madame Vasseur\'s, all perfume and padlocks',
    10: 'Mr Pell\'s. I am NOT going in there',
    11: 'Pip Pell and her governess',
    12: 'Miss Fenwick\'s — typewriter going like a machine gun',
  };
  return { ok: false, text: `Wren: "That's ${who[d.real] ?? 'a passenger cabin'}. Not Finch's."` };
}

// ================================================================ P10 Captain's cipher
export const PLAIN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** The captain's personal inner ring (a keyed alphabet). */
export const CIPHER_RING = 'HAVRDBRKEGNXQCFOLPSUIWZMTJ'.split('').filter((ch, i, a) => a.indexOf(ch) === i).join('');
export const CIPHER_OFFSET = 11;
export const CIPHER_PLAINTEXT = 'ALBATROSS COMPASS FALSE WE ARE OVER LAND DAHL WILL NOT TURN';
function fullRing(): string {
  // Ensure the ring is a full permutation of A–Z.
  let ring = CIPHER_RING;
  for (const ch of PLAIN_ALPHABET) if (!ring.includes(ch)) ring += ch;
  return ring;
}
export const RING = fullRing();
/** Plain letter at outer index i sits above inner letter RING[(i + offset) % 26]. */
export function encipher(text: string, offset = CIPHER_OFFSET): string {
  return text
    .split('')
    .map((ch) => {
      const i = PLAIN_ALPHABET.indexOf(ch);
      return i < 0 ? ch : RING[(i + offset) % 26];
    })
    .join('');
}
export function decipher(text: string, offset: number): string {
  return text
    .split('')
    .map((ch) => {
      const j = RING.indexOf(ch);
      return j < 0 ? ch : PLAIN_ALPHABET[(((j - offset) % 26) + 26) % 26];
    })
    .join('');
}
export const CIPHER_TEXT = encipher(CIPHER_PLAINTEXT);
export function cipherSolved(offset: number): boolean {
  return ((offset % 26) + 26) % 26 === CIPHER_OFFSET;
}

// ================================================================ P11 Stacked deck
export const SUITS = ['C', 'H', 'S', 'D'] as const;
export type Card = { v: number; s: (typeof SUITS)[number] };
export function nextCard(card: Card): Card {
  const v = ((card.v + 3 - 1) % 13) + 1;
  const s = SUITS[(SUITS.indexOf(card.s) + 1) % 4];
  return { v, s };
}
export function cardName(card: Card): string {
  const names: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  const sym: Record<string, string> = { C: '♣', H: '♥', S: '♠', D: '♦' };
  return `${names[card.v] ?? card.v}${sym[card.s]}`;
}
export const STACK_START: Card = { v: 4, s: 'C' };
export const FAN_LENGTH = 12;
export const FAN_HIDDEN = [1, 4, 7, 10];
export function fan(): Card[] {
  const out: Card[] = [STACK_START];
  while (out.length < FAN_LENGTH) out.push(nextCard(out[out.length - 1]));
  return out;
}
export const STACK_ANSWER: Card[] = FAN_HIDDEN.map((i) => fan()[i]);
export function stackSolved(cards: Card[]): boolean {
  return cards.length === 4 && cards.every((c, i) => c.v === STACK_ANSWER[i].v && c.s === STACK_ANSWER[i].s);
}

// ================================================================ P12 Mirror box
/** 5×5 grid. Cells: '.' empty, 'M' rotatable mirror, 'X' velvet block, 'S' slide (pass through), '/' or '\' fixed mirror. */
export const MIRROR_GRID = ['MXM.M', 'XMMM.', '.M.XM', 'MMSMX', 'M.MM.'];
export const MIRROR_ENTRY = { r: 2, c: -1, dir: 'E' as Dir };
export const MIRROR_EXIT = { r: -1, c: 3 }; // leaves through the top edge above column 3 (the lens)
export type Dir = 'N' | 'E' | 'S' | 'W';
const MOVE: Record<Dir, [number, number]> = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const SLASH: Record<Dir, Dir> = { E: 'N', N: 'E', W: 'S', S: 'W' };
const BACK: Record<Dir, Dir> = { E: 'S', S: 'E', W: 'N', N: 'W' };
/** orientation per cell key "r,c": 0 = '/', 1 = '\'. */
export function traceBeam(orient: Record<string, number>): { path: [number, number][]; exit: { r: number; c: number } | null; slide: boolean } {
  let r = MIRROR_ENTRY.r;
  let c = MIRROR_ENTRY.c;
  let dir: Dir = MIRROR_ENTRY.dir;
  const path: [number, number][] = [];
  let slide = false;
  for (let steps = 0; steps < 60; steps += 1) {
    r += MOVE[dir][0];
    c += MOVE[dir][1];
    if (r < 0 || c < 0 || r >= 5 || c >= 5) return { path, exit: { r, c }, slide };
    path.push([r, c]);
    const cell = MIRROR_GRID[r][c];
    if (cell === 'X') return { path, exit: null, slide };
    if (cell === 'S') slide = true;
    let o = -1;
    if (cell === 'M') o = orient[`${r},${c}`] ?? 0;
    if (cell === '/') o = 0;
    if (cell === '\\') o = 1;
    if (o === 0) dir = SLASH[dir];
    if (o === 1) dir = BACK[dir];
  }
  return { path, exit: null, slide };
}
export function mirrorSolved(orient: Record<string, number>): boolean {
  const t = traceBeam(orient);
  return Boolean(t.exit && t.exit.r === MIRROR_EXIT.r && t.exit.c === MIRROR_EXIT.c && t.slide);
}
export const MIRROR_INITIAL: Record<string, number> = (() => {
  const o: Record<string, number> = {};
  MIRROR_GRID.forEach((row, r) => row.split('').forEach((ch, c) => ch === 'M' && (o[`${r},${c}`] = (r + c) % 2)));
  return o;
})();

// ================================================================ P13 Rat run
export const RAT_NODES = ['L', 'P', 'G', 'M', 'K1', 'K2', 'K3', 'C'] as const;
export type RatNode = (typeof RAT_NODES)[number];
export const RAT_NAMES: Record<RatNode, string> = {
  L: 'Lounge hatch',
  P: 'Pantry',
  G: 'Galley shaft',
  M: 'Mail room',
  K1: 'Keel fr. 80',
  K2: 'Keel fr. 125',
  K3: 'Keel fr. 170',
  C: 'Control-car ladder',
};
export const RAT_EDGES: [RatNode, RatNode][] = [
  ['L', 'P'],
  ['P', 'G'],
  ['G', 'K1'],
  ['K1', 'K2'],
  ['K2', 'K3'],
  ['K3', 'C'],
  ['P', 'M'],
  ['M', 'K2'],
];
export const PATROLS: Record<string, RatNode[]> = {
  Rye: ['M', 'P', 'G', 'P'],
  Dale: ['K3', 'K2', 'K1', 'K2'],
};
export const RAT_MAX_STEPS = 12;
export function ratAdjacent(a: RatNode, b: RatNode) {
  return RAT_EDGES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
export function patrolAt(name: string, t: number): RatNode {
  const route = PATROLS[name];
  return route[((t % route.length) + route.length) % route.length];
}
/**
 * Simulate a plan (list of positions after each minute; staying put = repeating the node).
 * Returns the minute and patrol that caught Wren, or success.
 */
export function ratSimulate(plan: RatNode[]): { ok: boolean; caughtAt?: number; by?: string; reason?: string } {
  let pos: RatNode = 'L';
  for (let t = 1; t <= plan.length; t += 1) {
    const next = plan[t - 1];
    if (next !== pos && !ratAdjacent(pos, next)) return { ok: false, caughtAt: t, reason: 'not connected' };
    for (const name of Object.keys(PATROLS)) {
      const now = patrolAt(name, t);
      const before = patrolAt(name, t - 1);
      if (now === next) return { ok: false, caughtAt: t, by: name, reason: 'same station' };
      if (before === next && now === pos && pos !== next) return { ok: false, caughtAt: t, by: name, reason: 'passed in the run' };
    }
    pos = next;
    if (pos === 'C') return { ok: true };
  }
  return { ok: false, reason: 'did not arrive' };
}

// ================================================================ P14 Sorrel's hand
export const HAND_FEATURES = [
  { id: 'loopS', label: 'S with a loop at the top' },
  { id: 'straight9', label: '9 with a straight stem' },
  { id: 'steepO', label: 'ø slashed steeply' },
];
export const HAND_SAMPLES = [
  { id: 'pell', name: 'A. Pell', features: [] as string[] },
  { id: 'vasseur', name: 'O. Vasseur', features: ['loopS'] },
  { id: 'solberg', name: 'I. Solberg', features: ['loopS', 'straight9', 'steepO'] },
  { id: 'fenwick', name: 'A. Fenwick', features: ['loopS', 'straight9'] },
  { id: 'finch', name: 'P. Finch', features: ['straight9'] },
];
export const HAND_ANSWER = 'solberg';

// ================================================================ P15 Standing wave
export const WAVE_TARGET = { freq: 7, amp: 5, phase: 210 };
export const WAVE_LIMITS = { freq: [1, 12], amp: [1, 8], phase: [0, 330] };
export function waveStatus(s: { freq: number; amp: number; phase: number }) {
  return {
    freq: s.freq === WAVE_TARGET.freq,
    amp: s.amp === WAVE_TARGET.amp,
    phase: s.phase === WAVE_TARGET.phase,
  };
}
export function waveSolved(s: { freq: number; amp: number; phase: number }) {
  const st = waveStatus(s);
  return st.freq && st.amp && st.phase;
}

// ================================================================ P16 Lullaby bird
export const LULLABY_PITCHES = ['E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'E4'];
export const LULLABY = ['E4', 'A4', 'C5', 'B4', 'A4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4', 'B4', 'A4'];
export const LULLABY_PRESENT = [0, 2, 5, 7, 9, 10, 13, 15]; // steps whose pins survived
export function lullabySolved(pins: (string | null)[]): boolean {
  return pins.length === 16 && pins.every((p, i) => p === LULLABY[i]);
}
export function lullabyInitial(): (string | null)[] {
  return LULLABY.map((p, i) => (LULLABY_PRESENT.includes(i) ? p : null));
}

// ================================================================ P17 Brass wren
export type BroochMove = 'crest' | 'eye' | 'tail' | 'wingL' | 'wingR' | 'feet';
/** The bird's LEFT wing appears on the viewer's RIGHT. */
export const BROOCH_SEQUENCE: BroochMove[] = ['crest', 'eye', 'tail', 'tail', 'wingL'];
export function broochStep(progress: number, move: BroochMove): number {
  if (BROOCH_SEQUENCE[progress] === move) return progress + 1;
  // A wrong move resets the mechanism; the crest always starts it again.
  return move === BROOCH_SEQUENCE[0] ? 1 : 0;
}
export function broochOpen(progress: number) {
  return progress >= BROOCH_SEQUENCE.length;
}

// ================================================================ P18 Catwalk
export const CW_FRAMES = [80, 95, 110, 125, 140, 155, 170];
export const CW_ROWS = ['P', 'C', 'S'] as const;
export type Stamp = 'tri' | 'circ' | 'sq';
/** Edge key "a|b" with nodes like "80C". */
export const CW_EDGES: Record<string, Stamp> = {
  // port rail
  '80P|95P': 'circ',
  '95P|110P': 'tri',
  '110P|125P': 'circ',
  '125P|140P': 'tri',
  '140P|155P': 'sq',
  '155P|170P': 'tri',
  // centre line
  '80C|95C': 'tri',
  '95C|110C': 'circ',
  '110C|125C': 'tri',
  '125C|140C': 'sq',
  '140C|155C': 'circ',
  '155C|170C': 'circ',
  // starboard rail
  '80S|95S': 'sq',
  '95S|110S': 'circ',
  '110S|125S': 'tri',
  '125S|140S': 'tri',
  '140S|155S': 'tri',
  '155S|170S': 'circ',
  // cross members
  '80P|80C': 'tri',
  '80C|80S': 'circ',
  '95P|95C': 'circ',
  '95C|95S': 'tri',
  '110P|110C': 'tri',
  '110C|110S': 'sq',
  '125P|125C': 'circ',
  '125C|125S': 'tri',
  '140P|140C': 'tri',
  '140C|140S': 'circ',
  '155P|155C': 'circ',
  '155C|155S': 'sq',
  '170P|170C': 'tri',
  '170C|170S': 'tri',
};
export const CW_START = '80C';
export const CW_GOAL = '170C';
export function cwFrame(node: string) {
  return Number(node.slice(0, -1));
}
export function cwEdgeKey(a: string, b: string): string | null {
  if (CW_EDGES[`${a}|${b}`]) return `${a}|${b}`;
  if (CW_EDGES[`${b}|${a}`]) return `${b}|${a}`;
  return null;
}
export function cwEdgeSafe(key: string): boolean {
  const stamp = CW_EDGES[key];
  if (stamp === 'tri') return true;
  if (stamp === 'sq') return false;
  const [a, b] = key.split('|');
  const inSpan = (n: string) => cwFrame(n) >= 95 && cwFrame(n) <= 140;
  return !(inSpan(a) && inSpan(b));
}
export function cwCheck(path: string[]): { ok: boolean; badStep?: number; reason?: string } {
  if (path[0] !== CW_START) return { ok: false, badStep: 0, reason: 'start' };
  for (let i = 1; i < path.length; i += 1) {
    const key = cwEdgeKey(path[i - 1], path[i]);
    if (!key) return { ok: false, badStep: i, reason: 'no girder' };
    if (!cwEdgeSafe(key)) return { ok: false, badStep: i, reason: 'unsafe' };
  }
  if (path[path.length - 1] !== CW_GOAL) return { ok: false, reason: 'not there yet' };
  return { ok: true };
}

// ================================================================ P19 Ballast trim
export const BAGS = [
  { id: '35P', frame: 35, side: -1, kg: 500 },
  { id: '35S', frame: 35, side: 1, kg: 450 },
  { id: '80P', frame: 80, side: -1, kg: 600 },
  { id: '80S', frame: 80, side: 1, kg: 650 },
  { id: '125P', frame: 125, side: -1, kg: 700 },
  { id: '125S', frame: 125, side: 1, kg: 550 },
  { id: '170P', frame: 170, side: -1, kg: 400 },
  { id: '170S', frame: 170, side: 1, kg: 350 },
  { id: '205P', frame: 205, side: -1, kg: 300 },
  { id: '205S', frame: 205, side: 1, kg: 450 },
];
export const BALLAST = { centre: 118, lateral: 6, pitchExcess: 47900, rollExcess: 1800, minKg: 1600, maxKg: 1900, pitchTol: 600, rollTol: 500 };
export function ballastState(released: string[]) {
  let kg = 0;
  let pitch = BALLAST.pitchExcess;
  let roll = BALLAST.rollExcess;
  for (const id of released) {
    const b = BAGS.find((x) => x.id === id);
    if (!b) continue;
    kg += b.kg;
    pitch -= b.kg * (b.frame - BALLAST.centre);
    roll -= b.kg * b.side * BALLAST.lateral;
  }
  return {
    kg,
    pitch,
    roll,
    kgOk: kg >= BALLAST.minKg && kg <= BALLAST.maxKg,
    pitchOk: Math.abs(pitch) <= BALLAST.pitchTol,
    rollOk: Math.abs(roll) <= BALLAST.rollTol,
  };
}
export function ballastSolved(released: string[]) {
  const s = ballastState(released);
  return s.kgOk && s.pitchOk && s.rollOk;
}
export const BALLAST_SOLUTION = ['125P', '125S', '205S'];

// ================================================================ P20 Valve cords (amidakuji)
export const CORD_COUNT = 7;
export const CORD_CELLS = [4, 5, 6, 7, 8, 9, 10];
export const CORD_HANDLES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
/** level (1..12) → left cord index (0-based) of a crossbar joining cords i and i+1. */
export const CORD_RUNGS: { level: number; left: number; hidden: boolean }[] = [
  { level: 1, left: 2, hidden: false },
  { level: 2, left: 1, hidden: true },
  { level: 3, left: 4, hidden: false },
  { level: 4, left: 0, hidden: false },
  { level: 5, left: 2, hidden: false },
  { level: 6, left: 0, hidden: true },
  { level: 7, left: 3, hidden: false },
  { level: 8, left: 1, hidden: false },
  { level: 9, left: 5, hidden: false },
  { level: 10, left: 2, hidden: true },
  { level: 11, left: 0, hidden: false },
  { level: 12, left: 3, hidden: false },
];
export function traceCord(start: number, includeHidden = true): number {
  let pos = start;
  for (let level = 1; level <= 12; level += 1) {
    for (const r of CORD_RUNGS) {
      if (r.level !== level || (!includeHidden && r.hidden)) continue;
      if (r.left === pos) pos += 1;
      else if (r.left + 1 === pos) pos -= 1;
    }
  }
  return pos;
}
export const CELL7_START = 3;
export const CORD_ANSWER = CORD_HANDLES[traceCord(CELL7_START)];

// ================================================================ P21 Star wheel
export const STAR_TARGET_AZ = 233;
export const STAR_TOLERANCE = 3;
export const COMPASS_AT_SIGHTING = 270;
export const DEVIATION = 37;
export function starHeadingOk(heading: number) {
  return Math.abs(heading - STAR_TARGET_AZ) <= STAR_TOLERANCE;
}

// ================================================================ P22 Two lights
export const LIGHTS = [
  { id: 'ravnvik', name: 'Ravnvik Light', char: 'Fl(3) W 15s', x: 11.26, y: 6.5 },
  { id: 'kvitnes', name: 'Kvitnes Light', char: 'Oc W 6s', x: 2.0, y: 15.5 },
  { id: 'skarv', name: 'Skarv Point Light', char: 'Fl(2) W 10s', x: -14.5, y: 9.0 },
  { id: 'ravntind', name: 'Ravntind air beacon', char: 'Fl R 5s', x: -6.55, y: 4.59 },
  { id: 'hestnes', name: 'Hestnes Light', char: 'Fl G 3s', x: 15.0, y: 14.0 },
];
export const LIGHT_A = { answer: 'ravnvik', compass: 97 };
export const LIGHT_B = { answer: 'ravntind', compass: 342 };
export function trueBearing(compass: number, deviation = DEVIATION) {
  return (((compass - deviation) % 360) + 360) % 360;
}
export function bearingOk(value: number, target: number, tol = 2) {
  const d = Math.abs((((value - target) % 360) + 540) % 360 - 180);
  return d <= tol;
}
export function twoLightsSolved(a: string, b: string, bearingA: number, bearingB: number) {
  return a === LIGHT_A.answer && b === LIGHT_B.answer && bearingOk(bearingA, trueBearing(LIGHT_A.compass)) && bearingOk(bearingB, trueBearing(LIGHT_B.compass));
}
/** Ship's position (km, map grid, north = +y). */
export const SHIP_FIX = { x: 0, y: 0 };
export const LANDING = { x: 7.29, y: 7.55, name: 'Kvitfjord ice' };
export const RIDGE = { x: 6.32, y: -8.39, name: 'Ravnkammen ridge' };

// ================================================================ P23 Course
export const TRUE_COURSE = 44;
export const COMPASS_COURSE = 81;
export function courseOk(compass: number) {
  return Math.abs(compass - COMPASS_COURSE) <= 1;
}

// ================================================================ P24 Hatch gears
export const GEAR_PEGS: Record<string, { x: number; y: number; fixed?: number }> = {
  D: { x: 0, y: 0, fixed: 2 },
  A: { x: 5, y: 0 },
  B: { x: 9, y: 0 },
  C: { x: 5, y: -5 },
  E: { x: 9, y: -3 },
  L: { x: 13, y: -3, fixed: 2 },
};
export const GEAR_INVENTORY = [1, 2, 3, 3];
export function gearSimulate(placed: Record<string, number>): { latch: 'open' | 'tighten' | 'still' | 'jam'; meshes: [string, string][]; spin: Record<string, number>; collide: [string, string][] } {
  const radii: Record<string, number> = {};
  for (const [k, p] of Object.entries(GEAR_PEGS)) {
    if (p.fixed) radii[k] = p.fixed;
    else if (placed[k]) radii[k] = placed[k];
  }
  const names = Object.keys(radii);
  const meshes: [string, string][] = [];
  const collide: [string, string][] = [];
  for (let i = 0; i < names.length; i += 1)
    for (let j = i + 1; j < names.length; j += 1) {
      const a = GEAR_PEGS[names[i]];
      const b = GEAR_PEGS[names[j]];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = radii[names[i]] + radii[names[j]];
      if (Math.abs(d - s) < 1e-6) meshes.push([names[i], names[j]]);
      else if (d < s) collide.push([names[i], names[j]]);
    }
  const spin: Record<string, number> = { D: 1 };
  if (collide.length) return { latch: 'jam', meshes, spin, collide };
  const stack = ['D'];
  let jam = false;
  while (stack.length) {
    const n = stack.pop()!;
    for (const [a, b] of meshes) {
      const m = a === n ? b : b === n ? a : null;
      if (!m) continue;
      if (spin[m] === undefined) {
        spin[m] = -spin[n];
        stack.push(m);
      } else if (spin[m] !== -spin[n]) jam = true;
    }
  }
  if (jam) return { latch: 'jam', meshes, spin: { D: 0 }, collide };
  if (spin.L === undefined) return { latch: 'still', meshes, spin, collide };
  // Drive turns clockwise (+1). The latch opens when it turns anticlockwise (-1).
  return { latch: spin.L === -1 ? 'open' : 'tighten', meshes, spin, collide };
}
export function gearsSolved(placed: Record<string, number>) {
  const counts: Record<number, number> = {};
  for (const r of Object.values(placed)) if (r) counts[r] = (counts[r] || 0) + 1;
  const inv: Record<number, number> = {};
  for (const r of GEAR_INVENTORY) inv[r] = (inv[r] || 0) + 1;
  if (Object.entries(counts).some(([r, n]) => n > (inv[Number(r)] || 0))) return false;
  return gearSimulate(placed).latch === 'open';
}

// ================================================================ P26 Appendix C
export const ANOMALIES = [
  { id: 'C1', gmt: '23:51', text: 'Unidentified station, no call sign.', log: 'log-contact' },
  { id: 'C2', gmt: '00:04', text: 'Engine failure written down before it happened.', log: 'log-engine' },
  { id: 'C3', gmt: '00:24', text: "Captain's log taken to the First Officer.", log: 'log-captain' },
  { id: 'C4', gmt: '00:52', text: 'Staged disturbance empties the control car.', log: 'log-vasseur' },
  { id: 'C5', gmt: '01:31', text: 'Ballast released at frames 125 and 205.', log: 'log-ballast' },
  { id: 'C6', gmt: '01:48', text: 'Gas cell 7 valve opened from the keel.', log: 'log-valve' },
];
export function appendixSolved(matches: Record<string, string>) {
  return ANOMALIES.every((a) => matches[a.id] === a.log);
}

// ================================================================ P27 Finale
export interface CardSpec {
  digits: string;
  words: boolean;
  underline: boolean;
  degree: boolean;
  compassWord: boolean;
  aloud: boolean;
}
const ROT: Record<string, string> = { '0': '0', '1': '1', '6': '9', '8': '8', '9': '6' };
/** What a helmsman reading the card upside down sees in the figures, or null if unreadable. */
export function upsideDown(digits: string): string | null {
  let out = '';
  for (const ch of digits.split('').reverse()) {
    if (!(ch in ROT)) return null;
    out += ROT[ch];
  }
  return out;
}
export function cardCheck(card: CardSpec): { ok: boolean; reason: string } {
  const d = card.digits.replace(/\D/g, '');
  if (d.length === 0) return { ok: false, reason: 'empty' };
  const n = Number(d);
  if (n === TRUE_COURSE) return { ok: false, reason: 'true-course' };
  if (n !== COMPASS_COURSE) return { ok: false, reason: 'wrong-number' };
  if (card.words || card.underline) return { ok: true, reason: '' };
  const flipped = upsideDown(d.padStart(3, '0'));
  if (flipped && Number(flipped) <= 360) return { ok: false, reason: 'ambiguous' };
  return { ok: true, reason: '' };
}
export const DESCENT = {
  shipAlt: 1460,
  saddleKm: 3.5,
  saddleAlt: 1240,
  fjordStartKm: 8.5,
  landingEndKm: 11.0,
  routeKm: 12,
  margin: 60,
  rates: [70, 140, 210, 280],
};
export function terrainAt(km: number): number {
  if (km <= DESCENT.saddleKm) return 600 + (DESCENT.saddleAlt - 600) * (km / DESCENT.saddleKm);
  if (km <= DESCENT.fjordStartKm) return DESCENT.saddleAlt * (1 - (km - DESCENT.saddleKm) / (DESCENT.fjordStartKm - DESCENT.saddleKm));
  if (km <= DESCENT.landingEndKm) return 0;
  return Math.min(600, (km - DESCENT.landingEndKm) * 900);
}
export function altitudeAt(km: number, startKm: number, rate: number): number {
  return km <= startKm ? DESCENT.shipAlt : Math.max(0, DESCENT.shipAlt - rate * (km - startKm));
}
export function descentCheck(startKm: number, rate: number): { ok: boolean; reason: string; touchdown: number } {
  const touchdown = startKm + DESCENT.shipAlt / rate;
  const onIce = (km: number) => km >= DESCENT.fjordStartKm && km <= DESCENT.landingEndKm;
  for (let km = 0; km <= Math.min(touchdown, DESCENT.routeKm) + 1e-9; km += 0.05) {
    if (onIce(km)) continue; // the fjord ice is where we mean to touch down
    const alt = altitudeAt(km, startKm, rate);
    if (alt < terrainAt(km) + DESCENT.margin) {
      return { ok: false, reason: km <= DESCENT.saddleKm + 0.25 ? 'saddle' : km < DESCENT.fjordStartKm ? 'terrain' : 'late', touchdown };
    }
  }
  if (touchdown < DESCENT.fjordStartKm) return { ok: false, reason: 'early', touchdown };
  if (touchdown > DESCENT.landingEndKm) return { ok: false, reason: 'late', touchdown };
  return { ok: true, reason: '', touchdown };
}
export type Order = -1 | -0.5 | 0 | 0.5 | 1;
export const ENGINES = ['PF', 'SF', 'PA', 'SA'] as const;
export type EngineId = (typeof ENGINES)[number];
export function landingCheck(orders: Record<EngineId, Order>) {
  const live = { PF: orders.PF, SF: 0, PA: orders.PA, SA: orders.SA }; // SF has been dead since 01:07
  const moment = 1.5 * live.SA + 1.0 * live.SF - 1.5 * live.PA - 1.0 * live.PF;
  const thrust = live.PF + live.SF + live.PA + live.SA;
  const ok = moment >= 3 - 1e-9 && Math.abs(thrust) <= 0.5 + 1e-9;
  let reason = '';
  if (!ok) {
    if (moment <= 0) reason = 'wrong-way';
    else if (moment < 3) reason = orders.SF !== 0 && orders.SA !== 1 ? 'dead-engine' : 'weak';
    else reason = thrust > 0 ? 'too-fast' : 'reversing';
  }
  return { ok, moment, thrust, reason };
}
