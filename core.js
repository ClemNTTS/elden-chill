import {
  BIOMES,
  ITEMS,
  LOOT_TABLES,
  MONSTERS,
  STATUS_EFFECTS,
} from "./gameData.js";
import { gameState, getEffectiveStats, runtimeState, getHealth } from "./state.js";
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
          100 * BIOMES[gameState.world.currentBiome].length,
        )} runes en compensation.`,
      );
      saveGame();
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

const handleDeath = () => {
  ActionLog(`Vous êtes mort. Les runes portées sont perdues ...`);
  gameState.runes.carried = 0;
  gameState.world.isExploring = false;
  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.ashesOfWaruses = {};
  saveGame();
  setTimeout(() => toggleView("camp"), 3000);
};

const handleVictory = (sessionId) => {
  const eff = getEffectiveStats();
  const intBonus = 1 + eff.intelligence / 100;
  const totalRunes = Math.floor(runtimeState.currentEnemy.runes * intBonus);

  gameState.runes.carried += totalRunes;

  let monster = runtimeState.currentEnemy;
  console.log(monster);
  while (monster.linkedFight != null){
    monster = MONSTERS[monster.linkedFight];
    console.log("dernier monstre trouvé :", monster);
  } 
  
  ActionLog(
    `Vous avez vaincu ${
      monster.name
    } ! (+${formatNumber(totalRunes)} runes)`,
    );

  const enemy = runtimeState.currentEnemy;

  if (enemy.isRare && enemy.drops) {
    enemy.drops.forEach((loot) => {
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
  
  if(runtimeState.currentEnemy.linkedFight) {
    const nextMonster = MONSTERS[runtimeState.currentEnemy.linkedFight];
    ActionLog(` Il vous reste encore à vaincre ${nextMonster.name} !`);
    spawnMonster(runtimeState.currentEnemy.linkedFight, sessionId);
    updateHealthBars();
    return;
  };
  gameState.world.progress++;
  updateStepper();

  if (runtimeState.currentEnemy.isBoss) {
    const currentBiome = BIOMES[gameState.world.currentBiome];
    gameState.world.rareSpawnsCount = 0;
    ActionLog("BOSS VAINCU !");

    if (
      currentBiome.unlocks &&
      !gameState.world.unlockedBiomes.includes(currentBiome.unlocks)
    ) {
      gameState.world.unlockedBiomes.push(currentBiome.unlocks);
      ActionLog(
        `Nouvelle zone découverte : ${BIOMES[currentBiome.unlocks].name} !`,
      );
      saveGame();
      updateUI();
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

  const playerObj = {
    name: "player",
    currentHp: runtimeState.playerCurrentHp,
    maxHp: getEffectiveStats().vigor * 10,
  };
  setTimeout(() => {
    const playerStatus = processTurnEffects(playerObj, gameState.playerEffects);

    runtimeState.playerCurrentHp = playerObj.currentHp;

    if (playerStatus.logMessages.length > 0) {
      playerStatus.logMessages.forEach((msg) => ActionLog(msg, "log-warning"));
    }

    if (runtimeState.playerCurrentHp <= 0) {
      handleDeath();
      return;
    }

    if (!playerStatus.skipTurn) {
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
          Math.floor(damage),
        )} dégâts ${isCrit ? "CRITIQUES !" : "."}`;
        ActionLog(message, isCrit ? "log-crit" : "");

        gameState.ennemyEffects.forEach((eff) => {
          const effectData = STATUS_EFFECTS[eff.id];
          if (effectData.onBeingHit) {
            const result = effectData.onBeingHit({ name: "player" }, damage);
            if (result?.message) {
              ActionLog(result.message, "log-warning");
            }
            if (runtimeState.playerCurrentHp <= 0) {
              handleDeath();
              return;
            }
          }
        });
      }
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

      const enemyStatus = processTurnEffects(
        runtimeState.currentEnemy,
        gameState.ennemyEffects,
      );

      if (!enemyStatus.skipTurn) {
        const eff = getEffectiveStats();
        const dodgeChance = Math.min(0.5, eff.dexterity / 500);

        if (Math.random() < dodgeChance) {
          ActionLog("ESQUIVE ! Vous évitez le coup.", "log-dodge");
          setTimeout(() => combatLoop(sessionId), 500);
          return;
        }

      runtimeState.playerCurrentHp -= runtimeState.currentEnemy.atk;
      updateHealthBars();

      if (runtimeState.currentEnemy.atk > getHealth(eff.vigor) * 0.15) {
        triggerShake();
      }

      ActionLog(
        `${runtimeState.currentEnemy.name} frappe ! -${formatNumber(
          runtimeState.currentEnemy.atk,
        )} PV`,
      );
        gameState.playerEffects.forEach((eff) => {
          const effectData = STATUS_EFFECTS[eff.id];
          if (effectData.onBeingHit) {
            const result = effectData.onBeingHit(
              runtimeState.currentEnemy,
              runtimeState.currentEnemy.atk,
            );

            if (result?.message) {
              ActionLog(result.message, "log-status");
            }
          }
        });
        if (runtimeState.currentEnemy.currentHp <= 0) {
          handleVictory(sessionId);
          return;
        }

        if (runtimeState.currentEnemy.onHitEffect) {
          const { id, duration, chance } =
            runtimeState.currentEnemy.onHitEffect;
          if (Math.random() < chance) {
            applyEffect(gameState.playerEffects, id, duration);
            ActionLog(
              `L'attaque vous a appliqué ${duration} ${STATUS_EFFECTS[id].name} !`,
              "log-warning",
            );
          }
        }

        updateHealthBars();
        updateUI();
      }

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
  const multiplier = Math.pow(1.25, runtimeState.currentLoopCount);
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

  Object.values(gameState.equipped).forEach((itemId) => {
    const item = ITEMS[itemId];
    if (item && item.passiveStatus) {
      const statusId = item.passiveStatus;

      const hasEffect = gameState.playerEffects.some((e) => e.id === statusId);

      if (!hasEffect) {
        gameState.playerEffects.push({ id: statusId, duration: 999 });
      }
    }
  });
  updateUI();

  ActionLog(
    `Un ${runtimeState.currentEnemy.isRare ? "⭐ " + runtimeState.currentEnemy.name : runtimeState.currentEnemy.name} apparaît !`,
  );

  setTimeout(() => combatLoop(sessionId), 500);
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

  runtimeState.playerCurrentHp = getHealth(getEffectiveStats().vigor);

  document.getElementById("action-log").innerHTML = "";

  toggleView("biome");

  document.getElementById("current-biome-text").innerText = biome.name;

  updateHealthBars();
  updateStepper();

  nextEncounter(sessionAtStart);
};

export const applyEffect = (targetEffects, effectId, duration) => {
  const existing = targetEffects.find((e) => e.id === effectId);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
  } else {
    targetEffects.push({ id: effectId, duration });
  }
};

const processTurnEffects = (entity, effectsArray) => {
  let logMessages = [];
  let skipTurn = false;

  for (let i = effectsArray.length - 1; i >= 0; i--) {
    const effectRef = effectsArray[i];
    const effectData = STATUS_EFFECTS[effectRef.id];

    if (effectData.onTurnStart) {
      const result = effectData.onTurnStart(entity);
      if (result?.message) {
        logMessages.push(result.message);
      }
      if (result?.skipTurn) {
        skipTurn = true;
      }
    }

    effectRef.duration--;
    if (effectRef.duration <= 0) {
      effectsArray.splice(i, 1);
    }
  }
  return { logMessages, skipTurn };
};
