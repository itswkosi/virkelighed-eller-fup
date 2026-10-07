"""Split the scene recordings into one clip per dialogue box.

Needs numpy, lameenc and macOS `afconvert` (only to decode the source MP3s). Originals are never modified.
Usage: python tools/build_voice.py [a1s2 a1s4 ...]   (default: all)
Outputs: audio/voice/<scene>/*.mp3 and js/data/voice/<scene file>.generated.js
"""
import importlib, json, subprocess, sys, tempfile, wave
from pathlib import Path
import lameenc
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
# prefix -> (cue module in tools/, generated file stem)
# `robust` aligns each start to the real speech onset, for recordings where transcript word timings run late.
SCENES = {"a1s2": ("act1_scene2_cues", "act1_scene2", False), "a1s4": ("act1_scene4_cues", "act1_scene4", True),
          "a1s5": ("act1_scene5_cues", "act1_scene5", True)}
HOP = 0.01


def load(mp3: str, tmp: Path):
    wav = tmp / (Path(mp3).stem + ".wav")
    subprocess.run(["afconvert", str(ROOT / mp3), str(wav), "-f", "WAVE", "-d", "LEI16"], check=True)
    with wave.open(str(wav)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").reshape(-1, ch)
    mono = data.astype(np.float32).mean(axis=1)
    n = int(len(mono) / (sr * HOP))
    frames = mono[: n * int(sr * HOP)].reshape(n, -1)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-6)
    smooth = np.convolve(rms, np.ones(4) / 4, mode="same")
    return data, sr, smooth


def quietest(rms, a, b):
    i0, i1 = max(0, int(a / HOP)), min(len(rms) - 1, int(b / HOP))
    if i1 <= i0:
        return a
    return (i0 + int(np.argmin(rms[i0:i1 + 1])) + 0.5) * HOP


def onset_cut(rms, a, thr=300):
    """Cut inside the silence just before speech begins, even when the transcript timing is late."""
    lo, hi = max(0, int((a - 0.7) / HOP)), min(len(rms) - 1, int((a + 0.1) / HOP))
    quiet = rms[lo:hi + 1] < thr
    j = hi
    while j > lo and not quiet[j - lo]:
        j -= 1
    if not quiet[j - lo]:
        return quietest(rms, a - 0.30, a - 0.08)
    end = j
    while end < len(rms) - 1 and rms[end + 1] < thr:
        end += 1
    start = j
    while start > lo and quiet[start - 1 - lo]:
        start -= 1
    onset = (end + 1) * HOP
    return max(start * HOP, min(onset - 0.08, a))


def cut_points(cues, rms, dur):
    starts, ends = [], []
    for i, (_, a, b, *_r) in enumerate(cues):
        prev_b = cues[i - 1][2] if i else None
        next_a = cues[i + 1][1] if i + 1 < len(cues) else None
        if prev_b is not None and a - prev_b < 0.8:
            starts.append(None)  # shared cut, resolved below
        else:
            starts.append(onset_cut(rms, a))
        if next_a is not None and next_a - b < 0.8:
            ends.append(None)
        else:
            ends.append(quietest(rms, b + 0.10, min(dur, b + 0.35)))
    for i in range(len(cues) - 1):
        if ends[i] is None:
            c = quietest(rms, cues[i][2] - 0.15, cues[i + 1][1] + 0.15)
            ends[i], starts[i + 1] = c, c
    return starts, ends


def quiet_runs(rms, lo, hi, thr=300, min_len=0.12):
    """(start, end) times of silences inside [lo, hi]."""
    runs, i, i1 = [], max(0, int(lo / HOP)), min(len(rms) - 1, int(hi / HOP))
    while i <= i1:
        if rms[i] < thr:
            j = i
            while j < len(rms) - 1 and rms[j + 1] < thr:
                j += 1
            if (j - i + 1) * HOP >= min_len:
                runs.append((i * HOP, (j + 1) * HOP))
            i = j + 1
        else:
            i += 1
    return runs


def robust_cut_points(cues, rms, dur):
    """Each cue starts at the earliest speech onset after the previous cue, so late timestamps cannot clip a first word."""
    n = len(cues)
    starts, ends = [None] * n, [None] * n
    for i, (_, a, b, *_r) in enumerate(cues):
        prev_b = cues[i - 1][2] if i else 0.0
        runs = [r for r in quiet_runs(rms, max(a - 0.9, prev_b - 0.3), a + 0.4) if prev_b - 0.05 <= r[1] <= a + 0.15 and r[1] >= a - 0.5]
        if runs:
            rs, re = runs[0]
            mid = (rs + re) / 2
            starts[i] = max(re - 0.15, mid)
            if i:
                ends[i - 1] = min(rs + 0.25, mid)
        else:
            starts[i] = onset_cut(rms, a)
    for i, (_, a, b, *_r) in enumerate(cues):
        if ends[i] is None:
            ends[i] = quietest(rms, b + 0.10, min(dur, b + 0.35))
    return starts, ends


def write_clip(data, sr, a, b, dest: Path):
    seg = data[int(a * sr): int(b * sr)].astype(np.float32)
    fade = int(0.008 * sr)
    seg[:fade] *= np.linspace(0, 1, fade)[:, None]
    seg[-fade:] *= np.linspace(1, 0, fade)[:, None]
    enc = lameenc.Encoder()
    enc.set_bit_rate(96)
    enc.set_in_sample_rate(sr)
    enc.set_channels(seg.shape[1])
    enc.set_quality(2)
    pcm = seg.astype("<i2").tobytes()
    dest.write_bytes(enc.encode(pcm) + enc.flush())


def build(prefix, module, stem, robust):
    CUES = importlib.import_module(module).CUES
    out = ROOT / "audio" / "voice" / prefix
    gen = ROOT / "js" / "data" / "voice" / f"{stem}.generated.js"
    out.mkdir(parents=True, exist_ok=True)
    gen.parent.mkdir(parents=True, exist_ok=True)
    entries = []
    with tempfile.TemporaryDirectory() as t:
        for src in dict.fromkeys(c[0] for c in CUES):
            idx = [i for i, c in enumerate(CUES) if c[0] == src]
            cues = [CUES[i] for i in idx]
            data, sr, rms = load(src, Path(t))
            dur = len(data) / sr
            starts, ends = (robust_cut_points if robust else cut_points)(cues, rms, dur)
            for k, i in enumerate(idx):
                n = i + 1
                _, _, _, who, kind, text = CUES[i]
                cid = f"{prefix}_{n:03d}" + (f"_{who}" if who else "_narration")
                write_clip(data, sr, starts[k], ends[k], out / f"{cid}.mp3")
                entries.append({"n": n, "id": cid, "speaker": who, "kind": kind,
                                "text": text.replace(" -- ", " \u2014 ").replace("--", "\u2014"),
                                "duration": round(ends[k] - starts[k], 2),
                                "file": f"audio/voice/{prefix}/{cid}.mp3"})
    entries.sort(key=lambda e: e["n"])
    gen.write_text(
        f"// Generated by tools/build_voice.py. Do not edit; edit tools/{module}.py and re-run.\n"
        f"export const {prefix}Cues = {json.dumps(entries, indent=1, ensure_ascii=False)};\n", encoding="utf-8")
    print(f"{prefix}: {len(entries)} clips written")


def main():
    for prefix in sys.argv[1:] or SCENES:
        build(prefix, *SCENES[prefix])


if __name__ == "__main__":
    main()
