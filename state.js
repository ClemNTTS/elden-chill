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
  equipped: {
    weapon: null,
    armor: null,
    accessory: null,
  },
  inventory: [],
  world: {
    currentBiome: "necrolimbe",
    unlockedBiomes: ["necrolimbe"],
    progress: 0,
    isExploring: false,
    checkpointReached: false,
    rareSpawnsCount: 0,
  },
  playerEffects: [],
  ennemyEffects: [],
  ashesOfWaruses: {},
};

// Non-saved, runtime state
export const runtimeState = {
  currentEnemy: null,
  playerCurrentHp: 0,
  currentCombatSession: 0,
  currentLoopCount: 0,
};

export function setGameState(newState) {
  if (newState.runes) Object.assign(gameState.runes, newState.runes);
  if (newState.stats) Object.assign(gameState.stats, newState.stats);
  if (newState.equipped) Object.assign(gameState.equipped, newState.equipped);
  if (newState.playerEffects)
    Object.assign(gameState.playerEffects, newState.playerEffects);
  if (newState.ennemyEffects)
    Object.assign(gameState.ennemyEffects, newState.ennemyEffects);

  if (newState.ashesOfWaruses)
    Object.assign(gameState.ashesOfWaruses, newState.ashesOfWaruses);

  if (newState.world) {
    Object.assign(gameState.world, newState.world);
    if (
      !gameState.world.unlockedBiomes ||
      gameState.world.unlockedBiomes.length === 0
    ) {
      gameState.world.unlockedBiomes = ["necrolimbe"];
    }
  }

  gameState.inventory = newState.inventory || [];
}

export function getEffectiveStats() {
  let effStats = { ...gameState.stats, attacksPerTurn: 1 };

  Object.values(gameState.equipped).forEach((itemId) => {
    if (itemId) {
      const itemInInv = gameState.inventory.find((i) => i.id === itemId);
      if (itemInInv && ITEMS[itemId]) {
        ITEMS[itemId].apply(effStats, itemInInv.level);
      }
    }
  });
  return effStats;
}
