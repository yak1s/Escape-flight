#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate-audio.py -- procedural music & sound effects for
"Albatross -- A Frozen Signal".

Every sound in public/audio/ is synthesised from scratch by this script:
sine partials, band-limited wavetable oscillators, filtered noise and a
synthetic (noise-based) reverb.  No samples or third-party recordings are
used.  The output is deterministic (fixed random seeds).

Requirements: Python 3, numpy, ffmpeg with libmp3lame.

    python3 scripts/generate-audio.py            # build everything
    python3 scripts/generate-audio.py music_title ui_tap   # build a subset

Looping tracks are rendered on a *circular* time line: events that run past
the loop end wrap round to the start, and all filtering / reverb is done
with circular FFT convolution, so the end of the file flows seamlessly into
its beginning (the reverb tail of the last bar rings over the first bar).
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import time
import wave
import zlib
from concurrent.futures import ThreadPoolExecutor

import numpy as np

SR = 44100
TWO_PI = 2.0 * np.pi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "audio")
FFMPEG = "/usr/bin/ffmpeg" if os.path.exists("/usr/bin/ffmpeg") else (shutil.which("ffmpeg") or "ffmpeg")
FFPROBE = "/usr/bin/ffprobe" if os.path.exists("/usr/bin/ffprobe") else (shutil.which("ffprobe") or "ffprobe")

MUSIC_KBPS = 112
SFX_KBPS = 96


# =============================================================== basics ====

def secs(s: float) -> int:
    return int(round(s * SR))


def tax(n: int) -> np.ndarray:
    return np.arange(n) / SR


def db(x: float) -> float:
    return 10.0 ** (x / 20.0)


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x)) + 1e-20))


def set_rms(x: np.ndarray, target_db: float) -> np.ndarray:
    return x * (db(target_db) / rms(x))


def set_peak(x: np.ndarray, target_db: float) -> np.ndarray:
    return x * (db(target_db) / (np.max(np.abs(x)) + 1e-20))


def fast_len(n: int) -> int:
    """Smallest 2^a 3^b 5^c >= n (fast FFT size)."""
    best = 1 << int(n - 1).bit_length()
    f5 = 1
    while f5 < best:
        f35 = f5
        while f35 < best:
            p = f35
            while p < n:
                p *= 2
            best = min(best, p)
            f35 *= 3
        f5 *= 5
    return best


def fade_env(n: int, a: float, r: float) -> np.ndarray:
    """Raised-cosine fade in over a seconds and fade out over r seconds."""
    e = np.ones(n)
    na, nr = min(n, secs(a)), min(n, secs(r))
    if na > 0:
        e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr > 0:
        e[n - nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e


def env_pts(n: int, pts) -> np.ndarray:
    """Piecewise-linear envelope from [(time_s, level), ...]."""
    ts = [p[0] for p in pts]
    ls = [p[1] for p in pts]
    return np.interp(tax(n), ts, ls)


def pan_gains(p: float):
    th = (float(np.clip(p, -1.0, 1.0)) + 1.0) * np.pi / 4.0
    return np.cos(th), np.sin(th)


def pan_mono(sig: np.ndarray, p: float) -> np.ndarray:
    gl, gr = pan_gains(p)
    return np.vstack([sig * gl, sig * gr])


# ------------------------------------------------------------- filters -----

def lp(fc, order=2):
    return lambda f: 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order))


def hp(fc, order=2):
    return lambda f: 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, fc * 1e-3)) ** (2 * order))


def bp(lo, hi, order=2):
    a, b = hp(lo, order), lp(hi, order)
    return lambda f: a(f) * b(f)


def peak(fc, width_hz, gain):
    """Lorentzian resonance bump (linear gain at fc)."""
    return lambda f: 1.0 + (gain - 1.0) / (1.0 + ((f - fc) / width_hz) ** 2)


def chain(*resps):
    def r(f):
        out = np.ones_like(f)
        for q in resps:
            out = out * q(f)
        return out
    return r


def fft_filter(x, resp, loop=False, pad=None):
    """Zero-phase FFT-domain filter.  loop=True filters circularly."""
    x = np.asarray(x, dtype=float)
    n = x.shape[-1]
    if loop:
        X = np.fft.rfft(x, axis=-1)
        X *= resp(np.fft.rfftfreq(n, 1.0 / SR))
        return np.fft.irfft(X, n, axis=-1)
    pad = secs(0.08) if pad is None else pad
    N = fast_len(n + 2 * pad)
    xp = np.zeros(x.shape[:-1] + (N,))
    xp[..., pad:pad + n] = x
    X = np.fft.rfft(xp, axis=-1)
    X *= resp(np.fft.rfftfreq(N, 1.0 / SR))
    return np.fft.irfft(X, N, axis=-1)[..., pad:pad + n]


def fft_convolve(a, b):
    """Linear convolution of two 1-D signals."""
    n = len(a) + len(b) - 1
    N = fast_len(n)
    return np.fft.irfft(np.fft.rfft(a, N) * np.fft.rfft(b, N), N)[:n]


