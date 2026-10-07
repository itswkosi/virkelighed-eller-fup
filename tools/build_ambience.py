"""Synthesize placeholder ambience/SFX so the sound design works before final recordings exist.
Needs numpy. Replace any output with a real recording of the same name (or re-point the registry entry).
Usage: python tools/build_ambience.py
Outputs: ambient/ambient_wind_battlements.wav, sfx/sfx_heartbeat.wav, sfx/sfx_candle_gutter.wav, sfx/sfx_vow_rumble.wav
"""
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 22050
rng = np.random.default_rng(5)


def write(path, x, peak=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def filtered_noise(n, lo, hi):
    """Band-limited noise; FFT filtering is circular, so the result loops seamlessly."""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= ((f > lo) & (f < hi)) / np.sqrt(np.maximum(f, 40))
    return np.fft.irfft(spec, n)


def wind(seconds=24):
    n = SR * seconds
    t = np.arange(n) / SR
    body = filtered_noise(n, 60, 700)
    whistle = filtered_noise(n, 500, 1400)
    # LFO periods divide the loop length, so the gusts loop too.
    gust = 0.55 + 0.25 * np.sin(2 * np.pi * t / 8) + 0.2 * np.sin(2 * np.pi * t / 3 + 1.3)
    sway = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 6 + 0.4)) ** 3
    return body * gust + whistle * sway * 0.15


def rumble(seconds=6):
    n = SR * seconds
    t = np.arange(n) / SR
    env = np.minimum(t / 1.8, 1) ** 2 * np.exp(-np.maximum(t - 1.8, 0) / 1.6)
    tone = np.sin(2 * np.pi * 38 * t) + 0.6 * np.sin(2 * np.pi * 55 * t + 0.7) + 0.3 * filtered_noise(n, 20, 120) * 8
    return tone * env


def heartbeat(beats=3, period=1.0):
    n = int(SR * period * beats)
    out = np.zeros(n)
    for b in range(beats):
        for off, amp in ((0.0, 1.0), (0.28, 0.6)):
            i = int((b * period + off) * SR)
            m = int(0.22 * SR)
            tt = np.arange(m) / SR
            out[i:i + m] += amp * np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 22)
    return out


def gutter(seconds=1.6):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    crackle = filtered_noise(n, 800, 5000) * (rng.random(n) > 0.995) * 6
    crackle = np.convolve(crackle, np.exp(-np.arange(300) / 40), mode="same")
    hiss = filtered_noise(n, 300, 2500) * 0.4 * np.exp(-t / 0.7)
    return (crackle + hiss) * np.exp(-t / 0.9)


def pad(freqs, t, detune=0.12):
    out = 0
    for f in freqs:
        for d in (-detune, 0, detune):
            for k, a in ((1, 1.0), (2, 0.35), (3, 0.15)):
                out = out + a * np.sin(2 * np.pi * (f + d) * k * t + rng.random() * 6.28)
    return out


def music(seconds=32):
    """A slow D-minor drone that leans toward B-flat and back; envelopes are periodic, so it loops."""
    t = np.arange(SR * seconds) / SR
    mix = 0.5 + 0.5 * np.cos(2 * np.pi * t / seconds)
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * t * 2 / seconds)
    a = pad([73.42, 110.0, 146.83, 174.61], t)
    b = pad([58.27, 87.31, 146.83, 174.61], t)
    high = np.sin(2 * np.pi * 587.33 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * t * 3 / seconds)) ** 4 * 0.6
    return (a * mix + b * (1 - mix) + high) * swell


write(ROOT / "ambient" / "ambient_wind_battlements.wav", wind(), 0.18)
write(ROOT / "music" / "music_ghost_theme.wav", music(), 0.7)
write(ROOT / "sfx" / "sfx_heartbeat.wav", heartbeat(), 0.8)
write(ROOT / "sfx" / "sfx_candle_gutter.wav", gutter(), 0.6)
write(ROOT / "sfx" / "sfx_vow_rumble.wav", rumble(), 0.85)
print("ambience written")
