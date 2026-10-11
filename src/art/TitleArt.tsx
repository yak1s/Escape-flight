import { Aurora, Defs, Snow } from './common';

/** Glacier at night under the aurora, the wreck's dark ribs breaking through the ice. */
export function TitleArt() {
  const id = 'ti';
  return (
    <svg viewBox="0 0 1000 1500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The wreck of an airship in a glacier under the northern lights">
      <Defs id={id} />
      <defs>
        <linearGradient id="ti-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#03050d" />
          <stop offset="0.45" stop-color="#0b1a33" />
          <stop offset="0.75" stop-color="#16324a" />
          <stop offset="1" stop-color="#1d3a4e" />
        </linearGradient>
        <linearGradient id="ti-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9fc4d2" />
          <stop offset="1" stop-color="#e8f4f8" />
        </linearGradient>
      </defs>
      <rect x="-500" y="-500" width="2000" height="2500" fill="url(#ti-sky)" />
      {Array.from({ length: 90 }, (_, i) => (
        <circle key={i} cx={(i * 397) % 1000} cy={(i * 211) % 760} r={(i % 4) * 0.5 + 0.6} fill="#fff" opacity={0.3 + (i % 5) * 0.12} />
      ))}
      <Aurora id={id} x={-100} y={60} w={1200} h={620} />
      <Aurora id={id} x={-50} y={180} w={1100} h={480} opacity={0.6} />
      {/* mountains */}
      <path d="M-200 980 L120 640 L260 760 L420 560 L560 720 L700 600 L860 760 L1000 650 L1200 900 L1200 1600 L-200 1600 Z" fill="#162a3c" />
      <path d="M120 640 L170 700 L140 720 L200 760 L260 760 Z M420 560 L470 640 L440 650 L500 700 L560 720 Z M700 600 L740 660 L720 670 L780 720 Z" fill="#c9dde6" opacity="0.65" />
      {/* glacier */}
      <path d="M-200 1050 C 200 960, 700 980, 1200 1040 L1200 1600 L-200 1600 Z" fill="url(#ti-snow)" />
      <path d="M-200 1120 C 300 1060, 650 1080, 1200 1130" stroke="#8fb3c2" stroke-width="3" fill="none" opacity="0.6" />
      <path d="M-200 1230 C 200 1190, 700 1200, 1200 1250" stroke="#8fb3c2" stroke-width="3" fill="none" opacity="0.5" />
      {/* the wreck: hull ribs breaking the ice */}
      <g transform="translate(520 1080)">
        <path d="M-300 30 C -200 -90, 220 -110, 330 10" fill="none" stroke="#0b1018" stroke-width="22" />
        {[-240, -170, -100, -30, 40, 110, 180, 250].map((x, i) => (
          <path key={i} d={`M${x} ${20 - Math.sin((i / 7) * Math.PI) * 4} q${8} ${-80 - Math.sin((i / 7) * Math.PI) * 50} ${30} ${-110 - Math.sin((i / 7) * Math.PI) * 30}`} stroke="#0b1018" stroke-width="12" fill="none" />
        ))}
        <path d="M-280 40 C -150 0, 180 -10, 320 30 L 320 60 L -280 60 Z" fill="#cfe2ea" />
        <rect x="-60" y="-10" width="120" height="40" fill="#0b1018" transform="rotate(-6)" />
        <rect x="-40" y="-2" width="20" height="16" fill="#ffd38a" opacity="0.8" class="glow-anim" />
      </g>
      {/* tiny figure with a torch */}
      <g transform="translate(300 1180)">
        <path d="M0 0 l-6 30 h12 z" fill="#0b1018" />
        <circle cx="0" cy="-6" r="6" fill="#0b1018" />
        <path d="M4 6 L80 -30 L80 20 Z" fill="#ffe8b0" opacity="0.18" />
      </g>
      <Snow count={46} />
      <rect x="-500" y="1100" width="2000" height="600" fill="url(#ti-sky)" opacity="0.25" />
    </svg>
  );
}
