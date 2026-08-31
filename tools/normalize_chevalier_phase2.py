from pathlib import Path
from PIL import Image, ImageFilter
import math
import sys


OUTLINE = (26, 20, 16)


def mask_for(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    out = Image.new("L", rgba.size, 0)
    ip, op = rgba.load(), out.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = ip[x, y]
            chroma = r > 190 and b > 190 and g < 110 and abs(r - b) < 90
            op[x, y] = 255 if a >= 128 and not chroma else 0
    return out


def nearest(color, palette):
    r, g, b = color
    return min(palette, key=lambda p: (r-p[0])**2 + (g-p[1])**2 + (b-p[2])**2)


def normalize(src: Path, dst: Path, palette) -> None:
    im = Image.open(src).convert("RGBA")
    mask = mask_for(im)
    bbox = mask.getbbox()
    if not bbox:
        raise RuntimeError(f"No subject: {src}")
    crop, cmask = im.crop(bbox), mask.crop(bbox)
    cp = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = cp[x, y]
            if r > 150 and b > 150 and g * 1.7 < min(r, b):
                cp[x, y] = (*OUTLINE, a)

    scale = min(60 / crop.width, 54 / crop.height)
    nw, nh = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
    # The production spec requires every silhouette, including fallen poses,
    # to remain at least 40 px high. The outline contributes two pixels.
    if nh < 38:
        nh = 38
    crop = crop.resize((nw, nh), Image.Resampling.NEAREST)
    cmask = cmask.resize((nw, nh), Image.Resampling.NEAREST)

    mapped = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    srcp, mp, dp = crop.load(), cmask.load(), mapped.load()
    for y in range(nh):
        for x in range(nw):
            if mp[x, y]:
                dp[x, y] = (*nearest(srcp[x, y][:3], palette), 255)

    x0, y0 = (64 - nw) // 2, 58 - nh
    base_mask = Image.new("L", (64, 64), 0)
    base_mask.paste(cmask, (x0, y0))
    outline = base_mask.filter(ImageFilter.MaxFilter(3))
    out = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    out.paste((*OUTLINE, 255), mask=outline)
    out.alpha_composite(mapped, (x0, y0))
    out.putdata([(r, g, b, 255 if a >= 128 else 0) for r, g, b, a in out.getdata()])
    out.save(dst, "PNG", optimize=False)


def main():
    src_dir, out_dir, reference = map(Path, sys.argv[1:4])
    out_dir.mkdir(parents=True, exist_ok=True)
    ref = Image.open(reference).convert("RGBA")
    palette = sorted({(r, g, b) for r, g, b, a in ref.getdata() if a})
    if OUTLINE not in palette:
        palette[0] = OUTLINE
    # Keep the validated idle frame byte-for-byte as animation reference.
    (out_dir / "chevalier_idle_01.png").write_bytes(reference.read_bytes())
    for src in sorted(src_dir.glob("chevalier_*.png")):
        normalize(src, out_dir / src.name, palette)


if __name__ == "__main__":
    main()
