// Scene art, part B: lounge, dining salon, smoking room, captain's cabin, cabin 9.
import type { GameState } from '../engine/types';
import { Aurora, Backdrop, Defs, FrostOverlay, Icicles, TorchVignette } from './common';

type P = { state: GameState };

// ------------------------------------------------------------------ LOUNGE
export function Lounge({ state }: P) {
  const id = 'lo';
  const pianoClear = Boolean(state.solved.P05);
  const trunkOpen = Boolean(state.flags.trunk_open);
  const sings = Boolean(state.solved.P16);
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#08111f" bottom="#1a0f0a" />
      {/* great windows */}
      <rect x="-400" y="-200" width="1800" height="900" fill="#0b1626" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <path d={`M${160 + i * 175} 660 L${160 + i * 175} 340 Q${232 + i * 175} 270 ${305 + i * 175} 340 L${305 + i * 175} 660 Z`} fill={`url(#${id}-ice)`} stroke={`url(#${id}-brass)`} stroke-width="8" />
        </g>
      ))}
      <clipPath id={`${id}-wins`}>
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${160 + i * 175} 660 L${160 + i * 175} 340 Q${232 + i * 175} 270 ${305 + i * 175} 340 L${305 + i * 175} 660 Z`} />
        ))}
      </clipPath>
      <g clip-path={`url(#${id}-wins)`}>
        <Aurora id={id} x={120} y={280} w={760} h={360} />
        <rect x="100" y="260" width="800" height="420" fill={`url(#${id}-frost)`} opacity="0.75" />
        <path d="M200 420 l60 50 l-40 90 M560 380 l-30 80 l50 60" stroke="#fff" stroke-width="3" fill="none" opacity="0.8" />
      </g>
      <rect x="-400" y="660" width="1800" height="40" fill="#2a1810" />
      {/* floor with carpet */}
      <polygon points="-400,700 1400,700 1400,1700 -400,1700" fill="#3a2015" />
      <ellipse cx="500" cy="1150" rx="520" ry="260" fill="#5a2427" />
      <ellipse cx="500" cy="1150" rx="470" ry="225" fill="none" stroke="#c9a45c" stroke-width="5" opacity="0.6" />
      <polygon points="-400,700 1400,700 1400,1700 -400,1700" fill={`url(#${id}-frost)`} opacity="0.4" />
      {/* doorway to dining salon */}
      <path d="M840 900 L840 600 Q 910 530 980 560 L980 900 Z" fill="#06090f" stroke={`url(#${id}-brass)`} stroke-width="8" />
      <text x="910" y="620" text-anchor="middle" fill="#ecd398" font-size="18" font-weight="600">
        DINING
      </text>
      {/* piano */}
      <g>
        <path d="M80 900 L420 880 L450 1000 L110 1040 Z" fill="#9aa4ae" stroke="#4b5560" stroke-width="5" />
        <path d="M110 1040 L450 1000 L452 1060 L112 1100 Z" fill="#6f7882" />
        <path d="M130 1050 L430 1015" stroke="#efe6d2" stroke-width="14" />
        <path d="M130 1050 L430 1015" stroke="#222" stroke-width="14" stroke-dasharray="6 9" />
        <rect x="120" y="1095" width="12" height="70" fill="#4b5560" />
        <rect x="420" y="1055" width="12" height="70" fill="#4b5560" />
        {/* lid */}
        <path d="M80 900 L420 880 L370 800 L90 815 Z" fill={pianoClear ? '#1a2a4a' : '#cfe3ea'} stroke="#4b5560" stroke-width="4" />
        {pianoClear ? (
          <g>
            <circle cx="140" cy="835" r="14" fill="#f4ecd2" />
            <path d="M180 850 q40 -30 90 -6 q-40 4 -60 20 z" fill="#efe6d2" />
            <path d="M200 870 l30 -4 M240 866 l3 -18" stroke="#c9a45c" stroke-width="2" />
          </g>
        ) : (
          <path d="M80 900 L420 880 L370 800 L90 815 Z" fill={`url(#${id}-frost)`} />
        )}
      </g>
      {/* singing bird automaton on a side table */}
      <g>
        <rect x="490" y="900" width="80" height="60" fill="#3a2316" />
        <rect x="470" y="880" width="120" height="24" fill="#4a2c1d" stroke="#c9a45c" stroke-width="2" />
        <path d="M480 880 L480 770 Q530 700 580 770 L580 880" fill="none" stroke={`url(#${id}-brass)`} stroke-width="5" />
        {[500, 520, 540, 560].map((x) => (
          <line key={x} x1={x} y1="880" x2={x} y2={760 - Math.abs(x - 530) * 0.6} stroke="#c9a45c" stroke-width="2" opacity="0.8" />
        ))}
        <ellipse cx="530" cy="830" rx="22" ry="14" fill={`url(#${id}-brass)`} />
        <circle cx="548" cy="818" r="9" fill={`url(#${id}-brass)`} />
        <path d={sings ? 'M556 816 l14 -6 l-12 8 l12 4 z' : 'M556 818 l12 0 l-12 4 z'} fill="#b08a3e" />
        {sings && (
          <g class="glow-anim">
            <path d="M580 790 q10 -10 20 0 M590 770 q12 -12 24 0" stroke="#ecd398" stroke-width="3" fill="none" />
          </g>
        )}
      </g>
      {/* Vasseur's trunk */}
      <g>
        <path d="M600 1010 L920 990 L940 1190 L610 1210 Z" fill="#1f1640" stroke="#0c0820" stroke-width="5" />
        {trunkOpen ? (
          <path d="M600 1010 L920 990 L900 880 L620 900 Z" fill="#2a2050" stroke="#0c0820" stroke-width="5" />
        ) : (
          <path d="M600 1010 L920 990 L925 960 L603 978 Z" fill="#2a2050" stroke="#0c0820" stroke-width="5" />
        )}
        {[
          [650, 1060],
          [760, 1100],
          [860, 1050],
          [700, 1150],
          [880, 1150],
          [810, 1020],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 10} l3 7 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 z`} fill="#ecd398" />
        ))}
        <text x="770" y="1080" text-anchor="middle" fill="#ecd398" font-size="18" font-family="Cormorant Garamond, serif" font-weight="600" transform="rotate(-3 770 1080)">
          O. VASSEUR
        </text>
        {!trunkOpen && [0, 1, 2, 3].map((i) => <rect key={i} x={700 + i * 34} y={1000 - i * 2} width="26" height="34" rx="3" fill="#efe6d2" stroke="#c9a45c" stroke-width="2" />)}
        {trunkOpen && (
          <g>
            <rect x="680" y="930" width="150" height="70" rx="6" fill="#4a2c1d" stroke="#c9a45c" stroke-width="3" />
            <circle cx="820" cy="965" r="16" fill="#9fe3ff" opacity="0.7" stroke="#ecd398" stroke-width="3" />
          </g>
        )}
        <path d="M600 1010 L920 990 L940 1190 L610 1210 Z" fill={`url(#${id}-frost)`} opacity="0.5" />
      </g>
      {/* armchair */}
      <g>
        <path d="M330 1360 L340 1210 Q440 1170 560 1210 L570 1360 Z" fill="#5a2f22" stroke="#2a1a0e" stroke-width="5" />
        <path d="M320 1250 q-30 60 0 120 M580 1250 q30 60 0 120" stroke="#4a2418" stroke-width="40" fill="none" />
        <path d="M330 1360 L340 1210 Q440 1170 560 1210 L570 1360 Z" fill={`url(#${id}-frost)`} opacity="0.5" />
      </g>
      {/* spiral stair down */}
      <g>
        <ellipse cx="160" cy="1370" rx="130" ry="60" fill="#0a0d12" stroke={`url(#${id}-brass)`} stroke-width="8" />
        <path d="M160 1370 L60 1350 M160 1370 L110 1410 M160 1370 L230 1420" stroke="#c9a45c" stroke-width="6" />
        <text x="160" y="1470" text-anchor="middle" fill="#ecd398" font-size="18">
          ↓ B DECK
        </text>
      </g>
      {sings && <circle cx="530" cy="830" r="200" fill={`url(#${id}-warm)`} opacity="0.6" />}
      <Icicles x={140} y={660} w={720} n={18} seed={9} />
      <FrostOverlay id={id} opacity={0.14} />
      <TorchVignette id={id} />
    </g>
  );
}

// ------------------------------------------------------------------ DINING
export function Dining({ state }: P) {
  const id = 'di';
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#0d0f18" bottom="#1d120c" />
      <rect x="-400" y="-200" width="1800" height="900" fill="#241812" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={-300 + i * 200} y="300" width="140" height="300" fill="#2e1e15" stroke="#4a2c1d" stroke-width="4" />
      ))}
      <rect x="-400" y="-200" width="1800" height="900" fill={`url(#${id}-frost)`} opacity="0.4" />
      {/* chandelier */}
      <g transform="translate(500 170)">
        <line x1="0" y1="-200" x2="0" y2="0" stroke="#7a5a26" stroke-width="4" />
        <path d="M-120 20 q120 70 240 0" fill="none" stroke={`url(#${id}-brass)`} stroke-width="6" />
        {[-110, -55, 0, 55, 110].map((x) => (
          <g key={x}>
            <path d={`M${x} ${30 - Math.abs(x) * 0.25} l-10 30 h20 z`} fill="#cfe8ee" opacity="0.8" />
          </g>
        ))}
        <Icicles x={-130} y={30} w={260} n={10} seed={6} />
      </g>
      <polygon points="-400,700 1400,700 1400,1700 -400,1700" fill="#3a2015" />
      <polygon points="-400,700 1400,700 1400,1700 -400,1700" fill={`url(#${id}-frost)`} opacity="0.45" />
      {/* cloakroom alcove */}
      <rect x="40" y="560" width="230" height="430" fill="#120c08" stroke={`url(#${id}-brass)`} stroke-width="6" />
      <line x1="60" y1="620" x2="250" y2="620" stroke="#c9a45c" stroke-width="5" />
      {[80, 130, 180, 225].map((x, i) => (
        <path key={x} d={`M${x} 620 l-26 40 v180 h52 v-180 z`} fill={['#2b3550', '#4a2c1d', '#3a3a3a', '#5a3e55'][i]} opacity="0.85" />
      ))}
      <rect x="60" y="900" width="190" height="70" fill="#4a2c1d" />
      <rect x="110" y="905" width="80" height="40" fill="#efe6d2" transform="rotate(-6 150 925)" />
      <text x="155" y="590" text-anchor="middle" fill="#ecd398" font-size="16">
        CLOAKS
      </text>
      {/* seating plan easel */}
      <path d="M440 870 L505 590 L570 870 M505 590 L505 880" stroke="#5a3a22" stroke-width="8" fill="none" />
      <rect x="440" y="620" width="130" height="170" fill="#efe6d2" stroke="#7a5a26" stroke-width="3" />
      <ellipse cx="505" cy="705" rx="50" ry="60" fill="#5d7fb0" opacity="0.35" />
      {/* tables */}
      {[
        [250, 1000],
        [700, 1000],
        [470, 1250],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x + 150} cy={y} rx="170" ry="60" fill="#efe6d2" />
          <ellipse cx={x + 150} cy={y} rx="170" ry="60" fill={`url(#${id}-frost)`} />
          <path d={`M${x + 20} ${y + 20} q130 70 260 0 v60 q-130 60 -260 0 z`} fill="#d8ccb0" />
          {[0, 1, 2].map((j) => (
            <path key={j} d={`M${x + 70 + j * 80} ${y - 8} l12 -18 l12 18 z`} fill="#fff" opacity="0.9" />
          ))}
        </g>
      ))}
      {!state.docs.includes('pip-supper') && <rect x="590" y="1190" width="120" height="80" fill="#fbf8ef" transform="rotate(10 650 1230)" stroke="#c9a45c" />}
      {!state.docs.includes('pip-supper') && <path d="M610 1210 q20 -20 40 0 q20 20 40 0" stroke="#d04040" stroke-width="4" fill="none" transform="rotate(10 650 1230)" />}
      {/* exit */}
      <path d="M830 1480 L830 1250 Q 900 1200 990 1230 L990 1480 Z" fill="#06090f" stroke={`url(#${id}-brass)`} stroke-width="6" />
      <text x="910" y="1300" text-anchor="middle" fill="#ecd398" font-size="16">
        LOUNGE →
      </text>
      <FrostOverlay id={id} opacity={0.14} />
      <TorchVignette id={id} />
    </g>
  );
}

