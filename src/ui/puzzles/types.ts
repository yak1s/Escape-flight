import type { GameState, PuzzleDef } from '../../engine/types';

export interface PuzzleProps {
  def: PuzzleDef;
  state: GameState;
  saved: unknown;
  save: (data: unknown) => void;
  solve: () => void;
}

/** Convert a pointer event to SVG user coordinates. */
export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
