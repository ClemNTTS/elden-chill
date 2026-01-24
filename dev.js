import { gameState } from "./stats.js";
import { ITEMS, BIOMES } from "./gameData.js";
import { updateUI } from "./ui.js";
import { dropItem } from "./exploration.js";
import { saveGame } from "./save.js";

const dev = {
  // Se donner des runes : dev.giveRunes(5000)
  giveRunes: (amount) => {
    gameState.runes.banked += amount;
    console.log(`🔧 DEV : +${amount} runes ajoutées au coffre.`);
    updateUI();
    saveGame();
  },

  // Se donner un objet spécifique : dev.giveItem('twin_blade')
  giveItem: (itemId) => {
    if (ITEMS[itemId]) {
      dropItem(itemId);
      console.log(`🔧 DEV : Objet ${itemId} obtenu.`);
    } else {
      console.error("ID d'objet inconnu.");
    }
  },

  // Tout débloquer : dev.unlockAll()
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

  // Débloquer tous les objets : dev.unlockAllItems()
  unlockAllItems: () => {
    Object.keys(ITEMS).forEach((itemId) => {
      const existingItem = gameState.inventory.find((i) => i.id === itemId);
      if (!existingItem) {
        gameState.inventory.push({
          id: itemId,
          name: ITEMS[itemId].name,
          level: 1,
          count: 0,
        });
      }
    });
    console.log(`🔧 DEV : ${Object.keys(ITEMS).length} objets débloqués et ajoutés à l'inventaire.`);
    updateUI();
    saveGame();
  },

  setTestStats: (state) => {
    const testState = Number(state);
    
    // Reset all slots first
    gameState.unlockedSlots.shield = false;
    gameState.unlockedSlots.weapon = false;
    gameState.unlockedSlots.armor = false;
    gameState.unlockedSlots.accessory = 0;
    gameState.firstTimeCleared.necrolimbe = false;
    gameState.firstTimeCleared.caelid = false;
    
    // State 0: Fresh start - base stats only
    if (testState === 0) {
      gameState.stats.vigor = 10;
      gameState.stats.strength = 10;
      gameState.stats.critChance = 0.05;
      gameState.stats.critDamage = 1.5;
      console.log("🔧 DEV : Réinitialisation à l'état initial.");
    }
    // State 1: Stats to clear first dungeon + first dungeon clear rewards
    else if (testState === 1) {
      gameState.stats.vigor = 25;
      gameState.stats.strength = 25;
      gameState.stats.critChance = 0.1;
      gameState.stats.critDamage = 2.0;
      
      // Apply first dungeon clear rewards
      gameState.firstTimeCleared.necrolimbe = true;
      gameState.unlockedSlots.shield = true;
      gameState.unlockedSlots.weapon = true;
      gameState.unlockedSlots.armor = true;
      gameState.unlockedSlots.accessory = 1;
      
      console.log("🔧 DEV : Stats et récompenses du premier donjon appliquées.");
    }
    // State 2+: Stats to clear second dungeon + both dungeon clear rewards
    else if (testState >= 2) {
      gameState.stats.vigor = 50;
      gameState.stats.strength = 50;
      gameState.stats.critChance = 0.12;
      gameState.stats.critDamage = 2.5;
      
      // Apply first-clear rewards for both dungeons
      gameState.firstTimeCleared.necrolimbe = true;
      gameState.firstTimeCleared.caelid = true;
      
      // Unlock all slots from first dungeon
      gameState.unlockedSlots.shield = true;
      gameState.unlockedSlots.weapon = true;
      gameState.unlockedSlots.armor = true;
      gameState.unlockedSlots.accessory = 1;
      
      // Unlock additional slot from second dungeon
      gameState.unlockedSlots.accessory = 2;
      
      console.log("🔧 DEV : Toutes les récompenses de première victoire appliquées.");
    }
    
    updateUI();
    saveGame();
  },
};

export { dev };