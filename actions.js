import { BIOMES } from "./biome.js";
import { startExploration } from "./core.js";
import {
  getCritPointsAvailable,
  resetCritRanks,
  spendCritPoint,
} from "./crit.js";
import { ITEMS } from "./item.js";
import {
  LEVEL_PER_MAIN_BOSS,
  REBIRTH_LEVEL_BONUS,
  REBIRTH_RUNE_BONUS,
  TRIALS,
  canRebirth,
  getMaxLevel,
  getNextMainBoss,
  getRebirthCount,
  investRebirthPoint,
  performRebirth,
  resetRebirthTree,
} from "./rebirth.js";
import { clearSaveStorage, saveGame, suspendreSauvegarde } from "./save.js";
import { gameState, runtimeState } from "./state.js";
import { updateUI } from "./ui.js";

/*
 * Le critique n'est plus achetable avec des runes et ne consomme plus de
 * niveau du budget global : il a sa propre monnaie, un point tous les
 * 10 niveaux, geree par crit.js. Seules les quatre stats principales restent
 * ici.
 */
const upgradeCosts = {
  vigor: 1,
  strength: 1,
  dexterity: 1,
  intelligence: 1,
};

const MAIN_STATS = new Set(Object.keys(upgradeCosts));

/** Depense un point de competence critique. Expose a l'interface. */
export const investCritPoint = (track, count = 1) => {
  if (!spendCritPoint(track, count)) return;
  saveGame("invest_crit_point");
  updateUI();
};

/** Rend tous les points critiques. Gratuit : ils viennent du niveau. */
export const respecCritPoints = () => {
  // Le texte de confirmation de la renaissance avait ete copie ici par
  // erreur : il lisait un `next` qui n'existe pas dans cette portee, et
  // l'exception levee empechait toute reinitialisation.
  if (
    !confirm(
      "Reinitialiser vos points de critique ? Tous les points vous seront rendus.",
    )
  ) {
    return;
  }
  resetCritRanks();
  saveGame("respec_crit_points");
  updateUI();
};

export { getCritPointsAvailable };

/* ------------------------------------------------------------------ */
/* Fin de partie                                                      */
/* ------------------------------------------------------------------ */

/** Investit un point de renaissance dans un noeud de l'arbre. */
export const investRebirthNode = (nodeId) => {
  if (!investRebirthPoint(nodeId)) return;
  gameState.save.maxLevel = getMaxLevel();
  saveGame("invest_rebirth_node");
  updateUI();
};

/** Rend tous les points de l'arbre. Gratuit : ils viennent des renaissances. */
export const respecRebirthTree = () => {
  if (
    !confirm(
      "Reinitialiser l'arbre de renaissance ? Tous les points vous seront rendus.",
    )
  ) {
    return;
  }
  resetRebirthTree();
  gameState.save.maxLevel = getMaxLevel();
  if (gameState.stats.level > gameState.save.maxLevel) {
    alert(
      "Votre niveau depasse le nouveau plafond : il ne baissera pas, mais vous ne pourrez plus monter tant que vous n'aurez pas reinvesti dans Volonte.",
    );
  }
  saveGame("respec_rebirth_tree");
  updateUI();
};

/** Lance une epreuve. Ce sont des biomes hors graphe, jamais debloques. */
export const startTrial = (trialId) => {
  const trial = TRIALS.find((t) => t.id === trialId);
  if (!trial || !canRebirth()) return;
  if (gameState.world.isExploring) {
    alert(
      "Terminez ou quittez votre expedition en cours avant d'affronter une epreuve.",
    );
    return;
  }
  startExploration(trial.biomeId);
};

/**
 * Renaissance. Double confirmation : c'est la seule action du jeu qui detruit
 * volontairement une partie entiere, et elle n'est pas annulable.
 */
export const requestRebirth = () => {
  if (!canRebirth()) return;
  if (gameState.world.isExploring) {
    alert("Terminez ou quittez votre expedition en cours avant de renaitre.");
    return;
  }
  const next = getRebirthCount() + 1;
  const resume = [
    `Renaitre pour la ${next}e fois ?`,
    "",
    "Vous perdez : niveau, statistiques, points critiques, runes,",
    "inventaire, equipement et biomes debloques.",
    "Vous gardez : codex, cendres de guerre, benedictions et atouts.",
    "",
    `Gain permanent : +${Math.round(REBIRTH_RUNE_BONUS * 100)}% de gain de runes`,
    `et +${REBIRTH_LEVEL_BONUS} au niveau maximum.`,
  ].join(String.fromCharCode(10));
  if (!confirm(resume)) {
    return;
  }
  const count = performRebirth();
  gameState.save.maxLevel = getMaxLevel();
  syncCritStats();
  saveGame("rebirth");
  updateUI();
  alert(`Renaissance ${count}. Les Terres Intermediaires vous ont oublie.`);
};

export const equipAsh = (ashId) => {
  gameState.equippedAsh = gameState.equippedAsh === ashId ? null : ashId;
  saveGame("equip_ash");
  updateUI();
};

export const selectBlessing = (blessingId) => {
  if (blessingId == null) {
    gameState.preparation.selectedBlessingId = null;
    saveGame("select_blessing");
    updateUI();
    return;
  }
  if (!gameState.preparation.unlockedBlessings?.includes(blessingId)) return;
  gameState.preparation.selectedBlessingId = blessingId;
  saveGame("select_blessing");
  updateUI();
};

