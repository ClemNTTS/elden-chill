import { BIOMES, ITEMS, LOOT_TABLES, MONSTERS } from "./gameData.js";
const SAVE_NAME = "eldenChillSave";

let currentEnemy = null;
let playerCurrentHp = 0;
let currentCombatSession = 0;

let gameState = {
  runes: {
    banked: 0,
    carried: 0,
  },
  stats: {
    vigor: 10,
    strength: 10,
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
  },
};

const upgradeCosts = {
  vigor: 10,
  strength: 10,
  critChance: 150,
  critDamage: 1500,
};

const upgradeStat = (statName) => {
  let cost = getUpgradeCost(statName);

  if (statName === "critChance" && gameState.stats.critChance >= 1.0) {
    alert("Votre Chance de Critique est déjà au maximum (100%) !");
    return;
  }

  if (gameState.runes.banked >= cost) {
    gameState.runes.banked -= cost;

    if (statName === "critChance") {
      gameState.stats.critChance += 0.01;
    } else if (statName === "critDamage") {
      gameState.stats.critDamage += 0.1;
    } else {
      gameState.stats[statName] += 1;
    }
    saveGame();
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

const saveGame = () => {
  try {
    const secretString = encodeSave(gameState);
    localStorage.setItem(SAVE_NAME, secretString);
    console.log("Sauvegarde cryptée effectuée !");
  } catch (err) {
    console.error("⚠️ Sauvegarde corrompue ou modifiée illégalement : ", err);
  }
};

const loadGame = () => {
  const savedData = localStorage.getItem(SAVE_NAME);
  if (savedData) {
    const decrypted = decodeSave(savedData);
    if (decrypted) {
      gameState = { ...gameState, ...decrypted };
    } else {
      alert("Erreur de chargement : sauvegarde corrompue ou format obsolète.");
    }
  }
  updateStepper();
  updateUI();
};

const updateUI = () => {
  document.getElementById("banked-runes").innerText = gameState.runes.banked;
  document.getElementById("carried-runes").innerText = gameState.runes.carried;

  document.getElementById("stat-vigor").innerText = gameState.stats.vigor;
  document.getElementById("stat-strength").innerText = gameState.stats.strength;

  document.getElementById("stat-crit-chance").innerText =
    (gameState.stats.critChance * 100).toFixed(0) + "%";
  document.getElementById("stat-crit-damage").innerText =
    gameState.stats.critDamage.toFixed(1) + "x";

  gameState.equipped.forEach((itemId, index) => {
    const slot = document.getElementById(`slot-${index}`);
    if (itemId) {
      const itemInInv = gameState.inventory.find((i) => i.id === itemId);
      if (itemInInv) {
        slot.innerText = `${itemInInv.name} (Lv.${itemInInv.level})`;
        slot.onmouseenter = (e) => showTooltip(e, itemInInv);
        slot.onmousemove = (e) => moveTooltip(e);
        slot.onmouseleave = () => hideTooltip();
      }
    } else {
      slot.innerText = "Vide";
      slot.onmouseenter = null;
    }
  });

  const list = document.getElementById("biome-list");
  list.innerHTML = "";
  Object.keys(BIOMES).forEach((id) => {
    const btn = document.createElement("button");
    btn.innerText = BIOMES[id].name;
    btn.disabled = !gameState.world.unlockedBiomes.includes(id);
    btn.onclick = () => startExploration(id);
    list.appendChild(btn);
  });

  const invGrid = document.getElementById("inventory-grid");
  invGrid.innerHTML = "";

  if (gameState.inventory.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "grey";
    empty.innerText = "Inventaire vide";
    empty.style.marginBottom = "10px";
    invGrid.appendChild(empty);
  } else {
    gameState.inventory.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "inventory-item";

      const progressText =
        item.level >= 10 ? "MAX" : `(${item.count}/${item.level})`;
      itemDiv.innerHTML = `<strong>${item.name}</strong><br>Niv.${item.level}<br>${progressText}`;

      itemDiv.onmouseenter = (e) => showTooltip(e, item);
      itemDiv.onmousemove = (e) => moveTooltip(e);
      itemDiv.onmouseleave = () => hideTooltip();

      itemDiv.onclick = () => equipItem(item.id);
      invGrid.appendChild(itemDiv);
    });
  }

  Object.keys(upgradeCosts).forEach((stat) => {
    const costLabel = document.getElementById(`cost-${stat}`);
    if (costLabel) costLabel.innerText = getUpgradeCost(stat);
  });

  const critBtn = document.querySelector(
    "button[onclick=\"upgradeStat('critChance')\"]",
  );
  if (gameState.stats.critChance >= 1.0) {
    critBtn.disabled = true;
    critBtn.innerText = "MAX ATTEINT";
  }
};

