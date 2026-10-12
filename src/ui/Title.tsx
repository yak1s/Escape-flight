import { useEffect, useState } from 'preact/hooks';
import { useApp } from './context';
import { Btn } from './kit';
import { audio } from '../engine/audio';
import { getInfo, lastReadiness, onSwMessage, supportsOffline } from '../engine/pwa';
import { describeSave, loadGame } from '../engine/save';
import { TitleArt } from '../art/TitleArt';

export function Title() {
  const app = useApp();
  const [confirmNew, setConfirmNew] = useState(false);
  const [saveText, setSaveText] = useState<string | null>(null);
  const [ready, setReady] = useState<'unknown' | 'ready' | 'not-ready' | 'unsupported'>('unknown');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    audio.music('music_title');
    audio.ambience(null);
    void loadGame().then((r) => setSaveText(r.state ? describeSave(r.state) : null));
    let alive = true;
    const check = async () => {
      if (!supportsOffline()) return setReady('unsupported');
      const last = await lastReadiness();
      try {
        if (!navigator.serviceWorker.controller) return alive && setReady('not-ready');
        const info = await getInfo();
        if (alive) setReady(last?.ready && last.version === info.version ? 'ready' : 'not-ready');
      } catch {
        if (alive) setReady('not-ready');
      }
    };
    void check();
    const off = onSwMessage((m) => {
      if (m.type === 'PRECACHE_PROGRESS' && !m.isUpdate) setProgress({ done: Number(m.done), total: Number(m.total) });
      if (m.type === 'INSTALL_COMPLETE' || m.type === 'ACTIVATED') void check();
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  const unlock = () => {
    if (!audio.unlocked) {
      audio.unlock();
      audio.music('music_title');
    }
  };

  return (
    <div class="screen title-screen" onPointerDown={unlock} data-testid="title">
      <div class="title-art">
        <TitleArt />
      </div>
      <div class="title-logo">
        <h1>ALBATROSS</h1>
        <p>A Frozen Signal</p>
      </div>
      <div class="title-content">
        {confirmNew ? (
          <div class="panel" style={{ background: 'rgba(8,14,28,0.92)' }}>
            <p style={{ marginTop: 0 }} data-testid="confirm-new-text">
              {saveText
                ? `Start a new game? Your current progress (${saveText}) will be erased. You can export a backup first in Settings.`
                : 'There is a saved game on this device that this version cannot read. Starting a new game will replace it. If you might want it back, keep it: an older or newer copy of the game may still open it.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn kind="ghost" onClick={() => setConfirmNew(false)} style={{ flex: 1 }}>
                Keep playing
              </Btn>
              <Btn kind="danger" onClick={() => void app.startNew()} style={{ flex: 1 }} data-testid="confirm-new">
                Erase &amp; start
              </Btn>
            </div>
          </div>
        ) : (
          <>
            {app.hasSave && saveText && (
              <Btn kind="primary" block onClick={() => void app.continueGame()} data-testid="continue">
                Continue
                <span style={{ fontWeight: 400, fontSize: '0.78rem', opacity: 0.8 }}>· {saveText.split(' · ').slice(0, 2).join(' · ')}</span>
              </Btn>
            )}
            <Btn kind={app.hasSave ? undefined : 'primary'} block onClick={() => (app.hasSave || app.unreadableSave ? setConfirmNew(true) : void app.startNew())} data-testid="new-game">
              New game
            </Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn block onClick={() => app.go('prep')} data-testid="open-prep">
                Prepare for offline
              </Btn>
              <Btn block kind="ghost" onClick={() => app.go('settings')} data-testid="open-settings">
                Settings
              </Btn>
            </div>
            <button
              class={`ready-chip ${ready === 'ready' ? 'ok' : ''}`}
              onClick={() => app.go('prep')}
              data-testid="ready-chip"
              data-ready={ready}
            >
              <span class="dot" />
              {ready === 'ready' && 'Ready for offline play'}
              {ready === 'not-ready' && (progress && progress.done < progress.total ? `Storing game files ${progress.done}/${progress.total}…` : 'Not yet verified for offline play — tap to check')}
              {ready === 'unknown' && 'Checking offline status…'}
              {ready === 'unsupported' && 'Offline play needs the published https:// site'}
            </button>
            <Btn kind="ghost" small onClick={() => app.go('about')} style={{ alignSelf: 'center', border: 0 }}>
              How to play · Credits
            </Btn>
          </>
        )}
        <div class="title-meta">Build {__BUILD_ID__} · progress saved on this device only</div>
      </div>
    </div>
  );
}
