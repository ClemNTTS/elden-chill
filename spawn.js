import { applyTraitsToEnemy } from "./biome-traits.js";
import { combatLoop } from "./combat.js";
import { ITEMS } from "./item.js";
import { MONSTERS } from "./monster.js";
import { runtimeState } from "./state.js";
import { gameState } from "./state.js";
import {
  buildEnemyIntent,
  getBiomeHazards,
  markCodexBossSeen,
  markCodexMonsterSeen,
} from "./systems.js";
import { ActionLog, updateHealthBars, updateUI } from "./ui.js";

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

  return applyTraitsToEnemy({
    ...template,
    maxHp: Math.floor(template.hp * multiplier * randomMultiplier),
    atk: Math.floor(template.atk * multiplier),
    runes: Math.floor(template.runes * multiplier * randomMultiplier),
    hp: Math.floor(template.hp * multiplier * randomMultiplier),
  });
}

function spawnEnemyWithCompanions(
  template,
  multiplier,
  depth = 0,
  maxDepth = 3,
) {
  const group = [];

  // === Main enemy ===
  const enemy = createEnemyInstance(template, multiplier);
  group.push(enemy);

  // === Companion logic ===
  if (depth < maxDepth && template.companion) {
    const companionCount =
      template.companionCount !== undefined
        ? template.companionCount
        : template.groupCombinations
          ? rollGroupSize(template.groupCombinations)
          : 1;

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
        maxDepth,
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

  runtimeState.usedAbsolution = false;

  const template = MONSTERS[monsterId];
  // Un identifiant absent du bestiaire plantait le combat sur la ligne
  // suivante (`template.groupCombinations` sur undefined). C'est arrive en
  // vrai : les Cimes des Geants referencaient "mountaintops_bird", qui
  // n'existait pas. On echoue bruyamment dans la console plutot que de casser
  // l'expedition en cours.
  if (!template) {
    console.error(`[spawn] monstre inconnu : "${monsterId}"`);
    return;
  }
  const multiplier = 1.25 ** runtimeState.currentLoopCount;

  let groupSize = 1;
  if (template.groupCombinations) {
    groupSize = rollGroupSize(template.groupCombinations);
  }

  const primaryEnemies = [];
  const companions = [];

  for (let i = 0; i < groupSize; i++) {
    const result =
      i === 0
        ? spawnEnemyWithCompanions(template, multiplier, 0)
        : spawnEnemyWithCompanions(template, multiplier, 3);

    primaryEnemies.push(result[0]);

    if (i === 0 && result.length > 1) {
      companions.push(...result.slice(1));
    }
  }

  runtimeState.currentEnemyGroup = [...primaryEnemies, ...companions];
  const biomeHazards = getBiomeHazards(gameState.world.currentBiome);

  runtimeState.currentEnemyGroup.forEach((enemy) => {
    if (!enemy.onHitEffect && biomeHazards.length) {
      const dominant = biomeHazards[0];
      const hazardMap = {
        poison: { id: "POISON", duration: 2, chance: 0.2 },
        gel: { id: "FROSTBITE", duration: 3, chance: 0.2 },
        folie: { id: "STUN", duration: 1, chance: 0.18 },
        putrefaction: { id: "SCARLET_ROT", duration: 2, chance: 0.18 },
      };
      if (hazardMap[dominant]) {
        enemy.onHitEffect = hazardMap[dominant];
      }
    }

    if (enemy.isBoss) {
      markCodexBossSeen(monsterId, gameState.world.currentBiome);
    } else {
      markCodexMonsterSeen(monsterId, gameState.world.currentBiome);
    }
  });

  const firstEnemy = runtimeState.currentEnemyGroup[0];
  const displayCount = runtimeState.currentEnemyGroup.length;
  const groupSizeText = displayCount > 1 ? ` (x${displayCount})` : "";

  document.getElementById("enemy-name").innerText =
    runtimeState.currentLoopCount > 0
      ? `${firstEnemy.name}${groupSizeText} +${runtimeState.currentLoopCount}`
      : `${firstEnemy.name}${groupSizeText}`;

  updateHealthBars();

  Object.values(gameState.equipped).forEach((itemId) => {
    const item = ITEMS[itemId];
    if (item?.passiveStatus) {
      const statusId = item.passiveStatus;
      const hasEffect = gameState.playerEffects.some((e) => e.id === statusId);
      if (!hasEffect) {
        gameState.playerEffects.push({ id: statusId, duration: 999 });
      }
    }
  });

  if (template.passiveStatus) {
    const statusId = template.passiveStatus;
    const hasEffect = gameState.ennemyEffects.some((e) => e.id === statusId);
    if (!hasEffect) {
      gameState.ennemyEffects.push({ id: statusId, duration: 999 });
    }
  }

  updateUI();
  buildEnemyIntent(firstEnemy);

  ActionLog(
    displayCount > 1
      ? `Un Groupe de ${displayCount} ennemis mené par ${firstEnemy.isRare ? "⭐ " : ""}${firstEnemy.name} apparaît !`
      : `Un ${firstEnemy.isRare ? "⭐ " + firstEnemy.name : firstEnemy.name} apparaît !`,
  );

  // Use offline bank to accelerate initial combat start if enabled
  const delayed = (fn, ms) => {
    let delay = ms;
    try {
      const save = gameState.save || {};
      const use =
        save.useOfflineTime &&
        (save.offlineTimeBank || 0) > 0 &&
        gameState.world.isExploring;
      const M = runtimeState.offlineSpeedMultiplier || 3;
      if (use && M > 1 && ms > 0) {
        const fullSavedMs = Math.max(0, ms - Math.floor(ms / M));
        const bankMs = (save.offlineTimeBank || 0) * 1000;
        if (bankMs >= fullSavedMs) {
          delay = Math.max(0, Math.floor(ms / M));
          save.offlineTimeBank = Math.max(
            0,
            (save.offlineTimeBank || 0) - fullSavedMs / 1000,
          );
        } else if (bankMs > 0) {
          delay = Math.max(0, Math.floor(ms - bankMs));
          save.offlineTimeBank = 0;
        }
        try {
          updateUI();
        } catch (e) {}
      }
    } catch (e) {}
    return setTimeout(fn, delay);
  };

  delayed(() => combatLoop(sessionId), 500);
};
