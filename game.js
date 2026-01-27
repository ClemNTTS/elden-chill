// Main entry point for the game
import { BIOMES } from "./biome.js";
import { ITEMS } from "./item.js";
import { gameState, runtimeState } from "./state.js";
import { exportSave, importSave, loadGame, saveGame } from "./save.js";
import { equipAsh, equipItem, resetGame, upgradeStat } from "./actions.js";
import { startExploration } from "./core.js";
import {
  hideTooltip,
  moveTooltip,
  showStatTooltip,
  toggleOptions,
  toggleView,
  updateUI,
} from "./ui.js";
import { enqueueDevSpawn } from "./spawn.js";

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
      let inventoryItem = gameState.inventory.find(
        (item) => item.id === itemId,
      );
      if (!inventoryItem) {
        gameState.inventory.push({
          id: itemId,
          name: itemTemplate.name,
          level: 1,
          count: 0,
        });
      } else {
        inventoryItem.count++;
        if (
          inventoryItem.count >= inventoryItem.level &&
          inventoryItem.level < 10
        ) {
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
  giveAsh: (ashId) => {
    if (!gameState.ashesOfWarOwned.includes(ashId)) {
      gameState.ashesOfWarOwned.push(ashId);
      console.log(`🔧 DEV : Cendre de guerre ${ashId}`);
      updateUI();
      saveGame();
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
  forceResetToCamp: () => {
    console.log("🔧 DEV : Forcing reset to camp view...");
    // Invalidate any active combat loops
    runtimeState.currentCombatSession++;
    // Reset exploration state
    gameState.world.isExploring = false;
    gameState.runes.carried = 0;
    // Switch view and save
    toggleView("camp");
    console.log("Reset complete. You are back at the camp.");
  },
  giveAllItems: () => {
    Object.keys(ITEMS).forEach((itemId) => {
      const itemTemplate = ITEMS[itemId];

      let inventoryItem = gameState.inventory.find(
        (item) => item.id === itemId
      );

      if (!inventoryItem) {
        gameState.inventory.push({
          id: itemId,
          name: itemTemplate.name,
          level: 1,
          count: 0,
        });
      }
    });

    console.log("🔧 DEV : Tous les objets ont été ajoutés à l'inventaire.");
    updateUI();
    saveGame();
  },
  maxAllItems: () => {
    gameState.inventory.forEach((item) => {
      item.level = 10;
      item.count = 0;
    });

    console.log("🔧 DEV : Tous les objets ont été montés niveau 10.");
    updateUI();
    saveGame();
  },
  
  spawnEnemy: (monsterId,amount) => {
    if(!amount) amount = 1;
    for(let i=0;i<amount;i++) {
      if (enqueueDevSpawn(monsterId)) {
        console.log(`🔧 DEV : ${monsterId} ajouté à la file de spawn.`);
      };
    }
  },
  toggleCombat:() => {
  runtimeState.combatFrozen = !runtimeState.combatFrozen;
  console.log(`🔧 DEV : Combat ${runtimeState.combatFrozen ? "gelé" : "dégelé"} !`);
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
window.exportSave = exportSave;
window.importSave = importSave;
window.equipAsh = equipAsh;

// --- Game Initialization ---
// Set the onload handler
window.onload = loadGame;

// Start the auto-save interval
setInterval(saveGame, 30000);
