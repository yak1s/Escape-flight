import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from './context';
import { Btn, IconBtn, Seg, Toggle } from './kit';
import { audio } from '../engine/audio';
import { deleteSave, describeSave, exportSave, loadGame, parseImport, storageBackend } from '../engine/save';
import type { GameState } from '../engine/types';
import { applyUpdate, checkForUpdate, getInfo, updateWaiting, type UpdateState } from '../engine/pwa';

export function SettingsPage() {
  const app = useApp();
  const s = app.settings;
  const set = (patch: Partial<typeof s>) => app.setSettings({ ...s, ...patch });
  const back = () => app.back();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<GameState | null>(null);
  const [current, setCurrent] = useState<GameState | null>(null);
  const [confirmReset, setConfirmReset] = useState(0);
  const [upd, setUpd] = useState<UpdateState>({ status: updateWaiting() ? 'ready' : 'idle' });
  const [version, setVersion] = useState<string>('');
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void loadGame().then((r) => setCurrent(app.store?.state ?? r.state));
    getInfo()
      .then((i) => setVersion(`${i.version} · ${i.total} files · ${(i.bytes / 1048576).toFixed(1)} MB`))
      .catch(() => setVersion('offline engine not active'));
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const doExport = async (share: boolean) => {
    const state = app.store?.state ?? current;
    if (!state) return app.toast('There is no saved game to back up yet.', true);
    await app.store?.flush();
    const json = exportSave(state, __BUILD_ID__);
    const name = `albatross-save-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
    const file = new File([json], name, { type: 'application/json' });
    try {
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Albatross save backup' });
        return;
      }
    } catch {
      /* fall back to download */
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    app.toast('Backup saved to your downloads.');
  };

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      const state = parseImport(await f.text());
      setPendingImport(state);
    } catch (err) {
      app.toast((err as Error).message, true);
    }
  };

  return (
    <div class="screen page" data-testid="settings">
      <div class="page-head">
        <IconBtn icon="back" label="Back" onClick={back} testid="settings-back" />
        <h2>Settings</h2>
      </div>
      <div class="scroll" style={{ flex: 1 }}>
        <div class="center-col" style={{ paddingBottom: 40 }}>
          <div class="section">
            <h3>Sound</h3>
            <div class="setting">
              <div class="lbl">Mute all sound</div>
              <Toggle label="Mute all sound" checked={s.muted} onChange={(v) => set({ muted: v })} />
            </div>
            <div class="setting">
              <div class="lbl">
                Music &amp; ambience <small>{Math.round(s.music * 100)}%</small>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(s.music * 100)}
                aria-label="Music volume"
                data-testid="music-volume"
                onInput={(e) => set({ music: Number((e.target as HTMLInputElement).value) / 100 })}
                style={{ maxWidth: '45%' }}
              />
            </div>
            <div class="setting">
              <div class="lbl">
                Sound effects <small>{Math.round(s.sfx * 100)}%</small>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(s.sfx * 100)}
                aria-label="Sound effects volume"
                data-testid="sfx-volume"
                onInput={(e) => set({ sfx: Number((e.target as HTMLInputElement).value) / 100 })}
                onChange={() => audio.sfx('pickup')}
                style={{ maxWidth: '45%' }}
              />
            </div>
            <div class="setting">
              <div class="lbl">
                Radio static <small>Crackle under Wren's lines</small>
              </div>
              <Toggle label="Radio static" checked={s.staticNoise} onChange={(v) => set({ staticNoise: v })} />
            </div>
          </div>

          <div class="section">
            <h3>Display &amp; comfort</h3>
            <div class="setting">
              <div class="lbl">Text size</div>
              <Seg
                label="Text size"
                value={s.textSize}
                onChange={(v) => set({ textSize: v })}
                options={[
                  { v: 'normal', t: 'A' },
                  { v: 'large', t: 'A+' },
                  { v: 'xlarge', t: 'A++' },
                ]}
              />
            </div>
            <div class="setting">
              <div class="lbl">
                Reduce motion <small>Stops the aurora and other animation</small>
              </div>
              <Seg
                label="Reduce motion"
                value={s.reduceMotion}
                onChange={(v) => set({ reduceMotion: v })}
                options={[
                  { v: 'system', t: 'Auto' },
                  { v: 'on', t: 'On' },
                  { v: 'off', t: 'Off' },
                ]}
              />
            </div>
            <div class="setting">
              <div class="lbl">
                Always outline hotspots <small>Shows every tappable spot</small>
              </div>
              <Toggle label="Always outline hotspots" checked={s.outlines} onChange={(v) => set({ outlines: v })} />
            </div>
            <div class="setting">
              <div class="lbl">Vibration</div>
              <Toggle label="Vibration" checked={s.haptics} onChange={(v) => set({ haptics: v })} />
            </div>
          </div>

          <div class="section">
            <h3>Your saved game</h3>
            <p class="muted" style={{ marginTop: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
              {current ? describeSave(current) : 'No saved game yet.'}
              <br />
              Progress is stored only on this phone ({storageBackend() === 'indexeddb' ? 'IndexedDB' : 'local storage'}
              {persisted ? ', protected from automatic clean-up' : ''}). Clearing Chrome's site data or uninstalling the app deletes it — keep a backup.
            </p>
            <div class="list">
              <Btn block onClick={() => void doExport(false)} data-testid="export-save">
                Download a backup file
              </Btn>
              {'share' in navigator && (
                <Btn block kind="ghost" onClick={() => void doExport(true)}>
                  Share backup…
                </Btn>
              )}
              <Btn block kind="ghost" onClick={() => fileRef.current?.click()} data-testid="import-save">
                Restore from a backup file…
              </Btn>
              <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} data-testid="import-file" />
              {pendingImport && (
                <div class="panel" style={{ maxWidth: 'none' }} data-testid="import-confirm">
                  <p style={{ marginTop: 0 }}>
                    Replace {current ? `your current game (${describeSave(current)})` : 'your current game'} with this backup ({describeSave(pendingImport)})?
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setPendingImport(null)}>
                      Cancel
                    </Btn>
                    <Btn
                      kind="danger"
                      style={{ flex: 1 }}
                      data-testid="import-confirm-yes"
                      onClick={async () => {
                        try {
                          await app.replaceSave(pendingImport);
                          setCurrent(pendingImport);
                          setPendingImport(null);
                          app.toast('Backup restored.');
                        } catch (err) {
                          app.toast(`Could not restore: ${(err as Error).message}`, true);
                        }
                      }}
                    >
                      Replace
                    </Btn>
                  </div>
                </div>
              )}
              {confirmReset === 0 && (
                <Btn block kind="danger" onClick={() => setConfirmReset(1)} data-testid="reset">
                  Erase progress…
                </Btn>
              )}
              {confirmReset > 0 && (
                <div class="panel" style={{ maxWidth: 'none' }}>
                  <p style={{ marginTop: 0 }}>Erase all progress on this device? This cannot be undone unless you have a backup file.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setConfirmReset(0)}>
                      Cancel
                    </Btn>
                    <Btn
                      kind="danger"
                      style={{ flex: 1 }}
                      data-testid="reset-confirm"
                      onClick={async () => {
                        app.store?.dispose();
                        await deleteSave();
                        await app.refreshSave();
                        setCurrent(null);
                        setConfirmReset(0);
                        app.toast('Progress erased.');
                        app.go('title');
                      }}
                    >
                      Erase
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div class="section">
            <h3>Version &amp; updates</h3>
            <p class="muted" style={{ marginTop: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
              Build {__BUILD_ID__}
              <br />
              Offline package: {version || '…'}
              <br />
              The game never updates itself in the background. New versions are downloaded only when you ask, verified completely, and applied only when you
              restart. Your save is kept.
            </p>
            {upd.status === 'ready' ? (
              <div class="panel" style={{ maxWidth: 'none' }}>
                <p style={{ marginTop: 0 }}>A new version has been downloaded and verified. It will be used the next time you open the game, or now:</p>
                <Btn
                  kind="primary"
                  block
                  data-testid="apply-update"
                  onClick={async () => {
                    await app.store?.flush();
                    if (!applyUpdate()) app.toast('No update waiting.', true);
                  }}
                >
                  Restart with the new version
                </Btn>
              </div>
            ) : (
              <Btn block disabled={upd.status === 'checking' || upd.status === 'downloading'} onClick={() => void checkForUpdate(setUpd)} data-testid="check-update">
                {upd.status === 'checking' ? 'Checking…' : upd.status === 'downloading' ? `Downloading ${upd.done}/${upd.total}…` : 'Check for a new version'}
              </Btn>
            )}
            <p style={{ fontSize: '0.85rem' }} data-testid="update-status">
              {upd.status === 'none' && 'You have the latest version.'}
              {upd.status === 'offline' && 'You are offline. Updates can only be checked online — your current version keeps working.'}
              {upd.status === 'failed' && `Update not installed: ${upd.error} Your current version is unchanged.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
