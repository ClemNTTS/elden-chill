"""Genere assets/sprites/atlas/emblems.png : marques de faction des monstres.

103 monstres pour 12 silhouettes : apres teinture et mise a l'echelle, il reste
17 groupes ou deux creatures REELLEMENT differentes se ressemblent (le compte
exclut les declinaisons du meme monstre, comme les trois "Soldat d'Exil").

L'embleme est une petite marque posee a cote du monstre, qui tranche ces cas
sans toucher au sprite. Il n'est pas pose sur tous les monstres : seulement la
ou il distingue quelque chose, sinon c'est du bruit.

Relancer avec :  python tools/build_emblem_atlas.py
"""

import math
import os

from pixelart import CLEAR, A, W, build_atlas

COLS = 6
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "sprites", "atlas", "emblems.png",
)


# --------------------------------------------------------------------------
# Formes
# --------------------------------------------------------------------------

def shape_crown(d):
    d.polygon([(1, 12), (1, 4), (5, 8), (8, 2), (11, 8), (15, 4), (15, 12)], fill=W)
    d.rectangle([1, 12, 15, 14], fill=A)


def shape_spore(d):
    for (x, y, r) in ((5, 6, 3), (11, 5, 2), (10, 10, 3), (5, 11, 2)):
        d.ellipse([x - r, y - r, x + r, y + r], fill=W)
    for (x, y) in ((5, 6), (10, 10)):
        d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=A)


def shape_blood(d):
    d.ellipse([4, 6, 12, 14], fill=W)
    d.polygon([(8, 0), (11, 8), (5, 8)], fill=W)
    d.ellipse([6, 9, 8, 11], fill=A)


def shape_crystal(d):
    d.polygon([(8, 0), (13, 6), (11, 15), (5, 15), (3, 6)], fill=W)
    d.polygon([(8, 2), (11, 6), (8, 13), (5, 6)], fill=A)


def shape_flame(d):
    d.polygon([(8, 0), (12, 6), (13, 11), (8, 15), (3, 11), (4, 6)], fill=W)
    d.polygon([(8, 6), (11, 11), (8, 14), (5, 11)], fill=A)


def shape_frost(d):
    cx = cy = 8
    for k in range(3):
        angle = math.pi * k / 3
        dx, dy = math.cos(angle) * 7, math.sin(angle) * 7
        d.line([cx - dx, cy - dy, cx + dx, cy + dy], fill=W)
        for sign in (-1, 1):
            tx, ty = cx + dx * sign, cy + dy * sign
            for spread in (-0.6, 0.6):
                d.line(
                    [tx, ty,
                     tx - math.cos(angle + spread) * 3 * sign,
                     ty - math.sin(angle + spread) * 3 * sign],
                    fill=W,
                )
    d.ellipse([6, 6, 9, 9], fill=A)


def shape_eye(d):
    d.polygon([(0, 8), (5, 3), (11, 3), (16, 8), (11, 13), (5, 13)], fill=W)
    d.ellipse([6, 4, 10, 12], fill=A)


def shape_feather(d):
    # Plume simple. Deux tentatives d'aile deployee ont echoue : a 16px les
    # plumes se rejoignent en un bloc et la silhouette lit comme une corne.
    # Une plume unique, elle, est identifiable.
    d.polygon([(12, 1), (14, 3), (9, 10), (6, 12), (4, 12), (7, 6)], fill=W)
    for cut in ((11, 4), (9, 7), (7, 10)):
        d.polygon(
            [(cut[0], cut[1]), (cut[0] + 2, cut[1] + 1), (cut[0] - 1, cut[1] + 2)],
            fill=CLEAR,
        )
    d.line([5, 12, 2, 15], fill=A)


def shape_moon(d):
    d.ellipse([1, 1, 13, 14], fill=W)
    d.ellipse([5, 0, 16, 13], fill=CLEAR)


def shape_claw(d):
    # Griffure : trois entailles paralleles. Des serres dessinees en volume se
    # touchaient et lisaient comme un rateau ; trois traits ne peuvent pas
    # fusionner puisqu'ils sont separes par du vide.
    for offset in (-5, 0, 5):
        d.line([3 + offset, 1, 8 + offset, 14], fill=W, width=2)


def shape_chain(d):
    d.ellipse([0, 3, 8, 9], fill=W)
    d.ellipse([2, 5, 6, 7], fill=CLEAR)
    d.ellipse([7, 7, 15, 13], fill=A)
    d.ellipse([9, 9, 13, 11], fill=CLEAR)


def shape_star(d):
    cx = cy = 8
    pts = []
    for k in range(10):
        angle = math.tau * k / 10 - math.pi / 2
        r = 7.5 if k % 2 == 0 else 3.2
        pts.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    d.polygon(pts, fill=W)
    d.ellipse([6, 6, 9, 9], fill=A)


SHAPES = {
    "crown": shape_crown,
    "spore": shape_spore,
    "blood": shape_blood,
    "crystal": shape_crystal,
    "flame": shape_flame,
    "frost": shape_frost,
    "eye": shape_eye,
    "feather": shape_feather,
    "moon": shape_moon,
    "claw": shape_claw,
    "chain": shape_chain,
    "star": shape_star,
}

# La palette de chaque embleme est choisie pour trancher sur la teinte du
# monstre qui le porte, pas pour s'y fondre.
ENTRIES = [
    ("crown",   "crown",   "gold"),
    ("spore",   "spore",   "rot"),
    ("blood",   "blood",   "blood"),
    ("crystal", "crystal", "glint"),
    ("flame",   "flame",   "ember"),
    ("frost",   "frost",   "hoarfrost"),

    ("eye",     "eye",     "venom"),
    ("feather", "feather", "bone"),
    ("moon",    "moon",    "moonlit"),
    ("claw",    "claw",    "iron"),
    ("chain",   "chain",   "steel"),
    ("star",    "star",    "gold"),
]


def main():
    atlas, mapping = build_atlas(ENTRIES, SHAPES, COLS, OUT)
    rows = (len(ENTRIES) + COLS - 1) // COLS
    print(f"{OUT}  {atlas.size[0]}x{atlas.size[1]}  {len(ENTRIES)} emblemes, {COLS}x{rows} cellules")
    print()
    print("Correspondance a reporter dans icons.js :")
    for entry_id, col, row in mapping:
        print(f"  {entry_id:10s} col={col} row={row}")


if __name__ == "__main__":
    main()
