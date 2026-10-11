import { useState } from 'preact/hooks';
import type { PuzzleProps } from './types';
import { Btn } from '../kit';
import { audio } from '../../engine/audio';
import { useGame } from '../context';
import {
  cardCheck,
  upsideDown,
  type CardSpec,
  DESCENT,
  terrainAt,
  altitudeAt,
  descentCheck,
  landingCheck,
  ENGINES,
  type EngineId,
  type Order,
} from '../../puzzles/logic';

type Phase = 'decide' | 'card' | 'record-fail' | 'descent' | 'landing';
const ORDERS: { v: Order; t: string }[] = [
  { v: -1, t: 'Full astern' },
  { v: -0.5, t: 'Half astern' },
  { v: 0, t: 'Stop' },
  { v: 0.5, t: 'Half ahead' },
  { v: 1, t: 'Full ahead' },
];
const ENGINE_NAMES: Record<EngineId, string> = { PF: 'Port forward', SF: 'Starboard forward', PA: 'Port aft', SA: 'Starboard aft' };

export function Finale({ saved, save, solve }: PuzzleProps) {
  const { store, state } = useGame();
  const s = (saved as { phase?: Phase; card?: CardSpec; start?: number; rate?: number; orders?: Record<EngineId, Order> }) || {};
  const [phase, setPhase] = useState<Phase>(s.phase || 'decide');
  const [card, setCard] = useState<CardSpec>(s.card || { digits: '000', words: false, underline: false, degree: false, compassWord: false, aloud: false });
  const [flip, setFlip] = useState(false);
  const [start, setStart] = useState(s.start ?? 1);
  const [rate, setRate] = useState(s.rate ?? 140);
  const [orders, setOrders] = useState<Record<EngineId, Order>>(s.orders || { PF: 1, SF: 1, PA: 1, SA: 1 });
  const [msg, setMsg] = useState('');
  const persist = (p: object) => save({ phase, card, start, rate, orders, ...p });
  const go = (p: Phase) => {
    setPhase(p);
    setMsg('');
    persist({ phase: p });
  };

  if (phase === 'decide')
    return (
      <div class="pz-body" style={{ justifyContent: 'center' }}>
        <div class="panel" style={{ maxWidth: '30rem' }}>
          <p class="prose" style={{ marginTop: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
            "Now it is your turn to choose." Wren is waiting on the line with the card in her hand.
          </p>
        </div>
        <div class="option-grid">
          <Btn kind="primary" onClick={() => go('card')} data-testid="decide-rewrite">
            Rewrite the night
          </Btn>
          <Btn
            kind="ghost"
            data-testid="decide-record"
            onClick={() => {
              if (state.dialogues.includes('c9-record')) store.dispatch({ type: 'effects', effects: [{ ending: 'record' }] });
              else store.dispatch({ type: 'effects', effects: [{ say: 'c9-record' }] });
              store.dispatch({ type: 'puzzleState', id: 'P27', data: { ...s, phase: 'decide' } });
            }}
          >
            Let the record stand
          </Btn>
          <p class="muted" style={{ fontSize: '0.85rem' }}>
            If you let the record stand, you can come back to this decision afterwards.
          </p>
        </div>
      </div>
    );

  if (phase === 'record-fail')
    return (
      <div class="pz-body" style={{ justifyContent: 'center', textAlign: 'center' }} data-testid="record-fail">
        <p class="prose" style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', maxWidth: '28rem' }}>
          03:05. Nygaard takes the card from across the chart table and reads it out: "One-eight-zero, sir — the turn for Bergen." It is exactly what everyone in the control car expects to hear.
        </p>
        <p class="prose" style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', maxWidth: '28rem' }}>
          The Albatross swings south, toward the Ravnkammen ridge…
        </p>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--danger)', margin: '8px 0' }}>The record holds.</h3>
        <p class="muted">But it is not 03:05 yet. Not on Wren's clock. Not on yours.</p>
        <Btn kind="primary" onClick={() => go('card')} data-testid="record-again">
          No. Again.
        </Btn>
      </div>
    );

  if (phase === 'card') {
    const digits = card.digits.padStart(3, '0');
    const setDigit = (i: number, d: number) => {
      const arr = digits.split('');
      arr[i] = String((Number(arr[i]) + d + 10) % 10);
      const next = { ...card, digits: arr.join('') };
      setCard(next);
      persist({ card: next });
    };
    const toggle = (k: keyof CardSpec) => {
      const next = { ...card, [k]: !card[k] };
      setCard(next);
      persist({ card: next });
    };
    const flipped = upsideDown(digits);
    return (
      <>
        <div class="pz-body">
          <svg class="pz-svg" viewBox="0 0 600 300" style={{ maxWidth: '26rem' }} data-testid="card-preview">
            <rect width="600" height="300" fill="#0e1424" />
            <g style={{ transformOrigin: '300px 150px', transform: flip ? 'rotate(180deg)' : 'none', transition: 'transform 0.6s' }}>
              <rect x="100" y="40" width="400" height="220" rx="8" fill="#f1e8d4" stroke="#8a6a32" stroke-width="3" />
              <text x="300" y={card.words ? 140 : 175} text-anchor="middle" font-size={card.words ? 64 : 110} fill="#2a2116" font-family="Caveat, cursive" font-weight="600">
                {digits}
                {card.degree ? '°' : ''}
              </text>
              {card.underline && <line x1="190" y1={card.words ? 152 : 192} x2="410" y2={card.words ? 152 : 192} stroke="#2a2116" stroke-width="6" />}
              {card.words && (
                <text x="300" y="215" text-anchor="middle" font-size="40" fill="#2a2116" font-family="Caveat, cursive" font-weight="600">
                  EIGHTY-ONE
                </text>
              )}
              {card.compassWord && (
                <text x="300" y="248" text-anchor="middle" font-size="22" fill="#2a2116" font-family="Caveat, cursive">
                  by compass
                </text>
              )}
            </g>
            <text x="300" y="290" text-anchor="middle" fill="#9ba8bd" font-size="15">
              {flip ? "Nygaard's side of the chart table" : "Wren's side"}
            </text>
          </svg>
          <Btn small kind="ghost" onClick={() => setFlip(!flip)} data-testid="card-flip">
            {flip ? 'Back to Wren\'s side' : 'See it from the helmsman\'s side'}
          </Btn>
          <div class="panel">
            <div class="kicker">The course, by compass</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '8px 0' }}>
              {[0, 1, 2].map((i) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Btn small onClick={() => setDigit(i, 1)} data-testid={`digit-${i}-up`}>
                    ▲
                  </Btn>
                  <span class="val" style={{ fontFamily: 'var(--font-typed)', fontSize: '2rem', color: 'var(--brass-hi)' }} data-testid={`digit-${i}`}>
                    {digits[i]}
                  </span>
                  <Btn small onClick={() => setDigit(i, -1)} data-testid={`digit-${i}-down`}>
                    ▼
                  </Btn>
                </div>
              ))}
            </div>
            <div class="kicker" style={{ marginTop: 6 }}>
              How should Wren write it?
            </div>
            {(
              [
                ['words', 'Also write it out in words'],
                ['underline', 'Underline the figures'],
                ['degree', 'Add a degree sign'],
                ['compassWord', 'Add "by compass"'],
                ['aloud', 'Read it aloud to Nygaard and make him repeat it'],
              ] as [keyof CardSpec, string][]
            ).map(([k, t]) => (
              <label class="setting" style={{ cursor: 'pointer' }}>
                <span class="lbl">{t}</span>
                <input type="checkbox" class="toggle" checked={Boolean(card[k])} onChange={() => toggle(k)} data-testid={`card-${k}`} />
              </label>
            ))}
            {flip && flipped && !card.words && !card.underline && <p class="muted" style={{ fontSize: '0.85rem' }}>From his side the figures read: {flipped}</p>}
          </div>
        </div>
        <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
          {msg}
        </div>
        <div class="pz-foot">
          <Btn
            kind="primary"
            data-testid="card-give"
            onClick={() => {
              const r = cardCheck(card);
              if (r.ok) {
                audio.sfx('card');
                go('descent');
              } else if (r.reason === 'ambiguous') {
                audio.sfx('reveal');
                go('record-fail');
              } else if (r.reason === 'true-course') setMsg('Wren: "Forty-four is TRUE course. Nygaard steers by the compass, Sparks."');
              else setMsg('The professor: "That is not the course we worked out. Check your journal."');
            }}
          >
            Tell Wren to give Nygaard the card
          </Btn>
        </div>
      </>
    );
  }

  if (phase === 'descent') {
    const W = 560;
    const H = 260;
    const kx = (km: number) => 20 + (km / DESCENT.routeKm) * W;
    const ay = (alt: number) => 20 + H - (alt / 1700) * H;
    const terrain = Array.from({ length: 121 }, (_, i) => {
      const km = (i / 120) * DESCENT.routeKm;
      return `${kx(km).toFixed(1)},${ay(terrainAt(km)).toFixed(1)}`;
    });
    const path = Array.from({ length: 121 }, (_, i) => {
      const km = (i / 120) * DESCENT.routeKm;
      return `${kx(km).toFixed(1)},${ay(altitudeAt(km, start, rate)).toFixed(1)}`;
    });
    const r = descentCheck(start, rate);
    return (
      <>
        <div class="pz-body">
          <svg class="pz-svg" viewBox="0 0 600 320" data-testid="descent">
            <rect width="600" height="320" rx="14" fill="#0b1626" />
            <polygon points={`${kx(0)},${ay(0)} ${terrain.join(' ')} ${kx(DESCENT.routeKm)},${ay(0)}`} fill="#3c4a5c" />
            <rect x={kx(DESCENT.fjordStartKm)} y={ay(0) - 6} width={kx(DESCENT.landingEndKm) - kx(DESCENT.fjordStartKm)} height="8" fill="#dcecf2" />
            <text x={(kx(DESCENT.fjordStartKm) + kx(DESCENT.landingEndKm)) / 2} y={ay(0) - 12} text-anchor="middle" fill="#dcecf2" font-size="13">
              Kvitfjord ice
            </text>
            <text x={kx(DESCENT.saddleKm)} y={ay(DESCENT.saddleAlt) - 10} text-anchor="middle" fill="#ecd398" font-size="13">
              Skarv saddle 1,240 m
            </text>
            <polyline points={path.join(' ')} fill="none" stroke={r.ok ? '#7de3b8' : '#ff7a5a'} stroke-width="3" />
            <circle cx={kx(start)} cy={ay(DESCENT.shipAlt)} r="7" fill="#ecd398" />
            {[0, 2, 4, 6, 8, 10, 12].map((k) => (
              <text key={k} x={kx(k)} y="312" text-anchor="middle" fill="#9ba8bd" font-size="12">
                {k} km
              </text>
            ))}
            <text x="24" y={ay(DESCENT.shipAlt) - 8} fill="#9ba8bd" font-size="12">
              Albatross 1,460 m
            </text>
          </svg>
          <div class="knob-row">
            <label>Begin venting at</label>
            <span class="chip" data-testid="descent-start">
              km {start.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={8}
            step={0.25}
            value={start}
            aria-label="Kilometre to begin descent"
            data-testid="descent-slider"
            onInput={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              setStart(v);
              persist({ start: v });
            }}
          />
          <div class="knob-row">
            <label>Vent cell 7</label>
            <div class="seg" role="radiogroup" aria-label="Vent rate">
              {DESCENT.rates.map((rv, i) => (
                <button
                  class={rate === rv ? 'on' : ''}
                  onClick={() => {
                    setRate(rv);
                    persist({ rate: rv });
                  }}
                  data-testid={`rate-${rv}`}
                >
                  {['¼', '½', '¾', 'full'][i]}
                </button>
              ))}
            </div>
          </div>
          <p class="muted" style={{ fontSize: '0.82rem', maxWidth: '30rem', margin: 0 }}>
            Professor's figures: venting cell 7 a quarter, half, three-quarters or fully open loses 70, 140, 210 or 280 metres per kilometre flown. Keep at least 60 m above the ground until the ice.
          </p>
        </div>
        <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
          {msg}
        </div>
        <div class="pz-foot">
          <Btn
            kind="primary"
            data-testid="descent-go"
            onClick={() => {
              if (r.ok) {
                audio.sfx('hiss');
                go('landing');
              } else {
                audio.sfx('fail', 0.6);
                setMsg(
                  r.reason === 'saddle'
                    ? 'The professor: "We would hit the saddle. Not so early."'
                    : r.reason === 'terrain'
                      ? 'The professor: "Too steep against the far slope — we would strike the mountainside."'
                      : r.reason === 'early'
                        ? 'The professor: "We would come down before the fjord."'
                        : 'The professor: "Too late — we would overshoot the ice into the far shore."',
                );
              }
            }}
          >
            Begin the descent
          </Btn>
        </div>
      </>
    );
  }

  // landing
  const r = landingCheck(orders);
  const set = (e: EngineId, v: Order) => {
    const next = { ...orders, [e]: v };
    setOrders(next);
    persist({ orders: next });
    audio.sfx('bell', 0.25);
  };
  return (
    <>
      <div class="pz-body">
        <svg class="pz-svg" viewBox="0 0 600 300" data-testid="landing">
          <rect width="600" height="300" rx="14" fill="#0b1626" />
          <g transform="translate(300 150)">
            <path d="M-210 0 C -190 -48, 190 -48, 230 0 C 190 48, -190 48, -210 0 Z" fill="#1d3550" stroke="#9fc9d6" stroke-width="2" />
            <text x="220" y="-30" fill="#9fc9d6" font-size="12">
              BOW
            </text>
            {(
              [
                ['PF', 80, -52],
                ['SF', 80, 52],
                ['PA', -120, -52],
                ['SA', -120, 52],
              ] as [EngineId, number, number][]
            ).map(([e, x, y]) => {
              const o = orders[e];
              return (
                <g key={e}>
                  <rect x={x - 22} y={y - 12} width="44" height="24" rx="8" fill="#2a3a55" stroke="#ecd398" />
                  <text x={x} y={y + 5} text-anchor="middle" fill="#ecd398" font-size="12">
                    {e}
                  </text>
                  {o !== 0 && <line x1={x} y1={y} x2={x + o * 50} y2={y} stroke={o > 0 ? '#7de3b8' : '#ff9a7a'} stroke-width="4" markerEnd="url(#arrow)" />}
                </g>
              );
            })}
          </g>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="#ecd398" />
            </marker>
          </defs>
          <g transform="translate(70 60)">
            <text x="0" y="-10" fill="#dcecf2" font-size="13">
              Wind from the NW
            </text>
            <line x1="0" y1="0" x2="40" y2="40" stroke="#dcecf2" stroke-width="3" markerEnd="url(#arrow)" />
          </g>
          <text x="300" y="285" text-anchor="middle" fill="#9ba8bd" font-size="13">
            Heading 044°. To land, swing the bow to port into the wind and stop.
          </text>
        </svg>
        <div class="panel">
          {ENGINES.map((e) => (
            <div class="setting" style={{ flexWrap: 'wrap' }}>
              <div class="lbl">{ENGINE_NAMES[e]}</div>
              <select
                class="btn small"
                value={String(orders[e])}
                onChange={(ev) => set(e, Number((ev.target as HTMLSelectElement).value) as Order)}
                data-testid={`tel-${e}`}
                aria-label={`${ENGINE_NAMES[e]} telegraph`}
              >
                {ORDERS.map((o) => (
                  <option value={String(o.v)}>{o.t}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div class={`pz-feedback ${msg ? 'err' : ''}`} data-testid="pz-feedback">
        {msg}
      </div>
      <div class="pz-foot">
        <Btn
          kind="primary"
          data-testid="landing-ring"
          onClick={() => {
            if (r.ok) {
              audio.sfx('bell');
              setTimeout(solve, 900);
            } else {
              audio.sfx('fail', 0.6);
              const m: Record<string, string> = {
                'wrong-way': 'Haugen: "That swings her to starboard — away from the wind!"',
                'dead-engine': 'Haugen: "The starboard forward car is dead, miss — has been since one o\'clock!"',
                weak: 'Haugen: "Not enough turn — she won\'t come round in time. Use the aft cars, they have the leverage."',
                'too-fast': 'Haugen: "We\'ll still be driving forward — we\'ll overrun the ice."',
                reversing: 'Haugen: "Too much astern — we\'ll back into the hills."',
              };
              setMsg(m[r.reason] || 'Haugen shakes his head.');
            }
          }}
        >
          Ring the telegraphs
        </Btn>
      </div>
    </>
  );
}