const toggleView = (view) => {
  const camp = document.getElementById("camp-view");
  const biome = document.getElementById("biome-view");

  if (view === "biome") {
    camp.style.display = "none";
    biome.style.display = "block";
    gameState.world.isExploring = true;
  } else {
    gameState.runes.banked += gameState.runes.carried;
    gameState.runes.carried = 0;
    document.getElementById("action-log").innerHTML =
      "<p>De retour au repos...</p>";

    camp.style.display = "block";
    biome.style.display = "none";
    gameState.world.isExploring = false;
    saveGame();
  }
  updateUI();
};

const getEffectiveStats = () => {
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
};

const startExploration = (biomeId) => {
  currentCombatSession++;
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

  nextEncounter();
};

const nextEncounter = () => {
  const biome = BIOMES[gameState.world.currentBiome];
  const midPoint = Math.floor(biome.length / 2);

  if (
    gameState.world.progress === midPoint &&
    !gameState.world.checkpointReached
  ) {
    handleCampfireEvent();
    return;
  }

  if (gameState.world.progress >= biome.length) {
    spawnMonster(biome.boss);
  } else {
    spawnMonster(
      biome.monsters[Math.floor(Math.random() * biome.monsters.length)],
    );
  }
};

const handleCampfireEvent = () => {
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
    nextEncounter();
  }, 1200);
};

const spawnMonster = (monsterId) => {
  const monster = MONSTERS[monsterId];
  currentEnemy = { ...monster, currentHp: monster.hp };

  document.getElementById("enemy-name").innerText = currentEnemy.name;
  updateHealthBars();

  ActionLog(`Un ${currentEnemy.name} apparaît !`);

  setTimeout(combatLoop, 1000);
};

const ActionLog = (message) => {
  const log = document.getElementById("action-log");
  const entry = document.createElement("p");
  entry.innerText = `> ${message}`;
  log.prepend(entry);
};

const combatLoop = () => {
  if (!gameState.world.isExploring) {
    return;
  }

  const sessionId = currentCombatSession;

  setTimeout(() => {
    if (sessionId !== currentCombatSession || !gameState.world.isExploring)
      return;
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
      handleVictory();
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
        setTimeout(combatLoop, 1000);
      }
    }, 500);
  }, 300);
};

const handleDeath = () => {
  ActionLog(`Vous êtes mort. Les runes portées sont perdues ...`);
  gameState.runes.carried = 0;
  gameState.world.isExploring = false;
  setTimeout(() => toggleView("camp"), 3000);
};

