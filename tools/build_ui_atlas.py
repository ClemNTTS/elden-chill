"""Genere assets/sprites/atlas/ui.png : icones de stats et d'effets de statut.

Aucun pack fourni ne couvre ces deux familles. Les couleurs des statuts sont
calees sur celles declarees dans status.js, et celles des stats sur les jetons
--stat-* de style.css, pour que l'atlas et le CSS restent d'accord.

Relancer avec :  python tools/build_ui_atlas.py
"""

import math
import os

from pixelart import CLEAR, A, W, build_atlas

COLS = 6
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "sprites", "atlas", "ui.png",
)


# --------------------------------------------------------------------------
# Formes
# --------------------------------------------------------------------------

def shape_heart(d):
    d.ellipse([2, 3, 8, 9], fill=W)
    d.ellipse([7, 3, 13, 9], fill=W)
    d.polygon([(2, 7), (13, 7), (8, 14), (7, 14)], fill=W)


def shape_fist(d):
    # Poing gante. Les phalanges sont separees par du vide : sur 16px, seuls
    # les trous survivent a l'ombrage, une bosse pleine se noie.
    for x in (4, 7, 10):
        d.rectangle([x, 2, x + 1, 6], fill=W)
    d.rectangle([3, 6, 12, 11], fill=W)
    # Pouce remonte : place plus bas il pendait sous le poing au lieu de se
    # replier contre l'index.
    d.rectangle([1, 5, 2, 8], fill=W)
    d.rectangle([3, 11, 12, 14], fill=A)        # manchette


def shape_bow(d):
    # Arc vu de face. La premiere version superposait une fleche pleine
    # traversant tout le cadre : a 16px ca brouillait completement la lecture.
    # On garde la silhouette essentielle — branches epaisses, corde fine — et
    # la fleche se reduit a une encoche en teinte accent.
    d.arc([1, 0, 15, 15], start=95, end=265, fill=W, width=3)
    d.line([11, 2, 11, 13], fill=W)                  # corde
    d.line([5, 8, 13, 8], fill=A)                    # hampe, courte
    d.polygon([(15, 8), (12, 6), (12, 10)], fill=A)  # pointe


def shape_bulb(d):
    # Ampoule : globe en teinte principale, filament et culot en accent.
    # Le globe doit rester nettement plus large que le culot, sinon la
    # silhouette lit comme une fiole.
    d.ellipse([2, 0, 13, 11], fill=W)
    d.polygon([(5, 9), (10, 9), (9, 12), (6, 12)], fill=W)
    d.polygon([(7, 3), (8, 3), (9, 7), (6, 7)], fill=A)   # filament
    d.rectangle([5, 12, 10, 13], fill=A)                  # culot
    d.rectangle([6, 14, 9, 15], fill=A)


def shape_droplet(d):
    d.ellipse([4, 6, 12, 14], fill=W)
    d.polygon([(8, 0), (11, 8), (5, 8)], fill=W)
    d.ellipse([6, 9, 8, 11], fill=A)            # reflet


def shape_thorn(d):
    # Rameau vertical epineux. La version en diagonale avec des epines en
    # teinte accent partait en confettis : la tige disparaissait et il ne
    # restait que des taches. Tige verticale epaisse, epines pleines.
    d.rectangle([7, 2, 9, 15], fill=W)
    for (y, dx) in ((4, 1), (7, -1), (10, 1), (13, -1)):
        x0 = 9 if dx > 0 else 7
        d.polygon([(x0, y), (x0 + 5 * dx, y + 1), (x0, y + 3)], fill=W)
    d.polygon([(7, 0), (9, 0), (8, 3)], fill=A)   # pointe


def shape_burst(d):
    # Etoile a huit branches, longueurs alternees.
    cx = cy = 8
    pts = []
    for k in range(16):
        angle = math.tau * k / 16
        r = 7.5 if k % 2 == 0 else 3.0
        pts.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    d.polygon(pts, fill=W)
    d.ellipse([6, 6, 9, 9], fill=A)


