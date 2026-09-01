"""Build dedicated 96px boss animation sheets from approved idle concepts."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
import sys


CELL = 96
ANCHOR_Y = 88
OUTLINE = (26, 20, 16, 255)
BOSSES = [
    "troll1_boss", "bloodhound_knight_darriwil", "margit", "limgrave_dragon",
    "hero_of_zamor", "misbegotten_leonine", "grafted_scion", "godrick",
    "commander_oneil_weak", "commander_oneil_strong", "red_wolf_radagon",
    "bell_bearing_hunter_liurnia", "carian_knight_bols", "rennala",
    "liurnia_dragon_smarag", "royal_knight_loretta", "radahn", "ekzykes",
    "draconic_tree_sentinel", "ancestral_spirit", "mimic_tear_boss",
    "dragonkin_ainsel", "fia_champion_echo", "astel_bud",
    "malenia_blade", "elden_beast", "hoarah_loux", "placidusax",
    "rykard_lord_blasphemy", "throne_radagon", "azula_maliketh",
    "godskin_apostle", "godskin_noble", "commander_niall", "elemer_briar",
    "evergaol_astel", "evergaol_fortissax", "evergaol_nameless_champion",
    "divine_tower_keeper", "catacomb_burnt_spirit",
    "gurranq_beast_clergyman", "jarburg_great_jar",
]
ROWS = [("idle", 4), ("attack", 6), ("hurt", 2), ("death", 6)]


def subject_mask(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    mask = Image.new("L", rgba.size, 0)
    ip, mp = rgba.load(), mask.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = ip[x, y]
            magenta = r > 185 and b > 185 and g < 120 and abs(r - b) < 95
            mp[x, y] = 255 if a >= 128 and not magenta else 0
    return mask


def extract(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    mask = subject_mask(rgba)
    bbox = mask.getbbox()
    if not bbox:
        raise ValueError("empty boss source")
    crop, cmask = rgba.crop(bbox), mask.crop(bbox)
    cp = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = cp[x, y]
            if r > 145 and b > 145 and g * 1.65 < min(r, b):
                cp[x, y] = (*OUTLINE[:3], a)
    crop.putalpha(cmask)
    return crop


def quantize_idle(src: Image.Image) -> Image.Image:
    mask = src.getchannel("A")
    rgb = Image.new("RGB", src.size, OUTLINE[:3])
    rgb.paste(src.convert("RGB"), mask=mask)
    q = rgb.quantize(colors=14, method=Image.Quantize.MEDIANCUT,
                     dither=Image.Dither.NONE).convert("RGBA")
    q.putalpha(mask)
    return q


def crop_alpha(im: Image.Image) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("empty transformed frame")
    return im.crop(bbox)


def shear_rows(im: Image.Image, amount: int) -> Image.Image:
    src = crop_alpha(im)
    pad = abs(amount) + 3
    out = Image.new("RGBA", (src.width + pad * 2, src.height), (0, 0, 0, 0))
    for y in range(src.height):
        weight = (src.height - 1 - y) / max(1, src.height - 1)
        dx = round(amount * weight)
        out.alpha_composite(src.crop((0, y, src.width, y + 1)), (pad + dx, y))
    return crop_alpha(out)


def breathe(im: Image.Image, delta: int) -> Image.Image:
    src = crop_alpha(im)
    return src.resize((src.width, max(1, src.height + delta)), Image.Resampling.NEAREST)


def rotate(im: Image.Image, degrees: int) -> Image.Image:
    return crop_alpha(crop_alpha(im).rotate(-degrees, expand=True,
                                             resample=Image.Resampling.NEAREST))


def nearest(color, palette):
    r, g, b = color
    return min(palette, key=lambda p: (r-p[0])**2 + (g-p[1])**2 + (b-p[2])**2)


def normalize(im: Image.Image, palette) -> Image.Image:
    src = crop_alpha(im)
    scale = min(90 / src.width, 86 / src.height)
    nw, nh = max(1, round(src.width * scale)), max(1, round(src.height * scale))
    if nh < 62:
        nh = 62
    src = src.resize((nw, nh), Image.Resampling.NEAREST)
    sp = src.load()
    allowed = set(palette)
    for y in range(nh):
        for x in range(nw):
            r, g, b, a = sp[x, y]
            if a < 128:
                sp[x, y] = (0, 0, 0, 0)
            else:
                c = (r, g, b) if (r, g, b) in allowed else nearest((r, g, b), palette)
                sp[x, y] = (*c, 255)

    x0, y0 = (CELL - nw) // 2, ANCHOR_Y - nh
    mask = Image.new("L", (CELL, CELL), 0)
    mask.paste(src.getchannel("A"), (x0, y0))
    border = mask.filter(ImageFilter.MaxFilter(3))
    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    out.paste(OUTLINE, mask=border)
    out.alpha_composite(src, (x0, y0))
    # Anchor the final outlined silhouette, since rotations can leave a
    # transparent edge row and would otherwise make a few poses land at y=87.
    anchored_src = crop_alpha(out)
    anchored = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    anchored.alpha_composite(
        anchored_src,
        ((CELL - anchored_src.width) // 2, ANCHOR_Y - anchored_src.height + 1),
    )
    return anchored


def make_frames(base: Image.Image):
    yield "idle_01", base
    yield "idle_02", breathe(base, -1)
    yield "idle_03", breathe(base, -3)
    yield "idle_04", breathe(base, -1)
    for i, shift in enumerate((-5, -9, 5, 12, 6, 0), 1):
        pose = shear_rows(base, shift)
        if i == 4:
            pose = pose.resize((pose.width, max(1, pose.height - 5)), Image.Resampling.NEAREST)
        elif i == 5:
            pose = pose.resize((pose.width, max(1, pose.height - 2)), Image.Resampling.NEAREST)
        yield f"attack_{i:02}", pose
    yield "hurt_01", shear_rows(base, -8)
    yield "hurt_02", shear_rows(base, -14)
    for i, angle in enumerate((10, 24, 40, 58, 75, 90), 1):
        yield f"death_{i:02}", rotate(base, angle)


def checker(size):
    bg = Image.new("RGBA", (size, size), (60, 54, 51, 255))
    d = ImageDraw.Draw(bg)
    cell = size // 8
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if (x // cell + y // cell) % 2:
                d.rectangle((x, y, x+cell-1, y+cell-1), fill=(80, 72, 68, 255))
    return bg


def main():
    root = Path(sys.argv[1])
    sources = Path(sys.argv[2])
    bosses = sys.argv[3:] or BOSSES
    frames_root = root / "assets" / "sprites" / "bosses"
    sheets_root = root / "assets" / "sprites" / "monsters"
    previews_root = root / "assets" / "sprites" / "previews" / "bosses"
    sheets_root.mkdir(parents=True, exist_ok=True)
    previews_root.mkdir(parents=True, exist_ok=True)
    for boss_index, boss in enumerate(bosses):
        concept = quantize_idle(extract(Image.open(sources / f"{boss}.png")))
        palette = sorted({(r, g, b) for r, g, b, a in concept.getdata() if a})
        if OUTLINE[:3] not in palette:
            palette[0] = OUTLINE[:3]
        folder = frames_root / boss
        folder.mkdir(parents=True, exist_ok=True)
        poses = list(make_frames(concept))
        frames = {"idle_01": normalize(poses[0][1], palette)}
        # Every later frame must use only colors actually visible in the
        # production idle_01, not merely colors present in the large concept.
        production_palette = sorted({
            (r, g, b) for r, g, b, a in frames["idle_01"].getdata() if a
        })
        for suffix, pose in poses[1:]:
            frames[suffix] = normalize(pose, production_palette)
        for suffix, frame in frames.items():
            frame.save(folder / f"{boss}_{suffix}.png", "PNG", optimize=False)

        sheet = Image.new("RGBA", (6*CELL, 4*CELL), (0, 0, 0, 0))
        row_y = 0
        for row, (anim, count) in enumerate(ROWS):
            for i in range(count):
                sheet.alpha_composite(frames[f"{anim}_{i+1:02}"], (i*CELL, row*CELL))
        sheet.save(sheets_root / f"{boss}.png", "PNG", optimize=False)

        # Compact per-boss preview of all 18 frames.
        preview = Image.new("RGBA", (6*192, 3*192), (34, 28, 26, 255))
        ordered = ([f"idle_{i:02}" for i in range(1, 5)] +
                   [f"attack_{i:02}" for i in range(1, 7)] +
                   [f"hurt_{i:02}" for i in range(1, 3)] +
                   [f"death_{i:02}" for i in range(1, 7)])
        for i, suffix in enumerate(ordered):
            tile = checker(192)
            tile.alpha_composite(frames[suffix].resize((192, 192), Image.Resampling.NEAREST))
            preview.alpha_composite(tile, ((i % 6)*192, (i // 6)*192))
        preview.save(previews_root / f"{boss}.png")

    preview_rows = math.ceil(len(BOSSES) / 6)
    global_preview = Image.new("RGBA", (6*192, preview_rows*192), (34, 28, 26, 255))
    for boss_index, boss in enumerate(BOSSES):
        idle = Image.open(frames_root / boss / f"{boss}_idle_01.png").convert("RGBA")
        tile = checker(192)
        tile.alpha_composite(idle.resize((192, 192), Image.Resampling.NEAREST))
        global_preview.alpha_composite(tile, ((boss_index % 6)*192, (boss_index // 6)*192))
    global_preview.save(previews_root / "all_bosses_idle.png")
    print(f"built {len(bosses)} bosses, {len(bosses)*18} frames, {len(bosses)} sheets")


if __name__ == "__main__":
    main()
