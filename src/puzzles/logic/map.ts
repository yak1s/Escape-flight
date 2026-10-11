// Map geometry shared by the topographic map art and the navigation puzzles.
// World coordinates are kilometres with north = +y; the ship's 03:00 position P is the origin.
import { LANDING, LIGHTS, RIDGE } from './index';

export const MAP_W = 600;
export const MAP_H = 560;
const S = 14; // px per km
const OX = 250;
const OY = 300;
export const toSvg = (x: number, y: number) => ({ x: OX + x * S, y: OY - y * S });
export const PX_PER_KM = S;

export const PLACES = {
  P: { x: 0, y: 0 },
  landing: LANDING,
  ridge: RIDGE,
  saddle: { x: 2.43, y: 2.52 },
  ravntind: { x: -6.55, y: 4.59 },
  ravnvik: { x: 11.26, y: 6.5 },
};

/** Unit vector for a true bearing (degrees clockwise from north). */
export function dir(bearing: number) {
  const a = (bearing * Math.PI) / 180;
  return { x: Math.sin(a), y: Math.cos(a) };
}

export function bearingBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  return ((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI + 360) % 360;
}

/** Intersection of two lines, each through a light and running along (bearing + 180°). */
export function intersect(l1: { x: number; y: number }, b1: number, l2: { x: number; y: number }, b2: number) {
  const d1 = dir(b1 + 180);
  const d2 = dir(b2 + 180);
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((l2.x - l1.x) * d2.y - (l2.y - l1.y) * d2.x) / den;
  return { x: l1.x + t * d1.x, y: l1.y + t * d1.y };
}

export function lightById(id: string) {
  return LIGHTS.find((l) => l.id === id)!;
}
