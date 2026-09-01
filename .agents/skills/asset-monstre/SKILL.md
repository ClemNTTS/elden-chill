---
name: asset-monstre
description: Créer ou intégrer les visuels d'un nouvel archétype de monstre ou d'un boss dans Elden Chill, depuis la génération des frames pixel art jusqu'à leur validation, leur assemblage et leur affichage animé en combat.
---

# Créer ou intégrer un monstre dans Elden Chill

Utiliser ce skill pour produire de nouveaux sprites de créatures, intégrer des frames fournies par l'utilisateur ou attribuer une nouvelle apparence à un monstre existant.

## Choisir le parcours

- **Création visuelle** : lire le brief complet dans [`../../../docs/brief-sprites-monstres.md`](../../../docs/brief-sprites-monstres.md), puis utiliser le skill `imagegen`. Respecter les phases de validation du brief et ne pas produire toute l'animation avant validation de la première silhouette.
- **Frames déjà livrées** : commencer directement par leur dépôt et leur validation.
- **Nouvelle apparence sans nouvelle silhouette** : réutiliser un archétype existant avec une teinte et, si nécessaire, un emblème distinctif dans `monster-visuals.js`.

Ne jamais utiliser ni intégrer d'asset extrait d'Elden Ring ou d'un autre jeu commercial.

## Format des frames

Chaque archétype comporte 18 PNG distincts : `idle` 4 frames, `attack` 6, `hurt` 2 et `death` 6.

- Archétype commun : canvas 64×64, base de la créature sur `y=58`.
- Boss dédié : canvas 96×96, base sur `y=88`.
- Fond entièrement transparent, aucun pixel semi-transparent ni anti-aliasing.
- Pixel art net, palette de 12 à 16 couleurs, contour sombre continu d'un pixel.
- Vue de profil 3/4 orientée vers la droite, proportions et couleurs constantes entre les frames.
- Aucun décor, sol, cadre, texte ou ombre portée.
- Nommage : `<archetype>_<animation>_<NN>.png`.

Quand `imagegen` ne garantit pas directement la taille ou les contraintes pixel par pixel, considérer son résultat comme une source visuelle à contrôler et corriger. Ne jamais annoncer une frame comme conforme avant validation locale.

## Déposer et valider

Placer les frames dans `assets/sprites/<archetype>/`, puis exécuter :

```bash
python tools/validate_monster_frames.py <archetype>
```

Pour un dossier externe :

```bash
python tools/validate_monster_frames.py <archetype> --dir <chemin>
```

Pour corriger uniquement un décalage vertical de 1 à 4 pixels :

```bash
python tools/validate_monster_frames.py <archetype> --fix-anchor
```

Ne pas poursuivre tant que la validation échoue. Ne pas utiliser `--fix-anchor` pour masquer une frame mal dessinée.

## Assembler et déclarer

1. Ajouter l'archétype à `ARCHETYPES` dans `tools/build_monster_sheets.py`.
2. Exécuter `python tools/build_monster_sheets.py` pour produire `assets/sprites/monsters/<archetype>.png`.
3. Dans `sprites.js`, ajouter une silhouette mutualisée à `MONSTER_ARCHETYPES`, ou un boss 96px à `BOSS_ARCHETYPES`.
4. Dans `monster-visuals.js`, associer chaque monstre à `[archetype, tint]`. Les teintes existantes sont `ash`, `crimson`, `rot`, `gold`, `frost`, `glint`, `silver`, `verdant` et `ember`.

L'échelle vient de `isBoss` et `isRare` : ne pas la coder dans la table visuelle.

Si deux créatures de noms différents restent visuellement identiques, leur attribuer des emblèmes distincts dans `EMBLEMS`. Ne pas distinguer artificiellement les variantes censées représenter la même créature.

## Vérifier l'intégration

Servir le jeu avec `python tools/devserver.py 8124`, car le serveur standard peut conserver les modules et images en cache.

Dans la console du navigateur :

```js
const mv = await import("./monster-visuals.js");
const sp = await import("./sprites.js");
mv.auditMonsterVisuals(sp.MONSTER_ARCHETYPES);
```

Le rapport final doit avoir `missing`, `orphans`, `badTint`, `badArchetype`, `badEmblem` et `unresolved` vides. Tester ensuite en jeu l'idle, l'attaque, les dégâts et la mort.

## Invariants de rendu

- Le contour sous 12 % de luminance n'est pas teinté ; une silhouette sans contour sombre peut disparaître après la teinte.
- Les héros et monstres n'ont pas la même échelle de référence. Corriger un sprite trop petit dans le dessin plutôt qu'en ajoutant une échelle fractionnaire.
- Recharger entièrement la page après modification d'une planche ou d'une rampe de teinte, car le canvas teinté est mis en cache.
