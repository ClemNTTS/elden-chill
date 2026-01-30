// ui.js
const wikiBtn = document.getElementById("btn-wiki");

if (wikiBtn) {
  wikiBtn.addEventListener("click", () => {
    // Ouvre ton wiki dans un nouvel onglet pour ne pas couper la session de jeu
    window.open("https://cnuttens.me/wiki-elden-chill/", "_blank");
  });
}

// Audio management
const campSongs = [
  "./assets/camp_song_1.mp3",
  "./assets/camp_song_2.mp3",
  "./assets/camp_song_3.mp3",
  "./assets/camp_song_4.mp3",
];
const dungeonSongs = [
  "./assets/dungeon_song_1.mp3",
  "./assets/dungeon_song_2.mp3",
  "./assets/dungeon_song_3.mp3",
  "./assets/dungeon_song_4.mp3",
];

let currentCampSongIndex = Math.floor(Math.random() * campSongs.length);
let currentDungeonSongIndex = 0;

const campAudio = new Audio();
const dungeonAudio = new Audio();

function getRandomIndex(array, currentIndex) {
  if (array.length <= 1) return 0;
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * array.length);
  } while (newIndex === currentIndex);
  return newIndex;
}

function playNextCampSong() {
  currentCampSongIndex = getRandomIndex(campSongs, currentCampSongIndex);
  campAudio.src = campSongs[currentCampSongIndex];
  campAudio.play();
}

function playNextDungeonSong() {
  currentDungeonSongIndex = getRandomIndex(
    dungeonSongs,
    currentDungeonSongIndex,
  );
  dungeonAudio.src = dungeonSongs[currentDungeonSongIndex];
  dungeonAudio.play();
}

campAudio.addEventListener("ended", playNextCampSong);
dungeonAudio.addEventListener("ended", playNextDungeonSong);

export function playCampMusic() {
  dungeonAudio.pause();
  // Check if the src is already set to avoid reloading
  if (!campAudio.src.endsWith(campSongs[currentCampSongIndex])) {
    campAudio.src = campSongs[currentCampSongIndex];
  }
  campAudio.play().catch((e) => {
    /* Autoplay was prevented */
  });
}

function playDungeonMusic() {
  campAudio.pause();
  if (!dungeonAudio.src.endsWith(dungeonSongs[currentDungeonSongIndex])) {
    dungeonAudio.src = dungeonSongs[currentDungeonSongIndex];
  }
  dungeonAudio.play().catch((e) => {
    /* Autoplay was prevented */
  });
}

import { ASHES_OF_WAR } from "./ashes.js";
import { BIOMES, LOOT_TABLES } from "./biome.js";
import { MONSTERS } from "./monster.js";
import { ITEMS } from "./item.js";
import { STATUS_EFFECTS } from "./status.js";
import {
  gameState,
  getEffectiveStats,
  runtimeState,
  getHealth,
} from "./state.js";
import { getUpgradeCost, upgradeStat, equipItem } from "./actions.js";
import { startExploration } from "./core.js";
import { saveGame } from "./save.js";
import { checkForUpdate } from "./game.js";

export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

