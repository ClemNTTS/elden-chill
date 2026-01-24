import { gameState, getEffectiveStats } from "./stats.js";
import { ITEMS, BIOMES, MONSTERS, LOOT_TABLES } from "./gameData.js";
import { updateUI, toggleView } from "./ui.js";
import { saveGame } from "./save.js";

let currentEnemy = null;
let playerCurrentHp = 0;
let currentCombatSession = 0;

const startExploration = (biomeId) => {
  if (gameState.world.isExploring) {
    toggleView("biome");
    return;
  }

  currentCombatSession++;
  const sessionAtStart = currentCombatSession;
  const biome = BIOMES[biomeId];
  gameState.world.isExploring = true;
  gameState.world.currentBiome = biomeId;
  gameState.world.progress = 0;
  gameState.world.checkpointReached = false;

  playerCurrentHp = getEffectiveStats().vigor * 10;

  document.getElementById("action-log").innerHTML = "";

  toggleView("biome");
  document.getElementById("current-biome-name").innerText = biome.name;
  updateHealthBars();
  updateStepper();

  nextEncounter(sessionAtStart);
};

const nextEncounter = (sessionId) => {
  if (sessionId !== currentCombatSession) return;

  const biome = BIOMES[gameState.world.currentBiome];
  const midPoint = Math.floor(biome.length / 2);

  if (
    gameState.world.progress === midPoint &&
    !gameState.world.checkpointReached
  ) {
    handleCampfireEvent(sessionId);
    return;
  }

  if (gameState.world.progress >= biome.length) {
    spawnMonster(biome.boss, sessionId);
  } else {
    // 10% chance to spawn rare enemy in this section
    let monsterToSpawn;
    if (biome.rareMonster && Math.random() < 0.1) {
      monsterToSpawn = biome.rareMonster;
      ActionLog("🌟 Une créature rare apparaît !");
    } else {
      monsterToSpawn = biome.monsters[Math.floor(Math.random() * biome.monsters.length)];
    }
    spawnMonster(monsterToSpawn, sessionId);
  }
};

const handleCampfireEvent = (sessionId) => {
  gameState.world.checkpointReached = true;
  const container = document.getElementById("game-container");

  // Effet visuel immédiat
  container.classList.add("blink-effect");

  // Sécurisation instantanée des runes
  gameState.runes.banked += gameState.runes.carried;
  gameState.runes.carried = 0;
  playerCurrentHp = getEffectiveStats().vigor * 10;

  updateHealthBars();
  updateUI();

  setTimeout(() => {
    container.classList.remove("blink-effect");
    ActionLog("Site de grâce touché. Runes sécurisées.");
    nextEncounter(sessionId);
  }, 1200);
};

const spawnMonster = (monsterId, sessionId) => {
  if (sessionId !== currentCombatSession) return;

  const monster = MONSTERS[monsterId];
  currentEnemy = { ...monster, id: monsterId, currentHp: monster.hp };

  document.getElementById("enemy-name").innerText = currentEnemy.name;
  updateHealthBars();

  ActionLog(`Un ${currentEnemy.name} apparaît !`);

  setTimeout(() => combatLoop(sessionId), 500);
};

const ActionLog = (message) => {
  const log = document.getElementById("action-log");
  const entry = document.createElement("p");
  entry.innerText = `> ${message}`;
  log.prepend(entry);
};

const combatLoop = (sessionId) => {
  if (!gameState.world.isExploring) {
    return;
  }

  if (sessionId !== currentCombatSession || !gameState.world.isExploring) {
    console.log(`Ancienne session ${sessionId} stoppée.`);
    return;
  }

  setTimeout(() => {
    const stats = getEffectiveStats();
    //Attaque du joueur
    for (let i = 0; i < stats.attacksPerTurn; i++) {
      let damage = stats.strength;
      const isCrit = Math.random() < stats.critChance;
      if (isCrit) {
        damage *= stats.critDamage;
      }
      currentEnemy.currentHp -= Math.floor(damage);
      updateHealthBars();
      ActionLog(
        `Vous infligez ${Math.floor(damage)} dégâts ${isCrit ? "CRITIQUES !" : "."}`,
      );
    }

    //vérification de mort ennemi
    if (currentEnemy.currentHp <= 0) {
      setTimeout(() => handleVictory(sessionId), 500);
      return;
    }

    //Attaque ennemi
    setTimeout(() => {
      if (sessionId !== currentCombatSession || !gameState.world.isExploring)
        return;
      playerCurrentHp -= currentEnemy.atk;
      updateHealthBars();
      ActionLog(`${currentEnemy.name} frappe ! -${currentEnemy.atk} PV`);

      if (playerCurrentHp <= 0) {
        handleDeath();
      } else {
        setTimeout(() => combatLoop(sessionId), 500);
      }
    }, 800);
  }, 800);
};

