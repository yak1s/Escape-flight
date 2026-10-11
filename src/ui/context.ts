import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { GameStore } from '../engine/store';
import type { Settings } from '../engine/settings';
import type { GameState } from '../engine/types';

export type Screen = 'boot' | 'title' | 'game' | 'prep' | 'settings' | 'about' | 'ending';

export interface AppApi {
  store: GameStore | null;
  settings: Settings;
  setSettings: (s: Settings) => void;
  screen: Screen;
  go: (s: Screen) => void;
  back: () => void;
  toast: (msg: string, err?: boolean) => void;
  startNew: () => Promise<void>;
  continueGame: () => Promise<void>;
  replaceSave: (state: GameState) => Promise<void>;
  hasSave: boolean;
  refreshSave: () => Promise<void>;
}

export const AppContext = createContext<AppApi>(null as unknown as AppApi);
export const useApp = () => useContext(AppContext);

/** Subscribe to the game store; re-render on every change. */
export function useGame(): { state: GameState; store: GameStore } {
  const { store } = useApp();
  const [, setTick] = useState(0);
  useEffect(() => store?.subscribe(() => setTick((t) => t + 1)), [store]);
  return { state: store!.state, store: store! };
}