export const updateCycleDisplay = () => {
  const el = document.getElementById("cycle-count");
  if (!el) return;
  if (runtimeState.currentLoopCount > 0) {
    el.innerText = `+${runtimeState.currentLoopCount}`;
    el.style.color = "var(--hover-btn)";
  } else {
    el.innerText = "";
  }
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

  const statsList = ["vigor", "strength", "dexterity", "intelligence"];
  statsList.forEach((s) => {
    const baseVal = base[s];
    document.getElementById(`base-${s}`).innerText = baseVal;

    const bonus = eff[s] - baseVal;
    const bonusEl = document.getElementById(`bonus-${s}`);
    if (bonus !== 0) {
      bonusEl.innerText =
        bonus > 0 ? ` (+${bonus.toFixed(1)})` : ` (${bonus.toFixed(1)})`;
      bonusEl.style.color = bonus > 0 ? "#4dff4d" : "#ff4d4d";
    } else {
      bonusEl.innerText = "";
    }

    const cost = getUpgradeCost(s);
    document.getElementById(`cost-${s}`).innerText = formatNumber(cost);
    const btn = document.querySelector(`button[onclick="upgradeStat('${s}')"]`);
    if (btn) btn.disabled = gameState.runes.banked < cost;
  });

  const updateCrit = (id, statName, isPercent) => {
    const val = eff[statName];
    const cost = getUpgradeCost(statName);
    const btn = document.querySelector(
      `button[onclick="upgradeStat('${statName}')"]`,
    );

    document.getElementById(`eff-${id}`).innerText = isPercent
      ? (val * 100).toFixed(1) + "%"
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
  Object.keys(gameState.equipped).forEach((slotType) => {
    const itemId = gameState.equipped[slotType];
    const slot = document.getElementById(`slot-${slotType}`);
    if (!slot) return;
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
    slot.innerText = "Vide";
    slot.onmouseenter = null;
    slot.onmousemove = null;
    slot.onmouseleave = null;
  });

  const ashSlot = document.getElementById("slot-ash");
  const equippedAshId = gameState.equippedAsh;
  if (equippedAshId) {
    const ashData = ASHES_OF_WAR[equippedAshId];
    ashSlot.innerText = ashData.name;
    ashSlot.onmouseenter = (e) => showAshTooltip(e, equippedAshId);
    ashSlot.onmousemove = (e) => moveTooltip(e);
    ashSlot.onmouseleave = () => hideTooltip();
  } else {
    ashSlot.innerText = "Vide";
    ashSlot.onmouseenter = null;
    ashSlot.onmousemove = null;
    ashSlot.onmouseleave = null;
  }
};

const updateBiomeDisplay = () => {
  const list = document.getElementById("biome-list");
  list.innerHTML = "";

  Object.keys(BIOMES).forEach((id) => {
    if (!gameState.world.unlockedBiomes.includes(id)) return;

    const btn = document.createElement("button");
    btn.innerText = BIOMES[id].name;
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

  // 1. Définir l'ordre de tri (Arme > Armure > Accessoire)
  const typeOrder = {
    Arme: 1,
    Armure: 2,
    Accessoire: 3,
  };

  // 2. Trier une copie de l'inventaire
  const sortedInventory = [...gameState.inventory].sort((a, b) => {
    const typeA = ITEMS[a.id].type; // On récupère le type via l'ID
    const typeB = ITEMS[b.id].type;

    // Tri par type selon l'ordre défini
    if (typeOrder[typeA] !== typeOrder[typeB]) {
      return typeOrder[typeA] - typeOrder[typeB];
    }

    // Optionnel : trier par niveau si les types sont identiques
    return b.level - a.level;
  });

  const typeToSlotKey = {
    Arme: "weapon",
    Armure: "armor",
    Accessoire: "accessory",
  };

  // 3. On utilise sortedInventory au lieu de gameState.inventory pour l'affichage
  sortedInventory.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "inventory-item";

    const itemData = ITEMS[item.id];
    const slotKey = typeToSlotKey[itemData.type];

    if (slotKey) {
      itemDiv.classList.add(`item-type-${slotKey}`);
    }

    const currentlyEquippedId = gameState.equipped[slotKey];
    if (currentlyEquippedId && currentlyEquippedId === item.id) {
      itemDiv.classList.add("equipped-highlight"); // Ajoute un style pour l'objet équipé
    }

    const progressText =
      item.level >= 10 ? "MAX" : `(${item.count}/${item.level})`;
    itemDiv.innerHTML = `<strong>${item.name}</strong><br>Niv.${item.level}<br>${progressText}`;
    attachTooltipEvents(itemDiv, item);

    itemDiv.onclick = () => equipItem(item.id);
    invGrid.appendChild(itemDiv);
  });
};

export const updateStatusIcons = () => {
  const pContainer = document.getElementById("player-status-container");
  const eContainer = document.getElementById("enemy-status-container");

  const renderStatus = (eff) => {
    const data = STATUS_EFFECTS[eff.id];
    if (!data) return "";

    let text = "";
    if (eff.id === "BLEED" || eff.id === "FROSTBITE") {
      text = ` (${eff.stacks})`;
    } else {
      // Si la durée est >= 50, on considère que c'est un passif et on n'affiche pas de chiffre
      text = eff.duration >= 50 ? "" : ` (${eff.duration})`;
    }

    return `<div class="status-icon" style="background-color: ${data.color}" title="${data.name}">
              ${data.name}${text}
            </div>`;
  };

  if (pContainer) {
    pContainer.innerHTML = gameState.playerEffects.map(renderStatus).join("");
  }

  if (eContainer) {
    eContainer.innerHTML = gameState.ennemyEffects.map(renderStatus).join("");
  }
};

window.primeAsh = () => {
  if (runtimeState.ashUsesLeft > 0 && !runtimeState.ashIsPrimed) {
    runtimeState.ashIsPrimed = true;
    ActionLog("Posture de combat !", "log-self");
    document.getElementById("ash-button").classList.add("ash-primed");
  }
};

export const updateAshButton = () => {
  const ashBtn = document.getElementById("ash-button");
  const ash = ASHES_OF_WAR[gameState.equippedAsh];
  if (ash && gameState.world.isExploring) {
    document.getElementById("ash-name").innerText = ash.name;
    document.getElementById("ash-uses").innerText = runtimeState.ashUsesLeft;
    ashBtn.disabled = runtimeState.ashUsesLeft <= 0 || runtimeState.ashIsPrimed;

    if (runtimeState.ashIsPrimed) {
      ashBtn.classList.add("ash-primed");
    } else {
      ashBtn.classList.remove("ash-primed");
    }
  }
};

const updateAshesDisplay = () => {
  const container = document.getElementById("ashes-list");
  if (!container || gameState.ashesOfWarOwned.length === 0) return;

  container.innerHTML = "";

  gameState.ashesOfWarOwned.forEach((ashId) => {
    const data = ASHES_OF_WAR[ashId];
    const isEquipped = gameState.equippedAsh === ashId;

    const btn = document.createElement("button");
    btn.className = `ash-item ${isEquipped ? "active-ash" : ""}`;
    btn.innerHTML = `
      <strong>${data.name}</strong><br>
      <small>${data.maxUses} utilisations</small>
    `;

    btn.onclick = () => equipAsh(ashId);
    btn.onmouseenter = (e) => showAshTooltip(e, ashId);
    btn.onmousemove = (e) => moveTooltip(e);
    btn.onmouseleave = () => hideTooltip();
    container.appendChild(btn);
  });
};

let showRealTime = false;

export const toggleRealTimeStats = () => {
  showRealTime = !showRealTime;
  const panel = document.getElementById("real-time-stats-panel");
  panel.style.display = showRealTime ? "block" : "none";
  updateRealTimeStatsDisplay();
};

export const updateRealTimeStatsDisplay = () => {
  if (!showRealTime) return;

  const eff = getEffectiveStats();
  const container = document.getElementById("real-time-content");

  // Calcul des stats spécifiques
  const dodgeChance = Math.floor(Math.min(0.5, eff.dexterity / 400) * 100);
  const flatPen = eff.flatDamagePenetration || 0;
  const percentPen = (eff.percentDamagePenetration || 0) * 100;

  container.innerHTML = `
    <div class="rt-stat"><span>Niveau:</span> <b>${eff.level || 0}</b></div>
    <hr>
    <div class="rt-stat"><span>Force Totale:</span> <b>${eff.strength.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Vigueur Totale:</span> <b>${eff.vigor.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Dextérité Totale:</span> <b>${eff.dexterity.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Int Totale:</span> <b>${eff.intelligence.toFixed(1)}</b></div>
    <hr>
    <div class="rt-stat"><span>Taux d'Esquive:</span> <b>${dodgeChance.toFixed(1)}%</b></div>
    <div class="rt-stat"><span>Pénétration (Fixe):</span> <b>${flatPen.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Pénétration (%):</span> <b>${percentPen.toFixed(1)}%</b></div>
    <hr>
    <div class="rt-stat"><span>Armure:</span> <b>${eff.armor.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Attaques / Tour:</span> <b>${eff.attacksPerTurn}</b></div>
    <div class="rt-stat"><span>Dégâts Zone (Splash):</span> <b>${(eff.splashDamage || 0).toFixed(1)}</b></div>
    <div class="rt-stat"><span>Deg. Min. Épines:</span> <b>${Math.floor(eff.vigor / 2) || 0}</b></div>
  `;
};

export const updateUI = () => {
  updateRuneDisplay();
  updateStatDisplay();
  updateEquipmentDisplay();
  updateBiomeDisplay();
  updateInventoryDisplay();
  updateCycleDisplay();
  updateStatusIcons();
  updateAshButton();
  updateAshesDisplay();
  updateRealTimeStatsDisplay();
};

export const toggleView = (view) => {
  const camp = document.getElementById("camp-view");
  const biome = document.getElementById("biome-view");
  const particles = document.getElementById("fire-particles");

  if (view === "biome") {
    camp.style.display = "none";
    biome.style.display = "block";
    gameState.world.isExploring = true;
    if (particles) particles.classList.add("hidden");
    playDungeonMusic();
  } else {
    gameState.runes.banked += gameState.runes.carried;
    gameState.runes.carried = 0;
    document.getElementById("action-log").innerHTML =
      "<p>De retour au repos...</p>";
    camp.style.display = "block";
    biome.style.display = "none";
    gameState.world.isExploring = false;
    if (particles) particles.classList.remove("hidden");
    playCampMusic();
    checkForUpdate();
    saveGame();
  }
  updateUI();
};

export const ActionLog = (message, className = "") => {
  const log = document.getElementById("action-log");
  const entry = document.createElement("p");
  entry.innerText = `> ${message}`;
  if (className) {
    entry.className = className;
  }
  log.prepend(entry);
};

export const updateHealthBars = () => {
  const stats = getEffectiveStats();
  const playerMaxHp = getHealth(stats.vigor);
  const playerPercent = (runtimeState.playerCurrentHp / playerMaxHp) * 100;
  document.getElementById("player-hp-fill").style.width = `${Math.max(
    0,
    playerPercent,
  )}%`;
  document.getElementById("player-hp-text").innerText = `${formatNumber(
    Math.floor(runtimeState.playerCurrentHp),
  )} / ${formatNumber(playerMaxHp)}`;

  const enemyBar = document.getElementById("enemy-hp-fill");
  const enemyText = document.getElementById("enemy-hp-text");
  if (
    runtimeState.currentEnemyGroup &&
    runtimeState.currentEnemyGroup.length > 0
  ) {
    const firstEnemy = runtimeState.currentEnemyGroup[0];
    const enemyPercent = (firstEnemy.hp / firstEnemy.maxHp) * 100;
    enemyBar.style.width = `${Math.max(0, enemyPercent)}%`;
    enemyText.innerText = `${formatNumber(
      Math.floor(firstEnemy.hp),
    )} / ${formatNumber(firstEnemy.maxHp)}`;
  } else {
    enemyBar.style.width = "0%";
    enemyText.innerText = "0 / 0";
  }
};

export const triggerShake = () => {
  const container = document.getElementById("game-container");
  container.classList.add("shake-effect");
  setTimeout(() => {
    container.classList.remove("shake-effect");
  }, 400);
};

export const showTooltip = (e, item) => {
  const tooltip = document.getElementById("tooltip");
  const itemData = ITEMS[item.id];

  // 1. On utilise tes VRAIES statistiques actuelles comme base de calcul
  const base = {
    ...gameState.stats,
    // Valeurs par défaut si non définies dans ton state initial
    critChance: gameState.stats.critChance ?? 0.05,
    critDamage: gameState.stats.critDamage ?? 1.5,
    attacksPerTurn: gameState.stats.attacksPerTurn ?? 1,
    armor: gameState.stats.armor ?? 0,
    splashDamage: gameState.stats.splashDamage ?? 0,
  };

  // 2. Deep copy pour simuler l'application de l'item sans modifier ton vrai perso
  const modified = JSON.parse(JSON.stringify(base));
  if (itemData.applyFlat) {
    itemData.applyFlat(modified, item.level);
  }
  if (itemData.applyMult) itemData.applyMult(modified, item.level);

  let statBonus = "";
  // Liste des stats à comparer
  const statsToCompare = [
    "vigor",
    "strength",
    "dexterity",
    "intelligence",
    "armor",
    "splashDamage",
  ];

  statsToCompare.forEach((s) => {
    if (base[s] === undefined) return;

    const diff = modified[s] - base[s];

    if (diff !== 0) {
      const isPos = diff > 0;
      const color = isPos ? "#4dff4d" : "#ff4d4d";
      const sign = isPos ? "+" : "";

      // On affiche la valeur absolue de la différence (ex: +3 Vigueur)
      statBonus += `<br><span class="tooltip-stat" style="color:${color}">${sign}${diff.toFixed(0)} ${
        s.charAt(0).toUpperCase() + s.slice(1)
      }</span>`;
    }
  });

  // Gestion des statistiques secondaires (Critiques et Attaques)
  if (Math.abs(modified.critChance - base.critChance) > 0.001) {
    const cDiff = (modified.critChance - base.critChance) * 100;
    statBonus += `<br><span style="color:#4dff4d">+${cDiff.toFixed(1)}% Chance Crit</span>`;
  }

  if (Math.abs(modified.critDamage - base.critDamage) > 0.01) {
    const dDiff = modified.critDamage - base.critDamage;
    statBonus += `<br><span style="color:#4dff4d">+${dDiff.toFixed(1)}x Dégâts Crit</span>`;
  }

  if (modified.attacksPerTurn > base.attacksPerTurn) {
    statBonus += `<br><span style="color:#4dff4d">+${modified.attacksPerTurn - base.attacksPerTurn} Attaque(s)</span>`;
  }

  tooltip.innerHTML = `
    <strong style="color:var(--active-btn)">${itemData.name} (Niv.${item.level})</strong><br>
    <small style="font-style:italic; color:#aaa;">${itemData.description}</small>
    <hr style="border:0; border-top:1px solid #444; margin:5px 0;">
    <strong>Bonus actuels :</strong>${statBonus || "<br><span style='color:grey'>Aucun effet</span>"}
  `;

  tooltip.classList.remove("tooltip-hidden");
  moveTooltip(e);
};

export const showStatTooltip = (e, statType) => {
  const tooltip = document.getElementById("tooltip");
  const descriptions = {
    vigor: {
      title: "Vigueur",
      text: "Augmente vos points de vie maximum.<br>",
    },
    strength: {
      title: "Force",
      text: "Augmente la puissance de vos attaques.<br><strong>1 point = 1 dégât de base.</strong>",
    },
    dexterity: {
      title: "Dextérité",
      text: "Améliore votre agilité au combat.<br><strong>4 points = 1% d'Esquive.</strong><br><small>(Maximum 50%)</small>. Et 4 points = +1.5 d'Armure. 4 points en dextérité = 1 force. ",
    },
    intelligence: {
      title: "Intelligence",
      text: "Augmente votre capacité à absorber l'énergie des runes.<br><strong>1 point = +1% de Runes.</strong>. 4 points en dextérité = 1 force.",
    },
    critChance: {
      title: "Chance de Critique",
      text: "Probabilité d'infliger un coup critique lors d'une attaque.",
    },
    critDamage: {
      title: "Dégâts Critiques",
      text: "Multiplicateur de dégâts appliqué lors d'un coup critique.",
    },
  };
  const data = descriptions[statType];
  tooltip.innerHTML = `
    <strong style="color:var(--hover-btn)">${data.title}</strong><br>
    <small style="color:beige;">${data.text}</small>
  `;
  tooltip.classList.remove("tooltip-hidden");
  moveTooltip(e);
};

export const showAshTooltip = (e, ashId) => {
  const tooltip = document.getElementById("tooltip");
  const ashData = ASHES_OF_WAR[ashId];
  if (!ashData) return;
  tooltip.innerHTML = `
    <strong style="color:var(--active-btn)">${ashData.name}</strong><br>
    <small style="font-style:italic; color:#aaa;">${ashData.description}</small>
  `;
  tooltip.classList.remove("tooltip-hidden");
  moveTooltip(e);
};

export const moveTooltip = (e) => {
  const tooltip = document.getElementById("tooltip");
  if (tooltip.classList.contains("tooltip-hidden")) return;
  const padding = 15;
  let left = e.clientX + padding;
  let top = e.clientY + padding;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  if (left + tooltipWidth > window.innerWidth) {
    left = e.clientX - tooltipWidth - padding;
  }
  if (top + tooltipHeight > window.innerHeight) {
    top = e.clientY - tooltipHeight - padding;
  }
  left = Math.max(5, left);
  top = Math.max(5, top);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
};

export const hideTooltip = () => {
  document.getElementById("tooltip").classList.add("tooltip-hidden");
};

export const updateStepper = () => {
  const biome = BIOMES[gameState.world.currentBiome];
  const progress = gameState.world.progress;
  const total = biome.length;
  const percent = (progress / total) * 100;
  document.getElementById("stepper-fill").style.width = `${Math.min(
    100,
    percent,
  )}%`;
  document.getElementById("stepper-text").innerText =
    `Ennemis vaincus : ${progress} / ${total}`;
  const markersContainer = document.getElementById("stepper-markers");
  if (progress === 0) {
    markersContainer.innerHTML = "";
    const midPoint = Math.floor(total / 2);
    const graceMarker = document.createElement("div");
    graceMarker.className = "marker marker-grace";
    graceMarker.style.left = `${(midPoint / total) * 100}%`;
    graceMarker.title = "Site de Grâce";
    markersContainer.appendChild(graceMarker);
    const bossMarker = document.createElement("div");
    bossMarker.className = "marker marker-boss";
    bossMarker.style.left = "100%";
    bossMarker.title = "Boss de zone";
    markersContainer.appendChild(bossMarker);
  }
};

export const toggleOptions = (show) => {
  const modal = document.getElementById("options-modal");
  modal.className = show ? "modal-visible" : "modal-hidden";
};

export const createFireParticles = () => {
  const container = document.getElementById("fire-particles");
  if (!container) return;
  const particleCount = 50;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    const size = Math.random() * 7 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    particle.style.animationDuration = `${Math.random() * 5 + 5}s`;
    container.appendChild(particle);
  }
};

