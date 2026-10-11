// Scene art, part A: promenade, corridor, B deck, wireless room.
import type { GameState } from '../engine/types';
import { Aurora, Backdrop, Defs, FrostOverlay, Icicles, Rivets, TorchVignette } from './common';

type P = { state: GameState };
const has = (s: GameState, flag: string) => Boolean(s.flags[flag]);

// ------------------------------------------------------------------ PROMENADE
export function Promenade({ state }: P) {
  const id = 'pr';
  const solvedPlan = Boolean(state.solved.P01);
  // perspective frame
  const VP = { x: 530, y: 670 };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const ribs = [0, 0.18, 0.34, 0.48, 0.6, 0.7, 0.78];
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#08101e" bottom="#0b1524" />
      {/* ceiling */}
      <polygon points="-400,-200 1400,-200 620,520 440,520" fill="#0d1729" />
      {ribs.map((t, i) => (
        <line key={i} x1={lerp(-400, 440, t)} y1={lerp(-200, 520, t)} x2={lerp(1400, 620, t)} y2={lerp(-200, 520, t)} stroke="#1d2b44" stroke-width={10 - i} />
      ))}
      <line x1="-400" y1="-200" x2="440" y2="520" stroke="#25344f" stroke-width="6" />
      <line x1="1400" y1="-200" x2="620" y2="520" stroke="#25344f" stroke-width="6" />
      {/* floor */}
      <polygon points="-400,1700 1400,1700 620,820 440,820" fill="#3a2414" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = -400 + i * 150;
        return <line key={i} x1={x} y1="1700" x2={lerp(440, 620, i / 12)} y2="820" stroke="#2a1a0e" stroke-width="3" />;
      })}
      {[0.12, 0.25, 0.4, 0.58, 0.8].map((t, i) => (
        <line key={i} x1={lerp(440, -400, t)} y1={lerp(820, 1700, t)} x2={lerp(620, 1400, t)} y2={lerp(820, 1700, t)} stroke="#2a1a0e" stroke-width="2" />
      ))}
      <polygon points="-400,1700 1400,1700 620,820 440,820" fill={`url(#${id}-frost)`} opacity="0.5" />
      {/* end wall with lounge doors */}
      <rect x="440" y="520" width="180" height="300" fill="#2b1a12" />
      <rect x="452" y="548" width="76" height="266" fill="#3b2418" stroke="#7a5a26" stroke-width="3" />
      <rect x="532" y="548" width="76" height="266" fill="#3b2418" stroke="#7a5a26" stroke-width="3" />
      <rect x="464" y="566" width="52" height="120" fill="#7fb6c6" opacity="0.5" />
      <rect x="544" y="566" width="52" height="120" fill="#7fb6c6" opacity="0.5" />
      <rect x="440" y="520" width="180" height="300" fill={`url(#${id}-frost)`} opacity="0.9" />
      <rect x="446" y="540" width="168" height="278" fill="#cfeaf2" opacity="0.22" />
      {/* left wall with slanted windows */}
      <polygon points="-400,-200 440,520 440,820 -400,1700" fill="#101b2e" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t0 = [0.02, 0.2, 0.36, 0.5, 0.62, 0.72][i];
        const t1 = [0.17, 0.33, 0.47, 0.59, 0.69, 0.78][i];
        const xa = lerp(-400, 440, t0);
        const xb = lerp(-400, 440, t1);
        const topA = lerp(-200, 520, t0) + 120 * (1 - t0);
        const topB = lerp(-200, 520, t1) + 120 * (1 - t1);
        const botA = lerp(1700, 820, t0) - 380 * (1 - t0);
        const botB = lerp(1700, 820, t1) - 380 * (1 - t1);
        return (
          <g key={i}>
            <polygon points={`${xa},${topA} ${xb},${topB} ${xb},${botB} ${xa},${botA}`} fill={`url(#${id}-ice)`} stroke="#7a5a26" stroke-width="5" />
            <polygon points={`${xa},${topA} ${xb},${topB} ${xb},${botB} ${xa},${botA}`} fill={`url(#${id}-frost)`} opacity="0.7" />
          </g>
        );
      })}
      <g clip-path={`url(#${id}-winclip)`}>
        <Aurora id={id} x={-200} y={180} w={700} h={420} opacity={0.75} />
      </g>
      <clipPath id={`${id}-winclip`}>
        <polygon points="-400,-200 440,520 440,820 -400,1700" />
      </clipPath>
      {/* handrail */}
      <line x1="-400" y1="1180" x2="440" y2="760" stroke={`url(#${id}-brass)`} stroke-width="14" />
      {/* the ice cave: broken window choked with snow */}
      <path d="M40 760 C 120 700, 260 720, 300 800 C 330 900, 300 1050, 250 1160 C 180 1230, 70 1220, 30 1150 Z" fill="#e6f4f8" />
      <path d="M70 800 C 140 760, 240 780, 270 850 C 290 930, 260 1040, 220 1120 C 160 1170, 90 1160, 60 1100 Z" fill="#b8dde8" />
      <path d="M100 860 l40 60 l-30 70 l50 60" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.7" />
      <path d="M40 760 C 120 700, 260 720, 300 800" stroke="#7a5a26" stroke-width="6" fill="none" />
      {/* right wall (cabin block), with deck plan and corridor arch */}
      <polygon points="1400,-200 620,520 620,820 1400,1700" fill="#2a1810" />
      {Array.from({ length: 5 }, (_, i) => {
        const t = 0.1 + i * 0.16;
        const x = lerp(1400, 620, t);
        return <line key={i} x1={x} y1={lerp(-200, 520, t)} x2={x} y2={lerp(1700, 820, t)} stroke="#1a0f08" stroke-width="5" />;
      })}
      <polygon points="1400,-200 620,520 620,820 1400,1700" fill={`url(#${id}-frost)`} opacity="0.45" />
      {/* deck plan frame */}
      <polygon points="612,488 828,452 828,812 612,792" fill="#1d1208" stroke={`url(#${id}-brass)`} stroke-width="8" />
      {solvedPlan ? (
        <g>
          <polygon points="626,500 814,470 814,798 626,780" fill="#11223a" />
          <path d="M650 540 L790 520 M650 600 L790 585 M650 660 L790 650 M650 720 L790 715 M700 505 L700 790 M745 497 L745 795" stroke="#cfe8ee" stroke-width="2" opacity="0.6" />
          <text x="720" y="545" text-anchor="middle" fill="#ecd398" font-size="16" transform="skewY(-8)">
            A DECK
          </text>
        </g>
      ) : (
        <g>
          <polygon points="626,500 814,470 814,798 626,780" fill="#0a0c10" />
          <path d="M640 520 l40 10 l-10 40 z M720 500 l50 -6 l10 50 z M660 640 l60 -10 l-20 60 z" fill="#203450" opacity="0.6" />
        </g>
      )}
      {/* broken tiles on the floor below the frame */}
      {!solvedPlan && (
        <g>
          {[
            [640, 900, -12],
            [700, 930, 18],
            [760, 905, 40],
            [670, 975, 65],
            [745, 985, -30],
            [810, 950, 10],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`rotate(${r} ${x} ${y})`}>
              <rect x={x - 26} y={y - 18} width="52" height="36" rx="3" fill="#13253f" stroke="#c9a45c" stroke-width="2" />
              <path d={`M${x - 18} ${y - 6} h28 M${x - 10} ${y + 6} h20`} stroke="#cfe8ee" stroke-width="1.5" opacity="0.7" />
            </g>
          ))}
        </g>
      )}
      {/* corridor archway, near right */}
      <path d="M840 1180 L840 720 Q 920 610 1000 640 L1000 1240 Z" fill="#070b14" stroke={`url(#${id}-brass)`} stroke-width="10" />
      <text x="918" y="700" text-anchor="middle" fill="#ecd398" font-size="22" font-family="Cormorant Garamond, serif" font-weight="600">
        CABINS
      </text>
      <path d="M860 1150 L860 760 Q 920 680 980 700 L980 1200 Z" fill="#101a2c" opacity="0.8" />
      {/* deck chairs */}
      <g>
        <path d="M330 1250 L380 1070 L520 1060 L470 1250 Z" fill="#5a3a22" stroke="#2a1a0e" stroke-width="4" />
        <path d="M380 1070 L400 990 L530 985 L520 1060 Z" fill="#6b4a2c" stroke="#2a1a0e" stroke-width="4" />
        <path d="M360 1170 L500 1160 L486 1210 L346 1220 Z" fill="#7a2f2a" />
        <path d="M360 1170 L500 1160 M356 1185 L496 1175 M352 1200 L492 1190" stroke="#c9a45c" stroke-width="3" opacity="0.6" />
        {!state.docs.includes('lund-novel') && <rect x="420" y="1120" width="54" height="34" rx="3" fill="#1d3550" stroke="#c9a45c" stroke-width="2" transform="rotate(-8 447 1137)" />}
        <path d="M330 1250 L380 1070 L520 1060 L470 1250 Z" fill={`url(#${id}-frost)`} opacity="0.7" />
        <path d="M560 1270 L590 1150 L660 1145 L640 1270 Z" fill="#4a2f1c" opacity="0.8" />
      </g>
      <Icicles x={-100} y={150} w={700} n={14} seed={2} />
      <Icicles x={440} y={520} w={180} n={6} seed={5} />
      <FrostOverlay id={id} opacity={0.18} />
      <circle cx={VP.x} cy={VP.y} r="420" fill={`url(#${id}-warm)`} opacity="0.35" />
      <TorchVignette id={id} />
    </g>
  );
}

