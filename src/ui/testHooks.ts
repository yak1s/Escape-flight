// Automation hooks for the Playwright test-suite. Only installed when the page URL contains
// "e2e" (e.g. ?e2e=1); they expose read access to state and the real dispatch path.
import type { AppApi } from './context';
import { audio } from '../engine/audio';
import { swEvents } from '../engine/pwa';
import { loadGame } from '../engine/save';

declare global {
  interface Window {
    __albatross?: Record<string, unknown>;
  }
}

export function installTestHooks(api: AppApi) {
  if (typeof location === 'undefined' || !/e2e/.test(location.search)) return;
  window.__albatross = Object.assign(window.__albatross || {}, {
    api,
    state: () => api.store?.state ?? null,
    saveStatus: () => api.store?.saveStatus ?? null,
    dispatch: (a: never) => api.store?.dispatch(a),
    flush: () => api.store?.flush(),
    audio: () => audio.debugState(),
    swEvents: () => [...swEvents],
    loadSave: () => loadGame(),
    screen: () => api.screen,
  });
}
