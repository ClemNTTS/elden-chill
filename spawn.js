import { runtimeState } from "./state.js";
import { combatLoop } from "./combat.js";
import { ActionLog, updateHealthBars, updateUI } from "./ui.js";
import { MONSTERS } from "./monster.js";
import { gameState } from "./state.js";
import { ITEMS } from "./item.js";

export const devSpawnQueue = [];

/* ============================
   DEV SPAWN SYSTEM
============================ */

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

/* ============================
   GROUP / COMPANION SYSTEM
============================ */

function rollGroupSize(groupCombinations) {
  const r = Math.random();
  let acc = 0;

  for (const entry of groupCombinations) {
    acc += entry.chance;
    if (r <= acc) return entry.size;
  }

  // safety fallback
  return groupCombinations[groupCombinations.length - 1].size;
}

function createEnemyInstance(template, multiplier) {
  let randomMultiplier = 1;
  if (!template.isBoss && !template.isRare) {
    randomMultiplier += Math.random();
  }

  return {
    ...template,
    maxHp: Math.floor(template.hp * multiplier * randomMultiplier),
    atk: Math.floor(template.atk * multiplier),
    runes: Math.floor(template.runes * multiplier * randomMultiplier),
    hp: Math.floor(template.hp * multiplier * randomMultiplier),
  };
}

function spawnEnemyWithCompanions(template, multiplier, depth = 0, maxDepth = 3) {
  let group = [];

  // === Main enemy ===
  const enemy = createEnemyInstance(template, multiplier);
  group.push(enemy);

  // === Companion logic ===
  if (
    depth < maxDepth &&
    template.companion &&
    template.groupCombinations &&
    template.groupCombinations.length > 0
  ) {
    const companionCount = rollGroupSize(template.groupCombinations);

    for (let i = 0; i < companionCount; i++) {
      const compId =
        template.companion[
          Math.floor(Math.random() * template.companion.length)
        ];

      const compTemplate = MONSTERS[compId];
      if (!compTemplate) continue;

      const subGroup = spawnEnemyWithCompanions(
        compTemplate,
        multiplier,
        depth + 1,
        maxDepth
      );

      group.push(...subGroup);
    }
  }

  return group;
}

/* ============================
   MAIN SPAWN FUNCTION
============================ */

export const spawnMonster = (monsterId, sessionId) => {
  if (sessionId !== runtimeState.currentCombatSession) return;

  const template = MONSTERS[monsterId];
  const multiplier = Math.pow(1.25, runtimeState.currentLoopCount);

  // Determine base group size
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

  // === Build full enemy group ===
  runtimeState.currentEnemyGroup = [];

  for (let i = 0; i < groupSize; i++) {
    const subGroup = spawnEnemyWithCompanions(template, multiplier);
    runtimeState.currentEnemyGroup.push(...subGroup);
  }

  const firstEnemy = runtimeState.currentEnemyGroup[0];

  // Display name
  const displayCount = runtimeState.currentEnemyGroup.length;
  const groupSizeText = displayCount > 1 ? ` (x${displayCount})` : "";

  document.getElementById("enemy-name").innerText =
    runtimeState.currentLoopCount > 0
      ? `${firstEnemy.name}${groupSizeText} +${runtimeState.currentLoopCount}`
      : `${firstEnemy.name}${groupSizeText}`;

  updateHealthBars();

  // Passive effects from items
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

  // Spawn log
  ActionLog(
    displayCount > 1
      ? `Un Groupe mené par ${firstEnemy.isRare ? "⭐ " : ""}${displayCount} ${firstEnemy.name} apparaît !`
      : `Un ${firstEnemy.isRare ? "⭐ " + firstEnemy.name : firstEnemy.name} apparaît !`
  );

  setTimeout(() => combatLoop(sessionId), 500);
};