export const selectPreparationConsumable = (consumableId) => {
  if (consumableId == null) {
    gameState.preparation.selectedConsumableId = null;
    saveGame("select_consumable");
    updateUI();
    return;
  }
  if (!gameState.preparation.unlockedConsumables?.includes(consumableId))
    return;
  gameState.preparation.selectedConsumableId = consumableId;
  saveGame("select_consumable");
  updateUI();
};

export const getUpgradeCost = (statName) => {
  const baseCost = upgradeCosts[statName] || 10;
  const count = gameState.stats.level;
  const x = Math.max((count - 11) * 0.02, 0);
  return Math.floor(baseCost * ((x + 0.1) * (count + 81) ** 2 + 1));
};

export const getMultiUpgradeCost = (statName, count) => {
  let totalCost = 0;
  for (let i = 0; i < count; i += 1) {
    const baseCost = upgradeCosts[statName] || 10;
    const level = gameState.stats.level + i;
    const x = Math.max((level - 11) * 0.02, 0);
    totalCost += Math.floor(baseCost * ((x + 0.1) * (level + 81) ** 2 + 1));
  }
  return totalCost;
};

export const upgradeStat = (statName) => {
  if (!MAIN_STATS.has(statName)) return;
  const cost = getUpgradeCost(statName);

  if (gameState.stats.level >= getMaxLevel()) {
    alert(
      (() => {
        // Meme message que la banniere du build : le joueur doit savoir quel
        // boss lever, pas seulement qu'il est bloque.
        const prochain = getNextMainBoss();
        return prochain
          ? `Niveau maximum atteint (${getMaxLevel()}). Abattez le boss de ${BIOMES[prochain]?.name || prochain} pour gagner ${LEVEL_PER_MAIN_BOSS} niveaux.`
          : `Niveau maximum atteint (${getMaxLevel()}). Montez une Renaissance ou investissez dans Volonte pour aller plus loin.`;
      })(),
    );
    return;
  }

  if (gameState.runes.banked >= cost) {
    gameState.runes.banked -= cost;

    gameState.stats[statName] += 1;
    gameState.stats.level++;
    gameState.stats.runesSpent = Math.floor(gameState.stats.runesSpent + cost);
    saveGame("upgrade_stat");
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const upgradeStatMultiple = (statName, count) => {
  if (!MAIN_STATS.has(statName)) return;
  const totalCost = getMultiUpgradeCost(statName, count);

  if (gameState.stats.level + count > getMaxLevel()) {
    alert(
      `Vous atteindriez le niveau maximum. Vous ne pouvez ajouter que ${getMaxLevel() - gameState.stats.level} niveaux.`,
    );
    return;
  }

  if (gameState.runes.banked >= totalCost) {
    gameState.runes.banked -= totalCost;

    for (let i = 0; i < count; i += 1) {
      gameState.stats[statName] += 1;
      gameState.stats.level++;
    }
    // On comptabilise le cout reellement debite. L'ancienne version rappelait
    // getUpgradeCost() APRES le level++ : elle facturait donc les niveaux
    // L+1..L+n au lieu de L..L+n-1, gonflait runesSpent, et le remboursement
    // rendait plus de runes qu'il n'en avait ete depense.
    gameState.stats.runesSpent = Math.floor(
      gameState.stats.runesSpent + totalCost,
    );
    saveGame("upgrade_stat_multiple");
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const refundRunes = () => {
  if (
    !confirm(
      "Etes-vous sur de vouloir recuperer vos runes ? Vous en perdrez 20%.",
    )
  ) {
    return;
  }

  gameState.runes.banked = Math.floor(
    gameState.runes.banked + gameState.stats.runesSpent * 0.8,
  );
  gameState.stats.runesSpent = 0;
  gameState.stats.level = 0;
  gameState.stats.vigor = 0;
  gameState.stats.strength = 0;
  gameState.stats.dexterity = 0;
  gameState.stats.intelligence = 0;
  resetCritRanks();
  gameState.stats.splashDamage = 0;
  gameState.stats.armor = 100;
  gameState.equipped = { weapon: null, armor: null, accessory: null };
  gameState.order = [null, null, null];
  saveGame("refund_runes");
  updateUI();
};

export const equipItem = (itemId) => {
  const itemData = ITEMS[itemId];
  if (!itemData) return;

  if (!itemData.type) {
    console.error("Type d'objet inconnu");
    return;
  }

  const typeSlot = {
    Arme: "weapon",
    Armure: "armor",
    Accessoire: "accessory",
  };

  const slotKey = typeSlot[itemData.type];

  const currentlyEquipped = gameState.equipped[slotKey];

  if (currentlyEquipped === itemId) {
    gameState.equipped[slotKey] = null;
  } else {
    gameState.equipped[slotKey] = itemId;
  }

  runtimeState.filterChanged = true;
  saveGame("equip_item");
  updateUI();
};

export const resetGame = () => {
  if (
    confirm(
      "Etes-vous sur de vouloir tout effacer ? Votre progression sera perdue a jamais.",
    )
  ) {
    /*
     * L'ordre compte, et le verrou est indispensable.
     *
     * location.reload() declenche beforeunload, qui appelle saveGame() et
     * reecrivait l'etat encore en memoire juste apres l'effacement. La
     * progression revenait intacte — le bouton ne servait a rien.
     */
    suspendreSauvegarde();
    clearSaveStorage();
    location.reload();
  }
};
