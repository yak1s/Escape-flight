import { useGame } from './context';
import { Btn, Sheet } from './kit';
import { radioPuzzles } from '../engine/interact';
import { dialogueById } from '../content';

export function RadioPanel({ onClose, onPuzzle, onLog }: { onClose: () => void; onPuzzle: (id: string) => void; onLog: () => void }) {
  const { state } = useGame();
  const tasks = radioPuzzles(state);
  return (
    <Sheet title="Radio — 1330 kc/s" kicker={`Ship's time ${state.clock}`} onClose={onClose} testid="radio">
      <div class="list">
        {state.queue.length > 0 && (
          <div class="panel" style={{ maxWidth: 'none', borderColor: 'var(--aurora)' }}>
            <div class="kicker" style={{ color: 'var(--aurora)' }}>
              Incoming
            </div>
            <p style={{ margin: '4px 0 10px' }}>{dialogueById(state.queue[0]).title}</p>
            <Btn kind="primary" block onClick={onClose} data-testid="radio-listen">
              Listen
            </Btn>
          </div>
        )}
        {tasks.map((p) => (
          <div class="panel" style={{ maxWidth: 'none' }}>
            <div class="kicker">Wren is waiting</div>
            <p style={{ margin: '4px 0 10px' }}>{p.title}</p>
            <Btn kind="primary" block onClick={() => onPuzzle(p.id)} data-testid={`radio-task-${p.id}`}>
              {p.id === 'P27' ? 'Decide' : 'Answer'}
            </Btn>
          </div>
        ))}
        {!state.queue.length && !tasks.length && (
          <p class="muted" style={{ textAlign: 'center' }}>
            Only the soft surf of static. Wren is busy on her side of the night.
          </p>
        )}
        <Btn kind="ghost" block onClick={onLog} data-testid="radio-log">
          Radio log &amp; replays
        </Btn>
      </div>
    </Sheet>
  );
}
