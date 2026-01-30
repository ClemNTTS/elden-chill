// Main entry point for the game
import { BIOMES } from "./biome.js";
import { ITEMS } from "./item.js";
import { DEFAULT_GAME_STATE, gameState, runtimeState } from "./state.js";
import {
  exportSave,
  importSave,
  loadGame,
  resetGameState,
  saveGame,
} from "./save.js";
import {
  equipAsh,
  equipItem,
  resetGame,
  upgradeStat,
  refundRunes,
} from "./actions.js";
import { startExploration } from "./core.js";
import {
  createFireParticles,
  hideTooltip,
  moveTooltip,
  showStatTooltip,
  toggleOptions,
  toggleView,
  updateUI,
  playCampMusic,
  toggleRealTimeStats,
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
        (item) => item.id === itemId,
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

  spawnEnemy: (monsterId, amount) => {
    if (!amount) amount = 1;
    for (let i = 0; i < amount; i++) {
      if (enqueueDevSpawn(monsterId)) {
        console.log(`🔧 DEV : ${monsterId} ajouté à la file de spawn.`);
      }
    }
  },
  toggleCombat: () => {
    runtimeState.combatFrozen = !runtimeState.combatFrozen;
    console.log(
      `🔧 DEV : Combat ${runtimeState.combatFrozen ? "gelé" : "dégelé"} !`,
    );
  },
  //reset biome unlocks
  resetBiomes: () => {
    gameState.world.unlockedBiomes = ["limgrave_west"];
    console.log("🔧 DEV : Biomes débloqués réinitialisés.");
    updateUI();
    saveGame();
  },

  unlockBiome: (biomeId) => {
    if (!gameState.world.unlockedBiomes.includes(biomeId)) {
      gameState.world.unlockedBiomes.push(biomeId);
      console.log(`🔧 DEV : Biome ${biomeId} débloqué.`);
      updateUI();
      saveGame();
    }
  },
};

const joinDiscord = () => {
  const invitLink = "https://discord.gg/rdnythxSXd";
  window.open(invitLink, "_blank");
};

// --- Global Function Assignments ---
// Assign all functions that are called from the HTML (onclick) to the window object
window.upgradeStat = upgradeStat;
window.toggleView = toggleView;
window.startExploration = startExploration;
window.equipItem = equipItem;
window.resetGame = resetGame;
window.refundRunes = refundRunes;
window.toggleOptions = toggleOptions;
window.showStatTooltip = showStatTooltip;
window.moveTooltip = moveTooltip;
window.hideTooltip = hideTooltip;
window.dev = dev;
window.exportSave = exportSave;
window.importSave = importSave;
window.equipAsh = equipAsh;
window.toggleRealTimeStats = toggleRealTimeStats;
window.joinDiscord = joinDiscord;

// --- Game Initialization ---

const CHECK_REFRESH_KEY = "last_hard_refresh_timestamp";
export const FORCE_VERSION_KEY = "app_version_code";
export const CURRENT_VERSION = DEFAULT_GAME_STATE.save.version;

const checkScheduledReset = () => {
  // const FINAL_WIPE_FLAG = "wipe_v110_final";

  // if (!localStorage.getItem(FINAL_WIPE_FLAG)) {
  //   console.warn(
  //     "Dernière maintenance majeure DESOLE : Réinitialisation du système de sauvegarde.",
  //   );

  //   localStorage.clear();
  //   localStorage.setItem(FINAL_WIPE_FLAG, "true");

  //   alert(
  //     "MISE À JOUR : Le système de sauvegarde a été sécurisé. Pour garantir la stabilité, une dernière réinitialisation est nécessaire. Bonne chance, Sans-éclat ! Et désolé.",
  //   );

  //   window.location.reload();
  //}
  return;
};

export async function checkForUpdate() {
  try {
    const response = await fetch(`./version.json?t=${Date.now()}`);
    const data = await response.json();

    if (data.version !== CURRENT_VERSION) {
      console.log("🛠️ Mise à jour détectée ! Refresh en cours...");
      saveGame();
      window.location.reload(true);
    }
  } catch (err) {
    console.error("Impossible de vérifier les mises à jour", err);
  }
}

const handleAutoRefresh = () => {
  const now = Date.now();
  const lastRefresh = localStorage.getItem(CHECK_REFRESH_KEY);
  const lastVersion = localStorage.getItem(FORCE_VERSION_KEY);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Condition 1 : Est-ce que la version a changé ? (Force le déploiement de tes fixes)
  // Condition 2 : Est-ce que ça fait plus de 24h ?
  if (
    lastVersion !== CURRENT_VERSION ||
    !lastRefresh ||
    now - parseInt(lastRefresh) > ONE_DAY_MS
  ) {
    localStorage.setItem(CHECK_REFRESH_KEY, now.toString());
    localStorage.setItem(FORCE_VERSION_KEY, CURRENT_VERSION);

    console.log(
      "🔄 Nouvelle version ou délai dépassé. Hard refresh en cours...",
    );

    // Le true est techniquement déprécié mais aide encore certains navigateurs
    // à ignorer le cache. Une alternative est de changer l'URL.
    window.location.reload(true);
    return true; // On indique qu'un reload est demandé
  }
  return false;
};
// Set the onload handler
window.onload = () => {
  if (handleAutoRefresh()) return;

  checkScheduledReset();

  loadGame();
  createFireParticles();
  const startAudioOnInteraction = () => {
    playCampMusic();
    window.removeEventListener("click", startAudioOnInteraction);
  };
  window.addEventListener("click", startAudioOnInteraction);
};

// Start the auto-save interval
setInterval(saveGame, 30000);
