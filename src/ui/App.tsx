import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { AppContext, type AppApi, type Screen } from './context';
import { loadSettingsSync, prefersReducedMotion, saveSettings, type Settings } from '../engine/settings';
import { GameStore } from '../engine/store';
import { deleteSave, loadGame, saveGame } from '../engine/save';
import { newGameState } from '../engine/state';
import { audio } from '../engine/audio';
import type { GameState } from '../engine/types';
import { Title } from './Title';
import { Game } from './Game';
import { SettingsPage } from './SettingsPage';
import { OfflinePrep } from './OfflinePrep';
import { About } from './About';
import { Ending } from './Ending';
import { onSwMessage } from '../engine/pwa';
import { installTestHooks } from './testHooks';

interface ToastMsg {
  id: number;
  text: string;
  err?: boolean;
}

export function App() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettingsSync());
  const [screen, setScreen] = useState<Screen>('boot');
  const [store, setStore] = useState<GameStore | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [missing, setMissing] = useState<string | null>(null);
  const loaded = useRef<GameState | null>(null);
  const toastId = useRef(0);

  const toast = useCallback((text: string, err = false) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  // Apply visual settings to <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('text-large', settings.textSize === 'large');
    root.classList.toggle('text-xlarge', settings.textSize === 'xlarge');
    root.classList.toggle('reduce-motion', prefersReducedMotion(settings));
    audio.setSettings(settings);
  }, [settings]);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    void saveSettings(s);
  }, []);

  const refreshSave = useCallback(async () => {
    const r = await loadGame();
    loaded.current = r.state;
    setHasSave(Boolean(r.state));
    if (r.recovered) setLoadNote('Your latest save was damaged, so the previous backup was restored.');
    else if (r.problems.length && !r.state) setLoadNote(`A save was found but could not be read: ${r.problems.join(' ')}`);
  }, []);

  // Boot: read the local save (no network involved).
  useEffect(() => {
    void refreshSave().then(() => setScreen('title'));
    const off = onSwMessage((msg) => {
      if (msg.type === 'MISSING_RESOURCE' && msg.mandatory) setMissing(String(msg.url));
    });
    return () => {
      off();
    };
  }, [refreshSave]);

  useEffect(() => {
    if (loadNote) toast(loadNote, true);
  }, [loadNote, toast]);

  const attach = useCallback(
    (state: GameState) => {
      store?.dispose();
      const s = new GameStore(state);
      setStore(s);
      return s;
    },
    [store],
  );

  const startNew = useCallback(async () => {
    audio.unlock();
    await deleteSave();
    const s = attach(newGameState());
    await s.flushNow();
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* ignore */
    }
    setHasSave(true);
    setScreen('game');
  }, [attach]);

  const continueGame = useCallback(async () => {
    audio.unlock();
    if (!loaded.current) await refreshSave();
    if (!loaded.current) {
      toast('No saved game found.', true);
      return;
    }
    if (!store || store.state.saveId !== loaded.current.saveId || store.state.updatedAt < loaded.current.updatedAt) attach(loaded.current);
    setScreen(loaded.current.ending ? 'ending' : 'game');
  }, [attach, refreshSave, store, toast]);

  const replaceSave = useCallback(
    async (state: GameState) => {
      const res = await saveGame(state);
      if (!res.ok) throw new Error(res.error || 'Could not save');
      loaded.current = state;
      attach(state);
      setHasSave(true);
    },
    [attach],
  );

  const prev = useRef<Screen>('title');
  const go = useCallback(
    (s: Screen) => {
      if (store && s !== 'game') void store.flush().then(() => (loaded.current = store.state));
      setScreen((cur) => {
        if (cur !== s) prev.current = cur === 'boot' ? 'title' : cur;
        return s;
      });
    },
    [store],
  );
  const back = useCallback(() => {
    const target = prev.current === 'game' && !store ? 'title' : prev.current;
    setScreen(target === 'settings' || target === 'prep' || target === 'about' ? 'title' : target);
  }, [store]);

  // Flush saves whenever the app is hidden or closed (Android may kill it at any time).
  useEffect(() => {
    const flush = () => {
      if (store) void store.flush();
    };
    const vis = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', flush);
    };
  }, [store]);

  // Play-time counter (only while the game screen is visible).
  useEffect(() => {
    if (screen !== 'game' || !store) return;
    let last = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === 'visible') store.dispatch({ type: 'tick', ms: now - last });
      last = now;
    }, 15000);
    return () => clearInterval(t);
  }, [screen, store]);

  const api: AppApi = useMemo(
    () => ({ store, settings, setSettings, screen, go, back, toast, startNew, continueGame, replaceSave, hasSave, refreshSave }),
    [store, settings, setSettings, screen, go, back, toast, startNew, continueGame, replaceSave, hasSave, refreshSave],
  );

  useEffect(() => installTestHooks(api), [api]);

  return (
    <AppContext.Provider value={api}>
      {screen === 'boot' && <div class="screen" />}
      {screen === 'title' && <Title />}
      {screen === 'game' && store && <Game onEnding={() => setScreen('ending')} />}
      {screen === 'ending' && store && <Ending />}
      {screen === 'settings' && <SettingsPage />}
      {screen === 'prep' && <OfflinePrep />}
      {screen === 'about' && <About />}
      <div class="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} class={`toast ${t.err ? 'err' : ''}`}>
            {t.text}
          </div>
        ))}
      </div>
      {missing && (
        <div class="banner" role="alert">
          <span style={{ flex: 1 }}>
            A game file is missing from offline storage ({missing.split('/').pop()}). Your progress is safe. When you are online, open Prepare for offline play and
            tap Repair.
          </span>
          <button class="btn small" onClick={() => setMissing(null)}>
            OK
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
