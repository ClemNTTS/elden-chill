import { gameState, runtimeState } from "./state.js";
import { clearSaveStorage, saveGame } from "./save.js";
import { updateUI } from "./ui.js";
import { ITEMS } from "./item.js";
import { isCloudConfigured, performMutation } from "./backend.js";

const upgradeCosts = {
  vigor: 1,
  strength: 1,
  dexterity: 1,
  intelligence: 1,
  critChance: 2,
  critDamage: 2.5,
};

const handleMutationError = (error, fallbackMessage) => {
  const code = error?.message || "";

  if (code.includes("LEVEL_CAP_REACHED")) {
    alert(
      `Niveau maximum atteint (${gameState.save.maxLevel}). Attendez la prochaine mise a jour pour progresser davantage!`,
    );
    return;
  }

  if (code.includes("CRIT_CHANCE_MAXED")) {
    alert("Votre Chance de Critique est deja au maximum (100%) !");
    return;
  }

  if (code.includes("NOT_ENOUGH_RUNES")) {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
    return;
  }

  console.error(fallbackMessage, error);
  alert(fallbackMessage);
};

export const equipAsh = async (ashId) => {
  if (isCloudConfigured()) {
    try {
      await performMutation("equip_ash", { ashId });
      updateUI();
      return;
    } catch (error) {
      handleMutationError(error, "Impossible de changer de cendre pour le moment.");
      return;
    }
  }

  gameState.equippedAsh = gameState.equippedAsh === ashId ? null : ashId;
  saveGame("equip_ash");
  updateUI();
};

export const selectBlessing = async (blessingId) => {
  if (isCloudConfigured()) {
    try {
      await performMutation("update_preparation", { blessingId });
      updateUI();
      return;
    } catch (error) {
      handleMutationError(error, "Impossible de mettre a jour la preparation.");
      return;
    }
  }

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

export const selectPreparationConsumable = async (consumableId) => {
  if (isCloudConfigured()) {
    try {
      await performMutation("update_preparation", { consumableId });
      updateUI();
      return;
    } catch (error) {
      handleMutationError(error, "Impossible de mettre a jour la preparation.");
      return;
    }
  }

  if (consumableId == null) {
    gameState.preparation.selectedConsumableId = null;
    saveGame("select_consumable");
    updateUI();
    return;
  }
  if (!gameState.preparation.unlockedConsumables?.includes(consumableId)) return;
  gameState.preparation.selectedConsumableId = consumableId;
  saveGame("select_consumable");
  updateUI();
};

export const getUpgradeCost = (statName) => {
  const baseCost = upgradeCosts[statName] || 10;
  let count = gameState.stats.level;
  let x = Math.max((count - 11) * 0.02, 0);
  return Math.floor(baseCost * ((x + 0.1) * Math.pow(count + 81, 2) + 1));
};

export const getMultiUpgradeCost = (statName, count) => {
  let totalCost = 0;
  for (let i = 0; i < count; i += 1) {
    const baseCost = upgradeCosts[statName] || 10;
    let level = gameState.stats.level + i;
    let x = Math.max((level - 11) * 0.02, 0);
    totalCost += Math.floor(baseCost * ((x + 0.1) * Math.pow(level + 81, 2) + 1));
  }
  return totalCost;
};

export const upgradeStat = async (statName) => {
  if (isCloudConfigured()) {
    try {
      await performMutation("upgrade_stat", { statName, count: 1 });
      updateUI();
      return;
    } catch (error) {
      handleMutationError(error, "Impossible d'appliquer cette amelioration pour le moment.");
      return;
    }
  }

  let cost = getUpgradeCost(statName);

  if (gameState.stats.level >= gameState.save.maxLevel) {
    alert(
      `Niveau maximum atteint (${gameState.save.maxLevel}). Attendez la prochaine mise a jour pour progresser davantage!`,
    );
    return;
  }

  if (statName === "critChance" && gameState.stats.critChance >= 1.0) {
    alert("Votre Chance de Critique est deja au maximum (100%) !");
    return;
  }

  if (gameState.runes.banked >= cost) {
    gameState.runes.banked -= cost;

    if (statName === "critChance") {
      gameState.stats.critChance += 0.01;
    } else if (statName === "critDamage") {
      gameState.stats.critDamage += 0.1;
    } else {
      gameState.stats[statName] += 1;
    }
    gameState.stats.level++;
    gameState.stats.runesSpent = Math.floor(gameState.stats.runesSpent + cost);
    saveGame("upgrade_stat");
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const upgradeStatMultiple = async (statName, count) => {
  if (isCloudConfigured()) {
    try {
      await performMutation("upgrade_stat", { statName, count });
      updateUI();
      return;
    } catch (error) {
      handleMutationError(error, "Impossible d'appliquer cette amelioration pour le moment.");
      return;
    }
  }

  let totalCost = getMultiUpgradeCost(statName, count);

  if (gameState.stats.level + count > gameState.save.maxLevel) {
    alert(
      `Vous atteindriez le niveau maximum. Vous ne pouvez ajouter que ${gameState.save.maxLevel - gameState.stats.level} niveaux.`,
    );
    return;
  }

  if (statName === "critChance" && gameState.stats.critChance >= 1.0) {
    alert("Votre Chance de Critique est deja au maximum (100%) !");
    return;
  }

  if (gameState.runes.banked >= totalCost) {
    gameState.runes.banked -= totalCost;

    for (let i = 0; i < count; i += 1) {
      if (statName === "critChance") {
        gameState.stats.critChance += 0.01;
        if (gameState.stats.critChance > 1.0) gameState.stats.critChance = 1.0;
      } else if (statName === "critDamage") {
        gameState.stats.critDamage += 0.1;
      } else {
        gameState.stats[statName] += 1;
      }
      gameState.stats.level++;
      gameState.stats.runesSpent = Math.floor(
        gameState.stats.runesSpent + getUpgradeCost(statName),
      );
    }
    saveGame("upgrade_stat_multiple");
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const refundRunes = async () => {
  if (
    !confirm(
      "Etes-vous sur de vouloir recuperer vos runes ? Vous en perdrez 20%.",
    )
  ) {
    return;
  }

  if (isCloudConfigured()) {
    try {
      await performMutation("refund_runes");
      updateUI();
      return;
    } catch (error) {
      handleMutationError(error, "Impossible de rembourser les runes pour le moment.");
      return;
    }
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
  gameState.stats.critChance = 0.05;
  gameState.stats.critDamage = 1.5;
  gameState.stats.splashDamage = 0;
  gameState.stats.armor = 100;
  gameState.equipped = { weapon: null, armor: null, accessory: null };
  gameState.order = [null, null, null];
  saveGame("refund_runes");
  updateUI();
};

export const equipItem = async (itemId) => {
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

  if (isCloudConfigured()) {
    try {
      await performMutation("equip_item", { itemId, slotKey });
      runtimeState.filterChanged = true;
      updateUI();
      return;
    } catch (error) {
      handleMutationError(error, "Impossible de modifier cet equipement pour le moment.");
      return;
    }
  }

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
    clearSaveStorage();
    location.reload();
  }
};
