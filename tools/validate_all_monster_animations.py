from pathlib import Path
from PIL import Image, ImageDraw
import sys


ARCHETYPES = [
    "humanoide", "chevalier", "bete", "mortvivant", "demon", "insecte",
    "geant", "mage", "volant", "amas", "dragon", "construct",
]
SUFFIXES = ([f"idle_{i:02}" for i in range(1, 5)] +
            [f"attack_{i:02}" for i in range(1, 7)] +
            [f"hurt_{i:02}" for i in range(1, 3)] +
            [f"death_{i:02}" for i in range(1, 7)])


def checker(size: int) -> Image.Image:
    bg = Image.new("RGBA", (size, size), (62, 56, 53, 255))
    d = ImageDraw.Draw(bg)
    cell = max(4, size // 8)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if (x // cell + y // cell) % 2:
                d.rectangle((x, y, x+cell-1, y+cell-1), fill=(80, 72, 68, 255))
    return bg


def main() -> None:
    root, previews = map(Path, sys.argv[1:3])
    previews.mkdir(parents=True, exist_ok=True)
    failures = []
    report = []
    all_frames = {}
    for archetype in ARCHETYPES:
        folder = root / archetype
        ref_path = folder / f"{archetype}_idle_01.png"
        if not ref_path.exists():
            failures.append(f"{archetype}: missing idle_01")
            continue
        reference = Image.open(ref_path).convert("RGBA")
        allowed = {(r, g, b) for r, g, b, a in reference.getdata() if a}
        frames = []
        for suffix in SUFFIXES:
            path = folder / f"{archetype}_{suffix}.png"
            if not path.exists():
                failures.append(str(path) + ":missing")
                continue
            im = Image.open(path).convert("RGBA")
            bbox = im.getchannel("A").getbbox()
            colors = {(r, g, b) for r, g, b, a in im.getdata() if a}
            alphas = {a for r, g, b, a in im.getdata()}
            height = bbox[3] - bbox[1] if bbox else 0
            bottom = bbox[3] - 1 if bbox else -1
            center = abs(((bbox[0] + bbox[2] - 1) / 2) - 31.5) if bbox else 99
            ok = (im.size == (64, 64) and alphas <= {0, 255} and colors <= allowed
                  and 40 <= height <= 56 and bottom == 58 and center <= 1)
            if not ok:
                failures.append(f"{path.name}: size={im.size} colors={len(colors)} bbox={bbox} alpha={alphas}")
            frames.append(im)
        if len(frames) == 18:
            all_frames[archetype] = frames
            report.append(f"{archetype}: 18/18 OK, palette={len(allowed)}")
            scale, label_h, cols = 4, 18, 6
            sheet = Image.new("RGBA", (cols*256, 3*(256+label_h)), (36, 30, 28, 255))
            draw = ImageDraw.Draw(sheet)
            for i, (suffix, im) in enumerate(zip(SUFFIXES, frames)):
                x, y = (i % cols)*256, (i // cols)*(256+label_h)
                tile = checker(256)
                tile.alpha_composite(im.resize((256, 256), Image.Resampling.NEAREST))
                sheet.alpha_composite(tile, (x, y))
                draw.text((x+4, y+258), suffix, fill=(230, 218, 200, 255))
            sheet.save(previews / f"{archetype}_animations.png")

    # Global contact sheet: every one of the 216 production frames at 2x.
    if len(all_frames) == 12:
        tile = 128
        global_sheet = Image.new("RGBA", (18*tile, 12*(tile+16)), (34, 28, 26, 255))
        gd = ImageDraw.Draw(global_sheet)
        for row, archetype in enumerate(ARCHETYPES):
            for col, im in enumerate(all_frames[archetype]):
                x, y = col*tile, row*(tile+16)
                bg = checker(tile)
                bg.alpha_composite(im.resize((tile, tile), Image.Resampling.NEAREST))
                global_sheet.alpha_composite(bg, (x, y))
            gd.text((4, row*(tile+16)+tile+2), archetype, fill=(235, 222, 202, 255))
        global_sheet.save(previews / "all_archetypes_all_frames.png")

    print("\n".join(report))
    print(f"validated={sum(len(v) for v in all_frames.values())} expected=216 failures={len(failures)}")
    if failures:
        print("\n".join(failures[:100]))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
