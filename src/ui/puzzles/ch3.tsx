import { useRef, useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { svgPoint } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import {
  WINDOWS,
  SILHOUETTE_ANSWER,
  CORRIDOR_DOORS,
  cabinSixFeedback,
  PLAIN_ALPHABET,
  RING,
  CIPHER_TEXT,
  decipher,
  cipherSolved,
} from '../../puzzles/logic';

// =====================================================================================
// P08 — Silhouettes at the lounge windows
// =====================================================================================
function Figure({ n, x }: { n: number; x: number }) {
  const base = (
    <path d={`M${x - 34} 330 Q${x - 36} 240 ${x - 16} 214 L${x + 16} 214 Q${x + 36} 240 ${x + 34} 330 Z`} fill="#05070d" />
  );
  const head = <circle cx={x} cy={196} r={20} fill="#05070d" />;
  const hats: Record<number, preact.JSX.Element> = {
    1: <ellipse cx={x} cy={180} rx={28} ry={18} fill="#05070d" stroke="#1b2a3a" stroke-width="2" />,
    2: <rect x={x - 26} y={160} width={52} height={40} rx="8" fill="#000" opacity="0.92" />,
    3: <path d={`M${x - 24} 200 Q${x} 156 ${x + 24} 200 L${x + 18} 222 L${x - 18} 222 Z`} fill="#05070d" />,
    4: <rect x={x - 26} y={160} width={52} height={40} rx="8" fill="#000" opacity="0.92" />,
    5: <ellipse cx={x + 6} cy={180} rx={24} ry={9} fill="#05070d" />,
  };
  const props: Record<number, preact.JSX.Element> = {
    1: <path d={`M${x + 22} 262 h16 v12 a8 8 0 0 1 -16 0 Z`} fill="#05070d" />,
    2: <path d={`M${x + 24} 248 q8 22 0 26 q-8 -4 0 -26 Z M${x + 24} 274 v10`} fill="#05070d" stroke="#05070d" stroke-width="3" />,
    3: <path d={`M${x + 22} 262 h14 v14 h-14 Z`} fill="#05070d" />,
    4: <rect x={x - 46} y={318} width={30} height={12} fill="#2b2016" />,
    5: <path d={`M${x + 22} 260 h16 v16 h-16 Z`} fill="#05070d" />,
  };
  return (
    <g>
      {base}
      {head}
      {hats[n]}
      {props[n]}
    </g>
  );
}
export function Silhouettes({ solve }: PuzzleProps) {
  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 360" data-testid="silhouettes">
          <defs>
            <linearGradient id="aur" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#0d1f2a" />
              <stop offset="0.5" stop-color="#2b8f6d" />
              <stop offset="1" stop-color="#14304a" />
            </linearGradient>
          </defs>
          <rect width="600" height="360" fill="#020409" />
          {WINDOWS.map((w, i) => {
            const x = 60 + i * 120;
            return (
              <g key={w.n} onClick={() => setSel(w.n)} style={{ cursor: 'pointer' }} data-testid={`win-${w.n}`}>
                <rect x={x - 50} y={40} width={100} height={290} rx="40" fill="url(#aur)" stroke={sel === w.n ? '#7de3b8' : '#3a4a5a'} stroke-width={sel === w.n ? 5 : 3} />
                <path d={`M${x - 40} 120 q40 -40 80 0`} stroke="#9fffd4" stroke-width="10" fill="none" opacity="0.35" class="aurora-band" />
                <Figure n={w.n} x={x} />
                <text x={x} y={354} text-anchor="middle" fill="#ecd398" font-size="18">
                  {w.n}
                </text>
              </g>
            );
          })}
        </svg>
        <div class="panel">
          <div class="kicker">What Wren can make out</div>
          {WINDOWS.map((w) => (
            <div style={{ fontSize: '0.88rem', padding: '2px 0' }}>
              <b style={{ color: 'var(--brass-hi)' }}>{w.n}.</b> {w.see}
            </div>
          ))}
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg || (sel ? `Window ${sel} selected.` : 'Tap the window where the professor is standing.')}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          disabled={!sel}
          data-testid="sil-tell"
          onClick={() => {
            if (sel === SILHOUETTE_ANSWER) {
              audio.sfx('unlock');
              setTimeout(solve, 300);
            } else {
              audio.sfx('fail', 0.6);
              const who: Record<number, string> = {
                1: 'Wren: "Fur hat — that\'s a little old lady with a teacup. She just called me \'dear\'."',
                2: 'Wren: "That\'s a man. He smells of brandy and he\'s asked me for another."',
                3: 'Wren: "Headscarf — she\'s English, talking about her editor. Not a professor."',
                5: 'Wren: "Beret, cocoa, French accent. That\'s Madame Vasseur, surely?"',
              };
              setMsg(who[sel!] || 'Wren: "No — not her."');
            }
          }}
        >
          Tell Wren: window {sel ?? '…'}
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P09 — Cabin six
// =====================================================================================
function DoorPlate({ x, y, plate, loose, selected, onClick, testid }: { x: number; y: number; plate: string; loose?: boolean; selected?: boolean; onClick: () => void; testid: string }) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} data-testid={testid}>
      <rect x={x} y={y} width="80" height="150" rx="6" fill="#3b2a1c" stroke={selected ? '#7de3b8' : '#1c140c'} stroke-width={selected ? 4 : 2} />
      <rect x={x + 8} y={y + 8} width="64" height="134" rx="4" fill="none" stroke="#5b4630" />
      <circle cx={x + 66} cy={y + 82} r="5" fill="#c9a45c" />
      <g transform={`rotate(${loose ? (plate === '6' ? -8 : 8) : 0} ${x + 40} ${y + 38})`}>
        <rect x={x + 22} y={y + 22} width="36" height="30" rx="4" fill="#c9a45c" stroke="#7a5a26" />
        <text x={x + 40} y={y + 45} text-anchor="middle" font-size="20" font-family="Cormorant Garamond, serif" font-weight="600" fill="#2a1d08">
          {plate}
        </text>
      </g>
      <circle cx={x + 28} cy={y + 25} r="2.2" fill="#5a4630" />
      {!loose && <circle cx={x + 52} cy={y + 25} r="2.2" fill="#5a4630" />}
      <path d={`M${x} ${y + 150} h80`} stroke="#bfe6ef" stroke-width="5" opacity="0.5" />
    </g>
  );
}
export function CabinSix({ solve }: PuzzleProps) {
  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const pick = (i: number) => {
    setSel(i);
    const r = cabinSixFeedback(i);
    if (r.ok) {
      audio.sfx('unlock');
      setMsg('');
      setTimeout(solve, 400);
    } else {
      audio.sfx('fail', 0.5);
      setMsg(r.text);
    }
  };
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 470" data-testid="cabinsix">
          <rect width="600" height="470" fill="#0c1424" />
          <text x="300" y="26" text-anchor="middle" fill="#9ba8bd" font-size="16">
            FORWARD ←  — the corridor in 1989 —  → AFT
          </text>
          <text x="12" y="120" fill="#ecd398" font-size="15" transform="rotate(-90 12 120)" text-anchor="middle">
            PORT
          </text>
          <text x="12" y="355" fill="#ecd398" font-size="15" transform="rotate(-90 12 355)" text-anchor="middle">
            STARBOARD
          </text>
          <rect x="24" y="210" width="570" height="50" fill="#14243a" />
          {CORRIDOR_DOORS.map((d, i) => {
            const col = d.pos - 1;
            const x = 30 + col * 95;
            const y = d.side === 'port' ? 44 : 276;
            return <DoorPlate key={i} x={x} y={y} plate={d.plate} loose={'loose' in d && d.loose} selected={sel === i} onClick={() => pick(i)} testid={`door-${d.side}-${d.pos}`} />;
          })}
        </svg>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback" style={{ padding: '0 16px' }}>
        {msg || 'Tap the door Wren should try.'}
      </div>
    </>
  );
}

