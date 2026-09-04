# Elden Chill

![Elden Ring Inspired](https://img.shields.io/badge/inspired%20by-Elden%20Ring-black?style=for-the-badge&logo=appveyor)

**Elden Chill** est un jeu de rôle incrémental (idle/clicker) développé par un fan, inspiré de l'univers et de l'atmosphère d'Elden Ring. Il se joue directement dans le navigateur.

##  Gameplay & Fonctionnalités

Le jeu se concentre sur une boucle de gameplay simple mais exigeante : préparez votre personnage, partez en expédition, et revenez plus fort!

*   **Progression Continue :** Votre personnage combat automatiquement, accumulant des runes même lorsque vous êtes inactif.
*   **Gestion du Risque :** Les runes collectées lors d'une expédition ne sont pas sécurisées. Vous devez choisir le bon moment pour vous replier au camp, au risque de tout perdre en cas de défaite.
*   **Ferveur :** chaque cycle enchaîné sans repli monte d'un rang : la prime de
    runes et de butin augmente, les ennemis durcissent. Cette prime n'est **pas**
    encaissée cycle par cycle — elle attend dans une réserve versée au repli
    volontaire, et perdue à la mort. Enchaîner un cycle de plus est un pari, pas
    un réglage.
*   **Panoplies :** trois builds enregistrés (arme, armure, accessoire, cendre),
    rechargeables d'un geste pour changer de spécialisation selon la zone.
*   **Contrats de zone :** un objectif à la fois, renouvelé dès qu'il est
    honoré, qui donne une raison de retourner dans les zones déjà dépassées.
    Trois raretés : les communes paient en runes, les rares y ajoutent un objet,
    les légendaires offrent un niveau et du butin **introuvable ailleurs**.
    Ce butin forme cinq panoplies, une par archétype de build (force, dextérité,
    intelligence, vigueur, afflictions). Les contrats visent la panoplie qui
    correspond à votre build et proposent en priorité les pièces qui vous
    manquent : un set se complète en trois contrats, pas en trente. Ces pièces
    arrivent **directement à leur valeur finale** — elles n'ont pas de niveau à
    monter, parce qu'il aurait fallu des centaines de contrats pour y parvenir.
*   **Optimisation de "Build" :** Avec seulement 3 emplacements d'équipement, chaque choix est crucial. Combinez les objets pour créer des synergies puissantes.
*   **Système de Butin (Loot) :** Vaincre les boss garantit l'obtention d'un objet. Trouver des copies d'un même objet permet de l'améliorer.
*   **Plusieurs Zones :** Explorez différents biomes, chacun avec ses propres monstres et son boss redoutable.
*   **Sauvegarde Locale Scellee :** Votre progression vit dans le navigateur, dans une enveloppe signee qui detecte toute modification manuelle.

## Sauvegarde

La progression est stockee dans le `localStorage` du navigateur. Il n'y a ni
compte, ni serveur, ni connexion : le jeu est jouable hors ligne.

Chaque sauvegarde est scellee par [`save-crypto.js`](save-crypto.js) :

*   le contenu est masque par un keystream derive d'une clef reconstruite a l'execution ;
*   un HMAC-SHA256 tronque accompagne l'enveloppe, ce qui permet de detecter toute retouche ;
*   une copie de secours est conservee en permanence, et une sauvegarde refusee est
    mise en quarantaine (cle `eldenChillSaveRejected`) plutot que supprimee.

Cles utilisees dans le `localStorage` :

| Cle | Contenu |
| --- | --- |
| `eldenChillSave` | enveloppe scellee courante |
| `eldenChillSaveBackup` | enveloppe precedente |
| `eldenChillSaveMeta` | metadonnees en clair (date, sequence, version) |
| `eldenChillSaveRejected` | sauvegarde refusee, conservee pour inspection |
| `eldenChillClientPrefs` | preferences visuelles, propres au navigateur |

**A ne pas confondre avec de la securite.** La clef est livree au navigateur avec
le reste du bundle : quelqu'un de motive la retrouvera. Le scellement sert a
empecher l'edition triviale d'une sauvegarde, pas a proteger un secret.

Un auto-test est disponible depuis la console :

```js
const { selfTest } = await import("./save-crypto.js");
selfTest(); // { shaOk: true, roundTripOk: true, tamperOk: true }
```

## Comment Jouer ?

Le jeu utilise des modules ES : il doit etre servi en HTTP, pas ouvert
directement depuis le disque.

```bash
python -m http.server 8123
```

Puis ouvrez `http://localhost:8123` dans un navigateur moderne.

## Tests

Le moteur se teste hors navigateur, sans aucune dependance : le lanceur
integre de Node et le bouchon DOM de [`tools/headless-stub.mjs`](tools/headless-stub.mjs)
suffisent.

```bash
npm test
```

La suite couvre les effets de cendres, les points de competence critique, les
formules de PV et de soin, l'assainissement des sauvegardes, la Ferveur, les
panoplies, les contrats, et des garde-fous d'architecture (voir
[`tests/`](tests/)). Chaque cas est ecrit a partir d'une
regression reelle : la premiere version de ces tests a ete validee en
reintroduisant les bugs d'origine et en verifiant qu'ils echouaient.

Le lint et le formatage passent par Biome :

```bash
npm run lint
```

En CI, le lint est **bloquant sur les fichiers que la branche modifie**, et
seulement informatif sur le reste : 142 constats subsistent sur la base
existante. Les rendre bloquants d'emblee exigerait un nettoyage de 16 000
lignes avant toute autre contribution ; les ignorer laisserait la dette
grossir. La ligne est donc tenue la ou elle se tient — le code ecrit
aujourd'hui doit etre propre, le reste attend son tour.

`organizeImports` est desactive dans `biome.json` : la regle deplace les
imports AVANT les commentaires d'en-tete qui expliquent pourquoi chaque module
existe, ce qui rend ces fichiers moins lisibles, pas plus.

## Architecture

Les modules se repartissent en deux couches, et la frontiere est verifiee par
un test :

- **donnees** — `state.js`, `item.js`, `ashes.js`, `constants.js`, `items/*`,
  `shared/*`... Ces modules ne doivent jamais importer l'affichage.
- **runtime** — `ui.js`, `combat.js`, `core.js`, `game.js`...

Chaque couche est recursive de l'interieur, ce qui est assume. Ce qui est
interdit, c'est qu'un cycle traverse la frontiere : c'etait le cas de
`ashes.js -> combat.js`, `item.js -> ui.js` et `ui.js -> game.js`, et cela
rendait le moteur impossible a importer hors navigateur — donc intestable.

## Technologies Utilisées

Ce projet est volontairement simple et est construit avec des technologies web de base :

*   **JavaScript** (ES6+ Modules)
*   **HTML5**
*   **CSS3**

Il n'y a pas de frameworks, de dépendances ou d'outils de build.

---

### Clause de non-responsabilité (Disclaimer)

Ce projet est une œuvre de fan à but non lucratif, créée par pur divertissement. Il n'est en aucun cas affilié, approuvé ou sponsorisé par FromSoftware.

**Elden Ring** et tous les éléments associés (noms, personnages, univers) sont la propriété intellectuelle exclusive de **FromSoftware Inc.** Tous les droits leur sont réservés.
