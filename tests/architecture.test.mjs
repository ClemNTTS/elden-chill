import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
/*
 * Garde-fous d'architecture.
 *
 * Le projet a vecu avec trois cycles d'imports qui rendaient le moteur
 * intestable hors navigateur :
 *
 *   ashes.js  <-> combat.js            (applyEffect)
 *   item.js   <-> items/*.js           (ITEM_RARITIES via systems.js)
 *   ui.js     <-> game.js              (checkForUpdate)
 *
 * Le symptome n'etait pas une erreur au chargement du jeu — le navigateur
 * tolere ces cycles — mais l'impossibilite d'ecrire le moindre test : tout
 * import du moteur remontait jusqu'a game.js, qui cable `window`.
 *
 * Ces tests echouent si un cycle revient.
 */
import test from "node:test";
import { fileURLToPath } from "node:url";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Tous les modules du jeu, hors outillage et tests. */
const modules = () => {
  const trouves = [];
  const parcourir = (dossier) => {
    for (const entree of readdirSync(join(RACINE, dossier), {
      withFileTypes: true,
    })) {
      const chemin = dossier ? `${dossier}/${entree.name}` : entree.name;
      if (entree.isDirectory()) {
        if (
          [
            "tests",
            "tools",
            "assets",
            "docs",
            ".git",
            ".github",
            ".claude",
            ".agents",
            "tmp",
            "node_modules",
          ].includes(entree.name)
        )
          continue;
        parcourir(chemin);
      } else if (entree.name.endsWith(".js")) {
        trouves.push(chemin);
      }
    }
  };
  parcourir("");
  return trouves;
};

/** Graphe des imports relatifs, chemins normalises depuis la racine. */
const graphe = () => {
  const g = new Map();
  for (const fichier of modules()) {
    const source = readFileSync(join(RACINE, fichier), "utf8");
    const cibles = [...source.matchAll(/from\s+"(\.[^"]+)"/g)].map((m) =>
      relative(
        RACINE,
        resolve(dirname(join(RACINE, fichier)), m[1]),
      ).replaceAll("\\", "/"),
    );
    g.set(fichier, cibles);
  }
  return g;
};

/*
 * Couches du projet, et la seule regle qui compte.
 *
 * "Aucun cycle" serait une regle fausse ici. Le noyau de donnees est
 * intrinsequement recursif : un objet applique une affliction, l'affliction
 * est attenuee par les resistances, les resistances sortent des statistiques
 * effectives, qui dependent des objets equipes. La boucle est dans le domaine,
 * pas dans le code. De meme, une action utilisateur rafraichit l'interface qui
 * declenche les actions.
 *
 * Ce n'est pas cela qui posait probleme. Les trois cycles supprimes
 * traversaient les couches : des modules de DONNEES tiraient l'AFFICHAGE, donc
 * game.js, donc `window`. C'est cela qui rendait le moteur intestable et qui a
 * laisse passer les bugs de cette session.
 *
 * La regle est donc : un cycle reste du meme cote de la frontiere
 * donnees / runtime.
 */
const COUCHE_DONNEES = [
  "state.js",
  "item.js",
  "systems.js",
  "status-apply.js",
  "status.js",
  "rebirth.js",
  "constants.js",
  "biome.js",
  "biome-traits.js",
  "world-map.js",
  "crit.js",
  "ashes.js",
  "monster.js",
];

const coucheDe = (module) => {
  if (module.startsWith("shared/") || module.startsWith("items/"))
    return "donnees";
  return COUCHE_DONNEES.includes(module) ? "donnees" : "runtime";
};

/*
 * Un cycle est tolere tant qu'il ne mele pas les deux couches.
 *
 * Le runtime est legitimement recursif : le combat ecrit dans le journal,
 * l'interface declenche les actions, les actions rafraichissent l'interface.
 * Le noyau de donnees l'est aussi, pour les raisons dites plus haut.
 *
 * Ce qui doit rester impossible, c'est qu'un module de donnees participe a un
 * cycle avec le runtime : c'est exactement ce qui tirait game.js — et donc
 * `window` — dans ashes.js, item.js et les tables d'objets.
 */
const estTolere = (cycle) => new Set(cycle.map(coucheDe)).size === 1;

/** Renvoie le premier cycle trouve, ou null. */
const chercherCycle = (g) => {
  const etat = new Map();
  const pile = [];
  let cycle = null;

  const visiter = (noeud) => {
    if (cycle) return;
    etat.set(noeud, "en-cours");
    pile.push(noeud);
    for (const voisin of g.get(noeud) || []) {
      if (!g.has(voisin)) continue;
      if (etat.get(voisin) === "en-cours") {
        const trouve = pile.slice(pile.indexOf(voisin));
        if (!estTolere(trouve)) {
          cycle = [...trouve, voisin];
          return;
        }
        continue;
      }
      if (!etat.has(voisin)) visiter(voisin);
      if (cycle) return;
    }
    pile.pop();
    etat.set(noeud, "fini");
  };

  for (const noeud of g.keys()) if (!etat.has(noeud)) visiter(noeud);
  return cycle;
};

test("aucun nouveau cycle d'imports entre modules du jeu", () => {
  const cycle = chercherCycle(graphe());
  assert.equal(
    cycle,
    null,
    cycle
      ? `cycle : ${cycle.join(" -> ")}. Un cycle ne doit pas meler donnees et runtime : voir COUCHE_DONNEES ci-dessus.`
      : "",
  );
});

test("les modules de donnees ne dependent pas de l'affichage", () => {
  // Une table d'objets ou de cendres n'a aucune raison de connaitre le DOM.
  // C'est ce couplage qui rendait ashes.js et item.js intestables.
  const g = graphe();
  const affichage = new Set(["ui.js", "game.js", "combat.js", "core.js"]);
  const donnees = [
    "ashes.js",
    "item.js",
    "biome.js",
    "constants.js",
    "monster.js",
    "world-map.js",
    "shared/player-profile.js",
    ...modules().filter((m) => m.startsWith("items/")),
  ];

  for (const module of donnees) {
    for (const cible of g.get(module) || []) {
      assert.ok(
        !affichage.has(cible),
        `${module} importe ${cible} : un module de donnees ne doit pas tirer l'affichage`,
      );
    }
  }
});

test("shared/ ne depend de rien", () => {
  const g = graphe();
  for (const [module, cibles] of g) {
    if (!module.startsWith("shared/")) continue;
    assert.deepEqual(
      cibles.filter((c) => !c.startsWith("shared/")),
      [],
      `${module} doit rester autonome : la normalisation de sauvegarde est appelee avant tout le reste`,
    );
  }
});
