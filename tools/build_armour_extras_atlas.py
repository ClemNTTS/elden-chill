"""Genere assets/sprites/atlas/armour-extras.png.

La planche d'armures du pack itch.io ne contient QUE des torses. Deux pieces du
jeu n'en sont pas : la Couronne du roi serpent et le Bouclier au blason de
l'Arbre Sacre s'affichaient donc en plastron, ce qui ne veut rien dire.

Plutot qu'un SVG — qui serait la seule image lisse au milieu de 164 icones en
pixel art, et demanderait un chemin de rendu separe — on les dessine en 16x16
avec le meme pipeline que les accessoires (tools/pixelart.py : ombrage vertical,
palettes, sous-ensemble d'accent).

Relancer avec :  python tools/build_armour_extras_atlas.py
"""

import os

from pixelart import A, W, build_atlas

COLS = 2
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "sprites", "atlas", "armour-extras.png",
)


# --------------------------------------------------------------------------
# Formes. Le blanc (W) porte la silhouette, le gris (A) la couleur d'accent.
# --------------------------------------------------------------------------

def shape_crown(d):
    """Couronne d'un seul tenant : bandeau plein, trois pointes en creneaux.

    Premiere tentative : trois pointes dessinees separement au-dessus d'un
    bandeau evide. Resultat illisible — trois flacons poses sur une barre. La
    couronne doit etre UN polygone, dont le bord superieur descend en V entre
    les pointes.
    """
    d.polygon(
        [
            (2, 13), (14, 13),          # base du bandeau
            (14, 5), (12, 9),           # pointe droite, puis creux
            (8, 2), (4, 9),             # pointe centrale, plus haute, puis creux
            (2, 5),                     # pointe gauche
        ],
        fill=W,
    )
    # La gemme va sur la pointe centrale, pas dans le bandeau.
    #
    # render_cell eclaircit l'accent dans le tiers superieur et l'assombrit en
    # dessous : une gemme placee bas ressortait plus foncee que le metal, donc
    # se lisait comme un trou. En haut, elle brille.
    d.rectangle([7, 3, 8, 4], fill=A)


def shape_shield_crest(d):
    """Ecu a la pointe basse, portant un arbre.

    Premiere tentative : bord superieur droit et blason ovale au centre. On y
    voyait un carre avec une tache. Les flancs sont maintenant rentrants et le
    blason est un arbre reconnaissable a cette taille.
    """
    # L'ecu porte la couleur principale, l'arbre l'accent.
    #
    # Deux echecs avant celui-ci. Le premier plaçait l'arbre haut : render_cell
    # eclaircit l'accent dans le tiers superieur, le houppier se confondait
    # donc avec le haut de l'ecu, deja clair. Le second inversait les roles,
    # mais la palette dew a un accent trop proche de sa base.
    #
    # L'arbre est maintenant descendu pour tenir presque entierement sous la
    # bascule clair/fonce, ce qui le rend sombre sur un ecu dore.
    d.polygon(
        [
            (3, 2), (12, 2),            # epaules
            (12, 7), (10, 11),          # flanc droit qui rentre
            (8, 14), (7, 14),           # pointe
            (5, 11), (3, 7),            # flanc gauche
        ],
        fill=W,
    )
    d.polygon([(4, 10), (11, 10), (8, 5), (7, 5)], fill=A)   # houppier
    d.rectangle([7, 10, 8, 13], fill=A)                      # tronc


SHAPES = {
    "crown": shape_crown,
    "shield_crest": shape_shield_crest,
}

ITEMS = [
    ("serpent_king_crown", "crown", "venom"),
    ("haligtree_crest_shield", "shield_crest", "spark"),
]


def main():
    atlas, mapping = build_atlas(ITEMS, SHAPES, COLS, OUT)
    rows = (len(ITEMS) + COLS - 1) // COLS
    print(f"{OUT}  {atlas.size[0]}x{atlas.size[1]}  {len(ITEMS)} pieces, {COLS}x{rows} cellules")
    print()
    print("Correspondance a reporter dans icons.js :")
    for (entry_id, col, row), (_, shape, palette) in zip(mapping, ITEMS):
        print(f"  {entry_id:28s} col={col} row={row}   ({shape}/{palette})")


if __name__ == "__main__":
    main()
