"""Genere le decor du camp : assets/sprites/scene/camp-*.png.

Le camp etait un fond uni. Aucun pack fourni ne contient de decor, donc la scene
est dessinee ici, en basse resolution, puis agrandie en pixel art par le CSS.

Trois calques separes plutot qu'une seule image, pour pouvoir les decaler
independamment (parallaxe) et les recolorer sans tout regenerer :

    camp-sky.png    ciel, etoiles, lueur de l'Arbre-Monde, montagnes lointaines
    camp-mid.png    silhouettes d'arbres morts et ruines
    camp-near.png   sol, pierres et bois du premier plan

Tout est deterministe : le tirage aleatoire est seede, deux executions donnent
la meme image.

Relancer avec :  python tools/build_camp_scene.py
"""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

W, H = 480, 270
HORIZON = 176

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "sprites", "scene",
)

CLEAR = (0, 0, 0, 0)


def hexrgb(value, alpha=255):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


# Palette : nuit tres desaturee, une seule source chaude (l'Arbre-Monde).
SKY_TOP = hexrgb("#0a0910")
SKY_MID = hexrgb("#141220")
SKY_LOW = hexrgb("#2a2320")
SKY_HORIZON = hexrgb("#4a3822")
ERDTREE = hexrgb("#e8c06a")
ERDTREE_SOFT = hexrgb("#c69a44")
MOUNTAIN_FAR = hexrgb("#1b1a26")
MOUNTAIN_NEAR = hexrgb("#15141d")
TREE = hexrgb("#0d0c11")
GROUND = hexrgb("#17140f")
GROUND_LIT = hexrgb("#251d12")
STONE = hexrgb("#22201c")


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(4))


# --------------------------------------------------------------------------
# Calque 1 : ciel
# --------------------------------------------------------------------------

def build_sky(rng):
    img = Image.new("RGBA", (W, H), CLEAR)
    d = ImageDraw.Draw(img)

    # Degrade vertical en quatre paliers : le ciel se rechauffe vers l'horizon.
    for y in range(H):
        t = y / (H - 1)
        if t < 0.35:
            color = lerp(SKY_TOP, SKY_MID, t / 0.35)
        elif t < 0.58:
            color = lerp(SKY_MID, SKY_LOW, (t - 0.35) / 0.23)
        else:
            color = lerp(SKY_LOW, SKY_HORIZON, min(1.0, (t - 0.58) / 0.12))
        d.line([(0, y), (W, y)], fill=color)

    # Etoiles : rares, plus denses en haut, jamais pres de l'horizon.
    for _ in range(150):
        x = rng.randrange(W)
        y = rng.randrange(0, int(HORIZON * 0.75))
        if rng.random() > 1.0 - (y / HORIZON) * 0.8:
            continue
        b = rng.choice([70, 95, 120, 160])
        img.putpixel((x, y), (b + 40, b + 34, b + 20, 255))

    # L'Arbre-Monde. C'est le point de fuite de toute la scene : il doit etre
    # monumental et sa couronne doit lire comme une masse, pas comme un
    # squelette de branches. Lueur large, puis houppier dense, puis tronc.
    tree_x, tree_base = 352, HORIZON + 2
    crown_y = tree_base - 104

    glow = Image.new("RGBA", (W, H), CLEAR)
    gd = ImageDraw.Draw(glow)
    for radius, alpha in ((120, 16), (96, 22), (74, 30), (54, 40), (36, 54), (20, 70)):
        gd.ellipse(
            [tree_x - radius, crown_y - radius * 0.82,
             tree_x + radius, crown_y + radius * 0.82],
            fill=ERDTREE_SOFT[:3] + (alpha,),
        )
    # colonne de lumiere le long du tronc
    gd.polygon(
        [(tree_x - 26, tree_base + 6), (tree_x + 26, tree_base + 6),
         (tree_x + 14, crown_y), (tree_x - 14, crown_y)],
        fill=ERDTREE_SOFT[:3] + (30,),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(13))
    img.alpha_composite(glow)

    tree = Image.new("RGBA", (W, H), CLEAR)
    td = ImageDraw.Draw(tree)

    # Tronc : haut et fin, legerement evase a la base.
    td.polygon(
        [(tree_x - 7, tree_base + 2), (tree_x + 7, tree_base + 2),
         (tree_x + 3, crown_y + 26), (tree_x - 3, crown_y + 26)],
        fill=ERDTREE,
    )

    # Branches maitresses, visibles seulement en bord de couronne.
    for angle_deg, length in ((-142, 44), (-112, 52), (-90, 56), (-68, 52), (-38, 44)):
        a = math.radians(angle_deg)
        x0, y0 = tree_x, crown_y + 28
        td.line(
            [(x0, y0), (x0 + math.cos(a) * length, y0 + math.sin(a) * length)],
            fill=ERDTREE, width=2,
        )

    # Couronne : une masse, pas un chapelet. On tire des ellipses de tailles
    # variees a l'interieur d'une enveloppe elliptique ; l'union donne un
    # contour irregulier. La version precedente placait des bulbes reguliers le
    # long des branches et lisait comme une grappe.
    crown_w, crown_h = 92, 54
    for _ in range(150):
        t = rng.random() ** 0.55
        angle = rng.uniform(0, math.tau)
        bx = tree_x + math.cos(angle) * crown_w * 0.5 * t
        by = crown_y + math.sin(angle) * crown_h * 0.5 * t
        r = rng.uniform(4, 11) * (1.15 - t * 0.5)
        shade = ERDTREE if (by < crown_y and rng.random() < 0.55) else ERDTREE_SOFT
        td.ellipse([bx - r, by - r, bx + r, by + r], fill=shade)

    # Filaments qui retombent sous la couronne.
    for _ in range(14):
        sx = tree_x + rng.uniform(-crown_w * 0.45, crown_w * 0.45)
        sy = crown_y + rng.uniform(6, crown_h * 0.4)
        length = rng.randrange(8, 26)
        x, y = sx, sy
        for step in range(length):
            y += 1
            x += math.sin(step * 0.5 + sx) * 0.45
            if 0 <= int(x) < W and 0 <= int(y) < H:
                tree.putpixel((int(x), int(y)), ERDTREE_SOFT)

    tree = tree.filter(ImageFilter.GaussianBlur(0.6))
    img.alpha_composite(tree)

    # Deux chaines de montagnes, la plus proche plus sombre.
    for color, base, amp, step, seed_off in (
        (MOUNTAIN_FAR, HORIZON - 14, 26, 62, 0.0),
        (MOUNTAIN_NEAR, HORIZON - 2, 18, 44, 2.4),
    ):
        points = [(0, H)]
        x = -10
        while x < W + 20:
            peak = base - abs(math.sin(x / step + seed_off)) * amp - rng.randrange(0, 7)
            points.append((x, peak))
            x += rng.randrange(9, 20)
        points.append((W, H))
        d.polygon(points, fill=color)

    # Bande de brume a l'horizon : c'est elle qui separe les plans et evite que
    # montagnes, arbres et sol se collent en une seule masse noire.
    mist = Image.new("RGBA", (W, H), CLEAR)
    md = ImageDraw.Draw(mist)
    for offset, alpha in ((0, 34), (5, 24), (11, 14)):
        md.rectangle(
            [0, HORIZON - 16 + offset, W, HORIZON - 4 + offset],
            fill=SKY_HORIZON[:3] + (alpha,),
        )
    mist = mist.filter(ImageFilter.GaussianBlur(7))
    img.alpha_composite(mist)

    return img


