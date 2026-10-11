import { useGame } from './context';
import { Btn, Sheet } from './kit';
import { itemById } from '../content';
import { travelScenes, whereNow } from '../engine/interact';
import { visibleActions } from '../engine/interact';
import { ItemIcon } from '../art/closeups';

export function ItemsPanel({ onClose, onItem }: { onClose: () => void; onItem: (id: string) => void }) {
  const { state } = useGame();
  return (
    <Sheet title="Items" onClose={onClose} testid="items">
      <div class="list">
        {state.items.map((id) => {
          const it = itemById(id);
          const usable = visibleActions(state, it.actions).length > 0;
          return (
            <button class={`row ${usable ? 'new' : ''}`} onClick={() => onItem(id)} data-testid={`item-${id}`}>
              <svg class="item-icon" viewBox="0 0 64 64" aria-hidden="true">
                <ItemIcon id={it.icon} />
              </svg>
              <div class="grow">
                <div class="t">{it.name}</div>
                {usable && <div class="s" style={{ color: 'var(--aurora)' }}>Something to do with this</div>}
              </div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function TravelPanel({ onClose, onGo, onRadio, onItems }: { onClose: () => void; onGo: (id: string) => void; onRadio: () => void; onItems: () => void }) {
  const { state } = useGame();
  const scenes = travelScenes(state);
  const w = whereNow(state);
  return (
    <Sheet title="Go to" onClose={onClose} testid="travel">
      {w && (
        <div class="panel" style={{ maxWidth: 'none', marginBottom: 12 }}>
          <div class="kicker">Next</div>
          <div style={{ marginTop: 4 }}>{w.text}</div>
          {w.where === 'radio' && (
            <Btn small kind="primary" onClick={onRadio} style={{ marginTop: 8 }}>
              Open the radio
            </Btn>
          )}
          {w.where === 'inventory' && (
            <Btn small kind="primary" onClick={onItems} style={{ marginTop: 8 }}>
              Open items
            </Btn>
          )}
        </div>
      )}
      <div class="list">
        {scenes.map((s) => (
          <button class="row" onClick={() => onGo(s.id)} data-testid={`go-${s.id}`} aria-current={s.id === state.scene}>
            <div class="grow">
              <div class="t">{s.title}</div>
              {s.id === state.scene && <div class="s">You are here</div>}
              {w?.where === s.id && s.id !== state.scene && <div class="s" style={{ color: 'var(--aurora)' }}>Something to do here</div>}
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
