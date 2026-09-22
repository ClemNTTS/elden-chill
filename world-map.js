import { BIOMES } from "./biome.js";
import {
  LEVEL_CAP_BASE,
  LEVEL_PER_MAIN_BOSS,
  MAIN_BOSS_BIOMES,
} from "./rebirth.js";
import { MAX_LEVEL } from "./shared/player-profile.js";

/*
 * Part du plafond que la bande recommandee garantit.
 *
 * Meme valeur que PART_DU_PLAFOND dans tests/plafond-progression.test.mjs : le
 * test exige qu'un boss soit battable a 80% du plafond, la bande annonce donc
 * ce meme 80%. Promesse et verification disent la meme chose.
 */
const PART_GARANTIE = 0.8;

export const BIOME_GUIDE = {
  limgrave_west: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    danger: "Faible",
    focus: "Prise en main, premiers builds, survie simple.",
    pathRole: "Point de depart",
  },
  limgrave_east: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    danger: "Modere",
    focus: "Premiers duels solides, montee dex/bleed.",
    pathRole: "Route agressive",
  },
  limgrave_north: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    danger: "Modere",
    focus: "Verrou de progression vers le premier grand chateau.",
    pathRole: "Route principale",
  },
  limgrave_lake: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    danger: "Modere",
    focus: "Option feu/intelligence et dragon precoce.",
    pathRole: "Detour optionnel",
  },
  weeping_peninsula: {
    chapter: "Chapitre II",
    region: "Sud",
    danger: "Modere",
    focus: "Transition vers le tier 3, debut des builds givre.",
    pathRole: "Branche sud",
  },
  morne_castle: {
    chapter: "Chapitre II",
    region: "Sud",
    danger: "Eleve",
    focus: "Test force/bleed, gain d'armes lourdes.",
    pathRole: "Cul-de-sac rentable",
  },
  enter_stormwind_castle: {
    chapter: "Chapitre II",
    region: "Voile Orage",
    danger: "Eleve",
    focus: "Porte de Stormveil, combat plus technique.",
    pathRole: "Route principale",
  },
  stormwind_castle: {
    chapter: "Chapitre II",
    region: "Voile Orage",
    danger: "Eleve",
    focus: "Premier gros check d'endurance et d'armure.",
    pathRole: "Boss gate majeur",
  },
  caelid_west: {
    chapter: "Chapitre II",
    region: "Caelid",
    danger: "Eleve",
    focus: "Zone risk/reward, statuts et armures denses.",
    pathRole: "Detour risqué",
  },
  liurnia_south: {
    chapter: "Chapitre III",
    region: "Liurnia",
    danger: "Eleve",
    focus: "Ouverture caster et multi-builds de midgame.",
    pathRole: "Route principale",
  },
  liurnia_west: {
    chapter: "Chapitre III",
    region: "Liurnia",
    danger: "Eleve",
    focus: "Route carienne, tank/mage hybride.",
    pathRole: "Branche ouest",
  },
  liurnia_east: {
    chapter: "Chapitre III",
    region: "Liurnia",
    danger: "Eleve",
    focus: "Route marais, vigueur et penetration.",
    pathRole: "Branche est",
  },
  liurnia_marsh: {
    chapter: "Chapitre III",
    region: "Liurnia",
    danger: "Tres eleve",
    focus: "Dragon optionnel tres rentable pour les mages.",
    pathRole: "Boss optionnel",
  },
  raya_lucaria_academy: {
    chapter: "Chapitre III",
    region: "Liurnia",
    danger: "Tres eleve",
    focus: "Pivot midgame, sets academie et crystal.",
    pathRole: "Route principale",
  },
  caria_mansion: {
    chapter: "Chapitre IV",
    region: "Nord des lacs",
    danger: "Tres eleve",
    focus: "Monte en puissance controle/givre.",
    pathRole: "Branche ouest",
  },
  caelid_south: {
    chapter: "Chapitre IV",
    region: "Caelid",
    danger: "Tres eleve",
    focus: "Endurance sous pression et packs brutaux.",
    pathRole: "Route alternative",
  },
  caelid_dragonbarrow: {
    chapter: "Chapitre IV",
    region: "Caelid",
    danger: "Tres eleve",
    focus: "Dragon optionnel et loot corruption.",
    pathRole: "Boss optionnel",
  },
  siofra_river: {
    chapter: "Chapitre IV",
    region: "Souterrain",
    danger: "Tres eleve",
    focus: "Route controle/stun et sustain.",
    pathRole: "Branche souterraine",
  },
  redmane_castle: {
    chapter: "Chapitre IV",
    region: "Caelid",
    danger: "Tres eleve",
    focus: "Grand mur de puissance physique.",
    pathRole: "Route principale bis",
  },
  nokron: {
    chapter: "Chapitre V",
    region: "Souterrain",
    danger: "Tres eleve",
    focus: "Pivot late midgame, builds polymorphes.",
    pathRole: "Noeud de bascule",
  },
  ainsel_river: {
    chapter: "Chapitre V",
    region: "Souterrain",
    danger: "Tres eleve",
    focus: "Nouvelle route astrale dex/int a haut tempo.",
    pathRole: "Nouvelle branche v2",
  },
  deeproot_depths: {
    chapter: "Chapitre V",
    region: "Souterrain",
    danger: "Tres eleve",
    focus: "Tank/sustain et armures vivantes.",
    pathRole: "Nouvelle branche v2",
  },
  rotlake: {
    chapter: "Chapitre VI",
    region: "Souterrain",
    danger: "Extrem",
    focus: "Endgame optionnel axe statuts et survie active.",
    pathRole: "Detour v2 endgame",
  },
  altus_plateau: {
    chapter: "Chapitre VI",
    region: "Altus",
    danger: "Extrem",
    focus: "Frontiere du late game terrestre.",
    pathRole: "Route principale",
    hazards: ["folie"],
  },
  mount_gelmir: {
    chapter: "Chapitre VII",
    region: "Gelmir",
    danger: "Extrem",
    focus: "Volcan, venins et predateurs draconiques en crescendo.",
    pathRole: "Route principale",
    hazards: ["poison", "putrefaction"],
  },
  mountaintops: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    danger: "Extrem",
    focus: "Glace, posture et geants. Un mur de lecture et de tempo.",
    pathRole: "Route principale",
    hazards: ["gel", "folie"],
  },
  crumbling_farum_azula: {
    chapter: "Chapitre IX",
    region: "Azula",
    danger: "Abyssal",
    focus: "Ruines suspendues, tempetes sacrileges et reliques noires.",
    pathRole: "Fin de route terrestre",
    hazards: ["folie", "putrefaction"],
  },
  // --- Fin de parcours ---------------------------------------------
  // Ces biomes existaient dans biome.js sans entree ici. Sans coordonnees, ils
  // basculaient sur la disposition automatique, qui vit dans un tout autre
  // repere (depth * 240 contre x * 18) : ils atterrissaient a des centaines de
  // pixels des autres et faisaient exploser le cadrage de la carte.
  //
  // Tous ont desormais un contenu jouable. Les deux souches vides qui
  // restaient dans biome.js (Leyndell_ash, erdTree) ont ete remplacees par les
  // vrais biomes leyndell_ash et erdtree_throne du chapitre X.
  leyndell_royal: {
    chapter: "Chapitre VIII",
    region: "Leyndell",
    danger: "Extreme",
    focus: "Capitale doree, gardes royaux et longues avenues.",
    pathRole: "Route royale",
  },
  forbidden_land: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    danger: "Extreme",
    focus: "Col battu par les vents avant les sommets.",
    pathRole: "Passage vers les Cimes",
  },
  consecrated_snowfield: {
    chapter: "Chapitre IX",
    region: "Cimes",
    danger: "Extreme",
    focus: "Plaine blanche ou l'on ne voit pas a dix pas.",
    pathRole: "Route cachee",
  },
  mohgwyn_palace: {
    chapter: "Chapitre IX",
    region: "Souterrain",
    danger: "Abyssal",
    focus: "Lac de sang sous une lune rouge.",
    pathRole: "Detour sanglant",
  },
  miquella_haligtree: {
    chapter: "Chapitre IX",
    region: "Arbre Sacre",
    danger: "Abyssal",
    focus: "Ramures suspendues et gardiens putrides.",
    pathRole: "Voie alternative vers Azula",
  },
  /* --- Version complete : chapitres VI a X et zones annexes ------- */

  dominula_village: {
    chapter: "Chapitre VI",
    region: "Altus",
    danger: "Eleve",
    focus:
      "Un village en fete. Les tambours accelerent et ne s'arretent jamais.",
    pathRole: "Detour d'Altus",
    hazards: ["folie"],
  },
  shaded_castle: {
    chapter: "Chapitre VI",
    region: "Altus",
    danger: "Eleve",
    focus: "Un chateau noye dans une brume qui ronge les poumons.",
    pathRole: "Route vers Gelmir",
    hazards: ["poison"],
  },
  volcano_manor: {
    chapter: "Chapitre VII",
    region: "Gelmir",
    danger: "Tres eleve",
    focus: "On y signe des contrats. On y paie bien, on n'y soigne personne.",
    pathRole: "Coeur du Mont Gelmir",
    hazards: ["folie"],
  },
  rykard_lair: {
    chapter: "Chapitre VII",
    region: "Gelmir",
    danger: "Tres eleve",
    focus: "Une fosse de magma et ce qui reste d'un dieu dedans.",
    pathRole: "Fin du Mont Gelmir",
    hazards: ["folie"],
  },
  divine_tower: {
    chapter: "Chapitre VIII",
    region: "Leyndell",
    danger: "Extreme",
    focus: "La Tour coupe le lien a la Grace. Aucun soin ne fonctionne dedans.",
    pathRole: "Detour de Leyndell",
    hazards: ["folie"],
  },
  castle_sol: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    danger: "Extreme",
    focus: "Une nuit qui ne finit pas. On ne voit pas venir les coups.",
    pathRole: "Route du nord",
    hazards: ["gel"],
  },
  giants_catacombs: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    danger: "Extreme",
    focus: "Des braises qui couvent depuis la guerre des Geants.",
    pathRole: "Avant les Cimes",
    hazards: ["gel", "folie"],
  },
  elphael: {
    chapter: "Chapitre IX",
    region: "Arbre Sacre",
    danger: "Abyssal",
    focus: "Les spores tombent en continu. Elle vous attend au bout.",
    pathRole: "Coeur de l'Arbre Sacre",
    hazards: ["putrefaction"],
  },
  farum_azula_deep: {
    chapter: "Chapitre IX",
    region: "Farum Azula",
    danger: "Abyssal",
    focus: "Sous les ruines, une tempete qui dure depuis avant l'Arbre.",
    pathRole: "Vers le chapitre X",
    hazards: ["folie"],
  },
  leyndell_ash: {
    chapter: "Chapitre X",
    region: "Leyndell",
    danger: "Abyssal",
    focus: "La capitale ensevelie sous la cendre. Elle ronge les armures.",
    pathRole: "Avant-derniere etape",
    hazards: ["putrefaction", "folie"],
  },
  erdtree_throne: {
    chapter: "Chapitre X",
    region: "Arbre-Monde",
    danger: "Abyssal",
    focus: "Le terme de la route. On n'en repart pas en arriere.",
    pathRole: "Terminus",
    hazards: ["folie"],
  },
  bestial_sanctum: {
    chapter: "Annexe",
    region: "Tertre Draconique",
    danger: "Eleve",
    focus:
      "Gurranq echange des racines de mort contre du butin. Aucune elite ici.",
    pathRole: "Zone de recolte",
    hazards: [],
  },
  jarburg: {
    chapter: "Annexe",
    region: "Liurnia",
    danger: "Faible",
    focus: "Des jarres creuses et pleines de runes. Elles se brisent vite.",
    pathRole: "Zone de runes",
    hazards: [],
  },
  evergaol_champions: {
    chapter: "Annexe",
    region: "Enclos",
    danger: "Abyssal",
    focus: "Quatre champions a la suite, sans repos et sans soin.",
    pathRole: "Defi de fin de partie",
    hazards: ["folie"],
  },
};