// ------------------------------------------------------------------ SMOKING ROOM
export function Smoking() {
  const id = 'sm';
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#0b0d14" bottom="#1a110b" />
      <rect x="-400" y="-200" width="1800" height="1000" fill="#2a1a12" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={-300 + i * 180} y="420" width="150" height="360" fill="#3a2418" stroke="#1a0f08" stroke-width="5" />
      ))}
      <rect x="-400" y="-200" width="1800" height="1000" fill={`url(#${id}-frost)`} opacity="0.35" />
      {/* skylight */}
      <rect x="340" y="150" width="320" height="220" fill="#d8eef4" stroke={`url(#${id}-brass)`} stroke-width="8" />
      <path d="M340 260 h320 M500 150 v220" stroke={`url(#${id}-brass)`} stroke-width="5" />
      <path d="M380 180 l60 50 l-20 60 M560 200 l40 80" stroke="#90b8c6" stroke-width="3" />
      {/* scratched initials */}
      <g transform="translate(740 680)">
        <rect x="-180" y="-160" width="360" height="320" fill="#4a2c1d" stroke="#1a0f08" stroke-width="4" />
        <text x="0" y="-60" text-anchor="middle" fill="#e8d9b4" font-size="34" font-family="Special Elite, monospace" opacity="0.85">
          W.A. O.S. P.F.
        </text>
        <text x="0" y="-10" text-anchor="middle" fill="#e8d9b4" font-size="34" font-family="Special Elite, monospace" opacity="0.85">
          G.L. P.P. O.V.
        </text>
        <text x="0" y="50" text-anchor="middle" fill="#e8d9b4" font-size="20" font-family="Special Elite, monospace" opacity="0.7">
          26–28 JAN 1938
        </text>
        <text x="0" y="80" text-anchor="middle" fill="#e8d9b4" font-size="20" font-family="Special Elite, monospace" opacity="0.7">
          WE ARE ALIVE
        </text>
        <path d="M-150 110 l300 -6" stroke="#e8d9b4" stroke-width="2" opacity="0.5" />
      </g>
      {/* floor */}
      <polygon points="-400,800 1400,800 1400,1700 -400,1700" fill="#2a1a12" />
      <polygon points="-400,800 1400,800 1400,1700 -400,1700" fill={`url(#${id}-frost)`} opacity="0.5" />
      {/* chairs */}
      {[
        [260, 1000],
        [560, 1080],
      ].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y + 180} L${x + 10} ${y} Q${x + 110} ${y - 50} ${x + 210} ${y} L${x + 220} ${y + 180} Z`} fill="#6b2f22" stroke="#2a1a0e" stroke-width="5" />
          <path d={`M${x} ${y + 180} L${x + 10} ${y} Q${x + 110} ${y - 50} ${x + 210} ${y} L${x + 220} ${y + 180} Z`} fill={`url(#${id}-frost)`} opacity="0.5" />
        </g>
      ))}
      <ellipse cx="520" cy="1250" rx="90" ry="34" fill={`url(#${id}-brass)`} />
      <rect x="505" y="1250" width="30" height="120" fill="#7a5a26" />
      {/* airlock door */}
      <rect x="40" y="700" width="200" height="520" rx="20" fill="#3b4048" stroke={`url(#${id}-brass)`} stroke-width="8" />
      <circle cx="140" cy="820" r="44" fill="#0d1a24" stroke="#c9a45c" stroke-width="6" />
      <Icicles x={300} y={370} w={400} n={10} seed={8} />
      <FrostOverlay id={id} opacity={0.12} />
      <TorchVignette id={id} />
    </g>
  );
}

