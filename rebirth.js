// Renaissance et epreuves de fin de partie.
//
// Le jeu s'arretait net une fois le niveau maximum atteint et les 32 biomes
// nettoyes. La renaissance rend ce contenu rejouable avec un rendement
// croissant : on repart de zero, mais on encaisse plus vite et on monte plus
// haut. Les epreuves sont l'autre moitie du dispositif — des boss hors
// progression que l'on peut affronter avant de renaitre, sans butin, pour
// l'exploit seul.

import { gameState, runtimeState } from "./state.js";
import { MAX_LEVEL } from "./shared/player-profile.js";

/*
 * Biome dont la victoire ouvre la renaissance.
 *
 * Ce n'est pas la fin prevue : la carte annonce encore Leyndell la Cendreuse
 * puis l'Arbre-Monde en chapitre X, qui n'existent pas encore dans biome.js.
 * Quand ils seront ecrits, il n'y a que cette constante a changer.
 */
export const FINAL_BIOME_ID = "crumbling_farum_azula";

/** Gain de runes permanent par renaissance. */
export const REBIRTH_RUNE_BONUS = 0.25;
/** Niveaux maximum gagnes par renaissance. */
export const REBIRTH_LEVEL_BONUS = 10;

/* ------------------------------------------------------------------ */
/* Arbre de renaissance                                               */
/* ------------------------------------------------------------------ */

/** Points gagnes a chaque renaissance, a repartir dans l'arbre. */
export const POINTS_PER_REBIRTH = 2;

/*
 * Les noeuds ne touchent qu'a des leviers qui existent deja dans le moteur, et
 * jamais a la structure du build.
 *
 * Contrainte explicite : rien ici n'ajoute d'emplacement d'equipement et rien
 * ne releve le niveau maximum d'un objet. Le coeur du jeu est la synergie de
 * trois objets ; un quatrieme emplacement la reecrirait entierement. Les
 * renaissances accelerent et amplifient, elles ne changent pas les regles.
 */
export const REBIRTH_NODES = [
  {
    id: "runes",
    name: "Heritage de runes",
    detail: "+10% de gain de runes par rang.",
    maxRank: 5,
    perRank: 0.1,
  },
  {
    id: "will",
    name: "Volonte",
    detail: "+5 au niveau maximum par rang.",
    maxRank: 5,
    perRank: 5,
  },
  {
    id: "blood",
    name: "Sang endurci",
    detail: "+4% de Vigueur effective par rang.",
    maxRank: 5,
    perRank: 0.04,
  },
  {
    id: "grace",
    name: "Grace persistante",
    detail: "+1 charge de cendre de guerre par rang.",
    maxRank: 3,
    perRank: 1,
  },
  {
    id: "tracker",
    name: "Flair du pisteur",
    detail: "+12% de chance de rencontre rare par rang.",
    maxRank: 3,
    perRank: 0.12,
  },
];

const EMPTY_TREE = () =>
  REBIRTH_NODES.reduce((acc, node) => ({ ...acc, [node.id]: 0 }), {});

export const getRebirth = () => {
  if (!gameState.rebirth || typeof gameState.rebirth !== "object") {
    gameState.rebirth = {
      count: 0,
      finalCleared: false,
      trialsCleared: {},
      tree: EMPTY_TREE(),
    };
  }
  const r = gameState.rebirth;
  if (!Number.isFinite(r.count)) r.count = 0;
  if (typeof r.finalCleared !== "boolean") r.finalCleared = false;
  if (!r.trialsCleared || typeof r.trialsCleared !== "object") r.trialsCleared = {};
  if (!r.tree || typeof r.tree !== "object") r.tree = EMPTY_TREE();
  REBIRTH_NODES.forEach((node) => {
    const v = Math.floor(Number(r.tree[node.id]) || 0);
    r.tree[node.id] = Math.max(0, Math.min(node.maxRank, v));
  });
  return r;
};

/** Rang investi dans un noeud. */
export const getNodeRank = (nodeId) => getRebirth().tree[nodeId] || 0;

/** Valeur cumulee d'un noeud : rang x gain par rang. */
export const getNodeValue = (nodeId) => {
  const node = REBIRTH_NODES.find((n) => n.id === nodeId);
  return node ? getNodeRank(nodeId) * node.perRank : 0;
};

export const getRebirthPointsTotal = () =>
  POINTS_PER_REBIRTH * getRebirthCount();

export const getRebirthPointsSpent = () =>
  REBIRTH_NODES.reduce((sum, node) => sum + getNodeRank(node.id), 0);

export const getRebirthPointsAvailable = () =>
  Math.max(0, getRebirthPointsTotal() - getRebirthPointsSpent());

export const investRebirthPoint = (nodeId) => {
  const node = REBIRTH_NODES.find((n) => n.id === nodeId);
  if (!node) return false;
  if (getRebirthPointsAvailable() <= 0) return false;
  const r = getRebirth();
  if (r.tree[nodeId] >= node.maxRank) return false;
  r.tree[nodeId] += 1;
  return true;
};

/** Reinitialisation gratuite : les points viennent des renaissances, pas des
 *  runes, donc les rendre ne cree aucune ressource. */
export const resetRebirthTree = () => {
  getRebirth().tree = EMPTY_TREE();
};

export const getRebirthCount = () => getRebirth().count;

