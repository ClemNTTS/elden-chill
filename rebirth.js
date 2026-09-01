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

export const getRebirth = () => {
  if (!gameState.rebirth || typeof gameState.rebirth !== "object") {
    gameState.rebirth = { count: 0, finalCleared: false, trialsCleared: {} };
  }
  const r = gameState.rebirth;
  if (!Number.isFinite(r.count)) r.count = 0;
  if (typeof r.finalCleared !== "boolean") r.finalCleared = false;
  if (!r.trialsCleared || typeof r.trialsCleared !== "object") r.trialsCleared = {};
  return r;
};

export const getRebirthCount = () => getRebirth().count;

/** Niveau maximum courant : le plafond de base plus le gain des renaissances. */
export const getMaxLevel = () =>
  MAX_LEVEL + REBIRTH_LEVEL_BONUS * getRebirthCount();

/** Bonus de runes permanent, a ajouter aux stats effectives. */
export const getRebirthRuneBonus = () => REBIRTH_RUNE_BONUS * getRebirthCount();

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
