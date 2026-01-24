import { ITEMS } from "./gameData.js";

// Saved state
export let gameState = {
  runes: {
    banked: 0,
    carried: 0,
  },
  stats: {
    vigor: 10,
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    critChance: 0.05,
    critDamage: 1.5,
  },
  equipped: [null, null, null],
  inventory: [],
  world: {
    currentBiome: "necrolimbe",
    unlockedBiomes: ["necrolimbe"],
    progress: 0,
    isExploring: false,
    checkpointReached: false,
  },
};

// Non-saved, runtime state
export const runtimeState = {
  currentEnemy: null,
  playerCurrentHp: 0,
  currentCombatSession: 0,
  currentLoopCount: 0,
};

export function setGameState(newState) {
  gameState = {
    ...gameState,
    ...newState,
    stats: { ...gameState.stats, ...newState.stats },
    world: { ...gameState.world, ...newState.world },
  };
}

export function getEffectiveStats() {
  let effStats = { ...gameState.stats, attacksPerTurn: 1 };

  gameState.equipped.forEach((itemId) => {
    if (itemId) {
      const itemInInv = gameState.inventory.find((i) => i.id === itemId);
      if (itemInInv && ITEMS[itemId]) {
        ITEMS[itemId].apply(effStats, itemInInv.level);
      }
    }
  });
  return effStats;
}
