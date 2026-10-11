// Scene art, part C: the keel and the control car.
import type { GameState } from '../engine/types';
import { Aurora, Backdrop, Defs, FrostOverlay, Icicles, Rivets, TorchVignette } from './common';

type P = { state: GameState };

export function Keel({ state }: P) {
  const id = 'ke';
  const ballastDone = Boolean(state.solved.P19);
  const crossed = Boolean(state.solved.P18);
  const hatchOpen = Boolean(state.flags.hatch_open);
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#060a14" bottom="#090d16" />
      {/* great rings of the frame */}
      {[0, 1, 2, 3].map((i) => {
        const s = 1 - i * 0.22;
        return <ellipse key={i} cx="510" cy="600" rx={620 * s} ry={760 * s} fill="none" stroke="#2a3346" stroke-width={30 * s} />;
      })}
      {/* frozen gas cells like sails */}
      <path d="M-200 -100 C 100 200, 300 120, 420 420 C 300 380, 100 400, -200 300 Z" fill="#c9d6dc" opacity="0.25" />
      <path d="M1200 -100 C 900 200, 720 120, 600 420 C 720 380, 900 400, 1200 300 Z" fill="#c9d6dc" opacity="0.25" />
      <path d="M200 -200 C 400 100, 600 100, 800 -200" fill="#dce8ec" opacity="0.18" />
      {/* a crack of aurora light from above */}
      <clipPath id={`${id}-crack`}>
        <path d="M470 -200 L560 -200 L530 300 L500 300 Z" />
      </clipPath>
      <g clip-path={`url(#${id}-crack)`}>
        <rect x="400" y="-200" width="200" height="520" fill="#0d1d22" />
        <Aurora id={id} x={380} y={-150} w={240} h={420} />
      </g>
      {/* keel corridor perspective */}
      <polygon points="320,1700 680,1700 540,520 480,520" fill="#141a26" />
      <line x1="320" y1="1700" x2="480" y2="520" stroke="#3a4560" stroke-width="10" />
      <line x1="680" y1="1700" x2="540" y2="520" stroke="#3a4560" stroke-width="10" />
      {/* lattice (collapsed catwalk) */}
      <g opacity={crossed ? 0.6 : 1}>
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`v${i}`} x1={150 + i * 115} y1="930" x2={180 + i * 105} y2="1280" stroke="#5a6a7e" stroke-width="12" />
        ))}
        {[960, 1100, 1250].map((y, i) => (
          <line key={`h${i}`} x1="140" y1={y} x2="860" y2={y + 10} stroke="#6b7c92" stroke-width="10" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`d${i}`} x1={150 + i * 115} y1="960" x2={265 + i * 105} y2="1110" stroke="#4a5868" stroke-width="7" />
        ))}
        <path d="M380 1100 l40 20 M610 960 l30 -10" stroke="#ec8a78" stroke-width="5" opacity="0.6" />
      </g>
      {!crossed && <path d="M140 1290 L860 1290 L860 1320 L140 1320 Z" fill="#05070b" />}
      {/* valve cord frame (left) */}
      <g opacity={ballastDone ? 1 : 0.55}>
        <rect x="60" y="490" width="220" height="370" fill="#1a1f29" stroke="#8a929e" stroke-width="4" />
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1={80 + i * 30} y1="500" x2={80 + i * 30} y2="820" stroke="#b9a27a" stroke-width="3" />
        ))}
        {[560, 620, 700, 760].map((y, i) => (
          <line key={i} x1={80 + (i % 3) * 30} y1={y} x2={110 + (i % 3) * 30} y2={y} stroke="#d8c08a" stroke-width="3" />
        ))}
        <rect x="90" y="590" width="120" height="30" rx="14" fill="#dcecf2" opacity="0.9" />
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={i} cx={80 + i * 30} cy={840 + (i === 4 && state.solved.P20 ? 16 : 0)} r="10" fill="#c9a45c" />
        ))}
      </g>
      {/* ballast station (right) */}
      <g opacity={crossed ? 1 : 0.55}>
        <rect x="720" y="520" width="240" height="300" fill="#22201a" stroke="#c9a45c" stroke-width="4" />
        <text x="840" y="550" text-anchor="middle" fill="#ecd398" font-size="15">
          BALLAST · FR. 125
        </text>
        {Array.from({ length: 10 }, (_, i) => {
          const empty = ballastDone && [4, 5, 9].includes(i);
          return (
            <g key={i}>
              <rect x={740 + (i % 5) * 42} y={575 + Math.floor(i / 5) * 110} width="34" height="90" rx="8" fill={empty ? '#2a2a2a' : '#6f8a9a'} stroke="#cfe8ee" stroke-width="2" />
              {!empty && <rect x={744 + (i % 5) * 42} y={600 + Math.floor(i / 5) * 110} width="26" height="60" rx="4" fill="#cfe8ee" opacity="0.35" />}
            </g>
          );
        })}
      </g>
      {/* forward hatch */}
      <g>
        <ellipse cx="510" cy="600" rx="70" ry="44" fill={hatchOpen ? '#020305' : '#3b4048'} stroke={`url(#${id}-brass)`} stroke-width="8" />
        {!hatchOpen && (
          <g>
            <circle cx="510" cy="600" r="24" fill="none" stroke="#c9a45c" stroke-width="5" />
            <path d="M486 600 h48 M510 576 v48" stroke="#c9a45c" stroke-width="4" />
          </g>
        )}
        <text x="510" y="676" text-anchor="middle" fill="#cfe8ee" font-size="14">
          CONTROL CAR ↓
        </text>
      </g>
      {/* photo pinned to a girder */}
      <rect x="340" y="560" width="80" height="100" fill="#d8ccb0" transform="rotate(-6 380 610)" />
      <rect x="350" y="570" width="60" height="60" fill="#8a7458" transform="rotate(-6 380 610)" />
      {/* knife in the lattice */}
      {crossed && (
        <g transform="rotate(30 890 1190)">
          <rect x="860" y="1180" width="70" height="14" rx="6" fill="#8a6a42" />
          <path d="M930 1182 l40 6 l-40 6 z" fill="#cfd4da" />
        </g>
      )}
      {/* dumbwaiter shaft down */}
      <rect x="430" y="1320" width="160" height="160" fill="#05070b" stroke="#5a6475" stroke-width="4" />
      <path d="M450 1330 v140 M570 1330 v140" stroke="#5a6475" stroke-width="3" />
      <text x="510" y="1310" text-anchor="middle" fill="#cfe8ee" font-size="14">
        ↓ SHAFT
      </text>
      <Rivets x1={60} y1={880} x2={960} y2={880} n={24} />
      <Icicles x={60} y={470} w={900} n={26} seed={12} />
      <FrostOverlay id={id} opacity={0.16} />
      <TorchVignette id={id} />
    </g>
  );
}

