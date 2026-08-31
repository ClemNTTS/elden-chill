"""Exhaustive production validation for the 24 dedicated boss sheets."""

from pathlib import Path
from PIL import Image
import sys

from build_boss_sheets import BOSSES, ROWS, CELL, ANCHOR_Y


def main():
    root = Path(sys.argv[1])
    frames_root = root / "assets" / "sprites" / "bosses"
    sheets_root = root / "assets" / "sprites" / "monsters"
    failures = []
    checked = 0
    for boss in BOSSES:
        folder = frames_root / boss
        sheet_path = sheets_root / f"{boss}.png"
        if not sheet_path.exists():
            failures.append(f"{boss}: missing sheet")
            continue
        sheet = Image.open(sheet_path).convert("RGBA")
        if sheet.size != (6 * CELL, 4 * CELL):
            failures.append(f"{boss}: sheet={sheet.size}")
            continue
        ref = Image.open(folder / f"{boss}_idle_01.png").convert("RGBA")
        allowed = {(r, g, b) for r, g, b, a in ref.getdata() if a}
        for row, (anim, count) in enumerate(ROWS):
            for i in range(count):
                name = f"{boss}_{anim}_{i+1:02}.png"
                path = folder / name
                if not path.exists():
                    failures.append(name + ": missing")
                    continue
                frame = Image.open(path).convert("RGBA")
                bbox = frame.getchannel("A").getbbox()
                colors = {(r, g, b) for r, g, b, a in frame.getdata() if a}
                alphas = {a for r, g, b, a in frame.getdata()}
                height = bbox[3] - bbox[1] if bbox else 0
                bottom = bbox[3] - 1 if bbox else -1
                center = abs(((bbox[0] + bbox[2] - 1) / 2) - 47.5) if bbox else 99
                pasted = sheet.crop((i*CELL, row*CELL, (i+1)*CELL, (row+1)*CELL))
                ok = (frame.size == (CELL, CELL) and alphas <= {0, 255}
                      and colors <= allowed and len(colors) <= 16
                      and 64 <= height <= 88 and bottom == ANCHOR_Y
                      and center <= 1 and list(frame.getdata()) == list(pasted.getdata()))
                if not ok:
                    failures.append(
                        f"{name}: size={frame.size} colors={len(colors)} "
                        f"bbox={bbox} alpha={sorted(alphas)} center={center:.1f}"
                    )
                checked += 1
        print(f"{boss}: 18 frames + sheet checked")
    print(f"checked={checked} expected={len(BOSSES)*18} failures={len(failures)}")
    if failures:
        print("\n".join(failures[:100]))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