// =====================================================================================
// P10 — The captain's cipher disc
// =====================================================================================
export function Cipher({ saved, save, solve }: PuzzleProps) {
  const [offset, setOffset] = useState<number>((saved as { offset?: number })?.offset ?? 0);
  const [attempt, setAttempt] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ a0: number; o0: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const step = 360 / 26;
  const set = (o: number) => {
    const v = ((o % 26) + 26) % 26;
    setOffset(v);
    save({ offset: v });
    setAttempt(null);
    audio.sfx('gear', 0.25);
  };
  const angleAt = (e: PointerEvent) => {
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    return (Math.atan2(p.x - 300, -(p.y - 300)) * 180) / Math.PI;
  };
  const focusInner = focus ? RING.indexOf(focus) : -1;
  const focusOuter = focusInner >= 0 ? (((focusInner - offset) % 26) + 26) % 26 : -1;

  return (
    <>
      <div class="pz-body">
        <div class="panel" style={{ fontFamily: 'var(--font-typed)', letterSpacing: '0.12em', lineHeight: 1.9, fontSize: '1.02rem', textAlign: 'center' }} data-testid="cipher-text">
          {CIPHER_TEXT.split('').map((ch) =>
            ch === ' ' ? (
              <span>&nbsp;&nbsp;</span>
            ) : (
              <span onClick={() => setFocus(focus === ch ? null : ch)} style={{ cursor: 'pointer', color: focus === ch ? '#7de3b8' : 'var(--brass-hi)' }}>
                {ch}
              </span>
            ),
          )}
          <div class="muted" style={{ fontFamily: 'var(--font-ui)', letterSpacing: 0, fontSize: '0.78rem' }}>
            Tap a letter to find it on the inner ring.
          </div>
        </div>
        <svg
          ref={svgRef}
          class="pz-svg"
          viewBox="0 0 600 600"
          style={{ maxWidth: '24rem' }}
          onPointerMove={(e) => {
            if (!drag) return;
            const d = angleAt(e) - drag.a0;
            const o = Math.round(drag.o0 - d / step);
            if ((((o % 26) + 26) % 26) !== offset) set(o);
          }}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          data-testid="cipher-disc"
        >
          <circle cx="300" cy="300" r="292" fill="#b8944f" stroke="#6b4f22" stroke-width="6" />
          <circle cx="300" cy="300" r="282" fill="#d8b977" />
          {PLAIN_ALPHABET.split('').map((ch, i) => {
            const a = ((i * step - 90) * Math.PI) / 180;
            return (
              <text key={ch} x={300 + 255 * Math.cos(a)} y={300 + 255 * Math.sin(a) + 9} text-anchor="middle" font-size="26" font-weight="700" fill={focusOuter === i ? '#0b5d46' : '#2a1d08'} font-family="Cormorant Garamond, serif">
                {ch}
              </text>
            );
          })}
          <g
            onPointerDown={(e) => {
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              setDrag({ a0: angleAt(e), o0: offset });
            }}
            style={{ cursor: 'grab' }}
          >
            <circle cx="300" cy="300" r="225" fill="#8f6c32" stroke="#5a4218" stroke-width="4" />
            <circle cx="300" cy="300" r="216" fill="#a98045" />
            {RING.split('').map((ch, j) => {
              const a = (((j - offset) * step - 90) * Math.PI) / 180;
              return (
                <text key={ch} x={300 + 190 * Math.cos(a)} y={300 + 190 * Math.sin(a) + 8} text-anchor="middle" font-size="23" font-weight="600" fill={focus === ch ? '#e9fff6' : '#f6e7c4'} font-family="Special Elite, monospace">
                  {ch}
                </text>
              );
            })}
            <circle cx="300" cy="300" r="140" fill="#6f5222" />
            <text x="300" y="296" text-anchor="middle" font-size="40" fill="#e9d29b" font-family="Cormorant Garamond, serif" font-weight="600">
              H.B.
            </text>
            <text x="300" y="330" text-anchor="middle" font-size="15" fill="#e9d29b">
              drag to turn
            </text>
          </g>
          <path d="M300 34 l-10 -18 h20 z" fill="#7de3b8" />
        </svg>
        <div class="stepper">
          <Btn small onClick={() => set(offset - 1)} data-testid="cipher-left">
            ◀
          </Btn>
          <span class="val">
            A ↔ {RING[offset]}
          </span>
          <Btn small onClick={() => set(offset + 1)} data-testid="cipher-right">
            ▶
          </Btn>
        </div>
        {attempt && (
          <div class="panel" style={{ fontFamily: 'var(--font-typed)', letterSpacing: '0.1em', textAlign: 'center', color: cipherSolved(offset) ? 'var(--ok)' : 'var(--muted)' }} data-testid="cipher-attempt">
            {attempt}
          </div>
        )}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="cipher-try"
          onClick={() => {
            const text = decipher(CIPHER_TEXT, offset);
            setAttempt(text);
            if (cipherSolved(offset)) {
              audio.sfx('unlock');
              setTimeout(solve, 1600);
            } else audio.sfx('fail', 0.4);
          }}
        >
          Try this setting
        </Btn>
      </div>
    </>
  );
}