export const BIOME_ORDER = Object.keys(BIOME_GUIDE);

export function getBiomeGraphDepth(biomeId, seen = new Map()) {
  if (seen.has(biomeId)) return seen.get(biomeId);
  const biome = BIOMES[biomeId];
  if (!biome) return 0;

  let parents = 0;
  Object.entries(BIOMES).forEach(([candidateId, candidate]) => {
    if ((candidate.unlocks || []).includes(biomeId)) {
      parents = Math.max(parents, getBiomeGraphDepth(candidateId, seen) + 1);
    }
  });

  seen.set(biomeId, parents);
  return parents;
}

export function getBiomePowerBand(biomeId) {
  if (!BIOME_GUIDE[biomeId]) return "Inconnu";
  const [bas, haut] = getBandeRecommandee(biomeId);
  return `Niv. ${bas}-${haut}`;
}

export function getBiomeDangerClass(biomeId) {
  const danger = BIOME_GUIDE[biomeId]?.danger || "";
  return danger
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");
}

/* ------------------------------------------------------------------ */
/* Danger relatif au personnage                                       */
/* ------------------------------------------------------------------ */

/*
 * Le champ `danger` de chaque biome est FIXE : « Extrem » le reste que l'on
 * arrive au niveau recommande ou soixante niveaux au-dessus. C'est faux dans
 * les deux sens — une zone finit par devenir une promenade, et une zone
 * abordee trop tot est bien pire que son etiquette ne le dit.
 *
 * Le danger se lit donc a partir de l'ecart entre le niveau du joueur et le
 * BAS de la bande recommandee, rapporte a un pas proportionnel a ce bas :
 *
 *   t = (niveau - bas) / max(8, bas * 0,15)
 *
 * Normaliser par la LARGEUR de la bande, comme dans une premiere version,
 * paraissait plus naturel et donnait n'importe quoi : les bandes vont de six
 * niveaux (Trone d'Elden, 214-220) a quarante (Plateau d'Altus, 160-200). Le
 * Trone passait de « Suicidaire » a « Promenade » en seize niveaux, sans
 * jamais afficher les crans du milieu.
 *
 * Un pas de 15% du niveau de la zone donne la meme progression partout :
 * quinze niveaux comptent au debut de la partie, cinquante comptent a la fin.
 *
 * DEUX LIMITES CONNUES.
 *
 * Le niveau n'est pas la puissance : l'equipement pese lourd, mais
 * `recommendedLevel` est exprime en niveaux et un joueur raisonne en niveaux.
 * Approximation assumee.
 *
 * Surtout, la lecture ne vaut que ce que valent les bandes, et les bandes sont
 * PERIMEES : elles datent d'avant le reequilibrage des monstres et des boss.
 * Sur trois zones jouees au niveau 185 — Manoir du Volcan traverse a 95% de
 * ses points de vie, Antre de Rykard a 48%, mort a Leyndell Cite Royale — les
 * bandes actuelles annoncent « Dangereux » pour les trois.
 *
 * `node tools/banc-boss.mjs --ecrire-bandes` les regenere, et le resultat
 * separe enfin ces zones. Mais les bandes alimentent aussi le choix du palier
 * d'equipement et le niveau de mesure des zones annexes : les regenerer deplace
 * toute la calibration d'equilibrage et fait tomber six tests. C'est une passe
 * a part entiere, a mener avec ses propres releves, pas un effet de bord d'un
 * travail sur la carte.
 */
