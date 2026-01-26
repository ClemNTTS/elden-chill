import {
  BIOMES,
  ITEMS,
  LOOT_TABLES,
  MONSTERS,
  STATUS_EFFECTS,
} from "./gameData.js";
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
  const totalRunes = Math.floor(runtimeState.lastDefeatedEnemy.runes * intBonus);

  gameState.runes.carried += totalRunes;

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
    name: "Vôtre héros",
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
        runtimeState.currentEnemyGroup[0].hp -= Math.floor(damage);
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

        Object.values(gameState.equipped).forEach((itemId) => {
          const item = ITEMS[itemId];
          if (item && item.onHitEffect) {
            const { id, duration, chance } = item.onHitEffect;
            if (Math.random() < chance) {
              applyEffect(gameState.ennemyEffects, id, duration);
              ActionLog(
                `Vous appliquez ${duration} ${STATUS_EFFECTS[id].name} à l'ennemi !`,
                "log-warning",
              );
            }
          }
        });
      }
    }

    if (runtimeState.currentEnemyGroup[0].hp <= 0) {
      const defeatedEnemy = runtimeState.currentEnemyGroup.shift();
      
      // Award runes for the defeated enemy
      const eff = getEffectiveStats();
      const intBonus = 1 + eff.intelligence / 100;
      const runesAwarded = Math.floor(defeatedEnemy.runes * intBonus);
      gameState.runes.carried += runesAwarded;
      
      ActionLog(
        `${defeatedEnemy.name} a été vaincu ! (+${formatNumber(runesAwarded)} runes)`,
        "log-runes"
      );
      
      if (runtimeState.currentEnemyGroup.length === 0) {
        runtimeState.lastDefeatedEnemy = defeatedEnemy;
        setTimeout(() => handleVictory(sessionId), 500);
        return;
      } else {
        ActionLog(`Un ${runtimeState.currentEnemyGroup[0].name} reste ! (x${runtimeState.currentEnemyGroup.length})`);
        const groupSizeText = runtimeState.currentEnemyGroup.length > 1 ? ` (x${runtimeState.currentEnemyGroup.length})` : "";
        document.getElementById("enemy-name").innerText =
          runtimeState.currentLoopCount > 0
            ? `${runtimeState.currentEnemyGroup[0].name}${groupSizeText} +${runtimeState.currentLoopCount}`
            : `${runtimeState.currentEnemyGroup[0].name}${groupSizeText}`;
        updateHealthBars();
        updateUI();
        setTimeout(() => combatLoop(sessionId), 500);
        return;
      }
    }

    setTimeout(() => {
      if (
        sessionId !== runtimeState.currentCombatSession ||
        !gameState.world.isExploring
      )
        return;

      const enemyStatus = processTurnEffects(
        runtimeState.currentEnemyGroup[0],
        gameState.ennemyEffects,
      );

      if (enemyStatus.logMessages.length > 0) {
        setTimeout(() => {
          enemyStatus.logMessages.forEach((msg) =>
            ActionLog(msg, "log-status"),
          );
          updateHealthBars();
        }, 500);
      }

      if (!enemyStatus.skipTurn) {
        const eff = getEffectiveStats();
        const dodgeChance = Math.min(0.5, eff.dexterity / 500);

        if (Math.random() < dodgeChance) {
          ActionLog("ESQUIVE ! Vous évitez le coup.", "log-dodge");
          setTimeout(() => combatLoop(sessionId), 500);
          return;
        }

        // All enemies attack
        runtimeState.currentEnemyGroup.forEach((enemy) => {
          runtimeState.playerCurrentHp -= enemy.atk;
          updateHealthBars();

          if (enemy.atk > getHealth(eff.vigor) * 0.15) {
            triggerShake();
          }

          ActionLog(
            `${enemy.name} frappe ! -${formatNumber(enemy.atk)} PV`,
          );

          gameState.playerEffects.forEach((eff) => {
            const effectData = STATUS_EFFECTS[eff.id];
            if (effectData.onBeingHit) {
              const result = effectData.onBeingHit(
                enemy,
                enemy.atk,
              );

              if (result?.message) {
                ActionLog(result.message, "log-status");
              }
            }
          });

          if (enemy.onHitEffect) {
            const { id, duration, chance } = enemy.onHitEffect;
            if (Math.random() < chance) {
              applyEffect(gameState.playerEffects, id, duration);
              ActionLog(
                `L'attaque vous a appliqué ${duration} ${STATUS_EFFECTS[id].name} !`,
                "log-warning",
              );
            }
          }
        });

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

  const template = MONSTERS[monsterId];
  const multiplier = Math.pow(1.25, runtimeState.currentLoopCount);
  
  // Determine group size
  let groupSize = 1;
  if (template.groupCombinations) {
    const random = Math.random();
    let cumulativeChance = 0;
    for (const combination of template.groupCombinations) {
      cumulativeChance += combination.chance;
      if (random <= cumulativeChance) {
        groupSize = combination.size;
        break;
      }
    }
  }

  // Create the enemy group
  runtimeState.currentEnemyGroup = [];
  for (let i = 0; i < groupSize; i++) {
    const enemy = {
      ...template,
      maxHp: Math.floor(template.hp * multiplier),
      atk: Math.floor(template.atk * multiplier),
      runes: Math.floor(template.runes * multiplier),
      hp: Math.floor(template.hp * multiplier),
    };
    runtimeState.currentEnemyGroup.push(enemy);
  }

  const firstEnemy = runtimeState.currentEnemyGroup[0];
  const groupSizeText = groupSize > 1 ? ` (x${groupSize})` : "";

  document.getElementById("enemy-name").innerText =
    runtimeState.currentLoopCount > 0
      ? `${firstEnemy.name}${groupSizeText} +${runtimeState.currentLoopCount}`
      : `${firstEnemy.name}${groupSizeText}`;
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
    groupSize > 1
      ? `Un Groupe de ${groupSize} ${firstEnemy.name} apparaît !`
      : `Un ${firstEnemy.isRare ? "⭐ " + firstEnemy.name : firstEnemy.name} apparaît !`,
  );

  setTimeout(() => combatLoop(sessionId), 500);
};

const spawnMonsters = (monsterId, sessionId) => {
  const monster = MONSTERS[monsterId];
  const groupSize = getGroupSize(monster.groupCombinations);
  const enemies = [];

  for (let i = 0; i < groupSize; i++) {
    enemies.push({ id: monsterId, ...monster });
  }

  return enemies; // Return the array of spawned enemies
};

const handleMonsterAttack = (enemies) => {
  enemies.forEach((enemy) => {
    // Logic for each enemy to attack
    console.log(`${enemy.name} attacks!`);
    // Implement attack logic here
  });
};

const getGroupSize = (groupCombinations) => {
  const random = Math.random();
  let cumulativeChance = 0;
  for (const combination of groupCombinations) {
    cumulativeChance += combination.chance;
    if (random <= cumulativeChance) {
      return combination.size;
    }
  }
  return 1; // Default to 1 if no match
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
