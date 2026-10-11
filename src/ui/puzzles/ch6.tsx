import { useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import {
  CW_FRAMES,
  CW_ROWS,
  CW_EDGES,
  CW_START,
  CW_GOAL,
  cwEdgeKey,
  cwCheck,
  BAGS,
  BALLAST,
  ballastState,
  ballastSolved,
  CORD_COUNT,
  CORD_CELLS,
  CORD_HANDLES,
  CORD_RUNGS,
  CORD_ANSWER,
} from '../../puzzles/logic';

// =====================================================================================
// P18 — The catwalk
// =====================================================================================
const NX = (f: number) => 50 + CW_FRAMES.indexOf(f) * 83;
const NY: Record<string, number> = { P: 110, C: 230, S: 350 };
const node = (n: string) => ({ x: NX(Number(n.slice(0, -1))), y: NY[n.slice(-1)] });
export function Catwalk({ saved, save, solve }: PuzzleProps) {
  const s = saved as { seen?: string[] } | undefined;
  const [seen, setSeen] = useState<string[]>(s?.seen || []);
  const [path, setPath] = useState<string[]>([CW_START]);
  const [msg, setMsg] = useState('');
  const [fallAt, setFallAt] = useState<number | null>(null);
  const inspect = (key: string) => {
    if (!seen.includes(key)) {
      const next = [...seen, key];
      setSeen(next);
      save({ seen: next });
    }
    audio.sfx('ui_tap', 0.5);
    const stamp = CW_EDGES[key];
    setMsg(`Girder ${key.replace('|', ' – ')}: stamped ${stamp === 'tri' ? '▲ triangle' : stamp === 'circ' ? '● circle' : '■ square'}.`);
  };
  const tapNode = (n: string) => {
    setFallAt(null);
    const last = path[path.length - 1];
    if (n === last) return;
    if (path.length >= 2 && n === path[path.length - 2]) return setPath(path.slice(0, -1));
    if (!cwEdgeKey(last, n)) return setMsg('No girder joins those two points.');
    setPath([...path, n]);
    audio.sfx('ui_tap', 0.4);
    setMsg('');
  };
  const stampGlyph = (st: string) => (st === 'tri' ? '▲' : st === 'circ' ? '●' : '■');
  const pathEdges = new Set(path.slice(1).map((n, i) => cwEdgeKey(path[i], n)));
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 440" data-testid="catwalk">
          <rect width="600" height="440" rx="14" fill="#0b1626" />
          <rect x="166" y="40" width="249" height="360" fill="#5d9fb0" opacity="0.07" />
          <text x="290" y="30" text-anchor="middle" fill="#9fc9d6" font-size="13">
            frames 95–140 (cold-test span)
          </text>
          {CW_FRAMES.map((f) => (
            <text key={f} x={NX(f)} y="418" text-anchor="middle" fill="#ecd398" font-size="15">
              {f}
            </text>
          ))}
          {CW_ROWS.map((r) => (
            <text key={r} x="14" y={NY[r] + 5} fill="#9ba8bd" font-size="14">
              {r}
            </text>
          ))}
          {Object.keys(CW_EDGES).map((key) => {
            const [a, b] = key.split('|');
            const A = node(a);
            const B = node(b);
            const on = pathEdges.has(key);
            const known = seen.includes(key);
            return (
              <g key={key} onClick={() => inspect(key)} style={{ cursor: 'pointer' }} data-testid={`edge-${key}`}>
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="transparent" stroke-width="26" />
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={on ? '#ecd398' : '#5a6a7e'} stroke-width={on ? 9 : 7} stroke-linecap="round" />
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#cfe8ee" stroke-width="2" opacity="0.35" />
                {known && (
                  <g>
                    <circle cx={(A.x + B.x) / 2} cy={(A.y + B.y) / 2} r="13" fill="#0b1626" stroke="#ecd398" />
                    <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 + 5} text-anchor="middle" fill="#ecd398" font-size="14">
                      {stampGlyph(CW_EDGES[key])}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {CW_FRAMES.flatMap((f) =>
            CW_ROWS.map((r) => {
              const n = `${f}${r}`;
              const p = node(n);
              const inPath = path.includes(n);
              return (
                <g key={n} onClick={() => tapNode(n)} style={{ cursor: 'pointer' }} data-testid={`node-${n}`}>
                  <circle cx={p.x} cy={p.y} r="20" fill={n === CW_GOAL ? '#2f6f7e' : inPath ? '#c9a45c' : '#16243a'} stroke="#cfe8ee" stroke-width="2" />
                  {n === CW_START && <text x={p.x} y={p.y + 5} text-anchor="middle" fill="#fff" font-size="12">YOU</text>}
                </g>
              );
            }),
          )}
          {fallAt !== null && path[fallAt] && (
            <text x={node(path[fallAt]).x} y={node(path[fallAt]).y - 30} text-anchor="middle" fill="#ec8a78" font-size="16">
              creak!
            </text>
          )}
        </svg>
      </div>
      <div class={`pz-feedback ${fallAt !== null ? 'err' : ''}`} data-testid="pz-feedback">
        {msg || 'Tap girders to read their stamps. Tap junctions to plan a route from YOU (frame 80) to frame 170.'}
      </div>
      <div class="pz-foot">
        <Btn kind="ghost" onClick={() => setPath(path.length > 1 ? path.slice(0, -1) : path)} data-testid="cw-undo">
          Undo
        </Btn>
        <Btn kind="ghost" onClick={() => setPath([CW_START])}>
          Clear
        </Btn>
        <Btn
          kind="primary"
          disabled={path[path.length - 1] !== CW_GOAL}
          data-testid="cw-cross"
          onClick={() => {
            const r = cwCheck(path);
            if (r.ok) {
              audio.sfx('unlock');
              setTimeout(solve, 500);
            } else {
              audio.sfx('ice_crack', 0.7);
              setFallAt(r.badStep ?? 0);
              setMsg(`Step ${r.badStep}: the girder groans and sags under your boot. You scramble back to frame 80.`);
              setPath([CW_START]);
            }
          }}
        >
          Cross
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P19 — Ballast trim
// =====================================================================================
export function Ballast({ saved, save, solve }: PuzzleProps) {
  const [rel, setRel] = useState<string[]>((saved as { rel?: string[] })?.rel || []);
  const [msg, setMsg] = useState('');
  const st = ballastState(rel);
  const toggle = (id: string) => {
    const next = rel.includes(id) ? rel.filter((x) => x !== id) : [...rel, id];
    setRel(next);
    save({ rel: next });
    audio.sfx('ui_tap', 0.6);
    setMsg('');
  };
  const frames = [35, 80, 125, 170, 205];
  const fx = (f: number) => 40 + (f / 236) * 520;
  const pitchDeg = Math.max(-12, Math.min(12, st.pitch / 4000));
  const rollDeg = Math.max(-12, Math.min(12, st.roll / 150));
  const fmt = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('en-GB')}`;
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 300" data-testid="ballast">
          <rect width="600" height="300" rx="14" fill="#0b1626" />
          <g transform={`rotate(${pitchDeg} 300 110)`}>
            <path d="M40 110 C 60 60, 540 60, 570 110 C 540 160, 60 160, 40 110 Z" fill="#1d3550" stroke="#9fc9d6" stroke-width="2" />
            <text x="560" y="80" fill="#9fc9d6" font-size="12">
              BOW
            </text>
            <line x1={fx(118)} y1="62" x2={fx(118)} y2="158" stroke="#7de3b8" stroke-dasharray="4 4" />
            <text x={fx(118)} y="56" text-anchor="middle" fill="#7de3b8" font-size="11">
              centre of lift (118)
            </text>
            {frames.map((f) => (
              <text key={f} x={fx(f)} y="176" text-anchor="middle" fill="#ecd398" font-size="12">
                fr. {f}
              </text>
            ))}
          </g>
          {/* inclinometers */}
          <g transform="translate(150 240)">
            <rect x="-90" y="-22" width="180" height="44" rx="22" fill="#08111c" stroke="#5d9fb0" />
            <rect x="-14" y="-20" width="28" height="40" fill="#7de3b8" opacity={st.pitchOk ? 0.35 : 0.12} />
            <circle cx={pitchDeg * 6} cy="0" r="12" fill={st.pitchOk ? '#7de3b8' : '#ecd398'} />
            <text x="0" y="40" text-anchor="middle" fill="#9ba8bd" font-size="12">
              PITCH (nose ⇢)
            </text>
          </g>
          <g transform="translate(450 240)">
            <rect x="-90" y="-22" width="180" height="44" rx="22" fill="#08111c" stroke="#5d9fb0" />
            <rect x="-14" y="-20" width="28" height="40" fill="#7de3b8" opacity={st.rollOk ? 0.35 : 0.12} />
            <circle cx={rollDeg * 6} cy="0" r="12" fill={st.rollOk ? '#7de3b8' : '#ecd398'} />
            <text x="0" y="40" text-anchor="middle" fill="#9ba8bd" font-size="12">
              ROLL (starboard ⇢)
            </text>
          </g>
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 4, width: '100%', maxWidth: '30rem', alignItems: 'center' }} data-testid="bags">
          <span />
          {frames.map((f) => (
            <span class="kicker" style={{ textAlign: 'center' }}>
              {f}
            </span>
          ))}
          {(['P', 'S'] as const).map((side) => (
            <>
              <span class="kicker">{side === 'P' ? 'Port' : 'Stbd'}</span>
              {frames.map((f) => {
                const b = BAGS.find((x) => x.id === `${f}${side}`)!;
                const on = rel.includes(b.id);
                return (
                  <button
                    class="btn small"
                    style={{ padding: '0.3rem 0', borderRadius: 10, background: on ? 'rgba(89,201,232,.25)' : undefined, borderColor: on ? '#59c9e8' : undefined }}
                    onClick={() => toggle(b.id)}
                    data-testid={`bag-${b.id}`}
                    aria-pressed={on}
                  >
                    {on ? 'drop' : ''} {b.kg}
                  </button>
                );
              })}
            </>
          ))}
        </div>
        <div class="panel" style={{ fontSize: '0.86rem', lineHeight: 1.7 }}>
          <div>
            Water to drop: <b class={st.kgOk ? '' : ''} style={{ color: st.kgOk ? 'var(--ok)' : 'var(--brass-hi)' }}>{st.kg.toLocaleString('en-GB')} kg</b>{' '}
            <span class="muted">(need {BALLAST.minKg.toLocaleString('en-GB')}–{BALLAST.maxKg.toLocaleString('en-GB')})</span>
          </div>
          <div>
            Nose-heavy moment: <b style={{ color: st.pitchOk ? 'var(--ok)' : 'var(--brass-hi)' }}>{fmt(st.pitch)} kg·m</b> <span class="muted">(level within ±{BALLAST.pitchTol})</span>
          </div>
          <div>
            Starboard list: <b style={{ color: st.rollOk ? 'var(--ok)' : 'var(--brass-hi)' }}>{fmt(st.roll)} kg·m</b> <span class="muted">(level within ±{BALLAST.rollTol})</span>
          </div>
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          disabled={!rel.length}
          data-testid="ballast-release"
          onClick={() => {
            if (ballastSolved(rel)) {
              audio.sfx('hiss');
              setTimeout(solve, 700);
            } else {
              audio.sfx('fail', 0.6);
              setMsg(!st.kgOk ? (st.kg < BALLAST.minKg ? 'Ola: "Not enough — we\'ll keep falling."' : 'Ola: "Too much — we\'ll shoot up into the icing cloud."') : !st.pitchOk ? 'Ola: "She\'ll still be out of trim — look at the pitch."' : 'Ola: "She\'ll still list — look at the roll."');
            }
          }}
        >
          Pull the toggles
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P20 — The valve cords
// =====================================================================================
export function Cords({ solve }: PuzzleProps) {
  const [showWren, setShowWren] = useState(false);
  const [msg, setMsg] = useState('');
  const X = (i: number) => 70 + i * 76;
  const Y = (level: number) => 70 + level * 30;
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const ice = [
    { level: 2, from: 0, to: 3 },
    { level: 6, from: 0, to: 3 },
    { level: 10, from: 1, to: 4 },
    { level: 8, from: 4, to: 6 },
  ];
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 560" data-testid="cords">
          <rect width="600" height="560" rx="14" fill="#101620" />
          {CORD_CELLS.map((c, i) => (
            <g key={c}>
              <rect x={X(i) - 22} y="14" width="44" height="30" rx="6" fill="#1d3550" stroke="#9fc9d6" />
              <text x={X(i)} y="35" text-anchor="middle" fill={c === 7 ? '#7de3b8' : '#cfe8ee'} font-size="14" font-weight={c === 7 ? 700 : 400}>
                cell {c}
              </text>
            </g>
          ))}
          {ROMAN.slice(1).map((r, l) => (
            <text key={r} x="22" y={Y(l + 1) + 5} fill="#7a8aa0" font-size="12">
              {r}
            </text>
          ))}
          {Array.from({ length: CORD_COUNT }, (_, i) => (
            <line key={i} x1={X(i)} y1="44" x2={X(i)} y2={Y(13)} stroke="#b9a27a" stroke-width="4" />
          ))}
          {CORD_RUNGS.filter((r) => !r.hidden).map((r) => (
            <line key={`r${r.level}`} x1={X(r.left)} y1={Y(r.level)} x2={X(r.left + 1)} y2={Y(r.level)} stroke="#d8c08a" stroke-width="5" />
          ))}
          {ice.map((p) => (
            <rect key={`ice${p.level}`} x={X(p.from) - 10} y={Y(p.level) - 13} width={X(p.to) - X(p.from) + 20} height="26" rx="13" fill="#dcecf2" opacity="0.92" />
          ))}
          {showWren &&
            CORD_RUNGS.filter((r) => r.hidden).map((r) => (
              <line key={`w${r.level}`} x1={X(r.left)} y1={Y(r.level)} x2={X(r.left + 1)} y2={Y(r.level)} stroke="#7de3b8" stroke-width="5" stroke-dasharray="8 5" />
            ))}
          {CORD_HANDLES.map((h, i) => (
            <g key={h}>
              <circle cx={X(i)} cy={Y(13) + 22} r="20" fill="#c9a45c" stroke="#5a4218" stroke-width="3" />
              <text x={X(i)} y={Y(13) + 28} text-anchor="middle" fill="#2a1d08" font-size="17" font-weight="700">
                {h}
              </text>
            </g>
          ))}
        </svg>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" class="toggle" checked={showWren} onChange={(e) => setShowWren((e.target as HTMLInputElement).checked)} data-testid="cords-wren" />
          <span>Mark the crossbars Wren can see (from her notes)</span>
        </label>
        <div class="grid-tools" data-testid="cords-handles">
          {CORD_HANDLES.map((h) => (
            <Btn
              small
              data-testid={`handle-${h}`}
              onClick={() => {
                if (h === CORD_ANSWER) {
                  audio.sfx('hiss');
                  setTimeout(solve, 900);
                } else {
                  audio.sfx('fail', 0.6);
                  setMsg(`Wren pulls handle ${h}: a hiss from the wrong cell — she lets go quickly. "Not that one, Sparks!"`);
                }
              }}
            >
              Pull {h}
            </Btn>
          ))}
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg || 'Trace cell 7\'s cord down to its handle, then tell Wren which to pull.'}
      </div>
    </>
  );
}