const handleDeath = () => {
  ActionLog(`Vous êtes mort. Les runes portées sont perdues ...`);
  gameState.runes.carried = 0;
  gameState.world.isExploring = false;
  setTimeout(() => toggleView("camp"), 3000);
};

const handleVictory = (sessionId) => {
  ActionLog(`Vous avez vaincu ${currentEnemy.name} !`);
  gameState.runes.carried += currentEnemy.runes;
  gameState.world.progress++;

  updateStepper();

  // Handle rare enemy drops
  if (currentEnemy.type === "rare") {
    ActionLog("🌟 Butin rare obtenu !");
    if (currentEnemy.loot) {
      dropItem(currentEnemy.loot);
    }
  }

  if (currentEnemy.isBoss) {
    const currentBiome = BIOMES[gameState.world.currentBiome];
    ActionLog("BOSS VAINCU !");

    // Handle first-time clear rewards
    if (!gameState.firstTimeCleared[gameState.world.currentBiome]) {
      gameState.firstTimeCleared[gameState.world.currentBiome] = true;
      
      if (currentBiome.firstClearReward === "slots") {
        // Unlock all slot types
        gameState.unlockedSlots.shield = true;
        gameState.unlockedSlots.weapon = true;
        gameState.unlockedSlots.armor = true;
        gameState.unlockedSlots.accessory = Math.max(gameState.unlockedSlots.accessory, 1);
        ActionLog("✨ Tous les types d'équipements ont été débloqués !");
      } else if (currentBiome.firstClearReward === "accessory") {
        // Unlock additional accessory slot
        gameState.unlockedSlots.accessory++;
        ActionLog(`✨ Nouvel emplacement d'accessoire débloqué ! (${gameState.unlockedSlots.accessory})`);
      }
    }

    if (
      currentBiome.unlocks &&
      !gameState.world.unlockedBiomes.includes(currentBiome.unlocks)
    ) {
      gameState.world.unlockedBiomes.push(currentBiome.unlocks);
      ActionLog(
        `Nouvelle zone découverte : ${BIOMES[currentBiome.unlocks].name} !`,
      );
    }

    // Boss guaranteed loot from their loot table
    const bossLootTable = LOOT_TABLES[currentEnemy.id] || [];
    if (bossLootTable.length > 0) {
      const rolled = bossLootTable[Math.floor(Math.random() * bossLootTable.length)];
      dropItem(rolled.id, true); // true indicates boss drop
    }
    saveGame();

    setTimeout(() => toggleView("camp"), 3000);
  } else {
    // Regular monster loot drop - use probability from loot table
    const monsterLootTable = LOOT_TABLES[currentEnemy.id] || [];
    if (monsterLootTable.length > 0) {
      // Roll for each item in the loot table
      for (const lootEntry of monsterLootTable) {
        if (Math.random() < lootEntry.chance) {
          dropItem(lootEntry.id);
          break; // Only one item per kill
        }
      }
    }
    setTimeout(() => nextEncounter(sessionId), 1000);
  }
  updateUI();
};

const updateHealthBars = () => {
  const stats = getEffectiveStats();
  const playerMaxHp = stats.vigor * 10;

  const playerPercent = (playerCurrentHp / playerMaxHp) * 100;
  document.getElementById("player-hp-fill").style.width =
    `${Math.max(0, playerPercent)}%`;
  document.getElementById("player-hp-text").innerText =
    `${Math.max(0, Math.floor(playerCurrentHp))} / ${playerMaxHp}`;

  const enemyBar = document.getElementById("enemy-hp-fill");
  const enemyText = document.getElementById("enemy-hp-text");

  if (currentEnemy) {
    const enemyPercent = (currentEnemy.currentHp / currentEnemy.hp) * 100;
    enemyBar.style.width = `${Math.max(0, enemyPercent)}%`;
    enemyText.innerText = `${Math.max(0, Math.floor(currentEnemy.currentHp))} / ${currentEnemy.hp}`;
  } else {
    enemyBar.style.width = "0%";
    enemyText.innerText = "0 / 0";
  }
};

