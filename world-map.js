import { BIOMES } from "./biome.js";

export const BIOME_GUIDE = {
  limgrave_west: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    recommendedLevel: [6, 12],
    danger: "Faible",
    focus: "Prise en main, premiers builds, survie simple.",
    pathRole: "Point de depart",
  },
  limgrave_east: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    recommendedLevel: [15, 24],
    danger: "Modere",
    focus: "Premiers duels solides, montee dex/bleed.",
    pathRole: "Route agressive",
  },
  limgrave_north: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    recommendedLevel: [22, 29],
    danger: "Modere",
    focus: "Verrou de progression vers le premier grand chateau.",
    pathRole: "Route principale",
  },
  limgrave_lake: {
    chapter: "Chapitre I",
    region: "Necrolimbe",
    recommendedLevel: [29, 36],
    danger: "Modere",
    focus: "Option feu/intelligence et dragon precoce.",
    pathRole: "Detour optionnel",
  },
  weeping_peninsula: {
    chapter: "Chapitre II",
    region: "Sud",
    recommendedLevel: [27, 35],
    danger: "Modere",
    focus: "Transition vers le tier 3, debut des builds givre.",
    pathRole: "Branche sud",
  },
  morne_castle: {
    chapter: "Chapitre II",
    region: "Sud",
    recommendedLevel: [39, 57],
    danger: "Eleve",
    focus: "Test force/bleed, gain d'armes lourdes.",
    pathRole: "Cul-de-sac rentable",
  },
  enter_stormwind_castle: {
    chapter: "Chapitre II",
    region: "Voile Orage",
    recommendedLevel: [33, 46],
    danger: "Eleve",
    focus: "Porte de Stormveil, combat plus technique.",
    pathRole: "Route principale",
  },
  stormwind_castle: {
    chapter: "Chapitre II",
    region: "Voile Orage",
    recommendedLevel: [26, 36],
    danger: "Eleve",
    focus: "Premier gros check d'endurance et d'armure.",
    pathRole: "Boss gate majeur",
  },
  caelid_west: {
    chapter: "Chapitre II",
    region: "Caelid",
    recommendedLevel: [49, 68],
    danger: "Eleve",
    focus: "Zone risk/reward, statuts et armures denses.",
    pathRole: "Detour risqué",
  },
  liurnia_south: {
    chapter: "Chapitre III",
    region: "Liurnia",
    recommendedLevel: [45, 62],
    danger: "Eleve",
    focus: "Ouverture caster et multi-builds de midgame.",
    pathRole: "Route principale",
  },
  liurnia_west: {
    chapter: "Chapitre III",
    region: "Liurnia",
    recommendedLevel: [48, 65],
    danger: "Eleve",
    focus: "Route carienne, tank/mage hybride.",
    pathRole: "Branche ouest",
  },
  liurnia_east: {
    chapter: "Chapitre III",
    region: "Liurnia",
    recommendedLevel: [50, 67],
    danger: "Eleve",
    focus: "Route marais, vigueur et penetration.",
    pathRole: "Branche est",
  },
  liurnia_marsh: {
    chapter: "Chapitre III",
    region: "Liurnia",
    recommendedLevel: [50, 70],
    danger: "Tres eleve",
    focus: "Dragon optionnel tres rentable pour les mages.",
    pathRole: "Boss optionnel",
  },
  raya_lucaria_academy: {
    chapter: "Chapitre III",
    region: "Liurnia",
    recommendedLevel: [52, 70],
    danger: "Tres eleve",
    focus: "Pivot midgame, sets academie et crystal.",
    pathRole: "Route principale",
  },
  caria_mansion: {
    chapter: "Chapitre IV",
    region: "Nord des lacs",
    recommendedLevel: [90, 110],
    danger: "Tres eleve",
    focus: "Monte en puissance controle/givre.",
    pathRole: "Branche ouest",
  },
  caelid_south: {
    chapter: "Chapitre IV",
    region: "Caelid",
    recommendedLevel: [64, 84],
    danger: "Tres eleve",
    focus: "Endurance sous pression et packs brutaux.",
    pathRole: "Route alternative",
  },
  caelid_dragonbarrow: {
    chapter: "Chapitre IV",
    region: "Caelid",
    recommendedLevel: [120, 155],
    danger: "Tres eleve",
    focus: "Dragon optionnel et loot corruption.",
    pathRole: "Boss optionnel",
  },
  siofra_river: {
    chapter: "Chapitre IV",
    region: "Souterrain",
    recommendedLevel: [79, 103],
    danger: "Tres eleve",
    focus: "Route controle/stun et sustain.",
    pathRole: "Branche souterraine",
  },
  redmane_castle: {
    chapter: "Chapitre IV",
    region: "Caelid",
    recommendedLevel: [117, 150],
    danger: "Tres eleve",
    focus: "Grand mur de puissance physique.",
    pathRole: "Route principale bis",
  },
  nokron: {
    chapter: "Chapitre V",
    region: "Souterrain",
    recommendedLevel: [116, 150],
    danger: "Tres eleve",
    focus: "Pivot late midgame, builds polymorphes.",
    pathRole: "Noeud de bascule",
  },
  ainsel_river: {
    chapter: "Chapitre V",
    region: "Souterrain",
    recommendedLevel: [155, 194],
    danger: "Tres eleve",
    focus: "Nouvelle route astrale dex/int a haut tempo.",
    pathRole: "Nouvelle branche v2",
  },
  deeproot_depths: {
    chapter: "Chapitre V",
    region: "Souterrain",
    recommendedLevel: [160, 202],
    danger: "Tres eleve",
    focus: "Tank/sustain et armures vivantes.",
    pathRole: "Nouvelle branche v2",
  },
  rotlake: {
    chapter: "Chapitre VI",
    region: "Souterrain",
    recommendedLevel: [125, 147],
    danger: "Extrem",
    focus: "Endgame optionnel axe statuts et survie active.",
    pathRole: "Detour v2 endgame",
  },
  altus_plateau: {
    chapter: "Chapitre VI",
    region: "Altus",
    recommendedLevel: [160, 200],
    danger: "Extrem",
    focus: "Frontiere du late game terrestre.",
    pathRole: "Route principale",
    hazards: ["folie"],
  },
  mount_gelmir: {
    chapter: "Chapitre VII",
    region: "Gelmir",
    recommendedLevel: [150, 189],
    danger: "Extrem",
    focus: "Volcan, venins et predateurs draconiques en crescendo.",
    pathRole: "Route principale",
    hazards: ["poison", "putrefaction"],
  },
  mountaintops: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    recommendedLevel: [176, 214],
    danger: "Extrem",
    focus: "Glace, posture et geants. Un mur de lecture et de tempo.",
    pathRole: "Route principale",
    hazards: ["gel", "folie"],
  },
  crumbling_farum_azula: {
    chapter: "Chapitre IX",
    region: "Azula",
    recommendedLevel: [201, 220],
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
    recommendedLevel: [176, 208],
    danger: "Extreme",
    focus: "Capitale doree, gardes royaux et longues avenues.",
    pathRole: "Route royale",
  },
  forbidden_land: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    recommendedLevel: [179, 214],
    danger: "Extreme",
    focus: "Col battu par les vents avant les sommets.",
    pathRole: "Passage vers les Cimes",
  },
  consecrated_snowfield: {
    chapter: "Chapitre IX",
    region: "Cimes",
    recommendedLevel: [192, 220],
    danger: "Extreme",
    focus: "Plaine blanche ou l'on ne voit pas a dix pas.",
    pathRole: "Route cachee",
  },
  mohgwyn_palace: {
    chapter: "Chapitre IX",
    region: "Souterrain",
    recommendedLevel: [198, 220],
    danger: "Abyssal",
    focus: "Lac de sang sous une lune rouge.",
    pathRole: "Detour sanglant",
  },
  miquella_haligtree: {
    chapter: "Chapitre IX",
    region: "Arbre Sacre",
    recommendedLevel: [208, 220],
    danger: "Abyssal",
    focus: "Ramures suspendues et gardiens putrides.",
    pathRole: "Voie alternative vers Azula",
  },
  /* --- Version complete : chapitres VI a X et zones annexes ------- */

  dominula_village: {
    chapter: "Chapitre VI",
    region: "Altus",
    recommendedLevel: [147, 184],
    danger: "Eleve",
    focus:
      "Un village en fete. Les tambours accelerent et ne s'arretent jamais.",
    pathRole: "Detour d'Altus",
    hazards: ["folie"],
  },
  shaded_castle: {
    chapter: "Chapitre VI",
    region: "Altus",
    recommendedLevel: [138, 172],
    danger: "Eleve",
    focus: "Un chateau noye dans une brume qui ronge les poumons.",
    pathRole: "Route vers Gelmir",
    hazards: ["poison"],
  },
  volcano_manor: {
    chapter: "Chapitre VII",
    region: "Gelmir",
    recommendedLevel: [166, 192],
    danger: "Tres eleve",
    focus: "On y signe des contrats. On y paie bien, on n'y soigne personne.",
    pathRole: "Coeur du Mont Gelmir",
    hazards: ["folie"],
  },
  rykard_lair: {
    chapter: "Chapitre VII",
    region: "Gelmir",
    recommendedLevel: [173, 198],
    danger: "Tres eleve",
    focus: "Une fosse de magma et ce qui reste d'un dieu dedans.",
    pathRole: "Fin du Mont Gelmir",
    hazards: ["folie"],
  },
  divine_tower: {
    chapter: "Chapitre VIII",
    region: "Leyndell",
    recommendedLevel: [185, 211],
    danger: "Extreme",
    focus: "La Tour coupe le lien a la Grace. Aucun soin ne fonctionne dedans.",
    pathRole: "Detour de Leyndell",
    hazards: ["folie"],
  },
  castle_sol: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    recommendedLevel: [192, 217],
    danger: "Extreme",
    focus: "Une nuit qui ne finit pas. On ne voit pas venir les coups.",
    pathRole: "Route du nord",
    hazards: ["gel"],
  },
  giants_catacombs: {
    chapter: "Chapitre VIII",
    region: "Cimes",
    recommendedLevel: [198, 220],
    danger: "Extreme",
    focus: "Des braises qui couvent depuis la guerre des Geants.",
    pathRole: "Avant les Cimes",
    hazards: ["gel", "folie"],
  },
  elphael: {
    chapter: "Chapitre IX",
    region: "Arbre Sacre",
    recommendedLevel: [217, 220],
    danger: "Abyssal",
    focus: "Les spores tombent en continu. Elle vous attend au bout.",
    pathRole: "Coeur de l'Arbre Sacre",
    hazards: ["putrefaction"],
  },
  farum_azula_deep: {
    chapter: "Chapitre IX",
    region: "Farum Azula",
    recommendedLevel: [214, 220],
    danger: "Abyssal",
    focus: "Sous les ruines, une tempete qui dure depuis avant l'Arbre.",
    pathRole: "Vers le chapitre X",
    hazards: ["folie"],
  },
  leyndell_ash: {
    chapter: "Chapitre X",
    region: "Leyndell",
    recommendedLevel: [214, 220],
    danger: "Abyssal",
    focus: "La capitale ensevelie sous la cendre. Elle ronge les armures.",
    pathRole: "Avant-derniere etape",
    hazards: ["putrefaction", "folie"],
  },
  erdtree_throne: {
    chapter: "Chapitre X",
    region: "Arbre-Monde",
    recommendedLevel: [214, 220],
    danger: "Abyssal",
    focus: "Le terme de la route. On n'en repart pas en arriere.",
    pathRole: "Terminus",
    hazards: ["folie"],
  },
  bestial_sanctum: {
    chapter: "Annexe",
    region: "Tertre Draconique",
    recommendedLevel: [172, 217],
    danger: "Eleve",
    focus:
      "Gurranq echange des racines de mort contre du butin. Aucune elite ici.",
    pathRole: "Zone de recolte",
    hazards: [],
  },
  jarburg: {
    chapter: "Annexe",
    region: "Liurnia",
    recommendedLevel: [40, 53],
    danger: "Faible",
    focus: "Des jarres creuses et pleines de runes. Elles se brisent vite.",
    pathRole: "Zone de runes",
    hazards: [],
  },
  evergaol_champions: {
    chapter: "Annexe",
    region: "Enclos",
    recommendedLevel: [214, 220],
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
  const guide = BIOME_GUIDE[biomeId];
  if (!guide) return "Inconnu";
  return `Niv. ${guide.recommendedLevel[0]}-${guide.recommendedLevel[1]}`;
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
  const guide = BIOME_GUIDE[biomeId];
  const bande = guide?.recommendedLevel;
  if (!bande) {
    return { libelle: guide?.danger || "Inconnu", cle: "inconnu", t: 0 };
  }

  const [bas] = bande;
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
