import { BIOMES, ITEMS, LOOT_TABLES, MONSTERS } from "./gameData.js";
const SAVE_NAME = "eldenChillSave";

let currentEnemy = null;
let playerCurrentHp = 0;

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
    currentBiome: "Nécrolimbe",
    unlockedBiomes: ["necrolimbe"],
    progress: 0,
    isExploring: false,
  },
};

const upgradeCosts = {
  vigor: 10,
  strength: 10,
  critChance: 25,
  critDamage: 25,
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
    localStorage.setItem(SAVE_NAME, JSON.stringify(gameState));
    console.log("Sauvegarde effectuée !");
  } catch (err) {
    console.error("Erreur lors de la sauvegarde :", err);
  }
};

const loadGame = () => {
  const savedData = localStorage.getItem(SAVE_NAME);
  if (savedData) {
    const parsed = JSON.parse(savedData);
    gameState = { ...gameState, ...parsed };
  }
  updateUI();
};

const updateUI = () => {
  // Runes
  document.getElementById("banked-runes").innerText = gameState.runes.banked;
  document.getElementById("carried-runes").innerText = gameState.runes.carried;

  // Statistiques
  document.getElementById("stat-vigor").innerText = gameState.stats.vigor;
  document.getElementById("stat-strength").innerText = gameState.stats.strength;

  // Formatage des critiques
  document.getElementById("stat-crit-chance").innerText =
    (gameState.stats.critChance * 100).toFixed(0) + "%";
  document.getElementById("stat-crit-damage").innerText =
    gameState.stats.critDamage.toFixed(1) + "x";

  // Gestion des slots d'équipement
  gameState.equipped.forEach((item, index) => {
    const slot = document.getElementById(`slot-${index}`);
    slot.innerText = item ? `${item.name} (Lv.${item.level})` : "Vide";
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
  gameState.inventory.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "inventory-item";
    itemDiv.innerHTML = `<strong>${item.name}</strong><br>Niv.${item.level}<br>(${item.count}/${item.level})`;

    const itemData = ITEMS[item.id];
    itemDiv.onmouseenter = (e) =>
      showTooltip(
        e,
        `<strong>${itemData.name}</strong><br>${itemData.description}`,
      );
    itemDiv.onmousemove = (e) => moveTooltip(e);
    itemDiv.onmouseleave = () => hideTooltip();

    itemDiv.onclick = () => equipItem(item.id);
    invGrid.appendChild(itemDiv);
  });

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

    camp.style.display = "block";
    biome.style.display = "none";
    gameState.world.isExploring = false;
    saveGame();
  }
  updateUI();
};

const getEffectiveStats = () => {
  let effStats = { ...gameState.stats, attacksPerTurn: 1 };

  gameState.equipped.forEach((item) => {
    if (item && ITEMS[item.id]) {
      ITEMS[item.id].apply(effStats);
    }
  });

  return effStats;
};

const startExploration = (biomeId) => {
  const biome = BIOMES[biomeId];
  gameState.world.isExploring = true;
  gameState.world.currentBiome = biomeId;
  gameState.world.progress = 0;

  playerCurrentHp = getEffectiveStats().vigor * 10;

  toggleView("biome");
  nextEncounter();
};

const nextEncounter = () => {
  const biome = BIOMES[gameState.world.currentBiome];

  if (gameState.world.progress >= biome.length) {
    spawnMonster(biome.boss);
  } else {
    spawnMonster(
      biome.monsters[Math.floor(Math.random() * biome.monsters.length)],
    );
  }
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
      handleVictory();
      return;
    }

    //Attaque ennemi
    setTimeout(() => {
      playerCurrentHp -= currentEnemy.atk;
      updateHealthBars();
      ActionLog(`${currentEnemy.name} frappe ! -${currentEnemy.atk} PV`);

      if (playerCurrentHp <= 0) {
        handleDeath();
      } else {
        setTimeout(combatLoop, 1000);
      }
    }, 500);
  }, 500);
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

  if (currentEnemy.isBoss) {
    const biome = BIOMES[gameState.world.currentBiome];
    ActionLog("BOOS VAINCU ! Accés à la nouvelle zone débloqué.");

    //loot
    const loot = LOOT_TABLES[gameState.world.currentBiome];
    const rolled = loot[Math.floor(Math.random() * loot.length)];
    dropItem(rolled.id);

    setTimeout(() => toggleView("camp"), 3000);
  } else {
    setTimeout(nextEncounter, 2000);
  }
  updateUI();
};

const updateHealthBars = () => {
  const playerMaxHp = getEffectiveStats().vigor * 10;
  const playerPercent = (playerCurrentHp / playerMaxHp) * 100;
  document.getElementById("player-hp-fill").style.width =
    `${Math.max(0, playerPercent)}%`;

  const enemyPercent = (currentEnemy.currentHp / currentEnemy.hp) * 100;
  document.getElementById("enemy-hp-fill").style.width =
    `${Math.max(0, enemyPercent)}%`;
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
  const itemInInv = gameState.inventory.find((item) => item.id === itemId);

  const alreadyEquippedIndex = gameState.equipped.findIndex(
    (e) => e && e.id === itemId,
  );
  if (alreadyEquippedIndex !== -1) {
    gameState.equipped[alreadyEquippedIndex] = null; //déséquipe
  } else {
    const emptySlot = gameState.equipped.indexOf(null);
    if (emptySlot !== -1) {
      gameState.equipped[emptySlot] = itemInInv;
    } else {
      alert("Inventaire plein !");
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

  return Math.floor(baseCost * Math.pow(1.5, count));
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

const showTooltip = (e, text) => {
  const tooltip = document.getElementById("tooltip");
  tooltip.innerHTML = text.replace(
    /\+/g,
    '<span class="tooltip-stat">+</span>',
  );
  tooltip.classList.remove("tooltip-hidden");
  moveTooltip(e);
};

const moveTooltip = (e) => {
  const tooltip = document.getElementById("tooltip");
  // On décale un peu pour ne pas être sous le curseur
  tooltip.style.left = e.clientX + 15 + "px";
  tooltip.style.top = e.clientY + 15 + "px";
};

const hideTooltip = () => {
  document.getElementById("tooltip").classList.add("tooltip-hidden");
};

setInterval(saveGame, 30000);
window.onload = loadGame;
window.upgradeStat = upgradeStat;
window.toggleView = toggleView;
window.startExploration = startExploration;
window.equipItem = equipItem;
window.resetGame = resetGame;
