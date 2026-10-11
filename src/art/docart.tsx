// Art used inside documents and puzzles: deck plan, map, painting, handwriting, photos, drawings.
import type { FunctionComponent, JSX } from 'preact';
import type { GameState } from '../engine/types';
import { LIGHTS } from '../puzzles/logic';
import { toSvg, PLACES } from '../puzzles/logic/map';

type P = { state: GameState };

// ================================================================== deck plan (600×600, bow up)
export function DeckPlanDrawing() {
  const line = '#e9e1c8';
  const fill = 'rgba(233,225,200,0.08)';
  return (
    <g font-family="Inter, sans-serif">
      <rect width="600" height="600" fill="#0f2238" />
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`g${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" stroke="#16304d" stroke-width="1" />
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} stroke="#16304d" stroke-width="1" />
      ))}
      {/* hull outline */}
      <path d="M300 22 C430 22 548 112 552 250 L552 470 C552 540 470 580 300 580 C130 580 48 540 48 470 L48 250 C52 112 170 22 300 22 Z" fill="none" stroke={line} stroke-width="4" />
      {/* title cartouche & compass (tile 0) */}
      <rect x="22" y="40" width="150" height="70" rx="6" fill="#0b1a2c" stroke="#c9a45c" stroke-width="2" />
      <text x="97" y="68" text-anchor="middle" fill="#ecd398" font-size="15" font-weight="700" font-family="Cormorant Garamond, serif">
        NC-3 ALBATROSS
      </text>
      <text x="97" y="92" text-anchor="middle" fill="#ecd398" font-size="13">
        A DECK
      </text>
      <g transform="translate(97 155)">
        <circle r="30" fill="none" stroke="#c9a45c" stroke-width="2" />
        <path d="M0 -34 L7 0 L0 34 L-7 0 Z" fill="#c9a45c" />
        <text y="-38" text-anchor="middle" fill="#ecd398" font-size="11" font-weight="700">
          BOW ↑
        </text>
      </g>
      {/* lounge (tile 1) */}
      <rect x="205" y="70" width="190" height="125" fill={fill} stroke={line} stroke-width="3" />
      <text x="300" y="120" text-anchor="middle" fill={line} font-size="17" font-weight="600">
        LOUNGE
      </text>
      <path d="M240 150 h40 l6 24 h-52 z" fill="none" stroke={line} stroke-width="2" />
      <text x="262" y="168" text-anchor="middle" fill={line} font-size="9">
        piano
      </text>
      <path d="M205 195 h65 M330 195 h65" stroke={line} stroke-width="3" />
      {/* writing room (tile 2) */}
      <rect x="400" y="100" width="120" height="95" fill={fill} stroke={line} stroke-width="3" />
      <text x="460" y="145" text-anchor="middle" fill={line} font-size="12" font-weight="600">
        WRITING
      </text>
      <text x="460" y="161" text-anchor="middle" fill={line} font-size="12" font-weight="600">
        ROOM
      </text>
      {/* promenades */}
      <rect x="60" y="200" width="36" height="355" fill="none" stroke={line} stroke-width="2" stroke-dasharray="8 6" />
      <rect x="504" y="200" width="36" height="355" fill="none" stroke={line} stroke-width="2" stroke-dasharray="8 6" />
      <text x="78" y="380" text-anchor="middle" fill={line} font-size="11" transform="rotate(-90 78 380)">
        PORT PROMENADE
      </text>
      <text x="522" y="380" text-anchor="middle" fill={line} font-size="11" transform="rotate(90 522 380)">
        STARBOARD PROMENADE
      </text>
      {/* corridor (tiles 4 & 7) */}
      <rect x="250" y="195" width="100" height="330" fill="rgba(233,225,200,0.05)" stroke={line} stroke-width="3" />
      <text x="300" y="365" text-anchor="middle" fill={line} font-size="13" transform="rotate(-90 300 365)">
        CORRIDOR
      </text>
      {/* cabins port (odd) */}
      {[1, 3, 5, 7, 9, 11].map((n, i) => {
        const y = 205 + i * 56;
        return (
          <g key={n}>
            <rect x="104" y={y} width="140" height="50" fill={fill} stroke={line} stroke-width="2" />
            <text x="174" y={y + 31} text-anchor="middle" fill={line} font-size="17" font-weight="600">
              {n}
            </text>
          </g>
        );
      })}
      {/* cabins starboard (even) */}
      {[2, 4, 6, 8, 10, 12].map((n, i) => {
        const y = 205 + i * 56;
        return (
          <g key={n}>
            <rect x="356" y={y} width="140" height="50" fill={fill} stroke={line} stroke-width="2" />
            <text x="426" y={y + 31} text-anchor="middle" fill={line} font-size="17" font-weight="600">
              {n}
            </text>
          </g>
        );
      })}
      {/* crew stair (tile 7) */}
      <rect x="265" y="530" width="70" height="40" fill="#2a1d10" stroke="#c9a45c" stroke-width="2" />
      <text x="300" y="548" text-anchor="middle" fill="#ecd398" font-size="10" font-weight="700">
        CREW ONLY
      </text>
      <text x="300" y="563" text-anchor="middle" fill="#ecd398" font-size="10">
        ↓ B DECK
      </text>
      {/* legend (tile 8) */}
      <rect x="420" y="545" width="170" height="48" rx="4" fill="#0b1a2c" stroke="#c9a45c" stroke-width="1.5" />
      <text x="505" y="564" text-anchor="middle" fill="#ecd398" font-size="10.5">
        ODD CABINS TO PORT
      </text>
      <text x="505" y="582" text-anchor="middle" fill="#ecd398" font-size="10.5">
        EVEN CABINS TO STARBOARD
      </text>
      {/* B-deck inset (tile 6) */}
      <rect x="8" y="545" width="150" height="48" rx="4" fill="#0b1a2c" stroke="#9fc9d6" stroke-width="1.5" />
      <text x="83" y="563" text-anchor="middle" fill="#9fc9d6" font-size="9.5">
        B DECK: WIRELESS · GALLEY
      </text>
      <text x="83" y="580" text-anchor="middle" fill="#9fc9d6" font-size="9.5">
        BAR · MAIL · SMOKING ROOM
      </text>
    </g>
  );
}

// ================================================================== topographic map (600×560)
export function MapDrawing({ showLabels = true, showShip = false, showWreck = true }: { showLabels?: boolean; showShip?: boolean; showWreck?: boolean }) {
  const pt = (x: number, y: number) => toSvg(x, y);
  const path = (pts: [number, number][], close = true) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${pt(x, y).x.toFixed(1)} ${pt(x, y).y.toFixed(1)}`).join('') + (close ? 'Z' : '');
  // fjord (water/ice) from the NW sea to Ravnvik at its head
  const fjord: [number, number][] = [
    [-17, 16], [-10, 13.5], [-3, 12.2], [3, 10.6], [7.5, 8.8], [11, 7.2], [12, 6.2], [10.5, 5.9], [7, 6.6], [3, 8.2], [-3, 9.8], [-10, 11.2], [-17, 12.5],
  ];
  const sea: [number, number][] = [[-20, 20], [-17, 20], [-17, 10], [-20, 10]];
  return (
    <g font-family="Inter, sans-serif">
      <rect x="0" y="0" width="600" height="560" fill="#ece5cf" />
      {/* contour rings */}
      {[
        { c: PLACES.ridge, r: [9, 6.5, 4.2, 2.2], label: 'Ravnkammen 1580' },
        { c: PLACES.ravntind, r: [7, 5, 3.2, 1.6], label: 'Ravntind 1720' },
        { c: { x: 2.2, y: -2.4 }, r: [6, 4.2, 2.6], label: '' },
        { c: { x: 16, y: -2 }, r: [6, 4, 2], label: '' },
      ].map((m, i) => (
        <g key={i}>
          {m.r.map((rr, j) => (
            <ellipse key={j} cx={pt(m.c.x, m.c.y).x} cy={pt(m.c.x, m.c.y).y} rx={rr * 14 * 1.15} ry={rr * 14} fill={j === m.r.length - 1 ? '#d8c9a3' : 'none'} stroke="#a08458" stroke-width="1.2" opacity={0.8} />
          ))}
          {showLabels && m.label && (
            <text x={pt(m.c.x, m.c.y).x} y={pt(m.c.x, m.c.y).y + 4} text-anchor="middle" fill="#6b4f22" font-size="11" font-weight="600">
              ▲ {m.label}
            </text>
          )}
        </g>
      ))}
      {/* glacier */}
      <path d={path([[2, -12], [9, -13], [12, -9], [9, -6], [5, -7]])} fill="#ffffff" stroke="#8fb3c2" stroke-width="1.5" opacity="0.85" />
      {showLabels && (
        <text x={pt(7, -11).x} y={pt(7, -11).y} text-anchor="middle" fill="#4a7a8a" font-size="11" font-style="italic">
          Ravnbreen
        </text>
      )}
      <path d={path(sea)} fill="#9cc6d6" />
      <path d={path(fjord)} fill="#cfe6ee" stroke="#6a9fb2" stroke-width="1.5" />
      {showLabels && (
        <text x={pt(-4, 11).x} y={pt(-4, 11).y} text-anchor="middle" fill="#3a6a7e" font-size="12" font-style="italic" transform={`rotate(-14 ${pt(-4, 11).x} ${pt(-4, 11).y})`}>
          Kvitfjord (frozen)
        </text>
      )}
      {/* landing ice */}
      <ellipse cx={pt(PLACES.landing.x, PLACES.landing.y).x} cy={pt(PLACES.landing.x, PLACES.landing.y).y} rx="26" ry="11" fill="none" stroke="#2f6f7e" stroke-width="2" stroke-dasharray="4 3" transform={`rotate(-20 ${pt(PLACES.landing.x, PLACES.landing.y).x} ${pt(PLACES.landing.x, PLACES.landing.y).y})`} />
      {showLabels && (
        <text x={pt(PLACES.landing.x, PLACES.landing.y).x - 30} y={pt(PLACES.landing.x, PLACES.landing.y).y + 24} fill="#2f6f7e" font-size="10.5">
          flat ice
        </text>
      )}
      {/* saddle */}
      <path d={`M${pt(1.6, 3.2).x} ${pt(1.6, 3.2).y} q10 8 22 0`} stroke="#6b4f22" stroke-width="2" fill="none" />
      {showLabels && (
        <text x={pt(PLACES.saddle.x, PLACES.saddle.y).x + 14} y={pt(PLACES.saddle.x, PLACES.saddle.y).y + 4} fill="#6b4f22" font-size="10">
          Skarv saddle 1240
        </text>
      )}
      {/* Ravnvik village */}
      <rect x={pt(11.8, 7.2).x} y={pt(11.8, 7.2).y} width="12" height="9" fill="#6b4f22" />
      {showLabels && (
        <text x={pt(12.6, 8.4).x} y={pt(12.6, 8.4).y} fill="#3a2a10" font-size="11" font-weight="600">
          Ravnvik
        </text>
      )}
      {/* lights */}
      {LIGHTS.map((l) => {
        const p = pt(l.x, l.y);
        return (
          <g key={l.id}>
            <path d={`M${p.x} ${p.y - 9} l5 9 l-5 9 l-5 -9 z`} fill={l.id === 'ravntind' ? '#b0222a' : l.id === 'hestnes' ? '#2a8a4a' : '#d9a520'} stroke="#3a2a10" stroke-width="1" />
            {showLabels && (
              <text x={p.x + 8} y={p.y - 6} fill="#3a2a10" font-size="9.5">
                {l.name} {l.char}
              </text>
            )}
          </g>
        );
      })}
      {/* wreck X */}
      {showWreck && (
        <g>
          <path d={`M${pt(PLACES.ridge.x, PLACES.ridge.y).x - 8} ${pt(PLACES.ridge.x, PLACES.ridge.y).y - 8} l16 16 M${pt(PLACES.ridge.x, PLACES.ridge.y).x + 8} ${pt(PLACES.ridge.x, PLACES.ridge.y).y - 8} l-16 16`} stroke="#b0222a" stroke-width="3" />
          {showLabels && (
            <text x={pt(PLACES.ridge.x, PLACES.ridge.y).x + 12} y={pt(PLACES.ridge.x, PLACES.ridge.y).y + 18} fill="#b0222a" font-size="12" font-family="Caveat, cursive" font-weight="600">
              the wreck — W.
            </text>
          )}
        </g>
      )}
      {showShip && (
        <g>
          <circle cx={pt(0, 0).x} cy={pt(0, 0).y} r="7" fill="#2f6f7e" stroke="#fff" stroke-width="2" />
          <text x={pt(0, 0).x - 10} y={pt(0, 0).y + 22} fill="#2f6f7e" font-size="11" font-weight="700">
            Albatross 03:00
          </text>
        </g>
      )}
      {/* grid & north arrow */}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`x${i}`} x1={i * 75} y1="0" x2={i * 75} y2="560" stroke="#a08458" stroke-width="0.6" opacity="0.4" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={`y${i}`} x1="0" y1={i * 75} x2="600" y2={i * 75} stroke="#a08458" stroke-width="0.6" opacity="0.4" />
      ))}
      <g transform="translate(560 50)">
        <path d="M0 -26 L8 8 L0 2 L-8 8 Z" fill="#3a2a10" />
        <text y="22" text-anchor="middle" fill="#3a2a10" font-size="12" font-weight="700">
          N
        </text>
      </g>
      <g transform="translate(30 540)">
        <line x1="0" y1="0" x2="70" y2="0" stroke="#3a2a10" stroke-width="3" />
        <text x="35" y="-6" text-anchor="middle" fill="#3a2a10" font-size="10">
          5 km
        </text>
      </g>
      <rect x="0" y="0" width="600" height="560" fill="none" stroke="#6b4f22" stroke-width="3" />
    </g>
  );
}

