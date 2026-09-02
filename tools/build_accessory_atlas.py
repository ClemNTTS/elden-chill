"""Genere assets/sprites/atlas/accessories.png.

Les packs itch.io fournis ne contiennent aucune icone de bijou, alors que le jeu
compte 42 accessoires. Ce script dessine les formes manquantes en 16x16, dans la
meme grille et le meme esprit que les atlas du pack, pour qu'elles ne jurent pas
a cote.

Le pipeline de rendu (ombrage, contours, palettes) vit dans tools/pixelart.py,
partage avec les autres generateurs d'icones.

Une entree ITEMS associe un identifiant d'objet a une forme et une palette.

Relancer avec :  python tools/build_accessory_atlas.py
"""

import os

from pixelart import CLEAR, A, W, build_atlas

COLS = 8
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "sprites", "atlas", "accessories.png",
)


# --------------------------------------------------------------------------
# Formes : chaque fonction peint la silhouette en blanc opaque (W), les
# parties en gris (A) recevant la couleur d'accent de la palette.
# --------------------------------------------------------------------------

def shape_ring(d):
    d.ellipse([3, 5, 12, 14], fill=W)
    d.ellipse([6, 8, 9, 11], fill=CLEAR)
    d.rectangle([7, 2, 8, 5], fill=W)
    d.ellipse([6, 1, 9, 4], fill=A)


def shape_medallion(d):
    d.ellipse([2, 2, 13, 13], fill=W)
    d.ellipse([5, 5, 10, 10], fill=A)


def shape_amulet(d):
    # La chaine est un arc, pas deux traits : deux traits droits partant du
    # pendentif lisaient comme des antennes d'insecte.
    d.arc([2, 0, 13, 9], start=195, end=345, fill=W, width=1)
    d.polygon([(7, 6), (8, 6), (11, 10), (8, 14), (7, 14), (4, 10)], fill=A)


def shape_heart(d):
    d.ellipse([2, 3, 8, 9], fill=W)
    d.ellipse([7, 3, 13, 9], fill=W)
    d.polygon([(2, 7), (13, 7), (8, 14), (7, 14)], fill=W)


def shape_feather(d):
    # Palme large + hampe fine, et surtout des encoches sur le bord : sans
    # elles la silhouette lisait comme une lame.
    # Palme large, encoches sur le bord exterieur, hampe qui depasse en bas.
    # Pas de nervure en teinte accent : croisee avec les encoches, le contour
    # interne la transformait en damier.
    d.polygon([(12, 1), (14, 3), (9, 10), (6, 12), (4, 12), (7, 6)], fill=W)
    for cut in ((11, 4), (9, 7), (7, 10)):
        d.polygon(
            [(cut[0], cut[1]), (cut[0] + 2, cut[1] + 1), (cut[0] - 1, cut[1] + 2)],
            fill=CLEAR,
        )
    d.line([5, 12, 2, 15], fill=A)


def shape_seed(d):
    # Amande pointue vers le haut. La version precedente avait une tige et un
    # corps rond : elle lisait comme une fiole.
    d.polygon([(8, 0), (12, 6), (11, 12), (8, 15), (5, 12), (4, 6)], fill=W)
    d.line([8, 3, 8, 12], fill=A)


def shape_gauntlet(d):
    # Gant ouvert, doigts separes par du vide. Les versions pleines (poing,
    # rectangles empiles) se faisaient aplatir par l'ombrage et lisaient comme
    # un bloc : seuls des trous transparents survivent a coup sur, parce qu'ils
    # recoivent un contour.
    for x in (4, 7, 10):
        d.rectangle([x, 1, x + 1, 6], fill=W)
    d.rectangle([4, 6, 11, 10], fill=W)
    d.rectangle([1, 5, 3, 8], fill=W)          # pouce, detache du corps
    d.rectangle([3, 10, 12, 13], fill=A)       # manchette


def shape_mask(d):
    d.ellipse([2, 1, 13, 14], fill=W)
    d.ellipse([4, 5, 6, 8], fill=CLEAR)
    d.ellipse([9, 5, 11, 8], fill=CLEAR)
    d.rectangle([6, 10, 9, 11], fill=A)