const handleVictory = () => {
  ActionLog(`Vous avez vaincu ${currentEnemy.name} !`);
  gameState.runes.carried += currentEnemy.runes;
  gameState.world.progress++;

  updateStepper();

  if (currentEnemy.isBoss) {
    const currentBiome = BIOMES[gameState.world.currentBiome];
    ActionLog("BOSS VAINCU !");

    if (
      currentBiome.unlocks &&
      !gameState.world.unlockedBiomes.includes(currentBiome.unlocks)
    ) {
      gameState.world.unlockedBiomes.push(currentBiome.unlocks);
      ActionLog(
        `Nouvelle zone découverte : ${BIOMES[currentBiome.unlocks].name} !`,
      );
    }

    //loot
    const loot = LOOT_TABLES[gameState.world.currentBiome];
    const rolled = loot[Math.floor(Math.random() * loot.length)];
    dropItem(rolled.id);
    saveGame();

    setTimeout(() => toggleView("camp"), 3000);
  } else {
    setTimeout(nextEncounter, 2000);
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

const dropItem = (itemId) => {
  const itemTemplate = ITEMS[itemId];
  let inventoryItem = gameState.inventory.find((item) => item.id === itemId);

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
      gameState.runes.banked += 100 * gameState.world.currentBiome.length;
      ActionLog(
        `Vous recevez ${100 * gameState.world.currentBiome.length} runes en compensation.`,
      );
      saveGame();
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

const equipItem = (itemId) => {
  const alreadyEquippedIndex = gameState.equipped.indexOf(itemId);

  if (alreadyEquippedIndex !== -1) {
    gameState.equipped[alreadyEquippedIndex] = null;
  } else {
    const emptySlot = gameState.equipped.indexOf(null);
    if (emptySlot !== -1) {
      gameState.equipped[emptySlot] = itemId; // On stocke l'ID
    } else {
      alert("Slots d'équipement pleins !");
    }
  }
  updateUI();
};

const getUpgradeCost = (statName) => {
  const baseCost = upgradeCosts[statName];
  const val = gameState.stats[statName];

  let count = 0;
  if (statName === "vigor" || statName === "strength") count = val - 10;
  if (statName === "critChance") count = Math.round((val - 0.05) * 100);
  if (statName === "critDamage") count = Math.round((val - 1.5) * 10);

  return Math.floor(baseCost * Math.pow(1.3, count));
};

const resetGame = () => {
  if (
    confirm(
      "Êtes-vous sûr de vouloir tout effacer ? Votre progression sera perdue à jamais.",
    )
  ) {
    localStorage.removeItem(SAVE_NAME);
    location.reload();
  }
};

const showTooltip = (e, item) => {
  const tooltip = document.getElementById("tooltip");
  const itemData = ITEMS[item.id];

  // Simulation pour calculer le bonus réel
  let base = {
    vigor: 10,
    strength: 10,
    critChance: 0.05,
    critDamage: 1.5,
    attacksPerTurn: 1,
  };
  let modified = { ...base };
  itemData.apply(modified, item.level); // On applique le niveau de l'objet

  // Génération du texte de stats (comparaison)
  let statBonus = "";
  if (modified.strength !== base.strength) {
    const diff = modified.strength - base.strength;
    statBonus += `<br><span class="tooltip-stat">${diff > 0 ? "+" : ""}${diff.toFixed(1)} Force</span>`;
  }
  if (modified.vigor !== base.vigor) {
    const ratio = (modified.vigor / base.vigor).toFixed(1);
    statBonus += `<br><span class="tooltip-stat">x${ratio} Vigueur</span>`;
  }

  tooltip.innerHTML = `
    <strong style="color:var(--active-btn)">${itemData.name} (Niv.${item.level})</strong><br>
    <small style="font-style:italic; color:#aaa;">${itemData.description}</small>
    <hr style="border:0; border-top:1px solid #444; margin:5px 0;">
    <strong>Bonus actuel :</strong>${statBonus}
  `;

  tooltip.classList.remove("tooltip-hidden");
  moveTooltip(e);
};

const moveTooltip = (e) => {
  const tooltip = document.getElementById("tooltip");
  tooltip.style.left = e.clientX + 15 + "px";
  tooltip.style.top = e.clientY + 15 + "px";
};

const hideTooltip = () => {
  document.getElementById("tooltip").classList.add("tooltip-hidden");
};

const encodeSave = (data) => {
  const jsonString = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  return base64.split("").reverse().join("");
};

const decodeSave = (encodedData) => {
  try {
    const reversed = encodedData.split("").reverse().join("");
    const jsonString = decodeURIComponent(escape(atob(reversed)));
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("Erreur de décodage de la sauvegarde :", err);
    return null;
  }
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

  Object.keys(BIOMES).forEach((id) => {
    const biome = BIOMES[id];
    const loots = LOOT_TABLES[id] || [];

    let biomeDiv = document.createElement("div");
    biomeDiv.className = "biome-stat-entry";

    let lootHtml = loots
      .map((l) => {
        const item = ITEMS[l.id];
        return `<li>${item.name} : <strong>${(l.chance * 100).toFixed(0)}%</strong></li>`;
      })
      .join("");

    biomeDiv.innerHTML = `
      <h4>${biome.name}</h4>
      <ul>${lootHtml || "<li>Aucun objet répertorié</li>"}</ul>
    `;
    list.appendChild(biomeDiv);
  });
};

const dev = {
  // Se donner des runes : dev.giveRunes(5000)
  giveRunes: (amount) => {
    gameState.runes.banked += amount;
    console.log(`🔧 DEV : +${amount} runes ajoutées au coffre.`);
    updateUI();
    saveGame();
  },

  // Se donner un objet spécifique : dev.giveItem('twin_blade')
  giveItem: (itemId) => {
    if (ITEMS[itemId]) {
      dropItem(itemId);
      console.log(`🔧 DEV : Objet ${itemId} obtenu.`);
    } else {
      console.error("ID d'objet inconnu.");
    }
  },

  // Tout débloquer : dev.unlockAll()
  unlockAll: () => {
    Object.keys(BIOMES).forEach((id) => {
      if (!gameState.world.unlockedBiomes.includes(id)) {
        gameState.world.unlockedBiomes.push(id);
      }
    });
    console.log("🔧 DEV : Tous les biomes sont débloqués.");
    updateUI();
    saveGame();
  },
};

setInterval(saveGame, 30000);
window.onload = loadGame;
window.gameState = gameState;
window.upgradeStat = upgradeStat;
window.toggleView = toggleView;
window.startExploration = startExploration;
window.equipItem = equipItem;
window.resetGame = resetGame;
window.toggleOptions = toggleOptions;
window.dev = dev;