const dropItem = (itemId, isBoss = false) => {
  const itemTemplate = ITEMS[itemId];
  const itemCategory = itemTemplate.categorie;
  let inventoryItem = gameState.inventory.find((item) => item.id === itemId);

  // Unlock slot for this item type when first looted
  if (!inventoryItem) {
    if (itemCategory === "shield") {
      gameState.unlockedSlots.shield = true;
      ActionLog("✨ Emplacement Bouclier débloqué !");
    } else if (itemCategory === "weapon" || itemCategory === "two_handed_weapon") {
      gameState.unlockedSlots.weapon = true;
      ActionLog("✨ Emplacement Arme débloqué !");
    } else if (itemCategory === "armor") {
      gameState.unlockedSlots.armor = true;
      ActionLog("✨ Emplacement Armure débloqué !");
    } else if (itemCategory === "accessory") {
      if (gameState.unlockedSlots.accessory === 0) {
        gameState.unlockedSlots.accessory = 1;
        ActionLog("✨ Emplacement Accessoire débloqué !");
      }
    }
  }

  if (!inventoryItem) {
    gameState.inventory.push({
      id: itemId,
      name: itemTemplate.name,
      level: 1,
      count: 0,
    });
    ActionLog(`Vous avez trouvé : ${itemTemplate.name} !`);
  } else {
    if (inventoryItem.level >= 10) {
      ActionLog(`${itemTemplate.name} est déjà au niveau maximum (10) !`);
      // Only give runes for max-level items from bosses
      if (isBoss) {
        gameState.runes.banked += 100 * gameState.world.currentBiome.length;
        ActionLog(
          `Vous recevez ${100 * gameState.world.currentBiome.length} runes en compensation.`,
        );
        saveGame();
      }
      return; // Don't count or level up the item if already max level
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

  updateUI();
};

const updateStepper = () => {
  const biome = BIOMES[gameState.world.currentBiome];
  const progress = gameState.world.progress;
  const total = biome.length;

  // 1. Mise à jour de la barre et du texte
  const percent = (progress / total) * 100;
  document.getElementById("stepper-fill").style.width =
    `${Math.min(100, percent)}%`;
  document.getElementById("stepper-text").innerText =
    `Ennemis vaincus : ${progress} / ${total}`;

  // 2. Génération des marqueurs (seulement au début de l'exploration)
  const markersContainer = document.getElementById("stepper-markers");
  if (progress === 0) {
    markersContainer.innerHTML = "";

    // Marqueur de Grâce (Milieu)
    const midPoint = Math.floor(total / 2);
    const graceMarker = document.createElement("div");
    graceMarker.className = "marker marker-grace";
    graceMarker.style.left = `${(midPoint / total) * 100}%`;
    graceMarker.title = "Site de Grâce";
    markersContainer.appendChild(graceMarker);

    // Marqueur de Boss (Fin)
    const bossMarker = document.createElement("div");
    bossMarker.className = "marker marker-boss";
    bossMarker.style.left = "100%";
    bossMarker.title = "Boss de zone";
    markersContainer.appendChild(bossMarker);
  }
};

const toggleOptions = (show) => {
  const modal = document.getElementById("options-modal");
  modal.className = show ? "modal-visible" : "modal-hidden";
  if (show) updateBiomeStats();
};

const updateBiomeStats = () => {
  const list = document.getElementById("biome-stats-list");
  list.innerHTML = "";

  Object.keys(BIOMES).forEach((biomeId) => {
    const biome = BIOMES[biomeId];

    let biomeDiv = document.createElement("div");
    biomeDiv.className = "biome-stat-entry";

    // Collect all monsters in this biome
    const monsterIds = [...biome.monsters];
    if (biome.rareMonster) monsterIds.push(biome.rareMonster);
    monsterIds.push(biome.boss);

    let monstersHtml = monsterIds
      .map((monsterId) => {
        const monster = MONSTERS[monsterId];
        const loots = LOOT_TABLES[monsterId] || [];
        const lootHtml = loots
          .map((l) => {
            const item = ITEMS[l.id];
            return `<li>${item.name} : <strong>${(l.chance * 100).toFixed(0)}%</strong></li>`;
          })
          .join("");

        return `
          <div style="margin: 10px 0; padding-left: 10px; border-left: 2px solid #888;">
            <strong>${monster.name}</strong>
            <ul>${lootHtml || "<li>Aucun objet répertorié</li>"}</ul>
          </div>
        `;
      })
      .join("");

    biomeDiv.innerHTML = `
      <h4>${biome.name}</h4>
      ${monstersHtml}
    `;
    list.appendChild(biomeDiv);
  });
};

export { startExploration, nextEncounter, updateStepper, toggleOptions, updateBiomeStats, dropItem };