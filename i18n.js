// Choix de langue : francais ou anglais.
//
// PRINCIPE — les fichiers de donnees SONT la version francaise. Il n'existe
// donc pas de catalogue francais a l'execution : le francais, c'est ne rien
// faire. Seul l'anglais est une surcouche, appliquee sur les tables au
// demarrage.
//
// Ce choix evite de dupliquer 39 000 signes deja presents dans le code, et
// garantit qu'une chaine francaise ne peut pas se desynchroniser d'elle-meme.
//
// POURQUOI ON RECHARGE LA PAGE — le nom d'un objet est lu a 113 endroits, et
// plusieurs vues sont construites une seule fois au chargement. Rejouer tout
// le rendu a chaud demanderait de tracer chaque point d'affichage ; recharger
// est immediat, sans angle mort, et le joueur ne change pas de langue toutes
// les cinq minutes.
//
// OU EST STOCKE LE CHOIX — dans localStorage, sous sa propre cle, PAS dans la
// sauvegarde. Il faut connaitre la langue avant de charger la partie, et une
// preference d'affichage n'a rien a faire dans un etat de jeu qui se remet a
// zero a chaque renaissance.

import { ITEMS } from "./item.js";
import { MONSTERS } from "./monster.js";
import { BIOMES } from "./biome.js";
import { ASHES_OF_WAR } from "./ashes.js";
import { BLESSINGS, PREP_CONSUMABLES, EVENT_DEFS } from "./systems.js";
import { BIOME_TRAITS } from "./biome-traits.js";
import { TRIALS, REBIRTH_NODES } from "./rebirth.js";
import { gameState } from "./state.js";
import { EN, EN_UI } from "./locales/en.js";

const CLE_STOCKAGE = "eldenchill.locale";

/** Langues proposees, dans l'ordre d'affichage. */
export const LANGUES = {
  fr: "Français",
  en: "English",
};

export const LANGUE_PAR_DEFAUT = "fr";

export const getLocale = () => {
  try {
    const valeur = localStorage.getItem(CLE_STOCKAGE);
    return LANGUES[valeur] ? valeur : LANGUE_PAR_DEFAUT;
  } catch {
    // Navigation privee, stockage refuse : on retombe sur le francais plutot
    // que de laisser une exception casser le demarrage.
    return LANGUE_PAR_DEFAUT;
  }
};

/**
 * Change la langue et recharge.
 *
 * La sauvegarde est ecrite par le gestionnaire beforeunload : rien n'est perdu.
 */
export const setLocale = (langue) => {
  if (!LANGUES[langue] || langue === getLocale()) return;
  try {
    localStorage.setItem(CLE_STOCKAGE, langue);
  } catch {
    return;
  }
  window.location.reload();
};

/*
 * Prefixe de cle -> table de donnees.
 *
 * Les cles du catalogue ont la forme `prefixe.identifiant.champ`, par exemple
 * `item.iron_sword.name`. Elles sont produites par tools/extract-strings.mjs,
 * jamais ecrites a la main.
 */
const TABLES = {
  item: ITEMS,
  monster: MONSTERS,
  biome: BIOMES,
  ash: ASHES_OF_WAR,
  blessing: BLESSINGS,
  consumable: PREP_CONSUMABLES,
  event: EVENT_DEFS,
  trait: BIOME_TRAITS,
  // Ces deux-la sont des tableaux : on les indexe par identifiant pour que la
  // meme forme de cle fonctionne partout.
  trial: Object.fromEntries((TRIALS || []).map((t) => [t.id, t])),
  rebirth: Object.fromEntries((REBIRTH_NODES || []).map((n) => [n.id, n])),
};

/** Nombre d'entrees appliquees, pour le diagnostic. */
let appliquees = 0;
let orphelines = [];

/**
 * Ecrase les champs textuels des tables avec la traduction.
 *
 * On mute les objets de donnees plutot que d'ajouter un accesseur partout :
 * `.name` est lu a 113 endroits, et une resolution en amont laisse ces 113
 * sites inchanges. Le retour au francais passe par un rechargement, donc
 * aucune copie du francais n'a besoin d'etre conservee en memoire.
 */