// ================================================================== piano lid painting (600×400)
export function PianoLidPainting() {
  return (
    <g>
      <defs>
        <linearGradient id="pl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d1838" />
          <stop offset="0.7" stop-color="#22406a" />
          <stop offset="1" stop-color="#2d5a7a" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#pl-sky)" />
      {/* full moon, upper left */}
      <circle cx="110" cy="90" r="46" fill="#f4ecd2" />
      <circle cx="96" cy="80" r="8" fill="#e2d6b2" />
      <circle cx="124" cy="104" r="6" fill="#e2d6b2" />
      {/* stars */}
      {[
        [300, 40], [420, 70], [520, 30], [560, 120], [250, 120], [460, 160], [200, 60],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="#fff" opacity="0.8" />
      ))}
      {/* albatross flying LEFT toward the moon */}
      <g transform="translate(340 170)">
        <path d="M0 0 C -40 -30, -120 -40, -190 -20 C -120 -10, -60 0, -20 14 Z" fill="#efe6d2" stroke="#2a3a55" stroke-width="2" />
        <path d="M10 0 C 50 -30, 140 -46, 210 -30 C 140 -12, 70 2, 24 14 Z" fill="#efe6d2" stroke="#2a3a55" stroke-width="2" />
        <ellipse cx="4" cy="10" rx="36" ry="12" fill="#f7f2e4" stroke="#2a3a55" stroke-width="2" />
        <circle cx="-30" cy="6" r="9" fill="#f7f2e4" stroke="#2a3a55" stroke-width="2" />
        <path d="M-38 6 l-16 3 l16 2 z" fill="#d9a520" />
        {/* seven stars on the wing */}
        {[
          [60, -22], [90, -28], [120, -32], [150, -30], [180, -28], [75, -12], [135, -16],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 5} l1.6 3.4 l3.6 0.4 l-2.7 2.4 l0.8 3.6 l-3.3 -1.8 l-3.3 1.8 l0.8 -3.6 l-2.7 -2.4 l3.6 -0.4 z`} fill="#d9a520" />
        ))}
      </g>
      {/* sea */}
      <path d="M0 320 Q 75 300 150 320 T 300 320 T 450 320 T 600 320 L600 400 L0 400 Z" fill="#1a3a5a" />
      <path d="M0 340 Q 75 322 150 340 T 300 340 T 450 340 T 600 340" stroke="#4a7a9a" stroke-width="3" fill="none" />
      {/* two-masted ship */}
      <g transform="translate(300 300)">
        <path d="M-70 0 L70 0 L52 22 L-52 22 Z" fill="#3a2316" stroke="#1a0f08" stroke-width="2" />
        <line x1="-25" y1="0" x2="-25" y2="-90" stroke="#1a0f08" stroke-width="3" />
        <line x1="25" y1="0" x2="25" y2="-80" stroke="#1a0f08" stroke-width="3" />
        <path d="M-25 -84 L-60 -10 L-25 -10 Z" fill="#efe6d2" />
        <path d="M25 -76 L58 -10 L25 -10 Z" fill="#efe6d2" />
        <path d="M-25 -84 L10 -18 L-25 -18 Z" fill="#e2d6b8" />
      </g>
      <text x="580" y="390" text-anchor="end" fill="#c9a45c" font-size="12" font-family="Caveat, cursive">
        J. Aakre 1938
      </text>
    </g>
  );
}

// ================================================================== handwriting samples
type Glyph = 'S-loop' | 'S-plain' | '9-straight' | '9-curly' | 'o-steep' | 'o-shallow';
function G({ g, size }: { g: Glyph; size: number }) {
  const w = size * 0.62;
  const h = size;
  const common = { fill: 'none', stroke: '#1d1a2e', 'stroke-width': size * 0.075, 'stroke-linecap': 'round' as const, 'stroke-linejoin': 'round' as const };
  let d = '';
  if (g === 'S-plain') d = `M${w * 0.82} ${h * 0.26} C ${w * 0.6} ${h * 0.08}, ${w * 0.12} ${h * 0.14}, ${w * 0.2} ${h * 0.38} C ${w * 0.28} ${h * 0.56}, ${w * 0.86} ${h * 0.56}, ${w * 0.8} ${h * 0.78} C ${w * 0.74} ${h * 0.98}, ${w * 0.22} ${h * 0.96}, ${w * 0.1} ${h * 0.82}`;
  if (g === 'S-loop')
    d = `M${w * 0.62} ${h * 0.2} C ${w * 0.9} ${h * 0.02}, ${w * 0.98} ${h * 0.3}, ${w * 0.72} ${h * 0.26} C ${w * 0.5} ${h * 0.22}, ${w * 0.1} ${h * 0.18}, ${w * 0.2} ${h * 0.4} C ${w * 0.28} ${h * 0.56}, ${w * 0.86} ${h * 0.56}, ${w * 0.8} ${h * 0.78} C ${w * 0.74} ${h * 0.98}, ${w * 0.22} ${h * 0.96}, ${w * 0.1} ${h * 0.82}`;
  if (g === '9-straight') d = `M${w * 0.8} ${h * 0.4} C ${w * 0.8} ${h * 0.12}, ${w * 0.15} ${h * 0.12}, ${w * 0.18} ${h * 0.4} C ${w * 0.2} ${h * 0.6}, ${w * 0.76} ${h * 0.6}, ${w * 0.8} ${h * 0.4} L ${w * 0.8} ${h * 1.0}`;
  if (g === '9-curly') d = `M${w * 0.8} ${h * 0.4} C ${w * 0.8} ${h * 0.12}, ${w * 0.15} ${h * 0.12}, ${w * 0.18} ${h * 0.4} C ${w * 0.2} ${h * 0.6}, ${w * 0.76} ${h * 0.6}, ${w * 0.8} ${h * 0.4} C ${w * 0.84} ${h * 0.8}, ${w * 0.6} ${h * 1.02}, ${w * 0.2} ${h * 0.92}`;
  const o = `M${w * 0.5} ${h * 0.42} C ${w * 0.95} ${h * 0.42}, ${w * 0.95} ${h * 0.96}, ${w * 0.5} ${h * 0.96} C ${w * 0.05} ${h * 0.96}, ${w * 0.05} ${h * 0.42}, ${w * 0.5} ${h * 0.42} Z`;
  return (
    <svg width={w} height={h * 1.05} viewBox={`0 0 ${w} ${h * 1.05}`} style={{ verticalAlign: `-${size * 0.18}px`, overflow: 'visible' }} aria-hidden="true">
      {g.startsWith('o') ? (
        <g>
          <path d={o} {...common} />
          {g === 'o-steep' && <path d={`M${w * 0.18} ${h * 1.04} L${w * 0.86} ${h * 0.24}`} {...common} />}
          {g === 'o-shallow' && <path d={`M${w * 0.0} ${h * 0.78} L${w * 1.0} ${h * 0.6}`} {...common} />}
        </g>
      ) : (
        <path d={d} {...common} />
      )}
    </svg>
  );
}
type Part = string | Glyph;
const SAMPLES: Record<string, { font: string; parts: Part[]; label?: string }> = {
  tag: { font: 'var(--font-prof)', parts: ['E. ', 'S-loop', 'orrel · Cabin ', '9-straight', ' · Troms', 'o-steep'] },
  pell: { font: 'Georgia, serif', parts: ['…will make Troms', 'o-shallow', ' on the ', '9-curly', 'th ', 'S-plain', 'ept. — the heater question is closed.'] },
  vasseur: { font: 'var(--font-display)', parts: ['S-loop', 'ophie — the ', 'S-loop', 'pectacle on the 2', '9-curly', 'th went splendidly.'] },
  solberg: { font: 'var(--font-prof)', parts: ['Dear ', 'S-loop', 'igrid — the Troms', 'o-steep', ' readings for the 1', '9-straight', 'th were ', 'S-loop', 'uperb.'] },
  fenwick: { font: 'var(--font-prof)', parts: ['Copy follows from Tromso on the ', '9-straight', 'th — ', 'S-loop', 'ky like a ', 'S-loop', 'argent.'] },
  finch: { font: 'var(--font-kalam)', parts: ['S-plain', 'ack ', '9-straight', ' — sealed Bergen — ', 'S-plain', 'tamps ', '9-straight', 'd.'] },
};
const GLYPHS = new Set<string>(['S-loop', 'S-plain', '9-straight', '9-curly', 'o-steep', 'o-shallow']);
export function HandSample({ id, big }: { id: string; big?: boolean }) {
  const s = SAMPLES[id];
  const size = big ? 30 : 22;
  return (
    <div style={{ fontFamily: s.font, fontSize: `${size}px`, lineHeight: 1.5, color: '#1d1a2e', padding: '4px 0' }} data-testid={`sample-${id}`}>
      {s.parts.map((p, i) => (GLYPHS.has(p) ? <G key={i} g={p as Glyph} size={size} /> : <span key={i}>{p}</span>))}
    </div>
  );
}

// ================================================================== bird plate staff (notes 7–12)
export function BirdPlateStaff() {
  // G4 A4 C5 D5 E5 D5 on a treble staff; E4 is the bottom line.
  const steps: Record<string, number> = { E4: 0, F4: 1, G4: 2, A4: 3, B4: 4, C5: 5, D5: 6, E5: 7 };
  const notes = ['G4', 'A4', 'C5', 'D5', 'E5', 'D5'];
  const y0 = 90;
  const gap = 12;
  return (
    <svg viewBox="0 0 520 130" style={{ width: '100%', display: 'block' }} aria-label="Notes 7 to 12: G A C D E D" data-testid="bird-plate">
      <rect width="520" height="130" rx="8" fill="#b08a3e" />
      <rect x="6" y="6" width="508" height="118" rx="6" fill="#c9a45c" stroke="#7a5a26" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="40" y1={y0 - i * gap} x2="500" y2={y0 - i * gap} stroke="#3a2a10" stroke-width="1.5" />
      ))}
      <text x="48" y={y0 + 4} font-size="58" fill="#3a2a10">
        𝄞
      </text>
      <text x="110" y="22" fill="#3a2a10" font-size="11">
        7
      </text>
      {notes.map((n, i) => {
        const x = 120 + i * 62;
        const y = y0 - (steps[n] * gap) / 2;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="8" ry="6" fill="#2a1d08" transform={`rotate(-20 ${x} ${y})`} />
            <line x1={x + 7} y1={y} x2={x + 7} y2={y - 34} stroke="#2a1d08" stroke-width="2" />
            <text x={x} y="118" text-anchor="middle" fill="#3a2a10" font-size="13" font-family="Special Elite, monospace">
              {n[0]}
            </text>
          </g>
        );
      })}
      <text x="490" y="22" text-anchor="end" fill="#3a2a10" font-size="11">
        12 — J. ASHDOWN · HULL
      </text>
    </svg>
  );
}

// ================================================================== small illustrations
const svgDoc = (viewBox: string, children: JSX.Element, label: string) => (
  <svg class="doc-art" viewBox={viewBox} role="img" aria-label={label}>
    {children}
  </svg>
);

function CrewPhoto({ state }: P) {
  const known = Boolean(state.solved.P17);
  return svgDoc(
    '0 0 400 300',
    <g>
      <defs>
        <filter id="sepia-grain">
          <feTurbulence baseFrequency="0.9" numOctaves="1" seed="3" />
          <feColorMatrix values="0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.25 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="400" height="300" fill="#b89c74" />
      <rect x="0" y="200" width="400" height="100" fill="#8a7050" />
      <rect x="40" y="60" width="160" height="120" fill="#9a8060" />
      {/* E. Hale */}
      <circle cx="130" cy="120" r="30" fill="#5a4630" />
      <path d="M80 230 q50 -90 100 0 z" fill="#3a2a1c" />
      <rect x="100" y="94" width="60" height="16" fill="#2a1d10" />
      {/* W. Ashdown */}
      <circle cx="270" cy="126" r="28" fill="#6b5338" />
      <path d="M240 112 q30 -40 62 4 q-6 -18 -30 -22 q-22 2 -32 18 z" fill="#3a2414" />
      <path d="M228 232 q42 -86 84 0 z" fill="#3a2a1c" />
      <path d="M258 140 q12 8 24 0" stroke="#2a1d10" stroke-width="2" fill="none" />
      {/* the little brass bird at her collar */}
      <path d={`M262 168 l8 -4 l8 4 l-8 3 z`} fill={known ? '#e8c96a' : '#9a8050'} />
      {known && <circle cx="270" cy="167" r="10" fill="none" stroke="#ffe08a" stroke-width="2" />}
      <rect width="400" height="300" fill="#000" filter="url(#sepia-grain)" opacity="0.6" />
      <rect x="6" y="6" width="388" height="288" fill="none" stroke="#efe6d2" stroke-width="10" />
    </g>,
    'Sepia photograph of two wireless operators',
  );
}

function PipSupper() {
  return svgDoc(
    '0 0 400 260',
    <g font-family="Gochi Hand, cursive">
      <rect width="400" height="260" fill="#fbf8ef" />
      <ellipse cx="200" cy="170" rx="160" ry="50" fill="none" stroke="#d08a3a" stroke-width="4" />
      {[
        [80, 110, '#3a3aa0', 'Daddy'],
        [150, 90, '#a03a8a', 'magic lady'],
        [230, 92, '#3a8a3a', 'Mrs Lund'],
        [310, 110, '#3a3a3a', 'profesor'],
      ].map(([x, y, c, t], i) => (
        <g key={i}>
          <circle cx={Number(x)} cy={Number(y)} r="18" fill="none" stroke={String(c)} stroke-width="4" />
          <path d={`M${Number(x)} ${Number(y) + 18} v40 M${Number(x) - 18} ${Number(y) + 34} h36`} stroke={String(c)} stroke-width="4" />
          <text x={Number(x)} y={Number(y) - 26} text-anchor="middle" font-size="15" fill={String(c)}>
            {String(t)}
          </text>
        </g>
      ))}
      <path d="M322 150 l14 -8 l4 10 z" fill="#3a3a3a" />
      <text x="336" y="140" font-size="12" fill="#3a3a3a">
        book!
      </text>
      <path d="M140 92 q-10 -20 10 -24 M250 70 q20 -10 10 -20" stroke="#a03a8a" stroke-width="3" fill="none" />
    </g>,
    "A child's crayon drawing of a dinner table",
  );
}

function RatRunMap() {
  return svgDoc(
    '0 0 400 260',
    <g font-family="Inter, sans-serif">
      <rect width="400" height="260" fill="#120a1e" />
      <ellipse cx="200" cy="130" rx="170" ry="100" fill="#3a1f5a" opacity="0.35" />
      <path d="M60 200 L130 200 L130 120 L130 50 L230 50 L330 50 L370 120 M130 200 L230 200 L230 50" stroke="#c9b3ff" stroke-width="5" fill="none" stroke-dasharray="2 0" />
      {[
        [60, 200, 'lounge hatch'],
        [130, 200, 'pantry'],
        [130, 120, 'galley shaft'],
        [230, 200, 'mail room'],
        [130, 50, 'keel 80'],
        [230, 50, 'keel 125'],
        [330, 50, 'keel 170'],
        [370, 120, 'control car'],
      ].map(([x, y, t], i) => (
        <g key={i}>
          <circle cx={Number(x)} cy={Number(y)} r="8" fill="#e0d0ff" />
          <text x={Number(x)} y={Number(y) + 22} text-anchor="middle" fill="#e0d0ff" font-size="11" font-family="La Belle Aurore, cursive">
            {String(t)}
          </text>
        </g>
      ))}
      <text x="200" y="245" text-anchor="middle" fill="#b39ae0" font-size="16" font-family="La Belle Aurore, cursive">
        Le Chemin des Rats — O.V.
      </text>
    </g>,
    'Projected map of the service ways',
  );
}

function StandingWaveDiagram() {
  const pts = Array.from({ length: 121 }, (_, i) => {
    const x = i / 120;
    const y = Math.sin(Math.PI * 7 * x + (7 * Math.PI) / 12) * 40;
    return `${i ? 'L' : 'M'}${20 + x * 360} ${90 - y}`;
  }).join('');
  return svgDoc(
    '0 0 400 180',
    <g>
      <rect width="400" height="180" fill="#f3ecd9" />
      <path d={pts} stroke="#2a3a6a" stroke-width="2.5" fill="none" />
      <path d={pts} stroke="#2a3a6a" stroke-width="1.5" fill="none" transform="scale(1 -1) translate(0 -180)" opacity="0.5" />
      {Array.from({ length: 7 }, (_, i) => (12 * (i + 1) - 7) / 84).map((p, i) => (
        <rect key={i} x={20 + p * 360 - 3} y="84" width="6" height="12" fill="#a07c3c" />
      ))}
      <text x="200" y="168" text-anchor="middle" fill="#2a3a6a" font-size="13" font-family="La Belle Aurore, cursive">
        nodes on the pins — seven of them
      </text>
    </g>,
    'Diagram of a standing wave with nodes on brass pins',
  );
}

function Survivors() {
  return svgDoc(
    '0 0 400 240',
    <g>
      <rect width="400" height="240" fill="#a89070" />
      <rect y="170" width="400" height="70" fill="#e8e0d0" />
      {[70, 200, 330].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="70" r="20" fill="#4a3a28" />
          <path d={`M${x - 34} 170 q34 -100 68 0 z`} fill="#3a2a1c" />
        </g>
      ))}
      {[100, 200, 300].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={110 + (i === 1 ? 14 : 0)} r={i === 1 ? 14 : 18} fill="#5a4630" />
          <path d={`M${x - 28} 200 q28 -80 56 0 z`} fill="#2a1d14" />
        </g>
      ))}
      <path d="M322 78 l8 -4 l8 4 l-8 3 z" fill="#d8b860" />
      <rect x="6" y="6" width="388" height="228" fill="none" stroke="#efe6d2" stroke-width="10" />
    </g>,
    'Group photograph of six survivors in the snow',
  );
}

function CourseCard({ state }: P) {
  return svgDoc(
    '0 0 400 220',
    <g>
      <rect width="400" height="220" fill="#0e1424" />
      <rect x="60" y="30" width="280" height="160" rx="6" fill="#f1e8d4" stroke="#8a6a32" stroke-width="3" />
      <text x="200" y="140" text-anchor="middle" font-size="100" fill="#2a2116" font-family="Caveat, cursive" font-weight="600">
        081
      </text>
      <text x="200" y="210" text-anchor="middle" font-size="12" fill="#9ba8bd">
        {state.flags.card_turned ? 'as Wren wrote it' : ''}
      </text>
    </g>,
    'A course card reading 081',
  );
}

const sample = (id: string): FunctionComponent<P> =>
  function Sample() {
    return (
      <div style={{ background: '#efe6d0', borderRadius: 4, padding: '6px 10px', margin: '4px 0 10px' }}>
        <HandSample id={id} />
      </div>
    );
  };

export const DOC_ART: Record<string, FunctionComponent<P>> = {
  deckplan: () => svgDoc('0 0 600 600', <DeckPlanDrawing />, 'Deck plan of the Albatross'),
  map: () => svgDoc('0 0 600 560', <MapDrawing showLabels />, 'Topographic map of the Ravnfjell'),
  pianolid: () => svgDoc('0 0 600 400', <PianoLidPainting />, 'Painting of an albatross over a ship'),
  crewphoto: CrewPhoto,
  pipsupper: PipSupper,
  ratrun: RatRunMap,
  standingwave: StandingWaveDiagram,
  survivors: Survivors,
  coursecard: CourseCard,
  birdplate: () => <BirdPlateStaff />,
  'sample-tag': sample('tag'),
  'sample-pell': sample('pell'),
  'sample-vasseur': sample('vasseur'),
  'sample-solberg': sample('solberg'),
  'sample-fenwick': sample('fenwick'),
  'sample-finch': sample('finch'),
};
