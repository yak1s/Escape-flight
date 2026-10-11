import { Aurora, Defs } from './common';

export function EndingArt({ kind }: { kind: 'rewrite' | 'record' }) {
  const id = 'en';
  if (kind === 'record')
    return (
      <svg viewBox="0 0 1000 1500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Grey dawn over the glacier">
        <Defs id={id} />
        <defs>
          <linearGradient id="en-dawn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2a3446" />
            <stop offset="0.6" stop-color="#7a8696" />
            <stop offset="1" stop-color="#c9ced6" />
          </linearGradient>
        </defs>
        <rect x="-500" y="-500" width="2000" height="2500" fill="url(#en-dawn)" />
        <path d="M-200 900 L150 600 L330 760 L520 560 L700 720 L900 600 L1200 820 L1200 1600 L-200 1600 Z" fill="#5a6676" />
        <path d="M-200 1000 C 300 940, 700 960, 1200 1000 L1200 1600 L-200 1600 Z" fill="#dfe5ea" />
        <g transform="translate(520 1020)">
          <path d="M-300 30 C -200 -90, 220 -110, 330 10" fill="none" stroke="#3a4250" stroke-width="20" />
          {[-200, -100, 0, 100, 200].map((x, i) => (
            <path key={i} d={`M${x} 18 q8 -90 30 -120`} stroke="#3a4250" stroke-width="10" fill="none" />
          ))}
        </g>
        <g transform="translate(560 1160)">
          <path d="M0 0 l-6 30 h12 z" fill="#1a1f29" />
          <circle cx="0" cy="-6" r="6" fill="#1a1f29" />
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 1000 1500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Dawn over an empty glacier, the last of the aurora fading">
      <Defs id={id} />
      <defs>
        <linearGradient id="en-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d1838" />
          <stop offset="0.4" stop-color="#3a3f6a" />
          <stop offset="0.7" stop-color="#d98a7a" />
          <stop offset="1" stop-color="#f6c9a0" />
        </linearGradient>
      </defs>
      <rect x="-500" y="-500" width="2000" height="2500" fill="url(#en-sky)" />
      <Aurora id={id} x={-100} y={40} w={1200} h={420} opacity={0.45} />
      <circle cx="760" cy="900" r="70" fill="#ffe2b0" opacity="0.8" />
      <path d="M-200 960 L140 640 L300 780 L480 600 L640 760 L820 640 L1200 900 L1200 1600 L-200 1600 Z" fill="#5a4a6a" />
      <path d="M140 640 L190 700 L230 760 L300 780 Z M480 600 L520 660 L640 760 Z" fill="#f4d8c4" opacity="0.7" />
      {/* fjord with the airship safely down, far away */}
      <path d="M520 905 C 640 890, 820 900, 1000 920 L1000 940 C 820 925, 640 920, 520 925 Z" fill="#e8eef4" />
      <g transform="translate(760 905)">
        <ellipse rx="56" ry="11" fill="#2a2a3a" />
        <rect x="-10" y="8" width="20" height="6" fill="#2a2a3a" />
        <circle cx="70" cy="6" r="2" fill="#ffe08a" />
        <circle cx="84" cy="8" r="2" fill="#ffe08a" />
        <circle cx="96" cy="6" r="2" fill="#ffe08a" />
      </g>
      <path d="M-200 1020 C 300 980, 700 990, 1200 1030 L1200 1600 L-200 1600 Z" fill="#f4e6dc" />
      <path d="M-200 1100 C 300 1060, 650 1070, 1200 1110" stroke="#d9b8a8" stroke-width="3" fill="none" />
      <g transform="translate(470 1150)">
        <path d="M0 0 l-7 34 h14 z" fill="#2a2030" />
        <circle cx="0" cy="-7" r="7" fill="#2a2030" />
        <rect x="10" y="10" width="22" height="14" rx="2" fill="#c96a7a" />
      </g>
    </svg>
  );
}
