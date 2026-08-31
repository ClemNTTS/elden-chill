from pathlib import Path
from PIL import Image, ImageDraw
import sys


def main() -> None:
    folder = Path(sys.argv[1])
    files = sorted(folder.glob("*_idle_01.png"))
    if len(files) != 12:
        raise SystemExit(f"Expected 12 frames, found {len(files)}")
    failures = []
    for path in files:
        im = Image.open(path).convert("RGBA")
        alpha = im.getchannel("A")
        bbox = alpha.getbbox()
        colors = {p for p in im.getdata() if p[3]}
        alphas = {p[3] for p in im.getdata()}
        bottom = bbox[3] - 1 if bbox else None
        height = bbox[3] - bbox[1] if bbox else 0
        centered_delta = abs(((bbox[0] + bbox[2] - 1) / 2) - 31.5) if bbox else 999
        ok = im.size == (64, 64) and alphas <= {0, 255} and bottom == 58 and 40 <= height <= 56 and len(colors) <= 16 and centered_delta <= 1.0
        print(f"{path.name}: size={im.size} colors={len(colors)} alpha={sorted(alphas)} bbox={bbox} height={height} bottom={bottom} center_delta={centered_delta:.1f} ok={ok}")
        if not ok:
            failures.append(path.name)

    # Preview sheet only; deliverables remain one PNG per frame.
    scale, label_h = 4, 18
    sheet = Image.new("RGBA", (4 * 64 * scale, 3 * (64 * scale + label_h)), (34, 28, 26, 255))
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(files):
        im = Image.open(path).convert("RGBA").resize((64 * scale, 64 * scale), Image.Resampling.NEAREST)
        x = (i % 4) * 64 * scale
        y = (i // 4) * (64 * scale + label_h)
        checker = Image.new("RGBA", im.size, (64, 58, 56, 255))
        cd = ImageDraw.Draw(checker)
        cell = 8 * scale
        for cy in range(0, im.height, cell):
            for cx in range(0, im.width, cell):
                if (cx // cell + cy // cell) % 2:
                    cd.rectangle((cx, cy, cx + cell - 1, cy + cell - 1), fill=(82, 74, 70, 255))
        checker.alpha_composite(im)
        sheet.alpha_composite(checker, (x, y))
        draw.text((x + 4, y + 64 * scale + 2), path.stem, fill=(230, 218, 200, 255))
    sheet.save(folder / "phase1_preview.png")
    if failures:
        raise SystemExit("Validation failed: " + ", ".join(failures))


if __name__ == "__main__":
    main()
