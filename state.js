import { ITEMS } from "./gameData.js";

// Saved state
export let gameState = {
  runes: {
    banked: 0,
    carried: 0,
  },
  stats: {
    level: 0,
    vigor: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    critChance: 0.05,
    critDamage: 1.5,
  },
  equipped: {
    weapon: "fists",
    armor: null,
    accessory: null,
  },
  inventory: [{id: "fists", name: "poings", level: 10, count: 0}],
  world: {
    currentBiome: "limgrave_west",
    unlockedBiomes: ["limgrave_west"],
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
      gameState.world.unlockedBiomes = ["limgrave_west"];
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

export function getHealth(vigor) {
  return Math.floor(300 
      + 1650 * (1 - Math.exp(-0.035 * vigor)) 
      + 0.18 * vigor * vigor);
}
