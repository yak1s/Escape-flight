// Planisphere geometry for latitude 61.2°N, longitude 7.0°E (the Ravnfjell), using J2000 star
// positions. The star disc is a polar equidistant projection centred on the north celestial pole.
// Screen angles are measured clockwise from "up", in degrees.

export const LAT = 61.2;
export const LON = 7.0;
export const DEC_EDGE = -40; // southern edge of the star disc
export const R_EDGE = 250; // radius (svg units) of the dec = -40 circle

/** LST (degrees) at 03:00 CET on 26 January 1938 at LON — the moment Wren sights the star. */
export const LST_SIGHTING = 161.7;
/** Hour labels on the fixed mask: 03:00 at the bottom, 15.041° per hour anticlockwise for later times. */
export function hourAngleOnMask(hoursCET: number) {
  return 180 - 15.041 * (hoursCET - 3);
}
/** Day-of-year labels on the rotating disc (disc coordinates). 26 Jan = day 26. */
export function dateAngleOnDisc(dayOfYear: number) {
  return LST_SIGHTING + 180 + 0.98565 * (dayOfYear - 26);
}
/** With the disc rotated so that its LST setting is `lst`, the screen angle of a disc angle. */
export function discToScreen(discAngle: number, lst: number) {
  return discAngle - lst;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function decToRadius(dec: number) {
  return (R_EDGE * (90 - dec)) / (90 - DEC_EDGE);
}

/** Polar position of a star on the disc (disc angle, radius). */
export function starOnDisc(raHours: number, dec: number) {
  return { angle: raHours * 15 + 180, r: decToRadius(dec) };
}

export function polar(cx: number, cy: number, angleDeg: number, r: number) {
  const a = rad(angleDeg);
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/** Convert altitude/azimuth to hour angle & declination for the observing latitude. */
export function altAzToHaDec(alt: number, az: number) {
  const p = rad(LAT);
  const a = rad(alt);
  const A = rad(az);
  const sinDec = Math.sin(p) * Math.sin(a) + Math.cos(p) * Math.cos(a) * Math.cos(A);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const H = Math.atan2(-Math.sin(A) * Math.cos(a), Math.cos(p) * Math.sin(a) - Math.sin(p) * Math.cos(a) * Math.cos(A));
  return { ha: deg(H), dec: deg(dec) };
}

/** Fixed (mask) screen position for an alt/az point: screen angle = 180 − H. */
export function altAzToMask(alt: number, az: number) {
  const { ha, dec } = altAzToHaDec(alt, az);
  return { angle: 180 - ha, r: decToRadius(dec) };
}

export function starAltAz(raHours: number, dec: number, lst: number) {
  const H = rad(lst - raHours * 15);
  const d = rad(dec);
  const p = rad(LAT);
  const alt = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H) * Math.cos(d), Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(H));
  return { alt: deg(alt), az: (deg(az) + 360) % 360 };
}

export interface Star {
  name: string;
  ra: number;
  dec: number;
  mag: number;
  label?: boolean;
  color?: string;
}

