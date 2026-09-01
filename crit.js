// Systeme de critique.
//
// Le critique ne partage plus le budget de 150 niveaux des quatre stats
// principales. Il a sa propre monnaie : un point de competence tous les
// 10 niveaux, soit 15 points a niveau maximum, que le joueur repartit entre
// chance et degats critiques. Les points sont gratuits — ils viennent du
// niveau, pas des runes — et se reinitialisent sans cout.
//
// Pourquoi ce decoupage : avant, monter le critique consommait des niveaux du
// meme budget que la force, a 2x et 2,5x le prix en runes. Un build optimise
// n'avait donc jamais interet a y toucher, et le critique restait fige a sa
// valeur de depart pour toute la partie.

import { gameState } from "./state.js";

/** Valeurs de depart, avant tout point investi et avant les objets. */
export const CRIT_BASE = { chance: 0.05, damage: 1.5 };

/**
 * Gain par point.
 *
 * `chance` est a 0.05 et pas 0.04 pour une raison precise : les Lames Jumelles
 * exigent 10% de chance critique *de base* (`item.js`). Avec 5 points de
 * pourcentage par rang, le premier point suffit a franchir ce seuil, ce qui
 * rend l'arme accessible des le niveau 10. A 4 points, il en aurait fallu deux.
 */
export const CRIT_PER_RANK = { chance: 0.05, damage: 0.25 };

/** Un point de competence tous les N niveaux. */
export const LEVELS_PER_CRIT_POINT = 10;

/*
 * Plafond de rangs par voie.
 *
 * Le budget de points suit le niveau maximum : 22 points a 220. Sans plafond,
 * tout mettre en chance donnerait 5% + 22x5 = 115%, et le super critique
 * cesserait de dependre des objets — c'etait pourtant sa raison d'etre. Le
 * plafond de 15 en chance maintient le maximum a 80% par les seuls points.
 *
 * Les deux plafonds cumules (35) restent hors de portee : il faudrait 350
 * niveaux. La repartition demeure donc un choix a tous les paliers.
 */
export const CRIT_MAX_RANK = { chance: 15, damage: 20 };

/**
 * Multiplicateur applique aux degats critiques lors d'un super critique.
 * Le super critique est la soupape des builds qui depassent 100% de chance
 * critique grace aux objets : sans lui, chaque point de chance au-dela de 100%
 * serait purement perdu.
 */
export const SUPER_CRIT_MULTIPLIER = 2;

/** Les rangs vivent dans `gameState.stats`, initialises a la volee pour les
 *  sauvegardes anterieures au systeme. */
export const getCritRanks = () => {
  const stats = gameState.stats;
  if (!stats.critRanks || typeof stats.critRanks !== "object") {
    stats.critRanks = { chance: 0, damage: 0 };
  }
  if (!Number.isFinite(stats.critRanks.chance)) stats.critRanks.chance = 0;
  if (!Number.isFinite(stats.critRanks.damage)) stats.critRanks.damage = 0;
  return stats.critRanks;
};

export const getCritPointsTotal = () =>
  Math.floor((gameState.stats.level || 0) / LEVELS_PER_CRIT_POINT);

export const getCritPointsSpent = () => {
  const ranks = getCritRanks();
  return ranks.chance + ranks.damage;
};

export const getCritPointsAvailable = () =>
  Math.max(0, getCritPointsTotal() - getCritPointsSpent());

/**
 * Recalcule `stats.critChance` et `stats.critDamage` depuis les rangs.
 *
 * Ces deux champs restent la source de verite pour tout le reste du code
 * (objets, combat, affichage) : les rangs ne font que les piloter. Cela evite
 * de reecrire la trentaine d'endroits qui lisent `gameState.stats.critChance`.
 */
export const syncCritStats = () => {
  const ranks = getCritRanks();
  gameState.stats.critChance =
    CRIT_BASE.chance + ranks.chance * CRIT_PER_RANK.chance;
  gameState.stats.critDamage =
    CRIT_BASE.damage + ranks.damage * CRIT_PER_RANK.damage;
};

/** @param {"chance"|"damage"} track */
export const spendCritPoint = (track, count = 1) => {
  if (track !== "chance" && track !== "damage") return false;
  const ranks = getCritRanks();
  const room = CRIT_MAX_RANK[track] - ranks[track];
  const spend = Math.min(count, getCritPointsAvailable(), room);
  if (spend <= 0) return false;
  ranks[track] += spend;
  syncCritStats();
  return true;
};

/** Reinitialisation gratuite : les points viennent du niveau, pas des runes,
 *  donc les rendre ne cree aucune ressource. */
export const resetCritRanks = () => {
  const ranks = getCritRanks();
  ranks.chance = 0;
  ranks.damage = 0;
  syncCritStats();
};

/**
 * Resout un jet de critique sur des stats *effectives* (objets inclus).
 *
 * Au-dela de 100% de chance, le surplus devient la probabilite de super
 * critique. Exemple : 135% de chance donne un critique garanti dont 35% sont
 * des super critiques a 2x les degats critiques.
 *
 * @returns {{isCrit: boolean, isSuper: boolean, multiplier: number}}
 */
export const rollCrit = (effectiveStats, random = Math.random) => {
  const chance = effectiveStats?.critChance ?? 0;
  const damage = effectiveStats?.critDamage ?? CRIT_BASE.damage;
  const miss = { isCrit: false, isSuper: false, multiplier: 1 };

  if (chance <= 0) return miss;
  if (random() >= chance) return miss;

  const superChance = Math.min(1, Math.max(0, chance - 1));
  const isSuper = superChance > 0 && random() < superChance;

  return {
    isCrit: true,
    isSuper,
    multiplier: isSuper ? damage * SUPER_CRIT_MULTIPLIER : damage,
  };
};

/** Part des coups qui seront des super critiques, pour l'affichage. */
export const getSuperCritChance = (effectiveStats) =>
  Math.min(1, Math.max(0, (effectiveStats?.critChance ?? 0) - 1));

/**
 * Multiplicateur de degats moyen apporte par le critique, super inclus.
 * Sert a comparer honnetement deux repartitions de points dans l'interface :
 * "40% / 3.5x" et "80% / 1.5x" ne se comparent pas a vue d'oeil.
 */
export const getCritDamageMultiplier = (effectiveStats) => {
  const chance = Math.max(0, effectiveStats?.critChance ?? 0);
  const damage = effectiveStats?.critDamage ?? CRIT_BASE.damage;
  const hitRate = Math.min(1, chance);
  const superRate = getSuperCritChance(effectiveStats);
  const normalRate = hitRate - superRate;
  return (
    1 - hitRate + normalRate * damage + superRate * damage * SUPER_CRIT_MULTIPLIER
  );
};
