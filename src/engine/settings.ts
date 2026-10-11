// Player preferences: small, stored in localStorage (instant at boot) and mirrored to IndexedDB.
import { kvGet, kvSet } from './save';

export interface Settings {
  music: number; // 0..1
  sfx: number; // 0..1
  muted: boolean;
  textSize: 'normal' | 'large' | 'xlarge';
  reduceMotion: 'system' | 'on' | 'off';
  outlines: boolean;
  haptics: boolean;
  staticNoise: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  music: 0.6,
  sfx: 0.8,
  muted: false,
  textSize: 'normal',
  reduceMotion: 'system',
  outlines: false,
  haptics: true,
  staticNoise: true,
};

const KEY = 'albatross:settings';

export function sanitize(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? (raw as Partial<Settings>) : {}) };
  const clamp = (n: unknown, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d);
  return {
    music: clamp(s.music, DEFAULT_SETTINGS.music),
    sfx: clamp(s.sfx, DEFAULT_SETTINGS.sfx),
    muted: Boolean(s.muted),
    textSize: ['normal', 'large', 'xlarge'].includes(s.textSize) ? s.textSize : 'normal',
    reduceMotion: ['system', 'on', 'off'].includes(s.reduceMotion) ? s.reduceMotion : 'system',
    outlines: Boolean(s.outlines),
    haptics: s.haptics !== false,
    staticNoise: s.staticNoise !== false,
  };
}

export function loadSettingsSync(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitize(raw ? JSON.parse(raw) : undefined);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function loadSettings(): Promise<Settings> {
  const local = loadSettingsSync();
  try {
    if (localStorage.getItem(KEY)) return local;
  } catch {
    /* ignore */
  }
  const stored = await kvGet<Settings>('settings');
  return stored ? sanitize(stored) : local;
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  await kvSet('settings', settings);
}

export function prefersReducedMotion(settings: Settings): boolean {
  if (settings.reduceMotion === 'on') return true;
  if (settings.reduceMotion === 'off') return false;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