/** Niveau maximum courant : le plafond de base plus le gain des renaissances. */
export const getMaxLevel = () =>
  MAX_LEVEL + REBIRTH_LEVEL_BONUS * getRebirthCount() + getNodeValue("will");

/** Bonus de runes permanent, a ajouter aux stats effectives. */
export const getRebirthRuneBonus = () =>
  REBIRTH_RUNE_BONUS * getRebirthCount() + getNodeValue("runes");

/** Multiplicateur de Vigueur effective apporte par l'arbre. */
export const getRebirthVigorMult = () => 1 + getNodeValue("blood");

/** Charges de cendre de guerre supplementaires. */
export const getRebirthAshBonus = () => getNodeValue("grace");

/** Multiplicateur de chance de rencontre rare. */
export const getRebirthRareMult = () => 1 + getNodeValue("tracker");

/* ------------------------------------------------------------------ */
/* Epreuves                                                           */
/* ------------------------------------------------------------------ */

/*
 * Quatre boss hors progression, sans butin ni runes.
 *
 * Ils ne sont pas calibres pour la premiere renaissance : le seul gain de
 * puissance apporte par une renaissance est le relevement du plafond de
 * niveau (+10), soit environ 7% de statistiques en plus. Les paliers
 * ci-dessous partent a quatre fois le boss final (44 800 pv) et progressent
 * d'un facteur trois, de sorte que la derniere epreuve reste hors de portee
 * pendant de nombreux cycles.
 */
export const TRIALS = [
  {
    id: "trial_watcher",
    biomeId: "trial_watcher",
    name: "Le Veilleur sans Nom",
    lore: "Il attend au bout de la route depuis avant l'Arbre. Il n'a rien a donner.",
    suggestedRebirth: 1,
  },
  {
    id: "trial_twin",
    biomeId: "trial_twin",
    name: "Les Jumeaux d'Ombre",
    lore: "Deux silhouettes qui frappent au meme instant, et ne se fatiguent pas.",
    suggestedRebirth: 3,
  },
  {
    id: "trial_hollow",
    biomeId: "trial_hollow",
    name: "La Couronne Creuse",
    lore: "Ce qui reste d'un souverain qui a refuse de finir.",
    suggestedRebirth: 6,
  },
  {
    id: "trial_first",
    biomeId: "trial_first",
    name: "Le Premier Sans-Eclat",
    lore: "Celui qui a tente avant vous, et qui n'est jamais reparti.",
    suggestedRebirth: 10,
  },
];

export const isTrialCleared = (trialId) => !!getRebirth().trialsCleared[trialId];

export const getTrialByBiome = (biomeId) =>
  TRIALS.find((t) => t.biomeId === biomeId) || null;

/** Enregistre la victoire. Renvoie true seulement au premier passage. */
export const markTrialCleared = (trialId) => {
  const r = getRebirth();
  if (!trialId || r.trialsCleared[trialId]) return false;
  r.trialsCleared[trialId] = {
    clearedAt: Date.now(),
    atRebirth: r.count,
  };
  return true;
};

/* ------------------------------------------------------------------ */
/* Renaissance                                                        */
/* ------------------------------------------------------------------ */

/** Marque le biome final comme nettoye pour le cycle en cours. */
export const markFinalBiomeCleared = (biomeId) => {
  if (biomeId !== FINAL_BIOME_ID) return false;
  const r = getRebirth();
  if (r.finalCleared) return false;
  r.finalCleared = true;
  return true;
};

export const canRebirth = () => getRebirth().finalCleared;

/**
 * Ce que la renaissance conserve.
 *
 * Le principe : on garde ce qui a ete *decouvert*, on rend ce qui a ete
 * *accumule*. Le codex, les cendres de guerre et les deblocages de preparation
 * survivent — sinon chaque cycle recommencerait un jeu vide, et la renaissance
 * serait une punition plutot qu'une progression. Runes, niveaux, statistiques,
 * inventaire et equipement repartent a zero : c'est ce qu'on rejoue.
 */
export const performRebirth = () => {
  const r = getRebirth();

  r.count += 1;
  r.finalCleared = false;
  // r.tree et r.trialsCleared sont volontairement intacts : ce sont les seuls
  // acquis qui traversent les cycles.

  gameState.runes.banked = 0;
  gameState.runes.carried = 0;

  Object.assign(gameState.stats, {
    level: 0,
    runesSpent: 0,
    vigor: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    splashDamage: 0,
    armor: 100,
    flatDamagePenetration: 0,
    percentDamagePenetration: 0,
    critRanks: { chance: 0, damage: 0 },
  });

  gameState.equipped = { weapon: "fists", armor: null, accessory: null };
  gameState.order = [null, null, null];
  gameState.inventory = [{ id: "fists", name: "poings", level: 10, count: 0 }];

  gameState.world.unlockedBiomes = ["limgrave_west"];
  gameState.world.currentBiome = "limgrave_west";
  gameState.world.progress = 0;
  gameState.world.isExploring = false;
  gameState.world.checkpointReached = false;
  gameState.world.rareSpawnsCount = 0;
  gameState.world.activeBiomeHazards = [];
  gameState.world.lastEventProgress = -1;

  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.ashesOfWaruses = {};
  gameState.equippedAsh = null;

  runtimeState.currentLoopCount = 0;
  runtimeState.defeatedEnemies = [];
  runtimeState.currentEnemyGroup = [];

  return r.count;
};
