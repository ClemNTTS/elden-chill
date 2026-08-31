import { ITEM_SETS } from "./constants.js";
import { ITEMS } from "./item.js";
import { applyPreparationStats } from "./systems.js";
import { DEFAULT_PLAYER_PROFILE } from "./shared/player-profile.js";

// Saved state
export const DEFAULT_GAME_STATE = JSON.parse(
  JSON.stringify(DEFAULT_PLAYER_PROFILE),
);

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
  enemyIntent: null,
  combatFrozen: false,
  playerArmorDebuff: 0,
  nextAtkMultBonus: 1,
  nextNbAtkBonus: 0,
  usedRenaissance: false,
  usedAbsolution: false,
  filterChanged: false,
  offlineSpeedMultiplier: 3, // default speed multiplier when using offline bank (reduced to x3)
};

export function setGameState(newState) {
  // Deux pieges evites ici, tous deux visibles a la remise a zero :
  //
  // 1. Tester la verite de la valeur (`if (newState.equippedAsh)`) empeche
  //    toute remise a null. Une cendre restait equipee apres un reset. On
  //    teste donc la PRESENCE de la cle, pas sa valeur.
  // 2. Object.assign sur un tableau recopie les indices mais ne raccourcit
  //    jamais la cible : charger un profil avec moins d'elements laissait des
  //    entrees perimees a la fin. Les tableaux sont remplaces, pas fusionnes.
  const mergeObject = (key) => {
    if (key in newState && newState[key] && typeof newState[key] === "object") {
      Object.assign(gameState[key], newState[key]);
    }
  };

  const replaceArray = (key, fallback = []) => {
    if (key in newState) {
      gameState[key] = Array.isArray(newState[key])
        ? [...newState[key]]
        : fallback;
    }
  };

  ["runes", "stats", "equipped", "ui", "preparation", "journal", "codex", "save"]
    .forEach(mergeObject);

  mergeObject("ashesOfWaruses");

  replaceArray("playerEffects");
  replaceArray("ennemyEffects");
  replaceArray("ashesOfWarOwned");
  replaceArray("order");

  if ("equippedAsh" in newState) {
    gameState.equippedAsh = newState.equippedAsh ?? null;
  }

  if (newState.world) {
    Object.assign(gameState.world, newState.world);
    if (
      !gameState.world.unlockedBiomes ||
      gameState.world.unlockedBiomes.length === 0
    ) {
      gameState.world.unlockedBiomes = ["limgrave_west"];
    }
  }

  gameState.inventory = Array.isArray(newState.inventory)
    ? [...newState.inventory]
    : [];
}

export function getEffectiveStats() {
  let effStats = {
    ...gameState.stats,
    attacksPerTurn: 1,
    runeGainMult: 0,
    bossMitigation: 0,
    resistances: {
      poison: 0,
      gel: 0,
      folie: 0,
      putrefaction: 0,
    },
  };

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

  // 1. Bonus "Flat" (Additions fixes des objets)
  applyItemBonus("applyFlat");

  // 2. Scaling de base des attributs (Dex -> Armure/Force, Int -> Force)
  effStats.armor += Math.floor((gameState.stats.dexterity * 0.5) / 4);
  effStats.strength += Math.floor(
    gameState.stats.dexterity / 4 + gameState.stats.intelligence / 4,
  );

  // 3. LOGIQUE DES PANOPLIES (SETS)
  const setCounts = {};
  Object.values(gameState.equipped).forEach((itemId) => {
    if (itemId && ITEMS[itemId]?.set) {
      const setName = ITEMS[itemId].set;
      setCounts[setName] = (setCounts[setName] || 0) + 1;
    }
  });

  Object.keys(setCounts).forEach((setName) => {
    const count = setCounts[setName];
    const setDef = ITEM_SETS[setName];
    if (setDef && setDef.bonuses) {
      // On applique chaque palier atteint (ex: bonus de 2 pièces, puis de 3)
      for (let i = 1; i <= count; i++) {
        if (setDef.bonuses[i] && setDef.bonuses[i].effect) {
          setDef.bonuses[i].effect(effStats);
        }
      }
    }
  });

  // 4. Bonus "Mult" (Multiplicateurs % des objets)
  applyItemBonus("applyMult");

  // 5. Arrondi final pour éviter les PV/Dégâts à virgule
  const keysToFloor = [
    "strength",
    "vigor",
    "dexterity",
    "intelligence",
    "armor",
    "splashDamage",
  ];
  keysToFloor.forEach((key) => {
    if (effStats[key] !== undefined) effStats[key] = Math.round(effStats[key]);
  });

  if (gameState.playerEffects.some((e) => e.id === "DEW_PROTECTION")) {
    effStats.armor += 50;
  }

  applyPreparationStats(effStats);

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
