import { ASHES_OF_WAR } from "./ashes.js";
import {
  getFerveurBoostRarete,
  getFerveurLibelle,
  getFerveurRang,
  getFerveurTiragesButin,
  getPrimeFerveur,
} from "./escalation.js";
import { playSfx } from "./sfx.js";
import { getTraitRunBuffs } from "./biome-traits.js";
import {
  MAIN_BOSS_BIOMES,
  getProgressionCap,
  getRebirthAshBonus,
  getRebirthRareMult,
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
import { proposerContrat, signalerContrat } from "./actions.js";
import {
  ActionLog,
  formatNumber,
  toggleView,
  triggerShake,
  updateCycleDisplay,
  updateHealthBars,
  showEventBanner,
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
  registerRunBuff,
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
  const inventoryItem = gameState.inventory.find((item) => item.id === itemId);

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
    playSfx("loot");
  } else {
    if (inventoryItem.level >= 10) {
      if (inventoryItem.level > 10) inventoryItem.level = 10;
      ActionLog(`${itemTemplate.name} est déjà au niveau maximum (10) !`);
      /*
       * Indexee sur la valeur du biome, pas sur le niveau.
       *
       * L'ancienne formule, 7 x niveau, plafonnait a environ 1 500 runes en
       * fin de parcours, quand un simple monstre standard de Farum Azula en
       * donne 55 000 : le butin cessait d'avoir la moindre valeur des que
       * l'equipement etait maxe, c'est-a-dire exactement au moment ou il
       * tombe le plus souvent.
       */
      const biomeUnit =
        MONSTERS[BIOMES[gameState.world.currentBiome]?.monsters?.[0]]?.runes ||
        7 * gameState.stats.level;
      const compensation = Math.floor(biomeUnit);
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
  const rarityBoost =
    getRunModifier("lootRarityBoost", 0) +
    getFerveurBoostRarete(runtimeState.currentLoopCount);
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

/** Morts consecutives sans progresser avant de couper la relance automatique. */
const MAX_AUTO_DEATHS = 5;

export const handleDeath = () => {
  playSfx("death");
  ActionLog("Vous êtes mort. Les runes portées sont perdues ...");
  addJournalEntry(
    "checkpoint",
    "Expedition interrompue",
    "Votre tentative s'effondre ici. Les runes portees sont perdues.",
    gameState.world.currentBiome,
  );
  const biomeAtDeath = gameState.world.currentBiome;
  gameState.runes.carried = 0;
  // La reserve de Ferveur part avec l'expedition : c'est tout l'enjeu.
  if (runtimeState.ferveurBank > 0) {
    ActionLog(
      `Ferveur perdue : ${formatNumber(Math.floor(runtimeState.ferveurBank))} runes de prime s'evanouissent.`,
      "log-crit",
    );
    runtimeState.ferveurBank = 0;
  }
  gameState.world.isExploring = false;
  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.ashesOfWaruses = {};
  runtimeState.playerArmorDebuff = 0;
  runtimeState.enemyIntent = null;
  clearRunBuffs();
  saveGame();

  /*
   * Relance automatique.
   *
   * Le garde-fou n'est pas decoratif : sans lui, un joueur qui active la
   * relance sur un biome trop dur boucle indefiniment sur sa propre mort sans
   * jamais s'en apercevoir. Au bout de MAX_AUTO_DEATHS morts consecutives sans
   * avoir boucle un seul cycle, on coupe et on le dit.
   *
   * Le compteur se remet a zero des qu'un cycle est nettoye (handleVictory).
   */
  const auto = gameState.automation;
  if (auto?.autoRestart) {
    runtimeState.autoRestartDeaths = (runtimeState.autoRestartDeaths || 0) + 1;
    if (runtimeState.autoRestartDeaths >= MAX_AUTO_DEATHS) {
      auto.autoRestart = false;
      runtimeState.autoRestartDeaths = 0;
      ActionLog(
        `Relance automatique coupee apres ${MAX_AUTO_DEATHS} morts sans progresser.`,
        "log-crit",
      );
      saveGame();
      delayedSetTimeout(() => toggleView("camp"), 2500);
      updateUI();
      return;
    }
    ActionLog("Relance automatique de l'expedition...", "log-runes");
    delayedSetTimeout(() => {
      runtimeState.currentCombatSession++;
      startExploration(biomeAtDeath);
    }, 2000);
    updateUI();
    return;
  }

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
    1 +
    Math.min(INT_RUNE_CAP, eff.intelligence / 100) +
    (eff.runeGainMult || 0);
  let wasABossEncounter = false;
  if (runtimeState.defeatedEnemies.length > 1) {
    ActionLog("Vous avez triomphé ! Voici un détail des gains : ", "log-crit");
  }
  runtimeState.defeatedEnemies.forEach((enemy) => {
    if (enemy.isBoss) {
      wasABossEncounter = true;
      /*
       * On note le biome, pas le boss : c'est le biome qui figure dans la
       * liste des boss principaux, et deux zones peuvent partager un modele
       * de creature.
       */
      const zone = gameState.world.currentBiome;
      if (!gameState.world.defeatedBosses) gameState.world.defeatedBosses = [];
      if (zone && !gameState.world.defeatedBosses.includes(zone)) {
        gameState.world.defeatedBosses.push(zone);
        // getProgressionCap() relit la liste qu'on vient d'etendre, donc la
        // valeur annoncee est deja la nouvelle.
        if (MAIN_BOSS_BIOMES.includes(zone)) {
          ActionLog(
            `Le chemin s'ouvre : niveau maximum porte a ${getProgressionCap()}.`,
            "log-crit",
          );
        }
      }
    }
    const runesAwarded = Math.floor(enemy.runes * intBonus) || 1;
    gameState.runes.carried += Math.floor(runesAwarded);
    /*
     * La prime de Ferveur ne passe PAS par runes.carried : celles-ci sont
     * encaissees a chaque cycle nettoye, ce qui la mettrait aussitot a l'abri
     * et supprimerait le pari. Elle attend dans une reserve a part, versee au
     * repli volontaire et perdue a la mort. Voir escalation.js.
     */
    signalerContrat("monstre", 1, gameState.world.currentBiome);
    if (enemy.isRare) signalerContrat("rare", 1, gameState.world.currentBiome);
    if (enemy.isBoss) signalerContrat("boss", 1, gameState.world.currentBiome);

    const prime = getPrimeFerveur(runesAwarded, runtimeState.currentLoopCount);
    if (prime > 0) {
      runtimeState.ferveurBank += prime;
    }
    ActionLog(
      `${enemy.name} a été vaincu ! (+${formatNumber(runesAwarded)} runes${
        prime > 0 ? ` · +${formatNumber(prime)} en Ferveur` : ""
      })`,
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

/**
 * Verse la reserve de Ferveur au coffre. A n'appeler que sur un repli
 * VOLONTAIRE : c'est la seule facon de securiser la prime.
 */
export const encaisserFerveur = (raison = "Repli") => {
  const montant = Math.floor(runtimeState.ferveurBank || 0);
  if (montant <= 0) {
    runtimeState.ferveurBank = 0;
    return 0;
  }
  gameState.runes.banked += montant;
  runtimeState.ferveurBank = 0;
  ActionLog(
    `${raison} : ${formatNumber(montant)} runes de Ferveur mises a l'abri.`,
    "log-runes",
  );
  addJournalEntry(
    "checkpoint",
    "Ferveur encaissee",
    `Vous rentrez avec ${formatNumber(montant)} runes de prime.`,
    gameState.world.currentBiome,
  );
  return montant;
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
    if (gameState.runes.carried > 0) playSfx("runes");
    gameState.runes.banked += gameState.runes.carried;
    gameState.runes.carried = 0;

    const currentBiome = BIOMES[gameState.world.currentBiome];
    gameState.world.rareSpawnsCount = 0;
    runtimeState.ashUsesLeft = gameState.equippedAsh
      ? ASHES_OF_WAR[gameState.equippedAsh].maxUses + getRebirthAshBonus()
      : 0;

    ActionLog("BOSS VAINCU !");
    playSfx("bossDown");
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

    const prepUnlocks = grantPreparationRewardForBiome(
      gameState.world.currentBiome,
    );
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
      /*
       * Les tables acceptent desormais des cendres (`ashId`) en plus des
       * objets. Sans ca, les cendres ne pouvaient tomber que des monstres
       * rares, et une entree `{ id: "great_shield" }` — une cendre glissee
       * dans la table de Caelid Ouest — etait silencieusement perdue :
       * dropItem() sort sans rien dire sur un identifiant inconnu.
       */
      const eligibleLoot = currentLootTable.filter((lootItem) => {
        if (lootItem.ashId) {
          return !gameState.ashesOfWarOwned.includes(lootItem.ashId);
        }
        const inventoryItem = gameState.inventory.find(
          (i) => i.id === lootItem.id,
        );
        return !inventoryItem || inventoryItem.level < 10;
      });

      /*
       * lootChanceMult donne des TIRAGES supplementaires.
       *
       * Le trait "Offrande bestiale" annonçait +120% de chance de butin et
       * posait lootChanceMult: 2.2, que rien ne lisait. Il n'y avait de toute
       * facon aucune chance a multiplier : le butin tombe systematiquement a
       * la fin d'un biome, getWeightedDrop choisit lequel et non si.
       *
       * 2.2 se lit donc : deux objets garantis, plus 20% de chance d'un
       * troisieme.
       */
      const tirages =
        Math.max(1, getRunModifier("lootChanceMult", 1)) +
        getFerveurTiragesButin(runtimeState.currentLoopCount);
      const garantis = Math.floor(tirages);
      const total = garantis + (Math.random() < tirages - garantis ? 1 : 0);

      for (let n = 0; n < total; n += 1) {
        const rolled =
          eligibleLoot.length > 0 ? getWeightedDrop(eligibleLoot) : null;
        if (rolled?.ashId) {
          if (!gameState.ashesOfWarOwned.includes(rolled.ashId)) {
            gameState.ashesOfWarOwned.push(rolled.ashId);
            ActionLog(
              `CENDRE DE GUERRE OBTENUE : ${ASHES_OF_WAR[rolled.ashId].name} !`,
              "log-crit",
            );
          }
        } else {
          dropItem(rolled?.id || "rune_fragment");
        }
      }
      saveGame();
    }

    runtimeState.currentLoopCount++;
    signalerContrat("cycle", 1, gameState.world.currentBiome);
    /*
     * La Ferveur se signale en PALIER atteint et non en increment : c'est un
     * rang courant, pas un cumul. avancerContrat le sait et prend le maximum.
     */
    signalerContrat(
      "ferveur",
      getFerveurRang(runtimeState.currentLoopCount),
      gameState.world.currentBiome,
    );
    gameState.world.progress = 0;
    gameState.world.checkpointReached = false;
    // Un cycle boucle : l'expedition progresse, le garde-fou repart de zero.
    runtimeState.autoRestartDeaths = 0;

    updateCycleDisplay();

    /*
     * Repli automatique. Les runes portees sont encaissees a chaque cycle
     * nettoye, mais celles du cycle en cours sont perdues a la mort : pouvoir
     * s'arreter a un nombre de cycles choisi evite de tout risquer en boucle.
     */
    const stopAt = gameState.automation?.stopAfterCycle || 0;
    if (stopAt > 0 && runtimeState.currentLoopCount >= stopAt) {
      ActionLog(
        `Objectif de ${stopAt} cycle(s) atteint : repli au camp.`,
        "log-crit",
      );
      encaisserFerveur("Objectif de cycles atteint");
      gameState.world.isExploring = false;
      clearRunBuffs();
      saveGame();
      delayedSetTimeout(() => toggleView("camp"), 1500);
      updateUI();
      return;
    }

    ActionLog(`--- DÉBUT DU CYCLE ${runtimeState.currentLoopCount + 1} ---`);
    if (runtimeState.currentLoopCount > 0) {
      ActionLog(
        getFerveurLibelle(runtimeState.currentLoopCount),
        "log-ash-activation",
      );
    }

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
    const eventResult = resolveBiomeEvent(
      eventDef,
      gameState.world.currentBiome,
    );
    gameState.world.lastEventProgress = gameState.world.progress;

    if (eventResult?.log) {
      ActionLog(eventResult.log, "log-event");
      // Le journal seul ne suffisait pas : la banniere rend l'evenement visible.
      showEventBanner({
        title: eventDef?.title,
        kind: eventDef?.kind,
        text: eventResult.log,
      });
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
        biome.rareMonsters[
          Math.floor(Math.random() * biome.rareMonsters.length)
        ];
      gameState.world.rareSpawnsCount++;
      spawnMonster(rareId, sessionId);
      return;
    }
  }

  const canSpawnRare =
    biome.rareMonsters &&
    gameState.world.rareSpawnsCount < (biome.maxRareSpawns || 0);

  const rareSpawnChance =
    0.15 * getRunModifier("rareChanceMult", 1) * getRebirthRareMult();
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
  }
  spawnMonster(
    biome.monsters[Math.floor(Math.random() * biome.monsters.length)],
    sessionId,
  );
  return;
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
  // Traits du biome : la regle locale qui distingue la zone. Voir biome-traits.js.
  gameState.world.activeTraits = biome.traits || [];
  gameState.world.lastEventProgress = -1;
  runtimeState.defeatedEnemies = [];
  gameState.playerEffects = [];
  gameState.ennemyEffects = [];
  gameState.world.rareSpawnsCount = 0;
  runtimeState.enemyIntent = null;
  const selectedAsh = ASHES_OF_WAR[gameState.equippedAsh];
  runtimeState.ashUsesLeft = selectedAsh
    ? selectedAsh.maxUses + getRebirthAshBonus()
    : 0;
  runtimeState.ashIsPrimed = false;
  runtimeState.nextNbAtkBonus = 0;
  applyPreparationLoadout();
  // Apres applyPreparationLoadout, qui vide activeRunBuffs.
  getTraitRunBuffs(gameState.world.activeTraits).forEach(registerRunBuff);

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

/*
 * Annonce Discord — desactivee.
 *
 * L'implementation precedente contenait l'URL du webhook EN CLAIR dans ce
 * fichier. Un webhook Discord n'est pas une cle d'API : quiconque l'a peut
 * poster ce qu'il veut dans le salon, sans limite et sans authentification.
 * Dans un depot public, c'etait une porte ouverte.
 *
 * L'URL est retiree, mais elle reste dans l'historique git : le seul correctif
 * reel est de SUPPRIMER ce webhook dans les parametres du salon Discord et
 * d'en creer un autre.
 *
 * Un webhook ne peut pas etre appele depuis le navigateur de toute facon :
 * Discord ne renvoie pas d'en-tete CORS, d'ou le proxy tiers qu'utilisait
 * l'ancienne version — lequel voyait passer chaque annonce. Une annonce
 * automatique fiable demande un petit service cote serveur qui garde le
 * secret ; tant qu'il n'existe pas, cette fonction ne fait rien.
 */
function sendDiscordAnnouncement(bossName) {
  return;
}
