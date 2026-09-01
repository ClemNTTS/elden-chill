"""Verifie qu'un jeu de frames de monstre est utilisable par le jeu.

Controle exactement ce dont dependent build_monster_sheets.py et le rendu en
combat , ni plus, ni moins. Tout ce qui est signale ici casserait l'animation.

    python tools/validate_monster_frames.py <archetype>
    python tools/validate_monster_frames.py <archetype> --dir chemin/vers/frames
    python tools/validate_monster_frames.py <archetype> --fix-anchor

--fix-anchor recale verticalement les frames dont la base n'est pas sur la
ligne attendue. C'est une simple translation, sans redimensionnement ni
reechantillonnage : aucun pixel n'est altere. A n'utiliser que pour des ecarts
de quelques pixels ; un ecart important signale une frame mal dessinee, qu'il
vaut mieux refaire.

Sortie 0 si tout passe, 1 sinon.
"""

import os
import sys

from PIL import Image

# Deux gabarits. Le brief prevoit 64x64 pour les archetypes communs et 96x96
# pour les boss, qui doivent dominer la scene. Le gabarit est DEDUIT de la
# premiere frame trouvee, puis impose aux 17 autres : coder un seul gabarit en
# dur rejetait a tort les boss livres conformes.
GAUGES = {
    64: 58,   # taille de cellule -> ligne de base
    96: 88,
}

MAX_COLORS = 40

ANIMATIONS = {"idle": 4, "attack": 6, "hurt": 2, "death": 6}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Au-dela de ce nombre de pixels alignes sur un bord, ce n'est plus une pointe
# qui depasse mais un corps tronque.
EDGE_LIMIT = 4


def analyse(path):
    image = Image.open(path).convert("RGBA")
    px = image.load()

    colors = set()
    semi = 0
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if a < 255:
                semi += 1
            else:
                colors.add((r, g, b))

    # Pixels colles aux bords. Une silhouette dessinee trop large pour sa
    # cellule est coupee net : le contrle d'ancrage ne le voit pas, et a la
    # vignette ca passe inapercu. Une pointe de queue touche le bord sur un ou
    # deux pixels ; un corps rogne en aligne une dizaine.
    edge_left = sum(1 for y in range(image.height) if px[0, y][3] > 8)
    edge_right = sum(1 for y in range(image.height) if px[image.width - 1, y][3] > 8)
    edge_top = sum(1 for x in range(image.width) if px[x, 0][3] > 8)

    return {
        "size": image.size,
        "bbox": image.getbbox(),
        "colors": colors,
        "semi": semi,
        "opaque_corner": px[0, 0][3] > 0,
        "edge": max(edge_left, edge_right, edge_top),
    }


def shift_frame(path, dy):
    """Translate verticalement une frame, sans rien reechantillonner."""
    image = Image.open(path).convert("RGBA")
    shifted = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shifted.alpha_composite(image, (0, max(0, dy)) if dy >= 0 else (0, 0))
    if dy < 0:
        shifted = Image.new("RGBA", image.size, (0, 0, 0, 0))
        shifted.paste(image.crop((0, -dy, image.width, image.height)), (0, 0))
    shifted.save(path)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    archetype = sys.argv[1]
    folder = (
        sys.argv[sys.argv.index("--dir") + 1]
        if "--dir" in sys.argv
        else os.path.join(ROOT, "assets", "sprites", archetype)
    )

    if not os.path.isdir(folder):
        print(f"ECHEC  dossier introuvable : {folder}")
        return 1

    # Gabarit deduit de la premiere frame presente.
    first = None
    for anim, count in ANIMATIONS.items():
        for index in range(1, count + 1):
            candidate = os.path.join(folder, f"{archetype}_{anim}_{index:02d}.png")
            if os.path.exists(candidate):
                first = candidate
                break
        if first:
            break

    if not first:
        print(f"ECHEC  aucune frame trouvee dans {folder}")
        return 1

    cell = analyse(first)["size"][0]
    if cell not in GAUGES:
        print(
            f"ECHEC  gabarit inconnu : {cell}x{cell}. "
            f"Attendu {' ou '.join(f'{c}x{c}' for c in GAUGES)}."
        )
        return 1
    baseline = GAUGES[cell]

    fix_anchor = "--fix-anchor" in sys.argv
    problems = []
    fixed = []
    palette = set()
    checked = 0

    for anim, count in ANIMATIONS.items():
        for index in range(1, count + 1):
            name = f"{archetype}_{anim}_{index:02d}.png"
            path = os.path.join(folder, name)

            if not os.path.exists(path):
                problems.append(f"{name} : frame manquante")
                continue

            checked += 1
            info = analyse(path)

            if info["size"] != (cell, cell):
                problems.append(
                    f"{name} : {info['size'][0]}x{info['size'][1]}, "
                    f"attendu {cell}x{cell} comme les autres frames"
                )

            if info["opaque_corner"]:
                problems.append(f"{name} : fond opaque (le coin haut-gauche n'est pas transparent)")

            if info["semi"]:
                problems.append(f"{name} : {info['semi']} pixels semi-transparents (anti-aliasing)")

            bbox = info["bbox"]
            if not bbox:
                problems.append(f"{name} : frame entierement vide")
            elif info["edge"] >= EDGE_LIMIT:
                problems.append(
                    f"{name} : silhouette coupee ({info['edge']} pixels colles a un bord "
                    f", la creature est trop large pour sa cellule)"
                )
            else:
                bottom = bbox[3] - 1
                if bottom != baseline:
                    if fix_anchor and abs(bottom - baseline) <= 4:
                        shift_frame(path, baseline - bottom)
                        fixed.append(f"{name} : recalee de {baseline - bottom:+d}px")
                    else:
                        problems.append(
                            f"{name} : base a y={bottom}, attendu y={baseline} "
                            "(la creature sautillerait pendant l'animation)"
                        )

            palette |= info["colors"]

    if len(palette) > MAX_COLORS:
        problems.append(
            f"palette : {len(palette)} couleurs sur l'ensemble des frames, "
            f"maximum conseille {MAX_COLORS} - le degrade de teinte suppose "
            "une source quasi monochrome"
        )

    total = sum(ANIMATIONS.values())
    print(f"archetype : {archetype}")
    print(f"dossier   : {folder}")
    print(f"gabarit   : {cell}x{cell}, base a y={baseline}"
          f"{' (boss)' if cell == 96 else ''}")
    print(f"frames    : {checked}/{total}")
    print(f"palette   : {len(palette)} couleurs")
    print()

    if fixed:
        print(f"{len(fixed)} frame(s) recalee(s) :")
        for f in fixed:
            print(f"  - {f}")
        print()

    if problems:
        print(f"{len(problems)} PROBLEME(S) :")
        for p in problems:
            print(f"  - {p}")
        return 1

    print("Tout est conforme. Etape suivante :")
    print("  python tools/build_monster_sheets.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
