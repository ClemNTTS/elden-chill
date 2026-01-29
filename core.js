import { ASHES_OF_WAR } from "./ashes.js";
import { BIOMES, LOOT_TABLES } from "./biome.js";
import { MONSTERS } from "./monster.js";
import { ITEMS } from "./item.js";
import { STATUS_EFFECTS } from "./status.js";
import { devSpawnQueue, spawnMonster } from "./spawn.js";
import {
  gameState,
  getEffectiveStats,
  runtimeState,
  getHealth,
} from "./state.js";
import { saveGame } from "./save.js";
import {
  ActionLog,
  formatNumber,
  toggleView,
  triggerShake,
  updateCycleDisplay,
  updateHealthBars,
  updateStepper,
  updateUI,
} from "./ui.js";

const dropItem = (itemId) => {
  const itemTemplate = ITEMS[itemId];
  let inventoryItem = gameState.inventory.find((item) => item.id === itemId);

  if (!inventoryItem) {
    gameState.inventory.push({
      id: itemId,
      name: itemTemplate.name,
      level: 1,
      count: 0,
    });
    ActionLog(`Vous avez trouvé : ${itemTemplate.name} !`);
  } else {
    if (inventoryItem.level >= 10) {
      if (inventoryItem.level > 10) inventoryItem.level = 10;
      ActionLog(`${itemTemplate.name} est déjà au niveau maximum (10) !`);
      const compensation = 7 * gameState.stats.level;
      gameState.runes.banked += compensation;
      ActionLog(
        `Vous recevez ${formatNumber(compensation)} runes en compensation.`,
      );
      saveGame();
      return;
    }

    inventoryItem.count++;
    if (inventoryItem.count >= inventoryItem.level) {
      inventoryItem.level++;
      inventoryItem.count = 0;
      ActionLog(
        `${itemTemplate.name} monte au niveau ${inventoryItem.level} !`,
      );
    } else {
      ActionLog(
        `Copie de ${itemTemplate.name} trouvée (${inventoryItem.count}/${inventoryItem.level})`,
      );
    }
  }

  updateUI();
};

export const handleDeath = () => {
  ActionLog(`Vous êtes mort. Les runes portées sont perdues ...`);
  gameState.runes.carried = 0;
  gameState.world.isExploring = false;
  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.ashesOfWaruses = {};
  saveGame();
  setTimeout(() => toggleView("camp"), 3000);
};

export const handleVictory = (sessionId) => {
  const firstEnemy = runtimeState.lastDefeatedEnemy;

  if (firstEnemy.isRare && firstEnemy.drops) {
    firstEnemy.drops.forEach((loot) => {
      if (loot.ashId) {
        if (
          !gameState.ashesOfWarOwned.includes(loot.ashId) &&
          Math.random() < loot.chance
        ) {
          gameState.ashesOfWarOwned.push(loot.ashId);
          ActionLog(
            `OBJET UNIQUE OBTENU : Cendre de Guerre - ${loot.ashId} !`,
            "log-crit",
          );
        }
      } else if (loot.id && Math.random() < loot.chance) {
        dropItem(loot.id);
      }
    });
  }

  gameState.ennemyEffects = [];
  gameState.world.progress++;
  updateStepper();

  if (firstEnemy.isBoss) {
    gameState.runes.banked += gameState.runes.carried;
    gameState.runes.carried = 0;

    const currentBiome = BIOMES[gameState.world.currentBiome];
    gameState.world.rareSpawnsCount = 0;
    runtimeState.ashUsesLeft = gameState.equippedAsh
      ? ASHES_OF_WAR[gameState.equippedAsh].maxUses
      : 0;

    ActionLog("BOSS VAINCU !");

    if (
      currentBiome.unlocks &&
      !gameState.world.unlockedBiomes.includes(currentBiome.unlocks[0])
    ) {
      for (let i = 0; i < currentBiome.unlocks.length; i++) {
        if (!BIOMES[currentBiome.unlocks[i]]) {
          continue;
        }

        gameState.world.unlockedBiomes.push(currentBiome.unlocks[i]);
        ActionLog(
          `Nouvelle zone découverte : ${BIOMES[currentBiome.unlocks[i]].name} !`,
        );
      }
      saveGame();
      updateUI();
    }

    const loot = LOOT_TABLES[gameState.world.currentBiome];
    if (loot) {
      const rolled = loot[Math.floor(Math.random() * loot.length)];
      dropItem(rolled.id);
      saveGame();
    }

    runtimeState.currentLoopCount++;
    gameState.world.progress = 0;
    gameState.world.checkpointReached = false;

    updateCycleDisplay();

    ActionLog(`--- DÉBUT DU CYCLE ${runtimeState.currentLoopCount + 1} ---`);

    setTimeout(() => {
      updateStepper();
      nextEncounter(sessionId);
    }, 3000);
  } else {
    setTimeout(() => nextEncounter(sessionId), 1000);
  }
  updateUI();
};