export const PALIERS_DANGER = [
  { seuil: Number.NEGATIVE_INFINITY, cle: "suicidaire", libelle: "Suicidaire" },
  { seuil: -0.5, cle: "mortel", libelle: "Mortel" },
  { seuil: 0, cle: "dangereux", libelle: "Dangereux" },
  { seuil: 1, cle: "mesure", libelle: "Mesure" },
  { seuil: 2, cle: "promenade", libelle: "Promenade" },
];

/**
 * Danger d'un biome pour un personnage donne.
 *
 * Renvoie le libelle, une cle utilisable en classe CSS, et la position `t` sur
 * l'axe — utile pour nuancer une couleur sans redecouper les paliers.
 */
export function getDangerRelatif(biomeId, niveauJoueur = 0) {
  if (!BIOME_GUIDE[biomeId]) {
    return { libelle: "Inconnu", cle: "inconnu", t: 0 };
  }

  const [bas] = getBandeRecommandee(biomeId);
  const pas = Math.max(8, bas * 0.15);
  const t = (Math.max(0, niveauJoueur) - bas) / pas;

  let palier = PALIERS_DANGER[0];
  for (const candidat of PALIERS_DANGER) {
    if (t >= candidat.seuil) palier = candidat;
  }
  return { libelle: palier.libelle, cle: palier.cle, t };
}

