/*
 * A quel niveau un boss devient-il jouable ?
 *
 * La mesure vivait dans banc-boss.mjs, qui est un rapport qu'on lit a la main.
 * Elle en sort parce qu'un test s'en sert desormais : le plafond de niveau et
 * la difficulte des boss doivent rester compatibles, et cette verification-la
 * ne doit pas dependre de quelqu'un qui pense a lancer un outil.
 *
 * MARGE : combien de fois le joueur survit au temps qu'il met a tuer.
 *   marge 1 = il meurt au moment exact ou le boss tombe, sans aucune erreur
 *   marge 2 = il a de quoi se tromper
 *
 * Le modele est calibre sur six releves de terrain (voir banc-boss.mjs) : il
 * est pessimiste d'environ six niveaux. Il ignore cendres, benedictions,
 * afflictions et phases de boss. Un boss qu'il declare jouable l'est donc
 * surement ; un boss qu'il declare hors de portee merite d'etre regarde.
 */
import { mountDomStub } from "./headless-stub.mjs";

mountDomStub();

const { BUILDS, applyBuild, playerDamagePerTurn, enemyDamagePerTurn } =
  await import("./simulate-balance.mjs");
const { gameState, getEffectiveStats, getHealth } = await import("../state.js");
const { BIOMES } = await import("../biome.js");

/** Niveau au-dela duquel le balayage abandonne. */
export const NIVEAU_MAX_MESURE = 220;

/*
 * L'equipement reellement porte par le joueur qui a fourni les releves, dans
 * l'ordre ou il l'a adopte. Chaque palier vaut a partir du biome indique.
 */
export const PALIERS = [
  { des: "limgrave_west", arme: "kama", armure: null, accessoire: null },
  {
    des: "limgrave_north",
    arme: "kama",
    armure: "alchimist_suit",
    accessoire: "scholars_ring",
  },
  {
    des: "stormwind_castle",
    arme: "queen_staff",
    armure: "alchimist_suit",
    accessoire: "troll_necklace",
  },
  {
    des: "liurnia_south",
    arme: "carian_glintstone_staff",
    armure: "carian_knight_armor",
    accessoire: "troll_necklace",
  },
  {
    des: "raya_lucaria_academy",
    arme: "carian_glintstone_staff",
    armure: "carian_knight_armor",
    accessoire: "godrick_great_rune",
  },
  {
    des: "nokron",
    arme: "carian_glintstone_staff",
    armure: "carian_knight_armor",
    accessoire: "moon_of_nokstella",
  },
];

const ordre = Object.keys(BIOMES);
const rangDe = (id) => {
  const i = ordre.indexOf(id);
  return i === -1 ? 1e9 : i;
};

/** Palier d'equipement en vigueur au moment ou l'on atteint ce biome. */
export const palierPour = (biomeId) => {
  let choisi = PALIERS[0];
  for (const p of PALIERS) if (rangDe(p.des) <= rangDe(biomeId)) choisi = p;
  return choisi;
};

const equiper = (palier, niveauObjet) => {
  const porte = [palier.arme, palier.armure, palier.accessoire].filter(Boolean);
  gameState.inventory = porte.map((id) => ({
    id,
    name: id,
    level: niveauObjet,
    count: 0,
  }));
  gameState.equipped = {
    weapon: palier.arme,
    armor: palier.armure,
    accessory: palier.accessoire,
  };
};

/** Marge du joueur contre ce boss, a ce niveau, avec cet equipement. */
export const margeContre = (boss, niveau, palier, niveauObjet = 6) => {
  applyBuild(BUILDS.int, niveau);
  equiper(palier, niveauObjet);
  let eff;
  try {
    eff = getEffectiveStats();
  } catch {
    return 0;
  }
  const pv = getHealth(eff.vigor);
  const toursPourTuer =
    boss.hp / Math.max(1, playerDamagePerTurn(eff, boss.armor || 100));
  return pv / Math.max(1, enemyDamagePerTurn(eff, boss)) / toursPourTuer;
};

/** Premier niveau atteignant cette marge, ou null au-dela du balayage. */
export const niveauPourMarge = (boss, seuil, palier, niveauObjet = 6) => {
  for (let n = 1; n <= NIVEAU_MAX_MESURE; n += 1) {
    if (margeContre(boss, n, palier, niveauObjet) >= seuil) return n;
  }
  return null;
};

/** Niveau minimum viable contre le boss de ce biome. */
export const niveauDeSurvie = (biomeId, boss, niveauObjet = 6) =>
  niveauPourMarge(boss, 1, palierPour(biomeId), niveauObjet);

/** Niveau confortable contre le boss de ce biome. */
export const niveauDeConfort = (biomeId, boss, niveauObjet = 6) =>
  niveauPourMarge(boss, 2, palierPour(biomeId), niveauObjet);
