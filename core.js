import { ASHES_OF_WAR } from "./ashes.js";
import {
  getTrialByBiome,
  markFinalBiomeCleared,
  markTrialCleared,
} from "./rebirth.js";
import { BIOMES, LOOT_TABLES } from "./biome.js";
import { ITEMS } from "./item.js";
import { devSpawnQueue, spawnMonster } from "./spawn.js";
import {
  gameState,
  getEffectiveStats,
  INT_RUNE_CAP,
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
import { MONSTERS } from "./monster.js";
import {
  addJournalEntry,
  applyPreparationLoadout,
  clearRunBuffs,
  describeHazards,
  getItemRarity,
  getItemRarityWeight,
  getRunModifier,
  getWeightedBiomeEvent,
  grantPreparationRewardForBiome,
  markCodexBiomeCleared,
  markCodexSetSeen,
  resolveBiomeEvent,
  syncCodexFromInventory,
} from "./systems.js";

// Helper to use offline-time bank to speed up timeouts when enabled.
function delayedSetTimeout(fn, ms) {
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
  } catch (e) {
    console.warn("delayedSetTimeout error:", e);
  }
  return setTimeout(fn, delay);
}

const dropItem = (itemId) => {
  const itemTemplate = ITEMS[itemId];
  if (!itemTemplate) return;
  let inventoryItem = gameState.inventory.find((item) => item.id === itemId);

  if (!inventoryItem) {
    gameState.inventory.push({
      id: itemId,
      name: itemTemplate.name,
      level: itemTemplate?.isAlwaysMax ? 10 : 1,
      count: 0,
    });
    addJournalEntry(
      "loot",
      "Butin notable",
      `${itemTemplate.name} rejoint votre arsenal (${getItemRarity(itemId)}).`,
      gameState.world.currentBiome,
    );
    ActionLog(`Vous avez trouvé : ${itemTemplate.name} !`);
  } else {
    if (inventoryItem.level >= 10) {
      if (inventoryItem.level > 10) inventoryItem.level = 10;
      ActionLog(`${itemTemplate.name} est déjà au niveau maximum (10) !`);
      const compensation = 7 * gameState.stats.level;
      gameState.runes.banked += compensation;
      ActionLog(
        `Vous recevez ${formatNumber(compensation)} runes en compensation.`,
      );
      saveGame();
      return;
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

  if (itemTemplate.set) {
    markCodexSetSeen(itemTemplate.set);
  }
  syncCodexFromInventory();
  updateUI();
};

const getWeightedDrop = (lootTable) => {
  const rarityBoost = getRunModifier("lootRarityBoost", 0);
  const weightedLoot = lootTable.map((item) => {
    const rarityWeight = getItemRarityWeight(getItemRarity(item.id || ""));
    return {
      ...item,
      chance: item.chance * (1 + rarityBoost * Math.max(0, rarityWeight - 1)),
    };
  });
  const totalWeight = weightedLoot.reduce((sum, item) => sum + item.chance, 0);
  let random = Math.random() * totalWeight;

  for (const item of weightedLoot) {
    if (random < item.chance) return item;
    random -= item.chance;
  }
  return weightedLoot[0];
};

export const handleDeath = () => {
  ActionLog(`Vous êtes mort. Les runes portées sont perdues ...`);
  addJournalEntry(
    "checkpoint",
    "Expedition interrompue",
    "Votre tentative s'effondre ici. Les runes portees sont perdues.",
    gameState.world.currentBiome,
  );
  const biomeAtDeath = gameState.world.currentBiome;
  gameState.runes.carried = 0;
  gameState.world.isExploring = false;
  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.ashesOfWaruses = {};
  runtimeState.playerArmorDebuff = 0;
  runtimeState.enemyIntent = null;
  clearRunBuffs();
  saveGame();

  // If offline-time use is enabled and we still have banked time, automatically
  // restart the exploration in the same biome. Otherwise return to camp as before.
  if (
    gameState.save?.useOfflineTime &&
    (gameState.save.offlineTimeBank || 0) > 0
  ) {
    delayedSetTimeout(() => {
      runtimeState.currentCombatSession++;
      startExploration(biomeAtDeath);
    }, 1000);
  } else {
    delayedSetTimeout(() => toggleView("camp"), 3000);
  }
};

export const handleDrops = (sessionId) => {
  const eff = getEffectiveStats();
  const intBonus =
    1 + Math.min(INT_RUNE_CAP, eff.intelligence / 100) + (eff.runeGainMult || 0);
  let wasABossEncounter = false;
  if (runtimeState.defeatedEnemies.length > 1) {
    ActionLog(`Vous avez triomphé ! Voici un détail des gains : `, "log-crit");
  }
  runtimeState.defeatedEnemies.forEach((enemy) => {
    if (enemy.isBoss) {
      wasABossEncounter = true;
    }
    const runesAwarded = Math.floor(enemy.runes * intBonus) || 1;
    gameState.runes.carried += Math.floor(runesAwarded);
    ActionLog(
      `${enemy.name} a été vaincu ! (+${formatNumber(runesAwarded)} runes)`,
      "log-runes",
    );
    if (enemy.isRare && enemy.drops) {
      enemy.drops.forEach((loot) => {
        if (loot.ashId) {
          if (
            !gameState.ashesOfWarOwned.includes(loot.ashId) &&
            Math.random() < loot.chance
          ) {
            gameState.ashesOfWarOwned.push(loot.ashId);
            ActionLog(
              `OBJET UNIQUE OBTENU : Cendre de Guerre - ${ASHES_OF_WAR[loot.ashId].name} !`,
              "log-crit",
            );
          }
        } else if (loot.id && Math.random() < loot.chance) {
          dropItem(loot.id);
        }
      });
    }
  });
  if (wasABossEncounter) {
    runtimeState.areaCleared = true;
  }
  runtimeState.defeatedEnemies = []; // Clear after processing
};

export const handleVictory = (sessionId) => {
  handleDrops(sessionId);
  gameState.ennemyEffects = [];
  runtimeState.playerArmorDebuff = 0;
  gameState.world.progress++;
  updateStepper();

  if (runtimeState.areaCleared) {
    markCodexBiomeCleared(gameState.world.currentBiome);
    runtimeState.areaCleared = false;
    runtimeState.usedRenaissance = false;
    runtimeState.usedAbsolution = false;
    gameState.runes.banked += gameState.runes.carried;
    gameState.runes.carried = 0;

    const currentBiome = BIOMES[gameState.world.currentBiome];
    gameState.world.rareSpawnsCount = 0;
    runtimeState.ashUsesLeft = gameState.equippedAsh
      ? ASHES_OF_WAR[gameState.equippedAsh].maxUses
      : 0;

    ActionLog("BOSS VAINCU !");
    addJournalEntry(
      "checkpoint",
      "Biome nettoye",
      `${currentBiome.name} cede enfin. Les routes changent autour de vous.`,
      gameState.world.currentBiome,
    );
    const biomeId = gameState.world.currentBiome;
    const trial = getTrialByBiome(biomeId);
    if (trial) {
      if (markTrialCleared(trial.id)) {
        ActionLog(`EPREUVE ACCOMPLIE : ${trial.name} !`, "log-crit");
        addJournalEntry(
          "checkpoint",
          "Epreuve accomplie",
          `${trial.name} tombe. Rien a ramasser : c'etait le but.`,
          biomeId,
        );
      } else {
        ActionLog(`${trial.name} tombe a nouveau.`, "log-crit");
      }
    } else if (markFinalBiomeCleared(biomeId)) {
      ActionLog(
        "La route est achevee. La Renaissance vous attend au camp.",
        "log-crit",
      );
    }

    const prepUnlocks = grantPreparationRewardForBiome(gameState.world.currentBiome);
    if (prepUnlocks.length) {
      ActionLog(
        `Nouvelle preparation disponible : ${prepUnlocks.join(", ")}.`,
        "log-crit",
      );
    }

    if (currentBiome.unlocks) {
      let newlyUnlockedCount = 0;

      currentBiome.unlocks.forEach((biomeId) => {
        // On vérifie si le biome existe et s'il n'est pas déjà débloqué
        if (
          BIOMES[biomeId] &&
          !gameState.world.unlockedBiomes.includes(biomeId)
        ) {
          gameState.world.unlockedBiomes.push(biomeId);
          addJournalEntry(
            "unlock",
            "Nouveau biome",
            `${BIOMES[biomeId].name} rejoint votre atlas de campagne.`,
            biomeId,
          );
          ActionLog(`Nouvelle zone découverte : ${BIOMES[biomeId].name} !`);
          newlyUnlockedCount++;
        }
      });

      // Si au moins une zone a été découverte, on fait l'annonce et on sauvegarde
      if (newlyUnlockedCount > 0) {
        sendDiscordAnnouncement(MONSTERS[currentBiome.boss].name);
        saveGame();
        updateUI();
      }
    }

    const currentLootTable = LOOT_TABLES[gameState.world.currentBiome];
    if (currentLootTable) {
      const eligibleLoot = currentLootTable.filter((lootItem) => {
        const inventoryItem = gameState.inventory.find(
          (i) => i.id === lootItem.id,
        );
        return !inventoryItem || inventoryItem.level < 10;
      });

      let itemToDrop;
      if (eligibleLoot.length > 0) {
        const rolled = getWeightedDrop(eligibleLoot);
        itemToDrop = rolled.id;
      } else {
        itemToDrop = "rune_fragment";
      }

      dropItem(itemToDrop);
      saveGame();
    }

    runtimeState.currentLoopCount++;
    gameState.world.progress = 0;
    gameState.world.checkpointReached = false;

    updateCycleDisplay();

    ActionLog(`--- DÉBUT DU CYCLE ${runtimeState.currentLoopCount + 1} ---`);

    delayedSetTimeout(() => {
      updateStepper();
      nextEncounter(sessionId);
    }, 3000);
  } else {
    delayedSetTimeout(() => nextEncounter(sessionId), 1000);
  }
  updateUI();
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

  delayedSetTimeout(() => {
    container.classList.remove("blink-effect");
    ActionLog("Site de grâce touché. Runes sécurisées.");
    addJournalEntry(
      "checkpoint",
      "Site de grace",
      "Vous sécurisez vos runes et reformez votre souffle avant la seconde moitié du biome.",
      gameState.world.currentBiome,
    );
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
  if (devSpawnQueue.length > 0) {
    const devMonsterId = devSpawnQueue.shift();
    spawnMonster(devMonsterId, sessionId);
    return;
  }

  if (gameState.world.progress >= biome.length) {
    spawnMonster(biome.boss, sessionId);
    return;
  }

  const canTriggerEvent =
    gameState.world.progress > 0 &&
    gameState.world.progress !== gameState.world.lastEventProgress &&
    Math.random() < 0.22;

  if (canTriggerEvent) {
    const eventDef = getWeightedBiomeEvent(gameState.world.currentBiome);
    const eventResult = resolveBiomeEvent(eventDef, gameState.world.currentBiome);
    gameState.world.lastEventProgress = gameState.world.progress;

    if (eventResult?.log) {
      ActionLog(eventResult.log, "log-event");
    }

    if (eventResult?.applyHazard) {
      const hazardMap = {
        poison: "POISON",
        gel: "FROSTBITE",
        folie: "STUN",
        putrefaction: "SCARLET_ROT",
      };
      if (hazardMap[eventResult.applyHazard]) {
        gameState.playerEffects.push({
          id: hazardMap[eventResult.applyHazard],
          duration: eventResult.hazardValue || 1,
        });
      }
      updateHealthBars();
      updateUI();
    }

    if (eventResult?.forceRare && biome.rareMonsters?.length) {
      const rareId =
        biome.rareMonsters[Math.floor(Math.random() * biome.rareMonsters.length)];
      gameState.world.rareSpawnsCount++;
      spawnMonster(rareId, sessionId);
      return;
    }
  }

  const canSpawnRare =
    biome.rareMonsters &&
    gameState.world.rareSpawnsCount < (biome.maxRareSpawns || 0);

  const rareSpawnChance = 0.15 * getRunModifier("rareChanceMult", 1);
  if (canSpawnRare && Math.random() < rareSpawnChance) {
    const rareId =
      biome.rareMonsters[Math.floor(Math.random() * biome.rareMonsters.length)];
    if (!MONSTERS[rareId]) {
      console.log(`ENNEMI INCONNU : ${rareId}`);
      nextEncounter(sessionId);
      return;
    }
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
  runtimeState.usedRenaissance = false;
  const sessionAtStart = runtimeState.currentCombatSession;
  const biome = BIOMES[biomeId];
  clearRunBuffs();
  gameState.world.isExploring = true;
  gameState.world.currentBiome = biomeId;
  gameState.world.progress = 0;
  gameState.world.checkpointReached = false;
  gameState.world.activeBiomeHazards = biome.hazards || [];
  gameState.world.lastEventProgress = -1;
  runtimeState.defeatedEnemies = [];
  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.world.rareSpawnsCount = 0;
  runtimeState.enemyIntent = null;
  const selectedAsh = ASHES_OF_WAR[gameState.equippedAsh];
  runtimeState.ashUsesLeft = selectedAsh ? selectedAsh.maxUses : 0;
  runtimeState.ashIsPrimed = false;
  runtimeState.nextNbAtkBonus = 0;
  applyPreparationLoadout();

  runtimeState.playerCurrentHp = getHealth(getEffectiveStats().vigor);

  document.getElementById("action-log").innerHTML = "";

  toggleView("biome");

  document.getElementById("current-biome-text").innerText = biome.name;
  addJournalEntry(
    "departure",
    "Depart de biome",
    `Vous entrez dans ${biome.name}. Dangers dominants : ${describeHazards(biomeId)}.`,
    biomeId,
  );

  updateHealthBars();
  updateStepper();

  nextEncounter(sessionAtStart);
};

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1467277773524566066/xGqF5Tb3YrQ7CKU5f50pdOdLsQsp3c0AUIBMJOE_i3_KDCV4B8Y0UqqdpgpVbDBaH0Ec";

async function sendDiscordAnnouncement(bossName) {
  // const message = {
  //   content: `🔥 **ANNONCE DE GRÂCE** 🔥\nUn Sans-éclat a terrassé pour la première fois **${bossName}** !`,
  // };

  // try {
  //   // On passe par un proxy pour éviter l'erreur CORS
  //   const proxyUrl =
  //     "https://corsproxy.io/?" + encodeURIComponent(DISCORD_WEBHOOK_URL);

  //   const response = await fetch(proxyUrl, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify(message),
  //   });

  //   if (response.ok) {
  //     console.log("✅ Annonce Discord envoyée !");
  //   }
  // } catch (err) {
  //   console.error("❌ Erreur lors de l'envoi Discord :", err);
  // }

  return;
}
