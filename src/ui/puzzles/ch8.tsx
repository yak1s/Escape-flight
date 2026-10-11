import { useMemo, useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import { GEAR_PEGS, GEAR_INVENTORY, gearSimulate, gearsSolved, ANOMALIES, appendixSolved } from '../../puzzles/logic';

// =====================================================================================
// P24 — The hatch gears
// =====================================================================================
const U = 36;
const GX = (x: number) => 80 + x * U;
const GY = (y: number) => 200 - y * U;
function gearPath(r: number) {
  const R = r * U - 3;
  const teeth = r * 8;
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i += 1) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? R - 7 : R + 3;
    pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
export function Gears({ saved, save, solve }: PuzzleProps) {
  const [placed, setPlaced] = useState<Record<string, number>>((saved as { placed?: Record<string, number> })?.placed || {});
  const [sel, setSel] = useState<number | null>(null);
  const [spin, setSpin] = useState<{ result: ReturnType<typeof gearSimulate>; at: number } | null>(null);
  const [msg, setMsg] = useState('');
  const used: number[] = Object.values(placed);
  const tray = useMemo(() => {
    const left = [...GEAR_INVENTORY];
    for (const r of used) {
      const i = left.indexOf(r);
      if (i >= 0) left.splice(i, 1);
    }
    return left;
  }, [placed]);
  const commit = (p: Record<string, number>) => {
    setPlaced(p);
    save({ placed: p });
    setSpin(null);
    setMsg('');
  };
  const pegTap = (k: string) => {
    if (GEAR_PEGS[k].fixed) return;
    if (placed[k]) {
      const p = { ...placed };
      delete p[k];
      audio.sfx('mirror_click', 0.6);
      return commit(p);
    }
    if (sel !== null) {
      audio.sfx('gear', 0.5);
      commit({ ...placed, [k]: sel });
      setSel(null);
    }
  };
  const turning = spin && Date.now() - spin.at < 2000;
  const rotFor = (k: string) => {
    if (!spin) return 0;
    const dir = spin.result.spin[k];
    if (!dir || spin.result.latch === 'jam') return k === 'D' ? 6 : 0;
    const r = GEAR_PEGS[k].fixed || placed[k];
    return (dir * 180) / r;
  };
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 640 420" data-testid="gears">
          <rect width="640" height="420" rx="14" fill="#141b26" />
          <text x="20" y="30" fill="#9ba8bd" font-size="14">
            Hatch wheel (turns clockwise)
          </text>
          <text x={GX(13) - 60} y={GY(-3) + 110} fill="#9ba8bd" font-size="14">
            Latch (must turn anticlockwise)
          </text>
          {Object.entries(GEAR_PEGS).map(([k, p]) => {
            const r = p.fixed || placed[k];
            return (
              <g key={k} onClick={() => pegTap(k)} style={{ cursor: p.fixed ? 'default' : 'pointer' }} data-testid={`peg-${k}`}>
                <circle cx={GX(p.x)} cy={GY(p.y)} r={Math.max(28, (r || 1) * U)} fill="transparent" />
                {r ? (
                  <g transform={`translate(${GX(p.x)} ${GY(p.y)})`}>
                    <g style={{ transform: `rotate(${rotFor(k)}deg)`, transition: turning ? 'transform 1.8s ease-in-out' : 'none' }}>
                      <path d={gearPath(r)} fill={p.fixed ? '#8a6a32' : '#c9a45c'} stroke="#3a2a10" stroke-width="2" />
                      <circle r={r * U * 0.45} fill="#141b26" opacity="0.5" />
                      <line x1="0" y1="0" x2={r * U - 12} y2="0" stroke="#3a2a10" stroke-width="4" />
                    </g>
                    <circle r="6" fill="#3a2a10" />
                  </g>
                ) : (
                  <g>
                    <circle cx={GX(p.x)} cy={GY(p.y)} r="9" fill="#5a6475" stroke="#9ba8bd" />
                    <text x={GX(p.x)} y={GY(p.y) - 16} text-anchor="middle" fill="#7a869a" font-size="12">
                      peg {k}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {/* handwheel spokes around D */}
          <circle cx={GX(0)} cy={GY(0)} r={2 * U + 22} fill="none" stroke="#5d9fb0" stroke-width="6" opacity="0.6" />
          {/* latch bar */}
          <g transform={`translate(${GX(13)} ${GY(-3)})`}>
            <rect x="-6" y={-2 * U - 40} width="12" height="34" fill={spin?.result.latch === 'open' ? '#7de3b8' : '#5d9fb0'} />
          </g>
        </svg>
        <div class="panel" style={{ textAlign: 'center' }}>
          <div class="kicker">Loose gears</div>
          <div class="grid-tools" style={{ marginTop: 6 }}>
            {tray.map((r, i) => (
              <Btn small onClick={() => setSel(sel === r ? null : r)} style={{ background: sel === r ? 'rgba(125,227,184,.2)' : undefined }} data-testid={`gear-${r}-${i}`}>
                {r === 1 ? 'Small' : r === 2 ? 'Medium' : 'Large'}
              </Btn>
            ))}
            {!tray.length && <span class="muted">All gears placed.</span>}
          </div>
        </div>
      </div>
      <div class={`pz-feedback ${msg && spin?.result.latch !== 'open' ? 'err' : 'ok'}`} data-testid="pz-feedback">
        {msg || (sel ? 'Tap an empty peg.' : 'Pick a gear, then a peg. Tap a placed gear to take it off.')}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="gears-turn"
          onClick={() => {
            const result = gearSimulate(placed);
            setSpin({ result, at: Date.now() });
            audio.sfx('gear');
            const m: Record<string, string> = {
              jam: 'The teeth bind. Gears that touch must not be forced — something overlaps or fights another gear.',
              still: 'The wheel spins, but nothing reaches the latch.',
              tighten: 'The latch turns — the wrong way. It screws itself tighter.',
              open: 'The latch turns anticlockwise. Clunk.',
            };
            setMsg(m[result.latch]);
            if (gearsSolved(placed)) setTimeout(solve, 1900);
          }}
        >
          Turn the wheel
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P25 — The last minute (normally solved by exploring the control car)
// =====================================================================================
export function Search({ state }: PuzzleProps) {
  const finds = [
    ['doc:control-clock', 'The clock'],
    ['doc:control-altimeter', 'The altimeter'],
    ['doc:control-telegraph', 'The engine telegraphs'],
    ['doc:control-chart', "Moen's chart"],
    ['card_turned', 'The card at the helm — turned round'],
  ];
  const has = (c: string) => (c.startsWith('doc:') ? state.docs.includes(c.slice(4)) : Boolean(state.flags[c]));
  return (
    <div class="pz-body">
      <div class="checklist" style={{ width: '100%', maxWidth: '30rem' }}>
        {finds.map(([c, t]) => (
          <div class={`check ${has(c) ? 'ok' : ''}`}>
            <span class="st">{has(c) ? '✓' : '·'}</span>
            <div class="t">{t}</div>
          </div>
        ))}
      </div>
      <p class="muted">Close this panel and examine the control car.</p>
    </div>
  );
}

// =====================================================================================
// P26 — Appendix C reconciliation
// =====================================================================================
export function Appendix({ state, saved, save, solve }: PuzzleProps) {
  const [matches, setMatches] = useState<Record<string, string>>((saved as { m?: Record<string, string> })?.m || {});
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const entries = [...state.log].sort((a, b) => a.time.localeCompare(b.time));
  const pick = (logId: string) => {
    if (!sel) return;
    const next = { ...matches };
    for (const k of Object.keys(next)) if (next[k] === logId) delete next[k];
    next[sel] = logId;
    setMatches(next);
    save({ m: next });
    setSel(null);
    audio.sfx('page', 0.5);
    setMsg('');
  };
  const done = Object.keys(matches).length === ANOMALIES.length;
  return (
    <>
      <div class="pz-body">
        <div class="option-grid" data-testid="appendix-anoms">
          <div class="kicker">Appendix C (GMT) — tap one, then your log entry</div>
          {ANOMALIES.map((a) => {
            const m = matches[a.id];
            const e = m ? state.log.find((l) => l.id === m) : null;
            return (
              <Btn class={sel === a.id ? 'sel' : ''} onClick={() => setSel(a.id)} data-testid={`anom-${a.id}`}>
                <span style={{ fontFamily: 'var(--font-typed)', color: 'var(--brass-hi)' }}>
                  {a.id} {a.gmt}
                </span>
                <span style={{ flex: 1 }}>{a.text}</span>
                {e && <span class="chip ok">↔ {e.time}</span>}
              </Btn>
            );
          })}
        </div>
        <div class="option-grid" data-testid="appendix-log">
          <div class="kicker">Your radio log (ship's time)</div>
          {entries.map((l) => (
            <Btn onClick={() => pick(l.id)} disabled={!sel} data-testid={`logpick-${l.id}`} style={{ opacity: Object.values(matches).includes(l.id) ? 0.55 : 1 }}>
              <span style={{ fontFamily: 'var(--font-typed)', color: 'var(--aurora)' }}>{l.time}</span>
              <span style={{ flex: 1 }}>{l.text}</span>
            </Btn>
          ))}
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          disabled={!done}
          data-testid="appendix-compare"
          onClick={() => {
            if (appendixSolved(matches)) {
              audio.sfx('reveal');
              setTimeout(solve, 900);
            } else {
              audio.sfx('fail', 0.6);
              const right = ANOMALIES.filter((a) => matches[a.id] === a.log).length;
              setMsg(`${right} of 6 line up. Remember: the Board's times are GMT, one hour behind the ship's clocks.`);
            }
          }}
        >
          Compare
        </Btn>
      </div>
    </>
  );
}
