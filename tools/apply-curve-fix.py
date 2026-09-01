"""Applique le lissage de courbe decide a partir de tools/propose-curve-fix.mjs.

Les remontees de monstres standard ne concernent QUE des monstres exclusifs a
leur biome : `clayman` et les monstres de Raya Lucaria sont partages, donc
leurs boss sont ajustes seuls, plus bas en compensation.
"""
import io, re, os, glob

BOSS = {  # id -> (hp, atk)  None = inchange
    "limgrave_dragon": (700, 32),
    "hero_of_zamor": (600, 33),
    "godrick": (None, 38),
    "ekzykes": (5300, 138),
    "radahn": (3000, 101),
    "liurnia_dragon_smarag": (1300, 63),   # trash partage : boss seul
    "mimic_tear_boss": (10500, None),
    "rennala": (1700, 63),                 # trash partage : boss seul
    "dragonkin_ainsel": (15300, 222),
    "fia_champion_echo": (17500, None),
    "royal_knight_loretta": (None, 101),
    "ancestral_spirit": (None, 100),
}

STD = {  # monstres exclusifs seulement
    "servant_poison": 35, "bats": 35,
    "stormveil_hawk": 105,
    "ainsel_ant": 910, "ainsel_priest": 910,
    "lesser_fingercreeper": 335,
    "rot_pest": 1825, "scarlet_monk": 1825,
    "ancestral_follower": 475, "siofra_rat": 475,
}

files = ["monster.js"] + sorted(glob.glob(os.path.join("monsters", "*.js")))
changed = []

def set_field(body, field, value):
    return re.sub(rf"(\n\s*{field}:\s*)\d+", rf"\g<1>{value}", body, count=1)

for f in files:
    s = io.open(f, encoding="utf-8").read()
    ids = list(re.finditer(r"^(\s{2})([a-zA-Z0-9_]+):\s*\{", s, re.M))
    out, last = [], 0
    for k, m in enumerate(ids):
        mid = m.group(2)
        start, end = m.start(), ids[k + 1].start() if k + 1 < len(ids) else len(s)
        body = s[start:end]
        new = body
        if mid in BOSS:
            hp, atk = BOSS[mid]
            if hp is not None: new = set_field(new, "hp", hp)
            if atk is not None: new = set_field(new, "atk", atk)
        if mid in STD:
            new = set_field(new, "hp", STD[mid])
        if new != body:
            changed.append(mid)
            out.append(s[last:start]); out.append(new); last = end
    out.append(s[last:])
    io.open(f, "w", encoding="utf-8", newline="\n").write("".join(out))

print(f"{len(changed)} monstre(s) ajuste(s) :", ", ".join(sorted(changed)))
attendus = set(BOSS) | set(STD)
manquants = attendus - set(changed)
if manquants:
    print("NON TROUVES :", sorted(manquants))
