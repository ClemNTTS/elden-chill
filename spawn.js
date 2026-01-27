import { runtimeState } from "./state.js";
import { combatLoop } from "./combat.js";
import { ActionLog, updateHealthBars, updateUI } from "./ui.js";
import { MONSTERS } from "./monster.js";
import { gameState } from "./state.js";
import { ITEMS } from "./item.js";


export const devSpawnQueue = [];

export const enqueueDevSpawn = (monsterId) => {
  if (!MONSTERS[monsterId]) {
    console.error("DEV SPAWN: Unknown monster id:", monsterId);
    return false;
  }

  devSpawnQueue.push(monsterId);
  console.log("🔧 DEV SPAWN QUEUE:", [...devSpawnQueue]);
  return true;
};

export const getDevSpawn = () => {
  return devSpawnQueue.length > 0 ? devSpawnQueue.shift() : null;
};

export const spawnMonster = (monsterId, sessionId) => {
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
    let randomMultiplier = 1;
    if (!template.isBoss && !template.isRare) { randomMultiplier += Math.random(); }
    const enemy = {
      ...template,
      maxHp: Math.floor(template.hp * multiplier * randomMultiplier),
      atk: Math.floor(template.atk * multiplier),
      runes: Math.floor(template.runes * multiplier * randomMultiplier),
      hp: Math.floor(template.hp * multiplier * randomMultiplier),
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