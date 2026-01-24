import { gameState } from "./state.js";
import { saveGame, SAVE_NAME } from "./save.js";
import { updateUI } from "./ui.js";

const upgradeCosts = {
  vigor: 10,
  strength: 10,
  dexterity: 15,
  intelligence: 15,
  critChance: 150,
  critDamage: 1500,
};

export const getUpgradeCost = (statName) => {
  const baseCost = upgradeCosts[statName] || 10;
  const val = gameState.stats[statName] || 0;

  let count = 0;
  if (["vigor", "strength", "dexterity", "intelligence"].includes(statName)) {
    count = val - 10;
  }
  if (statName === "critChance") count = Math.round((val - 0.05) * 100);
  if (statName === "critDamage") count = Math.round((val - 1.5) * 10);

  return Math.floor(baseCost * Math.pow(1.3, count));
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
    saveGame();
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const equipItem = (itemId) => {
  const alreadyEquippedIndex = gameState.equipped.indexOf(itemId);

  if (alreadyEquippedIndex !== -1) {
    gameState.equipped[alreadyEquippedIndex] = null;
  } else {
    const emptySlot = gameState.equipped.indexOf(null);
    if (emptySlot !== -1) {
      gameState.equipped[emptySlot] = itemId; // On stocke l'ID
    } else {
      alert("Slots d'équipement pleins !");
    }
  }
  updateUI();
};

export const resetGame = () => {
  if (
    confirm(
      "Êtes-vous sûr de vouloir tout effacer ? Votre progression sera perdue à jamais."
    )
  ) {
    localStorage.removeItem(SAVE_NAME);
    location.reload();
  }
};
