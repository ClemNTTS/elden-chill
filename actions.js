import { gameState } from "./state.js";
import { saveGame, SAVE_NAME } from "./save.js";
import { updateUI } from "./ui.js";
import { ITEM_TYPES, ITEMS } from "./gameData.js";

const upgradeCosts = {
  vigor: 1,
  strength: 1,
  dexterity: 1.5,
  intelligence: 1.5,
  critChance: 2,
  critDamage: 3,
};

export const getUpgradeCost = (statName) => {
  const baseCost = upgradeCosts[statName] || 10;
  let count = gameState.stats.level;
  let x = Math.max((count-11)*0.02, 0);
  return Math.floor(baseCost*((x+0.1)*(Math.pow(count+81,2))+1));
};

export const upgradeStat = (statName) => {
  let cost = getUpgradeCost(statName);

  if (statName === "critChance" && gameState.stats.critChance >= 1.0) {
    alert("Votre Chance de Critique est déjà au maximum (100%) !");
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
    saveGame();
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const equipItem = (itemId) => {
  const itemData = ITEMS[itemId];
  if (!itemData) return;

  // Map the item type from the French string to the English key used in the state
  const typeToSlotKey = {
    "Arme": "weapon",
    "Armure": "armor",
    "Accessoire": "accessory",
  };
  const slotKey = typeToSlotKey[itemData.type];

  if (!slotKey) {
    console.error(`Type d'objet inconnu: ${itemData.type}`);
    return;
  }

  // If the item is already in its slot, unequip it. Otherwise, equip it.
  if (gameState.equipped[slotKey] === itemId) {
    gameState.equipped[slotKey] = null;
  } else {
    gameState.equipped[slotKey] = itemId;
  }

  saveGame();
  updateUI();
};

export const resetGame = () => {
  if (
    confirm(
      "Êtes-vous sûr de vouloir tout effacer ? Votre progression sera perdue à jamais.",
    )
  ) {
    localStorage.removeItem(SAVE_NAME);
    location.reload();
  }
};