export function Control({ state }: P) {
  const id = 'cc';
  const turned = Boolean(state.flags.card_turned);
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#05080f" bottom="#0c0f14" />
      {/* windows packed with snow/ice, cracked */}
      <rect x="-400" y="-200" width="1800" height="900" fill="#1a1f29" />
      {[0, 1, 2, 3, 4].map((i) => (
        <polygon key={i} points={`${-60 + i * 230},360 ${150 + i * 230},360 ${130 + i * 230},560 ${-40 + i * 230},560`} fill="#dbeaf0" stroke={`url(#${id}-brass)`} stroke-width="8" />
      ))}
      <path d="M100 380 l60 80 l-20 70 M560 370 l-40 90 l60 60 M820 380 l30 60" stroke="#8fb3c2" stroke-width="4" fill="none" />
      {/* crumpled ceiling with the hatch */}
      <path d="M-400 -200 L1400 -200 L1400 200 Q 900 320 500 250 Q 100 320 -400 200 Z" fill="#11151d" />
      <ellipse cx="510" cy="220" rx="90" ry="50" fill="#020305" stroke={`url(#${id}-brass)`} stroke-width="8" />
      <path d="M470 220 v-160 M550 220 v-160" stroke="#8a929e" stroke-width="6" />
      {[80, 120, 160].map((y) => (
        <line key={y} x1="470" y1={y} x2="550" y2={y} stroke="#8a929e" stroke-width="5" />
      ))}
      {/* instruments: clock and altimeter */}
      {[
        [360, 620, 'clock'],
        [700, 620, 'alt'],
      ].map(([x, y, k]) => (
        <g key={String(k)} transform={`translate(${x} ${y})`}>
          <circle r="72" fill={`url(#${id}-brass)`} />
          <circle r="60" fill="#efe6d2" />
          {k === 'clock' ? (
            <g>
              <line x1="0" y1="0" x2="28" y2="10" stroke="#2a2116" stroke-width="6" />
              <line x1="0" y1="0" x2="40" y2="-30" stroke="#2a2116" stroke-width="3" />
              <path d="M-40 -30 l30 20 l-10 25 M10 30 l25 15" stroke="#7a8a96" stroke-width="2" fill="none" />
            </g>
          ) : (
            <g>
              <text x="0" y="30" text-anchor="middle" font-size="12" fill="#2a2116">
                METRES
              </text>
              <line x1="0" y1="0" x2="-38" y2="-30" stroke="#2a2116" stroke-width="4" />
            </g>
          )}
          <circle r="60" fill={`url(#${id}-frost)`} opacity="0.4" />
        </g>
      ))}
      {/* floor */}
      <polygon points="-400,900 1400,900 1400,1700 -400,1700" fill="#16191f" />
      <polygon points="-400,900 1400,900 1400,1700 -400,1700" fill={`url(#${id}-frost)`} opacity="0.55" />
      {/* chart table */}
      <polygon points="40,960 380,940 390,1160 30,1180" fill="#4a2c1d" stroke="#1a0f08" stroke-width="5" />
      <polygon points="60,970 360,952 368,1100 52,1120" fill="#d8ccb0" opacity="0.8" />
      <path d="M90 1060 L300 1000 M180 1040 L250 1090" stroke="#3a6a8a" stroke-width="3" />
      {/* chart alcove */}
      <rect x="40" y="600" width="200" height="230" fill="#0a0d12" stroke="#5a6475" stroke-width="4" />
      <rect x="80" y="700" width="110" height="80" fill="#efe6d2" transform="rotate(-10 135 740)" opacity="0.85" />
      {/* helm with card clip */}
      <g transform="translate(520 900)">
        <rect x="-14" y="0" width="28" height="200" fill="#3a3f48" />
        <circle r="110" fill="none" stroke="#5a3a22" stroke-width="18" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1="0" y1="0" x2={Math.cos(a) * 130} y2={Math.sin(a) * 130} stroke="#5a3a22" stroke-width="12" strokeLinecap="round" />;
        })}
        <circle r="26" fill={`url(#${id}-brass)`} />
        <g transform="translate(0 -150)">
          <rect x="-56" y="-34" width="112" height="68" rx="4" fill="#f1e8d4" stroke="#8a6a32" stroke-width="3" />
          <text x="0" y="16" text-anchor="middle" font-size="44" fill="#2a2116" font-family="Caveat, cursive" font-weight="600" transform={turned ? 'rotate(180 0 0)' : undefined}>
            {turned ? '180' : '180'}
          </text>
          <rect x="-12" y="-44" width="24" height="16" fill="#c9a45c" />
        </g>
      </g>
      {/* engine telegraphs */}
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${770 + i * 120} 980)`}>
          <rect x="-10" y="40" width="20" height="160" fill="#3a3f48" />
          <circle r="54" fill={`url(#${id}-brass)`} />
          <circle r="44" fill="#efe6d2" />
          <path d="M-36 0 A36 36 0 0 1 36 0" stroke="#b0222a" stroke-width="5" fill="none" />
          <line x1="0" y1="0" x2={i ? 30 : -30} y2="-24" stroke="#2a2116" stroke-width="5" />
          <text x="0" y="28" text-anchor="middle" font-size="10" fill="#2a2116">
            {i ? 'PORT AFT' : 'STBD AFT'}
          </text>
        </g>
      ))}
      <Icicles x={-40} y={560} w={1080} n={26} seed={14} />
      <FrostOverlay id={id} opacity={0.16} />
      <TorchVignette id={id} />
    </g>
  );
}
