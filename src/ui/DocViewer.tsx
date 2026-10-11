import { useGame } from './context';
import { Sheet } from './kit';
import { docById } from '../content';
import { test } from '../engine/state';
import type { DocBlock, DocDef, GameState } from '../engine/types';
import { DOC_ART } from '../art/docart';

export function DocViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state } = useGame();
  const doc = docById(id);
  return (
    <Sheet title={doc.title} kicker={doc.optional ? 'Evidence · optional' : 'Evidence'} onClose={onClose} testid="doc">
      <div class="doc-wrap">
        <DocBody doc={doc} state={state} />
      </div>
    </Sheet>
  );
}

export function DocBody({ doc, state }: { doc: DocDef; state: GameState }) {
  const handClass = (h?: string) => (h ? `hand-${h}` : '');
  return (
    <div class={`paper ${doc.style} ${handClass(doc.hand)}`} data-testid={`doc-${doc.id}`}>
      {doc.blocks.filter((b) => test(state, b.when)).map((b, i) => (
        <Block key={i} b={b} state={state} />
      ))}
    </div>
  );
}

function Block({ b, state }: { b: DocBlock; state: GameState }) {
  if ('h' in b) return <h3>{b.h}</h3>;
  if ('h2' in b) return <h4>{b.h2}</h4>;
  if ('p' in b)
    return (
      <p class={b.hand ? `hand-${b.hand}` : ''} style={b.align ? { textAlign: b.align } : undefined}>
        {b.p}
      </p>
    );
  if ('list' in b)
    return (
      <ul>
        {b.list.map((x) => (
          <li>{x}</li>
        ))}
      </ul>
    );
  if ('table' in b)
    return (
      <table>
        <tbody>
          {b.table.map((row) => (
            <tr>
              {row.map((cell) => (
                <td>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  if ('rule' in b) return <hr />;
  if ('sign' in b) return <p class={`sign ${b.hand ? `hand-${b.hand}` : ''}`}>{b.sign}</p>;
  if ('stamp' in b) return <p class="stamp">{b.stamp}</p>;
  if ('note' in b) return <p class="dnote">{b.note}</p>;
  if ('art' in b) {
    const Art = DOC_ART[b.art];
    return (
      <>
        {Art ? <Art state={state} /> : null}
        {b.caption && <div class="doc-caption">{b.caption}</div>}
      </>
    );
  }
  return null;
}
