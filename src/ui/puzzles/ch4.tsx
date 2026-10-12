import { useEffect, useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import {
  fan,
  FAN_HIDDEN,
  SUITS,
  stackSolved,
  type Card,
  MIRROR_GRID,
  MIRROR_INITIAL,
  traceBeam,
  mirrorSolved,
  MIRROR_EXIT,
  RAT_NAMES,
  RAT_EDGES,
  type RatNode,
  patrolAt,
  ratAdjacent,
  ratSimulate,
  RAT_MAX_STEPS,
  PATROLS,
} from '../../puzzles/logic';

const SYM: Record<string, string> = { C: '♣', H: '♥', S: '♠', D: '♦' };
const VAL = (v: number) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[v] ?? String(v);
const RED = (s: string) => s === 'H' || s === 'D';

function CardFace({ c, x, y, w = 70, h = 100, back }: { c?: Card; x: number; y: number; w?: number; h?: number; back?: boolean }) {
  if (back || !c)
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx="7" fill="#3a2050" stroke="#c9a45c" stroke-width="2" />
        <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="4" fill="none" stroke="#c9a45c" stroke-dasharray="3 3" />
        <text x={x + w / 2} y={y + h / 2 + 10} text-anchor="middle" fill="#ecd398" font-size="28" font-family="Cormorant Garamond, serif">
          ?
        </text>
      </g>
    );
  const col = RED(c.s) ? '#b0222a' : '#15151a';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="7" fill="#fbf6ea" stroke="#8a6a32" stroke-width="2" />
      <text x={x + 9} y={y + 24} fill={col} font-size="20" font-weight="700" font-family="Cormorant Garamond, serif">
        {VAL(c.v)}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 16} text-anchor="middle" fill={col} font-size="36">
        {SYM[c.s]}
      </text>
    </g>
  );
}