// ------------------------------------------------------------------ CAPTAIN'S CABIN
export function Captain({ state }: P) {
  const id = 'ca';
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#0b0f18" bottom="#170f0a" />
      <rect x="-400" y="-200" width="1800" height="1000" fill="#2a1a12" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={-300 + i * 180} y1="-200" x2={-300 + i * 180} y2="800" stroke="#1d120c" stroke-width="6" />
      ))}
      <rect x="-400" y="-200" width="1800" height="1000" fill={`url(#${id}-frost)`} opacity="0.4" />
      {/* porthole */}
      <circle cx="500" cy="360" r="90" fill={`url(#${id}-ice)`} stroke={`url(#${id}-brass)`} stroke-width="16" />
      <circle cx="500" cy="360" r="90" fill={`url(#${id}-frost)`} opacity="0.8" />
      {/* barometer */}
      <g transform="translate(370 580)">
        <circle r="70" fill={`url(#${id}-brass)`} />
        <circle r="58" fill="#efe6d2" />
        <text x="-30" y="-20" font-size="12" fill="#2a2116">
          FAIR
        </text>
        <text x="-6" y="40" font-size="12" fill="#2a2116">
          STORMY
        </text>
        <line x1="0" y1="0" x2="10" y2="44" stroke="#2a2116" stroke-width="4" />
      </g>
      {/* photo */}
      <rect x="620" y="510" width="160" height="200" fill="#3b2a1c" stroke={`url(#${id}-brass)`} stroke-width="6" />
      <rect x="634" y="524" width="132" height="172" fill="#8a7458" />
      <circle cx="680" cy="580" r="18" fill="#3b2c1c" />
      <circle cx="722" cy="584" r="16" fill="#3b2c1c" />
      <path d="M660 660 q20 -50 40 0 M704 660 q18 -46 36 0" fill="#3b2c1c" />
      {/* floor */}
      <polygon points="-400,800 1400,800 1400,1700 -400,1700" fill="#25170e" />
      <polygon points="-400,800 1400,800 1400,1700 -400,1700" fill={`url(#${id}-frost)`} opacity="0.5" />
      {/* bunk */}
      <rect x="60" y="860" width="400" height="160" fill="#4a2c1d" stroke="#1a0f08" stroke-width="5" />
      <rect x="70" y="830" width="380" height="60" rx="10" fill="#6b7480" />
      <ellipse cx="140" cy="840" rx="60" ry="22" fill="#cfd4da" />
      <rect x="60" y="1020" width="400" height="120" fill="#3a2316" />
      {/* desk */}
      <rect x="540" y="900" width="360" height="40" fill="#5a3a22" stroke="#1a0f08" stroke-width="4" />
      <rect x="560" y="940" width="320" height="300" fill="#4a2c1d" stroke="#1a0f08" stroke-width="4" />
      <rect x="600" y="1110" width="240" height="110" fill="#3a2316" stroke="#c9a45c" stroke-width="3" />
      <circle cx="720" cy="1165" r="8" fill="#c9a45c" />
      <rect x="600" y="860" width="200" height="50" fill="#d8ccb0" transform="rotate(-4 700 885)" />
      <path d="M615 875 h170 M615 890 h150" stroke="#5a4630" stroke-width="3" transform="rotate(-4 700 885)" />
      {!state.items.includes('cipher-disc') && <circle cx="840" cy="880" r="0" />}
      <rect x="540" y="860" width="360" height="380" fill={`url(#${id}-frost)`} opacity="0.4" />
      {/* door out */}
      <rect x="-400" y="1240" width="660" height="400" fill="#07090d" />
      <text x="140" y="1360" text-anchor="middle" fill="#ecd398" font-size="18">
        ← B DECK
      </text>
      <Icicles x={400} y={270} w={200} n={7} seed={10} />
      <FrostOverlay id={id} opacity={0.12} />
      <TorchVignette id={id} />
    </g>
  );
}

