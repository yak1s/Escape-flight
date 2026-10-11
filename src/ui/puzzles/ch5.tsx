import { useEffect, useRef, useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import {
  HAND_SAMPLES,
  HAND_ANSWER,
  WAVE_LIMITS,
  WAVE_TARGET,
  waveStatus,
  waveSolved,
  LULLABY_PITCHES,
  LULLABY_PRESENT,
  lullabyInitial,
  lullabySolved,
  broochStep,
  broochOpen,
  type BroochMove,
} from '../../puzzles/logic';
import { HandSample, BirdPlateStaff } from '../../art/docart';
import { useApp } from '../context';
import { prefersReducedMotion } from '../../engine/settings';

// =====================================================================================
// P14 — Sorrel's hand
// =====================================================================================
export function Handwriting({ solve }: PuzzleProps) {
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <div class="pz-body">
        <div class="panel" style={{ background: '#efe6d0', color: '#2a2116' }}>
          <div class="kicker" style={{ color: '#8a6a32' }}>
            The luggage tag
          </div>
          <HandSample id="tag" big />
        </div>
        <div class="option-grid" data-testid="handwriting">
          <div class="kicker">Letters posted aboard — who wrote the tag?</div>
          {HAND_SAMPLES.map((h) => (
            <button
              class={`row ${sel === h.id ? 'new' : ''}`}
              style={{ background: sel === h.id ? 'rgba(125,227,184,.12)' : '#efe6d0', color: '#2a2116', borderColor: sel === h.id ? 'var(--aurora)' : 'transparent', display: 'block' }}
              onClick={() => setSel(h.id)}
              data-testid={`hand-${h.id}`}
            >
              <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a6a32' }}>{h.name}</div>
              <HandSample id={h.id} />
            </button>
          ))}
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          disabled={!sel}
          data-testid="hand-accuse"
          onClick={() => {
            if (sel === HAND_ANSWER) {
              audio.sfx('reveal', 0.7);
              setTimeout(solve, 600);
            } else {
              audio.sfx('fail', 0.6);
              const s = HAND_SAMPLES.find((x) => x.id === sel)!;
              setMsg(s.features.length ? `Close — ${s.name}'s hand shares something with the tag, but not everything. Compare the S, the 9 and the ø.` : `${s.name}'s hand looks nothing like the tag.`);
            }
          }}
        >
          It was written by {sel ? HAND_SAMPLES.find((x) => x.id === sel)!.name : '…'}
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P15 — Standing wave
// =====================================================================================
export function Wave({ saved, save, solve }: PuzzleProps) {
  const { settings } = useApp();
  const init = (saved as { freq: number; amp: number; phase: number }) || { freq: 4, amp: 2, phase: 0 };
  const [s, setS] = useState(init);
  const [t, setT] = useState(0);
  const [msg, setMsg] = useState('');
  const raf = useRef(0);
  const reduce = prefersReducedMotion(settings);
  useEffect(() => {
    if (reduce) {
      setT(0.12);
      return;
    }
    let start = performance.now();
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [reduce]);
  const st = waveStatus(s);
  const set = (k: 'freq' | 'amp' | 'phase', d: number) => {
    const [lo, hi] = WAVE_LIMITS[k];
    const stepv = k === 'phase' ? 30 : 1;
    let v = s[k] + d * stepv;
    if (k === 'phase') v = ((v % 360) + 360) % 360;
    else v = Math.max(lo, Math.min(hi, v));
    const next = { ...s, [k]: v };
    setS(next);
    save(next);
    audio.sfx('gear', 0.3);
    setMsg('');
  };
  const W = 560;
  const MID = 130;
  const k = Math.PI * WAVE_TARGET.freq;
  const kb = Math.PI * s.freq;
  const w = 2.2;
  const ph = (s.phase * Math.PI) / 180;
  const A = WAVE_TARGET.amp * 9;
  const B = s.amp * 9;
  const path = (fn: (x: number) => number) =>
    Array.from({ length: 141 }, (_, i) => {
      const x = i / 140;
      return `${i ? 'L' : 'M'}${(20 + x * W).toFixed(1)} ${(MID - fn(x)).toFixed(1)}`;
    }).join('');
  const inc = (x: number) => A * Math.sin(k * x - w * t);
  const ref = (x: number) => B * Math.sin(kb * x + w * t + ph);
  const pins = Array.from({ length: 7 }, (_, i) => (12 * (i + 1) - 7) / 84);
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 270" data-testid="wave">
          <rect width="600" height="270" rx="16" fill="#06140f" stroke="#2f6f7e" stroke-width="3" />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={20 + (i * W) / 10} y1="20" x2={20 + (i * W) / 10} y2="240" stroke="#123326" />
          ))}
          <line x1="20" y1={MID} x2={20 + W} y2={MID} stroke="#1f4d3c" />
          {pins.map((p, i) => (
            <g key={i}>
              <rect x={20 + p * W - 4} y={MID - 6} width="8" height="12" rx="2" fill="#c9a45c" />
              <line x1={20 + p * W} y1={MID + 8} x2={20 + p * W} y2="236" stroke="#c9a45c" stroke-dasharray="3 5" opacity="0.4" />
            </g>
          ))}
          <path d={path(inc)} stroke="#59c9e8" stroke-width="2" fill="none" opacity="0.5" />
          <path d={path(ref)} stroke="#a597ff" stroke-width="2" fill="none" opacity="0.5" />
          <path d={path((x) => inc(x) + ref(x))} stroke="#7de3b8" stroke-width="4" fill="none" />
          <text x="30" y="258" fill="#59c9e8" font-size="13">
            incoming (1938)
          </text>
          <text x="200" y="258" fill="#a597ff" font-size="13">
            yours (1989)
          </text>
          <text x="350" y="258" fill="#7de3b8" font-size="13">
            combined
          </text>
        </svg>
        <div class="grid-tools">
          <span class={`chip ${st.freq ? 'ok' : ''}`}>{st.freq ? '✓' : '·'} pattern steady</span>
          <span class={`chip ${st.freq && st.amp ? 'ok' : ''}`}>{st.freq && st.amp ? '✓' : '·'} nodes still</span>
          <span class={`chip ${st.freq && st.phase ? 'ok' : ''}`}>{st.freq && st.phase ? '✓' : '·'} nodes on pins</span>
        </div>
        {(['freq', 'amp', 'phase'] as const).map((key) => (
          <div class="knob-row">
            <label>{key === 'freq' ? 'Frequency' : key === 'amp' ? 'Amplitude' : 'Phase'}</label>
            <div class="stepper">
              <Btn small onClick={() => set(key, -1)} data-testid={`wave-${key}-down`}>
                −
              </Btn>
              <span class="val" data-testid={`wave-${key}`}>
                {s[key]}
                {key === 'phase' ? '°' : ''}
              </span>
              <Btn small onClick={() => set(key, 1)} data-testid={`wave-${key}-up`}>
                +
              </Btn>
            </div>
          </div>
        ))}
        <div class="panel" style={{ fontSize: '0.82rem' }}>
          <div class="kicker">Your frozen receiver, 1989</div>
          Frequency needle frozen at <b>7</b> · amplitude glass frosted over · phase needle snapped off
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="wave-lock"
          onClick={() => {
            if (waveSolved(s)) {
              audio.sfx('shimmer');
              setTimeout(solve, 600);
            } else {
              audio.sfx('static_burst', 0.4);
              setMsg('The professor: "Not yet — the wave is not standing cleanly."');
            }
          }}
        >
          Lock the receiver
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P16 — The singing bird (music cylinder)
// =====================================================================================
const NOTE_FILE: Record<string, string> = { E4: 'box_E4', G4: 'box_G4', A4: 'box_A4', B4: 'box_B4', C5: 'box_C5', D5: 'box_D5', E5: 'box_E5' };
export function Lullaby({ saved, save, solve }: PuzzleProps) {
  const [pins, setPins] = useState<(string | null)[]>((saved as { pins?: (string | null)[] })?.pins || lullabyInitial());
  const [playing, setPlaying] = useState(-1);
  const [msg, setMsg] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const toggle = (col: number, pitch: string) => {
    if (LULLABY_PRESENT.includes(col) || playing >= 0) return;
    const next = [...pins];
    next[col] = next[col] === pitch ? null : pitch;
    setPins(next);
    save({ pins: next });
    if (next[col]) audio.sfx(NOTE_FILE[pitch], 0.8);
  };
  const play = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    pins.forEach((p, i) => {
      timers.current.push(
        setTimeout(() => {
          setPlaying(i);
          if (p) audio.sfx(NOTE_FILE[p], 0.9);
        }, i * 390),
      );
    });
    timers.current.push(
      setTimeout(() => {
        setPlaying(-1);
        if (lullabySolved(pins)) {
          setMsg('');
          setTimeout(solve, 300);
        } else setMsg(pins.some((p) => !p) ? 'Gaps in the tune — some columns have no pin.' : 'The bird stays silent. That isn\'t quite the tune.');
      }, 16 * 390 + 200),
    );
  };
  const CW = 34;
  const RH = 34;
  const X0 = 60;
  const Y0 = 20;
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 620 290" data-testid="lullaby">
          <rect x="40" y="6" width="570" height="270" rx="16" fill="#3a2a18" stroke="#c9a45c" stroke-width="3" />
          {LULLABY_PITCHES.map((p, r) => (
            <g key={p}>
              <text x="30" y={Y0 + r * RH + RH / 2 + 6} text-anchor="end" fill="#ecd398" font-size="15" font-family="Special Elite, monospace">
                {p.replace(/\d/, '')}
                <tspan font-size="10">{p.slice(-1)}</tspan>
              </text>
              <line x1={X0} y1={Y0 + r * RH + RH / 2} x2={X0 + 16 * CW} y2={Y0 + r * RH + RH / 2} stroke="#7a5a26" stroke-width="2" />
            </g>
          ))}
          {pins.map((p, col) => (
            <g key={col}>
              <rect x={X0 + col * CW + 1} y={Y0 - 4} width={CW - 2} height={RH * 7 + 8} rx="4" fill={playing === col ? 'rgba(125,227,184,.25)' : col % 2 ? 'rgba(0,0,0,.12)' : 'transparent'} />
              {LULLABY_PITCHES.map((pitch, r) => (
                <g key={pitch} onClick={() => toggle(col, pitch)} style={{ cursor: LULLABY_PRESENT.includes(col) ? 'default' : 'pointer' }} data-testid={`pin-${col}-${pitch}`}>
                  <rect x={X0 + col * CW + 2} y={Y0 + r * RH + 1} width={CW - 4} height={RH - 2} fill="transparent" />
                  {p === pitch && <circle cx={X0 + col * CW + CW / 2} cy={Y0 + r * RH + RH / 2} r="11" fill={LULLABY_PRESENT.includes(col) ? '#b08a3e' : '#ecd398'} stroke="#2a1d08" stroke-width="2" />}
                </g>
              ))}
              <text x={X0 + col * CW + CW / 2} y={Y0 + RH * 7 + 22} text-anchor="middle" fill="#9ba8bd" font-size="12">
                {col + 1}
              </text>
            </g>
          ))}
        </svg>
        <div class="panel" style={{ background: '#2b2016' }}>
          <div class="kicker">Engraved on the base plate</div>
          <BirdPlateStaff />
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg || 'Old brass pins are fixed. Tap a cell in an empty column to place a new pin.'}
      </div>
      <div class="pz-foot">
        <Btn kind="primary" onClick={play} disabled={playing >= 0} data-testid="lullaby-play">
          Wind &amp; play
        </Btn>
      </div>
    </>
  );
}

