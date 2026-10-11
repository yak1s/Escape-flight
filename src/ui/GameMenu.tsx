import { useApp, useGame } from './context';
import { Btn, Sheet } from './kit';

export function GameMenu({ onClose, onJournal }: { onClose: () => void; onJournal: () => void }) {
  const app = useApp();
  const { state } = useGame();
  const mins = Math.round(state.playMs / 60000);
  const solved = Object.keys(state.solved).length;
  return (
    <Sheet title="Paused" kicker={`${solved} of 27 puzzles · ${mins} min played`} onClose={onClose} testid="menu">
      <div class="list">
        <Btn kind="primary" block onClick={onClose} data-testid="menu-resume">
          Resume
        </Btn>
        <Btn
          block
          onClick={() => {
            onClose();
            onJournal();
          }}
        >
          Journal
        </Btn>
        <Btn block onClick={() => app.go('settings')} data-testid="menu-settings">
          Settings &amp; save backup
        </Btn>
        <Btn block onClick={() => app.go('prep')}>
          Offline status
        </Btn>
        <Btn block kind="ghost" onClick={() => app.go('title')} data-testid="menu-title">
          Save &amp; return to title
        </Btn>
        <p class="muted" style={{ fontSize: '0.82rem', textAlign: 'center' }}>
          Your progress saves automatically on this device.
        </p>
      </div>
    </Sheet>
  );
}
