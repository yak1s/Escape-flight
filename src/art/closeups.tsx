// Closeup illustrations (600×400) and item icons (64×64).
import type { FunctionComponent } from 'preact';
import type { GameState } from '../engine/types';
import { CORRIDOR_DOORS } from '../puzzles/logic';

type P = { state: GameState };

const Frost = ({ id }: { id: string }) => (
  <defs>
    <pattern id={id} width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M4 30l9-6l8 8l10-12l9 7l10-4M0 52l12-6l9 4l11-8l10 3l12-5" stroke="#eaf8fc" stroke-width="1.4" fill="none" opacity="0.5" />
    </pattern>
    <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2d99a" />
      <stop offset="0.5" stop-color="#c9a45c" />
      <stop offset="1" stop-color="#7a5a26" />
    </linearGradient>
  </defs>
);

function DeckChair() {
  return (
    <g>
      <Frost id="cu-dc" />
      <rect width="600" height="400" fill="#0c1726" />
      <path d="M150 360 L220 120 L420 110 L360 360 Z" fill="#5a3a22" stroke="#2a1a0e" stroke-width="6" />
      <path d="M180 260 L400 250 L380 320 L160 330 Z" fill="#7a2f2a" />
      <path d="M180 260 L400 250 M176 280 L396 270 M170 300 L390 290" stroke="#c9a45c" stroke-width="4" opacity="0.6" />
      <rect x="250" y="180" width="110" height="70" rx="4" fill="#1d3550" stroke="#c9a45c" stroke-width="3" transform="rotate(-8 305 215)" />
      <text x="305" y="222" text-anchor="middle" fill="#ecd398" font-size="13" transform="rotate(-8 305 215)">
        Døden på…
      </text>
      <rect width="600" height="400" fill="url(#cu-dc)" />
    </g>
  );
}

function DoorStrip() {
  return (
    <g>
      <rect width="600" height="400" fill="#0c1424" />
      <text x="300" y="24" text-anchor="middle" fill="#9ba8bd" font-size="14">
        FORWARD ← → AFT
      </text>
      {CORRIDOR_DOORS.map((d, i) => {
        const x = 18 + (d.pos - 1) * 96;
        const y = d.side === 'port' ? 40 : 222;
        const loose = 'loose' in d && d.loose;
        return (
          <g key={i}>
            <rect x={x} y={y} width="84" height="140" rx="6" fill="#3b2a1c" stroke="#1c140c" stroke-width="2" />
            <g transform={`rotate(${loose ? (d.plate === '6' ? -8 : 8) : 0} ${x + 42} ${y + 36})`}>
              <rect x={x + 24} y={y + 20} width="36" height="30" rx="4" fill="#c9a45c" />
              <text x={x + 42} y={y + 43} text-anchor="middle" font-size="20" font-weight="700" fill="#2a1d08">
                {d.plate}
              </text>
            </g>
            {d.real === 9 && <rect x={x + 54} y={y + 70} width="18" height="26" rx="3" fill="#8a929e" stroke="#2a2a2a" />}
          </g>
        );
      })}
      <text x="8" y="120" fill="#ecd398" font-size="12" transform="rotate(-90 8 120)" text-anchor="middle">
        PORT
      </text>
      <text x="8" y="300" fill="#ecd398" font-size="12" transform="rotate(-90 8 300)" text-anchor="middle">
        STARBOARD
      </text>
    </g>
  );
}

function Galley({ state }: P) {
  const clear = Boolean(state.flags.shaft_clear);
  return (
    <g>
      <Frost id="cu-ga" />
      <rect width="600" height="400" fill="#121820" />
      <rect x="220" y="20" width="160" height="380" fill="#05070b" stroke="#8a929e" stroke-width="5" />
      <path d="M240 30 v360 M360 30 v360" stroke="#5a6475" stroke-width="4" />
      {!clear && (
        <g>
          <rect x="232" y="150" width="136" height="110" fill="#5a4630" stroke="#2a1d10" stroke-width="4" />
          <rect x="228" y="120" width="144" height="170" fill="#bfe6ef" opacity="0.6" />
          <rect x="228" y="120" width="144" height="170" fill="url(#cu-ga)" />
        </g>
      )}
      {clear && <text x="300" y="80" text-anchor="middle" fill="#7de3b8" font-size="18">KEEL ↑</text>}
      {[60, 470].map((x) => (
        <g key={x}>
          <circle cx={x + 40} cy="300" r="34" fill="#b0703a" stroke="#5a3a1a" stroke-width="4" />
          <rect x={x + 70} y="294" width="40" height="12" fill="#5a3a1a" />
        </g>
      ))}
    </g>
  );
}