export const STARS: Star[] = [
  { name: 'Polaris', ra: 2.53, dec: 89.26, mag: 2.0, label: true },
  { name: 'Dubhe', ra: 11.06, dec: 61.75, mag: 1.8 },
  { name: 'Merak', ra: 11.03, dec: 56.38, mag: 2.4 },
  { name: 'Phecda', ra: 11.9, dec: 53.69, mag: 2.4 },
  { name: 'Megrez', ra: 12.26, dec: 57.03, mag: 3.3 },
  { name: 'Alioth', ra: 12.9, dec: 55.96, mag: 1.8 },
  { name: 'Mizar', ra: 13.4, dec: 54.93, mag: 2.2 },
  { name: 'Alkaid', ra: 13.79, dec: 49.31, mag: 1.9 },
  { name: 'Kochab', ra: 14.85, dec: 74.16, mag: 2.1 },
  { name: 'Capella', ra: 5.28, dec: 46.0, mag: 0.1, label: true, color: '#fff1c4' },
  { name: 'Menkalinan', ra: 6.0, dec: 44.95, mag: 1.9 },
  { name: 'Elnath', ra: 5.44, dec: 28.61, mag: 1.7 },
  { name: 'Castor', ra: 7.58, dec: 31.89, mag: 1.6, label: true },
  { name: 'Pollux', ra: 7.76, dec: 28.03, mag: 1.1, label: true, color: '#ffe0a8' },
  { name: 'Alhena', ra: 6.63, dec: 16.4, mag: 1.9 },
  { name: 'Procyon', ra: 7.66, dec: 5.22, mag: 0.4, label: true, color: '#fff6d6' },
  { name: 'Gomeisa', ra: 7.45, dec: 8.29, mag: 2.9 },
  { name: 'Sirius', ra: 6.75, dec: -16.72, mag: -1.4, label: true, color: '#dff0ff' },
  { name: 'Betelgeuse', ra: 5.92, dec: 7.41, mag: 0.5, label: true, color: '#ffb38a' },
  { name: 'Bellatrix', ra: 5.42, dec: 6.35, mag: 1.6 },
  { name: 'Rigel', ra: 5.24, dec: -8.2, mag: 0.1, label: true, color: '#d6e6ff' },
  { name: 'Mintaka', ra: 5.53, dec: -0.3, mag: 2.2 },
  { name: 'Alnilam', ra: 5.6, dec: -1.2, mag: 1.7 },
  { name: 'Alnitak', ra: 5.68, dec: -1.94, mag: 1.7 },
  { name: 'Saiph', ra: 5.8, dec: -9.67, mag: 2.1 },
  { name: 'Aldebaran', ra: 4.6, dec: 16.51, mag: 0.9, label: true, color: '#ffc59a' },
  { name: 'Regulus', ra: 10.14, dec: 11.97, mag: 1.4, label: true },
  { name: 'Algieba', ra: 10.33, dec: 19.84, mag: 2.0 },
  { name: 'Denebola', ra: 11.82, dec: 14.57, mag: 2.1 },
  { name: 'Alphard', ra: 9.46, dec: -8.66, mag: 2.0 },
  { name: 'Arcturus', ra: 14.26, dec: 19.18, mag: 0.0, label: true, color: '#ffd29a' },
  { name: 'Spica', ra: 13.42, dec: -11.16, mag: 1.0, label: true },
  { name: 'Vega', ra: 18.62, dec: 38.78, mag: 0.0, label: true },
  { name: 'Deneb', ra: 20.69, dec: 45.28, mag: 1.3, label: true },
  { name: 'Altair', ra: 19.85, dec: 8.87, mag: 0.8, label: true },
  { name: 'Caph', ra: 0.15, dec: 59.15, mag: 2.3 },
  { name: 'Schedar', ra: 0.68, dec: 56.54, mag: 2.2 },
  { name: 'Navi', ra: 0.95, dec: 60.72, mag: 2.2 },
  { name: 'Ruchbah', ra: 1.43, dec: 60.24, mag: 2.7 },
  { name: 'Segin', ra: 1.91, dec: 63.67, mag: 3.4 },
  { name: 'Mirfak', ra: 3.41, dec: 49.86, mag: 1.8 },
  { name: 'Algol', ra: 3.14, dec: 40.96, mag: 2.1 },
  { name: 'Hamal', ra: 2.12, dec: 23.46, mag: 2.0 },
  { name: 'Alpheratz', ra: 0.14, dec: 29.09, mag: 2.1 },
  { name: 'Mirach', ra: 1.16, dec: 35.62, mag: 2.1 },
  { name: 'Almach', ra: 2.06, dec: 42.33, mag: 2.1 },
];

export const LINES: [string, string][] = [
  ['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid'],
  ['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Alnitak', 'Saiph'], ['Saiph', 'Rigel'], ['Rigel', 'Mintaka'], ['Alnitak', 'Betelgeuse'],
  ['Castor', 'Pollux'], ['Pollux', 'Alhena'], ['Procyon', 'Gomeisa'],
  ['Capella', 'Menkalinan'], ['Menkalinan', 'Elnath'], ['Elnath', 'Capella'],
  ['Caph', 'Schedar'], ['Schedar', 'Navi'], ['Navi', 'Ruchbah'], ['Ruchbah', 'Segin'],
  ['Regulus', 'Algieba'], ['Algieba', 'Denebola'], ['Denebola', 'Regulus'],
  ['Alpheratz', 'Mirach'], ['Mirach', 'Almach'], ['Mirfak', 'Algol'],
];

/** Horizon outline on the fixed mask (alt = 0 for every azimuth). */
export function horizonOutline(step = 4) {
  const pts: { angle: number; r: number; az: number }[] = [];
  for (let az = 0; az < 360; az += step) pts.push({ ...altAzToMask(0, az), az });
  return pts;
}

/** Points along the azimuth line (alt 90 → 0) for the azimuth arm. */
export function azimuthLine(az: number, step = 6) {
  const pts: { angle: number; r: number }[] = [];
  for (let alt = 90; alt >= 0; alt -= step) pts.push(altAzToMask(alt, az));
  pts.push(altAzToMask(0, az));
  return pts;
}

export const MONTHS: [string, number][] = [
  ['JAN', 1], ['FEB', 32], ['MAR', 60], ['APR', 91], ['MAY', 121], ['JUN', 152], ['JUL', 182], ['AUG', 213], ['SEP', 244], ['OCT', 274], ['NOV', 305], ['DEC', 335],
];
