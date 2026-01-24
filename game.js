import { BIOMES, ITEMS, LOOT_TABLES, MONSTERS } from "./gameData.js";
const SAVE_NAME = "eldenChillSave";

let currentEnemy = null;
let playerCurrentHp = 0;
let currentCombatSession = 0;
let currentLoopCount = 0;

let gameState = {
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
  dexterity: 15,
  intelligence: 15,
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
      gameState = {
        ...gameState,
        ...decrypted,
        stats: { ...gameState.stats, ...decrypted.stats },
        world: { ...gameState.world, ...decrypted.world },
      };
    }
  }
  updateUI();
};

const updateCycleDisplay = () => {
  const el = document.getElementById("cycle-count");

  if (!el) return;

  if (currentLoopCount > 0) {
    el.innerText = `+${currentLoopCount}`;
    el.style.color = "var(--hover-btn)";
  } else {
    el.innerText = "";
  }
};

const updateUI = () => {
  updateRuneDisplay();
  updateStatDisplay();
  updateEquipmentDisplay();
  updateBiomeDisplay();
  updateInventoryDisplay();
  updateCycleDisplay();
};

const updateRuneDisplay = () => {
  document.getElementById("banked-runes").innerText = formatNumber(
    gameState.runes.banked,
  );
  document.getElementById("carried-runes").innerText = formatNumber(
    gameState.runes.carried,
  );
};

const updateStatDisplay = () => {
  const eff = getEffectiveStats();
  const base = gameState.stats;

  // 1. Stats de base (Vigueur, Force, Dex, Int)
  const statsList = ["vigor", "strength", "dexterity", "intelligence"];
  statsList.forEach((s) => {
    // Sécurité NaN : si la stat n'existe pas, on affiche 10 par défaut
    const baseVal = base[s] || 10;
    document.getElementById(`base-${s}`).innerText = baseVal;

    // Calcul du bonus (Eff - Base)
    const bonus = eff[s] - baseVal;
    const bonusEl = document.getElementById(`bonus-${s}`);
    if (bonus !== 0) {
      bonusEl.innerText = bonus > 0 ? ` (+${bonus})` : ` (${bonus})`;
      bonusEl.style.color = bonus > 0 ? "#4dff4d" : "#ff4d4d";
    } else {
      bonusEl.innerText = "";
    }

    // Prix et activation du bouton
    const cost = getUpgradeCost(s);
    document.getElementById(`cost-${s}`).innerText = formatNumber(cost);
    const btn = document.querySelector(`button[onclick="upgradeStat('${s}')"]`);
    if (btn) btn.disabled = gameState.runes.banked < cost;
  });

  // 2. Statistiques Critiques
  const updateCrit = (id, statName, isPercent) => {
    const val = eff[statName];
    const cost = getUpgradeCost(statName);
    const btn = document.querySelector(
      `button[onclick="upgradeStat('${statName}')"]`,
    );

    document.getElementById(`eff-${id}`).innerText = isPercent
      ? (val * 100).toFixed(0) + "%"
      : val.toFixed(1) + "x";
    document.getElementById(`cost-${id}`).innerText = formatNumber(cost);

    if (btn) {
      const isMax = statName === "critChance" && base.critChance >= 1.0;
      btn.disabled = isMax || gameState.runes.banked < cost;
      if (isMax) btn.innerText = "MAX";
    }
  };

  updateCrit("critChance", "critChance", true);
  updateCrit("critDamage", "critDamage", false);
};

const updateEquipmentDisplay = () => {
  gameState.equipped.forEach((itemId, index) => {
    const slot = document.getElementById(`slot-${index}`);
    if (itemId) {
      const itemInInv = gameState.inventory.find((i) => i.id === itemId);
      if (itemInInv) {
        slot.innerText = `${itemInInv.name} (Lv.${itemInInv.level})`;
        slot.onmouseenter = (e) => showTooltip(e, itemInInv);
        slot.onmousemove = (e) => moveTooltip(e);
        slot.onmouseleave = () => hideTooltip();
        return;
      }
    }
    // Si pas d'item ou item non trouvé
    slot.innerText = "Vide";
    slot.onmouseenter = null;
  });
};

const updateBiomeDisplay = () => {
  const list = document.getElementById("biome-list");
  list.innerHTML = "";

  Object.keys(BIOMES).forEach((id) => {
    const btn = document.createElement("button");
    btn.innerText = BIOMES[id].name;

    // Désactivé si non débloqué OU si déjà en exploration (pour éviter le spam)
    btn.disabled =
      !gameState.world.unlockedBiomes.includes(id) ||
      gameState.world.isExploring;

    btn.onclick = () => startExploration(id);
    list.appendChild(btn);
  });
};