function RadioSet({ state }: P) {
  const on = Boolean(state.solved.P04);
  return (
    <g>
      <rect width="600" height="400" fill="#141820" />
      <rect x="100" y="30" width="400" height="340" rx="10" fill="#2d3239" stroke="#8a929e" stroke-width="5" />
      <text x="300" y="66" text-anchor="middle" fill="#c9a45c" font-size="18" font-family="Special Elite, monospace">
        MARCONI AD.37
      </text>
      <rect x="130" y="90" width="340" height="80" rx="6" fill="#1d150c" stroke="#8a6a32" stroke-width="3" />
      <line x1={on ? 315 : 160} y1="96" x2={on ? 315 : 160} y2="164" stroke="#ff7a5a" stroke-width="3" />
      {Array.from({ length: 13 }, (_, i) => (
        <line key={i} x1={145 + i * 26} y1="150" x2={145 + i * 26} y2="164" stroke="#c9a45c" />
      ))}
      <circle cx="200" cy="250" r="40" fill="#15181d" stroke="#c9a45c" stroke-width="5" />
      <circle cx="400" cy="250" r="40" fill="#15181d" stroke="#c9a45c" stroke-width="5" />
      <circle cx="300" cy="250" r="20" fill={on ? '#7de3b8' : '#0f2a20'} />
      {Array.from({ length: 4 }, (_, i) => (
        <circle key={i} cx={170 + i * 87} cy="330" r="16" fill={state.solved.P03 ? '#ff9a3c' : '#0d0f12'} opacity={state.solved.P03 ? 0.6 : 1} stroke="#5a6475" />
      ))}
    </g>
  );
}

function Clock({ state }: P) {
  const open = state.flags.wren_hid_clock && state.items.includes('sixpence');
  const ready = state.flags.wren_hid_clock && !state.items.includes('sixpence');
  return (
    <g>
      <Frost id="cu-cl" />
      <rect width="600" height="400" fill="#1d232c" />
      <g transform="translate(300 200)">
        <circle r="170" fill="url(#cu-cl-b)" />
        <circle r="146" fill={open ? '#2a2116' : '#efe6d2'} />
        {!open &&
          Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return <line key={i} x1={Math.sin(a) * 118} y1={-Math.cos(a) * 118} x2={Math.sin(a) * 138} y2={-Math.cos(a) * 138} stroke="#2a2116" stroke-width="6" />;
          })}
        {!open && (
          <g>
            <line x1="0" y1="0" x2={Math.sin((3.2 * Math.PI) / 6) * 76} y2={-Math.cos((3.2 * Math.PI) / 6) * 76} stroke="#2a2116" stroke-width="12" stroke-linecap="round" />
            <line x1="0" y1="0" x2={Math.sin((12 * Math.PI) / 30) * 112} y2={-Math.cos((12 * Math.PI) / 30) * 112} stroke="#2a2116" stroke-width="6" stroke-linecap="round" />
            <circle r="10" fill="#2a2116" />
            <circle r="146" fill="url(#cu-cl)" />
          </g>
        )}
        {open && (
          <g>
            {[-60, 20, 70].map((x, i) => (
              <circle key={i} cx={x} cy={i * 30 - 30} r={40 - i * 8} fill="none" stroke="#c9a45c" stroke-width="6" stroke-dasharray="6 5" />
            ))}
          </g>
        )}
        {ready && <circle r="170" fill="none" stroke="#ffd38a" stroke-width="5" opacity="0.7" class="glow-anim" />}
      </g>
    </g>
  );
}

