"""Assemble les 216 frames de monstres en 12 planches d'animation.

Les frames sont livrees une par fichier (assets/sprites/<archetype>/<a>_<anim>_<nn>.png),
ce qui est le format le plus fiable a produire mais le plus couteux a charger :
216 requetes HTTP au lieu de 12. On les compose donc en planches, une ligne par
animation, dans l'ordre declare par ROWS.

Le contenu des frames n'est PAS retouche : le controle qualite a montre un
ancrage exact a y=58, un fond transparent, aucun pixel semi-transparent et
15 couleurs par archetype. Il n'y a rien a normaliser.

Relancer avec :  python tools/build_monster_sheets.py
"""

import os

from PIL import Image

CELL = 64

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "sprites")
OUT = os.path.join(SRC, "monsters")

ARCHETYPES = [
    "humanoide", "chevalier", "bete", "mortvivant",
    "demon", "insecte", "geant", "mage",
    "volant", "amas", "dragon", "construct",
]

# Ordre des lignes dans la planche. Il doit rester synchronise avec
# MONSTER_SHEETS dans sprites.js.
ROWS = [("idle", 4), ("attack", 6), ("hurt", 2), ("death", 6)]

COLS = max(count for _, count in ROWS)


def build(archetype):
    src_dir = os.path.join(SRC, archetype)
    sheet = Image.new("RGBA", (COLS * CELL, len(ROWS) * CELL), (0, 0, 0, 0))

    for row, (anim, count) in enumerate(ROWS):
        for index in range(count):
            name = f"{archetype}_{anim}_{index + 1:02d}.png"
            path = os.path.join(src_dir, name)
            if not os.path.exists(path):
                raise SystemExit(f"frame manquante : {path}")

            frame = Image.open(path).convert("RGBA")
            if frame.size != (CELL, CELL):
                raise SystemExit(f"{name} fait {frame.size}, attendu {(CELL, CELL)}")

            sheet.alpha_composite(frame, (index * CELL, row * CELL))

    out_path = os.path.join(OUT, f"{archetype}.png")
    sheet.save(out_path)
    return out_path, sheet.size


def main():
    os.makedirs(OUT, exist_ok=True)
    for archetype in ARCHETYPES:
        path, size = build(archetype)
        print(f"  {archetype:12s} {size[0]}x{size[1]}  {os.path.relpath(path, ROOT)}")

    print()
    print(f"{len(ARCHETYPES)} planches, {COLS}x{len(ROWS)} cellules de {CELL}px")
    print("Lignes :", ", ".join(f"{i}={anim}({n})" for i, (anim, n) in enumerate(ROWS)))


if __name__ == "__main__":
    main()
