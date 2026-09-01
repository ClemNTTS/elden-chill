from pathlib import Path
from PIL import Image, ImageFilter
import math
import sys


ARCHETYPES = [
    "humanoide", "bete", "mortvivant", "demon", "insecte", "geant",
    "mage", "volant", "amas", "dragon", "construct",
    "humanoide_aile_dansant", "chevalier_lourd_hallebarde",
    "bete_quadrupede_rampante",
]
OUTLINE = (26, 20, 16, 255)


def crop_subject(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("empty sprite")
    return im.crop(bbox)


def shear_rows(im: Image.Image, amount: int) -> Image.Image:
    """Shift upper rows more than lower rows, using integer pixels only."""
    src = crop_subject(im)
    pad = abs(amount) + 3
    out = Image.new("RGBA", (src.width + pad * 2, src.height), (0, 0, 0, 0))
    for y in range(src.height):
        weight = (src.height - 1 - y) / max(1, src.height - 1)
        dx = round(amount * weight)
        row = src.crop((0, y, src.width, y + 1))
        out.alpha_composite(row, (pad + dx, y))
    return crop_subject(out)


def breathe(im: Image.Image, delta: int) -> Image.Image:
    src = crop_subject(im)
    nh = max(1, src.height + delta)
    return src.resize((src.width, nh), Image.Resampling.NEAREST)


def rotate(im: Image.Image, angle: float) -> Image.Image:
    src = crop_subject(im)
    return crop_subject(src.rotate(-angle, expand=True, resample=Image.Resampling.NEAREST))


def normalize(im: Image.Image, palette: set[tuple[int, int, int]]) -> Image.Image:
    src = crop_subject(im)
    scale = min(60 / src.width, 54 / src.height)
    nw, nh = max(1, round(src.width * scale)), max(1, round(src.height * scale))
    if nh < 38:
        nh = 38
    src = src.resize((nw, nh), Image.Resampling.NEAREST)
    # Hard alpha and palette lock.
    sp = src.load()
    pal = tuple(palette)
    for y in range(nh):
        for x in range(nw):
            r, g, b, a = sp[x, y]
            if a < 128:
                sp[x, y] = (0, 0, 0, 0)
            elif (r, g, b) not in palette:
                q = min(pal, key=lambda p: (r-p[0])**2 + (g-p[1])**2 + (b-p[2])**2)
                sp[x, y] = (*q, 255)
            else:
                sp[x, y] = (r, g, b, 255)

    x0, y0 = (64 - nw) // 2, 58 - nh
    mask = Image.new("L", (64, 64), 0)
    mask.paste(src.getchannel("A"), (x0, y0))
    outline = mask.filter(ImageFilter.MaxFilter(3))
    canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    canvas.paste(OUTLINE, mask=outline)
    canvas.alpha_composite(src, (x0, y0))
    return canvas


def frames(base: Image.Image):
    # Idle: a restrained two-pixel breathing loop, anchored again in normalize().
    yield "idle_01", crop_subject(base)
    yield "idle_02", breathe(base, -1)
    yield "idle_03", breathe(base, -2)
    yield "idle_04", breathe(base, -1)

    # Attack: wind-up left, fast lunge right, impact, recovery.
    for i, shift in enumerate((-3, -6, 3, 8, 4, 0), 1):
        posed = shear_rows(base, shift)
        if i == 4:
            posed = posed.resize((posed.width, max(1, posed.height - 3)), Image.Resampling.NEAREST)
        elif i == 5:
            posed = posed.resize((posed.width, max(1, posed.height - 1)), Image.Resampling.NEAREST)
        yield f"attack_{i:02}", posed

    # Hurt: two stages of recoil away from a hit arriving from the right.
    yield "hurt_01", shear_rows(base, -5)
    yield "hurt_02", shear_rows(base, -9)

    # Death: uninterrupted clockwise fall until the silhouette rests horizontally.
    for i, angle in enumerate((10, 24, 40, 58, 75, 90), 1):
        yield f"death_{i:02}", rotate(base, angle)


def main() -> None:
    phase1, out_root = map(Path, sys.argv[1:3])
    archetypes = sys.argv[3:] or ARCHETYPES
    for archetype in archetypes:
        source = phase1 / f"{archetype}_idle_01.png"
        base = Image.open(source).convert("RGBA")
        palette = {(r, g, b) for r, g, b, a in base.getdata() if a}
        palette.add(OUTLINE[:3])
        out_dir = out_root / archetype
        out_dir.mkdir(parents=True, exist_ok=True)
        for suffix, posed in frames(base):
            dst = out_dir / f"{archetype}_{suffix}.png"
            if suffix == "idle_01":
                dst.write_bytes(source.read_bytes())
            else:
                normalize(posed, palette).save(dst, "PNG", optimize=False)


if __name__ == "__main__":
    main()
