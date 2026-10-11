import { useState } from 'preact/hooks';
import { useGame } from './context';
import { Sheet } from './kit';
import { CONTENT, dialogueById, docById, personById, sceneById } from '../content';
import { activeObjectives, completedObjectives, test } from '../engine/state';
import { pickText, whereNow } from '../engine/interact';

const TABS = [
  { id: 'objectives', t: 'Objectives' },
  { id: 'evidence', t: 'Evidence' },
  { id: 'people', t: 'People' },
  { id: 'radio', t: 'Radio log' },
  { id: 'souls', t: 'The Forty' },
];

export function Journal({ tab, onClose, onDoc, onReplay }: { tab?: string; onClose: () => void; onDoc: (id: string) => void; onReplay: (id: string) => void }) {
  const { state } = useGame();
  const [t, setT] = useState(tab || 'objectives');
  return (
    <Sheet title="Journal" onClose={onClose} testid="journal">
      <div class="tabs" role="tablist" style={{ padding: '0 0 10px' }}>
        {TABS.map((x) => (
          <button role="tab" aria-selected={t === x.id} class={`tab ${t === x.id ? 'on' : ''}`} onClick={() => setT(x.id)} data-testid={`tab-${x.id}`}>
            {x.t}
          </button>
        ))}
      </div>
      {t === 'objectives' && <Objectives />}
      {t === 'evidence' && (
        <div class="list">
          {[...state.docs].reverse().map((id) => {
            const d = docById(id);
            const isNew = !state.docsRead.includes(id);
            return (
              <button class={`row ${isNew ? 'new' : ''}`} onClick={() => onDoc(id)} data-testid={`ev-${id}`}>
                <div class="grow">
                  <div class="t">{d.title}</div>
                  <div class="s">{d.summary}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {t === 'people' && (
        <div class="list">
          {['gran', 'wren', ...CONTENT.people.map((p) => p.id).filter((id) => id !== 'gran' && id !== 'wren')]
            .filter((id) => id === 'gran' || id === 'wren' ? true : state.people.includes(id))
            .filter((id) => id !== 'wren' || test(state, 'solved:P04'))
            .map((id) => {
              const p = personById(id);
              return (
                <div class="row" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                  <div class="medallion">{p.initials}</div>
                  <div class="grow">
                    <div class="t">{p.name}</div>
                    <div class="s" style={{ color: 'var(--brass)' }}>
                      {p.role}
                    </div>
                    <div class="s" style={{ marginTop: 4 }}>
                      {pickText(state, p.bio)}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {t === 'radio' && (
        <div class="list">
          {state.log.length > 0 && (
            <div class="panel" style={{ maxWidth: 'none' }}>
              <div class="kicker" style={{ marginBottom: 6 }}>
                What you told Wren (ship's time)
              </div>
              {state.log.map((l) => (
                <div style={{ display: 'flex', gap: 10, fontSize: '0.88rem', padding: '3px 0' }} data-testid={`log-${l.id}`}>
                  <span style={{ fontFamily: 'var(--font-typed)', color: 'var(--brass-hi)' }}>{l.time}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          )}
          <div class="kicker" style={{ marginTop: 6 }}>
            Conversations — tap to replay
          </div>
          {state.dialogues.map((id) => {
            const d = dialogueById(id);
            return (
              <button class="row" onClick={() => onReplay(id)} data-testid={`replay-${id}`}>
                <div class="grow">
                  <div class="t">{d.title}</div>
                  <div class="s">{d.time ? `${d.time} ship's time` : ''}</div>
                </div>
              </button>
            );
          })}
          {!state.dialogues.length && <p class="muted">No conversations yet.</p>}
        </div>
      )}
      {t === 'souls' && <Souls />}
    </Sheet>
  );
}

function Objectives() {
  const { state } = useGame();
  const active = activeObjectives(state);
  const done = completedObjectives(state);
  const w = whereNow(state);
  const where = (id?: string) => (id === 'radio' ? 'Radio' : id === 'inventory' ? 'Items' : id ? sceneById(id).title : '');
  return (
    <div class="list" data-testid="objectives">
      {w && (
        <div class="panel" style={{ maxWidth: 'none', borderColor: 'var(--line)' }}>
          <div class="kicker">Where now?</div>
          <div style={{ marginTop: 4 }}>{w.text}</div>
          {w.where && <div class="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>Go to: {where(w.where)}</div>}
        </div>
      )}
      {active.map((o) => (
        <div class="row" style={{ cursor: 'default' }} data-testid="objective">
          <span style={{ color: 'var(--aurora)' }}>◇</span>
          <div class="grow">
            <div class="t">{o.text}</div>
          </div>
        </div>
      ))}
      {done.map((o) => (
        <div class="row done" style={{ cursor: 'default' }}>
          <span style={{ color: 'var(--brass)' }}>◆</span>
          <div class="grow">
            <div class="t">{o.text}</div>
          </div>
        </div>
      ))}
      {!active.length && !done.length && <p class="muted">Talk to Wren.</p>}
    </div>
  );
}

/** Appendix B as a living list: in the true ending everyone is marked as having come home. */
export function Souls() {
  const { state } = useGame();
  const b = docById('appendix-b');
  const rewritten = state.ending === 'rewrite';
  const rows: string[][] = [];
  b.blocks.forEach((blk) => {
    if ('table' in blk) rows.push(...blk.table);
  });
  return (
    <div>
      <p class="muted" style={{ marginTop: 0 }}>
        {rewritten ? 'Everyone aboard the Albatross came home. "E. Sorrel" never existed: there were thirty-nine, not forty.' : 'The forty souls listed by the Board of Inquiry. † lost · S survived (in the record).'}
      </p>
      <div class="names">
        {rows
          .filter((r) => r[1] && !r[1].startsWith('('))
          .map((r) => {
            const name = r[0].startsWith('Cabin') || r[0].startsWith('B-deck') ? r[1] : r[0];
            const fate = rewritten ? (name.includes('Sorrel') ? 'never was' : 'home') : r[2];
            return (
              <div class={rewritten && !name.includes('Sorrel') ? 'ok' : ''}>
                {name} <span style={{ opacity: 0.7 }}>· {fate}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
