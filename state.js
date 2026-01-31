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
    armor: 100,
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
  save: {
    version: "0.0.6",
  },
};

export let gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE));

// Non-saved, runtime state
export const runtimeState = {
  currentEnemyGroup: [],
  defeatedEnemies: [],
  areaCleared: false,
  playerCurrentHp: 0,
  currentCombatSession: 0,
  currentLoopCount: 0,
  ashUsesLeft: 0,
  ashIsPrimed: false,
  combatFrozen: false,
  playerArmorDebuff: 0,
  nextAtkMultBonus: 1,
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
  effStats.armor += Math.floor((gameState.stats.dexterity * 0.5) / 4);

  effStats.strength += Math.floor(
    gameState.stats.dexterity / 4 + gameState.stats.intelligence / 4,
  );

  // Second passage : Les bonus "Mult" (multiplications)
  applyItemBonus("applyMult");

  //floor toutes les stats
  Object.keys(effStats).forEach((key) => {
    if (
      key === "strength" ||
      key === "vigor" ||
      key === "dexterity" ||
      key === "intelligence"
    ) {
      effStats[key] = Math.floor(effStats[key]);
    }
  });

  return effStats;
}

export function getHealth(vigor) {
  let hp = 300;

  if (vigor <= 40) {
    hp += vigor * 45;
  } else if (vigor <= 60) {
    hp += 2200 + (vigor - 40) * 35;
  } else {
    hp += 3000 + (vigor - 60) * 25;
  }

  return Math.floor(hp);
}
