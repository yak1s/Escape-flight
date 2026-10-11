import { useEffect, useState } from 'preact/hooks';
import { useApp } from './context';
import { Btn, IconBtn } from './kit';
import {
  canPromptInstall,
  isStandalone,
  onSwMessage,
  promptInstall,
  repairCache,
  runReadinessChecks,
  supportsOffline,
  type ReadinessCheck,
  type ReadinessReport,
} from '../engine/pwa';

const MARK: Record<string, string> = { ok: '✓', fail: '✕', warn: '!', running: '…', pending: '·' };

export function OfflinePrep() {
  const app = useApp();
  const [checks, setChecks] = useState<ReadinessCheck[]>([]);
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [installable, setInstallable] = useState(canPromptInstall());
  const [failure, setFailure] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setFailure(null);
    try {
      const r = await runReadinessChecks(setChecks);
      setReport(r);
    } catch (e) {
      setFailure(String(e));
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    void run();
    const off = onSwMessage((m) => {
      if (m.type === 'PRECACHE_PROGRESS' && !m.isUpdate) setProgress({ done: Number(m.done), total: Number(m.total) });
      if (m.type === 'INSTALL_FAILED' && !m.isUpdate)
        setFailure(`${(m.failures as unknown[]).length} file(s) could not be downloaded. Check the connection and tap “Verify again”.`);
      if (m.type === 'INSTALLABLE') setInstallable(true);
      if (m.type === 'INSTALLED') {
        setInstallable(false);
        void run();
      }
    });
    return () => {
      off();
    };
  }, []);

  const filesBad = checks.find((c) => c.id === 'files')?.status === 'fail';

  return (
    <div class="screen page" data-testid="prep">
      <div class="page-head">
        <IconBtn icon="back" label="Back" onClick={() => app.back()} testid="prep-back" />
        <h2>Prepare for offline play</h2>
      </div>
      <div class="scroll" style={{ flex: 1 }}>
        <div class="center-col" style={{ paddingBottom: 40 }}>
          {report?.ready ? (
            <div class="ready-banner ok" data-testid="ready-banner" data-ready="yes">
              <span class="big">Ready for your flight</span>
              Every game file is stored and verified on this phone. You can play with airplane mode on.
            </div>
          ) : (
            <div class="ready-banner no" data-testid="ready-banner" data-ready={running ? 'checking' : 'no'}>
              <span class="big">{running ? 'Checking…' : 'Not ready yet'}</span>
              {running ? 'Verifying every file on this device. Stay online for now.' : 'Stay online and follow the steps below until every required item has a tick.'}
            </div>
          )}
          {progress && progress.done < progress.total && (
            <div>
              <div class="muted" style={{ fontSize: '0.85rem' }}>
                Downloading game files: {progress.done} / {progress.total}
              </div>
              <div class="progress">
                <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          {failure && (
            <p style={{ color: 'var(--danger)' }} role="alert">
              {failure}
            </p>
          )}
          {!supportsOffline() && (
            <p style={{ color: 'var(--danger)' }}>
              This copy of the page cannot work offline. Open the published game address (https://…github.io/…) in Chrome on your Android phone.
            </p>
          )}
          <div class="checklist" data-testid="checklist">
            {checks.map((c) => (
              <div class={`check ${c.status}`} data-testid={`check-${c.id}`} data-status={c.status}>
                <span class="st">{MARK[c.status]}</span>
                <div>
                  <div class="t">
                    {c.label}
                    {!c.required && <span class="muted" style={{ fontSize: '0.75rem' }}> · recommended</span>}
                  </div>
                  {c.detail && <div class="d">{c.detail}</div>}
                </div>
              </div>
            ))}
          </div>
          <div class="list" style={{ marginTop: 14 }}>
            <Btn block kind="primary" onClick={() => void run()} disabled={running} data-testid="verify-again">
              {running ? 'Checking…' : 'Verify again'}
            </Btn>
            {filesBad && (
              <Btn
                block
                onClick={async () => {
                  setRunning(true);
                  try {
                    const r = await repairCache();
                    app.toast(r.ok ? `Repaired ${r.fixed.length} file(s).` : `${r.failed.length} file(s) still missing — check the connection.`, !r.ok);
                  } catch (e) {
                    app.toast(String(e), true);
                  }
                  setRunning(false);
                  void run();
                }}
                data-testid="repair"
              >
                Repair offline files
              </Btn>
            )}
            {installable && !isStandalone() && (
              <Btn block onClick={() => void promptInstall().then(() => setInstallable(canPromptInstall()))} data-testid="install">
                Install app
              </Btn>
            )}
          </div>

          <div class="section" style={{ marginTop: 26 }}>
            <h3>Before your flight</h3>
            <ol class="steps-ol">
              <li>While online, open the game in Chrome and wait for <b>Ready for your flight</b> above.</li>
              <li>
                Install it: tap <b>Install app</b> if offered, or Chrome menu <b>⋮</b> → <b>Add to Home screen</b> / <b>Install app</b>.
              </li>
              <li>Open the installed Albatross icon from your home screen. Come back here and check again.</li>
              <li>Turn on airplane mode. Close the app completely (swipe it away from recent apps).</li>
              <li>Reopen it from the home screen. Start or continue a game, open a puzzle and check the sound.</li>
              <li>
                Back here, <b>Opened in airplane mode at least once</b> should now be ticked. You're ready.
              </li>
            </ol>
            <p class="muted" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
              Once ready, the game never needs the internet: no accounts, no downloads during play, no background updates. Saves stay on this phone — use Settings →
              Download a backup file if you want a spare copy. Clearing Chrome's data for this site or uninstalling the app would delete saves.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