// ------------------------------------------------------------------ CORRIDOR
export function Corridor({ state }: P) {
  const id = 'co';
  const clear = Boolean(state.solved.P02);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const doorT = [0.06, 0.3, 0.48, 0.62, 0.73, 0.82];
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#0a0f1c" bottom="#140c08" />
      {/* end wall */}
      <rect x="400" y="500" width="200" height="320" fill="#24150d" />
      {/* ceiling */}
      <polygon points="-400,-200 1400,-200 600,500 400,500" fill="#120d0b" />
      {[0.2, 0.4, 0.55, 0.68, 0.78].map((t, i) => (
        <g key={i}>
          <line x1={lerp(-400, 400, t)} y1={lerp(-200, 500, t)} x2={lerp(1400, 600, t)} y2={lerp(-200, 500, t)} stroke="#2a1d14" stroke-width={9 - i} />
          <circle cx="500" cy={lerp(-200, 500, t) + 10} r={14 - i * 2} fill="#ffe2a6" opacity={0.25 + i * 0.05} class="flicker" />
        </g>
      ))}
      {/* floor runner */}
      <polygon points="-400,1700 1400,1700 600,820 400,820" fill="#2a1a12" />
      <polygon points="120,1700 880,1700 560,820 440,820" fill="#5a1f22" />
      <polygon points="160,1700 840,1700 552,820 448,820" fill="none" stroke="#c9a45c" stroke-width="3" opacity="0.5" />
      <polygon points="-400,1700 1400,1700 600,820 400,820" fill={`url(#${id}-frost)`} opacity="0.55" />
      {/* walls with doors */}
      <polygon points="-400,-200 400,500 400,820 -400,1700" fill="#3a2316" />
      <polygon points="1400,-200 600,500 600,820 1400,1700" fill="#3a2316" />
      {doorT.map((t, i) => {
        const t2 = t + 0.07;
        const xa = lerp(-400, 400, t);
        const xb = lerp(-400, 400, t2);
        const ta = lerp(-200, 500, t) + 260 * (1 - t);
        const tb = lerp(-200, 500, t2) + 260 * (1 - t2);
        const ba = lerp(1700, 820, t) - 120 * (1 - t);
        const bb = lerp(1700, 820, t2) - 120 * (1 - t2);
        const XA = 1000 - xa;
        const XB = 1000 - xb;
        const plateP = ['1', '3', '5', '7', '6', '11'][i];
        const plateS = ['2', '4', '9', '8', '10', '12'][i];
        const loose = i === 4 || i === 2;
        return (
          <g key={i}>
            <polygon points={`${xa},${ta} ${xb},${tb} ${xb},${bb} ${xa},${ba}`} fill="#4a2c1d" stroke="#1d110a" stroke-width="3" />
            <polygon points={`${XA},${ta} ${XB},${tb} ${XB},${bb} ${XA},${ba}`} fill="#4a2c1d" stroke="#1d110a" stroke-width="3" />
            {i < 4 && (
              <>
                <text x={(xa + xb) / 2} y={ta + (ba - ta) * 0.18} text-anchor="middle" fill="#ecd398" font-size={Math.max(12, 42 * (1 - t))} font-family="Cormorant Garamond, serif" font-weight="600" transform={i === 4 ? `rotate(-10 ${(xa + xb) / 2} ${ta})` : undefined}>
                  {plateP}
                </text>
                <text x={(XA + XB) / 2} y={ta + (ba - ta) * 0.18} text-anchor="middle" fill="#ecd398" font-size={Math.max(12, 42 * (1 - t))} font-family="Cormorant Garamond, serif" font-weight="600" transform={i === 2 ? `rotate(9 ${(XA + XB) / 2} ${ta + (ba - ta) * 0.18})` : undefined}>
                  {plateS}
                </text>
              </>
            )}
            {loose && i >= 4 && null}
            <polygon points={`${xa},${ta} ${xb},${tb} ${xb},${bb} ${xa},${ba}`} fill={`url(#${id}-frost)`} opacity="0.6" />
            <polygon points={`${XA},${ta} ${XB},${tb} ${XB},${bb} ${XA},${ba}`} fill={`url(#${id}-frost)`} opacity="0.6" />
          </g>
        );
      })}
      {/* crew door at the end */}
      <rect x="430" y="540" width="140" height="250" fill="#2e3a44" stroke="#8a929e" stroke-width="4" />
      <rect x="450" y="570" width="100" height="26" fill="#c9a45c" />
      <text x="500" y="589" text-anchor="middle" fill="#1b1408" font-size="15" font-weight="700">
        CREW ONLY
      </text>
      <text x="500" y="620" text-anchor="middle" fill="#cfe8ee" font-size="12">
        B DECK ↓
      </text>
      <circle cx="548" cy="690" r="7" fill="#c9a45c" />
      {/* luggage jumble or cleared trolley */}
      {!clear ? (
        <g>
          <rect x="300" y="880" width="170" height="110" rx="10" fill="#5b3a2a" stroke="#1a0f08" stroke-width="4" transform="rotate(-6 385 935)" />
          <rect x="460" y="850" width="140" height="150" rx="10" fill="#2a2050" stroke="#1a0f08" stroke-width="4" transform="rotate(8 530 925)" />
          <rect x="580" y="900" width="160" height="100" rx="10" fill="#3b4f63" stroke="#1a0f08" stroke-width="4" />
          <rect x="350" y="980" width="260" height="70" rx="10" fill="#c9a45c" stroke="#5a4218" stroke-width="4" />
          <circle cx="380" cy="1055" r="12" fill="#222" />
          <circle cx="580" cy="1055" r="12" fill="#222" />
          <rect x="250" y="960" width="110" height="90" rx="8" fill="#15151a" stroke="#000" stroke-width="3" />
          <path d="M520 870 l30 0 M520 885 l40 0" stroke="#ecd398" stroke-width="3" />
          <circle cx="505" cy="895" r="10" fill="#efe6d2" opacity="0.7" />
          <rect x="280" y="860" width="460" height="200" fill={`url(#${id}-frost)`} opacity="0.65" />
        </g>
      ) : (
        <g>
          <rect x="160" y="1000" width="150" height="90" rx="10" fill="#5b3a2a" stroke="#1a0f08" stroke-width="4" transform="rotate(-10 235 1045)" />
          <rect x="700" y="980" width="150" height="110" rx="10" fill="#2a2050" stroke="#1a0f08" stroke-width="4" transform="rotate(6 775 1035)" />
          <rect x="570" y="1110" width="170" height="110" rx="8" fill="#15151a" stroke="#000" stroke-width="3" />
          <rect x="610" y="1140" width="44" height="22" rx="3" fill="#efe6d2" opacity="0.85" />
        </g>
      )}
      <Icicles x={-50} y={120} w={1100} n={22} seed={3} />
      <FrostOverlay id={id} opacity={0.15} />
      <TorchVignette id={id} />
    </g>
  );
}

