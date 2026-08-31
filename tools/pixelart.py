"""Moteur de rendu commun aux generateurs d'icones 16x16.

Les packs itch.io fournis ne couvrent pas tout (aucun bijou, aucune icone de
stat ni de statut). Les icones manquantes sont dessinees geometriquement puis
passees dans le meme pipeline, pour qu'elles forment une famille coherente avec
les atlas du pack :

    silhouette  ->  ombrage vertical en trois teintes  ->  contour 1px

Une forme est une fonction qui recoit un ImageDraw et peint en blanc opaque (W)
la matiere principale, en gris (A) les parties "accent" (gemme, garde, manchette)
qui recevront la seconde couleur de la palette.
"""

from PIL import Image, ImageDraw

CELL = 16

CLEAR = (0, 0, 0, 0)
W = (255, 255, 255, 255)
A = (180, 180, 180, 255)   # sous-ensemble accent de la forme

OUTLINE = (18, 14, 10, 255)


# --------------------------------------------------------------------------
# Palettes : (sombre, moyen, clair, accent sombre, accent clair)
# --------------------------------------------------------------------------

PALETTES = {
    "gold":     ("#6b4d18", "#a8811f", "#e0bd55", "#8a5a1b", "#f2dd94"),
    "amber":    ("#7a3d12", "#bf6a1c", "#f0a641", "#8c2f10", "#ffd58a"),
    "iron":     ("#3d4147", "#6d747d", "#a9b1ba", "#2b2e33", "#d5dbe2"),
    "steel":    ("#4a5560", "#7d8b99", "#b8c6d3", "#333b44", "#e2ebf3"),
    "leather":  ("#4a3220", "#785038", "#a87a55", "#33210f", "#c9a077"),
    "blood":    ("#5c1418", "#992026", "#d13c40", "#3d0a0d", "#f07070"),
    "rot":      ("#3f4a16", "#6b7d1f", "#9fb434", "#2a3310", "#c8dc62"),
    "glint":    ("#1c3b5c", "#2f6392", "#54a0d4", "#12283d", "#96d3f5"),
    "moonlit":  ("#2e3358", "#4a548c", "#7d8ac4", "#1d2038", "#bcc6ef"),
    "obsidian": ("#1c1c22", "#33333d", "#55555f", "#101014", "#7b7b88"),
    "crystal":  ("#3a5a68", "#5d8b9c", "#8fc3d4", "#24404b", "#c4eaf5"),
    "bog":      ("#2f3d24", "#4e6338", "#78905a", "#1d2716", "#a3bd82"),
    "bone":     ("#5c5443", "#8f8570", "#c4baa1", "#3d372a", "#e6dfc9"),

    # Paliers ajoutes pour les icones de statut, cales sur les couleurs
    # declarees dans status.js pour que les deux restent d'accord.
    "venom":    ("#14512e", "#1f8f4f", "#2ecc71", "#0c3a20", "#7ff0aa"),
    "bramble":  ("#0b3a08", "#0f6b0b", "#148d0b", "#062804", "#5fd44f"),
    "ember":    ("#6b1f10", "#b8391d", "#e74c3c", "#45120a", "#ffa07a"),
    "spark":    ("#6b5205", "#b8930a", "#f1c40f", "#443402", "#ffe97f"),
    "putrid":   ("#4a120d", "#7c2019", "#922b21", "#2e0906", "#cf6a5c"),
    "hoarfrost": ("#154a48", "#1f8c85", "#3dd6c9", "#0c2e2c", "#96f2e9"),
    "dew":      ("#2c5b78", "#4d8fb5", "#85c1e9", "#1b3a4d", "#c2e6f8"),

    # Stats : calees sur les jetons --stat-* de style.css.
    "statVigor":        ("#1f4a26", "#2f7038", "#48a352", "#143018", "#8ad294"),
    "statStrength":     ("#66301a", "#95492a", "#b8683c", "#48200f", "#e0996d"),
    "statDexterity":    ("#6b5205", "#a8830c", "#dcb420", "#443402", "#f7dd72"),
    "statIntelligence": ("#1e3f66", "#2f66a3", "#4b93d6", "#12283f", "#9fcbf2"),
}


def hexrgb(value, alpha=255):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


# --------------------------------------------------------------------------
# Rendu
# --------------------------------------------------------------------------

def render_cell(shape, palette_name):
    """Rend une forme dans une cellule 16x16 RGBA."""
    dark, mid, light, accent_dark, accent_light = (
        hexrgb(c) for c in PALETTES[palette_name]
    )

    mask = Image.new("RGBA", (CELL, CELL), CLEAR)
    shape(ImageDraw.Draw(mask))

    px = mask.load()
    out = Image.new("RGBA", (CELL, CELL), CLEAR)
    op = out.load()

    ys = [y for y in range(CELL) for x in range(CELL) if px[x, y][3] > 0]
    if not ys:
        raise ValueError(f"forme vide : {getattr(shape, '__name__', shape)}")
    top, bottom = min(ys), max(ys)
    span = max(1, bottom - top)

    for y in range(CELL):
        for x in range(CELL):
            r, _g, _b, a = px[x, y]
            if a == 0:
                continue
            is_accent = r < 220
            t = (y - top) / span
            if is_accent:
                op[x, y] = accent_light if t < 0.45 else accent_dark
            else:
                op[x, y] = light if t < 0.33 else (mid if t < 0.7 else dark)

    outline = Image.new("RGBA", (CELL, CELL), CLEAR)
    ol = outline.load()

    # Contour exterieur.
    for y in range(CELL):
        for x in range(CELL):
            if op[x, y][3] > 0:
                continue
            if any(
                0 <= x + dx < CELL and 0 <= y + dy < CELL and op[x + dx, y + dy][3] > 0
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            ):
                ol[x, y] = OUTLINE

    # Contour interne : l'ombrage etant purement vertical, deux sous-parties
    # cote a cote a la meme hauteur recoivent la meme teinte et fusionnent.
    # On assombrit la frontiere accent / corps pour que le relief survive.
    for y in range(CELL):
        for x in range(CELL - 1):
            here, right = px[x, y], px[x + 1, y]
            if here[3] and right[3] and (here[0] < 220) != (right[0] < 220):
                ol[x, y] = OUTLINE
    for y in range(CELL - 1):
        for x in range(CELL):
            here, below = px[x, y], px[x, y + 1]
            if here[3] and below[3] and (here[0] < 220) != (below[0] < 220):
                ol[x, y] = OUTLINE

    out.alpha_composite(outline)
    return out


def build_atlas(entries, shapes, cols, out_path):
    """
    Compose un atlas a partir d'entrees (id, nom_de_forme, nom_de_palette).

    Retourne la liste (id, colonne, ligne) a reporter dans icons.js.
    """
    rows = (len(entries) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * CELL, rows * CELL), CLEAR)
    mapping = []

    for index, (entry_id, shape_name, palette_name) in enumerate(entries):
        if shape_name not in shapes:
            raise SystemExit(f"forme inconnue pour {entry_id} : {shape_name}")
        if palette_name not in PALETTES:
            raise SystemExit(f"palette inconnue pour {entry_id} : {palette_name}")
        cell = render_cell(shapes[shape_name], palette_name)
        col, row = index % cols, index // cols
        atlas.alpha_composite(cell, (col * CELL, row * CELL))
        mapping.append((entry_id, col, row))

    import os
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    atlas.save(out_path)
    return atlas, mapping
