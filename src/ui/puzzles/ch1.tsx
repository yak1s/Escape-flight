import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { svgPoint } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import {
  MOSAIC_TRAY,
  mosaicMisplaced,
  mosaicSolved,
  RUSH_START,
  RUSH_N,
  RUSH_EXIT_ROW,
  rushMove,
  rushRange,
  rushSolved,
  type Block,
  VALVES,
  SOCKETS,
  valveFits,
  valvesCheck,
  type SocketId,
  type ValveId,
  NET_SCRAMBLE,
  NET_SIZE,
  NET_FIXED,
  NET_SINKS,
  NET_SOURCE,
  netMasks,
  netPowered,
  netSolved,
  TUNE_TARGET,
  tuned,
} from '../../puzzles/logic';
import { DeckPlanDrawing } from '../../art/docart';

// =====================================================================================
// P01 — Deck plan mosaic (drag a tile, or tap a tile then a space)
// =====================================================================================
interface MosaicState {
  cells: (number | null)[];
}
export function Mosaic({ saved, save, solve }: PuzzleProps) {
  const init = (saved as MosaicState) || { cells: Array(9).fill(null) };
  const [cells, setCells] = useState<(number | null)[]>(init.cells);
  const [sel, setSel] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ tile: number; x: number; y: number; from: 'tray' | number; moved: boolean } | null>(null);
  const [msg, setMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const tray = MOSAIC_TRAY.filter((t) => !cells.includes(t));
  const CELL = 180;
  const FX = 30;
  const FY = 20;

  const commit = (next: (number | null)[]) => {
    setCells(next);
    save({ cells: next });
    if (next.every((c) => c !== null)) {
      if (mosaicSolved(next)) {
        audio.sfx('unlock');
        setMsg('');
        setTimeout(solve, 500);
      } else {
        audio.sfx('fail', 0.6);
        setMsg(`The lines don't meet — ${mosaicMisplaced(next)} tiles are in the wrong place.`);
      }
    } else setMsg('');
  };

  const place = (tile: number, cell: number, from: 'tray' | number) => {
    const next = [...cells];
    const occupant = next[cell];
    if (typeof from === 'number') next[from] = occupant; // swap
    next[cell] = tile;
    if (from === 'tray' && occupant !== null) {
      /* occupant returns to tray */
    }
    audio.sfx('mirror_click', 0.8);
    commit(next);
  };

  const cellAt = (x: number, y: number) => {
    const c = Math.floor((x - FX) / CELL);
    const r = Math.floor((y - FY) / CELL);
    if (c < 0 || c > 2 || r < 0 || r > 2) return null;
    return r * 3 + c;
  };

  const trayPos = (i: number) => ({ x: 30 + (i % 5) * 112, y: 600 + Math.floor(i / 5) * 112 });

  const onDown = (tile: number, from: 'tray' | number) => (e: PointerEvent) => {
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ tile, x: p.x, y: p.y, from, moved: false });
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    const moved = drag.moved || Math.hypot(p.x - drag.x, p.y - drag.y) > 12;
    setDrag({ ...drag, x: p.x, y: p.y, moved });
  };
  const onUp = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) {
      // Tap behaviour
      if (typeof d.from === 'number') {
        if (sel !== null) {
          place(sel, d.from, cells.includes(sel) ? cells.indexOf(sel) : 'tray');
          setSel(null);
        } else {
          const next = [...cells];
          next[d.from] = null;
          audio.sfx('ui_tap');
          commit(next);
        }
      } else setSel(sel === d.tile ? null : d.tile);
      return;
    }
    const cell = cellAt(d.x, d.y);
    if (cell !== null) place(d.tile, cell, d.from);
    else if (typeof d.from === 'number') {
      const next = [...cells];
      next[d.from] = null;
      commit(next);
    }
  };
  const onCellTap = (cell: number) => {
    if (sel === null || drag) return;
    place(sel, cell, cells.includes(sel) ? cells.indexOf(sel) : 'tray');
    setSel(null);
  };

  const Tile = ({ tile, x, y, size, ghost }: { tile: number; x: number; y: number; size: number; ghost?: boolean }) => (
    <>
    {/* Solid hit area: the drawing itself has unfilled gaps that a finger would fall through. */}
    <rect x={x} y={y} width={size} height={size} fill="#0b1426" />
    <svg x={x} y={y} width={size} height={size} viewBox={`${(tile % 3) * 200} ${Math.floor(tile / 3) * 200} 200 200`} opacity={ghost ? 0.85 : 1} style={{ overflow: 'hidden' }}>
      <DeckPlanDrawing />
      <rect x={(tile % 3) * 200 + 1} y={Math.floor(tile / 3) * 200 + 1} width={198} height={198} fill="none" stroke="#c9a45c" stroke-width="3" opacity="0.55" />
    </svg>
    </>
  );

  return (
    <>
      <div class="pz-body">
        <svg ref={svgRef} class="pz-svg" viewBox="0 0 600 830" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)} data-testid="mosaic">
          <rect x={FX - 12} y={FY - 12} width={CELL * 3 + 24} height={CELL * 3 + 24} rx="10" fill="#2a1e10" stroke="#c9a45c" stroke-width="4" />
          {Array.from({ length: 9 }, (_, i) => {
            const x = FX + (i % 3) * CELL;
            const y = FY + Math.floor(i / 3) * CELL;
            const t = cells[i];
            return (
              <g key={i}>
                <rect x={x + 2} y={y + 2} width={CELL - 4} height={CELL - 4} fill="#0b1426" stroke="#3a4a6a" stroke-dasharray="6 6" onClick={() => onCellTap(i)} data-testid={`mcell-${i}`} />
                {t !== null && !(drag && drag.from === i && drag.moved) && (
                  <g onPointerDown={onDown(t, i) as never} style={{ cursor: 'grab' }} data-testid={`mplaced-${t}`}>
                    <Tile tile={t} x={x + 2} y={y + 2} size={CELL - 4} />
                  </g>
                )}
              </g>
            );
          })}
          <text x="300" y="590" text-anchor="middle" fill="#9ba8bd" font-size="18">
            Tiles
          </text>
          {tray.map((t, i) => {
            const p = trayPos(i);
            if (drag && drag.from === 'tray' && drag.tile === t && drag.moved) return null;
            return (
              <g key={t} onPointerDown={onDown(t, 'tray') as never} style={{ cursor: 'grab' }} data-testid={`mtile-${t}`}>
                <Tile tile={t} x={p.x} y={p.y} size={100} />
                {sel === t && <rect x={p.x - 4} y={p.y - 4} width={108} height={108} fill="none" stroke="#7de3b8" stroke-width="5" rx="6" />}
              </g>
            );
          })}
          {drag && drag.moved && <Tile tile={drag.tile} x={drag.x - 70} y={drag.y - 70} size={140} ghost />}
        </svg>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg || (sel !== null ? 'Now tap a space in the frame.' : '')}
      </div>
      <div class="pz-foot">
        <Btn kind="ghost" onClick={() => commit(Array(9).fill(null))}>
          Clear frame
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P02 — Frozen luggage (sliding blocks; drag along the length of each piece)
// =====================================================================================
const TRUNK_COLORS: Record<string, string> = {
  T: '#c9a45c',
  b1: '#5b3a2a',
  b2: '#2a2050',
  b3: '#6a4a2e',
  b4: '#a8506a',
  b5: '#4c5a3a',
  b6: '#3b4f63',
  b7: '#7b7468',
  b8: '#5a3e55',
  b9: '#15151a',
  bA: '#3c5a5a',
  bB: '#6b3d2e',
  bC: '#5e4a2a',
};
export function Rush({ saved, save, solve }: PuzzleProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const s = saved as { pos?: number[]; moves?: number } | undefined;
    if (s?.pos && s.pos.length === RUSH_START.length) return RUSH_START.map((b, i) => (b.horiz ? { ...b, c: s.pos![i] } : { ...b, r: s.pos![i] }));
    return RUSH_START;
  });
  const [moves, setMoves] = useState<number>((saved as { moves?: number })?.moves ?? 0);
  const [drag, setDrag] = useState<{ id: string; start: number; origin: number; offset: number } | null>(null);
  const [label, setLabel] = useState('');
  const [won, setWon] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const C = 92;
  const O = 24;

  const persist = (b: Block[], m: number) => save({ pos: b.map((x) => (x.horiz ? x.c : x.r)), moves: m });

  const down = (b: Block) => (e: PointerEvent) => {
    if (won) return;
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ id: b.id, start: b.horiz ? p.x : p.y, origin: b.horiz ? b.c : b.r, offset: 0 });
    setLabel(b.label);
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const b = blocks.find((x) => x.id === drag.id)!;
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    const [lo, hi] = rushRange(blocks, b.id);
    const delta = (b.horiz ? p.x : p.y) - drag.start;
    const clamped = Math.max((lo - drag.origin) * C, Math.min((hi - drag.origin) * C, delta));
    setDrag({ ...drag, offset: clamped });
  };
  const up = () => {
    if (!drag) return;
    const b = blocks.find((x) => x.id === drag.id)!;
    const target = drag.origin + Math.round(drag.offset / C);
    setDrag(null);
    if (target === drag.origin) return;
    const next = rushMove(blocks, b.id, target);
    const m = moves + 1;
    audio.sfx('slide', 0.8);
    setBlocks(next);
    setMoves(m);
    persist(next, m);
    if (rushSolved(next)) {
      setWon(true);
      setTimeout(solve, 900);
    }
  };

  return (
    <>
      <div class="pz-body">
        <svg ref={svgRef} class="pz-svg" viewBox="0 0 600 620" onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-testid="rush">
          <defs>
            <pattern id="iceFloor" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#14304a" />
              <path d="M0 40L40 0" stroke="#24476a" stroke-width="2" />
            </pattern>
          </defs>
          <rect x={O - 10} y={O - 10} width={C * RUSH_N + 20} height={C * RUSH_N + 20} rx="12" fill="#0a1626" stroke="#5d9fb0" stroke-width="3" />
          <rect x={O} y={O} width={C * RUSH_N} height={C * RUSH_N} fill="url(#iceFloor)" />
          {/* exit to the linen alcove */}
          <rect x={O + C * RUSH_N} y={O + RUSH_EXIT_ROW * C + 6} width={40} height={C - 12} fill="#c9a45c" opacity="0.25" />
          <text x={O + C * RUSH_N + 20} y={O + RUSH_EXIT_ROW * C + C / 2 + 6} text-anchor="middle" fill="#ecd398" font-size="22">
            ⇥
          </text>
          {blocks.map((b) => {
            const off = drag?.id === b.id ? drag.offset : 0;
            const x = O + b.c * C + (b.horiz ? off : 0) + (won && b.target ? 300 : 0);
            const y = O + b.r * C + (b.horiz ? 0 : off);
            const w = (b.horiz ? b.len : 1) * C;
            const h = (b.horiz ? 1 : b.len) * C;
            return (
              <g key={b.id} onPointerDown={down(b) as never} style={{ cursor: b.horiz ? 'ew-resize' : 'ns-resize', transition: drag?.id === b.id ? 'none' : 'transform 0.15s' }} data-testid={`blk-${b.id}`}>
                <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx="10" fill={TRUNK_COLORS[b.id]} stroke={b.target ? '#f6e1a8' : '#0006'} stroke-width={b.target ? 4 : 2} />
                <rect x={x + 12} y={y + 12} width={w - 24} height={h - 24} rx="6" fill="none" stroke="#ffffff22" stroke-width="2" />
                {b.target ? (
                  <g>
                    <circle cx={x + 26} cy={y + h - 18} r="8" fill="#222" />
                    <circle cx={x + w - 26} cy={y + h - 18} r="8" fill="#222" />
                    <text x={x + w / 2} y={y + h / 2 + 2} text-anchor="middle" font-size="18" fill="#2a1d08" font-weight="600">
                      TROLLEY
                    </text>
                  </g>
                ) : (
                  <>
                    <rect x={x + w / 2 - 22} y={y + h / 2 - 9} width="44" height="18" rx="3" fill="#efe6d2" opacity="0.9" />
                    <circle cx={x + w / 2 - 16} cy={y + h / 2} r="2" fill="#555" />
                  </>
                )}
                <path d={b.horiz ? `M${x + 10} ${y + 8}h${w - 20}` : `M${x + 8} ${y + 10}v${h - 20}`} stroke="#ffffff30" stroke-width="3" />
              </g>
            );
          })}
        </svg>
      </div>
      <div class="pz-feedback" data-testid="pz-feedback">
        {won ? 'The trolley rolls clear!' : label ? `Tag: ${label}` : 'Drag a piece along its length.'}
      </div>
      <div class="pz-foot">
        <span class="chip">Moves: {moves}</span>
        <Btn
          kind="ghost"
          onClick={() => {
            setBlocks(RUSH_START);
            setMoves(0);
            persist(RUSH_START, 0);
          }}
          data-testid="rush-reset"
        >
          Reset
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P03 — Valves
// =====================================================================================
const PIN_LAYOUT: Record<number, [number, number][]> = {
  4: [
    [-14, -14],
    [14, -14],
    [-10, 14],
    [10, 14],
  ],
  5: [
    [0, -18],
    [17, -6],
    [11, 15],
    [-11, 15],
    [-17, -6],
  ],
  7: [
    [0, -19],
    [15, -12],
    [19, 4],
    [8, 17],
    [-8, 17],
    [-19, 4],
    [-15, -12],
  ],
};
function Pins({ n, cx, cy, fill }: { n: number; cx: number; cy: number; fill: string }) {
  return (
    <g>
      {PIN_LAYOUT[n].map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx} cy={cy + dy} r={n === 4 && i < 2 ? 4.5 : 3.2} fill={fill} />
      ))}
    </g>
  );
}
function ValveGlass({ v, x, y, scale = 1, lifted }: { v: (typeof VALVES)[number]; x: number; y: number; scale?: number; lifted?: boolean }) {
  const h = v.pins === 4 ? 120 : v.pins === 7 ? 104 : v.cap ? 116 : 96;
  const w = v.pins === 4 ? 56 : 46;
  return (
    <g transform={`translate(${x} ${y - (lifted ? 14 : 0)}) scale(${scale})`}>
      <ellipse cx="0" cy="6" rx={w / 2 + 6} ry="7" fill="#000" opacity="0.3" />
      <rect x={-w / 2 - 3} y="-22" width={w + 6} height="26" rx="5" fill="#2b2016" stroke="#5a4630" />
      <path d={`M${-w / 2} -22 L${-w / 2} ${-h + 20} Q0 ${-h - 10} ${w / 2} ${-h + 20} L${w / 2} -22 Z`} fill="rgba(200,230,240,0.18)" stroke="rgba(220,240,250,0.7)" stroke-width="2" />
      <rect x={-w / 4} y={-h + 34} width={w / 2} height={h - 66} rx="3" fill="#8a7a62" opacity="0.6" />
      <path d={`M${-w / 2 + 4} ${-h + 22} Q0 ${-h - 4} ${w / 2 - 4} ${-h + 22}`} fill="none" stroke={v.milky ? '#f2f2ef' : '#d8dee8'} stroke-width="10" opacity={v.milky ? 0.95 : 0.9} />
      {!v.milky && <path d={`M${-w / 2 + 8} ${-h + 20} Q0 ${-h} ${w / 2 - 8} ${-h + 20}`} fill="none" stroke="#ffffff" stroke-width="3" opacity="0.9" />}
      {v.cap && <rect x="-7" y={-h - 16} width="14" height="16" rx="3" fill="#c9a45c" stroke="#7a5a26" />}
      <text x="0" y="-6" text-anchor="middle" font-size="12" fill="#ecd398" font-family="Special Elite, monospace">
        {v.type}
      </text>
    </g>
  );
}
export function Valves({ saved, save, solve }: PuzzleProps) {
  const [assign, setAssign] = useState<Partial<Record<SocketId, ValveId>>>((saved as { assign?: Partial<Record<SocketId, ValveId>> })?.assign || {});
  const [sel, setSel] = useState<ValveId | null>(null);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [lit, setLit] = useState(false);
  const placed = new Set(Object.values(assign));
  const tray = VALVES.filter((v) => !placed.has(v.id));
  const commit = (a: Partial<Record<SocketId, ValveId>>) => {
    setAssign(a);
    save({ assign: a });
  };
  const SX = [90, 230, 370, 510];
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 640" data-testid="valves">
          <defs>
            <linearGradient id="chassis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#3b4048" />
              <stop offset="1" stop-color="#22262c" />
            </linearGradient>
          </defs>
          <rect x="20" y="20" width="560" height="300" rx="14" fill="url(#chassis)" stroke="#6b7480" stroke-width="3" />
          <text x="40" y="52" fill="#c9a45c" font-size="18" font-family="Special Elite, monospace">
            MARCONI AD.37 — VALVE DECK
          </text>
          {/* the clip lead hanging over DET */}
          <path d="M260 70 C 300 60, 240 110, 230 150" fill="none" stroke="#a33" stroke-width="5" />
          <rect x="222" y="146" width="16" height="12" rx="3" fill="#c9a45c" />
          {SOCKETS.map((s, i) => {
            const v = assign[s.id] ? VALVES.find((x) => x.id === assign[s.id])! : null;
            return (
              <g
                key={s.id}
                onClick={() => {
                  if (sel) {
                    if (!valveFits(sel, s.id)) {
                      audio.sfx('fail', 0.5);
                      setMsg({ t: `That valve has ${VALVES.find((x) => x.id === sel)!.pins} pins; the ${s.label} socket has ${s.pins}.` });
                      return;
                    }
                    const next = { ...assign };
                    for (const k of Object.keys(next) as SocketId[]) if (next[k] === sel) delete next[k];
                    next[s.id] = sel;
                    audio.sfx('mirror_click');
                    commit(next);
                    setSel(null);
                    setMsg(null);
                  } else if (v) {
                    const next = { ...assign };
                    delete next[s.id];
                    commit(next);
                    setLit(false);
                  }
                }}
                style={{ cursor: 'pointer' }}
                data-testid={`socket-${s.id}`}
              >
                <rect x={SX[i] - 60} y="170" width="120" height="140" fill="transparent" />
                <circle cx={SX[i]} cy="270" r="34" fill="#15181d" stroke="#8a929e" stroke-width="3" />
                <Pins n={s.pins} cx={SX[i]} cy={270} fill="#c8cdd4" />
                <text x={SX[i]} y="300" text-anchor="middle" fill="#ecd398" font-size="15" font-family="Special Elite, monospace" dy="22">
                  {s.label}
                </text>
                {v && (
                  <g>
                    <ValveGlass v={v} x={SX[i]} y={262} scale={0.9} />
                    {lit && <circle cx={SX[i]} cy={200} r="26" fill="#ff9a3c" opacity="0.35" class="glow-anim" />}
                  </g>
                )}
              </g>
            );
          })}
          {/* tea towel tray */}
          <rect x="20" y="370" width="560" height="250" rx="16" fill="#e9e0cc" />
          <path d="M20 400h560M20 440h560M20 480h560M20 520h560M20 560h560M20 600h560" stroke="#c55" stroke-width="3" opacity="0.35" />
          <path d="M60 370v250M140 370v250M220 370v250M300 370v250M380 370v250M460 370v250M540 370v250" stroke="#c55" stroke-width="2" opacity="0.25" />
          {tray.map((v, i) => {
            const x = 75 + i * 112;
            return (
              <g key={v.id} onClick={() => setSel(sel === v.id ? null : v.id)} style={{ cursor: 'pointer' }} data-testid={`valve-${v.id}`}>
                <rect x={x - 48} y="390" width="96" height="220" fill="transparent" />
                <ValveGlass v={v} x={x} y={560} lifted={sel === v.id} />
                <g transform={`translate(${x} 592)`}>
                  <circle r="20" fill="#2b2016" />
                  <Pins n={v.pins} cx={0} cy={0} fill="#c8cdd4" />
                </g>
                {sel === v.id && <rect x={x - 50} y="392" width="100" height="224" rx="10" fill="none" stroke="#2f6f7e" stroke-width="4" />}
              </g>
            );
          })}
        </svg>
      </div>
      <div class={`pz-feedback ${msg?.ok ? 'ok' : msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg?.t || (sel ? 'Now tap a socket on the valve deck.' : 'Tap a valve to pick it up. Each shows its pins underneath.')}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          onClick={() => {
            const r = valvesCheck(assign);
            setLit(true);
            setMsg({ t: r.message, ok: r.ok });
            audio.sfx(r.ok ? 'unlock' : 'fail');
            if (r.ok) setTimeout(solve, 900);
          }}
          data-testid="valves-test"
        >
          Switch on
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P04 — Junction board (rotate tiles) + tuning dial
// =====================================================================================
function wirePath(mask: number) {
  const c = 50;
  const ends: Record<number, [number, number]> = { 1: [50, 0], 2: [100, 50], 4: [50, 100], 8: [0, 50] };
  return [1, 2, 4, 8]
    .filter((b) => mask & b)
    .map((b) => `M${c} ${c}L${ends[b][0]} ${ends[b][1]}`)
    .join('');
}
export function Net({ saved, save, solve }: PuzzleProps) {
  const s = saved as { rot?: number[][]; freq?: number } | undefined;
  const [rot, setRot] = useState<number[][]>(s?.rot || NET_SCRAMBLE.map((r) => [...r]));
  const [freq, setFreq] = useState<number>(s?.freq ?? 1180);
  const masks = useMemo(() => netMasks(rot), [rot]);
  const powered = useMemo(() => netPowered(masks), [masks]);
  const wired = netSolved(masks);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (wired) audio.sfx('unlock', 0.7);
  }, [wired]);

  const turn = (r: number, c: number) => {
    if (NET_FIXED.has(`${r},${c}`) || wired) return;
    const next = rot.map((row) => [...row]);
    next[r][c] = (next[r][c] + 1) % 4;
    audio.sfx('mirror_click', 0.7);
    setRot(next);
    save({ rot: next, freq });
  };
  const sinkKeys = new Set(NET_SINKS.map((x) => x.join(',')));
  const sourceKey = NET_SOURCE.join(',');
  const closeness = Math.max(0, 1 - Math.abs(freq - TUNE_TARGET) / 120);

  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="-60 -10 620 540" data-testid="net">
          <rect x="-50" y="-4" width="600" height="520" rx="14" fill="#1a1f27" stroke="#4b5563" stroke-width="3" />
          {masks.map((row, r) =>
            row.map((m, c) => {
              const key = `${r},${c}`;
              const on = powered.has(key);
              const deg = bitCount(m) === 1;
              const isSink = sinkKeys.has(key);
              const isSource = key === sourceKey;
              return (
                <g key={key} transform={`translate(${c * 100} ${r * 100 + 4})`} onClick={() => turn(r, c)} style={{ cursor: 'pointer' }} data-testid={`net-${r}-${c}`}>
                  <rect x="3" y="3" width="94" height="94" rx="10" fill={on ? '#22303a' : '#14181e'} stroke="#2d3542" />
                  <path d={wirePath(m)} stroke={on ? '#ecd398' : '#5b6472'} stroke-width="12" stroke-linecap="round" />
                  <path d={wirePath(m)} stroke={on ? '#fff3c9' : 'transparent'} stroke-width="3" stroke-linecap="round" />
                  {isSource && (
                    <g>
                      <rect x="22" y="28" width="44" height="44" rx="6" fill="#2f6f7e" stroke="#9fe3d0" stroke-width="3" />
                      <text x="44" y="57" text-anchor="middle" fill="#e9fbf5" font-size="18" font-weight="700">
                        +
                      </text>
                    </g>
                  )}
                  {isSink && (
                    <g>
                      <rect x="26" y="26" width="48" height="48" rx="8" fill={on ? '#c9a45c' : '#3a3f48'} stroke="#ecd398" stroke-width="2" />
                      <text x="50" y="57" text-anchor="middle" fill={on ? '#1b1408' : '#9ba8bd'} font-size="15" font-weight="700">
                        {r === 0 ? 'LT' : 'HT'}
                      </text>
                    </g>
                  )}
                  {deg && !isSink && !isSource && <circle cx="50" cy="50" r="16" fill={on ? '#ffd27a' : '#323844'} stroke={on ? '#fff0c0' : '#59606c'} stroke-width="3" />}
                </g>
              );
            }),
          )}
          <text x="-30" y="258" fill="#7de3b8" font-size="14" transform="rotate(-90 -30 258)" text-anchor="middle">
            BATTERY
          </text>
        </svg>
        {wired && (
          <div class="panel" data-testid="tuner">
            <div class="kicker">Tuning — kilocycles</div>
            <svg viewBox="0 0 400 110" style={{ width: '100%', display: 'block', margin: '6px 0' }}>
              <rect x="0" y="0" width="400" height="70" rx="8" fill="#1d150c" stroke="#8a6a32" />
              {Array.from({ length: 13 }, (_, i) => 1000 + i * 50).map((f) => (
                <g key={f}>
                  <line x1={((f - 1000) / 600) * 380 + 10} y1="40" x2={((f - 1000) / 600) * 380 + 10} y2="62" stroke="#c9a45c" />
                  {f % 100 === 0 && (
                    <text x={((f - 1000) / 600) * 380 + 10} y="34" fill="#ecd398" font-size="12" text-anchor="middle">
                      {f}
                    </text>
                  )}
                </g>
              ))}
              <line x1={((freq - 1000) / 600) * 380 + 10} y1="6" x2={((freq - 1000) / 600) * 380 + 10} y2="66" stroke="#ff7a5a" stroke-width="3" />
              {/* magic eye */}
              <circle cx="200" cy="92" r="16" fill="#08140f" stroke="#2f6f7e" />
              <path d={`M200 92 L${200 + 16 * Math.cos(Math.PI * (0.5 + closeness))} ${92 - 16 * Math.sin(Math.PI * (0.5 + closeness))} A16 16 0 ${closeness > 0.5 ? 0 : 1} 0 ${200 + 16 * Math.cos(Math.PI * (0.5 - closeness))} ${92 - 16 * Math.sin(Math.PI * (0.5 - closeness))} Z`} fill="#7de3b8" opacity={0.3 + closeness * 0.7} />
            </svg>
            <input
              type="range"
              min={1000}
              max={1600}
              step={5}
              value={freq}
              aria-label="Tuning dial"
              data-testid="tune"
              onInput={(e) => {
                const f = Number((e.target as HTMLInputElement).value);
                setFreq(f);
                save({ rot, freq: f });
              }}
            />
            <div class="stepper" style={{ justifyContent: 'center' }}>
              <Btn small onClick={() => setFreq(Math.max(1000, freq - 5))} data-testid="tune-down">
                −5
              </Btn>
              <span class="val" data-testid="tune-value">
                {freq}
              </span>
              <Btn small onClick={() => setFreq(Math.min(1600, freq + 5))} data-testid="tune-up">
                +5
              </Btn>
            </div>
          </div>
        )}
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg ||
          (wired
            ? 'Power! Every lamp is lit. Now find the frequency — the log on the desk may help.'
            : `${powered.size} of ${NET_SIZE * NET_SIZE} tiles powered. Tap a tile to turn it.`)}
      </div>
      <div class="pz-foot">
        {wired && (
          <Btn
            kind="primary"
            onClick={() => {
              if (tuned(freq)) {
                audio.sfx('tune_sweep');
                setTimeout(solve, 700);
              } else {
                audio.sfx('static_burst', 0.6);
                setMsg(`Only static on ${freq} kc/s.`);
                setTimeout(() => setMsg(''), 2500);
              }
            }}
            data-testid="tune-lock"
          >
            Listen on {freq} kc/s
          </Btn>
        )}
      </div>
    </>
  );
}
function bitCount(m: number) {
  return ((m >> 0) & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
}