const updateInventoryDisplay = () => {
  const invGrid = document.getElementById("inventory-grid");
  invGrid.innerHTML = "";

  if (gameState.inventory.length === 0) {
    invGrid.innerHTML =
      '<div style="color: grey; margin-bottom: 10px;">Inventaire vide</div>';
    return;
  }

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
};

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
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
  if (gameState.world.isExploring) {
    toggleView("biome");
    return;
  }

  currentLoopCount = 0;
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

  document.getElementById("current-biome-text").innerText = biome.name;

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
    spawnMonster(
      biome.monsters[Math.floor(Math.random() * biome.monsters.length)],
      sessionId,
    );
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
  const multiplier = Math.pow(1.1, currentLoopCount);
  currentEnemy = {
    ...monster,
    currentHp: Math.floor(monster.hp * multiplier),
    atk: Math.floor(monster.atk * multiplier),
    runes: Math.floor(monster.runes * multiplier),
    hp: Math.floor(monster.hp * multiplier),
  };

  document.getElementById("enemy-name").innerText =
    currentLoopCount > 0
      ? `${currentEnemy.name} +${currentLoopCount}`
      : currentEnemy.name;
  updateHealthBars();

  ActionLog(`Un ${currentEnemy.name} apparaît !`);

  setTimeout(() => combatLoop(sessionId), 500);
};

const ActionLog = (message, className = "") => {
  const log = document.getElementById("action-log");
  const entry = document.createElement("p");
  entry.innerText = `> ${message}`;

  if (className) {
    entry.className = className;
  }

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
      const message = `Vous infligez ${formatNumber(Math.floor(damage))} dégâts ${isCrit ? "CRITIQUES !" : "."}`;
      ActionLog(message, isCrit ? "log-crit" : "");
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

      //esquive
      const eff = getEffectiveStats();
      const dodgeChance = Math.min(0.5, eff.dexterity / 500);

      if (Math.random() < dodgeChance) {
        ActionLog("ESQUIVE ! Vous évitez le coup.", "log-dodge");
        setTimeout(() => combatLoop(sessionId), 500);
        return;
      }

      playerCurrentHp -= currentEnemy.atk;
      updateHealthBars();

      if (currentEnemy.atk > stats.vigor * 10 * 0.15) {
        triggerShake();
      }

      ActionLog(
        `${currentEnemy.name} frappe ! -${formatNumber(currentEnemy.atk)} PV`,
      );

      if (playerCurrentHp <= 0) {
        handleDeath();
      } else {
        setTimeout(() => combatLoop(sessionId), 500);
      }
    }, 800);
  }, 800);
};

const triggerShake = () => {
  const container = document.getElementById("game-container");
  container.classList.add("shake-effect");

  // On retire la classe après l'animation pour pouvoir la relancer plus tard
  setTimeout(() => {
    container.classList.remove("shake-effect");
  }, 400);
};

const handleDeath = () => {
  ActionLog(`Vous êtes mort. Les runes portées sont perdues ...`);
  gameState.runes.carried = 0;
  gameState.world.isExploring = false;
  setTimeout(() => toggleView("camp"), 3000);
};

const handleVictory = (sessionId) => {
  const eff = getEffectiveStats();

  const intBonus = 1 + eff.intelligence / 100;
  const totalRunes = Math.floor(currentEnemy.runes * intBonus);

  ActionLog(
    `Vous avez vaincu ${currentEnemy.name} ! (+${formatNumber(totalRunes)} runes)`,
  );
  gameState.runes.carried += totalRunes;
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

    currentLoopCount++;
    gameState.world.progress = 0;
    gameState.world.checkpointReached = false;

    updateCycleDisplay();

    ActionLog(`--- DÉBUT DU CYCLE ${currentLoopCount + 1} ---`);

    setTimeout(() => {
      updateStepper();
      nextEncounter(sessionId);
    }, 3000);
  } else {
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
    `${formatNumber(Math.floor(playerCurrentHp))} / ${formatNumber(playerMaxHp)}`;

  const enemyBar = document.getElementById("enemy-hp-fill");
  const enemyText = document.getElementById("enemy-hp-text");

  if (currentEnemy) {
    const enemyPercent = (currentEnemy.currentHp / currentEnemy.hp) * 100;
    enemyBar.style.width = `${Math.max(0, enemyPercent)}%`;
    enemyText.innerText = `${formatNumber(Math.floor(currentEnemy.currentHp))} / ${formatNumber(currentEnemy.hp)}`;
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
      gameState.runes.banked +=
        100 * BIOMES[gameState.world.currentBiome].length;
      ActionLog(
        `Vous recevez ${formatNumber(100 * BIOMES[gameState.world.currentBiome].length)} runes en compensation.`,
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
  const baseCost = upgradeCosts[statName] || 10;
  const val = gameState.stats[statName] || 0;

  let count = 0;
  if (["vigor", "strength", "dexterity", "intelligence"].includes(statName)) {
    count = val - 10;
  }
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

  // On ne calcule rien si le tooltip est caché (car offsetWidth serait 0)
  if (tooltip.classList.contains("tooltip-hidden")) return;

  const padding = 15; // Distance entre le curseur et le tooltip
  let left = e.clientX + padding;
  let top = e.clientY + padding;

  // On récupère les dimensions réelles du tooltip
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  // Vérification du bord droit
  if (left + tooltipWidth > window.innerWidth) {
    // Si ça dépasse, on l'affiche à gauche du curseur
    left = e.clientX - tooltipWidth - padding;
  }

  // Vérification du bord bas
  if (top + tooltipHeight > window.innerHeight) {
    // Si ça dépasse, on le remonte au-dessus du curseur
    top = e.clientY - tooltipHeight - padding;
  }

  // Sécurité pour le bord gauche/haut (si l'écran est tout petit)
  left = Math.max(5, left);
  top = Math.max(5, top);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
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