export const setAudioListener = () => {
  const volumeSlider = document.getElementById("music-volume");

  if (volumeSlider) {
    const currentVolume = gameState.save?.audioVolume ?? 0.3;
    volumeSlider.value = currentVolume;

    campAudio.volume = currentVolume;
    dungeonAudio.volume = currentVolume;

    volumeSlider.addEventListener("input", (e) => {
      const volume = parseFloat(e.target.value);

      campAudio.volume = volume;
      dungeonAudio.volume = volume;

      if (!gameState.save) gameState.save = {};
      gameState.save.audioVolume = volume;

      saveGame();
    });
  }
};

// ui.js

const attachTooltipEvents = (element, itemOrId, isAsh = false) => {
  // 1. Pour PC : Le hover classique
  element.onmouseenter = (e) =>
    isAsh ? showAshTooltip(e, itemOrId) : showTooltip(e, itemOrId);
  element.onmouseleave = () => hideTooltip();
  element.onmousemove = (e) => moveTooltip(e);

  // 2. Pour Mobile (et PC au clic) : Appuyer pour afficher, relâcher pour cacher
  element.onpointerdown = (e) => {
    // Empêche le clic droit ou les menus contextuels mobiles de gêner
    isAsh ? showAshTooltip(e, itemOrId) : showTooltip(e, itemOrId);
  };

  element.onpointerup = () => hideTooltip();
  element.onpointercancel = () => hideTooltip(); // Si le doigt glisse hors de l'écran
};