/* ------------------------------------------------------------------ */
/* Placement de la carte                                              */
/* ------------------------------------------------------------------ */

/*
 * Les positions etaient saisies a la main, deux nombres par biome, quarante-six
 * biomes. Resultat mesure : vingt croisements d'aretes, et une carte que son
 * auteur decrivait comme « un peu le bordel ».
 *
 * Elles sont desormais CALCULEES. Le rang d'une zone est la longueur du plus
 * long chemin qui y mene (getBiomeGraphDepth) : c'est l'assignation de rang de
 * Sugiyama, et elle garantit qu'aucune arete ne revient en arriere. L'ordre
 * vertical a l'interieur d'une colonne est ensuite affine par barycentre —
 * chaque noeud glisse vers la moyenne de ses voisins, quelques passes dans un
 * sens puis dans l'autre.
 *
 * Mesure sur le graphe reel, 46 noeuds et 50 aretes :
 *
 *   coordonnees saisies a la main             20 croisements
 *   colonnes par chapitre                     29   (les annexes traversent tout)
 *   colonnes par niveau recommande            15   (38 colonnes, illisible)
 *   rang par plus long chemin, etale           3   (ruban de 6700 x 450)
 *   le meme, replie en serpentin               8   (2400 x 1190, rapport 2:1)
 *
 * Le repliage coute cinq croisements et rend la carte affichable : etalee, la
 * chaine de vingt-six rangs donne un ruban que le cadre reduit a un trait. Le
 * compromis est assume — huit croisements sur une carte qu'on lit valent mieux
 * que trois sur une carte qu'on ne lit pas.
 */