function Trunk({ state }: P) {
  const open = Boolean(state.flags.trunk_open);
  return (
    <g>
      <rect width="600" height="400" fill="#120c1c" />
      <path d="M80 200 L520 180 L540 380 L90 390 Z" fill="#1f1640" stroke="#0c0820" stroke-width="6" />
      {open ? (
        <path d="M80 200 L520 180 L500 40 L110 60 Z" fill="#2a2050" stroke="#0c0820" stroke-width="6" />
      ) : (
        <path d="M80 200 L520 180 L525 150 L84 170 Z" fill="#2a2050" stroke="#0c0820" stroke-width="6" />
      )}
      {open && (
        <g>
          <rect x="140" y="80" width="300" height="80" fill="#0e0816" stroke="#c9a45c" stroke-width="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={150 + i * 24} y={95 + (i % 2) * 6} width="20" height="50" rx="2" fill={[1, 4, 7, 10].includes(i) ? '#3a2050' : '#fbf6ea'} stroke="#8a6a32" />
          ))}
          <rect x="200" y="240" width="200" height="100" rx="8" fill="#4a2c1d" stroke="#c9a45c" stroke-width="3" />
          <circle cx="380" cy="290" r="24" fill="#9fe3ff" opacity="0.7" stroke="#ecd398" stroke-width="3" />
          <text x="290" y="296" text-anchor="middle" fill="#ecd398" font-size="16">
            LE SPECTRE
          </text>
        </g>
      )}
      {!open &&
        [0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={210 + i * 50} y={208 - i * 2} width="40" height="56" rx="4" fill="#efe6d2" stroke="#c9a45c" stroke-width="3" />
            <text x={230 + i * 50} y={244 - i * 2} text-anchor="middle" fill="#8a2a2a" font-size="20">
              ?
            </text>
          </g>
        ))}
      <rect x="430" y="270" width="80" height="90" rx="6" fill="#2b2016" stroke="#c9a45c" />
      <text x="470" y="320" text-anchor="middle" fill="#ecd398" font-size="12">
        pocket
      </text>
    </g>
  );
}

function Bird({ state }: P) {
  const sings = Boolean(state.solved.P16);
  return (
    <g>
      <Frost id="cu-bi" />
      <rect width="600" height="400" fill="#1a1010" />
      <rect x="180" y="330" width="240" height="50" fill="#3a2316" stroke="#c9a45c" stroke-width="3" />
      <rect x="250" y="345" width="100" height="22" fill="url(#cu-bi-b)" />
      <path d="M190 330 L190 150 Q300 20 410 150 L410 330" fill="none" stroke="url(#cu-bi-b)" stroke-width="6" />
      {[220, 250, 280, 320, 350, 380].map((x) => (
        <line key={x} x1={x} y1="330" x2={x} y2={150 - (60 - Math.abs(x - 300)) * 0.9} stroke="#c9a45c" stroke-width="3" opacity="0.8" />
      ))}
      <ellipse cx="300" cy="250" rx="54" ry="32" fill="url(#cu-bi-b)" />
      <circle cx="342" cy="226" r="22" fill="url(#cu-bi-b)" />
      <circle cx="348" cy="222" r="4" fill="#101010" />
      <path d={sings ? 'M362 222 l34 -14 l-30 18 l30 8 z' : 'M362 224 l30 0 l-30 8 z'} fill="#b08a3e" />
      <path d="M250 260 l-50 30 l40 -6 z" fill="url(#cu-bi-b)" />
      {!sings && <rect x="180" y="40" width="240" height="340" fill="url(#cu-bi)" />}
    </g>
  );
}

function Card({ state }: P) {
  const turned = Boolean(state.flags.card_turned);
  return (
    <g>
      <rect width="600" height="400" fill="#0b0f16" />
      <g style={{ transformOrigin: '300px 200px', transform: turned ? 'rotate(180deg)' : 'none', transition: 'transform 1s ease-in-out' }}>
        <rect x="120" y="70" width="360" height="260" rx="8" fill="#f1e8d4" stroke="#8a6a32" stroke-width="4" />
        <text x="300" y="250" text-anchor="middle" font-size="150" fill="#2a2116" font-family="Caveat, cursive" font-weight="600" transform="rotate(180 300 200)">
          081
        </text>
      </g>
      <text x="300" y="380" text-anchor="middle" fill="#9ba8bd" font-size="16">
        {turned ? "Turned the other way up — as Wren wrote it" : 'As found in the clip, facing the helmsman'}
      </text>
    </g>
  );
}

export const CLOSEUP_ART: Record<string, FunctionComponent<P>> = {
  deckchair: DeckChair,
  doorstrip: DoorStrip,
  galley: Galley,
  radioset: RadioSet,
  clock: Clock,
  trunk: Trunk,
  bird: Bird,
  card: Card,
};

