from pathlib import Path
from PIL import Image, ImageFilter
import sys


NAMES = [
    "humanoide", "chevalier", "bete", "mortvivant", "demon", "insecte",
    "geant", "mage", "volant", "amas", "dragon", "construct",
    "humanoide_aile_dansant", "chevalier_lourd_hallebarde",
    "bete_quadrupede_rampante",
]


def subject_mask(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    px = rgba.load()
    mask = Image.new("L", rgba.size, 0)
    mp = mask.load()
    # Accept existing transparency. Otherwise remove chroma pixels close to magenta.
    has_alpha = rgba.getextrema()[3][0] < 255
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = px[x, y]
            magenta = r > 205 and b > 205 and g < 85 and abs(r - b) < 70
            mp[x, y] = 255 if a >= 128 and not magenta else 0
    return mask


def normalize(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    mask = subject_mask(im)
    bbox = mask.getbbox()
    if not bbox:
        raise RuntimeError(f"No subject found: {src}")
    crop = im.crop(bbox)
    cmask = mask.crop(bbox)
    # Neutralize chroma spill that survived at antialiased source edges.
    cp = crop.load()
    for yy in range(crop.height):
        for xx in range(crop.width):
            r, g, b, a = cp[xx, yy]
            if r > 150 and b > 150 and g * 1.7 < min(r, b):
                cp[xx, yy] = (26, 20, 16, a)

    # Reserve one pixel for the forced outline and place that outline on y=58.
    max_w, max_h = 60, 54
    scale = min(max_w / crop.width, max_h / crop.height)
    # Keep low creatures readable only when doing so still respects max_w.
    # Otherwise the height floor would re-expand a wide silhouette into the
    # cell edges after the width constraint had already made it fit.
    min_height_scale = 38 / crop.height
    if crop.height * scale < 38 and crop.width * min_height_scale <= max_w:
        scale = min_height_scale
    nw = max(1, round(crop.width * scale))
    nh = max(1, round(crop.height * scale))
    crop = crop.resize((nw, nh), Image.Resampling.NEAREST)
    cmask = cmask.resize((nw, nh), Image.Resampling.NEAREST)

    # Quantize only the opaque subject to 15 colors, without dithering.
    rgb = Image.new("RGB", crop.size, (26, 20, 16))
    rgb.paste(crop.convert("RGB"), mask=cmask)
    quant = rgb.quantize(colors=15, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    subject = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    subject.paste(quant.convert("RGBA"), mask=cmask)

    canvas_mask = Image.new("L", (64, 64), 0)
    x = (64 - nw) // 2
    y = 58 - nh
    canvas_mask.paste(cmask, (x, y))
    outline_mask = canvas_mask.filter(ImageFilter.MaxFilter(3))
    out = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    out.paste((26, 20, 16, 255), mask=outline_mask)
    out.alpha_composite(subject, (x, y))

    # Hard alpha only and enforce that no subject extends below anchor row 58.
    data = [(r, g, b, 255 if a >= 128 else 0) for r, g, b, a in out.getdata()]
    out.putdata(data)
    out.save(dst, "PNG", optimize=False)


def main() -> None:
    src_dir, dst_dir = map(Path, sys.argv[1:3])
    dst_dir.mkdir(parents=True, exist_ok=True)
    names = sys.argv[3:] or NAMES
    for name in names:
        normalize(src_dir / f"{name}.png", dst_dir / f"{name}_idle_01.png")


if __name__ == "__main__":
    main()