const handleCampfireEvent = (sessionId) => {
  gameState.world.checkpointReached = true;
  const container = document.getElementById("game-container");
  container.classList.add("blink-effect");

  gameState.runes.banked += gameState.runes.carried;
  gameState.runes.carried = 0;
  runtimeState.playerCurrentHp = getHealth(getEffectiveStats().vigor);

  updateHealthBars();
  updateUI();
  saveGame();

  setTimeout(() => {
    container.classList.remove("blink-effect");
    ActionLog("Site de grâce touché. Runes sécurisées.");
    nextEncounter(sessionId);
  }, 1200);
};

export function nextEncounter(sessionId) {
  if (sessionId !== runtimeState.currentCombatSession) return;

  const biome = BIOMES[gameState.world.currentBiome];
  const midPoint = Math.floor(biome.length / 2);

  if (
    gameState.world.progress === midPoint &&
    !gameState.world.checkpointReached
  ) {
    handleCampfireEvent(sessionId);
    return;
  }
  if (devSpawnQueue.length > 0) {
    const devMonsterId = devSpawnQueue.shift();
    spawnMonster(devMonsterId, sessionId);
    return;
  }

  if (gameState.world.progress >= biome.length) {
    spawnMonster(biome.boss, sessionId);
    return;
  }

  const canSpawnRare =
    biome.rareMonsters &&
    gameState.world.rareSpawnsCount < (biome.maxRareSpawns || 0);

  if (canSpawnRare && Math.random() < 0.15) {
    const rareId =
      biome.rareMonsters[Math.floor(Math.random() * biome.rareMonsters.length)];
    gameState.world.rareSpawnsCount++;
    spawnMonster(rareId, sessionId);
    return;
  } else {
    spawnMonster(
      biome.monsters[Math.floor(Math.random() * biome.monsters.length)],
      sessionId,
    );
    return;
  }
}

export const startExploration = (biomeId) => {
  if (gameState.world.isExploring) {
    toggleView("biome");
    return;
  }

  runtimeState.currentLoopCount = 0;
  runtimeState.currentCombatSession++;
  const sessionAtStart = runtimeState.currentCombatSession;
  const biome = BIOMES[biomeId];
  gameState.world.isExploring = true;
  gameState.world.currentBiome = biomeId;
  gameState.world.progress = 0;
  gameState.world.checkpointReached = false;
  gameState.ashesOfWaruses = {};
  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.world.rareSpawnsCount = 0;
  const selectedAsh = ASHES_OF_WAR[gameState.equippedAsh];
  runtimeState.ashUsesLeft = selectedAsh ? selectedAsh.maxUses : 0;
  runtimeState.ashIsPrimed = false;

  runtimeState.playerCurrentHp = getHealth(getEffectiveStats().vigor);

  document.getElementById("action-log").innerHTML = "";

  toggleView("biome");

  document.getElementById("current-biome-text").innerText = biome.name;

  updateHealthBars();
  updateStepper();

  nextEncounter(sessionAtStart);
};