# --------------------------------------------------------------------------
# Calque 2 : arbres morts et ruines
# --------------------------------------------------------------------------

def draw_dead_tree(d, x, base_y, height, rng, color=TREE):
    """Arbre mort recursif : tronc puis branches qui se divisent en s'affinant."""
    def branch(x0, y0, angle, length, width, depth):
        if depth == 0 or length < 3:
            return
        x1 = x0 + math.cos(angle) * length
        y1 = y0 + math.sin(angle) * length
        d.line([(x0, y0), (x1, y1)], fill=color, width=max(1, int(width)))
        for spread in (-0.42, 0.42):
            branch(
                x1, y1,
                angle + spread + rng.uniform(-0.16, 0.16),
                length * rng.uniform(0.62, 0.78),
                width * 0.62,
                depth - 1,
            )

    branch(x, base_y, -math.pi / 2 + rng.uniform(-0.12, 0.12), height, 4, 5)
    # racines suggerees
    for spread in (-1.1, 1.1):
        d.line(
            [(x, base_y), (x + math.cos(spread) * 6, base_y + 3)],
            fill=color, width=2,
        )


def build_mid(rng):
    img = Image.new("RGBA", (W, H), CLEAR)
    d = ImageDraw.Draw(img)

    # Ruine : deux pans de mur brises, a gauche, pour ancrer le camp.
    d.polygon([(24, HORIZON), (24, HORIZON - 42), (33, HORIZON - 46),
               (40, HORIZON - 38), (40, HORIZON)], fill=MOUNTAIN_NEAR)
    d.polygon([(52, HORIZON), (52, HORIZON - 26), (60, HORIZON - 30),
               (66, HORIZON - 22), (66, HORIZON)], fill=MOUNTAIN_NEAR)
    d.rectangle([28, HORIZON - 30, 33, HORIZON - 22], fill=SKY_LOW)  # ouverture

    # Arbres : petits et pales au loin, grands et noirs devant.
    for x, height, shade in (
        (96, 26, MOUNTAIN_NEAR), (128, 20, MOUNTAIN_NEAR), (300, 22, MOUNTAIN_NEAR),
        (418, 28, MOUNTAIN_NEAR),
        (62, 44, TREE), (176, 52, TREE), (250, 38, TREE), (452, 46, TREE),
    ):
        draw_dead_tree(d, x, HORIZON + 2, height, rng, color=shade)

    return img


