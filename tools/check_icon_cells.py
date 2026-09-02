"""Signale les cellules d'icone vides. Alimente par audit-icones-doublons.mjs."""
import json
import sys

from PIL import Image

donnees = json.load(sys.stdin)
atlases = donnees["atlases"]
caches = {}


def planche(nom):
    # Les quatre metaux partagent la grille : on controle la planche or.
    src = atlases["weaponsGold" if nom == "weapons" else nom]["src"]
    if src not in caches:
        caches[src] = Image.open(src).convert("RGBA")
    return caches[src]


vides = []
for c in donnees["cellules"]:
    im = planche(c["planche"])
    x, y = c["col"] * 16, c["row"] * 16
    if x + 16 > im.size[0] or y + 16 > im.size[1]:
        vides.append((c, "hors planche"))
        continue
    cell = im.crop((x, y, x + 16, y + 16))
    if not any(p[3] > 0 for p in cell.getdata()):
        vides.append((c, "vide"))

print()
if vides:
    print("%d cellule(s) sans image :" % len(vides))
    for c, raison in vides:
        print("   %s [%d, %d] : %s" % (c["planche"], c["col"], c["row"], raison))
    sys.exit(1)
print("Aucune cellule vide ni hors planche.")