def shape_spores(d):
    for (x, y, r) in ((5, 5, 3), (10, 4, 2), (11, 9, 3), (5, 10, 2), (8, 12, 2)):
        d.ellipse([x - r, y - r, x + r, y + r], fill=W)
    for (x, y) in ((5, 5), (11, 9)):
        d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=A)


def shape_flame(d):
    d.polygon([(8, 0), (12, 6), (13, 11), (8, 15), (3, 11), (4, 6)], fill=W)
    d.polygon([(8, 6), (11, 11), (8, 14), (5, 11)], fill=A)   # coeur de flamme


def shape_snowflake(d):
    cx = cy = 8
    for k in range(3):
        angle = math.pi * k / 3
        dx, dy = math.cos(angle) * 7, math.sin(angle) * 7
        d.line([cx - dx, cy - dy, cx + dx, cy + dy], fill=W, width=1)
        # petites fourches aux extremites
        for sign in (-1, 1):
            tipx, tipy = cx + dx * sign, cy + dy * sign
            for spread in (-0.6, 0.6):
                d.line(
                    [
                        tipx, tipy,
                        tipx - math.cos(angle + spread) * 3 * sign,
                        tipy - math.sin(angle + spread) * 3 * sign,
                    ],
                    fill=W,
                )
    d.ellipse([6, 6, 9, 9], fill=A)


def shape_ward(d):
    # Ecu avec une goutte au centre : la protection de rosee.
    d.polygon([(2, 1), (13, 1), (13, 8), (8, 15), (7, 15), (2, 8)], fill=W)
    d.ellipse([6, 6, 10, 10], fill=A)
    d.polygon([(8, 3), (10, 7), (6, 7)], fill=A)


def shape_rune(d):
    # Glyphe runique : losange evide, traverse d'une barre horizontale.
    # Une barre VERTICALE remplissait tout le creux et la forme lisait comme
    # un simple losange plein.
    d.polygon([(8, 0), (14, 8), (8, 16), (2, 8)], fill=W)
    d.polygon([(8, 4), (11, 8), (8, 12), (5, 8)], fill=CLEAR)
    d.rectangle([5, 7, 10, 9], fill=A)


SHAPES = {
    "heart": shape_heart,
    "fist": shape_fist,
    "bow": shape_bow,
    "bulb": shape_bulb,
    "droplet": shape_droplet,
    "thorn": shape_thorn,
    "burst": shape_burst,
    "spores": shape_spores,
    "flame": shape_flame,
    "snowflake": shape_snowflake,
    "ward": shape_ward,
    "rune": shape_rune,
}


# --------------------------------------------------------------------------
# Entrees : 4 stats, 8 statuts, 1 divers. 6 par ligne.
# --------------------------------------------------------------------------

ENTRIES = [
    # stats — palettes calees sur les jetons --stat-* de style.css
    ("stat_vigor",         "heart",     "statVigor"),
    ("stat_strength",      "fist",      "statStrength"),
    ("stat_dexterity",     "bow",       "statDexterity"),
    ("stat_intelligence",  "bulb",      "statIntelligence"),
    # statuts — palettes calees sur les couleurs de status.js
    ("POISON",             "droplet",   "venom"),
    ("THORNS",             "thorn",     "bramble"),

    ("BLEED",              "droplet",   "ember"),
    ("STUN",               "burst",     "spark"),
    ("SCARLET_ROT",        "spores",    "putrid"),
    ("BURN",               "flame",     "ember"),
    ("FROSTBITE",          "snowflake", "hoarfrost"),
    ("DEW_PROTECTION",     "ward",      "dew"),

    ("rune",               "rune",      "gold"),
]


def main():
    atlas, mapping = build_atlas(ENTRIES, SHAPES, COLS, OUT)
    rows = (len(ENTRIES) + COLS - 1) // COLS
    print(
        f"{OUT}  {atlas.size[0]}x{atlas.size[1]}  "
        f"{len(ENTRIES)} icones, {COLS}x{rows} cellules"
    )
    print()
    print("Correspondance a reporter dans icons.js :")
    for (entry_id, col, row), (_, shape, palette) in zip(mapping, ENTRIES):
        print(f"  {entry_id:20s} col={col} row={row}   ({shape}/{palette})")


if __name__ == "__main__":
    main()
