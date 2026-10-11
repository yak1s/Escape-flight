import { useRef, useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { svgPoint } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import { PIANO_STATEMENTS, PIANO_FALSE, NEXT_MINUTE_OPTIONS, NEXT_MINUTE_ANSWER, nextMinuteFeedback, HIDING_SPOTS, HIDING_ANSWER } from '../../puzzles/logic';
import { PianoLidPainting } from '../../art/docart';

// =====================================================================================
// P05 — Wipe the frost, then spot Wren's fib
// =====================================================================================
const GW = 24;
const GH = 16;
export function Piano({ saved, save, solve }: PuzzleProps) {
  const s = saved as { grid?: string; done?: boolean } | undefined;
  const [grid, setGrid] = useState<boolean[]>(() => (s?.grid ? s.grid.split('').map((c) => c === '1') : Array(GW * GH).fill(false)));
  const [clear, setClear] = useState<boolean>(Boolean(s?.done));
  const [strokes, setStrokes] = useState<{ x: number; y: number }[]>([]);
  const [msg, setMsg] = useState('');
  const [down, setDown] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600;
  const H = 400;
  const cleared = grid.filter(Boolean).length / grid.length;

  const wipe = (e: PointerEvent) => {
    if (clear) return;
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    setStrokes((st) => (st.length > 400 ? [...st.slice(-400), p] : [...st, p]));
    const next = [...grid];
    const R = 46;
    for (let gy = 0; gy < GH; gy += 1)
      for (let gx = 0; gx < GW; gx += 1) {
        const cx = (gx + 0.5) * (W / GW);
        const cy = (gy + 0.5) * (H / GH);
        if (Math.hypot(cx - p.x, cy - p.y) < R) next[gy * GW + gx] = true;
      }
    setGrid(next);
    const frac = next.filter(Boolean).length / next.length;
    if (frac > 0.82) {
      setClear(true);
      audio.sfx('shimmer', 0.4);
      save({ grid: next.map((b) => (b ? '1' : '0')).join(''), done: true });
    }
  };

  return (
    <>
      <div class="pz-body">
        <svg
          ref={svgRef}
          class="pz-svg"
          viewBox={`0 0 ${W} ${H}`}
          onPointerDown={(e) => {
            setDown(true);
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            wipe(e);
          }}
          onPointerMove={(e) => down && wipe(e)}
          onPointerUp={() => {
            setDown(false);
            save({ grid: grid.map((b) => (b ? '1' : '0')).join(''), done: clear });
          }}
          data-testid="piano"
          style={{ borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}
        >
          <defs>
            <pattern id="frostTex" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill="#dcecf2" />
              <path d="M5 30l10-6l8 9l12-14l9 7l11-4M0 52l14-7l9 4l13-9l11 3l13-6M8 8l9 6l10-5l12 8l10-6" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.9" />
              <circle cx="40" cy="44" r="2" fill="#fff" />
              <circle cx="18" cy="18" r="1.5" fill="#b9d6e2" />
            </pattern>
            <mask id="wipeMask">
              <rect width={W} height={H} fill="white" />
              {strokes.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="44" fill="black" />
              ))}
              {grid.map((g, i) =>
                g ? <rect key={`g${i}`} x={(i % GW) * (W / GW) - 2} y={Math.floor(i / GW) * (H / GH) - 2} width={W / GW + 4} height={H / GH + 4} fill="black" /> : null,
              )}
            </mask>
          </defs>
          <PianoLidPainting />
          {!clear && <rect width={W} height={H} fill="url(#frostTex)" mask="url(#wipeMask)" opacity="0.97" />}
        </svg>
        {clear && (
          <div class="option-grid" data-testid="piano-options">
            <div class="kicker">Wren: “Which of these is the fib?”</div>
            {PIANO_STATEMENTS.map((st) => (
              <Btn
                data-testid={`piano-${st.id}`}
                onClick={() => {
                  if (st.id === PIANO_FALSE) {
                    audio.sfx('unlock');
                    setTimeout(solve, 400);
                  } else {
                    audio.sfx('fail', 0.6);
                    setMsg(`Wren: "No — that one's true. Look again."`);
                  }
                }}
              >
                {st.text}
              </Btn>
            ))}
          </div>
        )}
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg || (clear ? '' : `Rub the frost away with your finger · ${Math.round(cleared * 100)}% clear`)}
      </div>
    </>
  );
}

// =====================================================================================
// P06 — The next minute
// =====================================================================================
export function NextMinute({ solve }: PuzzleProps) {
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <div class="pz-body">
        <div class="panel" style={{ textAlign: 'center' }}>
          <div class="kicker">Wren's wireless clock</div>
          <div style={{ fontFamily: 'var(--font-typed)', fontSize: '2.2rem', color: 'var(--brass-hi)' }}>01:04</div>
          <div class="muted" style={{ fontSize: '0.85rem' }}>
            "Something that happens in the next five minutes."
          </div>
        </div>
        <div class="option-grid" data-testid="nextminute">
          <div class="kicker">Appendix A — Chronology (as printed)</div>
          {NEXT_MINUTE_OPTIONS.map((o) => (
            <Btn class={sel === o.id ? 'sel' : ''} onClick={() => setSel(o.id)} data-testid={`nm-${o.id}`}>
              <span style={{ fontFamily: 'var(--font-typed)', color: 'var(--brass-hi)', minWidth: '3.4rem' }}>{o.gmt}</span>
              <span>{o.text}</span>
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
          disabled={!sel}
          onClick={() => {
            if (!sel) return;
            if (sel === NEXT_MINUTE_ANSWER) {
              audio.sfx('engine_stop');
              setTimeout(solve, 1200);
            } else {
              audio.sfx('fail', 0.6);
              setMsg(nextMinuteFeedback(sel));
            }
          }}
          data-testid="nm-tell"
        >
          Tell Wren
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P07 — Fifty years
// =====================================================================================
export function Hiding({ solve }: PuzzleProps) {
  const [msg, setMsg] = useState<string>('');
  const [tried, setTried] = useState<string[]>([]);
  return (
    <>
      <div class="pz-body">
        <div class="option-grid" data-testid="hiding">
          <div class="kicker">Wren: "Where shall I put it?"</div>
          {HIDING_SPOTS.map((h) => (
            <Btn
              data-testid={`hide-${h.id}`}
              disabled={tried.includes(h.id)}
              onClick={() => {
                if (h.id === HIDING_ANSWER) {
                  audio.sfx('shimmer', 0.6);
                  setTimeout(solve, 400);
                } else {
                  audio.sfx('fail', 0.6);
                  setTried([...tried, h.id]);
                  setMsg(`${h.fail} Wren: "Gone? Then I'll find something else and we'll try somewhere better."`);
                }
              }}
            >
              {h.label}
            </Btn>
          ))}
        </div>
        <p class="muted" style={{ fontSize: '0.85rem', maxWidth: '30rem' }}>
          Tip: close this panel and look at each of these places in the wireless room as it is now.
        </p>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback" style={{ padding: '0 16px' }}>
        {msg}
      </div>
    </>
  );
}