// =====================================================================================
// P17 — The brass wren (puzzle box)
// =====================================================================================
export function Brooch({ saved, save, solve }: PuzzleProps) {
  const [progress, setProgress] = useState<number>((saved as { p?: number })?.p ?? 0);
  const [tail, setTail] = useState(0);
  const [msg, setMsg] = useState('');
  const open = broochOpen(progress);
  const act = (m: BroochMove) => {
    if (open) return;
    const next = broochStep(progress, m);
    const advanced = next > progress;
    if (m === 'tail') setTail((x) => x + 1);
    setProgress(next);
    save({ p: next });
    if (broochOpen(next)) {
      audio.sfx('unlock');
      setMsg('');
      setTimeout(solve, 1400);
    } else if (advanced) {
      audio.sfx('gear', 0.6);
      setMsg(m === 'tail' ? 'Click. The tail turns a full circle with the tiny key.' : 'Something inside gives a tiny click.');
    } else {
      audio.sfx('card', 0.7);
      if (m !== 'tail') setTail(0);
      setMsg(m === 'wingR' ? 'The wing lifts, then clacks back. Nothing opens.' : 'A soft clack — the mechanism has reset.');
    }
  };
  const crestBack = progress >= 1;
  const eyeIn = progress >= 2;
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 520" style={{ maxWidth: '26rem' }} data-testid="brooch">
          <defs>
            <radialGradient id="brass" cx="0.4" cy="0.3" r="0.8">
              <stop offset="0" stop-color="#f7e2a8" />
              <stop offset="0.5" stop-color="#c9a45c" />
              <stop offset="1" stop-color="#7a5a26" />
            </radialGradient>
          </defs>
          <rect width="600" height="520" rx="20" fill="#0e1424" />
          {/* wings: viewer-left is the bird's RIGHT wing; viewer-right is the bird's LEFT wing */}
          <g onClick={() => act('wingR')} style={{ cursor: 'pointer' }} data-testid="brooch-wingR">
            <path d="M270 250 C 180 170, 90 170, 40 220 C 90 230, 120 250, 130 270 C 160 268, 200 280, 270 300 Z" fill="url(#brass)" stroke="#5a4218" stroke-width="3" />
            <path d="M80 222 C 140 230, 190 250, 250 268 M110 245 C 160 252, 200 266, 250 282" stroke="#7a5a26" stroke-width="2" fill="none" />
          </g>
          <g
            onClick={() => act('wingL')}
            style={{ cursor: 'pointer', transformOrigin: '330px 270px', transform: open ? 'rotate(-28deg)' : 'none', transition: 'transform 0.6s' }}
            data-testid="brooch-wingL"
          >
            <path d="M330 250 C 420 170, 510 170, 560 220 C 510 230, 480 250, 470 270 C 440 268, 400 280, 330 300 Z" fill="url(#brass)" stroke="#5a4218" stroke-width="3" />
            <path d="M520 222 C 460 230, 410 250, 350 268 M490 245 C 440 252, 400 266, 350 282" stroke="#7a5a26" stroke-width="2" fill="none" />
            <path d="M335 255 l6 40" stroke="#3a2a10" stroke-width="1.5" />
          </g>
          {/* body (breast opens) */}
          <g>
            <ellipse cx="300" cy="300" rx="62" ry="88" fill="url(#brass)" stroke="#5a4218" stroke-width="3" />
            {open && (
              <g>
                <ellipse cx="300" cy="300" rx="50" ry="74" fill="#2a1d0a" />
                <rect x="276" y="282" width="48" height="36" rx="3" fill="#e8d9a8" transform="rotate(-6 300 300)" />
              </g>
            )}
            <path d="M262 300 q38 30 76 0 M268 330 q32 24 64 0" stroke="#7a5a26" stroke-width="2" fill="none" />
          </g>
          {/* tail */}
          <g onClick={() => act('tail')} style={{ cursor: 'pointer' }} data-testid="brooch-tail">
            <g style={{ transformOrigin: '300px 392px', transform: `rotate(${tail * 360}deg)`, transition: 'transform 0.7s' }}>
              <path d="M300 380 L262 470 Q300 455 338 470 Z" fill="url(#brass)" stroke="#5a4218" stroke-width="3" />
            </g>
            <circle cx="300" cy="392" r="7" fill="#1a1206" />
            <rect x="298" y="392" width="4" height="9" fill="#1a1206" />
          </g>
          {/* feet */}
          <g onClick={() => act('feet')} style={{ cursor: 'pointer' }} data-testid="brooch-feet">
            <path d="M282 380 l-10 24 M282 380 l2 26 M318 380 l10 24 M318 380 l-2 26" stroke="#7a5a26" stroke-width="5" stroke-linecap="round" />
          </g>
          {/* head turned to the bird's right (viewer's left) */}
          <circle cx="282" cy="196" r="40" fill="url(#brass)" stroke="#5a4218" stroke-width="3" />
          <path d="M246 196 L214 206 L246 212 Z" fill="#b08a3e" stroke="#5a4218" stroke-width="2" />
          <g onClick={() => act('eye')} style={{ cursor: 'pointer' }} data-testid="brooch-eye">
            <circle cx="270" cy="188" r="16" fill="transparent" />
            <circle cx="270" cy="188" r={eyeIn ? 5 : 7} fill="#101010" stroke="#f3dca4" stroke-width="2" />
          </g>
          <g onClick={() => act('crest')} style={{ cursor: 'pointer' }} data-testid="brooch-crest">
            <path d={crestBack ? 'M300 150 q20 -16 34 -6 q-12 2 -20 14 Z' : 'M280 156 q10 -30 30 -32 q-6 14 -10 34 Z'} fill="url(#brass)" stroke="#5a4218" stroke-width="2.5" style={{ transition: 'd 0.4s' }} />
            <rect x="270" y="110" width="80" height="56" fill="transparent" />
          </g>
          <text x="300" y="506" text-anchor="middle" fill="#9ba8bd" font-size="15">
            The bird faces you.
          </text>
        </svg>
      </div>
      <div class="pz-feedback" data-testid="pz-feedback">
        {open ? 'The breast swings open on a tiny hinge…' : msg || 'Tap a part of the brooch to work it.'}
      </div>
    </>
  );
}