def stft_filter(x, mask_fn, loop=False, nfft=2048, chunk=256):
    """Time-varying filter.  mask_fn(centers_in_samples, freqs) -> (frames, bins)."""
    hop = nfft // 4
    x = np.asarray(x, dtype=float)
    n = len(x)
    w = 0.5 - 0.5 * np.cos(TWO_PI * np.arange(nfft) / nfft)
    w2 = w * w
    freqs = np.fft.rfftfreq(nfft, 1.0 / SR)
    if loop:
        F = int(np.ceil(n / hop))
        L = F * hop + nfft
        xe = x[np.arange(L) % n]
        offset = 0
    else:
        offset = nfft
        F = int(np.ceil((n + nfft) / hop)) + 1
        L = (F - 1) * hop + nfft
        xe = np.zeros(L)
        xe[offset:offset + n] = x
    y = np.zeros(L + nfft)
    nrm = np.zeros(L + nfft)
    ar = np.arange(nfft)
    for c0 in range(0, F, chunk):
        c1 = min(F, c0 + chunk)
        starts = np.arange(c0, c1) * hop
        frames = xe[starts[:, None] + ar[None, :]] * w
        S = np.fft.rfft(frames, axis=1)
        S *= mask_fn(starts + nfft // 2 - offset, freqs)
        out = np.fft.irfft(S, nfft, axis=1) * w
        for j in range(4):
            sub = out[j::4]
            if len(sub) == 0:
                continue
            s0 = starts[j]
            seg = sub.reshape(-1)
            y[s0:s0 + len(seg)] += seg
            nrm[s0:s0 + len(seg)] += np.tile(w2, len(sub))
    if loop:
        yy, nn = np.zeros(n), np.zeros(n)
        for k in range(0, len(y), n):
            seg = y[k:k + n]
            yy[:len(seg)] += seg
            nn[:len(seg)] += nrm[k:k + n]
        return yy / np.maximum(nn, 1e-6)
    return y[offset:offset + n] / np.maximum(nrm[offset:offset + n], 1e-6)


def sample_ctrl(arr, centers, loop):
    n = len(arr)
    c = np.asarray(centers, dtype=np.int64)
    idx = c % n if loop else np.clip(c, 0, n - 1)
    return arr[idx]


def band_mask(freqs, fc, sigma_oct):
    """Gaussian band in log-frequency. fc: (frames,) -> (frames, bins)."""
    lf = np.log2(np.maximum(freqs, 1.0))[None, :]
    return np.exp(-0.5 * ((lf - np.log2(fc)[:, None]) / sigma_oct) ** 2)


def ctrl_noise(n, rate, rng, loop=False, decim=441):
    """Smooth random control signal, std ~1, bandwidth ~rate Hz (periodic if loop)."""
    m = max(8, int(np.ceil(n / decim)) + (0 if loop else 4))
    w = rng.standard_normal(m)
    W = np.fft.rfft(w)
    fr = np.fft.rfftfreq(m, decim / SR)
    W *= np.exp(-(fr / max(rate, 1e-6)) ** 2)
    W[0] = 0.0
    c = np.fft.irfft(W, m)
    c /= c.std() + 1e-12
    xs = np.arange(n)
    if loop:
        return np.interp(xs, np.arange(m) * (n / m), c, period=n)
    return np.interp(xs, np.arange(m) * decim, c)


def lfo(n, period_s, loop, phase=0.0):
    cycles = n / SR / period_s
    if loop:
        cycles = max(1, int(round(cycles)))
    return np.sin(TWO_PI * cycles * np.arange(n) / n + phase)


def loop_freq(f, n):
    """Round a frequency so it has an integer number of cycles in n samples."""
    return max(1, round(f * n / SR)) * SR / n


# -------------------------------------------------------------- reverb -----

def make_ir(rt60=2.5, hf_damp=0.35, predelay=0.015, seed=7, length=None):
    """Synthetic stereo reverb IR: band-split noise with frequency-dependent decay."""
    L = secs(length if length else min(6.5, rt60 * 1.15))
    rng = np.random.default_rng(seed)
    t = tax(L)
    f = np.fft.rfftfreq(L, 1.0 / SR)
    centers = np.array([150.0, 500.0, 1500.0, 4000.0, 10000.0])
    lc = np.log2(centers)
    rts = rt60 * np.interp(lc, [lc[0], lc[-1]], [1.0, hf_damp])
    lf = np.log2(np.maximum(f, 1.0))
    ir = np.zeros((2, L))
    for c in range(2):
        X = np.fft.rfft(rng.standard_normal(L))
        for i in range(len(centers)):
            onehot = np.zeros(len(centers))
            onehot[i] = 1.0
            wgt = np.interp(lf, lc, onehot)
            ir[c] += np.fft.irfft(X * wgt, L) * np.exp(-6.9078 * t / rts[i])
    on = secs(0.006)
    ir[:, :on] *= np.linspace(0.0, 1.0, on) ** 2
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    return np.concatenate([np.zeros((2, secs(predelay))), ir], axis=1)


def reverb(x, ir, loop=False, cross=0.25):
    """Stereo (2,n) -> wet (2, n) if loop else (2, n + m - 1). Mono input allowed."""
    x = np.atleast_2d(np.asarray(x, dtype=float))
    if x.shape[0] == 1:
        x = np.vstack([x[0], x[0]])
    src = np.vstack([(1 - cross) * x[0] + cross * x[1], (1 - cross) * x[1] + cross * x[0]])
    n, m = x.shape[1], ir.shape[1]
    if loop:
        h = np.zeros((2, n))
        if m <= n:
            h[:, :m] = ir
        else:  # fold
            for k in range(0, m, n):
                seg = ir[:, k:k + n]
                h[:, :seg.shape[1]] += seg
        return np.fft.irfft(np.fft.rfft(src, axis=1) * np.fft.rfft(h, axis=1), n, axis=1)
    N = fast_len(n + m - 1)
    y = np.fft.irfft(np.fft.rfft(src, N, axis=1) * np.fft.rfft(ir, N, axis=1), N, axis=1)
    return y[:, :n + m - 1]


def mono_reverb(x, ir, wet):
    """Mono signal + mono reverb (left IR channel); output length len(x)."""
    y = fft_convolve(x, ir[0])[:len(x)]
    return x + wet * y


# --------------------------------------------------------------- notes -----

_NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi_of(name) -> int:
    if isinstance(name, (int, np.integer)):
        return int(name)
    letter, i, acc = name[0].upper(), 1, 0
    while i < len(name) and name[i] in "#b":
        acc += 1 if name[i] == "#" else -1
        i += 1
    return 12 * (int(name[i:]) + 1) + _NOTE[letter] + acc


def mtof(m) -> float:
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def hz(name) -> float:
    return mtof(midi_of(name))


def pc_of(name: str) -> int:
    letter, acc = name[0], name.count("#") - name[1:].count("b")
    return (_NOTE[letter] + acc) % 12


CHORDS = {
    "Am": ["A", "C", "E"], "Em": ["E", "G", "B"], "F": ["F", "A", "C"],
    "G": ["G", "B", "D"], "C": ["C", "E", "G"], "Dm": ["D", "F", "A"],
    "E": ["E", "G#", "B"], "E7": ["E", "G#", "B", "D"], "A": ["A", "C#", "E"],
    "D": ["D", "F#", "A"], "F#m": ["F#", "A", "C#"], "Bb": ["Bb", "D", "F"],
    "Am9": ["A", "C", "E", "G", "B"], "Fmaj7": ["F", "A", "C", "E"],
    "Cadd9": ["C", "E", "G", "D"], "Dm9": ["D", "F", "A", "C", "E"],
}


def chord_pcs(ch):
    return [pc_of(x) for x in CHORDS[ch]]


def lowest_at_least(pc, lo):
    m = lo
    while m % 12 != pc:
        m += 1
    return m


def voicing(ch, bass_lo=38, upper_lo=55, fifth=True, bass=True, top=None):
    pcs = chord_pcs(ch)
    notes = []
    if bass:
        b = lowest_at_least(pcs[0], bass_lo)
        notes.append(b)
        if fifth and len(pcs) >= 3:
            notes.append(lowest_at_least(pcs[2], b + 1))
    upper = sorted({lowest_at_least(p, upper_lo) for p in pcs[1:] + pcs[:1]})
    if top is not None:
        upper = upper[:top]
    return sorted(set(notes + upper))


def harmony_midi(note, ch):
    """Highest chord tone at least a minor third below the melody note."""
    m = midi_of(note)
    pcs = set(chord_pcs(ch))
    for k in range(m - 3, m - 13, -1):
        if k % 12 in pcs:
            return k
    return None


def transpose(notes, k):
    return [None if x is None else midi_of(x) + k for x in notes]


# ========================================================= instruments =====

MB_RATIOS = (1.0, 2.0, 3.0, 4.2, 5.4)
MB_AMPS = (1.0, 0.42, 0.20, 0.12, 0.08)
MB_TAUS = (1.0, 0.48, 0.28, 0.13, 0.08)


def music_box_note(freq, dur=3.0, vel=1.0, rng=None, detune_cents=None, tau=1.6, rel=0.25):
    """Music-box tine: harmonic + slightly inharmonic partials, fast attack, exp decay."""
    n = secs(dur)
    t = tax(n)
    r = rng if rng is not None else np.random.default_rng(int(freq * 10))
    if detune_cents is None:
        detune_cents = r.normal(0.0, 1.5)
    f = freq * 2.0 ** (detune_cents / 1200.0)
    base = tau * (440.0 / f) ** 0.45
    y = np.zeros(n)
    for i, (ratio, a, k) in enumerate(zip(MB_RATIOS, MB_AMPS, MB_TAUS)):
        fr = f * ratio * (1.0 + (r.normal(0.0, 0.0006) if i > 2 else 0.0))
        if fr > 0.45 * SR:
            continue
        y += a * np.sin(TWO_PI * fr * t) * np.exp(-t / (base * k))
    y += 0.10 * np.sin(TWO_PI * (f + 0.8) * t) * np.exp(-t / (base * 0.8))
    m = secs(0.008)
    tick = r.standard_normal(m) * np.exp(-np.arange(m) / (SR * 0.0012))
    y[:m] += 0.03 * np.diff(tick, prepend=0.0)
    att = secs(0.002)
    y[:att] *= np.sin(np.linspace(0, np.pi / 2, att)) ** 2
    y *= fade_env(n, 0.0, rel)
    return 0.5 * vel * y


def celesta_note(freq, dur=3.5, vel=1.0, rng=None):
    n = secs(dur)
    t = tax(n)
    base = 2.2 * (440.0 / freq) ** 0.4
    y = np.zeros(n)
    for ratio, a, k in ((1.0, 1.0, 1.0), (2.0, 0.18, 0.45), (3.0, 0.05, 0.3), (4.0, 0.13, 0.18), (6.0, 0.035, 0.1)):
        if freq * ratio < 0.45 * SR:
            y += a * np.sin(TWO_PI * freq * ratio * t) * np.exp(-t / (base * k))
    att = secs(0.004)
    y[:att] *= np.sin(np.linspace(0, np.pi / 2, att)) ** 2
    y *= fade_env(n, 0.0, 0.3)
    return 0.5 * vel * y


BELL_PARTS = ((0.5, 0.30, 1.5), (1.0, 1.0, 1.0), (2.0, 0.28, 0.6), (2.76, 0.42, 0.45),
              (5.40, 0.20, 0.22), (8.93, 0.09, 0.12))


def bell_note(freq, dur=5.0, vel=1.0, rng=None, tau=2.4, bright=1.0):
    """Bell: inharmonic partials (hum, 1, 2, 2.76, 5.40, 8.93) with gentle warble."""
    n = secs(dur)
    t = tax(n)
    base = tau * (440.0 / freq) ** 0.5
    y = np.zeros(n)
    for i, (ratio, a, k) in enumerate(BELL_PARTS):
        fr = freq * ratio
        if fr > 0.45 * SR:
            continue
        if ratio > 2.5:
            a *= bright
        beat = 0.4 + 0.25 * i
        env = np.exp(-t / (base * k))
        y += a * (0.62 * np.sin(TWO_PI * fr * t) + 0.38 * np.sin(TWO_PI * (fr + beat) * t + 1.0)) * env
    m = secs(0.004)
    r = rng if rng is not None else np.random.default_rng(int(freq))
    y[:m] += 0.05 * r.standard_normal(m) * np.exp(-np.arange(m) / (SR * 0.0008))
    att = secs(0.0015)
    y[:att] *= np.linspace(0, 1, att)
    y *= fade_env(n, 0.0, 0.4)
    return 0.4 * vel * y


def glass_note(freq, dur=1.5, vel=1.0, tau=0.5):
    n = secs(dur)
    t = tax(n)
    y = np.zeros(n)
    for ratio, a, k in ((1.0, 1.0, 1.0), (2.32, 0.3, 0.5), (4.25, 0.12, 0.25)):
        if freq * ratio < 0.45 * SR:
            y += a * np.sin(TWO_PI * freq * ratio * t) * np.exp(-t / (tau * k))
    att = secs(0.003)
    y[:att] *= np.sin(np.linspace(0, np.pi / 2, att)) ** 2
    y *= fade_env(n, 0.0, min(0.2, dur / 3))
    return 0.5 * vel * y


TBL = 2048
_TABLES: dict = {}


def wavetable(shape, H):
    key = (shape, H)
    if key not in _TABLES:
        h = np.arange(1, H + 1, dtype=float)
        if shape == "saw":
            a = 1.0 / h
        elif shape == "tri":
            a = np.where(h % 2 == 1, ((-1.0) ** ((h - 1) // 2)) / h ** 2, 0.0) * (8 / np.pi ** 2)
        elif shape == "sq":
            a = np.where(h % 2 == 1, 1.0 / h, 0.0)
        else:
            a = np.zeros(H)
            a[0] = 1.0
        X = np.zeros(TBL // 2 + 1, dtype=complex)
        X[1:H + 1] = -1j * a * TBL / 2
        tab = np.fft.irfft(X, TBL)
        _TABLES[key] = np.append(tab, tab[0])
    return _TABLES[key]


def osc(shape, f, n, ph0=0.0, fmax=5000.0, fm=None):
    """Band-limited wavetable oscillator. fm: optional per-sample frequency ratio."""
    H = int(max(1, min(fmax / f, 0.45 * SR / f, TBL // 2 - 1)))
    tab = wavetable(shape, H)
    if fm is None:
        ph = (ph0 + f * np.arange(n) / SR) % 1.0
    else:
        ph = (ph0 + np.cumsum(f * fm) / SR) % 1.0
    x = ph * TBL
    i = x.astype(np.int64)
    fr = x - i
    return tab[i] + fr * (tab[i + 1] - tab[i])


def pluck(freq, dur=0.8, vel=1.0, tau=0.22, rng=None, bright=1600.0, att=0.006):
    n = secs(dur)
    t = tax(n)
    ph = rng.random() if rng is not None else 0.0
    y = 0.65 * osc("saw", freq, n, ph, bright) + 0.7 * np.sin(TWO_PI * freq * t)
    env = np.exp(-t / tau)
    att = secs(att)
    env[:att] *= np.sin(np.linspace(0, np.pi / 2, att)) ** 2
    return vel * y * env * fade_env(n, 0.0, 0.05)


def resonator(t, modes):
    y = np.zeros(len(t))
    for f, tau, a in modes:
        if f < 0.45 * SR:
            y += a * np.sin(TWO_PI * f * t) * np.exp(-t / tau)
    return y


PAD_STYLES = {
    "cold": dict(shapes=("tri", "saw", "tri"), voices=3, detune=10.0, fmax=4000.0, attack=0.9,
                 release=1.8, bass_lo=38, upper_lo=55, fifth=True, bass=True),
    "warm": dict(shapes=("saw", "tri", "saw"), voices=3, detune=8.0, fmax=3000.0, attack=2.5,
                 release=3.5, bass_lo=36, upper_lo=53, fifth=True, bass=True),
    "dark": dict(shapes=("saw", "tri"), voices=2, detune=6.0, fmax=1500.0, attack=1.2,
                 release=2.0, bass_lo=33, upper_lo=50, fifth=True, bass=True),
    "strings": dict(shapes=("saw", "saw", "saw"), voices=3, detune=12.0, fmax=5000.0, attack=1.3,
                    release=2.0, bass_lo=48, upper_lo=62, fifth=False, bass=False),
    "low": dict(shapes=("saw", "tri", "saw"), voices=3, detune=7.0, fmax=1500.0, attack=1.0,
                release=1.5, bass_lo=28, upper_lo=45, fifth=True, bass=True),
}


def pad_segment(freqs, dur, attack, release, rng, shapes=("saw",), voices=3, detune=8.0,
                fmax=4000.0, width=0.75, **_):
    n = secs(dur)
    out = np.zeros((2, n))
    for j, f in enumerate(freqs):
        amp = (1.0 if j > 0 else 0.85) / np.sqrt(voices)
        for v in range(voices):
            pos = (v / (voices - 1)) * 2 - 1 if voices > 1 else 0.0
            cents = pos * detune + rng.normal(0.0, 1.5)
            fv = f * 2.0 ** (cents / 1200.0)
            sig = osc(shapes[v % len(shapes)], fv, n, rng.random(), fmax)
            out += pan_mono(sig * amp, pos * width + rng.uniform(-0.1, 0.1))
    return out * fade_env(n, attack, release)


def grid_segs(plan, seg_dur, t0=0.0):
    segs = []
    for i, ch in enumerate(plan):
        if segs and segs[-1][0] == ch:
            segs[-1][2] += seg_dur
        else:
            segs.append([ch, t0 + i * seg_dur, seg_dur])
    return segs


def render_pad(track, segs, style, rng, gain_fn=None, lead=0.12, voicing_override=None):
    st = PAD_STYLES[style]
    for ch, start, d in segs:
        if voicing_override:
            notes = voicing_override(ch)
        else:
            notes = voicing(ch, st["bass_lo"], st["upper_lo"], st["fifth"], st["bass"])
        opts = {k: v for k, v in st.items() if k in ("shapes", "voices", "detune", "fmax")}
        sig = pad_segment([mtof(m) for m in notes], d + st["release"] + lead, st["attack"],
                          st["release"], rng, **opts)
        g = gain_fn(start) if gain_fn else 1.0
        track.add(sig, start - lead, gain=g)


# ================================================================ track ====

class Track:
    """Stereo (or mono) mix bus. loop=True wraps events round the loop end."""

    def __init__(self, dur, loop, tail=0.0, ch=2):
        self.n = secs(dur)
        self.loop = loop
        self.ch = ch
        self.buf = np.zeros((ch, self.n + (0 if loop else secs(tail))))

    def add(self, sig, t0, gain=1.0, pan=0.0):
        sig = np.asarray(sig, dtype=float)
        if sig.ndim == 1:
            s = pan_mono(sig, pan) if self.ch == 2 else sig[None, :]
        else:
            s = sig if self.ch == 2 else sig.mean(axis=0, keepdims=True)
        if gain != 1.0:
            s = s * gain
        start = int(round(t0 * SR))
        L = s.shape[1]
        if self.loop:
            start %= self.n
            pos = 0
            while pos < L:
                st = (start + pos) % self.n
                k = min(L - pos, self.n - st)
                self.buf[:, st:st + k] += s[:, pos:pos + k]
                pos += k
        else:
            total = self.buf.shape[1]
            a, b = max(0, start), min(total, start + L)
            if b > a:
                self.buf[:, a:b] += s[:, a - start:b - start]


def phrase(track, notes, t0, E, rng, inst=None, gain=1.0, chords=None, harm=0.0, bass=0.0,
           onsets=None, pan=0.0):
    """Play a melody phrase (one note per eighth) with optional chord-aware lower harmony."""
    inst = inst or music_box_note
    if onsets is None:
        onsets = [i * E for i in range(12)]
    for i, nm in enumerate(notes):
        if nm is None:
            continue
        t = t0 + onsets[i] + rng.normal(0.0, 0.004)
        acc = 1.0 if i % 3 == 0 else 0.86
        v = gain * acc * rng.uniform(0.92, 1.0)
        track.add(inst(hz(nm), vel=v, rng=rng), t, pan=pan + rng.uniform(-0.12, 0.12))
        if chords is not None and harm > 0:
            hm = harmony_midi(nm, chords[min(i // 3, len(chords) - 1)])
            if hm is not None:
                track.add(inst(mtof(hm), vel=v * harm, rng=rng), t + 0.006, pan=pan - 0.25)
    if chords is not None and bass > 0:
        for h, ch in enumerate(chords):
            r = lowest_at_least(chord_pcs(ch)[0], 52)
            track.add(inst(mtof(r), vel=gain * bass, rng=rng), t0 + onsets[h * 3] + 0.004, pan=pan - 0.35)


# ========================================================= mastering =======

def k_weight(f):
    """Magnitude of the ITU-R BS.1770 K-weighting (high shelf + RLB high-pass)."""
    shelf = np.sqrt((1.0 + (f / 1500.0) ** 2 * db(4.0) ** 2) / (1.0 + (f / 1500.0) ** 2))
    return shelf * hp(38.0, 2)(f)


def loudness(x, window=None):
    """BS.1770-style loudness (LUFS-ish): integrated, or max momentary over `window` s."""
    x = np.atleast_2d(x)
    y = fft_filter(x, k_weight, loop=True)
    p = np.sum(y ** 2, axis=0)
    if window is None:
        return -0.691 + 10 * np.log10(np.mean(p) + 1e-20)
    w = max(1, min(len(p), secs(window)))
    c = np.concatenate([[0.0], np.cumsum(p)])
    return -0.691 + 10 * np.log10(np.max((c[w:] - c[:-w]) / w) + 1e-20)


def limiter(x, thr, loop, block=128, look=4, release=0.25):
    """Gentle look-ahead peak limiter (block based, vectorised except a short per-block recursion)."""
    x = np.atleast_2d(x)
    n = x.shape[1]
    a = np.max(np.abs(x), axis=0)
    nb = int(np.ceil(n / block))
    padn = nb * block - n
    a = np.concatenate([a, a[:padn] if loop else np.zeros(padn)])
    bm = a.reshape(nb, block).max(axis=1)
    dil = bm.copy()
    for k in range(1, look + 1):
        dil = np.maximum(dil, np.roll(bm, k))
        dil = np.maximum(dil, np.roll(bm, -k))
    g = np.minimum(1.0, thr / np.maximum(dil, 1e-12))
    coef = 1.0 - np.exp(-block / (release * SR))
    gs = np.empty(nb)
    prev = 1.0
    for _ in range(2 if loop else 1):
        for b in range(nb):
            prev = min(g[b], prev + (1.0 - prev) * coef)
            gs[b] = prev
    w = np.hanning(2 * look + 3)[1:-1]
    w /= w.sum()
    gs = np.convolve(np.concatenate([gs[-look:], gs, gs[:look]]), w, mode="valid")
    xp = (np.arange(nb) + 0.5) * block
    gi = np.interp(np.arange(n), xp, gs, period=n if loop else None)
    return x * gi


def master_music(x, loop, peak_db=-3.0, loud_db=-20.0, hp_hz=28.0, max_limit_db=1.5):
    """High-pass, then gain to the loudness target; peaks above peak_db are limited by at
    most max_limit_db, beyond that the whole track is turned down instead."""
    x = fft_filter(x, hp(hp_hz, 2), loop=loop)
    x = x - x.mean(axis=1, keepdims=True)
    thr = db(peak_db)
    y = x * db(loud_db - loudness(x))
    excess = np.max(np.abs(y)) / thr
    if excess > db(max_limit_db):
        y *= db(max_limit_db) / excess
    if excess > 1.0:
        y = limiter(y, thr * 0.995, loop)
    return y


def master_sfx(x, peak_db=-6.0, loud_db=-16.0, soft_hz=11000.0, hp_hz=35.0):
    """Peak-normalise to peak_db, but never louder than loud_db (max momentary loudness)."""
    x = fft_filter(np.asarray(x, dtype=float), chain(hp(hp_hz, 2), lp(soft_hz, 2)))
    x = x * fade_env(len(x), 0.0005, 0.012)
    g = db(peak_db) / (np.max(np.abs(x)) + 1e-20)
    if loud_db is not None:
        L = loudness(x * g, window=0.4)
        if L > loud_db:
            g *= db(loud_db - L)
    return x * g


# ============================================================ melodies =====

E_DEF = 0.39
A1 = ["E4", "A4", "C5", "B4", "A4", "E4", "G4", "A4"]
A2 = ["C5", "D5", "E5", "D5", "C5", "A4", "B4", "A4"]
B1 = ["A4", "C5", "E5", "G5", "E5", "D5", "C5", "B4"]
B2 = ["A4", "B4", "C5", "E5", "D5", "B4", "A4", None]
A1M = ["E4", "A4", "C#5", "B4", "A4", "E4", "G#4", "A4"]
A2M = ["C#5", "D5", "E5", "D5", "C#5", "A4", "B4", "A4"]
B1M = ["A4", "C#5", "E5", "G#5", "E5", "D5", "C#5", "B4"]
B2M = ["A4", "B4", "C#5", "E5", "D5", "B4", "A4", None]
A1C = ["G4", "C5", "E5", "D5", "C5", "G4", "B4", "C5"]
A2C = ["E5", "F5", "G5", "F5", "E5", "C5", "D5", "C5"]
# harmony, one chord per dotted quarter (half bar of 6/8)
CH_A = ["Am", "Em", "F", "G", "C", "Dm", "E", "Am"]
CH_B = ["Am", "G", "C", "E", "Am", "E7", "Am", "Am"]
CH_AM = ["A", "E", "E", "A", "A", "D", "E", "A"]
CH_BM = ["A", "E7", "D", "E", "A", "E7", "A", "A"]
CH_AC = ["C", "G", "G", "C", "C", "F", "G", "C"]


def air_layer(n, rng, loop, level_lfo_period=20.0):
    a = fft_filter(rng.standard_normal((2, n)), bp(2500, 8000, 2), loop=loop)
    a *= 0.6 + 0.4 * (0.5 + 0.5 * lfo(n, level_lfo_period, loop))
    return a


def filter_sweep(x, lo_hz, hi_hz, period_s, loop, order=2, phase=0.0):
    """Slow filter LFO: crossfade between a dark and a bright low-passed copy."""
    dark = fft_filter(x, lp(lo_hz, order), loop=loop)
    bright = fft_filter(x, lp(hi_hz, order), loop=loop)
    m = 0.5 + 0.5 * lfo(x.shape[-1], period_s, loop, phase)
    return dark * (1 - m) + bright * m


# =============================================================== music =====

def music_title():
    rng = np.random.default_rng(1001)
    E = E_DEF
    BAR = 6 * E
    bars = 20
    dur = bars * BAR
    n = secs(dur)
    tb = lambda b: b * BAR
    box, pad = Track(dur, True), Track(dur, True)
    plan = (["Am", "Am", "F", "F"] + CH_A + ["F", "F", "E", "E"] + CH_A + CH_B
            + ["Am", "Am", "F", "F", "Dm", "Dm", "E", "E"])
    assert len(plan) == 2 * bars
    render_pad(pad, grid_segs(plan, 3 * E), "cold", rng)
    # the lullaby, first plain, then with a soft lower harmony
    phrase(box, A1, tb(2), E, rng)
    phrase(box, A2, tb(4), E, rng)
    phrase(box, A1, tb(8), E, rng, chords=CH_A[:4], harm=0.36, bass=0.28)
    phrase(box, A2, tb(10), E, rng, chords=CH_A[4:], harm=0.36, bass=0.28)
    phrase(box, B1, tb(12), E, rng, gain=0.9, chords=CH_B[:4], harm=0.3, bass=0.26)
    phrase(box, B2, tb(14), E, rng, gain=0.9, chords=CH_B[4:], harm=0.3, bass=0.26)
    # outro: the opening motif, slowly, fading
    for k, nm in enumerate(["E4", "A4", "C5", "B4"]):
        box.add(music_box_note(hz(nm), vel=0.55 - 0.04 * k, rng=rng), tb(16) + k * 3 * E, pan=0.1)
    box.add(music_box_note(hz("A4"), vel=0.42, rng=rng), tb(18), pan=0.1)
    # intro sparkles
    box.add(music_box_note(hz("E5"), vel=0.25, rng=rng), tb(0) + 1.5 * E, pan=0.5)
    box.add(music_box_note(hz("A5"), vel=0.2, rng=rng), tb(1) + 1.5 * E, pan=-0.5)

    padbus = filter_sweep(pad.buf, 1300, 2600, dur / 2, True)
    padbus *= 1.0 + 0.12 * lfo(n, dur / 4, True, 1.0)
    dry_box = set_rms(box.buf, -20.0)
    padbus = set_rms(padbus, -27.0)
    air = set_rms(air_layer(n, rng, True, dur / 3), -41.0)
    ir = make_ir(rt60=3.2, hf_damp=0.35, seed=11)
    wet = reverb(0.55 * dry_box + 0.8 * padbus + air, ir, loop=True)
    mix = dry_box + padbus + air + 0.38 * wet
    return master_music(mix, True, loud_db=-16.0)


def music_resonance():
    rng = np.random.default_rng(2002)
    dur = 45.0
    n = secs(dur)
    seg = dur / 4
    pad, glass, cel = Track(dur, True), Track(dur, True), Track(dur, True)
    chords = ["Am9", "Fmaj7", "Cadd9", "Dm9"]
    voices = {
        "Am9": [45, 52, 59, 60, 64, 67],      # A2 E3 B3 C4 E4 G4
        "Fmaj7": [41, 48, 57, 60, 64, 65],    # F2 C3 A3 C4 E4 F4
        "Cadd9": [48, 55, 62, 64, 67, 72],    # C3 G3 D4 E4 G4 C5
        "Dm9": [38, 45, 57, 60, 64, 65],      # D2 A2 A3 C4 E4 F4
    }
    render_pad(pad, [[c, i * seg, seg] for i, c in enumerate(chords)], "warm", rng,
               lead=1.2, voicing_override=lambda c: voices[c])
    # aurora: slowly breathing high glassy partials
    for i, c in enumerate(chords):
        pcs = chord_pcs(c)
        picks = [lowest_at_least(p, 81) for p in rng.choice(pcs, 3, replace=False)]
        picks.append(lowest_at_least(int(rng.choice(pcs)), 93))
        L = seg + 5.0
        m = secs(L)
        t = tax(m)
        layer = np.zeros((2, m))
        for f in [mtof(x) for x in picks]:
            amp = np.exp(0.9 * ctrl_noise(m, 0.15, rng))
            amp /= amp.mean()
            vib = 1.0 + 0.0012 * np.sin(TWO_PI * rng.uniform(3.5, 5.5) * t + rng.uniform(0, TWO_PI))
            ph = np.cumsum(f * vib) / SR
            s = np.sin(TWO_PI * ph) + 0.12 * np.sin(TWO_PI * 2 * ph)
            layer += pan_mono(s * amp, rng.uniform(-0.85, 0.85))
        layer *= fade_env(m, 2.8, 3.5)
        glass.add(layer, i * seg - 1.5)
        # sparse glints
        for _ in range(rng.poisson(seg * 0.6)):
            p = lowest_at_least(int(rng.choice(pcs)), int(rng.choice([84, 96])))
            glass.add(glass_note(mtof(p), 2.0, rng.uniform(0.3, 0.7), tau=rng.uniform(0.4, 0.9)),
                      i * seg + rng.uniform(0, seg), pan=rng.uniform(-0.9, 0.9))
    # faint fragments of the lullaby on a celesta-like tone (an octave up)
    frags = [(4.6, ["E5", "A5", "C6", "B5"], 0.55), (16.2, ["A5", "E5", "G5", "A5"], 0.5),
             (26.0, ["C6", "D6", "E6", "D6"], 0.55), (37.6, ["C6", "A5", "B5", "A5"], 0.5)]
    for t0, notes, step in frags:
        for k, nm in enumerate(notes):
            cel.add(celesta_note(hz(nm), vel=0.9 - 0.08 * k, rng=rng), t0 + k * step + rng.normal(0, 0.01),
                    pan=rng.uniform(-0.4, 0.4))
    padbus = filter_sweep(pad.buf, 900, 2200, dur / 2, True)
    padbus *= 1.0 + 0.1 * lfo(n, dur / 3, True)
    padbus = set_rms(padbus, -24.0)
    gl = set_rms(fft_filter(glass.buf, lp(9000, 1), loop=True), -33.0)
    ce = set_rms(cel.buf, -31.0)
    ir = make_ir(rt60=4.5, hf_damp=0.5, seed=22, predelay=0.03)
    wet = reverb(0.6 * padbus + gl + 1.1 * ce, ir, loop=True)
    mix = padbus + 0.8 * gl + ce + 0.5 * wet
    return master_music(mix, True, loud_db=-17.0, max_limit_db=2.0)


def music_tension():
    rng = np.random.default_rng(3003)
    q = 60.0 / 70.0
    e = q / 2
    bars = 12
    dur = bars * 4 * q
    n = secs(dur)
    chords = ["Am", "Am", "F", "F", "Dm", "Dm", "E", "E", "Am", "Am", "Bb", "E"]
    bass, pad, ticks, misc = Track(dur, True), Track(dur, True), Track(dur, True), Track(dur, True)
    pattern = [0, 0, 7, 0, 0, 7, 12, 7]
    accents = [1.0, 0.55, 0.7, 0.85, 0.55, 0.7, 0.8, 0.6]
    for b, ch in enumerate(chords):
        root = lowest_at_least(chord_pcs(ch)[0], 38)
        for k in range(8):
            v = accents[k] * rng.uniform(0.9, 1.0)
            bass.add(pluck(mtof(root + pattern[k]), 0.9, v, tau=0.2, rng=rng, bright=1200.0, att=0.012),
                     (b * 8 + k) * e + rng.normal(0, 0.003), pan=rng.uniform(-0.1, 0.1))
        # heartbeat-like soft low thump
        for dt, a in ((0.0, 1.0), (0.24, 0.6)):
            m = secs(0.5)
            t = tax(m)
            thump = np.sin(TWO_PI * (42 + 30 * np.exp(-t / 0.04)) * t) * np.exp(-t / 0.12)
            misc.add(thump * a, b * 4 * q + dt)
    render_pad(pad, grid_segs(chords, 4 * q), "dark", rng)
    # soft clock: tick / tock on every beat
    for k in range(bars * 4):
        m = secs(0.06)
        t = tax(m)
        sc = 1.0 if k % 2 == 0 else 0.78
        modes = [(2600 * sc, 0.006, 1.0), (4100 * sc, 0.004, 0.5), (1400 * sc, 0.009, 0.4)]
        tk = resonator(t, modes) + 0.3 * rng.standard_normal(m) * np.exp(-t / 0.0007)
        ticks.add(tk * rng.uniform(0.85, 1.0), k * q + 0.002, pan=0.35)
    # a faint high dissonance hovering over the dominant bars
    for b0, b1 in ((6, 8), (10, 12)):
        L = (b1 - b0) * 4 * q + 2.0
        m = secs(L)
        t = tax(m)
        s = (np.sin(TWO_PI * hz("B5") * t) + 0.8 * np.sin(TWO_PI * hz("C6") * t + 1.0)) * fade_env(m, 2.0, 2.5)
        misc.add(s * 0.02, b0 * 4 * q, pan=-0.4)
    bb = set_rms(fft_filter(bass.buf, lp(650, 2), loop=True), -21.0)
    pd = set_rms(fft_filter(pad.buf, lp(800, 2), loop=True), -25.0)
    pd *= 0.85 + 0.15 * lfo(n, 4 * q * 2, True)
    tk = set_rms(ticks.buf, -36.0)
    ms = misc.buf * (db(-30.0) / rms(misc.buf[:, :]))
    ir = make_ir(rt60=2.2, hf_damp=0.4, seed=33)
    wet = reverb(0.4 * bb + pd + tk + ms, ir, loop=True)
    mix = bb + pd + tk + ms + 0.3 * wet
    # start the file half an eighth before the downbeat so the loop seam sits in a
    # quiet note tail rather than on a transient
    mix = np.roll(mix, secs(e / 2), axis=1)
    return master_music(mix, True, loud_db=-17.0, max_limit_db=4.0)


def music_finale():
    rng = np.random.default_rng(5005)
    E = E_DEF
    BAR = 6 * E
    bars = 34
    dur = bars * BAR
    n = secs(dur)
    tb = lambda b: b * BAR
    box, bells, pad, strings = Track(dur, True), Track(dur, True), Track(dur, True), Track(dur, True)
    pulse, glass, cel = Track(dur, True), Track(dur, True), Track(dur, True)
    plan = (["Am"] * 4 + CH_A + CH_A + CH_B + CH_A + CH_AC + ["F", "F", "G", "G"] + CH_AM + CH_BM + ["A"] * 4)
    assert len(plan) == 2 * bars
    pad_gain = lambda t: float(np.interp(t / BAR, [0, 2, 6, 10, 14, 18, 22, 24, 30, 32, 34],
                                         [0.55, 0.6, 0.7, 0.8, 0.9, 0.95, 1.05, 1.15, 1.15, 0.8, 0.55]))
    render_pad(pad, grid_segs(plan, 3 * E), "cold", rng, gain_fn=pad_gain)
    render_pad(strings, grid_segs(plan[28:64], 3 * E, tb(14)), "strings", rng,
               gain_fn=lambda t: float(np.interp(t / BAR, [14, 18, 22, 24, 30, 31], [0.3, 0.6, 0.8, 1.0, 1.0, 0.6])))

    def doubled(notes, t0, chords, harm, bass, bell_gain=0.0, cel_gain=0.0, gain=1.0):
        phrase(box, notes, t0, E, rng, gain=gain, chords=chords, harm=harm, bass=bass)
        for i, nm in enumerate(notes):
            if nm is None:
                continue
            if bell_gain and i % 3 == 0:
                bells.add(bell_note(hz(nm), 4.0, bell_gain, rng, tau=1.6), t0 + i * E, pan=0.2)
            if cel_gain:
                cel.add(celesta_note(hz(midi_of(nm) + 12), vel=cel_gain, rng=rng), t0 + i * E + 0.01, pan=-0.3)

    # statement 1: the music box alone
    doubled(A1, tb(2), CH_A[:4], 0, 0)
    doubled(A2, tb(4), CH_A[4:], 0, 0)
    # statement 2: lower harmony + celesta shadow
    doubled(A1, tb(6), CH_A[:4], 0.34, 0.24, cel_gain=0.3)
    doubled(A2, tb(8), CH_A[4:], 0.34, 0.24, cel_gain=0.3)
    # B section with bells on the bar lines
    doubled(B1, tb(10), CH_B[:4], 0.34, 0.24)
    doubled(B2, tb(12), CH_B[4:], 0.34, 0.24)
    for b in range(10, 14):
        bells.add(bell_note(mtof(lowest_at_least(chord_pcs(plan[2 * b])[0], 57)), 5.0, 0.7, rng), tb(b), pan=-0.2)
    # statement 3: fuller, bells doubling
    doubled(A1, tb(14), CH_A[:4], 0.4, 0.3, bell_gain=0.35)
    doubled(A2, tb(16), CH_A[4:], 0.4, 0.3, bell_gain=0.35)
    # lift into the relative major
    doubled(A1C, tb(18), CH_AC[:4], 0.4, 0.3, bell_gain=0.35, cel_gain=0.25)
    doubled(A2C, tb(20), CH_AC[4:], 0.4, 0.3, bell_gain=0.35, cel_gain=0.25)
    arp = [("A4", "C5", "F5", "C5", "F5", "A5"), ("B4", "D5", "G5", "D5", "G5", "B5")]
    for bi, notes in enumerate(arp):
        for k, nm in enumerate(notes):
            box.add(music_box_note(hz(nm), vel=0.45 + 0.05 * (bi * 6 + k) / 2, rng=rng), tb(22 + bi) + k * E,
                    pan=rng.uniform(-0.2, 0.2))
        bells.add(bell_note(hz(["F3", "G3"][bi]), 5.0, 0.8, rng), tb(22 + bi), pan=0.0)
    # the theme in A major
    doubled(A1M, tb(24), CH_AM[:4], 0.45, 0.3, bell_gain=0.4, cel_gain=0.25)
    doubled(A2M, tb(26), CH_AM[4:], 0.45, 0.3, bell_gain=0.4, cel_gain=0.25)
    doubled(B1M, tb(28), CH_BM[:4], 0.4, 0.3, bell_gain=0.35)
    doubled(B2M, tb(30), CH_BM[4:], 0.4, 0.3, bell_gain=0.3)
    # coda
    for k, nm in enumerate(["A3", "C#4", "E4", "A4"]):
        box.add(music_box_note(hz(nm), vel=0.5 - 0.05 * k, rng=rng), tb(32) + 0.6 + k * 0.16, pan=0.15)
    bells.add(bell_note(hz("A3"), 6.0, 0.8, rng), tb(32), pan=0.0)
    # gentle pulse
    for b in range(2, 32):
        for h in range(2):
            ch = plan[2 * b + h]
            root = lowest_at_least(chord_pcs(ch)[0], 40)
            fifth = root + 7
            t0 = tb(b) + h * 3 * E
            if b < 6:
                pulse.add(pluck(mtof(root), 1.0, 0.35, tau=0.35, rng=rng), t0)
            elif b < 14:
                pulse.add(pluck(mtof(root), 1.0, 0.6, tau=0.35, rng=rng), t0)
            else:
                lvl = 0.55 if b < 22 else (0.6 + 0.05 * (b - 22) if b < 24 else 0.72)
                for k, (iv, acc) in enumerate(((0, 1.0), (7, 0.5), (12, 0.6))):
                    pulse.add(pluck(mtof(root + iv), 0.8, lvl * acc, tau=0.25, rng=rng), t0 + k * E)
    pulse.add(pluck(hz("A2"), 1.5, 0.6, tau=0.6, rng=rng), tb(32))
    # aurora shimmer over the A-major climax
    m = secs(tb(32) - tb(24) + 4.0)
    t = tax(m)
    layer = np.zeros((2, m))
    for nm in ["A6", "C#7", "E7", "A7"]:
        amp = np.exp(0.8 * ctrl_noise(m, 0.2, rng))
        layer += pan_mono(np.sin(TWO_PI * hz(nm) * t + rng.uniform(0, TWO_PI)) * amp / amp.mean(), rng.uniform(-0.8, 0.8))
    glass.add(layer * fade_env(m, 4.0, 4.0), tb(24) - 1.0)

    padbus = filter_sweep(pad.buf, 1400, 2800, dur / 2, True)
    padbus = set_rms(padbus, -25.0)
    st = set_rms(fft_filter(strings.buf, lp(3000, 2), loop=True), -31.0)
    bx = set_rms(box.buf, -19.0)
    bl = set_rms(bells.buf, -27.0)
    pu = set_rms(fft_filter(pulse.buf, lp(520, 2), loop=True), -27.0)
    ce = set_rms(cel.buf, -32.0)
    gl = set_rms(glass.buf, -38.0)
    ir = make_ir(rt60=3.5, hf_damp=0.4, seed=55)
    wet = reverb(0.55 * bx + bl + 0.8 * padbus + st + ce + gl + 0.3 * pu, ir, loop=True)
    mix = bx + bl + padbus + st + pu + ce + gl + 0.38 * wet
    return master_music(mix, True, loud_db=-16.0)


def music_ending():
    rng = np.random.default_rng(6006)
    E = 0.41
    BAR = 6 * E
    total = 60.0
    tb = lambda b: b * BAR
    box, pad = Track(total, False), Track(total, False)
    segs = grid_segs(["Am"] * 4 + CH_A + CH_A + CH_B + CH_A[:4], 3 * E)
    rit = [E * (1.0 + 0.45 * (k / 11.0) ** 2) for k in range(12)]
    onsets = list(np.concatenate([[0.0], np.cumsum(rit)[:-1]]))
    t16 = tb(16)
    final_notes = ["C5", "D5", "E5", "D5", "C5", "A4", "B4", None, None, "A4"]
    final_chords = ["C", "Dm", "E", "A"]
    t_end = t16 + onsets[9]
    for h in range(4):
        start = t16 + onsets[h * 3]
        d = (onsets[h * 3 + 3] - onsets[h * 3]) if h < 3 else total - t_end
        segs.append([final_chords[h], start, d])
    pad_gain = lambda t: float(np.interp(t, [0, tb(6), tb(10), tb(14), t_end], [0.75, 0.85, 0.95, 1.0, 1.1]))
    render_pad(pad, segs, "warm", rng, gain_fn=pad_gain, lead=0.6)
    phrase(box, A1, tb(2), E, rng)
    phrase(box, A2, tb(4), E, rng)
    phrase(box, A1, tb(6), E, rng, chords=CH_A[:4], harm=0.34, bass=0.25)
    phrase(box, A2, tb(8), E, rng, chords=CH_A[4:], harm=0.34, bass=0.25)
    phrase(box, B1, tb(10), E, rng, gain=0.92, chords=CH_B[:4], harm=0.32, bass=0.25)
    phrase(box, B2, tb(12), E, rng, gain=0.92, chords=CH_B[4:], harm=0.32, bass=0.25)
    phrase(box, A1, tb(14), E, rng, chords=CH_A[:4], harm=0.36, bass=0.27)
    phrase(box, final_notes, t16, E, rng, chords=final_chords, harm=0.36, bass=0.27, onsets=onsets)
    # resolve to A major: a rolled chord, then two last high notes
    for k, nm in enumerate(["A3", "C#4", "E4", "A4", "C#5"]):
        box.add(music_box_note(hz(nm), 4.0, 0.42 - 0.02 * k, rng, tau=2.0), t_end + 0.35 + k * 0.15, pan=-0.2 + 0.1 * k)
    box.add(music_box_note(hz("E5"), 4.0, 0.3, rng, tau=2.0), t_end + 2.9, pan=0.3)
    box.add(music_box_note(hz("A5"), 4.0, 0.24, rng, tau=2.2), t_end + 4.9, pan=-0.3)
    n = box.n
    padbus = fft_filter(pad.buf, lp(1600, 2))
    padbus *= 1.0 + 0.08 * lfo(n, 11.0, False)
    padbus = set_rms(padbus, -26.0)
    bx = set_rms(box.buf, -20.0)
    ir = make_ir(rt60=3.4, hf_damp=0.4, seed=66)
    wet = reverb(0.55 * bx + 0.8 * padbus, ir, loop=False)[:, :n]
    mix = bx + padbus + 0.36 * wet
    mix *= fade_env(n, 1.5, 9.0)
    return master_music(mix, False, loud_db=-16.5)


# =========================================================== ambiences =====

def creak_event(dur, rng, rate_pts, modes, amp_pts=None, jitter=0.15):
    n = secs(dur)
    ts = [p[0] for p in rate_pts]
    rs = [p[1] for p in rate_pts]
    times, tt = [], 0.0
    while True:
        r = float(np.interp(tt, ts, rs))
        tt += (1.0 / max(r, 1.0)) * max(0.2, 1.0 + rng.normal(0.0, jitter))
        if tt >= dur:
            break
        times.append(tt)
    imp = np.zeros(n)
    if times:
        times = np.array(times)
        amps = rng.uniform(0.4, 1.0, len(times))
        if amp_pts:
            amps *= np.interp(times, [p[0] for p in amp_pts], [p[1] for p in amp_pts])
        np.add.at(imp, np.minimum((times * SR).astype(int), n - 1), amps)
    L = secs(max(m[1] for m in modes) * 6)
    ir = resonator(tax(L), modes)
    return fft_convolve(imp, ir)[:n]


def amb_wreck():
    rng = np.random.default_rng(7007)
    dur = 60.0
    n = secs(dur)
    gust = np.exp(0.45 * ctrl_noise(n, 0.06, rng, True))
    fc_base = 300 * 2 ** (0.45 * ctrl_noise(n, 0.05, rng, True)) * gust ** 0.6
    fc1 = 430 * 2 ** (0.45 * ctrl_noise(n, 0.07, rng, True))
    fc2 = 820 * 2 ** (0.35 * ctrl_noise(n, 0.09, rng, True))
    h1 = 1.0 / (1.0 + np.exp(-1.6 * ctrl_noise(n, 0.05, rng, True)))
    h2 = 1.0 / (1.0 + np.exp(-1.6 * ctrl_noise(n, 0.06, rng, True) + 0.6))

    def mask(c, f):
        g = sample_ctrl(gust, c, True)[:, None]
        m = band_mask(f, sample_ctrl(fc_base, c, True), 1.1) * g
        m += 1.4 * band_mask(f, sample_ctrl(fc1, c, True), 0.08) * (sample_ctrl(h1, c, True)[:, None] * g ** 1.5)
        m += 0.9 * band_mask(f, sample_ctrl(fc2, c, True), 0.07) * (sample_ctrl(h2, c, True)[:, None] * g ** 1.5)
        return m

    wind = np.vstack([stft_filter(rng.standard_normal(n), mask, loop=True, nfft=4096) for _ in range(2)])
    wind = fft_filter(wind, hp(60, 2), loop=True)
    hiss = fft_filter(rng.standard_normal((2, n)), bp(2500, 7000, 1), loop=True) * gust ** 1.5
    t = tax(n)
    drone = (0.6 * np.sin(TWO_PI * loop_freq(55.0, n) * t) + 0.45 * np.sin(TWO_PI * loop_freq(55.1, n) * t + 1.0)
             + 0.4 * np.sin(TWO_PI * loop_freq(82.41, n) * t + 2.0) + 0.12 * np.sin(TWO_PI * loop_freq(110.0, n) * t))
    drone *= 1.0 + 0.25 * lfo(n, 20.0, True)
    drone = np.vstack([drone, drone])

    events = Track(dur, True)   # creaks, groans, tinkles (all sent to a big reverb)
    for k in range(9):
        d = rng.uniform(0.35, 1.1)
        r0, r1 = rng.uniform(15, 40), rng.uniform(25, 60)
        modes = [(rng.uniform(200, 900), rng.uniform(0.04, 0.2), rng.uniform(0.4, 1.0)) for _ in range(4)]
        c = creak_event(d, rng, [(0, r0), (d * 0.5, r1), (d, r0 * 0.8)], modes,
                        [(0, 0), (d * 0.2, 1.0), (d * 0.7, 0.8), (d, 0)])
        events.add(set_peak(c, -13.0 - rng.uniform(0, 5)), k * dur / 9 + rng.uniform(0.3, dur / 9 - 1.2),
                   pan=rng.uniform(-0.8, 0.8))
    for k in range(3):
        d = rng.uniform(2.5, 4.0)
        m = secs(d)
        tt = tax(m)
        f0 = rng.uniform(55, 85)
        fm = 1.0 + 0.3 * np.sin(np.pi * tt / d * rng.uniform(0.8, 1.6)) * rng.choice([-1, 1])
        g = osc("saw", f0, m, rng.random(), 700, fm) * fade_env(m, d * 0.4, d * 0.5)
        g = fft_filter(g, lp(220, 2))
        events.add(set_peak(g, -17.0), k * 20.0 + rng.uniform(3, 15), pan=rng.uniform(-0.6, 0.6))
    for k in range(4):
        t0 = k * 15.0 + rng.uniform(2, 12)
        for j in range(rng.integers(2, 5)):
            f = rng.uniform(2500, 6000)
            events.add(glass_note(f, 1.0, rng.uniform(0.4, 1.0), tau=rng.uniform(0.12, 0.35)) * db(-30),
                       t0 + j * rng.uniform(0.06, 0.2), pan=rng.uniform(-0.9, 0.9))

    w = set_rms(wind, -22.0)
    hs = set_rms(hiss, -40.0)
    dr = set_rms(drone, -30.0)
    ev = events.buf
    ir = make_ir(rt60=4.0, hf_damp=0.3, seed=77, predelay=0.04)
    wet = reverb(ev + 0.3 * w, ir, loop=True)
    mix = w + hs + dr + 0.7 * ev + 0.5 * wet
    return master_music(mix, True, loud_db=-18.0, hp_hz=24.0, max_limit_db=3.0)


def radio_crackles(n, rate, rng, loop, clusters=0):
    imp = np.zeros(n)
    cnt = rng.poisson(rate * n / SR)
    pos = rng.integers(0, n, cnt)
    amps = np.minimum(rng.exponential(1.0, cnt), 3.5) * rng.choice([-1.0, 1.0], cnt)
    np.add.at(imp, pos, amps)
    for _ in range(clusters):
        c0 = rng.integers(0, n)
        k = rng.integers(5, 16)
        p = (c0 + (rng.exponential(0.012, k).cumsum() * SR).astype(int)) % n
        np.add.at(imp, p, np.minimum(rng.exponential(0.8, k), 2.5) * rng.choice([-1.0, 1.0], k))
    k = secs(0.003)
    ker = rng.standard_normal(k) * np.exp(-np.arange(k) / (SR * 0.0005))
    if loop:
        h = np.zeros(n)
        h[:k] = ker
        y = np.fft.irfft(np.fft.rfft(imp) * np.fft.rfft(h), n)
    else:
        y = fft_convolve(imp, ker)[:n]
    y = fft_filter(y, bp(400, 6000, 2), loop=loop)
    k = 4.0 * rms(y)
    return k * np.tanh(y / k)


def wavering_whistle(n, f0, dev, rate, rng, loop, vib=0.0):
    f = f0 + dev * ctrl_noise(n, rate, rng, loop)
    if vib:
        f = f + vib * np.sin(TWO_PI * loop_freq(5.3, n) * tax(n))
    if loop:
        total = np.sum(f) / SR
        f = f + (round(total) - total) / (n / SR)
    ph = np.cumsum(f) / SR
    return np.sin(TWO_PI * ph)


def amb_radio():
    rng = np.random.default_rng(8008)
    dur = 20.0
    n = secs(dur)
    qsb = 0.75 + 0.25 * np.tanh(ctrl_noise(n, 0.25, rng, True))
    flutter = 1.0 + 0.08 * ctrl_noise(n, 6.0, rng, True)
    bed = fft_filter(rng.standard_normal(n), bp(300, 3500, 3), loop=True) * qsb * flutter
    cr = radio_crackles(n, 7.0, rng, True, clusters=5)
    # whistles drift in and out: twice per loop for the first, three times for the second
    a1 = np.clip(lfo(n, dur / 2, True, 0.3) + 0.25 * ctrl_noise(n, 0.3, rng, True), 0, None) ** 1.5
    a2 = np.clip(lfo(n, dur / 3, True, 2.2) - 0.25 + 0.25 * ctrl_noise(n, 0.3, rng, True), 0, None) ** 1.5
    w1 = wavering_whistle(n, 1350, 60, 0.25, rng, True, vib=6.0) * a1
    w2 = wavering_whistle(n, 2100, 140, 0.15, rng, True) * a2
    hum = np.sin(TWO_PI * loop_freq(100.0, n) * tax(n)) * 0.5 + np.sin(TWO_PI * loop_freq(150.0, n) * tax(n)) * 0.2
    mono = set_rms(bed, -24.0) + set_rms(cr, -33.0) + set_rms(w1, -36.0) + set_rms(w2, -42.0) + set_rms(hum, -46.0)
    side = fft_filter(rng.standard_normal(n), bp(300, 3500, 3), loop=True)
    side = set_rms(side * qsb, -34.0)
    st = np.vstack([mono + side, mono - side])
    return master_music(st, True, loud_db=-22.0, hp_hz=60.0, max_limit_db=6.0)


# ================================================================= SFX =====

def noise_band(n, rng, lo, hi, order=2):
    return fft_filter(rng.standard_normal(n), bp(lo, hi, order))


def swish(dur, f0, f1, rng, peak_frac=0.6, sigma=0.7, nfft=512):
    n = secs(dur)
    fcs = f0 * (f1 / f0) ** np.clip(np.arange(n) / n, 0, 1)
    y = stft_filter(rng.standard_normal(n), lambda c, f: band_mask(f, sample_ctrl(fcs, c, False), sigma), nfft=nfft)
    tp = peak_frac * dur
    tt = tax(n)
    env = np.where(tt < tp, (tt / tp) ** 1.6, ((dur - tt) / (dur - tp)).clip(0) ** 2)
    return y * env


def sfx_ui_tap(rng):
    n = secs(0.06)
    t = tax(n)
    s = resonator(t, [(1580, 0.010, 1.0), (2630, 0.006, 0.45), (3900, 0.004, 0.22), (820, 0.014, 0.5)])
    s += 0.5 * fft_filter(rng.standard_normal(n) * np.exp(-t / 0.0015), bp(900, 5000, 2))
    s[:secs(0.0006)] *= np.linspace(0, 1, secs(0.0006))
    return s


def sfx_ui_open(rng):
    return fft_filter(swish(0.25, 500, 2600, rng, 0.62), lp(6000, 2))


def sfx_ui_close(rng):
    return fft_filter(swish(0.2, 2200, 450, rng, 0.35), lp(5500, 2))


def sfx_page(rng):
    n = secs(0.4)
    hi = noise_band(n, rng, 1800, 7500)
    grains = np.zeros(n)
    for _ in range(38):
        L = secs(rng.uniform(0.002, 0.012))
        s0 = secs(rng.uniform(0.03, 0.33))
        if s0 + L < n:
            grains[s0:s0 + L] += rng.uniform(0.2, 1.0) * np.hanning(L)
    swell = env_pts(n, [(0, 0), (0.05, 0.6), (0.15, 1.0), (0.28, 0.7), (0.4, 0)])
    low = noise_band(n, rng, 250, 900)
    return hi * (0.35 * swell + 1.1 * grains * swell) + 0.35 * low * swell


def sfx_pickup(rng):
    n = secs(0.6)
    y = np.zeros(n)
    for t0, nm, v in ((0.0, "E6", 0.8), (0.085, "A6", 1.0)):
        s = music_box_note(hz(nm), 0.6 - t0, v, rng, detune_cents=0.0, tau=0.9, rel=0.15)
        y[secs(t0):secs(t0) + len(s)] += s[:n - secs(t0)]
    return mono_reverb(y, make_ir(0.6, 0.5, seed=101), 0.25)


def sfx_success(rng):
    n = secs(1.6)
    y = np.zeros(n)
    for k, (hi_n, lo_n) in enumerate((("A5", "A4"), ("C#6", "C#5"), ("E6", "E5"))):
        t0 = secs(k * 0.13)
        s = music_box_note(hz(hi_n), 1.6, 1.0 - 0.05 * k, rng, detune_cents=0.0, tau=1.4, rel=0.3)
        s += bell_note(hz(lo_n), 1.6, 0.35, rng, tau=1.6, bright=0.5)
        y[t0:] += s[:n - t0]
    y = mono_reverb(y, make_ir(1.5, 0.4, seed=102), 0.35)
    return y * fade_env(n, 0.0, 0.3)


def sfx_fail(rng):
    n = secs(0.4)
    t = tax(n)
    f = 55 + 85 * np.exp(-t / 0.05)
    body = np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    knock = resonator(t, [(190, 0.035, 0.45), (310, 0.02, 0.22)])
    thump = 0.6 * fft_filter(rng.standard_normal(n) * np.exp(-t / 0.01), lp(500, 2))
    s = body + knock + thump
    s[:secs(0.002)] *= np.linspace(0, 1, secs(0.002))
    return s


def sfx_hint(rng):
    n = secs(0.7)
    s = bell_note(hz("A5"), 0.7, 1.0, rng, tau=0.9, bright=0.5)
    s = mono_reverb(s, make_ir(1.0, 0.45, seed=103), 0.25)
    return s * fade_env(n, 0.0, 0.2)


def sfx_unlock(rng):
    n = secs(0.7)
    y = np.zeros(n)
    k0 = secs(0.03)
    tt = tax(n - k0)
    clunk = resonator(tt, [(118, 0.045, 1.0), (240, 0.03, 0.55), (410, 0.022, 0.4), (690, 0.012, 0.25)])
    nb = fft_filter(rng.standard_normal(len(tt)) * np.exp(-tt / 0.008), bp(150, 1400, 2))
    y[k0:] += clunk + 0.8 * nb
    sl = rng.standard_normal(n) * env_pts(n, [(0, 0), (0.09, 0), (0.12, 0.12), (0.24, 0.1), (0.27, 0)])
    y += fft_filter(sl, bp(900, 4000, 2))
    for tc, a, sc in ((0.28, 0.9, 1.0), (0.305, 0.35, 1.07), (0.322, 0.18, 0.95)):
        k = secs(tc)
        tt = tax(n - k)
        c = resonator(tt, [(2650 * sc, 0.007, 1.0), (4150 * sc, 0.005, 0.7), (6100 * sc, 0.003, 0.4), (980 * sc, 0.012, 0.35)])
        c += 0.4 * rng.standard_normal(len(tt)) * np.exp(-tt / 0.0008)
        y[k:] += a * c
    return mono_reverb(y, make_ir(0.5, 0.5, seed=104), 0.12)


def sfx_door(rng):
    d = 1.2
    n = secs(d)
    modes = [(190, 0.035, 1.0), (320, 0.03, 0.7), (510, 0.025, 0.5), (760, 0.02, 0.35), (1150, 0.012, 0.2)]
    c = creak_event(d, rng, [(0, 28), (0.25, 55), (0.6, 85), (0.9, 60), (1.15, 40)], modes,
                    [(0, 0), (0.08, 0.8), (0.5, 1.0), (0.95, 0.7), (1.15, 0)], jitter=0.1)
    t = tax(n)
    body = 0.15 * np.sin(TWO_PI * 85 * t) * np.exp(-t / 0.08)
    y = fft_filter(c / (np.max(np.abs(c)) + 1e-9) + body, lp(3000, 2))
    return mono_reverb(y, make_ir(0.9, 0.4, seed=105), 0.2) * fade_env(n, 0.005, 0.1)


def sfx_ice_crack(rng):
    n = secs(1.0)
    t = tax(n)
    imp = np.zeros(n)
    tc = 0.005 + np.cumsum(rng.exponential(0.011, 7))
    for i, tci in enumerate(tc):
        k = secs(tci)
        L = secs(0.004)
        if k + L < n:
            imp[k:k + L] += (0.75 ** i) * rng.uniform(0.6, 1.0) * rng.standard_normal(L) * np.exp(-np.arange(L) / (SR * 0.0007))
    crack = fft_filter(imp, hp(700, 2))
    body = 0.3 * fft_convolve(imp, resonator(tax(secs(0.15)), [(1250, 0.03, 1.0), (2100, 0.02, 0.7),
                                                                  (3300, 0.012, 0.5), (650, 0.05, 0.5)]))[:n]
    t0 = 0.02
    tt = np.clip(t - t0, 0, None)
    f = 300 + 3500 * np.exp(-tt / 0.07)
    chirp = 0.12 * np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-tt / 0.12) * (t > t0)
    rumble = 0.25 * noise_band(n, rng, 40, 220) * env_pts(n, [(0, 0), (0.04, 1.0), (0.3, 0.35), (1.0, 0)])
    y = crack + body + chirp + rumble
    y = mono_reverb(y, make_ir(1.2, 0.5, seed=106), 0.35)
    return y * fade_env(n, 0.0, 0.2)


def sfx_static_burst(rng):
    n = secs(1.0)
    t = tax(n)
    env = np.where(t < 0.38, (t / 0.38) ** 2, np.exp(-(t - 0.38) / 0.18))
    bed = noise_band(n, rng, 300, 3500, 3)
    cr = radio_crackles(n, 25.0, rng, False, clusters=2)
    wh = wavering_whistle(n, 1200, 60, 2.0, rng, False)
    y = set_rms(bed, -20) + set_rms(cr, -28) + set_rms(wh, -34)
    return y * env * fade_env(n, 0.0, 0.08)


def sfx_tune_sweep(rng):
    d = 1.5
    n = secs(d)
    t = tax(n)
    f = 40 + 2400 * np.abs(1.0 - t / 1.0) ** 1.1
    wh = np.sin(TWO_PI * np.cumsum(f) / SR) * env_pts(n, [(0, 0), (0.08, 1), (1.3, 1), (1.5, 0)])
    bed = noise_band(n, rng, 300, 3500, 3) * (0.8 + 0.2 * np.sin(TWO_PI * 3 * t))
    near = np.exp(-((t - 1.0) / 0.12) ** 2)
    carrier = noise_band(n, rng, 150, 1200, 2) * near
    cr = radio_crackles(n, 18.0, rng, False, clusters=1)
    y = set_rms(bed, -22) + set_rms(wh, -26) + 0.5 * set_rms(carrier, -24) + set_rms(cr, -32)
    return y * fade_env(n, 0.03, 0.12)


def sfx_squelch(rng):
    n = secs(0.3)
    t = tax(n)
    click = resonator(t, [(1500, 0.004, 1.0), (3200, 0.002, 0.5)])
    hiss = noise_band(n, rng, 400, 4000, 2) * env_pts(n, [(0, 0), (0.006, 1), (0.16, 0.9), (0.2, 0.35), (0.26, 0.05), (0.3, 0)])
    k = secs(0.2)
    click2 = np.zeros(n)
    click2[k:] = 0.4 * resonator(tax(n - k), [(1800, 0.003, 1.0), (900, 0.004, 0.5)])
    return 0.8 * click + 0.45 * hiss / (np.max(np.abs(hiss)) + 1e-9) + click2


def sfx_gear(rng):
    n = secs(0.4)
    y = np.zeros(n)
    tc = 0.01
    for k in range(7):
        i = secs(tc)
        tt = tax(n - i)
        sc = rng.uniform(0.95, 1.05)
        a = (0.7 + 0.3 * (k % 2)) * (1.25 if k == 6 else 1.0)
        c = resonator(tt, [(2400 * sc, 0.006, 1.0), (3700 * sc, 0.004, 0.6), (5600 * sc, 0.003, 0.3), (700 * sc, 0.01, 0.5)])
        c += 0.35 * rng.standard_normal(len(tt)) * np.exp(-tt / 0.0005)
        y[i:] += a * c
        tc += 0.052 + rng.normal(0, 0.005)
    return mono_reverb(y, make_ir(0.5, 0.5, seed=107), 0.1)


def sfx_slide(rng):
    d = 0.5
    n = secs(d)
    t = tax(n)
    fcs = 650 * (360 / 650) ** (np.arange(n) / n)
    body = stft_filter(rng.standard_normal(n), lambda c, f: band_mask(f, sample_ctrl(fcs, c, False), 0.8), nfft=512)
    grit = np.exp(0.5 * ctrl_noise(n, 45.0, rng, decim=20))
    scrape = noise_band(n, rng, 1300, 3500, 2) * grit ** 2
    rumble = noise_band(n, rng, 70, 200, 2)
    env = env_pts(n, [(0, 0), (0.04, 1.0), (0.3, 0.85), (0.5, 0)])
    y = set_rms(body * grit, -20) + set_rms(scrape, -32) + set_rms(rumble, -24)
    return y * env


def sfx_hiss(rng):
    d = 1.5
    n = secs(d)
    t = tax(n)
    hs = fft_filter(rng.standard_normal(n), chain(bp(2000, 9000, 2), peak(4300, 400, 1.8)))
    flutter = 1.0 + 0.1 * ctrl_noise(n, 8.0, rng, decim=50)
    env = env_pts(n, [(0, 0), (0.05, 1.0), (0.8, 0.9), (1.5, 0)]) ** 1.3
    click = resonator(t, [(1700, 0.004, 1.0), (3100, 0.003, 0.5)])
    return set_rms(hs, -20) * flutter * env + 0.15 * click


def sfx_bell(rng):
    n = secs(3.0)
    y = np.zeros(n)
    for t0, v in ((0.0, 1.0), (0.38, 0.85)):
        s = bell_note(784.0, 3.0, v, rng, tau=1.3)
        k = secs(t0)
        y[k:] += s[:n - k]
    y = mono_reverb(y, make_ir(1.2, 0.5, seed=108), 0.15)
    return y * fade_env(n, 0.0, 0.4)


def sfx_engine_stop(rng):
    d = 3.0
    n = secs(d)
    t = tax(n)
    imp = np.zeros(n)
    tt = 0.0
    while tt < 2.7:
        frac = tt / 2.7
        r = 3.0 + 21.0 * (1.0 - frac) ** 1.3
        if rng.random() > 0.05 + 0.5 * frac ** 2:
            imp[secs(tt)] += (1.0 - tt / 2.8) ** 1.5 * rng.uniform(0.7, 1.0)
        tt += (1.0 / r) * (1.0 + rng.normal(0.0, 0.05 + 0.15 * frac))
    pulse_ir = resonator(tax(secs(0.3)), [(85, 0.05, 1.0), (160, 0.03, 0.5), (320, 0.015, 0.25)])
    pulses = fft_convolve(imp, pulse_ir)[:n]
    pulses += 0.4 * fft_filter(fft_convolve(imp, rng.standard_normal(secs(0.02)) * np.exp(-np.arange(secs(0.02)) / (SR * 0.006)))[:n], lp(600, 2))
    rate = 3.0 + 21.0 * (1.0 - np.clip(t / 2.7, 0, 1)) ** 1.3
    blade = 0.5 + 0.5 * np.sin(TWO_PI * np.cumsum(rate * 0.9) / SR)
    whoosh = noise_band(n, rng, 150, 700, 2) * blade * np.clip(1.0 - t / 2.8, 0, 1) ** 1.5
    y = set_rms(pulses, -18) + set_rms(whoosh, -30)
    y = fft_filter(y, lp(1400, 2))
    y = mono_reverb(y, make_ir(1.6, 0.4, seed=109), 0.35)
    return y * fade_env(n, 0.02, 0.4)


def sfx_wind_gust(rng):
    d = 2.5
    n = secs(d)
    fcs = np.interp(tax(n), [0, 1.0, 2.5], [350, 900, 400])

    def mask(c, f):
        fc = sample_ctrl(fcs, c, False)
        return band_mask(f, fc, 0.9) + 0.9 * band_mask(f, fc * 1.6, 0.08)

    y = stft_filter(rng.standard_normal(n), mask, nfft=2048)
    env = env_pts(n, [(0, 0), (1.0, 1.0), (1.4, 0.85), (2.5, 0)]) ** 1.5
    return fft_filter(y * env, lp(4000, 2))


def sfx_shimmer(rng):
    d = 2.0
    n = secs(d)
    y = np.zeros(n)
    notes = ["A5", "B5", "C#6", "E6", "F#6", "A6", "B6", "C#7", "E7", "F#7", "A7"]
    K = len(notes)
    for k, nm in enumerate(notes):
        t0 = 1.1 * (k / (K - 1)) ** 0.75
        s = glass_note(hz(nm), d - t0, 0.5 + 0.5 * k / K, tau=0.5 - 0.02 * k)
        i = secs(t0)
        y[i:i + len(s)] += s[:n - i]
    for _ in range(18):
        t0 = 1.2 * rng.random() ** 0.6
        s = glass_note(rng.uniform(3000, 7500), 0.5, rng.uniform(0.1, 0.3), tau=0.12)
        i = secs(t0)
        y[i:i + len(s)] += s[:n - i]
    fcs = 1000 * 6 ** np.clip(np.arange(n) / secs(1.3), 0, 1)
    sw = stft_filter(rng.standard_normal(n), lambda c, f: band_mask(f, sample_ctrl(fcs, c, False), 0.5), nfft=1024)
    sw *= env_pts(n, [(0, 0), (1.0, 1.0), (1.6, 0)])
    y = y + set_rms(sw, -32) * (np.max(np.abs(y)) / 0.5)
    y = mono_reverb(y, make_ir(2.0, 0.6, seed=110), 0.5)
    return y * fade_env(n, 0.0, 0.35)


def sfx_card(rng):
    n = secs(0.15)
    t = tax(n)
    snap = np.zeros(n)
    k = secs(0.008)
    L = secs(0.004)
    snap[k:k + L] = rng.standard_normal(L) * np.exp(-np.arange(L) / (SR * 0.0008))
    snap = fft_filter(snap, bp(1500, 6000, 2))
    sw = noise_band(n, rng, 2000, 5000) * env_pts(n, [(0, 0), (0.015, 0), (0.04, 0.12), (0.12, 0.03), (0.15, 0)])
    return snap / (np.max(np.abs(snap)) + 1e-9) + sw / (np.max(np.abs(sw)) + 1e-9) * 0.3


def sfx_mirror_click(rng):
    n = secs(0.12)
    t = tax(n)
    s = resonator(t, [(3150, 0.025, 1.0), (5320, 0.015, 0.6), (7480, 0.009, 0.35), (900, 0.005, 0.4)])
    s += 0.3 * rng.standard_normal(n) * np.exp(-t / 0.0005)
    return s


def sfx_reveal(rng):
    d = 3.0
    n = secs(d)
    t = tax(n)
    y = np.zeros(n)
    for nm, a in (("A1", 1.0), ("E2", 0.7), ("A2", 0.7), ("E3", 0.4), ("C4", 0.12)):
        for v, cents in enumerate((-6, 0, 6)):
            y += a * osc("saw" if v != 1 else "tri", hz(nm) * 2 ** (cents / 1200), n, rng.random(), 1500)
    y = fft_filter(y, lp(480, 2))
    y += 1.2 * np.sin(TWO_PI * 55 * t) * np.max(np.abs(y)) / 3
    env = env_pts(n, [(0, 0), (1.9, 1.0), (2.3, 0.85), (3.0, 0)]) ** 1.6
    sw = noise_band(n, rng, 60, 700, 2) * env ** 2
    y = set_rms(y * env, -18) + set_rms(sw, -32)
    y = mono_reverb(y, make_ir(2.5, 0.4, seed=111), 0.3)
    return y * fade_env(n, 0.0, 0.25)


def sfx_chapter(rng):
    d = 2.0
    n = secs(d)
    t = tax(n)
    fcs = np.interp(t, [0, 0.6, 1.4], [300, 1400, 400])
    w = stft_filter(rng.standard_normal(n), lambda c, f: band_mask(f, sample_ctrl(fcs, c, False), 0.8), nfft=1024)
    w *= env_pts(n, [(0, 0), (0.55, 1.0), (1.4, 0)]) ** 1.5
    b = np.zeros(n)
    k = secs(0.35)
    b[k:] = bell_note(hz("A3"), d - 0.35, 1.0, rng, tau=2.2, bright=0.6)[:n - k]
    y = set_rms(w, -26) + set_peak(b, -8)
    y = mono_reverb(y, make_ir(2.0, 0.4, seed=112), 0.3)
    return y * fade_env(n, 0.0, 0.3)


def make_box_note(name):
    def f(rng):
        n = secs(2.0)
        s = music_box_note(hz(name), 2.0, 1.0, np.random.default_rng(midi_of(name)), detune_cents=0.0, rel=0.45)
        return mono_reverb(s, make_ir(1.2, 0.4, seed=113), 0.12)[:n]
    return f


# ============================================================== output =====

MUSIC = [
    ("music_title", music_title),
    ("amb_wreck", amb_wreck),
    ("music_resonance", music_resonance),
    ("music_tension", music_tension),
    ("music_finale", music_finale),
    ("music_ending", music_ending),
    ("amb_radio", amb_radio),
]

# name, function, peak dBFS
SFX = [
    ("ui_tap", sfx_ui_tap, -6.0), ("ui_open", sfx_ui_open, -6.0), ("ui_close", sfx_ui_close, -6.0),
    ("page", sfx_page, -6.0), ("pickup", sfx_pickup, -6.0), ("success", sfx_success, -6.0),
    ("fail", sfx_fail, -6.0), ("hint", sfx_hint, -6.0), ("unlock", sfx_unlock, -6.0),
    ("door", sfx_door, -6.0), ("ice_crack", sfx_ice_crack, -7.0), ("static_burst", sfx_static_burst, -6.0),
    ("tune_sweep", sfx_tune_sweep, -6.0), ("squelch", sfx_squelch, -6.0), ("gear", sfx_gear, -6.0),
    ("slide", sfx_slide, -6.0), ("hiss", sfx_hiss, -6.0), ("bell", sfx_bell, -6.0),
    ("engine_stop", sfx_engine_stop, -6.0), ("wind_gust", sfx_wind_gust, -6.0), ("shimmer", sfx_shimmer, -6.0),
    ("card", sfx_card, -6.0), ("mirror_click", sfx_mirror_click, -6.0), ("reveal", sfx_reveal, -6.0),
    ("chapter", sfx_chapter, -6.0),
] + [("box_" + nm, make_box_note(nm), -6.0) for nm in ("E4", "G4", "A4", "B4", "C5", "D5", "E5")]


def write_wav(path, x):
    x = np.atleast_2d(x)
    d = np.random.default_rng(12345)
    dither = d.random(x.shape) - d.random(x.shape)
    y = np.clip(np.round(x * 32767.0 + dither), -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(x.shape[0])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.ascontiguousarray(y.T).tobytes())


def encode(wav, mp3, kbps, ch):
    cmd = [FFMPEG, "-nostdin", "-y", "-v", "error", "-i", wav, "-map_metadata", "-1",
           "-c:a", "libmp3lame", "-b:a", f"{kbps}k", "-ar", str(SR), "-ac", str(ch),
           "-id3v2_version", "0", "-write_xing", "1", "-fflags", "+bitexact", "-flags:a", "+bitexact", mp3]
    subprocess.run(cmd, check=True)


def probe(mp3):
    out = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration:stream=channels,sample_rate,bit_rate",
                          "-of", "default=nw=1", mp3], capture_output=True, text=True, check=True).stdout
    info = dict(line.split("=", 1) for line in out.strip().splitlines() if "=" in line)
    dec = subprocess.run([FFMPEG, "-v", "error", "-i", mp3, "-f", "null", "-"], capture_output=True, text=True)
    info["decode_ok"] = dec.returncode == 0 and not dec.stderr.strip()
    return info


CREDITS = """Albatross -- A Frozen Signal: audio credits
==========================================

All music, ambience and sound effects in this directory were procedurally
synthesised by the project's own script, scripts/generate-audio.py
(Python + numpy, encoded to MP3 with ffmpeg/libmp3lame).

* Original work: every sound is generated from mathematical primitives
  (sine partials, band-limited oscillators, filtered noise, a synthetic
  noise-based reverb).  No samples, sample libraries, loops or third-party
  recordings of any kind were used.
* "The Clockmaker's Lullaby" is an original melody written for this game.
* The files are deterministic: re-running `npm run audio`
  (python3 scripts/generate-audio.py) regenerates them.
* License: the same license as the rest of this project.

Files
-----
{files}
"""


def main(argv):
    only = set(a for a in argv if not a.startswith("-"))
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [(nm, fn, "music", None) for nm, fn in MUSIC] + [(nm, fn, "sfx", pk) for nm, fn, pk in SFX]
    if only:
        unknown = only - {j[0] for j in jobs}
        if unknown:
            sys.exit("unknown sound(s): " + ", ".join(sorted(unknown)))
        jobs = [j for j in jobs if j[0] in only]
    t_start = time.time()
    stats = {}
    tmp = tempfile.mkdtemp(prefix="albatross-audio-")
    futures = []
    try:
        with ThreadPoolExecutor(max_workers=3) as pool:
            for name, fn, kind, pk in jobs:
                t0 = time.time()
                if kind == "music":
                    x = fn()
                    ch, kbps = 2, MUSIC_KBPS
                else:
                    seed = zlib.crc32(name.encode()) & 0xFFFFFFFF
                    x = master_sfx(fn(np.random.default_rng(seed)), peak_db=pk,
                                   loud_db=None if name.startswith("box_") else -14.0)[None, :]
                    ch, kbps = 1, SFX_KBPS
                stats[name] = dict(peak=20 * np.log10(np.max(np.abs(x)) + 1e-12),
                                   loud=loudness(x, None if kind == "music" else 0.4), synth=time.time() - t0,
                                   dur=x.shape[1] / SR)
                wav = os.path.join(tmp, name + ".wav")
                write_wav(wav, x)
                futures.append(pool.submit(encode, wav, os.path.join(OUT_DIR, name + ".mp3"), kbps, ch))
                print(f"  synth {name:<16} {stats[name]['synth']:5.1f}s  peak {stats[name]['peak']:6.1f} dBFS"
                      f"  loudness {stats[name]['loud']:6.1f} LUFS", flush=True)
            for f in futures:
                f.result()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # verify + report
    names = [nm for nm, *_ in jobs]
    total = 0
    print()
    print(f"{'file':<22}{'ch':>3}{'dur s':>8}{'kbps':>6}{'KB':>8}{'peak':>7}  ok")
    for nm in names:
        path = os.path.join(OUT_DIR, nm + ".mp3")
        info = probe(path)
        size = os.path.getsize(path)
        total += size
        dur = stats[nm]["dur"]
        print(f"{nm + '.mp3':<22}{info.get('channels', '?'):>3}{dur:8.2f}{int(info.get('bit_rate', 0)) // 1000:6d}"
              f"{size / 1024:8.1f}{stats[nm]['peak']:7.1f}  {'yes' if info['decode_ok'] else 'NO'}")
        if not info["decode_ok"]:
            raise SystemExit(f"decode check failed for {path}")
    print(f"total {total / 1024 / 1024:.2f} MB for {len(names)} files, {time.time() - t_start:.1f}s")

    if not only:
        lines = [f"  {nm + '.mp3':<22} {stats[nm]['dur']:6.2f} s" for nm in sorted(names)]
        with open(os.path.join(OUT_DIR, "CREDITS.txt"), "w", encoding="utf-8") as fh:
            fh.write(CREDITS.format(files="\n".join(lines)))


if __name__ == "__main__":
    main(sys.argv[1:])