# --------------------------------------------------------------------------
# Calque 3 : sol et premier plan
# --------------------------------------------------------------------------

def build_near(rng):
    img = Image.new("RGBA", (W, H), CLEAR)
    d = ImageDraw.Draw(img)

    # Sol, avec une ligne d'horizon irreguliere plutot que droite.
    points = [(0, H), (0, HORIZON + 4)]
    x = 0
    while x < W:
        points.append((x, HORIZON + 2 + rng.randrange(0, 5)))
        x += rng.randrange(12, 28)
    points.append((W, HORIZON + 4))
    points.append((W, H))
    d.polygon(points, fill=GROUND)

    # Halo chaud au sol, cote feu de camp (a gauche du centre).
    fire_x, fire_y = 150, HORIZON + 46
    halo = Image.new("RGBA", (W, H), CLEAR)
    hd = ImageDraw.Draw(halo)
    for radius, alpha in ((78, 20), (56, 26), (36, 34), (20, 46)):
        hd.ellipse(
            [fire_x - radius, fire_y - radius // 3,
             fire_x + radius, fire_y + radius // 3],
            fill=GROUND_LIT[:3] + (alpha,),
        )
    halo = halo.filter(ImageFilter.GaussianBlur(11))
    img.alpha_composite(halo)

    # Pierres du foyer et deux buches. Les flammes elles-memes ne sont pas
    # dessinees ici : elles sont animees en CSS par #fire-particles.
    for dx in (-14, -7, 0, 7, 14):
        d.ellipse([fire_x + dx - 3, fire_y - 2, fire_x + dx + 3, fire_y + 3], fill=STONE)
    d.line([fire_x - 8, fire_y - 1, fire_x + 7, fire_y - 8], fill=hexrgb("#3a2b1c"), width=2)
    d.line([fire_x - 6, fire_y - 8, fire_x + 9, fire_y - 1], fill=hexrgb("#33261a"), width=2)

    # Sentier qui monte vers l'Arbre-Monde : il donne une direction au sol et
    # evite les 90 pixels de noir uni de la premiere version.
    path = Image.new("RGBA", (W, H), CLEAR)
    pd = ImageDraw.Draw(path)
    pd.polygon(
        [(212, H), (300, H), (364, HORIZON + 8), (344, HORIZON + 8)],
        fill=hexrgb("#221c14"),
    )
    path = path.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(path)

    # Cailloux et touffes epars, plus denses au premier plan qu'au loin.
    for _ in range(220):
        x = rng.randrange(W)
        depth = rng.random() ** 0.5          # biaise vers le bas de l'image
        y = int(HORIZON + 6 + depth * (H - HORIZON - 8))
        if y >= H:
            continue
        if rng.random() < 0.55:
            img.putpixel((x, y), STONE)
        else:
            d.line(
                [(x, y), (x, y - rng.randrange(2, 6))],
                fill=hexrgb("#1d1a14"),
            )

    # Quelques pierres levees, en silhouette, reparties sur la largeur.
    for x, height in ((58, 14), (392, 11), (438, 17), (108, 9)):
        base = HORIZON + 30 + (x % 17)
        d.polygon(
            [(x - 4, base), (x + 4, base), (x + 2, base - height), (x - 3, base - height + 2)],
            fill=hexrgb("#1e1b16"),
        )

    return img


# --------------------------------------------------------------------------

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    layers = {
        "camp-sky.png": build_sky(random.Random(20260831)),
        "camp-mid.png": build_mid(random.Random(7)),
        "camp-near.png": build_near(random.Random(1312)),
    }

    for name, img in layers.items():
        path = os.path.join(OUT_DIR, name)
        img.save(path)
        print(f"{name}  {img.size[0]}x{img.size[1]}")

    # Apercu compose, pour relecture visuelle uniquement.
    preview = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    for name in ("camp-sky.png", "camp-mid.png", "camp-near.png"):
        preview.alpha_composite(layers[name])
    preview_path = os.path.join(OUT_DIR, "camp-preview.png")
    preview.resize((W * 2, H * 2), Image.NEAREST).save(preview_path)
    print(f"\napercu : {preview_path}")


if __name__ == "__main__":
    main()