// =====================================================================================
// P11 — The eternal stack (four-card lock)
// =====================================================================================
export function Stack({ saved, save, solve }: PuzzleProps) {
  const cards = fan();
  const [lock, setLock] = useState<Card[]>(((saved as { lock?: Card[] })?.lock as Card[]) || [1, 1, 1, 1].map(() => ({ v: 1, s: 'C' as const })));
  const [msg, setMsg] = useState('');
  const upd = (i: number, c: Card) => {
    const next = lock.map((x, j) => (j === i ? c : x));
    setLock(next);
    save({ lock: next });
    audio.sfx('card', 0.6);
  };
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 260" data-testid="stack-fan">
          <rect width="600" height="260" rx="16" fill="#1b0f24" stroke="#c9a45c" stroke-width="3" />
          <text x="300" y="30" text-anchor="middle" fill="#ecd398" font-size="16" font-family="Cormorant Garamond, serif">
            Behind the glass of the lid
          </text>
          {cards.map((c, i) => {
            const x = 22 + (i % 6) * 95;
            const y = 46 + Math.floor(i / 6) * 106;
            return <CardFace key={i} c={c} x={x} y={y} back={FAN_HIDDEN.includes(i)} />;
          })}
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%', maxWidth: '30rem' }} data-testid="stack-lock">
          {lock.map((c, i) => (
            <div class="panel" style={{ padding: 8, textAlign: 'center' }}>
              <div class="kicker">Lock {i + 1}</div>
              <button class="btn small ghost" style={{ width: '100%' }} onClick={() => upd(i, { ...c, v: (c.v % 13) + 1 })} data-testid={`lock-${i}-up`}>
                ▲
              </button>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 700, color: RED(c.s) ? '#ff8a8a' : 'var(--ice)' }} data-testid={`lock-${i}-val`}>
                {VAL(c.v)}
                {SYM[c.s]}
              </div>
              <button class="btn small ghost" style={{ width: '100%' }} onClick={() => upd(i, { ...c, v: ((c.v + 11) % 13) + 1 })} data-testid={`lock-${i}-down`}>
                ▼
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 4 }}>
                {SUITS.map((s) => (
                  <button
                    class="btn small"
                    style={{ padding: 0, minHeight: 32, color: RED(s) ? '#ff9a9a' : undefined, background: c.s === s ? 'rgba(201,164,92,.35)' : undefined }}
                    onClick={() => upd(i, { ...c, s })}
                    data-testid={`lock-${i}-${s}`}
                    aria-label={`suit ${s}`}
                  >
                    {SYM[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="stack-open"
          onClick={() => {
            if (stackSolved(lock)) {
              audio.sfx('unlock');
              setTimeout(solve, 500);
            } else {
              audio.sfx('fail', 0.6);
              setMsg('The lid stays shut. The fan isn\'t random — Vasseur\'s notebook explains her order.');
            }
          }}
        >
          Try the lid
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P12 — Le Spectre (mirror box)
// =====================================================================================
export function Mirror({ saved, save, solve }: PuzzleProps) {
  const [orient, setOrient] = useState<Record<string, number>>((saved as { orient?: Record<string, number> })?.orient || MIRROR_INITIAL);
  const [done, setDone] = useState(false);
  const trace = traceBeam(orient);
  const solved = mirrorSolved(orient);
  const S = 100;
  const O = 50;
  useEffect(() => {
    if (solved && !done) {
      setDone(true);
      audio.sfx('shimmer');
      setTimeout(solve, 1600);
    }
  }, [solved]);
  const pts: [number, number][] = [[O - 50, O + 2 * S + S / 2], ...trace.path.map(([r, c]) => [O + c * S + S / 2, O + r * S + S / 2] as [number, number])];
  if (trace.exit) pts.push([O + trace.exit.c * S + S / 2, O + trace.exit.r * S + S / 2]);
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 600" data-testid="mirror">
          <rect x="30" y="30" width="540" height="540" rx="14" fill="#1a0f1e" stroke="#c9a45c" stroke-width="4" />
          {/* lens on top */}
          <ellipse cx={O + MIRROR_EXIT.c * S + S / 2} cy={34} rx="34" ry="12" fill="#9fe3ff" opacity="0.6" stroke="#ecd398" stroke-width="3" />
          {/* torch */}
          <rect x="0" y={O + 2 * S + 30} width="44" height="40" rx="6" fill="#444" stroke="#ecd398" />
          {MIRROR_GRID.map((row, r) =>
            row.split('').map((ch, c) => {
              const x = O + c * S;
              const y = O + r * S;
              const key = `${r},${c}`;
              return (
                <g key={key}>
                  <rect x={x + 3} y={y + 3} width={S - 6} height={S - 6} rx="8" fill="#22142a" stroke="#3a2a44" />
                  {ch === 'X' && <rect x={x + 12} y={y + 12} width={S - 24} height={S - 24} rx="6" fill="#07030a" stroke="#4a2a55" />}
                  {ch === 'S' && (
                    <g>
                      <rect x={x + 18} y={y + 22} width={S - 36} height={S - 44} rx="4" fill="#cfe8ee" opacity="0.35" stroke="#ecd398" />
                      <text x={x + S / 2} y={y + S / 2 + 6} text-anchor="middle" fill="#ecd398" font-size="13">
                        SLIDE
                      </text>
                    </g>
                  )}
                  {ch === 'M' && (
                    <g
                      onClick={() => {
                        if (done) return;
                        const next = { ...orient, [key]: (orient[key] ?? 0) ? 0 : 1 };
                        setOrient(next);
                        save({ orient: next });
                        audio.sfx('mirror_click');
                      }}
                      style={{ cursor: 'pointer' }}
                      data-testid={`mir-${r}-${c}`}
                    >
                      <rect x={x + 3} y={y + 3} width={S - 6} height={S - 6} fill="transparent" />
                      <line
                        x1={x + 18}
                        y1={(orient[key] ?? 0) ? y + 18 : y + S - 18}
                        x2={x + S - 18}
                        y2={(orient[key] ?? 0) ? y + S - 18 : y + 18}
                        stroke="#e8f4f8"
                        stroke-width="9"
                        stroke-linecap="round"
                      />
                      <circle cx={x + S / 2} cy={y + S / 2} r="6" fill="#c9a45c" />
                    </g>
                  )}
                </g>
              );
            }),
          )}
          <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff3b0" stroke-width="5" stroke-linejoin="round" opacity="0.95" style={{ pointerEvents: 'none' }} />
          <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#ffd36a" stroke-width="14" opacity="0.25" style={{ pointerEvents: 'none' }} />
        </svg>
      </div>
      <div class="pz-feedback" data-testid="pz-feedback">
        {solved ? 'Light pours through the slide and out of the lens…' : trace.exit && !trace.slide && trace.exit.r === -1 && trace.exit.c === MIRROR_EXIT.c ? 'The beam reaches the lens — but it never passed through the slide.' : 'Tap a mirror to turn it.'}
      </div>
    </>
  );
}

// =====================================================================================
// P13 — The Rat Run (minute-by-minute route)
// =====================================================================================
const NODE_POS: Record<RatNode, [number, number]> = {
  L: [80, 330],
  P: [200, 330],
  G: [200, 200],
  M: [330, 330],
  K1: [200, 70],
  K2: [330, 70],
  K3: [460, 70],
  C: [540, 200],
};
/** Wall-clock label for a minute of the rat run (Wren set off at 01:52). */
export const ratClock = (minute: number) => {
  const total = 52 + minute;
  return `${String(1 + Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
export function RatRun({ solve }: PuzzleProps) {
  const [plan, setPlan] = useState<RatNode[]>([]);
  const [t, setT] = useState(0);
  const [sim, setSim] = useState<{ step: number; result: ReturnType<typeof ratSimulate> } | null>(null);
  const cur: RatNode = plan.length ? plan[plan.length - 1] : 'L';
  const wrenAt = (minute: number): RatNode => (minute === 0 ? 'L' : plan[Math.min(minute, plan.length) - 1] ?? 'L');
  const shown = sim ? sim.step : t;

  useEffect(() => {
    if (!sim) return;
    const r = sim.result;
    const end = r.ok ? plan.length : r.caughtAt ?? plan.length;
    if (sim.step >= end) {
      if (r.ok) {
        audio.sfx('unlock');
        setTimeout(solve, 900);
      } else audio.sfx('fail', 0.7);
      return;
    }
    const id = setTimeout(() => setSim({ ...sim, step: sim.step + 1 }), 650);
    return () => clearTimeout(id);
  }, [sim]);

  const add = (n: RatNode) => {
    if (plan.length >= RAT_MAX_STEPS || sim) return;
    setPlan([...plan, n]);
    setT(plan.length + 1);
    audio.sfx('ui_tap');
  };
  const neighbours = (Object.keys(NODE_POS) as RatNode[]).filter((n) => ratAdjacent(cur, n));
  const result = sim?.result;
  const finished = sim && (result!.ok ? sim.step >= plan.length : sim.step >= (result!.caughtAt ?? plan.length));
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 400" data-testid="ratrun">
          <rect width="600" height="400" rx="14" fill="#0e1a16" />
          <text x="300" y="390" text-anchor="middle" fill="#6fa58e" font-size="14">
            Le Chemin des Rats · minute {shown} ({ratClock(shown)})
          </text>
          {RAT_EDGES.map(([a, b]) => (
            <line key={a + b} x1={NODE_POS[a][0]} y1={NODE_POS[a][1]} x2={NODE_POS[b][0]} y2={NODE_POS[b][1]} stroke="#3c6b5a" stroke-width="10" stroke-linecap="round" />
          ))}
          {(Object.keys(NODE_POS) as RatNode[]).map((n) => (
            <g key={n}>
              <circle cx={NODE_POS[n][0]} cy={NODE_POS[n][1]} r="30" fill={n === 'C' ? '#2f5f4f' : '#173229'} stroke="#7de3b8" stroke-width="2" />
              <text x={NODE_POS[n][0]} y={NODE_POS[n][1] + 50} text-anchor="middle" fill="#bfe9d6" font-size="15">
                {RAT_NAMES[n]}
              </text>
            </g>
          ))}
          {Object.keys(PATROLS).map((name, i) => {
            const p = NODE_POS[patrolAt(name, shown)];
            return (
              <g key={name}>
                <circle cx={p[0] + (i ? 14 : -14)} cy={p[1] - 6} r="13" fill={i ? '#c96b4a' : '#8a6ac9'} stroke="#fff" stroke-width="2" />
                <text x={p[0] + (i ? 14 : -14)} y={p[1] - 1} text-anchor="middle" fill="#fff" font-size="13" font-weight="700">
                  {name[0]}
                </text>
              </g>
            );
          })}
          {(() => {
            const p = NODE_POS[wrenAt(shown)];
            const caught = finished && !result!.ok;
            return (
              <g>
                <circle cx={p[0]} cy={p[1] + 10} r="14" fill={caught ? '#ec8a78' : '#ecd398'} stroke="#1b1408" stroke-width="2" />
                <text x={p[0]} y={p[1] + 15} text-anchor="middle" fill="#1b1408" font-size="13" font-weight="700">
                  W
                </text>
              </g>
            );
          })()}
        </svg>
        <div class="panel" style={{ fontSize: '0.82rem' }}>
          <span style={{ color: '#a58cff' }}>● R</span> Steward Rye · <span style={{ color: '#e08a6a' }}>● D</span> Rigger Dale · <span style={{ color: 'var(--brass-hi)' }}>● W</span> Wren
        </div>
        {!sim && (
          <>
            <div class="knob-row">
              <label>Preview minute</label>
              <span class="chip">{t}</span>
            </div>
            <input type="range" min={0} max={RAT_MAX_STEPS} value={t} onInput={(e) => setT(Number((e.target as HTMLInputElement).value))} aria-label="Preview minute" data-testid="rat-scrub" />
            <div class="panel">
              <div class="kicker">Wren's plan · now at {RAT_NAMES[cur]}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '6px 0' }} data-testid="rat-plan">
                {plan.map((n, i) => (
                  <span class="chip">
                    {i + 1}: {n === (i ? plan[i - 1] : 'L') ? 'wait' : RAT_NAMES[n]}
                  </span>
                ))}
                {!plan.length && <span class="muted">No moves yet.</span>}
              </div>
              <div class="grid-tools">
                <Btn small onClick={() => add(cur)} data-testid="rat-wait">
                  Wait 1 min
                </Btn>
                {neighbours.map((n) => (
                  <Btn small onClick={() => add(n)} data-testid={`rat-go-${n}`}>
                    → {RAT_NAMES[n]}
                  </Btn>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <div class={`pz-feedback ${finished && !result!.ok ? 'err' : ''}`} data-testid="pz-feedback">
        {finished
          ? result!.ok
            ? 'Wren slips down the ladder into the control car unseen.'
            : result!.by
              ? `Minute ${result!.caughtAt}: ${result!.by === 'Rye' ? 'Steward Rye' : 'Rigger Dale'} ${result!.reason === 'same station' ? 'walks right into her' : 'squeezes past her in the run'}. She retreats to the lounge.`
              : 'She never reaches the control car.'
          : sim
            ? `Minute ${sim.step}…`
            : 'Build a plan, then send her.'}
      </div>
      <div class="pz-foot">
        {sim ? (
          finished && !result!.ok && (
            <Btn
              onClick={() => {
                setSim(null);
                setT(0);
              }}
              data-testid="rat-retry"
            >
              Try again
            </Btn>
          )
        ) : (
          <>
            <Btn kind="ghost" onClick={() => setPlan(plan.slice(0, -1))} disabled={!plan.length} data-testid="rat-undo">
              Undo
            </Btn>
            <Btn kind="ghost" onClick={() => setPlan([])} disabled={!plan.length}>
              Clear
            </Btn>
            <Btn kind="primary" disabled={!plan.length || cur !== 'C'} onClick={() => setSim({ step: 0, result: ratSimulate(plan) })} data-testid="rat-send">
              Send Wren
            </Btn>
          </>
        )}
      </div>
    </>
  );
}
