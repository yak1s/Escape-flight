import { useEffect, useState } from 'preact/hooks';
import type { GameState, Hotspot } from '../engine/types';
import { visibleHotspots } from '../engine/interact';
import { SCENE_ART } from '../art/scenes';

/**
 * Draws a scene's art (1000×1500 viewBox, letterboxed with "meet" so hotspots are never cropped;
 * backgrounds overflow the viewBox to fill any screen shape) with touch hotspots on top.
 */
export function SceneView({
  sceneId,
  state,
  onTap,
  pulse,
  outlines,
}: {
  sceneId: string;
  state: GameState;
  onTap: (h: Hotspot) => void;
  pulse: number;
  outlines: boolean;
}) {
  const Art = SCENE_ART[sceneId];
  const hotspots = visibleHotspots(state, sceneId);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (!pulse) return;
    setPulsing(false);
    const a = requestAnimationFrame(() => setPulsing(true));
    const t = setTimeout(() => setPulsing(false), 3800);
    return () => {
      cancelAnimationFrame(a);
      clearTimeout(t);
    };
  }, [pulse]);
  // Pulse once on first arrival in a scene so the player knows where to look.
  useEffect(() => {
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 3800);
    return () => clearTimeout(t);
  }, [sceneId]);

  return (
    <svg
      class={`scene-svg ${pulsing ? 'pulse-all' : ''} ${outlines ? 'show-outlines' : ''}`}
      viewBox="0 0 1000 1500"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={sceneId}
      data-testid="scene"
    >
      {Art ? <Art state={state} /> : <rect x="-2000" y="-2000" width="5000" height="5500" fill="#0b1020" />}
      <g>
        {hotspots.map((h) => {
          const { x, y, w, h: hh } = h.rect;
          return (
            <g key={h.id}>
              <rect
                class="hotspot"
                x={x}
                y={y}
                width={w}
                height={hh}
                rx={18}
                role="button"
                tabIndex={0}
                aria-label={h.label}
                data-testid={`hs-${h.id}`}
                onClick={() => onTap(h)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap(h)}
              />
              <rect class={`hotspot-ring ${h.key ? 'key' : ''}`} x={x + 4} y={y + 4} width={w - 8} height={hh - 8} rx={16} />
              <text class="hotspot-label" x={x + w / 2} y={y + hh / 2 + 9} text-anchor="middle">
                {h.label.length > 22 ? `${h.label.slice(0, 21)}…` : h.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
