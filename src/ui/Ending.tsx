import { useEffect, useState } from 'preact/hooks';
import { useApp, useGame } from './context';
import { Btn } from './kit';
import { audio } from '../engine/audio';
import { EndingArt } from '../art/EndingArt';
import { DocBody } from './DocViewer';
import { docById } from '../content';
import { Souls } from './Journal';

export function Ending() {
  const app = useApp();
  const { state, store } = useGame();
  const rewrite = state.ending === 'rewrite';
  const [page, setPage] = useState(0);

  useEffect(() => {
    audio.music(rewrite ? 'music_ending' : 'music_resonance');
    audio.ambience(rewrite ? null : 'amb_wreck');
    if (rewrite) store.dispatch({ type: 'effects', effects: [{ doc: 'wren-final-note' }] });
    void store.flush();
  }, [rewrite]);

  const pages = rewrite ? REWRITE : RECORD;
  const last = page >= pages.length - 1;

  return (
    <div class="screen ending" data-testid="ending" data-ending={state.ending}>
      <div class="ending-art">
        <EndingArt kind={rewrite ? 'rewrite' : 'record'} />
      </div>
      <div class="ending-text scroll" style={{ maxHeight: '78%' }}>
        <div class="center-col">
          <div class="kicker" style={{ textAlign: 'center', marginBottom: 8 }}>
            {rewrite ? 'Ending · Eighty-One' : 'Ending · The Record'}
          </div>
          {pages[page].map((p) =>
            p === '__NOTE__' ? (
              <div style={{ margin: '10px 0 16px' }}>
                <DocBody doc={docById('wren-final-note')} state={state} />
              </div>
            ) : p === '__SOULS__' ? (
              <div style={{ margin: '10px 0' }}>
                <Souls />
              </div>
            ) : (
              <p class="prose">{p}</p>
            ),
          )}
          <div class="list" style={{ marginTop: 12 }}>
            {!last && (
              <Btn kind="primary" block onClick={() => setPage(page + 1)} data-testid="ending-next">
                Continue
              </Btn>
            )}
            {last && !rewrite && (
              <Btn
                kind="primary"
                block
                data-testid="ending-return"
                onClick={() => {
                  store.dispatch({ type: 'resetEnding' });
                  app.go('game');
                }}
              >
                Return to the final decision
              </Btn>
            )}
            {last && (
              <Btn block onClick={() => app.go('title')} data-testid="ending-title">
                Title screen
              </Btn>
            )}
          </div>
          <p class="muted" style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: 14 }}>
            {Object.keys(state.solved).length} puzzles solved · {Math.round(state.playMs / 60000)} minutes played · {Object.values(state.hints).reduce((a, b) => a + b, 0)} hints used
          </p>
        </div>
      </div>
    </div>
  );
}

const REWRITE: string[][] = [
  [
    'The radio dies at 03:12.',
    'For a moment nothing happens. Then the frost on the walls begins to glow, softly, from within, like snow under a lamp. The wireless room thins around you. The brass and the mahogany and the frozen chair go pale as breath on a window.',
    'The ice you are sitting in is just ice. There is no wreck in it. There never was.',
  ],
  [
    'You are sitting on the open glacier under the last green ribbons of the aurora, with an empty biscuit tin on your knee. The storm has gone. Dawn is coming up pink over the Ravnfjell, and far below, at the head of a white fjord, the lights of Ravnvik are going out one by one.',
    'In your hand, the brass wren. You open it — crest, eye, tail, tail, the bird\'s left wing — with fingers that shake from more than cold.',
    'The professor\'s figures are gone. In their place is a different note, folded small, in pencil that has faded to silver:',
    '__NOTE__',
  ],
  [
    'Later, in the hut at the foot of the glacier, you unfold Gran\'s first letter to read it again. There is a postscript you are quite certain was not there yesterday.',
    '"P.S. Write it in words, my darling. Always in words."',
    '__SOULS__',
    'THE END',
  ],
];

const RECORD: string[][] = [
  [
    'At dawn the storm passes. Through the smoking room\'s cracked skylight you see a square of pale sky, and you climb out onto the glacier.',
    'Behind you, scratched into the panelling, are six sets of initials. One of them is W.A.',
    'The record holds. Six came home, and you exist — you, and your mother, and Gran\'s fifty-one years of keeping quiet.',
  ],
  [
    'You walk down the mountain with the brooch, the sixpence and a question that will never quite leave you.',
    'Thirty-three people died on the Ravnkammen ridge, exactly as the Board of Inquiry said they did. Was it enough?',
    'The night of the thirteenth is not over yet. Somewhere a card is waiting to be written.',
  ],
];