const PASSES_BARYCENTRE = 12;

/*
 * Rangs par bande avant repliage.
 *
 * Neuf donne trois bandes pour les vingt-six rangs, soit une carte de neuf
 * colonnes sur trois etages — un rapport proche du cadre, qui est deux fois
 * plus large que haut. Sept produisait un portrait, vingt-six un ruban.
 */
const RANGS_PAR_BANDE = 9;

export function calculerPositionsCarte(biomeIds) {
  const ids = biomeIds.filter((id) => BIOME_GUIDE[id]);
  const memo = new Map();
  const colonnes = new Map();

  for (const id of ids) {
    const rang = getBiomeGraphDepth(id, memo);
    if (!colonnes.has(rang)) colonnes.set(rang, []);
    colonnes.get(rang).push(id);
  }

  // Voisinage non oriente : un noeud se place entre ses parents ET ses enfants.
  const voisins = new Map();
  const relier = (a, b) => {
    if (!voisins.has(a)) voisins.set(a, []);
    voisins.get(a).push(b);
  };
  const presents = new Set(ids);
  for (const id of ids) {
    for (const suivant of BIOMES[id]?.unlocks || []) {
      if (!presents.has(suivant)) continue;
      relier(id, suivant);
      relier(suivant, id);
    }
  }

  const y = new Map();
  for (const [, liste] of colonnes) liste.forEach((id, i) => y.set(id, i));

  for (let passe = 0; passe < PASSES_BARYCENTRE; passe += 1) {
    const ordre = [...colonnes.keys()].sort((a, b) =>
      passe % 2 ? b - a : a - b,
    );
    for (const rang of ordre) {
      const liste = colonnes.get(rang);
      const bary = new Map();
      for (const id of liste) {
        const v = (voisins.get(id) || []).filter((x) => y.has(x));
        bary.set(
          id,
          v.length ? v.reduce((s, x) => s + y.get(x), 0) / v.length : y.get(id),
        );
      }
      liste.sort((a, b) => bary.get(a) - bary.get(b));
      liste.forEach((id, i) => y.set(id, i));
    }
  }

  /*
   * Repliage en serpentin.
   *
   * Le graphe compte vingt-six rangs, dont une longue queue d'un seul noeud :
   * la fin du jeu est une chaine droite. Etale d'un bloc, cela donne un ruban
   * de 6700 pixels de large sur 4 de haut, illisible dans un cadre deux fois
   * plus large que haut.
   *
   * Les rangs sont donc replies par bandes, une bande lue de gauche a droite
   * puis la suivante de droite a gauche. Deux rangs consecutifs restent
   * voisins, y compris au changement de bande — c'est tout l'interet du
   * serpentin par rapport a un simple retour a la ligne, qui ferait traverser
   * toute la largeur a l'arete de jonction.
   */
  const rangs = [...colonnes.keys()].sort((a, b) => a - b);
  const hauteurMax = Math.max(1, ...rangs.map((r) => colonnes.get(r).length));

  const positions = new Map();
  rangs.forEach((rang, index) => {
    const bande = Math.floor(index / RANGS_PAR_BANDE);
    const dansBande = index % RANGS_PAR_BANDE;
    // Une bande sur deux se lit a l'envers : le serpentin.
    const colonne =
      bande % 2 === 0 ? dansBande : RANGS_PAR_BANDE - 1 - dansBande;

    const liste = colonnes.get(rang);
    // Colonne centree : une colonne de deux noeuds ne doit pas pendre sous une
    // colonne de quatre.
    const decalage = (liste.length - 1) / 2;
    liste.forEach((id, i) =>
      positions.set(id, {
        rang,
        bande,
        colonne,
        offset: i - decalage,
        x: colonne,
        y: bande * (hauteurMax + 1.6) + (i - decalage),
      }),
    );
  });

  /*
   * Second tri par barycentre, APRES le repliage.
   *
   * Le premier tri optimisait une carte etalee ; le serpentin rapproche
   * ensuite des rangs que tout separait, et recree des croisements — neuf au
   * lieu de trois. On rejoue donc quelques passes sur les ordonnees FINALES,
   * celles qui portent le decalage de bande.
   */
  for (let passe = 0; passe < PASSES_BARYCENTRE; passe += 1) {
    const ordre = [...rangs].sort((a, b) => (passe % 2 ? b - a : a - b));
    for (const rang of ordre) {
      const liste = colonnes.get(rang);
      if (liste.length < 2) continue;
      const base = positions.get(liste[0]);
      const bary = new Map();
      for (const id of liste) {
        const v = (voisins.get(id) || []).filter((x) => positions.has(x));
        bary.set(
          id,
          v.length
            ? v.reduce((s, x) => s + positions.get(x).y, 0) / v.length
            : positions.get(id).y,
        );
      }
      liste.sort((a, b) => bary.get(a) - bary.get(b));
      const decalage = (liste.length - 1) / 2;
      liste.forEach((id, i) => {
        const place = positions.get(id);
        place.offset = i - decalage;
        place.y = base.bande * (hauteurMax + 1.6) + place.offset;
      });
    }
  }

  return positions;
}