// ------------------------------------------------------------------ item icons (64×64)
export function ItemIcon({ id }: { id: string }) {
  const brass = '#c9a45c';
  switch (id) {
    case 'torch':
      return (
        <g>
          <rect x="8" y="26" width="34" height="14" rx="4" fill="#3a3f48" stroke="#8a929e" stroke-width="2" />
          <path d="M42 22 L54 16 L54 50 L42 44 Z" fill="#5a6475" stroke="#8a929e" stroke-width="2" />
          <path d="M56 20 L64 12 M56 33 L64 33 M56 46 L64 54" stroke="#ffe2a6" stroke-width="3" />
        </g>
      );
    case 'brooch':
      return (
        <g>
          <path d="M30 30 C 20 18, 6 18, 2 24 C 8 26, 12 30, 14 34 C 18 34, 24 36, 30 38 Z" fill={brass} stroke="#5a4218" />
          <path d="M34 30 C 44 18, 58 18, 62 24 C 56 26, 52 30, 50 34 C 46 34, 40 36, 34 38 Z" fill={brass} stroke="#5a4218" />
          <ellipse cx="32" cy="36" rx="8" ry="12" fill={brass} stroke="#5a4218" />
          <circle cx="30" cy="22" r="6" fill={brass} stroke="#5a4218" />
          <path d="M32 46 L27 58 Q32 56 37 58 Z" fill={brass} stroke="#5a4218" />
        </g>
      );
    case 'box':
      return (
        <g>
          <rect x="6" y="18" width="52" height="36" rx="4" fill="#2b5a6a" stroke="#9fc9d6" stroke-width="2" />
          <rect x="4" y="12" width="56" height="10" rx="3" fill="#367080" stroke="#9fc9d6" stroke-width="2" />
          {[16, 32, 48].map((x) => (
            <circle key={x} cx={x} cy="36" r="5" fill="#d86a7a" />
          ))}
        </g>
      );
    case 'walkie':
      return (
        <g>
          <rect x="20" y="16" width="24" height="44" rx="5" fill="#222" stroke="#666" stroke-width="2" />
          <line x1="26" y1="16" x2="26" y2="2" stroke="#444" stroke-width="4" />
          <circle cx="32" cy="30" r="6" fill="#444" />
          <circle cx="38" cy="22" r="2.5" fill="#ff4a3a" />
        </g>
      );
    case 'key':
      return (
        <g>
          <circle cx="18" cy="32" r="11" fill="none" stroke={brass} stroke-width="5" />
          <path d="M29 32 H58 M50 32 v8 M56 32 v6" stroke={brass} stroke-width="5" />
        </g>
      );
    case 'coin':
      return (
        <g>
          <circle cx="32" cy="32" r="22" fill="#3b3a36" stroke="#8a8a80" stroke-width="3" />
          <text x="32" y="38" text-anchor="middle" fill="#9a9a90" font-size="16" font-weight="700">
            6d
          </text>
        </g>
      );
    case 'disc':
      return (
        <g>
          <circle cx="32" cy="32" r="26" fill="#d8b977" stroke="#6b4f22" stroke-width="3" />
          <circle cx="32" cy="32" r="18" fill="#a98045" />
          <circle cx="32" cy="32" r="8" fill="#6f5222" />
          <text x="32" y="12" text-anchor="middle" fill="#2a1d08" font-size="7">
            ABC
          </text>
        </g>
      );
    case 'slide':
      return (
        <g>
          <rect x="10" y="14" width="44" height="36" rx="2" fill="#efe6d2" stroke="#8a6a32" stroke-width="2" />
          <rect x="17" y="20" width="30" height="24" fill="#5a3a6a" opacity="0.6" />
          <path d="M20 40 L28 28 L34 36 L40 24 L44 40" stroke="#e0d0ff" stroke-width="2" fill="none" />
        </g>
      );
    case 'tinykey':
      return (
        <g>
          <path d="M18 20 C 12 14, 4 16, 4 22 C 8 22, 10 26, 18 28 Z" fill={brass} />
          <circle cx="20" cy="24" r="6" fill={brass} />
          <path d="M26 24 H56 M50 24 v6" stroke={brass} stroke-width="4" />
        </g>
      );
    case 'star':
      return (
        <g>
          <circle cx="32" cy="32" r="26" fill="#d8c79e" stroke="#6b4f22" stroke-width="3" />
          <circle cx="32" cy="32" r="18" fill="#0b1633" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={32 + Math.cos(i * 1.3) * 10} cy={32 + Math.sin(i * 1.9) * 9} r="1.8" fill="#fff" />
          ))}
          <line x1="32" y1="32" x2="52" y2="12" stroke="#ff7a5a" stroke-width="2" />
        </g>
      );
    default:
      return <circle cx="32" cy="32" r="20" fill="#5a6475" />;
  }
}
