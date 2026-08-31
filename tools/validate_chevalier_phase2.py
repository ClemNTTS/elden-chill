from pathlib import Path
from PIL import Image, ImageDraw
import sys


ORDER = ([f"chevalier_idle_{i:02}.png" for i in range(1, 5)] +
         [f"chevalier_attack_{i:02}.png" for i in range(1, 7)] +
         [f"chevalier_hurt_{i:02}.png" for i in range(1, 3)] +
         [f"chevalier_death_{i:02}.png" for i in range(1, 7)])


def main():
    folder, preview = map(Path, sys.argv[1:3])
    reference = Image.open(folder / "chevalier_idle_01.png").convert("RGBA")
    allowed = {(r, g, b) for r, g, b, a in reference.getdata() if a}
    failures = []
    for name in ORDER:
        path = folder / name
        if not path.exists():
            failures.append(name + ":missing")
            continue
        im = Image.open(path).convert("RGBA")
        alpha = im.getchannel("A")
        bbox = alpha.getbbox()
        colors = {(r, g, b) for r, g, b, a in im.getdata() if a}
        alphas = {a for r, g, b, a in im.getdata()}
        height = bbox[3] - bbox[1] if bbox else 0
        bottom = bbox[3] - 1 if bbox else -1
        center = abs(((bbox[0] + bbox[2] - 1) / 2) - 31.5) if bbox else 99
        ok = (im.size == (64, 64) and alphas <= {0, 255} and colors <= allowed
              and 40 <= height <= 56 and bottom == 58 and center <= 1)
        print(f"{name}: colors={len(colors)} bbox={bbox} height={height} bottom={bottom} center={center:.1f} ok={ok}")
        if not ok:
            failures.append(name)

    scale, label_h, cols = 4, 18, 6
    rows = 3
    sheet = Image.new("RGBA", (cols * 64 * scale, rows * (64 * scale + label_h)), (38, 32, 29, 255))
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(ORDER):
        im = Image.open(folder / name).convert("RGBA").resize((256, 256), Image.Resampling.NEAREST)
        x, y = (i % cols) * 256, (i // cols) * (256 + label_h)
        bg = Image.new("RGBA", (256, 256), (64, 58, 56, 255))
        bd = ImageDraw.Draw(bg)
        for yy in range(0, 256, 32):
            for xx in range(0, 256, 32):
                if (xx // 32 + yy // 32) % 2:
                    bd.rectangle((xx, yy, xx+31, yy+31), fill=(82, 74, 70, 255))
        bg.alpha_composite(im)
        sheet.alpha_composite(bg, (x, y))
        draw.text((x+4, y+258), name.replace("chevalier_", ""), fill=(230, 218, 200, 255))
    preview.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(preview)
    if failures:
        raise SystemExit("Validation failed: " + ", ".join(failures))


if __name__ == "__main__":
    main()
