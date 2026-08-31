---
name: asset-monstre
description: Ajoute un nouvel archetype de monstre ou un boss a Elden Chill, depuis le brief pour l'IA generatrice d'images jusqu'a l'affichage anime en combat. A utiliser quand on veut creer de nouveaux sprites de creature, integrer des frames livrees par un agent d'images, ou faire apparaitre un monstre existant avec une nouvelle apparence.
---

# Ajouter un archetype de monstre ou un boss

Le jeu affiche 103 monstres avec 36 planches : 12 silhouettes mutualisees en
64px, et 24 planches dediees aux boss en 96px. Chaque monstre est decrit par
un **archetype** (la planche de sprites), une **teinte** (un degrade applique a
la planche), une **echelle** (deduite du statut boss / rare) et un **embleme**
optionnel. Ajouter du contenu visuel, c'est ajouter une silhouette a ce systeme.

Deux cas :

- **Nouvel archetype** — une nouvelle silhouette, reutilisable par plusieurs
  monstres. C'est le cas courant.
- **Boss dedie** — une silhouette utilisee par un seul monstre. Meme pipeline,
  on saute juste l'etape de mutualisation.

---

## 0. Avant de commencer

Les sprites ne peuvent pas etre produits par Claude : le dessin geometrique par
code convient a des icones 16x16, pas a des creatures animees. Il faut une IA
generatrice d'images, ou un pack achete, ou un artiste.

**Ne jamais integrer d'asset extrait d'Elden Ring.** Les noms et l'ambiance
relevent de l'hommage ; redistribuer des fichiers de FromSoftware est ce qui
fait tomber les projets de fans.

---

## 1. Faire produire les frames

Format attendu, non negociable :

| Contrainte | Valeur |
| --- | --- |
| Une image PNG **par frame** | jamais de planche multi-frames |
| Taille | 64 x 64 pixels (archetype commun) ou 96 x 96 (boss) |
| Fond | entierement transparent |
| Anti-aliasing | aucun, aucun pixel semi-transparent |
| Palette | 12 a 16 couleurs, gamme desaturee |
| Contour | 1 pixel sombre sur toute la silhouette |
| Orientation | vers la **droite**, identique sur toutes les frames |
| Ancrage | la base sur **y=58** en 64x64, **y=88** en 96x96, sur chaque frame |
| Nommage | `<archetype>_<animation>_<NN>.png` |

Animations et nombre de frames :

```
idle    4 frames   respiration, boucle (la 04 enchaine sur la 01)
attack  6 frames   armement, frappe, retour a la pose d'idle
hurt    2 frames   recul
death   6 frames   chute, la 06 est la creature au sol
```

Le brief complet a donner a l'agent d'images se trouve dans
`docs/brief-sprites-monstres.md`. Il impose une production par phases : les
silhouettes d'abord, validation, puis les animations une creature a la fois.
Cette discipline evite de decouvrir 200 images au mauvais gabarit.

**L'ancrage est le point qui casse tout.** Une base a y=55 sur une frame et
y=58 sur la suivante fait sautiller la creature. C'est la premiere chose que
verifie le script de validation.

---

## 2. Deposer et valider

Les frames vont dans `assets/sprites/<archetype>/`.

```bash
python tools/validate_monster_frames.py <archetype>
```

Le script controle exactement ce dont depend le rendu : dimensions, presence
des 18 frames, transparence du fond, absence de pixels semi-transparents,
ancrage a y=58, taille de palette. Il sort en erreur si quoi que ce soit cloche
et nomme chaque frame fautive.

Ne pas passer a la suite tant qu'il n'est pas vert. Une frame non conforme ne
provoque pas d'erreur visible : elle produit une animation qui sautille ou un
sprite decoupe de travers, beaucoup plus long a diagnostiquer.

Le gabarit est deduit de la premiere frame trouvee (64 ou 96) puis impose aux
17 autres : un archetype commun et un boss se valident avec la meme commande.

Pour valider un dossier hors de l'arborescence habituelle :

```bash
python tools/validate_monster_frames.py <archetype> --dir chemin/vers/frames
```

Si des frames sont decalees de un ou deux pixels — cas frequent, l'ecart passe
inapercu a la production mais fait vibrer l'animation :

```bash
python tools/validate_monster_frames.py <archetype> --fix-anchor
```

C'est une translation verticale, sans redimensionnement ni reechantillonnage :
aucun pixel n'est altere. L'option refuse les ecarts de plus de 4px, qui
signalent une frame mal dessinee plutot qu'un decalage.

---

## 3. Assembler la planche

```bash
python tools/build_monster_sheets.py
```