def shape_boot(d):
    d.polygon([(4, 1), (8, 1), (8, 8), (14, 8), (14, 12), (4, 12)], fill=W)
    d.rectangle([3, 12, 14, 14], fill=A)


def shape_shackle(d):
    # Deux bracelets nettement ouverts (des C, pas des anneaux) relies par une
    # chaine fine. Des disques epais lisaient comme des engrenages.
    d.ellipse([0, 0, 7, 7], fill=W)
    d.ellipse([2, 2, 5, 5], fill=CLEAR)
    d.rectangle([5, 3, 7, 4], fill=CLEAR)      # ouverture du bracelet
    d.ellipse([8, 8, 15, 15], fill=W)
    d.ellipse([10, 10, 13, 13], fill=CLEAR)
    d.rectangle([8, 11, 10, 12], fill=CLEAR)   # ouverture du bracelet
    d.line([6, 6, 9, 9], fill=A)


def shape_wings(d):
    d.polygon([(7, 4), (7, 10), (2, 8), (0, 4)], fill=W)
    d.polygon([(8, 4), (8, 10), (13, 8), (15, 4)], fill=W)
    d.polygon([(7, 3), (8, 3), (9, 6), (8, 14), (7, 14), (6, 6)], fill=A)


def shape_shard(d):
    d.polygon([(9, 1), (12, 6), (7, 14), (4, 11), (5, 5)], fill=W)
    d.line([9, 2, 6, 12], fill=A)


def shape_moon(d):
    d.ellipse([1, 1, 13, 13], fill=W)
    d.ellipse([5, 0, 16, 12], fill=CLEAR)


def shape_needle(d):
    d.line([14, 1, 3, 12], fill=W, width=2)
    d.ellipse([1, 11, 5, 15], fill=A)
    d.ellipse([2, 12, 4, 14], fill=CLEAR)


def shape_shield(d):
    d.polygon([(2, 1), (13, 1), (13, 8), (8, 14), (7, 14), (2, 8)], fill=W)
    d.rectangle([5, 4, 10, 8], fill=A)


def shape_horn(d):
    # Corne d'appel : spirale ouverte, embouchure marquee en accent.
    d.polygon([(2, 3), (6, 2), (12, 6), (14, 12), (10, 13), (6, 9), (3, 6)], fill=W)
    d.ellipse([1, 1, 6, 6], fill=W)
    d.ellipse([3, 3, 4, 4], fill=CLEAR)
    d.ellipse([10, 9, 15, 14], fill=A)


def shape_eye(d):
    # Oeil de dragon : amande horizontale, pupille verticale en accent.
    d.polygon([(0, 8), (5, 3), (11, 3), (16, 8), (11, 13), (5, 13)], fill=W)
    d.ellipse([6, 4, 10, 12], fill=A)


SHAPES = {
    "horn": shape_horn,
    "eye": shape_eye,
    "ring": shape_ring,
    "medallion": shape_medallion,
    "amulet": shape_amulet,
    "heart": shape_heart,
    "feather": shape_feather,
    "seed": shape_seed,
    "gauntlet": shape_gauntlet,
    "mask": shape_mask,
    "boot": shape_boot,
    "shackle": shape_shackle,
    "wings": shape_wings,
    "shard": shape_shard,
    "moon": shape_moon,
    "needle": shape_needle,
    "shield": shape_shield,
}

# --------------------------------------------------------------------------
# Les 25 accessoires, dans l'ordre de l'atlas (8 par ligne).
# --------------------------------------------------------------------------