// ------------------------------------------------------------------ CABIN 9
export function Cabin9({ state }: P) {
  const id = 'c9';
  const stable = Boolean(state.solved.P15);
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#0a0f19" bottom="#141018" />
      <rect x="-400" y="-200" width="1800" height="1000" fill="#2a1d1a" />
      <rect x="-400" y="-200" width="1800" height="1000" fill={`url(#${id}-frost)`} opacity="0.45" />
      <polygon points="-400,800 1400,800 1400,1700 -400,1700" fill="#221612" />
      <polygon points="-400,800 1400,800 1400,1700 -400,1700" fill={`url(#${id}-frost)`} opacity="0.5" />
      {/* the receiver */}
      <g>
        <rect x="260" y="560" width="480" height="500" rx="14" fill="#1f2228" stroke="#8a929e" stroke-width="5" />
        {/* coils */}
        {[330, 430].map((x) => (
          <g key={x}>
            <rect x={x - 40} y="600" width="80" height="200" rx="12" fill="#7a4a22" />
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1={x - 40} y1={610 + i * 16} x2={x + 40} y2={610 + i * 16} stroke="#c98a4a" stroke-width="6" />
            ))}
          </g>
        ))}
        {/* brass horn */}
        <path d="M560 760 L620 640 Q700 540 760 600 Q700 640 660 700 L600 780 Z" fill={`url(#${id}-brass)`} stroke="#5a4218" stroke-width="4" />
        <ellipse cx="740" cy="590" rx="44" ry="26" fill="#3a2a10" transform="rotate(30 740 590)" />
        {/* three dials */}
        {[350, 500, 650].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="900" r="52" fill="#efe6d2" stroke={`url(#${id}-brass)`} stroke-width="8" />
            {i === 1 && <circle cx={x} cy="900" r="44" fill="#dcecf2" opacity="0.9" />}
            {i === 0 && <line x1={x} y1="900" x2={x + 36} y2="880" stroke="#2a2116" stroke-width="4" />}
            {i === 2 && <circle cx={x} cy="900" r="5" fill="#2a2116" />}
            <text x={x} y="980" text-anchor="middle" fill="#ecd398" font-size="14">
              {['FREQUENCY', 'AMPLITUDE', 'PHASE'][i]}
            </text>
          </g>
        ))}
        <path d="M300 840 L700 840" stroke="#3a4250" stroke-width="4" />
        <circle cx="500" cy="700" r="30" fill={stable ? '#7de3b8' : '#1a3328'} class={stable ? 'glow-anim' : ''} />
        <rect x="260" y="560" width="480" height="500" rx="14" fill={`url(#${id}-frost)`} opacity={stable ? 0.25 : 0.55} />
      </g>
      {/* notebook on the floor */}
      <g transform="rotate(-8 225 1170)">
        <rect x="120" y="1110" width="210" height="130" fill="#2b3550" />
        <rect x="132" y="1120" width="186" height="110" fill="#efe6d2" />
        <path d="M145 1140 h150 M145 1160 h130 M145 1180 h150 M145 1200 h110" stroke="#5a4630" stroke-width="3" />
      </g>
      {/* folding desk with star wheel */}
      <rect x="640" y="1150" width="270" height="20" fill="#5a3a22" />
      {!state.items.includes('planisphere') && (
        <g>
          <circle cx="775" cy="1130" r="70" fill="#d8c79e" stroke="#6b4f22" stroke-width="4" />
          <circle cx="775" cy="1130" r="50" fill="#0b1633" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={775 + Math.cos(i) * 30} cy={1130 + Math.sin(i * 2) * 25} r="2.5" fill="#fff" />
          ))}
        </g>
      )}
      {/* connecting door */}
      <rect x="20" y="590" width="160" height="610" fill="#3b2a1c" stroke="#1a0f08" stroke-width="5" />
      <rect x="20" y="590" width="40" height="610" fill="#07090d" />
      <text x="110" y="660" text-anchor="middle" fill="#ecd398" font-size="16">
        ← CABIN 7
      </text>
      {stable && <circle cx="500" cy="760" r="380" fill={`url(#${id}-warm)`} opacity="0.4" />}
      <FrostOverlay id={id} opacity={0.12} />
      <TorchVignette id={id} />
    </g>
  );
}
