import { gameState, runtimeState } from "./state.js";
import { clearSaveStorage, saveGame } from "./save.js";
import { updateUI } from "./ui.js";
import { ITEMS } from "./item.js";

const upgradeCosts = {
  vigor: 1,
  strength: 1,
  dexterity: 1,
  intelligence: 1,
  critChance: 2,
  critDamage: 2.5,
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

export const upgradeStat = (statName) => {
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

export const upgradeStatMultiple = (statName, count) => {
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
  gameState.stats.critChance = 0.05;
  gameState.stats.critDamage = 1.5;
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
    clearSaveStorage();
    location.reload();
  }
};
