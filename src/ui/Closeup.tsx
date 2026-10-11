import { useGame } from './context';
import { Btn, Sheet } from './kit';
import type { CloseupAction, Hotspot } from '../engine/types';
import { pickText, visibleActions } from '../engine/interact';
import { itemById } from '../content';
import { CLOSEUP_ART, ItemIcon } from '../art/closeups';

export function CloseupSheet({
  hotspot,
  onClose,
  onAction,
}: {
  hotspot: Hotspot;
  onClose: () => void;
  onAction: (a: CloseupAction) => void;
  active?: boolean;
}) {
  const { state } = useGame();
  const c = hotspot.closeup!;
  const Art = c.art ? CLOSEUP_ART[c.art] : null;
  const actions = visibleActions(state, c.actions);
  return (
    <Sheet
      title={c.title}
      onClose={onClose}
      testid="closeup"
      actions={
        actions.length ? (
          <>
            {actions.map((a) => (
              <Btn kind="primary" block onClick={() => onAction(a)} data-testid="closeup-action">
                {a.label}
              </Btn>
            ))}
          </>
        ) : undefined
      }
    >
      {Art && (
        <svg class="closeup-art" viewBox="0 0 600 400" role="img" aria-label={c.title}>
          <Art state={state} />
        </svg>
      )}
      <div class="prose" data-testid="closeup-text">
        <p>{pickText(state, c.text)}</p>
      </div>
    </Sheet>
  );
}

export function ItemSheet({ id, onClose, onAction }: { id: string; onClose: () => void; onAction: (a: CloseupAction) => void }) {
  const { state } = useGame();
  const item = itemById(id);
  const actions = visibleActions(state, item.actions);
  return (
    <Sheet
      title={item.name}
      kicker="Item"
      onClose={onClose}
      testid="item-sheet"
      actions={
        actions.length ? (
          <>
            {actions.map((a) => (
              <Btn kind="primary" block onClick={() => onAction(a)} data-testid="item-action">
                {a.label}
              </Btn>
            ))}
          </>
        ) : undefined
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 12px' }}>
        <svg viewBox="0 0 64 64" width="120" height="120" aria-hidden="true">
          <ItemIcon id={item.icon} />
        </svg>
      </div>
      <div class="prose">
        <p>{pickText(state, item.description)}</p>
      </div>
    </Sheet>
  );
}
