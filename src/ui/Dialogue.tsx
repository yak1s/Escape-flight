import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApp, useGame } from './context';
import { Btn } from './kit';
import { dialogueById } from '../content';
import { DialogueRunner, type Step } from '../engine/dialogue';
import { test } from '../engine/state';
import { audio } from '../engine/audio';

type Shown = Exclude<Step, { kind: 'fx' }>;

/**
 * Plays a radio conversation. In replay mode (from the Radio Log) nothing is applied to the game;
 * otherwise mid-dialogue effects apply as they occur and completion is recorded and saved.
 */
export function DialogueOverlay({ id, replay = false, onDone }: { id: string; replay?: boolean; onDone: () => void }) {
  const { state, store } = useGame();
  const { settings } = useApp();
  const def = dialogueById(id);
  const runner = useMemo(() => new DialogueRunner(def, (c) => test(store.state, c)), [def]);
  const [step, setStep] = useState<Shown | null>(null);
  const [retry, setRetry] = useState(false);
  const fxCount = useRef(0);
  const finished = useRef(false);

  const advance = () => {
    for (let guard = 0; guard < 50; guard += 1) {
      const s = runner.next();
      if (!s) {
        finish();
        return;
      }
      if (s.kind === 'fx') {
        fxCount.current += 1;
        if (!replay) store.dispatch({ type: 'effects', effects: s.effects, once: `fx:${id}:${fxCount.current}` });
        continue;
      }
      setStep(s);
      if (s.kind === 'line' && s.speaker === 'wren' && settings.staticNoise && Math.random() < 0.18) audio.sfx('static_burst', 0.12);
      return;
    }
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setStep(null);
    audio.sfx('squelch', 0.4);
    if (!replay) store.dispatch({ type: 'dialogueDone', id, choices: runner.choices, effects: runner.choiceEffects });
    onDone();
  };

  useEffect(() => {
    audio.sfx('squelch', 0.45);
    advance();
  }, []);

  const skipToChoice = () => {
    if (step && step.kind !== 'line') return;
    for (let guard = 0; guard < 200; guard += 1) {
      const s = runner.next();
      if (!s) return finish();
      if (s.kind === 'fx') {
        fxCount.current += 1;
        if (!replay) store.dispatch({ type: 'effects', effects: s.effects, once: `fx:${id}:${fxCount.current}` });
        continue;
      }
      if (s.kind !== 'line') {
        setStep(s);
        return;
      }
    }
  };

  if (!step) return null;
  const whoClass = step.kind === 'line' ? (step.speaker === 'you' ? 'you' : step.speaker === 'other' ? 'other' : '') : '';
  return (
    <div class="dialogue" data-testid="dialogue" data-dialogue={id}>
      <div class="dlg-panel">
        <div class="dlg-head">
          <span class="wave-ind" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span class="title">{replay ? `Replay · ${def.title}` : def.title}</span>
          <span>{def.time ? `${def.time}` : ''}</span>
        </div>
        {step.kind === 'line' && (
          <div
            class="dlg-card"
            role="button"
            tabIndex={0}
            aria-live="polite"
            data-testid="dlg-next"
            onClick={() => {
              audio.sfx('ui_tap', 0.35);
              advance();
            }}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && advance()}
          >
            {step.speaker !== 'narration' && <div class={`who ${whoClass}`}>{step.name}</div>}
            <div class={`say ${step.speaker}`}>{step.text}</div>
            <div class="more">tap to continue ▸</div>
          </div>
        )}
        {(step.kind === 'choice' || step.kind === 'quiz') && (
          <div class="dlg-card" style={{ cursor: 'default' }}>
            <div class="who you">{step.kind === 'quiz' ? (retry ? 'Try again' : step.prompt) : 'You'}</div>
            <div class="dlg-choices">
              {step.options.map((o, i) => (
                <Btn
                  data-testid="dlg-choice"
                  onClick={() => {
                    const ok = runner.choose(i);
                    if (step.kind === 'quiz') setRetry(!ok);
                    advance();
                  }}
                >
                  {o.t}
                </Btn>
              ))}
            </div>
          </div>
        )}
        <div class="dlg-tools">
          <span class="muted" style={{ fontSize: '0.75rem' }}>{state.clock} ship's time</span>
          {step.kind === 'line' && (
            <button class="btn small ghost" onClick={skipToChoice} data-testid="dlg-skip">
              Skip ▸▸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
