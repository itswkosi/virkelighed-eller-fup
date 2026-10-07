"""Cut out and normalise character sprites.

Reads  character sprites/<name>/<name> <expression>.png  (originals are never modified)
Writes characters/<name>/<name>_<expression>.png: transparent, one canvas size per character,
feet-aligned so expression swaps do not shift the figure.
Needs Pillow and macOS (tools/cutout.swift uses Vision). Usage: python tools/build_sprites.py [name ...]
"""
import re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "character sprites", ROOT / "characters"
HEIGHT = 2300
FIXES = {"bernado": "bernardo"}  # typo in a source filename


def main():
    only = set(sys.argv[1:])
    for folder in sorted(p for p in SRC.iterdir() if p.is_dir()):
        if only and folder.name not in only:
            continue
        cut = {}
        for f in sorted(folder.glob("*.png")):
            m = re.match(r"(\w+)\s+(\w+)\.png$", f.name)
            if not m:
                continue
            expr = m.group(2)
            with tempfile.TemporaryDirectory() as t:
                tmp = Path(t) / "c.png"
                subprocess.run(["swift", str(ROOT / "tools" / "cutout.swift"), str(f), str(tmp), "3"], check=True, capture_output=True)
                im = Image.open(tmp).convert("RGBA")
            cut[expr] = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
        if not cut:
            continue
        width = max(i.width for i in cut.values())
        name = FIXES.get(folder.name, folder.name)
        (OUT / name).mkdir(parents=True, exist_ok=True)
        for expr, im in cut.items():
            canvas = Image.new("RGBA", (width, HEIGHT), (0, 0, 0, 0))
            canvas.alpha_composite(im, ((width - im.width) // 2, 0))
            canvas.save(OUT / name / f"{name}_{expr}.png", optimize=True)
        print(name, sorted(cut))


if __name__ == "__main__":
    main()