// ------------------------------------------------------------------ B DECK
export function BDeck({ state }: P) {
  const id = 'bd';
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#0b0f18" bottom="#10100e" />
      <polygon points="-400,-200 1400,-200 590,540 410,540" fill="#151a22" />
      {/* pipes along ceiling */}
      <path d="M-200 120 L430 560 M-140 90 L440 555 M1200 120 L580 560" stroke="#3a4250" stroke-width="16" />
      <path d="M-200 120 L430 560" stroke="#8a929e" stroke-width="3" opacity="0.4" />
      <polygon points="-400,1700 1400,1700 590,840 410,840" fill="#1e2228" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={-400 + i * 200} y1="1700" x2={lerp(410, 590, i / 9)} y2="840" stroke="#15181d" stroke-width="3" />
      ))}
      <polygon points="-400,1700 1400,1700 590,840 410,840" fill={`url(#${id}-frost)`} opacity="0.55" />
      <polygon points="-400,-200 410,540 410,840 -400,1700" fill="#262b33" />
      <polygon points="1400,-200 590,540 590,840 1400,1700" fill="#262b33" />
      <Rivets x1={-300} y1={-110} x2={400} y2={530} n={14} />
      <Rivets x1={1300} y1={-110} x2={600} y2={530} n={14} />
      {/* end wall: smoking room airlock */}
      <rect x="410" y="540" width="180" height="300" fill="#1b2027" />
      <rect x="440" y="565" width="130" height="255" rx="14" fill="#3b4048" stroke={`url(#${id}-brass)`} stroke-width="6" />
      <circle cx="505" cy="640" r="34" fill="#0d1a24" stroke="#c9a45c" stroke-width="5" />
      <circle cx="505" cy="640" r="26" fill="#ffd38a" opacity={has(state, 'smoking_open') ? 0.35 : 0.08} />
      <text x="505" y="720" text-anchor="middle" fill="#ecd398" font-size="13" font-weight="700">
        SMOKING
      </text>
      <text x="505" y="736" text-anchor="middle" fill="#ecd398" font-size="10">
        PRESSURISED
      </text>
      {/* officers' bulkhead door (left of end wall) */}
      <polygon points="290,630 400,600 400,860 290,880" fill="#30363f" stroke="#8a929e" stroke-width="4" />
      <circle cx="345" cy="740" r="24" fill="none" stroke="#c9a45c" stroke-width="5" />
      <path d="M345 716 v48 M321 740 h48" stroke="#c9a45c" stroke-width="4" />
      <text x="345" y="660" text-anchor="middle" fill="#cfe8ee" font-size="12">
        OFFICERS
      </text>
      {has(state, 'officers_open') && (
        <g>
          <polygon points="290,630 330,620 330,870 290,880" fill="#0a0d12" />
          <path d="M300 860 l40 -6 l-4 -40 l-32 4 z" fill="#8a2f2a" stroke="#3a1a10" stroke-width="3" />
          <text x="318" y="845" fill="#ecd398" font-size="10" transform="rotate(-8 318 845)">
            FIRE
          </text>
        </g>
      )}
      {/* left wall: wireless room door (lit) and galley */}
      <polygon points="40,520 250,620 250,930 40,960" fill="#141820" stroke="#c9a45c" stroke-width="5" />
      <polygon points="58,540 236,628 236,920 58,945" fill={state.solved.P04 ? '#3d3020' : '#0e1218'} />
      {state.solved.P04 && <polygon points="58,540 236,628 236,920 58,945" fill={`url(#${id}-warm)`} />}
      <text x="150" y="600" text-anchor="middle" fill="#ecd398" font-size="20" font-weight="600" transform="rotate(14 150 600)">
        WIRELESS
      </text>
      <polygon points="40,970 280,980 280,1260 40,1290" fill="#20252c" stroke="#5a6475" stroke-width="4" />
      <text x="160" y="1010" text-anchor="middle" fill="#cfe8ee" font-size="16">
        GALLEY
      </text>
      <rect x="110" y="1050" width="110" height="150" fill={has(state, 'shaft_clear') ? '#05070b' : '#9fd0de'} stroke="#8a929e" stroke-width="3" />
      {!has(state, 'shaft_clear') && <rect x="110" y="1050" width="110" height="150" fill={`url(#${id}-frost)`} />}
      {/* right wall: bar shutter, notice board, mail room */}
      <polygon points="750,520 980,470 980,840 750,850" fill="#2c1d14" stroke="#c9a45c" stroke-width="4" />
      <text x="865" y="550" text-anchor="middle" fill="#ecd398" font-size="20" font-weight="600" transform="rotate(-8 865 550)">
        BAR
      </text>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={780 + i * 46} y={600 - i * 8} width="22" height="60" rx="6" fill={['#6b8f4a', '#b07a3a', '#7a3a4a', '#4a6a8a'][i]} opacity="0.75" />
      ))}
      <rect x="770" y="690" width="190" height="20" fill="#c9a45c" />
      <polygon points="610,600 720,592 720,750 610,756" fill="#a07c50" stroke="#5a4218" stroke-width="3" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={622 + i * 30} y={612 + (i % 2) * 18} width="26" height="34" fill="#efe6d2" transform={`rotate(${i * 5 - 4} ${635 + i * 30} 630)`} />
      ))}
      <polygon points="750,880 980,870 980,1130 750,1130" fill="#25303b" stroke="#5a6475" stroke-width="4" />
      <text x="865" y="910" text-anchor="middle" fill="#cfe8ee" font-size="16">
        MAIL
      </text>
      <path d="M800 1000 q60 -30 120 0 l-10 110 h-100 z" fill="#c9b48a" stroke="#6b5a3a" stroke-width="3" />
      {/* spiral stair, right foreground */}
      <g>
        <ellipse cx="800" cy="1300" rx="150" ry="60" fill="#14181e" stroke={`url(#${id}-brass)`} stroke-width="8" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M800 1300 L${800 + 150 * Math.cos(-0.6 - i * 0.5)} ${1300 + 60 * Math.sin(-0.6 - i * 0.5) - i * 28}`} stroke="#c9a45c" stroke-width="6" />
        ))}
        <line x1="800" y1="1300" x2="800" y2="1130" stroke={`url(#${id}-brass)`} stroke-width="14" />
        <text x="800" y="1395" text-anchor="middle" fill="#ecd398" font-size="18">
          ↑ LOUNGE
        </text>
      </g>
      {/* crew stair, left foreground */}
      <g>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={60 + i * 18} y={1320 + i * 40} width="260" height="26" fill="#3a3f48" stroke="#5a6475" />
        ))}
        <text x="190" y="1300" text-anchor="middle" fill="#cfe8ee" font-size="16">
          ↑ CABINS
        </text>
      </g>
      <Icicles x={-100} y={110} w={1200} n={20} seed={7} />
      <FrostOverlay id={id} opacity={0.15} />
      <TorchVignette id={id} />
    </g>
  );
}