/* ------------------------------------------------------------------ */
/* Bande de niveau recommandee                                        */
/* ------------------------------------------------------------------ */

/*
 * La bande n'est plus ECRITE, elle se DEDUIT.
 *
 * Elle etait stockee sur chaque biome, generee par un outil qui la mesurait...
 * avec un equipement choisi d'apres la bande. Le systeme se definissait
 * lui-meme : impossible a verifier, impossible a corriger sans tout deplacer,
 * et perime des qu'on touchait a un monstre. Apres le reequilibrage de cette
 * session, trois zones jouees au niveau 185 — l'une traversee a 95% des points
 * de vie, l'autre a 48%, la troisieme mortelle — annoncaient toutes la meme
 * bande.
 *
 * Deux ancres, et aucune n'est une mesure :
 *
 *   TRAME PRINCIPALE — le plafond de niveau. `LEVEL_CAP_BASE + 20 par boss`
 *   est la seule grandeur du systeme qui soit une DECISION. La bande devient
 *   [80% du plafond, plafond] : elle dit au joueur ce que le jeu lui garantit
 *   a cette etape, et c'est exactement ce que le garde-fou de progression
 *   exige par ailleurs. La bande et le test disent desormais la meme chose, ils
 *   ne peuvent plus diverger.
 *
 *   ZONES ANNEXES — le graphe de deblocage. Une zone facultative se visite
 *   juste apres celle qui l'ouvre : elle herite de sa bande. Structurel, pas
 *   mesure.
 *
 * La mesure, elle, cesse d'ecrire et devient un audit : tools/banc-boss.mjs
 * compare la difficulte reelle a la bande deduite, et les tests de budget
 * verifient que le contenu tient la promesse. La mesure verifie la conception,
 * elle ne la redige plus.
 */
