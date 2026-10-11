// Shared SVG building blocks for the "Frost & Brass" art direction.
import type { ComponentChildren } from 'preact';

/** Full-bleed backdrop that extends far beyond the 1000×1500 viewBox (fills any screen shape). */
export function Backdrop({ top, bottom }: { top: string; bottom: string }) {
  return (
    <g>
      <rect x="-1500" y="-1500" width="4000" height="2250" fill={top} />
      <rect x="-1500" y="750" width="4000" height="2500" fill={bottom} />
    </g>
  );
}

export function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f2d99a" />
        <stop offset="0.45" stop-color="#c9a45c" />
        <stop offset="1" stop-color="#7a5a26" />
      </linearGradient>
      <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4a2c1d" />
        <stop offset="1" stop-color="#26150d" />
      </linearGradient>
      <linearGradient id={`${id}-ice`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a9e2ee" />
        <stop offset="0.5" stop-color="#4f9fb4" />
        <stop offset="1" stop-color="#1c4d63" />
      </linearGradient>
      <linearGradient id={`${id}-aurora`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7de3b8" stop-opacity="0" />
        <stop offset="0.45" stop-color="#7de3b8" stop-opacity="0.85" />
        <stop offset="0.7" stop-color="#59c9e8" stop-opacity="0.5" />
        <stop offset="1" stop-color="#a597ff" stop-opacity="0" />
      </linearGradient>
      <radialGradient id={`${id}-torch`} cx="0.5" cy="0.55" r="0.75">
        <stop offset="0" stop-color="#000" stop-opacity="0" />
        <stop offset="0.55" stop-color="#000" stop-opacity="0.15" />
        <stop offset="1" stop-color="#01030a" stop-opacity="0.82" />
      </radialGradient>
      <radialGradient id={`${id}-warm`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffd38a" stop-opacity="0.45" />
        <stop offset="1" stop-color="#ffd38a" stop-opacity="0" />
      </radialGradient>
      <pattern id={`${id}-frost`} width="220" height="220" patternUnits="userSpaceOnUse">
        <path d="M12 60 l18 -9 l11 13 M70 30 l9 16 l15 -4 M140 18 l-6 18 l14 8 M180 90 l16 -6 l5 15 M30 150 l14 10 l-4 16 M110 120 l12 -12 l13 9 M160 170 l-10 14 l15 7 M60 200 l17 -5" stroke="#e8f8fc" stroke-width="1.1" fill="none" opacity="0.35" />
        <path d="M96 70 l4 0 M98 68 l0 4 M200 40 l4 0 M202 38 l0 4 M40 104 l3 0 M41.5 102.5 l0 3 M130 196 l4 0 M132 194 l0 4" stroke="#ffffff" stroke-width="1" opacity="0.55" />
        <circle cx="152" cy="60" r="1.4" fill="#ffffff" opacity="0.5" />
        <circle cx="22" cy="24" r="1.1" fill="#ffffff" opacity="0.45" />
        <circle cx="190" cy="140" r="1.2" fill="#ffffff" opacity="0.45" />
      </pattern>
    </defs>
  );
}

/** Animated aurora ribbons (transform/opacity only; frozen when reduce-motion is on). */
export function Aurora({ id, x = 0, y = 0, w = 1000, h = 400, opacity = 1 }: { id: string; x?: number; y?: number; w?: number; h?: number; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <path class="aurora-band" d={`M${x - 100} ${y + h * 0.55} C ${x + w * 0.25} ${y + h * 0.1}, ${x + w * 0.55} ${y + h * 0.9}, ${x + w + 100} ${y + h * 0.35} L ${x + w + 100} ${y + h * 0.6} C ${x + w * 0.55} ${y + h * 1.1}, ${x + w * 0.25} ${y + h * 0.35}, ${x - 100} ${y + h * 0.8} Z`} fill={`url(#${id}-aurora)`} />
      <path class="aurora-band b2" d={`M${x - 100} ${y + h * 0.3} C ${x + w * 0.3} ${y - h * 0.05}, ${x + w * 0.6} ${y + h * 0.65}, ${x + w + 100} ${y + h * 0.15} L ${x + w + 100} ${y + h * 0.32} C ${x + w * 0.6} ${y + h * 0.8}, ${x + w * 0.3} ${y + h * 0.15}, ${x - 100} ${y + h * 0.46} Z`} fill={`url(#${id}-aurora)`} opacity="0.6" />
      <path class="aurora-band b3" d={`M${x - 100} ${y + h * 0.75} C ${x + w * 0.35} ${y + h * 0.5}, ${x + w * 0.65} ${y + h}, ${x + w + 100} ${y + h * 0.62} L ${x + w + 100} ${y + h * 0.72} C ${x + w * 0.65} ${y + h * 1.1}, ${x + w * 0.35} ${y + h * 0.62}, ${x - 100} ${y + h * 0.86} Z`} fill={`url(#${id}-aurora)`} opacity="0.45" />
    </g>
  );
}

/** Dark edges as if lit by a hand torch. */
export function TorchVignette({ id }: { id: string }) {
  return <rect x="-1500" y="-1500" width="4000" height="4500" fill={`url(#${id}-torch)`} pointer-events="none" style={{ pointerEvents: 'none' }} />;
}

export function Icicles({ x, y, w, n = 9, seed = 1, color = '#cfeaf2' }: { x: number; y: number; w: number; n?: number; seed?: number; color?: string }) {
  const out: ComponentChildren[] = [];
  for (let i = 0; i < n; i += 1) {
    const px = x + (w / n) * (i + 0.5);
    const len = 18 + (((i * 37 + seed * 11) % 7) / 7) * 46;
    out.push(<path key={i} d={`M${px - 6} ${y} L${px} ${y + len} L${px + 6} ${y} Z`} fill={color} opacity="0.85" />);
  }
  return <g>{out}</g>;
}

export function Rivets({ x1, y1, x2, y2, n = 8 }: { x1: number; y1: number; x2: number; y2: number; n?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        return <circle key={i} cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t} r="3.2" fill="#d9bf86" opacity="0.7" />;
      })}
    </g>
  );
}

/** Sparse falling snow (only used outdoors). */
export function Snow({ count = 40 }: { count?: number }) {
  return (
    <g class="snowfall" pointer-events="none">
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={(i * 263) % 1000} cy={(i * 197) % 1500} r={1.5 + (i % 3)} fill="#fff" opacity={0.35 + (i % 5) * 0.1} style={{ animationDuration: `${9 + (i % 7) * 2}s`, animationDelay: `${-(i % 11) * 1.3}s` }} />
      ))}
    </g>
  );
}

export function FrostOverlay({ id, x = -1500, y = -1500, w = 4000, h = 4500, opacity = 0.35 }: { id: string; x?: number; y?: number; w?: number; h?: number; opacity?: number }) {
  return <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-frost)`} opacity={opacity} pointer-events="none" />;
}
