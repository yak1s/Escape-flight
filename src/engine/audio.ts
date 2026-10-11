// Web Audio manager. All sounds are bundled MP3 files fetched from the offline cache
// (./audio/*.mp3). Two looping layers (music, ambience) with crossfades, plus one-shot SFX.
import type { Settings } from './settings';

type Layer = 'music' | 'ambience';

const AUDIO_BASE = './audio/';

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private layers: Record<Layer, { name: string | null; source: AudioBufferSourceNode | null; gain: GainNode | null }> = {
    music: { name: null, source: null, gain: null },
    ambience: { name: null, source: null, gain: null },
  };
  private wanted: Record<Layer, string | null> = { music: null, ambience: null };
  private settings: Settings | null = null;
  private hiddenSuspended = false;
  public errors: string[] = [];
  public played: string[] = [];

  get unlocked() {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  /** Must be called from a user gesture (tap) to satisfy autoplay rules. */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        this.master = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applySettings();
        document.addEventListener('visibilitychange', () => this.onVisibility());
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      // Start whatever was requested before unlocking.
      for (const layer of ['music', 'ambience'] as Layer[]) {
        const want = this.wanted[layer];
        if (want && this.layers[layer].name !== want) void this.play(layer, want);
      }
    } catch (error) {
      this.errors.push(String(error));
    }
  }

  setSettings(settings: Settings) {
    this.settings = settings;
    this.applySettings();
  }

  private applySettings() {
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus || !this.settings) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.music * 0.8, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.05);
  }

  private onVisibility() {
    if (!this.ctx) return;
    if (document.hidden) {
      if (this.ctx.state === 'running') {
        void this.ctx.suspend();
        this.hiddenSuspended = true;
      }
    } else if (this.hiddenSuspended) {
      this.hiddenSuspended = false;
      void this.ctx.resume();
    }
  }

  private load(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      p = (async () => {
        if (!this.ctx) return null;
        try {
          const res = await fetch(`${AUDIO_BASE}${name}.mp3`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.arrayBuffer();
          return await new Promise<AudioBuffer>((resolve, reject) => {
            const r = this.ctx!.decodeAudioData(data, resolve, reject);
            if (r && typeof (r as Promise<AudioBuffer>).then === 'function') (r as Promise<AudioBuffer>).then(resolve, reject);
          });
        } catch (error) {
          this.errors.push(`${name}: ${String(error)}`);
          this.buffers.delete(name);
          return null;
        }
      })();
      this.buffers.set(name, p);
    }
    return p;
  }

  music(name: string | null) {
    this.wanted.music = name;
    void this.play('music', name);
  }

  ambience(name: string | null) {
    this.wanted.ambience = name;
    void this.play('ambience', name);
  }

  current(layer: Layer) {
    return this.wanted[layer];
  }

  private async play(layer: Layer, name: string | null) {
    const slot = this.layers[layer];
    if (slot.name === name) return;
    if (!this.ctx || !this.musicBus) return; // will start on unlock
    const fadeOut = (gain: GainNode | null, source: AudioBufferSourceNode | null) => {
      if (!gain || !source || !this.ctx) return;
      const t = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 1.6);
      try {
        source.stop(t + 1.7);
      } catch {
        /* already stopped */
      }
    };
    fadeOut(slot.gain, slot.source);
    slot.name = name;
    slot.source = null;
    slot.gain = null;
    if (!name) return;
    const buffer = await this.load(name);
    if (!buffer || !this.ctx || slot.name !== name) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.ctx.createGain();
    const level = layer === 'ambience' ? 0.55 : 0.9;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(level, this.ctx.currentTime + 2.2);
    source.connect(gain).connect(this.musicBus);
    source.start();
    slot.source = source;
    slot.gain = gain;
    this.played.push(name);
  }

  sfx(name: string, volume = 1) {
    if (!this.ctx || !this.sfxBus) return;
    void this.load(name).then((buffer) => {
      if (!buffer || !this.ctx || !this.sfxBus) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain).connect(this.sfxBus);
      source.start();
      this.played.push(name);
    });
  }

  /** Warm the decode cache for a list of sounds (from local cache — no network). */
  preload(names: string[]) {
    if (!this.ctx) return;
    for (const n of names) void this.load(n);
  }

  debugState() {
    return {
      unlocked: this.unlocked,
      contextState: this.ctx?.state ?? 'none',
      music: this.wanted.music,
      ambience: this.wanted.ambience,
      muted: this.settings?.muted ?? false,
      musicVolume: this.settings?.music ?? null,
      sfxVolume: this.settings?.sfx ?? null,
      masterGain: this.master?.gain.value ?? null,
      errors: [...this.errors],
      played: [...this.played].slice(-30),
    };
  }
}

export const audio = new AudioManager();

export function haptic(settings: Settings, pattern: number | number[] = 12) {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
