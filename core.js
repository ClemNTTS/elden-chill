import { BIOMES, ITEMS, LOOT_TABLES, MONSTERS } from "./gameData.js";
import { gameState, getEffectiveStats, runtimeState } from "./state.js";
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
      ActionLog(`${itemTemplate.name} est déjà au niveau maximum (10) !`);
      gameState.runes.banked +=
        100 * BIOMES[gameState.world.currentBiome].length;
      ActionLog(
        `Vous recevez ${formatNumber(
          100 * BIOMES[gameState.world.currentBiome].length
        )} runes en compensation.`
      );
      saveGame();
    }

    inventoryItem.count++;
    if (inventoryItem.count >= inventoryItem.level) {
      inventoryItem.level++;
      inventoryItem.count = 0;
      ActionLog(
        `${itemTemplate.name} monte au niveau ${inventoryItem.level} !`
      );
    } else {
      ActionLog(
        `Copie de ${itemTemplate.name} trouvée (${inventoryItem.count}/${inventoryItem.level})`
      );
    }
  }

  updateUI();
};

const handleDeath = () => {
  ActionLog(`Vous êtes mort. Les runes portées sont perdues ...`);
  gameState.runes.carried = 0;
  gameState.world.isExploring = false;
  setTimeout(() => toggleView("camp"), 3000);
};

const handleVictory = (sessionId) => {
  const eff = getEffectiveStats();
  const intBonus = 1 + eff.intelligence / 100;
  const totalRunes = Math.floor(runtimeState.currentEnemy.runes * intBonus);

  ActionLog(
    `Vous avez vaincu ${
      runtimeState.currentEnemy.name
    } ! (+${formatNumber(totalRunes)} runes)`
  );
  gameState.runes.carried += totalRunes;
  gameState.world.progress++;

  updateStepper();

  if (runtimeState.currentEnemy.isBoss) {
    const currentBiome = BIOMES[gameState.world.currentBiome];
    ActionLog("BOSS VAINCU !");

    if (
      currentBiome.unlocks &&
      !gameState.world.unlockedBiomes.includes(currentBiome.unlocks)
    ) {
      gameState.world.unlockedBiomes.push(currentBiome.unlocks);
      ActionLog(
        `Nouvelle zone découverte : ${BIOMES[currentBiome.unlocks].name} !`
      );
    }

    const loot = LOOT_TABLES[gameState.world.currentBiome];
    const rolled = loot[Math.floor(Math.random() * loot.length)];
    dropItem(rolled.id);
    saveGame();

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

const combatLoop = (sessionId) => {
  if (!gameState.world.isExploring) return;
  if (sessionId !== runtimeState.currentCombatSession) return;

  setTimeout(() => {
    const stats = getEffectiveStats();
    for (let i = 0; i < stats.attacksPerTurn; i++) {
      let damage = stats.strength;
      const isCrit = Math.random() < stats.critChance;
      if (isCrit) {
        damage *= stats.critDamage;
      }
      runtimeState.currentEnemy.currentHp -= Math.floor(damage);
      updateHealthBars();
      const message = `Vous infligez ${formatNumber(
        Math.floor(damage)
      )} dégâts ${isCrit ? "CRITIQUES !" : "."}`;
      ActionLog(message, isCrit ? "log-crit" : "");
    }

    if (runtimeState.currentEnemy.currentHp <= 0) {
      setTimeout(() => handleVictory(sessionId), 500);
      return;
    }

    setTimeout(() => {
      if (
        sessionId !== runtimeState.currentCombatSession ||
        !gameState.world.isExploring
      )
        return;

      const eff = getEffectiveStats();
      const dodgeChance = Math.min(0.5, eff.dexterity / 500);

      if (Math.random() < dodgeChance) {
        ActionLog("ESQUIVE ! Vous évitez le coup.", "log-dodge");
        setTimeout(() => combatLoop(sessionId), 500);
        return;
      }

      runtimeState.playerCurrentHp -= runtimeState.currentEnemy.atk;
      updateHealthBars();

      if (runtimeState.currentEnemy.atk > stats.vigor * 10 * 0.15) {
        triggerShake();
      }

      ActionLog(
        `${runtimeState.currentEnemy.name} frappe ! -${formatNumber(
          runtimeState.currentEnemy.atk
        )} PV`
      );

      if (runtimeState.playerCurrentHp <= 0) {
        handleDeath();
      } else {
        setTimeout(() => combatLoop(sessionId), 500);
      }
    }, 800);
  }, 800);
};

const spawnMonster = (monsterId, sessionId) => {
  if (sessionId !== runtimeState.currentCombatSession) return;

  const monster = MONSTERS[monsterId];
  const multiplier = Math.pow(1.1, runtimeState.currentLoopCount);
  runtimeState.currentEnemy = {
    ...monster,
    currentHp: Math.floor(monster.hp * multiplier),
    atk: Math.floor(monster.atk * multiplier),
    runes: Math.floor(monster.runes * multiplier),
    hp: Math.floor(monster.hp * multiplier),
  };

  document.getElementById("enemy-name").innerText =
    runtimeState.currentLoopCount > 0
      ? `${runtimeState.currentEnemy.name} +${runtimeState.currentLoopCount}`
      : runtimeState.currentEnemy.name;
  updateHealthBars();

  ActionLog(`Un ${runtimeState.currentEnemy.name} apparaît !`);

  setTimeout(() => combatLoop(sessionId), 500);
};

const handleCampfireEvent = (sessionId) => {
  gameState.world.checkpointReached = true;
  const container = document.getElementById("game-container");
  container.classList.add("blink-effect");

  gameState.runes.banked += gameState.runes.carried;
  gameState.runes.carried = 0;
  runtimeState.playerCurrentHp = getEffectiveStats().vigor * 10;

  updateHealthBars();
  updateUI();

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

  if (gameState.world.progress >= biome.length) {
    spawnMonster(biome.boss, sessionId);
  } else {
    spawnMonster(
      biome.monsters[Math.floor(Math.random() * biome.monsters.length)],
      sessionId
    );
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

  runtimeState.playerCurrentHp = getEffectiveStats().vigor * 10;

  document.getElementById("action-log").innerHTML = "";

  toggleView("biome");

  document.getElementById("current-biome-text").innerText = biome.name;

  updateHealthBars();
  updateStepper();

  nextEncounter(sessionAtStart);
};
