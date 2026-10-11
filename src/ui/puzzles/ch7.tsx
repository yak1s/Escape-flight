import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { svgPoint } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import { starHeadingOk, LIGHTS, LIGHT_A, LIGHT_B, twoLightsSolved, trueBearing, courseOk, TRUE_COURSE } from '../../puzzles/logic';
import {
  STARS,
  LINES,
  R_EDGE,
  polar,
  starOnDisc,
  discToScreen,
  horizonOutline,
  azimuthLine,
  hourAngleOnMask,
  dateAngleOnDisc,
  MONTHS,
  altAzToMask,
} from '../../puzzles/logic/sky';
import { toSvg, intersect, lightById, PLACES, dir, bearingBetween } from '../../puzzles/logic/map';
import { MapDrawing } from '../../art/docart';
import { useApp } from '../context';
import { prefersReducedMotion } from '../../engine/settings';

// =====================================================================================
// P21 — The star wheel
// =====================================================================================
const CX = 300;
const CY = 300;
export function Planisphere({ saved, save, solve }: PuzzleProps) {
  const s = saved as { lst?: number; az?: number; heading?: number } | undefined;
  const [lst, setLst] = useState(s?.lst ?? 100);
  const [az, setAz] = useState(s?.az ?? 180);
  const [heading, setHeading] = useState(s?.heading ?? 180);
  const [msg, setMsg] = useState('');
  const [drag, setDrag] = useState<null | { kind: 'disc' | 'arm'; a0: number; v0: number }>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const persist = (p: Partial<{ lst: number; az: number; heading: number }>) => save({ lst, az, heading, ...p });
  const horizon = useMemo(() => horizonOutline(3), []);
  const horizonPath = horizon.map((p, i) => {
    const q = polar(CX, CY, p.angle, p.r);
    return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }).join('') + 'Z';
  const arm = azimuthLine(az).map((p, i) => {
    const q = polar(CX, CY, p.angle, p.r);
    return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }).join('');
  const zen = altAzToMask(90, 0);
  const zenPt = polar(CX, CY, zen.angle, zen.r);
  const armEnd = (() => {
    const p = altAzToMask(-4, az);
    return polar(CX, CY, p.angle, p.r);
  })();
  const angleAt = (e: PointerEvent, cx = CX, cy = CY) => {
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    return (Math.atan2(p.x - cx, -(p.y - cy)) * 180) / Math.PI;
  };
  const starPos = (ra: number, dec: number) => {
    const d = starOnDisc(ra, dec);
    return polar(CX, CY, discToScreen(d.angle, lst), d.r);
  };
  const byName = Object.fromEntries(STARS.map((st) => [st.name, st]));
  const fmtTime = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:00`;
  return (
    <>
      <div class="pz-body">
        <svg
          ref={svgRef}
          class="pz-svg"
          viewBox="0 0 600 600"
          style={{ maxWidth: '27rem' }}
          onPointerMove={(e) => {
            if (!drag) return;
            if (drag.kind === 'disc') {
              const d = angleAt(e) - drag.a0;
              const v = Math.round((drag.v0 - d) * 2) / 2;
              setLst(((v % 360) + 360) % 360);
            } else {
              const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
              const ang = (Math.atan2(p.x - zenPt.x, -(p.y - zenPt.y)) * 180) / Math.PI;
              // find the azimuth whose arm end points closest to this screen direction
              let best = az;
              let bestD = 1e9;
              for (let a = 0; a < 360; a += 1) {
                const m = altAzToMask(-4, a);
                const q = polar(CX, CY, m.angle, m.r);
                const qa = (Math.atan2(q.x - zenPt.x, -(q.y - zenPt.y)) * 180) / Math.PI;
                const dd = Math.abs(((qa - ang + 540) % 360) - 180);
                if (dd < bestD) {
                  bestD = dd;
                  best = a;
                }
              }
              setAz(best);
            }
          }}
          onPointerUp={() => {
            if (drag) persist({});
            setDrag(null);
          }}
          onPointerCancel={() => setDrag(null)}
          data-testid="planisphere"
        >
          <defs>
            <mask id="horizonWin">
              <rect width="600" height="600" fill="white" />
              <path d={horizonPath} fill="black" />
            </mask>
          </defs>
          {/* rotating star disc */}
          <g
            onPointerDown={(e) => {
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              setDrag({ kind: 'disc', a0: angleAt(e), v0: lst });
            }}
            style={{ cursor: 'grab' }}
          >
            <circle cx={CX} cy={CY} r={R_EDGE + 44} fill="#d8c79e" stroke="#6b4f22" stroke-width="3" />
            <circle cx={CX} cy={CY} r={R_EDGE} fill="#0b1633" />
            {[60, 30, 0, -30].map((d) => (
              <circle key={d} cx={CX} cy={CY} r={(R_EDGE * (90 - d)) / 130} fill="none" stroke="#1d2c55" />
            ))}
            {LINES.map(([a, b]) => {
              const A = starPos(byName[a].ra, byName[a].dec);
              const B = starPos(byName[b].ra, byName[b].dec);
              return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#4f6aa8" stroke-width="1.5" opacity="0.8" />;
            })}
            {STARS.map((st) => {
              const p = starPos(st.ra, st.dec);
              const r = Math.max(1.6, 5.2 - st.mag * 1.3);
              return (
                <g key={st.name}>
                  <circle cx={p.x} cy={p.y} r={r} fill={st.color || '#f4f6ff'} />
                  {st.label && (
                    <text x={p.x + r + 3} y={p.y + 4} fill="#b9c8ef" font-size="11">
                      {st.name}
                    </text>
                  )}
                </g>
              );
            })}
            {/* date ring on the disc */}
            {Array.from({ length: 365 }, (_, i) => i + 1)
              .filter((d) => d % 5 === 1 || MONTHS.some(([, m]) => m === d))
              .map((d) => {
                const ang = discToScreen(dateAngleOnDisc(d), lst);
                const isMonth = MONTHS.find(([, m]) => m === d);
                const p1 = polar(CX, CY, ang, R_EDGE + 2);
                const p2 = polar(CX, CY, ang, R_EDGE + (isMonth ? 18 : 9));
                const pl = polar(CX, CY, ang + 7, R_EDGE + 30);
                return (
                  <g key={d}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3a2a10" stroke-width={isMonth ? 2 : 1} />
                    {isMonth && (
                      <text x={pl.x} y={pl.y + 4} text-anchor="middle" fill="#3a2a10" font-size="12" font-weight="700">
                        {isMonth[0]}
                      </text>
                    )}
                  </g>
                );
              })}
            {(() => {
              const ang = discToScreen(dateAngleOnDisc(26), lst);
              const p = polar(CX, CY, ang, R_EDGE + 14);
              return <circle cx={p.x} cy={p.y} r="4" fill="#b0222a" />;
            })()}
          </g>
          {/* fixed mask with the horizon window */}
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={CX} cy={CY} r={R_EDGE + 1} fill="#13203f" mask="url(#horizonWin)" opacity="0.93" />
            <path d={horizonPath} fill="none" stroke="#ecd398" stroke-width="2" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
              const m = altAzToMask(-5, a);
              const p = polar(CX, CY, m.angle, m.r);
              return (
                <text key={a} x={p.x} y={p.y + 4} text-anchor="middle" fill="#ecd398" font-size="12" font-weight="700">
                  {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][a / 45]}
                </text>
              );
            })}
          </g>
          {/* hour ring on the outer rim (fixed) */}
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={CX} cy={CY} r={R_EDGE + 44} fill="none" stroke="#6b4f22" stroke-width="3" />
            {Array.from({ length: 24 }, (_, h) => {
              const ang = hourAngleOnMask(h);
              const p1 = polar(CX, CY, ang, R_EDGE + 36);
              const p2 = polar(CX, CY, ang, R_EDGE + 44);
              const pt = polar(CX, CY, ang, R_EDGE + 56);
              return (
                <g key={h}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#ecd398" stroke-width="2" />
                  {h % 3 === 0 && (
                    <text x={pt.x} y={pt.y + 4} text-anchor="middle" fill="#ecd398" font-size="11">
                      {fmtTime(h)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
          {/* azimuth arm */}
          <g
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              setDrag({ kind: 'arm', a0: 0, v0: az });
            }}
            style={{ cursor: 'grab' }}
            data-testid="azimuth-arm"
          >
            <path d={arm} stroke="transparent" stroke-width="30" fill="none" />
            <path d={arm} stroke="#ff7a5a" stroke-width="3" fill="none" stroke-dasharray="6 4" />
            <circle cx={armEnd.x} cy={armEnd.y} r="11" fill="#ff7a5a" stroke="#fff" stroke-width="2" />
          </g>
          <circle cx={zenPt.x} cy={zenPt.y} r="4" fill="#ff7a5a" />
        </svg>
        <div class="grid-tools">
          <span class="chip">Disc: drag to turn · arm: drag the red knob</span>
        </div>
        <div class="knob-row">
          <label>Turn disc</label>
          <div class="stepper">
            <Btn small onClick={() => setLst((lst + 357.5) % 360)} data-testid="disc-ccw">
              ⟲
            </Btn>
            <Btn small onClick={() => setLst((lst + 2.5) % 360)} data-testid="disc-cw">
              ⟳
            </Btn>
          </div>
        </div>
        <div class="knob-row">
          <label>Azimuth arm</label>
          <div class="stepper">
            <Btn small onClick={() => setAz((az + 359) % 360)} data-testid="arm-minus">
              −
            </Btn>
            <span class="val" data-testid="arm-value">
              {az}°
            </span>
            <Btn small onClick={() => setAz((az + 1) % 360)} data-testid="arm-plus">
              +
            </Btn>
          </div>
        </div>
        <div class="knob-row">
          <label>Ship's true heading</label>
          <div class="stepper">
            <Btn small onClick={() => setHeading((heading + 350) % 360)}>
              −10
            </Btn>
            <Btn small onClick={() => setHeading((heading + 359) % 360)} data-testid="heading-minus">
              −
            </Btn>
            <span class="val" data-testid="heading-value">
              {String(heading).padStart(3, '0')}°
            </span>
            <Btn small onClick={() => setHeading((heading + 1) % 360)} data-testid="heading-plus">
              +
            </Btn>
            <Btn small onClick={() => setHeading((heading + 10) % 360)}>
              +10
            </Btn>
          </div>
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="star-tell"
          onClick={() => {
            persist({});
            if (starHeadingOk(heading)) {
              audio.sfx('unlock');
              setTimeout(solve, 500);
            } else {
              audio.sfx('fail', 0.6);
              setMsg('The professor: "That doesn\'t agree with my own sighting. Is the wheel set for 26 January at three o\'clock?"');
            }
          }}
        >
          Tell the professor: {String(heading).padStart(3, '0')}°
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P22 — Two lights
// =====================================================================================
function Flasher({ pattern, color, reduce }: { pattern: number[]; color: string; reduce: boolean }) {
  // pattern: list of [onStart, onEnd] seconds within the period (last entry = period)
  const period = pattern[pattern.length - 1];
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const id = setInterval(() => setT(((performance.now() - start) / 1000) % period), 100);
    return () => clearInterval(id);
  }, [period, reduce]);
  let on = false;
  for (let i = 0; i + 1 < pattern.length - 1; i += 2) if (t >= pattern[i] && t < pattern[i + 1]) on = true;
  return (
    <svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true">
      <circle cx="30" cy="30" r="26" fill="#060912" stroke="#2a3a55" />
      <circle cx="30" cy="30" r={on ? 14 : 4} fill={color} opacity={on ? 1 : 0.15} style={{ transition: 'r 0.1s' }} />
    </svg>
  );
}
export function Lights({ saved, save, solve }: PuzzleProps) {
  const { settings } = useApp();
  const reduce = prefersReducedMotion(settings);
  const s = saved as { a?: string; b?: string; ba?: number; bb?: number } | undefined;
  const [a, setA] = useState(s?.a ?? '');
  const [b, setB] = useState(s?.b ?? '');
  const [ba, setBa] = useState(s?.ba ?? 90);
  const [bb, setBb] = useState(s?.bb ?? 0);
  const [msg, setMsg] = useState('');
  const persist = (p: object) => save({ a, b, ba, bb, ...p });
  const fix = a && b ? intersect(lightById(a), ba, lightById(b), bb) : null;
  const line = (id: string, bearing: number) => {
    const L = lightById(id);
    const d = dir(bearing + 180);
    const p1 = toSvg(L.x, L.y);
    const p2 = toSvg(L.x + d.x * 40, L.y + d.y * 40);
    return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#ff7a5a" stroke-width="2.5" stroke-dasharray="8 5" />;
  };
  const stepper = (val: number, set: (v: number) => void, key: string, tid: string) => (
    <div class="stepper">
      <Btn small onClick={() => { const v = (val + 350) % 360; set(v); persist({ [key]: v }); }}>−10</Btn>
      <Btn small onClick={() => { const v = (val + 359) % 360; set(v); persist({ [key]: v }); }} data-testid={`${tid}-minus`}>−</Btn>
      <span class="val" data-testid={`${tid}-value`}>{String(val).padStart(3, '0')}°</span>
      <Btn small onClick={() => { const v = (val + 1) % 360; set(v); persist({ [key]: v }); }} data-testid={`${tid}-plus`}>+</Btn>
      <Btn small onClick={() => { const v = (val + 10) % 360; set(v); persist({ [key]: v }); }}>+10</Btn>
    </div>
  );
  return (
    <>
      <div class="pz-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: '30rem' }}>
          <div class="panel" style={{ textAlign: 'center' }}>
            <div class="kicker">Light A · compass {LIGHT_A.compass}</div>
            <Flasher pattern={[0, 0.5, 1.2, 1.7, 2.4, 2.9, 15]} color="#fffbe6" reduce={reduce} />
            <select class="btn small" style={{ width: '100%' }} value={a} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; setA(v); persist({ a: v }); }} data-testid="light-a">
              <option value="">Which light?</option>
              {LIGHTS.map((l) => (
                <option value={l.id}>{l.name} ({l.char})</option>
              ))}
            </select>
          </div>
          <div class="panel" style={{ textAlign: 'center' }}>
            <div class="kicker">Light B · compass {LIGHT_B.compass}</div>
            <Flasher pattern={[0, 0.6, 5]} color="#ff5a4a" reduce={reduce} />
            <select class="btn small" style={{ width: '100%' }} value={b} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; setB(v); persist({ b: v }); }} data-testid="light-b">
              <option value="">Which light?</option>
              {LIGHTS.map((l) => (
                <option value={l.id}>{l.name} ({l.char})</option>
              ))}
            </select>
          </div>
        </div>
        <svg class="pz-svg" viewBox="0 0 600 560" data-testid="lights-map">
          <MapDrawing showLabels />
          {a && line(a, ba)}
          {b && line(b, bb)}
          {fix && Math.abs(fix.x) < 30 && Math.abs(fix.y) < 30 && (
            <g>
              <circle cx={toSvg(fix.x, fix.y).x} cy={toSvg(fix.x, fix.y).y} r="10" fill="none" stroke="#7de3b8" stroke-width="3" />
              <text x={toSvg(fix.x, fix.y).x + 14} y={toSvg(fix.x, fix.y).y - 10} fill="#7de3b8" font-size="14">
                fix?
              </text>
            </g>
          )}
        </svg>
        <div class="knob-row">
          <label>True bearing to A</label>
          {stepper(ba, setBa, 'ba', 'bear-a')}
        </div>
        <div class="knob-row">
          <label>True bearing to B</label>
          {stepper(bb, setBb, 'bb', 'bear-b')}
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg || 'Lines are drawn back from each light toward the ship.'}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="lights-fix"
          onClick={() => {
            if (twoLightsSolved(a, b, ba, bb)) {
              audio.sfx('unlock');
              setTimeout(solve, 500);
            } else {
              audio.sfx('fail', 0.6);
              if (a !== LIGHT_A.answer || b !== LIGHT_B.answer) setMsg('The professor: "Check the flash patterns against the light list."');
              else if (ba === LIGHT_A.compass || bb === LIGHT_B.compass) setMsg('The professor: "Those are compass bearings. Correct them for the deviation first."');
              else setMsg('The professor: "Not quite — the lines must run true."');
            }
          }}
        >
          Mark the fix
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P23 — The course
// =====================================================================================
export function Course({ saved, save, solve }: PuzzleProps) {
  const s = saved as { arm?: number; compass?: number } | undefined;
  const [armB, setArmB] = useState(s?.arm ?? 0);
  const [compass, setCompass] = useState(s?.compass ?? 0);
  const [msg, setMsg] = useState('');
  const P = toSvg(0, 0);
  const d = dir(armB);
  const tip = toSvg(d.x * 14, d.y * 14);
  const persist = (p: object) => save({ arm: armB, compass, ...p });
  const towardIce = Math.abs(((armB - bearingBetween(PLACES.P, PLACES.landing) + 540) % 360) - 180) <= 1.5;
  const step = (v: number, set: (n: number) => void, key: string, tid: string, max = 360) => (
    <div class="stepper">
      <Btn small onClick={() => { const n = (v + max - 10) % max; set(n); persist({ [key]: n }); }}>−10</Btn>
      <Btn small onClick={() => { const n = (v + max - 1) % max; set(n); persist({ [key]: n }); }} data-testid={`${tid}-minus`}>−</Btn>
      <span class="val" data-testid={`${tid}-value`}>{String(v).padStart(3, '0')}</span>
      <Btn small onClick={() => { const n = (v + 1) % max; set(n); persist({ [key]: n }); }} data-testid={`${tid}-plus`}>+</Btn>
      <Btn small onClick={() => { const n = (v + 10) % max; set(n); persist({ [key]: n }); }}>+10</Btn>
    </div>
  );
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 560" data-testid="course-map">
          <MapDrawing showLabels showShip />
          {/* protractor */}
          <circle cx={P.x} cy={P.y} r="90" fill="rgba(236,211,152,0.08)" stroke="#ecd398" stroke-width="1.5" />
          {Array.from({ length: 36 }, (_, i) => i * 10).map((b) => {
            const u = dir(b);
            return <line key={b} x1={P.x + u.x * 82} y1={P.y - u.y * 82} x2={P.x + u.x * (b % 30 ? 88 : 92)} y2={P.y - u.y * (b % 30 ? 88 : 92)} stroke="#ecd398" stroke-width="1.5" />;
          })}
          <line x1={P.x} y1={P.y} x2={tip.x} y2={tip.y} stroke={towardIce ? '#7de3b8' : '#ff7a5a'} stroke-width="3" />
          <circle cx={tip.x} cy={tip.y} r="7" fill={towardIce ? '#7de3b8' : '#ff7a5a'} />
          {/* the officers' plan: compass 180 = true 143 */}
          <line x1={P.x} y1={P.y} x2={toSvg(dir(143).x * 10.5, dir(143).y * 10.5).x} y2={toSvg(dir(143).x * 10.5, dir(143).y * 10.5).y} stroke="#ec8a78" stroke-width="2" stroke-dasharray="4 6" opacity="0.7" />
        </svg>
        <div class="knob-row">
          <label>Protractor arm (true)</label>
          {step(armB, setArmB, 'arm', 'arm')}
        </div>
        <div class="knob-row">
          <label>Compass course to steer</label>
          {step(compass, setCompass, 'compass', 'compass')}
        </div>
        <p class="muted" style={{ fontSize: '0.82rem', maxWidth: '30rem', margin: 0 }}>
          Dashed red: Mr Dahl's planned turn to compass 180 at 03:05.
        </p>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="course-tell"
          onClick={() => {
            if (courseOk(compass)) {
              audio.sfx('unlock');
              setTimeout(solve, 500);
            } else {
              audio.sfx('fail', 0.6);
              if (Math.abs(compass - TRUE_COURSE) <= 1) setMsg('Wren: "That\'s true course — Nygaard steers by the compass!"');
              else if (Math.abs(compass - (TRUE_COURSE - 37)) <= 1) setMsg('The professor: "Wrong way round. Tonight the compass reads MORE than true."');
              else setMsg('The professor: "That won\'t take us to the fjord."');
            }
          }}
        >
          Tell Wren: compass {String(compass).padStart(3, '0')}
        </Btn>
      </div>
    </>
  );
}

export { trueBearing };