// ------------------------------------------------------------------ WIRELESS ROOM
export function Wireless({ state }: P) {
  const id = 'wr';
  const on = Boolean(state.solved.P04);
  const valves = Boolean(state.solved.P03);
  return (
    <g>
      <Defs id={id} />
      <Backdrop top="#0b111c" bottom="#121418" />
      {/* back wall */}
      <rect x="-400" y="-200" width="1800" height="1300" fill="#1d232c" />
      <rect x="-400" y="-200" width="1800" height="1300" fill={`url(#${id}-frost)`} opacity="0.35" />
      <line x1="-400" y1="240" x2="1400" y2="240" stroke="#2a313c" stroke-width="16" />
      <Rivets x1={-100} y1={240} x2={1100} y2={240} n={20} />
      {/* fallen beam across the desk */}
      {/* floor */}
      <polygon points="-400,1250 1400,1250 1400,1700 -400,1700" fill="#16181c" />
      <rect x="300" y="1260" width="420" height="170" fill="#bfe6ef" opacity="0.35" />
      <rect x="300" y="1260" width="420" height="170" fill={`url(#${id}-frost)`} opacity="0.8" />
      {/* frequency chart frame (rotted) */}
      <rect x="70" y="410" width="200" height="260" fill="#2a1d14" stroke={`url(#${id}-brass)`} stroke-width="8" />
      <path d="M90 430 h160 v80 l-30 20 l-40 -10 l-50 30 l-40 -20 z" fill="#d8ccb0" opacity="0.6" />
      <path d="M100 450 h120 M100 470 h90 M100 490 h110" stroke="#5a4630" stroke-width="3" />
      {/* framed photo */}
      <rect x="92" y="730" width="156" height="200" fill="#3b2a1c" stroke={`url(#${id}-brass)`} stroke-width="6" />
      <rect x="106" y="746" width="128" height="168" fill="#8a7458" />
      <circle cx="146" cy="800" r="18" fill="#3b2c1c" />
      <circle cx="196" cy="796" r="18" fill="#3b2c1c" />
      <path d="M124 860 q22 -40 44 0 M174 860 q22 -40 44 0" fill="#3b2c1c" />
      {/* the wireless set */}
      <rect x="320" y="540" width="360" height="500" rx="10" fill="#2d3239" stroke="#8a929e" stroke-width="5" />
      <rect x="340" y="560" width="320" height="150" rx="6" fill="#1a1d22" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={380 + i * 80} cy="660" r="20" fill="#0d0f12" stroke="#5a6475" stroke-width="3" />
          {valves && <path d={`M${368 + i * 80} 660 v-60 q12 -18 24 0 v60 z`} fill="rgba(200,230,240,0.25)" stroke="#cfe8ee" stroke-width="2" />}
          {valves && on && <circle cx={380 + i * 80} cy="630" r="14" fill="#ff9a3c" opacity="0.6" class="glow-anim" />}
        </g>
      ))}
      <rect x="350" y="740" width="300" height="70" rx="6" fill="#1d150c" stroke="#8a6a32" stroke-width="3" />
      <line x1={on ? 515 : 380} y1="745" x2={on ? 515 : 380} y2="805" stroke="#ff7a5a" stroke-width="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={365 + i * 25} y1="790" x2={365 + i * 25} y2="805" stroke="#c9a45c" stroke-width="2" />
      ))}
      <circle cx="400" cy="880" r="34" fill="#15181d" stroke="#c9a45c" stroke-width="5" />
      <circle cx="600" cy="880" r="34" fill="#15181d" stroke="#c9a45c" stroke-width="5" />
      <line x1="400" y1="880" x2={on ? 424 : 400} y2={on ? 858 : 848} stroke="#ecd398" stroke-width="5" />
      <line x1="600" y1="880" x2="600" y2="848" stroke="#ecd398" stroke-width="5" />
      <circle cx="500" cy="900" r="16" fill={on ? '#7de3b8' : '#0f2a20'} opacity={on ? 0.9 : 1} class={on ? 'glow-anim' : ''} />
      <rect x="350" y="950" width="300" height="70" rx="6" fill="#1a1d22" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1="360" y1={960 + i * 7} x2="640" y2={960 + i * 7} stroke="#2d3239" stroke-width="3" />
      ))}
      {state.items.includes('walkie') && (
        <g>
          <rect x="620" y="975" width="34" height="62" rx="6" fill="#222" stroke="#555" stroke-width="2" />
          <line x1="628" y1="975" x2="628" y2="935" stroke="#333" stroke-width="4" />
          <circle cx="637" cy="995" r="4" fill={on ? '#ff4a3a' : '#400'} />
        </g>
      )}
      <rect x="320" y="540" width="360" height="500" rx="10" fill={`url(#${id}-frost)`} opacity={on ? 0.2 : 0.6} />
      {/* crushed desk with a fallen beam */}
      <polygon points="230,1070 560,1050 760,1080 760,1180 230,1240" fill="#3a2316" />
      <polygon points="160,980 860,1120 840,1170 140,1030" fill="#2a1d14" stroke="#120a06" stroke-width="5" />
      <rect x="570" y="1060" width="150" height="100" fill="#d8ccb0" transform="rotate(4 645 1110)" />
      <path d="M585 1080 h110 M585 1100 h90 M585 1120 h100" stroke="#5a4630" stroke-width="3" transform="rotate(4 645 1110)" />
      {/* collapsed shelf */}
      <path d="M720 600 L960 560 L960 590 L720 640 Z" fill="#3a2316" />
      <path d="M730 820 L960 700 L960 880 L730 880 Z" fill="#5a4630" opacity="0.6" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={760 + i * 50} cy={850 - i * 6} rx="22" ry="14" fill="#6b5a3a" stroke="#3a2a14" stroke-width="2" />
      ))}
      {/* wall clock frozen at 3:12 */}
      <g transform="translate(810 380)">
        <circle r="88" fill={`url(#${id}-brass)`} />
        <circle r="74" fill="#efe6d2" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={Math.sin(a) * 60} y1={-Math.cos(a) * 60} x2={Math.sin(a) * 70} y2={-Math.cos(a) * 70} stroke="#2a2116" stroke-width="4" />;
        })}
        <line x1="0" y1="0" x2={Math.sin(((3 + 12 / 60) * Math.PI) / 6) * 38} y2={-Math.cos(((3 + 12 / 60) * Math.PI) / 6) * 38} stroke="#2a2116" stroke-width="7" stroke-linecap="round" />
        <line x1="0" y1="0" x2={Math.sin((12 * Math.PI) / 30) * 58} y2={-Math.cos((12 * Math.PI) / 30) * 58} stroke="#2a2116" stroke-width="4" stroke-linecap="round" />
        <circle r="6" fill="#2a2116" />
        <circle r="74" fill={`url(#${id}-frost)`} opacity="0.5" />
        {state.items.includes('sixpence') && <circle r="88" fill="none" stroke="#ffd38a" stroke-width="3" opacity="0.5" />}
      </g>
      {/* doorway out */}
      <rect x="-400" y="1100" width="590" height="420" fill="#07090d" />
      <text x="90" y="1300" text-anchor="middle" fill="#ecd398" font-size="18">
        ← B DECK
      </text>
      <Icicles x={-100} y={232} w={1200} n={24} seed={4} />
      <FrostOverlay id={id} opacity={0.12} />
      {on && <circle cx="500" cy="760" r="420" fill={`url(#${id}-warm)`} opacity="0.5" />}
      <TorchVignette id={id} />
    </g>
  );
}