Produit `assets/sprites/monsters/<archetype>.png` : 6 colonnes x 4 lignes de
64px, une ligne par animation dans l'ordre idle, attack, hurt, death. Passer de
18 fichiers a 1 planche divise le nombre de requetes HTTP par 18.

Ajouter le nom de l'archetype dans la liste `ARCHETYPES` en tete du script.

---

## 4. Declarer l'archetype

Dans `sprites.js` : une silhouette mutualisee va dans `MONSTER_ARCHETYPES`, un
boss dedie dans `BOSS_ARCHETYPES`. Cette seconde liste suffit a basculer le
gabarit — `getMonsterCell()` et `getMonsterBaseScale()` en deduisent la cellule
(96px) et l'echelle de rendu.

```js
export const BOSS_ARCHETYPES = [ /* ... */, "mon_boss" ];
```

`MONSTER_ROWS` et `MONSTER_FPS` sont communs a toutes les planches : rien a
changer tant que le gabarit d'animation est respecte.

---

## 5. Associer des monstres

Dans `monster-visuals.js`, ajouter une entree par monstre concerne :

```js
const VISUALS = {
  mon_monstre: ["mon_nouvel_archetype", "crimson"],
};
```

Teintes disponibles : `ash`, `crimson`, `rot`, `gold`, `frost`, `glint`,
`silver`, `verdant`, `ember`. Pour en ajouter une, completer `TINTS` avec une
rampe de trois couleurs (sombre, moyen, clair).

**L'echelle ne se declare pas** : elle vient de `isBoss` (1.45) et `isRare`
(1.15) dans les donnees du monstre.

### Emblemes

Si deux monstres de **noms differents** se retrouvent avec le meme archetype,
la meme teinte et la meme echelle, ils seront indistinguables. Leur donner des
emblemes differents dans `EMBLEMS` :

```js
const EMBLEMS = { mon_monstre: "crown" };
```

Emblemes disponibles : `crown`, `spore`, `blood`, `crystal`, `flame`, `frost`,
`eye`, `feather`, `moon`, `claw`, `chain`, `star`. Pour en creer un, ajouter une
forme dans `tools/build_emblem_atlas.py`, relancer le script, puis reporter la
cellule dans `EMBLEM_CELLS` de `icons.js`.

Les declinaisons d'une meme creature (trois "Soldat d'Exil", deux "Loup
Affame") ne doivent **pas** recevoir d'emblemes differents : elles sont censees
se ressembler.

---

## 6. Verifier

Dans la console du navigateur :

```js
const mv = await import("./monster-visuals.js");
const sp = await import("./sprites.js");
mv.auditMonsterVisuals(sp.MONSTER_ARCHETYPES);
```

Le rapport doit montrer :

- `missing: []` — aucun monstre sans apparence
- `orphans: []` — aucune entree pointant vers un monstre supprime
- `badTint`, `badArchetype`, `badEmblem` vides
- **`unresolved: []`** — c'est le controle qui compte : il liste les groupes ou
  deux creatures de noms differents partagent archetype, teinte, echelle *et*
  embleme. Cette liste doit rester vide.

Puis en jeu : lancer une expedition, faire apparaitre le monstre
(`spawnMonster("mon_monstre", runtimeState.currentCombatSession)`), et regarder
l'idle, un coup encaisse et la mort.

---

## Pieges connus

**Le zoom du navigateur ne suffit pas a juger.** Les sprites sont rendus en
`image-rendering: pixelated` a une echelle entiere. Une echelle fractionnaire
les rend flous.

**La teinture ne touche pas le contour.** Les pixels sous 12% de luminance sont
laisses tels quels : c'est le contour, et le recolorer dissout la silhouette.
Si un sprite disparait apres teinture, c'est qu'il n'a pas de contour sombre.

**La teinture est mise en cache par couple (archetype, teinte).** Apres avoir
modifie une planche ou une rampe, recharger la page : le cache vit dans le
module, pas dans le navigateur.

**Le serveur de dev doit etre `tools/devserver.py`.** `python -m http.server`
laisse le navigateur garder les modules et les images en cache pour toute la
session, y compris dans un onglet neuf. On teste alors un asset qui n'a jamais
ete recharge.

```bash
python tools/devserver.py 8124
```

**Les heros et les monstres n'ont pas la meme echelle de reference** (4 contre
1.6). Les heros occupent environ 20 de leurs 32px de cellule, les monstres 56
de leurs 64. Un nouvel archetype qui remplit moins sa cellule paraitra petit :
c'est le dessin qu'il faut corriger, pas l'echelle, sinon il sera flou.