/*
 * Zones dont la place dans le graphe ment sur leur difficulte.
 *
 * Le Tertre Draconique s'ouvre a trois sauts du depart par la branche de
 * Caelid, mais c'est un « boss optionnel » concu pour le milieu de partie :
 * la deduction lui donnait le niveau 68, pour un contenu qui en demande plus
 * du double. Aucun facteur ne rattrapait l'ecart — son boss restait invincible
 * jusqu'a x0,30.
 *
 * L'exception est declaree ici, avec sa raison, plutot que d'etre noyee dans
 * une regle plus compliquee. Une carte a le droit d'avoir des raccourcis
 * traitres ; elle doit juste le dire.
 */
const CHAPITRE_IMPOSE = {
  // Le dragon de Caelid : accessible tot, calibre pour bien plus tard.
  caelid_dragonbarrow: 6,
};

const bandesMemo = new Map();

const construireBandes = () => {
  if (bandesMemo.size) return bandesMemo;

  // Ancre 1 : la trame principale suit le plafond, etape par etape.
  MAIN_BOSS_BIOMES.forEach((id, index) => {
    const plafond = Math.min(
      MAX_LEVEL,
      LEVEL_CAP_BASE + LEVEL_PER_MAIN_BOSS * index,
    );
    bandesMemo.set(id, [Math.floor(plafond * PART_GARANTIE), plafond]);
  });

  // Ancre 2 : une annexe herite du biome qui l'ouvre. On les parcourt par
  // profondeur croissante pour qu'un parent soit toujours resolu avant son
  // enfant.
  const parents = new Map();
  for (const [id, biome] of Object.entries(BIOMES)) {
    for (const suivant of biome.unlocks || []) {
      if (!parents.has(suivant)) parents.set(suivant, []);
      parents.get(suivant).push(id);
    }
  }
  const memo = new Map();
  const restants = Object.keys(BIOME_GUIDE)
    .filter((id) => !bandesMemo.has(id))
    .sort((a, b) => getBiomeGraphDepth(a, memo) - getBiomeGraphDepth(b, memo));

  for (const id of restants) {
    const impose = CHAPITRE_IMPOSE[id];
    if (impose !== undefined) {
      const plafond = Math.min(
        MAX_LEVEL,
        LEVEL_CAP_BASE + LEVEL_PER_MAIN_BOSS * impose,
      );
      bandesMemo.set(id, [Math.floor(plafond * PART_GARANTIE), plafond]);
      continue;
    }
    const resolus = (parents.get(id) || []).filter((p) => bandesMemo.has(p));
    if (resolus.length === 0) {
      // Aucun parent connu : c'est un point de depart.
      bandesMemo.set(id, [
        Math.floor(LEVEL_CAP_BASE * PART_GARANTIE),
        LEVEL_CAP_BASE,
      ]);
      continue;
    }
    // Plusieurs chemins y menent : on retient le plus tardif, celui par lequel
    // un joueur y arrivera en pratique s'il suit la trame.
    const tardif = resolus.reduce((a, b) =>
      bandesMemo.get(a)[0] >= bandesMemo.get(b)[0] ? a : b,
    );

    /*
     * Chaque saut AVANCE la bande.
     *
     * Heriter telle quelle de la bande du parent paraissait suffisant, et
     * donnait n'importe quoi sur les chaines annexes : le Sud de Caelid, a
     * trois sauts du depart, remontait jusqu'a Necrolimbe et se retrouvait
     * annonce au niveau 25 pour un contenu qui en demande 64. Une branche qui
     * s'eloigne doit monter comme la trame monte.
     *
     * Le pas est celui d'un boss principal, ramene a la part garantie : un
     * saut de graphe vaut a peu pres une etape de campagne.
     */
    const bonds = Math.max(
      1,
      getBiomeGraphDepth(id, memo) - getBiomeGraphDepth(tardif, memo),
    );
    const pas = Math.round(LEVEL_PER_MAIN_BOSS * PART_GARANTIE) * bonds;
    const [bas, haut] = bandesMemo.get(tardif);
    bandesMemo.set(id, [
      Math.min(Math.floor(MAX_LEVEL * PART_GARANTIE), bas + pas),
      Math.min(MAX_LEVEL, haut + pas),
    ]);
  }

  return bandesMemo;
};

/** Bande de niveau recommandee pour ce biome, deduite et jamais stockee. */
export function getBandeRecommandee(biomeId) {
  return construireBandes().get(biomeId) || [1, LEVEL_CAP_BASE];
}
