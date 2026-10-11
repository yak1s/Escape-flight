import { useState } from 'preact/hooks';
import { useGame } from './context';
import { Btn, IconBtn, Icon, Sheet, useEscape } from './kit';
import { docById, puzzleById } from '../content';
import { PUZZLE_COMPONENTS } from './puzzles';
import { audio, haptic } from '../engine/audio';
import { useApp } from './context';

export function PuzzleFrame({ id, onClose, onDoc }: { id: string; onClose: () => void; onDoc: (id: string) => void }) {
  const { state, store } = useGame();
  const { settings } = useApp();
  const def = puzzleById(id);
  const [panel, setPanel] = useState<null | 'hints' | 'clues'>(null);
  const Comp = PUZZLE_COMPONENTS[def.kind];
  const solved = Boolean(state.solved[id]);
  useEscape(() => !panel && onClose());

  const solve = () => {
    if (store.state.solved[id]) return;
    haptic(settings, [20, 60, 30]);
    store.dispatch({ type: 'solve', id });
  };
  const save = (data: unknown) => store.dispatch({ type: 'puzzleState', id, data });

  return (
    <div class="overlay full puzzle" role="dialog" aria-modal="true" aria-label={def.title} data-testid="puzzle" data-puzzle={id}>
      <div class="pz-head">
        <IconBtn icon="back" label="Close puzzle" onClick={onClose} testid="puzzle-close" />
        <h2>{def.title}</h2>
        {def.clues.length > 0 && <IconBtn icon="clue" label="Clues" onClick={() => setPanel('clues')} testid="puzzle-clues" />}
        <IconBtn icon="hint" label="Hints" onClick={() => setPanel('hints')} testid="puzzle-hints" />
      </div>
      <div class="pz-intro">{def.intro}</div>
      {Comp ? (
        <Comp def={def} state={state} saved={state.puzzle[id]} save={save} solve={solve} />
      ) : (
        <div class="pz-body">Missing puzzle component: {def.kind}</div>
      )}
      {solved && (
        <div class="pz-solved" data-testid="puzzle-solved">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--aurora)" stroke-width="1.4" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M7 12.5l3.2 3.2L17 9" />
          </svg>
          <h3>Solved</h3>
          {def.solvedText && <p>{def.solvedText}</p>}
          <Btn kind="primary" onClick={onClose} data-testid="puzzle-continue">
            Continue
          </Btn>
        </div>
      )}
      {panel === 'hints' && <HintSheet id={id} onClose={() => setPanel(null)} />}
      {panel === 'clues' && (
        <Sheet title="Clues" kicker={def.title} onClose={() => setPanel(null)} testid="clues">
          <div class="list">
            {def.clues.map((c) => {
              const d = docById(c);
              const have = state.docs.includes(c);
              return have ? (
                <button
                  class="row"
                  onClick={() => {
                    setPanel(null);
                    onDoc(c);
                  }}
                  data-testid={`clue-${c}`}
                >
                  <Icon name="clue" />
                  <div class="grow">
                    <div class="t">{d.title}</div>
                    <div class="s">{d.summary}</div>
                  </div>
                </button>
              ) : (
                <div class="row" style={{ opacity: 0.55, cursor: 'default' }}>
                  <Icon name="clue" />
                  <div class="grow">
                    <div class="t">Not found yet</div>
                    <div class="s">There is more evidence somewhere in the wreck.</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function HintSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, store } = useGame();
  const def = puzzleById(id);
  const shown = state.hints[id] || 0;
  const [confirm, setConfirm] = useState(false);
  const total = def.hints.length;
  return (
    <Sheet title="Hints" kicker={def.title} onClose={onClose} testid="hints">
      <div class="hint-list">
        {def.hints.slice(0, Math.min(shown, total)).map((h, i) => (
          <div class="hint" data-testid="hint">
            <span class="n">Hint {i + 1}</span>
            {h}
          </div>
        ))}
        {shown > total && (
          <div class="hint solution" data-testid="hint-solution">
            <span class="n">Full solution</span>
            {def.explanation}
          </div>
        )}
        {shown < total && (
          <Btn
            block
            onClick={() => {
              audio.sfx('hint');
              store.dispatch({ type: 'hint', id });
            }}
            data-testid="hint-more"
          >
            {shown === 0 ? 'Show a gentle hint' : 'Show another hint'}
          </Btn>
        )}
        {shown === total &&
          (confirm ? (
            <div class="panel" style={{ maxWidth: 'none' }}>
              <p style={{ marginTop: 0 }}>Reveal the complete solution?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn kind="ghost" onClick={() => setConfirm(false)} style={{ flex: 1 }}>
                  Not yet
                </Btn>
                <Btn
                  kind="primary"
                  onClick={() => {
                    store.dispatch({ type: 'hint', id });
                    setConfirm(false);
                  }}
                  style={{ flex: 1 }}
                  data-testid="hint-reveal"
                >
                  Reveal
                </Btn>
              </div>
            </div>
          ) : (
            <Btn block kind="ghost" onClick={() => setConfirm(true)} data-testid="hint-solution-ask">
              Show the full solution…
            </Btn>
          ))}
        <p class="muted" style={{ fontSize: '0.8rem', textAlign: 'center' }}>
          Hints never penalise you or lock anything away.
        </p>
      </div>
    </Sheet>
  );
}
