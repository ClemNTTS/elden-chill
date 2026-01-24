// Main entry point for the game
import { BIOMES, ITEMS } from "./gameData.js";
import { gameState } from "./state.js";
import { loadGame, saveGame } from "./save.js";
import {
  equipItem,
  resetGame,
  upgradeStat,
} from "./actions.js";
import {
  hideTooltip,
  moveTooltip,
  showStatTooltip,
  toggleOptions,
  toggleView,
  updateUI,
} from "./ui.js";
import { startExploration } from "./core.js";

// Dev tools
const dev = {
  giveRunes: (amount) => {
    gameState.runes.banked += amount;
    console.log(`🔧 DEV : +${amount} runes ajoutées au coffre.`);
    updateUI();
    saveGame();
  },
  giveItem: (itemId) => {
    if (ITEMS[itemId]) {
      // Re-implementing dropItem logic for dev purposes to avoid circular deps
      const itemTemplate = ITEMS[itemId];
      let inventoryItem = gameState.inventory.find((item) => item.id === itemId);
      if (!inventoryItem) {
        gameState.inventory.push({
          id: itemId,
          name: itemTemplate.name,
          level: 1,
          count: 0,
        });
      } else {
        inventoryItem.count++;
        if (inventoryItem.count >= inventoryItem.level && inventoryItem.level < 10) {
          inventoryItem.level++;
          inventoryItem.count = 0;
        }
      }
      console.log(`🔧 DEV : Objet ${itemId} obtenu.`);
      updateUI();
    } else {
      console.error("ID d'objet inconnu.");
    }
  },
  unlockAll: () => {
    Object.keys(BIOMES).forEach((id) => {
      if (!gameState.world.unlockedBiomes.includes(id)) {
        gameState.world.unlockedBiomes.push(id);
      }
    });
    console.log("🔧 DEV : Tous les biomes sont débloqués.");
    updateUI();
    saveGame();
  },
};

// --- Global Function Assignments ---
// Assign all functions that are called from the HTML (onclick) to the window object
window.upgradeStat = upgradeStat;
window.toggleView = toggleView;
window.startExploration = startExploration;
window.equipItem = equipItem;
window.resetGame = resetGame;
window.toggleOptions = toggleOptions;
window.showStatTooltip = showStatTooltip;
window.moveTooltip = moveTooltip;
window.hideTooltip = hideTooltip;
window.dev = dev;

// --- Game Initialization ---
// Set the onload handler
window.onload = loadGame;

// Start the auto-save interval
setInterval(saveGame, 30000);