ITEMS = [
    ("rune_fragment",                 "shard",     "gold"),
    ("crimson_amber",                 "medallion", "amber"),
    ("scholars_ring",                 "ring",      "glint"),
    ("leather_boots",                 "boot",      "leather"),
    ("margit_shackle",                "shackle",   "iron"),
    ("troll_necklace",                "amulet",    "bone"),
    ("burned_dragon_hearth",          "heart",     "amber"),
    ("radagon_scarseal",              "medallion", "blood"),

    ("forged_grip",                   "gauntlet",  "iron"),
    ("godrick_great_rune",            "medallion", "gold"),
    ("winged_sword_insignia",         "wings",     "steel"),
    ("vermilion_seed",                "seed",      "blood"),
    ("stormhawk_feather",             "feather",   "steel"),
    ("moon_of_nokstella",             "moon",      "moonlit"),
    ("black_knife_gauntlets",         "gauntlet",  "obsidian"),
    ("glintstone_dragon_heart",       "heart",     "glint"),

    ("karolos_mask",                  "mask",      "glint"),
    ("heavy_crystal_gauntlets",       "gauntlet",  "crystal"),
    ("bog_amulet",                    "amulet",    "bog"),
    ("rotten_dragon_heart",           "heart",     "rot"),
    ("guillotine_pendant",            "amulet",    "iron"),
    ("sentinel_greatshield_talisman", "shield",    "gold"),
    ("carian_troll_gauntlet",         "gauntlet",  "moonlit"),
    ("finger_stitcher_needle",        "needle",    "bone"),

    ("lunar_resilience_talisman",     "moon",      "crystal"),
    ("ainsel_starmap",                "medallion", "moonlit"),
    ("prince_bark_talisman",          "medallion", "bog"),
    ("rotbloom_idol",                 "mask",      "rot"),
    ("celestial_dew_talisman",        "amulet",    "crystal"),
    ("horn_bow_talisman",             "horn",      "leather"),
    ("starlight_pendant",             "amulet",    "moonlit"),
    ("ancestral_spirit_horn",         "horn",      "bone"),

    ("ancestral_renaissance_horn",    "horn",      "gold"),
    ("altus_exec_sigil",              "medallion", "obsidian"),
    ("gelmir_dragon_eye",             "eye",       "blood"),
    ("arena_colossus_token",          "medallion", "steel"),
    ("azula_black_idol",              "mask",      "obsidian"),
    ("talisman_posture",              "shield",    "steel"),
    ("talisman_execution",            "shield",    "blood"),
    ("talisman_storm_dragon",         "wings",     "glint"),

    ("talisman_blackrot",             "seed",      "rot"),
    ("talisman_wayfarer",             "ring",      "leather"),

    # Version complete : quatorze accessoires livres avec le contenu tardif
    # n'avaient aucune icone et s'affichaient en carre hachure.
    #
    # Chaque couple forme/palette doit etre UNIQUE : le rendu ne depend que de
    # ces deux valeurs, donc deux bijoux qui les partagent donnent exactement
    # la meme image. Cinq collisions au premier essai.
    ("madding_charm",                    "eye",         "spark"),
    ("deathroot_charm",                  "seed",        "putrid"),
    ("briar_thorn_seal",                 "medallion",   "bramble"),
    ("manor_contract_seal",              "medallion",   "ember"),
    ("blasphemous_chalice",              "heart",       "blood"),
    ("tower_seal_ring",                  "shield",      "glint"),
    ("jar_luck_charm",                   "seed",        "amber"),
    ("starlight_shard",                  "shard",       "moonlit"),
    ("zamor_ice_seal",                   "medallion",   "hoarfrost"),
    ("destined_death_rune",              "shard",       "obsidian"),
    ("lansseax_glaive_ring",             "ring",        "spark"),
    ("ashen_capital_seal",               "shield",      "obsidian"),
    ("scarlet_bloom_charm",              "feather",     "rot"),
    ("golden_order_seal",                "mask",        "gold"),
]

# --------------------------------------------------------------------------
# Rendu
# --------------------------------------------------------------------------

def main():
    atlas, mapping = build_atlas(ITEMS, SHAPES, COLS, OUT)
    rows = (len(ITEMS) + COLS - 1) // COLS
    print(
        f"{OUT}  {atlas.size[0]}x{atlas.size[1]}  "
        f"{len(ITEMS)} accessoires, {COLS}x{rows} cellules"
    )
    print()
    print("Correspondance a reporter dans icons.js :")
    for (entry_id, col, row), (_, shape, palette) in zip(mapping, ITEMS):
        print(f"  {entry_id:32s} col={col} row={row}   ({shape}/{palette})")


if __name__ == "__main__":
    main()
