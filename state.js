import { ITEMS } from "./item.js";

// Saved state
export const DEFAULT_GAME_STATE = {
  runes: {
    banked: 0,
    carried: 0,
  },
  stats: {
    level: 0,
    runesSpent: 0,
    vigor: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    critChance: 0.05,
    critDamage: 1.5,
    splashDamage: 0,
    flatDamageReduction: 0,
    percentDamageReduction: 0,
    flatDamagePenetration: 0,
    percentDamagePenetration: 0,
  },
  equipped: {
    weapon: "fists",
    armor: null,
    accessory: null,
  },
  inventory: [{ id: "fists", name: "poings", level: 10, count: 0 }],
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
  ashesOfWarOwned: [],
  equippedAsh: null,
  save: {},
};

export let gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE));

// Non-saved, runtime state
export const runtimeState = {
  currentEnemyGroup: [],
  lastDefeatedEnemy: null,
  playerCurrentHp: 0,
  currentCombatSession: 0,
  currentLoopCount: 0,
  ashUsesLeft: 0,
  ashIsPrimed: false,
  combatFrozen: false,
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
  if (newState.ashesOfWarOwned)
    Object.assign(gameState.ashesOfWarOwned, newState.ashesOfWarOwned);
  if (newState.equippedAsh) gameState.equippedAsh = newState.equippedAsh;

  if (newState.save) Object.assign(gameState.save, newState.save);

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

  const applyItemBonus = (type) => {
    Object.keys(gameState.equipped).forEach((slotType) => {
      const itemId = gameState.equipped[slotType];
      const itemData = ITEMS[itemId];

      if (itemData && itemData[type]) {
        const invItem = gameState.inventory.find((i) => i.id === itemId);
        const level = invItem ? invItem.level : 1;

        itemData[type](effStats, level);
      }
    });
  };

  // Premier passage : Les bonus "Flat" (additions)
  applyItemBonus("applyFlat");

  // Second passage : Les bonus "Mult" (multiplications)
  applyItemBonus("applyMult");

  return effStats;
}

export function getHealth(vigor) {
  return Math.floor(
    300 + 1650 * (1 - Math.exp(-0.035 * vigor)) + 0.18 * vigor * vigor,
  );
}