const appliquerCatalogue = (catalogue) => {
  appliquees = 0;
  orphelines = [];

  for (const [cle, valeur] of Object.entries(catalogue)) {
    const premier = cle.indexOf(".");
    const dernier = cle.lastIndexOf(".");
    if (premier <= 0 || dernier <= premier) continue;

    const prefixe = cle.slice(0, premier);
    const id = cle.slice(premier + 1, dernier);
    const champ = cle.slice(dernier + 1);

    const table = TABLES[prefixe];
    if (!table) continue; // cles d'interface, traitees ailleurs
    const entree = table[id];
    if (!entree) {
      orphelines.push(cle);
      continue;
    }
    entree[champ] = valeur;
    appliquees += 1;
  }
};

/*
 * Le nom des objets est RECOPIE dans la sauvegarde.
 *
 * core.js et game.js ecrivent `name: itemTemplate.name` en ramassant un objet.
 * Une partie commencee en francais garde donc des noms francais meme apres
 * bascule. On les rafraichit depuis le modele, une fois, au demarrage.
 *
 * On ne touche pas aux objets dont l'identifiant est inconnu : mieux vaut un
 * nom perime qu'une ligne vide.
 */
export const rafraichirNomsSauvegardes = () => {
  let corriges = 0;
  for (const entree of gameState.inventory || []) {
    const modele = ITEMS[entree?.id];
    if (modele?.name && entree.name !== modele.name) {
      entree.name = modele.name;
      corriges += 1;
    }
  }
  return corriges;
};

/*
 * Interface : on remplace par APPARIEMENT DU TEXTE, pas par position.
 *
 * Les cles du HTML sont positionnelles (ui.html.42) parce qu'un libelle n'a pas
 * d'identifiant naturel. S'en servir a l'execution serait fragile : deplacer un
 * bloc dans index.html decalerait toutes les cles suivantes et traduirait les
 * boutons les uns par les autres, sans la moindre erreur visible.
 *
 * On construit donc une table francais -> anglais et on remplace les noeuds de
 * texte dont le contenu correspond exactement. Un libelle non traduit reste en
 * francais, ce qui est le bon comportement de repli.
 *
 * Deux libelles francais identiques donnent la meme traduction : c'est voulu,
 * et c'est le cas de "Vide", "Options" ou "Butin", repetes dans plusieurs
 * ecrans.
 */
/**
 * Traduit les libelles statiques d'index.html.
 *
 * @param {Record<string,string>} paires francais -> anglais
 */
export const traduireInterface = (paires) => {
  if (!paires || !Object.keys(paires).length) return 0;
  let remplaces = 0;

  // Noeuds de texte : on ne descend pas dans les balises de script et de style.
  const parcours = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (noeud) => {
        const parent = noeud.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const balise = parent.tagName;
        if (balise === "SCRIPT" || balise === "STYLE") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const aTraiter = [];
  while (parcours.nextNode()) aTraiter.push(parcours.currentNode);
  for (const noeud of aTraiter) {
    const texte = noeud.nodeValue.trim();
    const traduction = paires[texte];
    if (!traduction) continue;
    // On preserve les espaces qui entourent le texte dans le HTML.
    noeud.nodeValue = noeud.nodeValue.replace(texte, traduction);
    remplaces += 1;
  }

  // Attributs visibles.
  for (const attribut of ["title", "aria-label", "placeholder"]) {
    for (const element of document.querySelectorAll(`[${attribut}]`)) {
      const traduction = paires[element.getAttribute(attribut).trim()];
      if (!traduction) continue;
      element.setAttribute(attribut, traduction);
      remplaces += 1;
    }
  }

  return remplaces;
};

/**
 * Applique la langue choisie. A appeler AVANT tout rendu.
 *
 * @returns {{ langue: string, appliquees: number, orphelines: string[] }}
 */
export const applyLocale = () => {
  const langue = getLocale();
  if (langue !== "fr") {
    appliquerCatalogue(EN);
    traduireInterface(EN_UI);
  }
  return { langue, appliquees, orphelines };
};
