// ui.js
const wikiBtn = document.getElementById("btn-wiki");

if (wikiBtn) {
  wikiBtn.addEventListener("click", () => {
    // Ouvre ton wiki dans un nouvel onglet pour ne pas couper la session de jeu
    window.open("https://clemntts.github.io/wiki-elden-chill/", "_blank");
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
import { STATUS_EFFECTS } from "./status.js";
import {
  gameState,
  getEffectiveStats,
  runtimeState,
  getHealth,
} from "./state.js";
import {
  getUpgradeCost,
  getMultiUpgradeCost,
  upgradeStat,
  equipItem,
  selectBlessing,
  selectPreparationConsumable,
} from "./actions.js";
import { startExploration } from "./core.js";
import { saveGame } from "./save.js";
import { checkForUpdate } from "./game.js";
import { ITEM_SETS } from "./constants.js";
import { ITEMS } from "./item.js";
import {
  applyPreparationStats,
  BLESSINGS,
  PREP_CONSUMABLES,
  EVENT_DEFS,
  HAZARD_LABELS,
  buildEnemyIntent,
  clearRunBuffs,
  describeHazards,
  getCodexBiomeInfo,
  getItemRarity,
  getKnownCodexBiomes,
  syncCodexFromInventory,
} from "./systems.js";
import {
  BIOME_GUIDE,
  BIOME_ORDER,
  getBiomeDangerClass,
  getBiomeGraphDepth,
  getBiomePowerBand,
} from "./world-map.js";

const CAMP_SCREENS = ["hub", "map", "build", "inventory", "codex", "options"];

const ensureUiState = () => {
  if (!gameState.ui) {
    gameState.ui = {
      currentScreen: "hub",
      theme: "light",
      selectedBiomeId: "limgrave_west",
    };
  }
  return gameState.ui;
};

const applyTheme = () => {
  const ui = ensureUiState();
  const body = document.body;
  body.classList.remove("theme-light", "theme-dark");
  body.classList.add(ui.theme === "dark" ? "theme-dark" : "theme-light");
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.innerText = ui.theme === "dark" ? "Mode clair" : "Mode sombre";
  }
};

const updateNavState = () => {
  const ui = ensureUiState();
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const target = btn.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
    btn.classList.toggle("is-active", target === ui.currentScreen);
    btn.disabled = gameState.world.isExploring;
  });
};

const updateScreenState = () => {
  const ui = ensureUiState();
  CAMP_SCREENS.forEach((screenId) => {
    const el = document.getElementById(`screen-${screenId}`);
    if (!el) return;
    el.classList.toggle("is-active", ui.currentScreen === screenId);
  });
};

export const navigateTo = (screenId) => {
  const ui = ensureUiState();
  if (!CAMP_SCREENS.includes(screenId)) return;
  ui.currentScreen = screenId;
  updateScreenState();
  updateNavState();
  if (screenId === "map") {
    requestAnimationFrame(() => {
      updateBiomeDisplay();
    });
  }
  if (!gameState.world.isExploring) {
    saveGame();
  }
};

window.navigateTo = navigateTo;
window.toggleTheme = () => {
  const ui = ensureUiState();
  ui.theme = ui.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveGame();
};

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

const formatSeconds = (s) => {
  const total = Math.floor(Number(s) || 0);
  if (total <= 0) return "0s";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if ((!h && !m) || sec) parts.push(`${sec}s`);
  return parts.join(" ");
};

export const updateOfflineDisplay = () => {
  const ids = ["offline-bank", "offline-bank-b"];
  const btnIds = ["btn-use-offline", "btn-use-offline-b"];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = formatSeconds(gameState.save?.offlineTimeBank || 0);
  });

  btnIds.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const enabled = !!gameState.save?.useOfflineTime;
    btn.innerText = enabled ? "Utiliser : ON" : "Utiliser : OFF";
    btn.classList.toggle("active-offline", enabled);
  });
};

window.toggleUseOfflineTime = () => {
  if (!gameState.save) gameState.save = {};
  gameState.save.useOfflineTime = !gameState.save.useOfflineTime;
  updateOfflineDisplay();
  updateUI();
  saveGame();
};

const updateStatDisplay = () => {
  const eff = getEffectiveStats();
  const base = gameState.stats;
  const maxLevel = gameState.save.maxLevel;
  const currentLevel = gameState.stats.level;
  const remainingLevels = Math.max(0, maxLevel - currentLevel);
  const levelCapBanner = document.getElementById("build-cap-status");

  if (levelCapBanner) {
    levelCapBanner.classList.add("is-visible");
    levelCapBanner.classList.toggle("is-maxed", remainingLevels === 0);
    levelCapBanner.innerText =
      remainingLevels === 0
        ? `Niveau maximum atteint (${currentLevel}/${maxLevel}). Les attributs sont bloques pour cette version.`
        : `Niveau ${currentLevel}/${maxLevel} · ${remainingLevels} amelioration(s) restante(s) avant le cap.`;
  }

  const statsList = ["vigor", "strength", "dexterity", "intelligence"];
  statsList.forEach((s) => {
    const baseVal = base[s];
    document.getElementById(`base-${s}`).innerText = baseVal;

    const bonus = eff[s] - baseVal;
    const bonusEl = document.getElementById(`bonus-${s}`);
    if (bonus !== 0) {
      bonusEl.innerText =
        bonus > 0
          ? `Equip. +${bonus.toFixed(1)}`
          : `Equip. ${bonus.toFixed(1)}`;
      bonusEl.classList.toggle("has-positive", bonus > 0);
      bonusEl.classList.toggle("has-negative", bonus < 0);
    } else {
      bonusEl.innerText = "";
      bonusEl.classList.remove("has-positive", "has-negative");
    }

    // Update +1 button
    const cost = getUpgradeCost(s);
    document.getElementById(`cost-${s}`).innerText =
      currentLevel >= maxLevel ? "CAP" : formatNumber(cost);
    const btn = document.getElementById(`btn-${s}-1`);
    if (btn) {
      btn.disabled = gameState.runes.banked < cost || currentLevel >= maxLevel;
      btn.innerText = currentLevel >= maxLevel ? "MAX" : "+";
      btn.classList.toggle("is-maxed", currentLevel >= maxLevel);
      btn.title =
        currentLevel >= maxLevel
          ? "Niveau maximum atteint"
          : "Ameliorer cette statistique";
    }

    // Update +5 button
    const cost5 = getMultiUpgradeCost(s, 5);
    document.getElementById(`cost-${s}-5`).innerText =
      currentLevel >= maxLevel ? "CAP" : formatNumber(cost5);
    const btn5 = document.getElementById(`btn-${s}-5`);
    if (btn5) {
      btn5.disabled =
        gameState.runes.banked < cost5 || currentLevel + 5 > maxLevel;
      btn5.innerText = currentLevel >= maxLevel ? "MAX" : "+";
      btn5.classList.toggle("is-maxed", currentLevel >= maxLevel);
      btn5.title =
        currentLevel >= maxLevel
          ? "Niveau maximum atteint"
          : "Ameliorer cette statistique";
    }

    // Update +10 button
    const cost10 = getMultiUpgradeCost(s, 10);
    document.getElementById(`cost-${s}-10`).innerText =
      currentLevel >= maxLevel ? "CAP" : formatNumber(cost10);
    const btn10 = document.getElementById(`btn-${s}-10`);
    if (btn10) {
      btn10.disabled =
        gameState.runes.banked < cost10 || currentLevel + 10 > maxLevel;
      btn10.innerText = currentLevel >= maxLevel ? "MAX" : "+";
      btn10.classList.toggle("is-maxed", currentLevel >= maxLevel);
      btn10.title =
        currentLevel >= maxLevel
          ? "Niveau maximum atteint"
          : "Ameliorer cette statistique";
    }
  });

  const updateCrit = (id, statName, isPercent) => {
    const val = eff[statName]; // Valeur effective totale (ex: 0.15 pour 15%)
    const baseVal = base[statName]; // Valeur de base sans equipement (ex: 0.05)
    const bonus = val - baseVal; // Difference apportee par les items/sets (ex: 0.10)

    const cost = getUpgradeCost(statName);
    const btn = document.getElementById(`btn-${id}-1`);

    // Affichage de la valeur totale (ex: 15.0%)
    document.getElementById(`eff-${id}`).innerText = isPercent
      ? (val * 100).toFixed(1) + "%"
      : val.toFixed(1) + "x";

    // Gestion de l'affichage du bonus (ex: +10.0%)
    const bonusEl = document.getElementById(`bonus-${id}`);
    if (bonusEl) {
      if (bonus !== 0) {
        bonusEl.innerText = isPercent
          ? `Equip. +${(bonus * 100).toFixed(1)}%`
          : `Equip. +${bonus.toFixed(1)}x`;
        bonusEl.classList.toggle("has-positive", bonus > 0);
        bonusEl.classList.toggle("has-negative", bonus < 0);
      } else {
        bonusEl.innerText = "";
        bonusEl.classList.remove("has-positive", "has-negative");
      }
    }

    const globalLevelMaxed = currentLevel >= maxLevel;
    document.getElementById(`cost-${id}`).innerText = globalLevelMaxed
      ? "CAP"
      : formatNumber(cost);

    if (btn) {
      const isMax = statName === "critChance" && base.critChance >= 1.0;
      btn.disabled = isMax || gameState.runes.banked < cost || globalLevelMaxed;
      btn.innerText = isMax || globalLevelMaxed ? "MAX" : "+";
      btn.classList.toggle("is-maxed", isMax || globalLevelMaxed);
      btn.title =
        isMax || globalLevelMaxed
          ? "Cap atteint pour cette statistique"
          : "Ameliorer cette statistique";
    }

    // Update +5 button for crit stats
    const cost5 = getMultiUpgradeCost(statName, 5);
    document.getElementById(`cost-${id}-5`).innerText = globalLevelMaxed
      ? "CAP"
      : formatNumber(cost5);
    const btn5 = document.getElementById(`btn-${id}-5`);
    if (btn5) {
      const isMax = statName === "critChance" && base.critChance >= 1.0;
      btn5.disabled =
        isMax || gameState.runes.banked < cost5 || currentLevel + 5 > maxLevel;
      btn5.innerText = isMax || globalLevelMaxed ? "MAX" : "+";
      btn5.classList.toggle("is-maxed", isMax || globalLevelMaxed);
      btn5.title =
        isMax || globalLevelMaxed
          ? "Cap atteint pour cette statistique"
          : "Ameliorer cette statistique";
    }

    // Update +10 button for crit stats
    const cost10 = getMultiUpgradeCost(statName, 10);
    document.getElementById(`cost-${id}-10`).innerText = globalLevelMaxed
      ? "CAP"
      : formatNumber(cost10);
    const btn10 = document.getElementById(`btn-${id}-10`);
    if (btn10) {
      const isMax = statName === "critChance" && base.critChance >= 1.0;
      btn10.disabled =
        isMax ||
        gameState.runes.banked < cost10 ||
        currentLevel + 10 > maxLevel;
      btn10.innerText = isMax || globalLevelMaxed ? "MAX" : "+";
      btn10.classList.toggle("is-maxed", isMax || globalLevelMaxed);
      btn10.title =
        isMax || globalLevelMaxed
          ? "Cap atteint pour cette statistique"
          : "Ameliorer cette statistique";
    }
  };

  updateCrit("critChance", "critChance", true);
  updateCrit("critDamage", "critDamage", false);
};

const updateEquipmentDisplay = () => {
  const renderSlotContent = (slot, title, meta = "", empty = false) => {
    slot.innerHTML = `
      <strong class="slot-item-name">${title}</strong>
      <span class="slot-item-meta">${meta}</span>
    `;
    slot.classList.toggle("slot-empty", empty);
  };

  Object.keys(gameState.equipped).forEach((slotType) => {
    const itemId = gameState.equipped[slotType];
    const slot = document.getElementById(`slot-${slotType}`);
    if (!slot) return;
    if (itemId) {
      const itemInInv = gameState.inventory.find((i) => i.id === itemId);
      if (itemInInv) {
        renderSlotContent(
          slot,
          itemInInv.name,
          `Niveau ${itemInInv.level} · Equipe`,
        );
        slot.onmouseenter = (e) => showItemComparisonTooltip(e, itemInInv);
        slot.onmousemove = (e) => moveTooltip(e);
        slot.onmouseleave = () => hideTooltip();
        return;
      }
    }
    renderSlotContent(slot, "Emplacement vide", "Aucun objet equipe", true);
    slot.onmouseenter = null;
    slot.onmousemove = null;
    slot.onmouseleave = null;
  });

  const ashSlot = document.getElementById("slot-ash");
  const equippedAshId = gameState.equippedAsh;
  if (equippedAshId) {
    const ashData = ASHES_OF_WAR[equippedAshId];
    renderSlotContent(
      ashSlot,
      ashData.name,
      `${runtimeState.ashUsesLeft}/${ashData.maxUses} charges disponibles`,
    );
    ashSlot.onmouseenter = (e) => showAshTooltip(e, equippedAshId);
    ashSlot.onmousemove = (e) => moveTooltip(e);
    ashSlot.onmouseleave = () => hideTooltip();
  } else {
    renderSlotContent(
      ashSlot,
      "Aucune cendre equipee",
      "Selectionnez une ouverture",
      true,
    );
    ashSlot.onmouseenter = null;
    ashSlot.onmousemove = null;
    ashSlot.onmouseleave = null;
  }
};

const updateInventoryEquippedDisplay = () => {
  const container = document.getElementById("inventory-equipped-grid");
  if (!container) return;

  const equippedEntries = [
    { key: "weapon", label: "Arme", emptyLabel: "Aucune arme equipee" },
    { key: "armor", label: "Armure", emptyLabel: "Aucune armure equipee" },
    {
      key: "accessory",
      label: "Accessoire",
      emptyLabel: "Aucun accessoire equipe",
    },
    { key: "ash", label: "Cendre", emptyLabel: "Aucune cendre equipee" },
  ];

  container.innerHTML = "";

  equippedEntries.forEach(({ key, label, emptyLabel }) => {
    const card = document.createElement("div");
    card.className = `inventory-equipped-card item-type-${key}`;

    if (key === "ash") {
      const equippedAshId = gameState.equippedAsh;
      if (equippedAshId) {
        const ashData = ASHES_OF_WAR[equippedAshId];
        card.innerHTML = `
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${ashData.name}</strong>
          <span class="inventory-equipped-meta">${runtimeState.ashUsesLeft}/${ashData.maxUses} charges</span>
        `;
        card.onmouseenter = (e) => showAshTooltip(e, equippedAshId);
        card.onmousemove = (e) => moveTooltip(e);
        card.onmouseleave = () => hideTooltip();
      } else {
        card.classList.add("inventory-equipped-empty");
        card.innerHTML = `
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${emptyLabel}</strong>
          <span class="inventory-equipped-meta">A selectionner dans Build</span>
        `;
      }
    } else {
      const itemId = gameState.equipped[key];
      const itemInInv = itemId
        ? gameState.inventory.find((item) => item.id === itemId)
        : null;

      if (itemInInv) {
        card.innerHTML = `
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${itemInInv.name}</strong>
          <span class="inventory-equipped-meta">Niv.${itemInInv.level} · Equipe</span>
        `;
        attachTooltipEvents(card, itemInInv);
      } else {
        card.classList.add("inventory-equipped-empty");
        card.innerHTML = `
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${emptyLabel}</strong>
          <span class="inventory-equipped-meta">A equiper depuis l'inventaire</span>
        `;
      }
    }

    container.appendChild(card);
  });
};

let selectedBiomeId = ensureUiState().selectedBiomeId || "limgrave_west";
let worldMapGraph = null;

const getKnownBiomeIds = () => {
  const unlocked = new Set(gameState.world.unlockedBiomes || []);
  const reachable = new Set();

  unlocked.forEach((biomeId) => {
    (BIOMES[biomeId]?.unlocks || []).forEach((nextId) => reachable.add(nextId));
  });

  return BIOME_ORDER.filter(
    (biomeId) => unlocked.has(biomeId) || reachable.has(biomeId),
  );
};

const getSuggestedBiomeId = () => {
  const playerLevel = gameState.stats.level || 1;
  const unlocked = BIOME_ORDER.filter((biomeId) =>
    gameState.world.unlockedBiomes.includes(biomeId),
  );

  return (
    unlocked.find((biomeId) => {
      const band = BIOME_GUIDE[biomeId]?.recommendedLevel;
      return band && playerLevel >= band[0] && playerLevel <= band[1];
    }) ||
    unlocked[unlocked.length - 1] ||
    "limgrave_west"
  );
};

const renderJourneyOverview = () => {
  const container = document.getElementById("journey-overview");
  if (!container) return;

  const playerLevel = gameState.stats.level || 1;
  const suggestedId = getSuggestedBiomeId();
  const suggestedGuide = BIOME_GUIDE[suggestedId];
  const eff = getEffectiveStats();
  const unlockedCount = gameState.world.unlockedBiomes.length;

  container.innerHTML = `
    <div class="journey-stat">
      <span class="journey-label">Niveau actuel</span>
      <strong>${playerLevel}</strong>
    </div>
    <div class="journey-stat">
      <span class="journey-label">Biome conseille</span>
      <strong>${BIOMES[suggestedId]?.name || "Inconnu"}</strong>
      <small>${suggestedGuide?.focus || ""}</small>
    </div>
    <div class="journey-stat">
      <span class="journey-label">Signature du build</span>
      <strong>${eff.strength} FOR / ${eff.vigor} VIG / ${eff.armor} ARM</strong>
      <small>${unlockedCount} zones reperees</small>
    </div>
  `;
};

const renderHubFocus = () => {
  const card = document.getElementById("hub-focus-card");
  if (!card) return;

  const suggestedId = getSuggestedBiomeId();
  const biomeId = selectedBiomeId || suggestedId;
  const biome = BIOMES[biomeId];
  const guide = BIOME_GUIDE[biomeId];
  const isUnlocked = gameState.world.unlockedBiomes.includes(biomeId);
  const nextRoute = (biome?.unlocks || [])
    .map((id) => BIOMES[id]?.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  card.innerHTML = `
    <div class="panel-topline">
      <span class="panel-kicker">Biome recommande</span>
      <span class="panel-note">${guide?.chapter || "Campagne"} · ${guide?.region || "Inconnu"}</span>
    </div>
    <div>
      <h3 class="hub-focus-card__title">${biome?.name || "Biome inconnu"}</h3>
      <p class="screen-copy">${guide?.focus || "Aucune recommandation disponible."}</p>
    </div>
    <div class="hub-focus-card__stats">
      <div class="hub-focus-card__stat">
        <span class="detail-label">Puissance</span>
        <strong>${getBiomePowerBand(biomeId)}</strong>
      </div>
      <div class="hub-focus-card__stat">
        <span class="detail-label">Danger</span>
        <strong>${guide?.danger || "Inconnu"}</strong>
      </div>
      <div class="hub-focus-card__stat">
        <span class="detail-label">Role</span>
        <strong>${guide?.pathRole || "Biome actif"}</strong>
      </div>
      <div class="hub-focus-card__stat">
        <span class="detail-label">Apres victoire</span>
        <strong>${nextRoute || "Cycle rentable"}</strong>
      </div>
    </div>
    <div class="biome-detail-actions">
      <button id="start-suggested-biome" ${!isUnlocked || gameState.world.isExploring ? "disabled" : ""}>
        ${isUnlocked ? "Explorer ce biome" : "Explorer la carte"}
      </button>
      <button type="button" onclick="navigateTo('map')">Voir la carte detaillee</button>
    </div>
  `;

  const startBtn = document.getElementById("start-suggested-biome");
  if (startBtn) {
    startBtn.onclick = () => {
      if (isUnlocked) {
        startExploration(biomeId);
      } else {
        navigateTo("map");
      }
    };
  }
};

const renderBiomeShortcuts = (visibleIds) => {
  const list = document.getElementById("biome-list");
  if (!list) return;

  list.innerHTML = "";
  visibleIds
    .filter((biomeId) => gameState.world.unlockedBiomes.includes(biomeId))
    .forEach((biomeId) => {
      const guide = BIOME_GUIDE[biomeId];
      const btn = document.createElement("button");
      btn.className =
        biomeId === selectedBiomeId
          ? "biome-shortcut active-shortcut"
          : "biome-shortcut";
      btn.innerHTML = `
        <span class="biome-shortcut__title">${BIOMES[biomeId].name}</span>
        <span class="biome-shortcut__meta">${getBiomePowerBand(biomeId)} · ${guide?.pathRole || "Biome actif"}</span>
      `;
      btn.disabled = gameState.world.isExploring;
      btn.onclick = () => {
        selectedBiomeId = biomeId;
        ensureUiState().selectedBiomeId = biomeId;
        saveGame();
        updateBiomeDisplay();
      };
      list.appendChild(btn);
    });
};

const renderWorldMap = (visibleIds) => {
  const map = document.getElementById("world-map");
  const paths = document.getElementById("world-map-paths");
  if (!map || !paths) return;

  const visibleSet = new Set(visibleIds);
  paths.innerHTML = "";

  if (typeof window.cytoscape === "function") {
    const css = getComputedStyle(document.body);
    const textColor = css.getPropertyValue("--text").trim() || "#2f2418";
    const surfaceStrong =
      css.getPropertyValue("--surface-strong").trim() || "#fffaf1";
    const borderStrong =
      css.getPropertyValue("--border-strong").trim() || "#6f5d3d";
    const success = css.getPropertyValue("--success").trim() || "#607a45";
    const info = css.getPropertyValue("--info").trim() || "#5f7f9f";
    const accent = css.getPropertyValue("--accent").trim() || "#867142";
    const danger = css.getPropertyValue("--danger").trim() || "#b75b3b";
    const elements = [];
    const depthMemo = new Map();
    const groupedByDepth = new Map();

    visibleIds.forEach((biomeId) => {
      const depth = getBiomeGraphDepth(biomeId, depthMemo);
      if (!groupedByDepth.has(depth)) groupedByDepth.set(depth, []);
      groupedByDepth.get(depth).push(biomeId);
    });

    visibleIds.forEach((biomeId) => {
      const guide = BIOME_GUIDE[biomeId];
      const isUnlocked = gameState.world.unlockedBiomes.includes(biomeId);
      const depth = getBiomeGraphDepth(biomeId, depthMemo);
      const siblings = groupedByDepth.get(depth) || [biomeId];
      const siblingIndex = siblings.indexOf(biomeId);
      const hasManualPosition =
        Number.isFinite(guide?.x) && Number.isFinite(guide?.y);
      const centeredOffset = siblingIndex - (siblings.length - 1) / 2;
      const autoX = depth * 240 + 140;
      const autoY = 420 + centeredOffset * 170;
      elements.push({
        data: {
          id: biomeId,
          label: BIOMES[biomeId]?.name || biomeId,
          band: getBiomePowerBand(biomeId),
          state: isUnlocked ? "unlocked" : "reachable",
        },
        position: {
          x: hasManualPosition ? guide.x * 18 : autoX,
          y: hasManualPosition ? guide.y * 18 : autoY,
        },
        classes: `${isUnlocked ? "unlocked-node" : "reachable-node"} ${
          biomeId === selectedBiomeId ? "selected-node" : ""
        }`,
      });

      (BIOMES[biomeId]?.unlocks || []).forEach((nextId) => {
        if (!visibleSet.has(nextId) || !BIOME_GUIDE[nextId]) return;
        elements.push({
          data: {
            id: `${biomeId}->${nextId}`,
            source: biomeId,
            target: nextId,
          },
        });
      });
    });

    if (worldMapGraph) {
      worldMapGraph.destroy();
      worldMapGraph = null;
    }

    const currentGraph = window.cytoscape({
      container: map,
      elements,
      layout: {
        name: "preset",
        fit: false,
        padding: 80,
        animate: false,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: true,
      wheelSensitivity: 0.16,
      style: [
        {
          selector: "node",
          style: {
            width: 28,
            height: 28,
            label: "data(label)",
            "font-family": "Cinzel Decorative",
            "font-size": 9,
            color: textColor,
            "text-wrap": "wrap",
            "text-max-width": 88,
            "text-valign": "bottom",
            "text-margin-y": 10,
            "background-color": surfaceStrong,
            "border-width": 2,
            "border-color": borderStrong,
            "overlay-opacity": 0,
            "text-background-color": "rgba(255,255,255,0.0)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-style": "dashed",
            "line-dash-pattern": [8, 5],
            "line-color": borderStrong,
            "target-arrow-shape": "none",
            "curve-style": "bezier",
            opacity: 0.9,
          },
        },
        {
          selector: ".unlocked-node",
          style: {
            "border-color": success,
            "background-color": surfaceStrong,
          },
        },
        {
          selector: ".reachable-node",
          style: {
            "border-color": info,
            "background-color": surfaceStrong,
          },
        },
        {
          selector: ".selected-node",
          style: {
            width: 42,
            height: 42,
            "border-color": danger,
            "border-width": 4,
            "background-color": surfaceStrong,
            "z-index": 999,
          },
        },
        {
          selector: ".selected-node[label]",
          style: {
            "font-size": 11,
            color: danger,
          },
        },
      ],
    });
    worldMapGraph = currentGraph;

    currentGraph.off("tap");
    currentGraph.on("tap", "node", (event) => {
      const biomeId = event.target.id();
      selectedBiomeId = biomeId;
      ensureUiState().selectedBiomeId = biomeId;
      saveGame();
      updateBiomeDisplay();
    });

    const selectedNode = currentGraph.getElementById(selectedBiomeId);
    if (selectedNode && selectedNode.length) {
      requestAnimationFrame(() => {
        if (!currentGraph || currentGraph !== worldMapGraph) return;
        if (currentGraph.destroyed()) return;
        if (!currentGraph._private?.renderer) return;

        try {
          currentGraph.resize();
          currentGraph.center(selectedNode);
          const nodeCount = visibleIds.length;
          const targetZoom = nodeCount > 12 ? 1.35 : nodeCount > 8 ? 1.2 : 1.05;
          currentGraph.zoom({
            level: targetZoom,
            renderedPosition: {
              x: map.clientWidth / 2,
              y: map.clientHeight / 2,
            },
          });
        } catch (error) {
          console.warn("World map recenter skipped:", error);
        }
      });
    }
    return;
  }

  map.innerHTML = "";
};

const renderBiomeDetail = (biomeId) => {
  const card = document.getElementById("biome-detail-card");
  if (!card || !biomeId) return;

  const biome = BIOMES[biomeId];
  const guide = BIOME_GUIDE[biomeId];
  const isUnlocked = gameState.world.unlockedBiomes.includes(biomeId);
  const lootPreview = (LOOT_TABLES[biomeId] || [])
    .map((loot) => ITEMS[loot.id]?.name)
    .filter(Boolean)
    .slice(0, 3);
  const nextBiomes = (biome.unlocks || [])
    .map((nextId) => BIOMES[nextId]?.name)
    .filter(Boolean);
  const monsters = (biome.monsters || [])
    .map((monsterId) => MONSTERS[monsterId]?.name)
    .filter(Boolean)
    .slice(0, 3);
  const rares = (biome.rareMonsters || [])
    .map((monsterId) => MONSTERS[monsterId]?.name)
    .filter(Boolean)
    .slice(0, 2);
  const bossName = MONSTERS[biome.boss]?.name || "Inconnu";

  card.innerHTML = `
    <div class="biome-detail-header">
      <div>
        <p class="detail-kicker">${guide?.chapter || "Zone"} · ${guide?.region || "Inconnu"}</p>
        <h4>${biome.name}</h4>
      </div>
      <span class="danger-badge ${getBiomeDangerClass(biomeId)}">${guide?.danger || "Inconnu"}</span>
    </div>
    <p class="biome-focus">${guide?.focus || "Aucune recommandation disponible."}</p>
    <div class="biome-detail-grid">
      <div class="detail-block">
        <span class="detail-label">Puissance attendue</span>
        <strong>${getBiomePowerBand(biomeId)}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Boss</span>
        <strong>${bossName}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Menaces</span>
        <strong>${monsters.join(", ") || "???"}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Rares</span>
        <strong>${rares.join(", ") || "Aucun repere"}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Recompenses</span>
        <strong>${lootPreview.join(", ") || "Butin special inconnu"}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Afflictions</span>
        <strong>${describeHazards(biomeId)}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Apres la victoire</span>
        <strong>${nextBiomes.join(", ") || "Cul-de-sac rentable"}</strong>
      </div>
    </div>
    <div class="biome-detail-actions">
      <button id="start-selected-biome" ${!isUnlocked || gameState.world.isExploring ? "disabled" : ""}>
        ${isUnlocked ? "Explorer cette zone" : "Zone pas encore debloquee"}
      </button>
      <span class="detail-path-role">${guide?.pathRole || ""}</span>
    </div>
  `;

  const startButton = document.getElementById("start-selected-biome");
  if (startButton && isUnlocked) {
    startButton.onclick = () => startExploration(biomeId);
  }
};

const updateBiomeDisplay = () => {
  selectedBiomeId = ensureUiState().selectedBiomeId || selectedBiomeId;
  const visibleIds = getKnownBiomeIds();
  if (!selectedBiomeId || !visibleIds.includes(selectedBiomeId)) {
    selectedBiomeId = getSuggestedBiomeId();
    ensureUiState().selectedBiomeId = selectedBiomeId;
  }

  renderJourneyOverview();
  renderWorldMap(visibleIds);
  renderBiomeDetail(selectedBiomeId);
  renderBiomeShortcuts(visibleIds);
  renderHubFocus();
};

const renderPreparationDisplay = () => {
  const blessingsRoot = document.getElementById("blessings-list");
  const consumablesRoot = document.getElementById("consumables-list");
  if (!blessingsRoot || !consumablesRoot) return;

  blessingsRoot.innerHTML = "";
  consumablesRoot.innerHTML = "";

  const createEmptyPrepOption = ({
    title,
    description,
    details,
    active,
    onClick,
  }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "prep-option prep-option-empty";
    btn.classList.toggle("is-active", active);
    btn.innerHTML = `
      <strong>${title}</strong>
      <span>${description}</span>
      <small>${details}</small>
    `;
    btn.onclick = onClick;
    return btn;
  };

  blessingsRoot.appendChild(
    createEmptyPrepOption({
      title: "Aucune bénédiction",
      description:
        "Partir sans grâce active et compter uniquement sur le build.",
      details: "Aucun bonus temporaire n'est appliqué pour cette expédition.",
      active: !gameState.preparation?.selectedBlessingId,
      onClick: () => selectBlessing(null),
    }),
  );

  consumablesRoot.appendChild(
    createEmptyPrepOption({
      title: "Aucun atout",
      description: "Conserver ses outils et partir sans atout d'expedition.",
      details: "Aucun modificateur de run n'est applique au depart.",
      active: !gameState.preparation?.selectedConsumableId,
      onClick: () => selectPreparationConsumable(null),
    }),
  );

  const unlockedBlessings = new Set(
    gameState.preparation?.unlockedBlessings || [],
  );
  const unlockedConsumables = new Set(
    gameState.preparation?.unlockedConsumables || [],
  );

  Object.values(BLESSINGS)
    .filter((blessing) => unlockedBlessings.has(blessing.id))
    .forEach((blessing) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prep-option";
      btn.classList.toggle(
        "is-active",
        gameState.preparation?.selectedBlessingId === blessing.id,
      );
      btn.innerHTML = `
      <strong>${blessing.name}</strong>
      <span>${blessing.description}</span>
      <small>${blessing.detailedDescription || ""}</small>
    `;
      btn.onclick = () => selectBlessing(blessing.id);
      blessingsRoot.appendChild(btn);
    });

  Object.values(PREP_CONSUMABLES)
    .filter((consumable) => unlockedConsumables.has(consumable.id))
    .forEach((consumable) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prep-option";
      btn.classList.toggle(
        "is-active",
        gameState.preparation?.selectedConsumableId === consumable.id,
      );
      btn.innerHTML = `
      <strong>${consumable.name}</strong>
      <span>${consumable.description}</span>
      <small>${consumable.detailedDescription || ""}</small>
    `;
      btn.onclick = () => selectPreparationConsumable(consumable.id);
      consumablesRoot.appendChild(btn);
    });
};

window.setJournalFilter = (value) => {
  if (!gameState.journal) return;
  gameState.journal.filter = value;
  updateJournalDisplay();
  saveGame();
};

const updateJournalDisplay = () => {
  const root = document.getElementById("journal-entries");
  const filterEl = document.getElementById("journal-filter-kind");
  if (!root) return;
  const filterValue = gameState.journal?.filter || "all";
  if (filterEl) filterEl.value = filterValue;
  const entries = (gameState.journal?.entries || [])
    .filter((entry) => entry.runId === runtimeState.currentCombatSession)
    .filter((entry) => filterValue === "all" || entry.kind === filterValue);

  root.innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <article class="journal-entry">
              <div class="journal-entry-head">
                <strong>${entry.title}</strong>
                <span>${BIOMES[entry.biomeId]?.name || "Monde"}</span>
              </div>
              <p>${entry.text}</p>
            </article>
          `,
        )
        .join("")
    : `<p class="journal-empty">Le journal s'ecrira au fil de la prochaine expedition.</p>`;
};

const updateCodexDisplay = () => {
  syncCodexFromInventory();
  const bossRoot = document.getElementById("codex-bosses");
  const monsterRoot = document.getElementById("codex-monsters");
  const setsRoot = document.getElementById("codex-sets");
  const biomeRoot = document.getElementById("codex-biomes");
  const eventsRoot = document.getElementById("codex-events");
  if (!bossRoot || !monsterRoot || !setsRoot || !biomeRoot || !eventsRoot) {
    return;
  }

  const renderList = (root, rows, emptyLabel) => {
    root.innerHTML = rows.length
      ? rows
          .map(
            (row) => `
              <article class="codex-entry">
                <strong>${row.title}</strong>
                <span>${row.meta || ""}</span>
                ${row.copy ? `<p>${row.copy}</p>` : ""}
              </article>
            `,
          )
          .join("")
      : `<p class="codex-empty">${emptyLabel}</p>`;
  };

  renderList(
    bossRoot,
    Object.keys(gameState.codex?.bossesSeen || {}).map((monsterId) => ({
      title: MONSTERS[monsterId]?.name || monsterId,
      meta:
        BIOMES[gameState.codex.bossesSeen[monsterId].biomeId]?.name ||
        "Biome inconnu",
      copy: "Boss reference de votre route et mur de progression memorise.",
    })),
    "Aucun boss note pour le moment.",
  );

  renderList(
    monsterRoot,
    Object.keys(gameState.codex?.monstersSeen || {}).map((monsterId) => ({
      title: MONSTERS[monsterId]?.name || monsterId,
      meta:
        BIOMES[gameState.codex.monstersSeen[monsterId].biomeId]?.name ||
        "Biome inconnu",
      copy: MONSTERS[monsterId]?.isRare
        ? "Elite rencontre"
        : "Menace repertoriee",
    })),
    "Aucun monstre consigne pour le moment.",
  );

  renderList(
    setsRoot,
    Object.keys(gameState.codex?.setsSeen || {}).map((setId) => ({
      title: ITEM_SETS[setId]?.name || setId,
      meta: "Set decouvert",
      copy: Object.values(ITEMS)
        .filter((item) => item.set === setId)
        .map((item) => item.name)
        .slice(0, 3)
        .join(" · "),
    })),
    "Aucun set identifie pour le moment.",
  );

  renderList(
    biomeRoot,
    getKnownCodexBiomes().map((biomeId) => {
      const info = getCodexBiomeInfo(biomeId);
      return {
        title: info.biome?.name || biomeId,
        meta: info.guide
          ? `Niv. ${info.guide.recommendedLevel[0]}-${info.guide.recommendedLevel[1]}`
          : "",
        copy: info.guide ? describeHazards(biomeId) : "Biome nettoye",
      };
    }),
    "Aucun biome entierement nettoye pour le moment.",
  );

  renderList(
    eventsRoot,
    Object.keys(gameState.codex?.eventsSeen || {}).map((eventId) => ({
      title: EVENT_DEFS[eventId]?.title || eventId,
      meta:
        BIOMES[gameState.codex.eventsSeen[eventId].biomeId]?.name || "Campagne",
      copy: EVENT_DEFS[eventId]?.kind || "Evenement",
    })),
    "Aucun evenement note pour le moment.",
  );
};

const ensureBattleIntelStrip = () => {
  let strip = document.getElementById("battle-intel-strip");
  if (strip) return strip;

  const combatHud = document.getElementById("combat-hud");
  if (!combatHud) return null;

  strip = document.createElement("div");
  strip.id = "battle-intel-strip";
  strip.className = "battle-intel-strip";
  combatHud.insertAdjacentElement("afterend", strip);
  return strip;
};

const updateCombatPresentation = () => {
  const playerCard = document.getElementById("player-combat-card");
  const enemyCard = document.getElementById("enemy-combat-card");
  const battleMeta = document.getElementById("battle-meta");
  const battleHint = document.getElementById("battle-hint");
  if (!playerCard || !enemyCard || !battleMeta || !battleHint) return;

  const eff = getEffectiveStats();
  const currentBiome = BIOMES[gameState.world.currentBiome];
  const currentEnemy = runtimeState.currentEnemyGroup?.[0];
  const intelStrip = ensureBattleIntelStrip();
  const progress = gameState.world.progress || 0;
  const total = currentBiome?.length || 0;

  playerCard.querySelector(".combat-card__name").innerText = "Sans-eclat";
  playerCard.querySelector(".combat-card__sub").innerText =
    `FOR ${eff.strength} · VIG ${eff.vigor} · ARM ${eff.armor}`;

  if (!currentEnemy) {
    enemyCard.querySelector(".combat-card__name").innerText = "Aucune menace";
    enemyCard.querySelector(".combat-card__sub").innerText =
      "Le champ de bataille se calme.";
    battleMeta.innerText = currentBiome?.name || "Camp";
    battleHint.innerText =
      "Le prochain affrontement commencera a la rencontre suivante.";
    if (intelStrip) {
      intelStrip.innerHTML = `
        <div class="battle-intel-chip">
          <span>Biome</span>
          <strong>${currentBiome?.name || "Camp"}</strong>
        </div>
        <div class="battle-intel-chip">
          <span>Rythme</span>
          <strong>Accalmie</strong>
        </div>
        <div class="battle-intel-chip">
          <span>Cendre</span>
          <strong>${gameState.equippedAsh ? ASHES_OF_WAR[gameState.equippedAsh].name : "Aucune equipee"}</strong>
        </div>
      `;
    }
    return;
  }

  const enemyCount = runtimeState.currentEnemyGroup.length;
  const prefix = currentEnemy.isBoss
    ? "Boss"
    : currentEnemy.isRare
      ? "Rare"
      : enemyCount > 1
        ? `Groupe x${enemyCount}`
        : "Standard";

  enemyCard.querySelector(".combat-card__name").innerText = currentEnemy.name;
  enemyCard.querySelector(".combat-card__sub").innerText =
    `${prefix} · ATK ${currentEnemy.atk}${currentEnemy.armor ? ` · ARM ${currentEnemy.armor}` : ""}`;
  battleMeta.innerText = `${currentBiome?.name || "Expedition"} · ${runtimeState.currentLoopCount > 0 ? `Cycle ${runtimeState.currentLoopCount + 1}` : "Premier passage"}`;

  if (currentEnemy.isBoss) {
    battleHint.innerText =
      "Boss en vue: cadence, mitigation et statuts doivent deja etre prets.";
  } else if (currentEnemy.isRare) {
    battleHint.innerText =
      "Elite reperee: gros rendement, mais pression nettement superieure au pack standard.";
  } else {
    battleHint.innerText =
      "Pack en cours: lisez les statuts et preparez le prochain palier avant le boss.";
  }

  if (intelStrip) {
    intelStrip.innerHTML = `
      <div class="battle-intel-chip">
        <span>Biome</span>
        <strong>${currentBiome?.name || "Expedition"}</strong>
      </div>
      <div class="battle-intel-chip">
        <span>Progression</span>
        <strong>${progress} / ${total || "?"} · ${prefix}</strong>
      </div>
      <div class="battle-intel-chip">
        <span>Cendre</span>
        <strong>${gameState.equippedAsh ? `${ASHES_OF_WAR[gameState.equippedAsh].name} · ${runtimeState.ashUsesLeft} charge(s)` : "Aucune equipee"}</strong>
      </div>
    `;
  }
};

const updateEnemyIntentDisplay = () => {
  const label = document.getElementById("enemy-intent-label");
  const hint = document.getElementById("enemy-intent-hint");
  const panel = document.getElementById("battle-intent-panel");
  if (!label || !hint || !panel) return;

  const enemy = runtimeState.currentEnemyGroup[0];
  const intent = runtimeState.enemyIntent || buildEnemyIntent(enemy);
  panel.classList.remove(
    "intent-boss",
    "intent-elite",
    "intent-heavy",
    "intent-normal",
  );

  if (!intent) {
    panel.classList.add("intent-normal");
    label.innerText = "Analyse en cours";
    hint.innerText = "Le biome se met en place.";
    return;
  }

  panel.classList.add(`intent-${intent.severity || "normal"}`);
  label.innerText = intent.label;
  hint.innerText = [
    intent.targetHint,
    intent.hazard ? HAZARD_LABELS[intent.hazard] : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

const ensureBattleLogLayout = () => {
  const root = document.getElementById("action-log");
  if (!root) return null;
  let enemyColumn = document.getElementById("action-log-enemy");
  let playerColumn = document.getElementById("action-log-player");
  if (enemyColumn && playerColumn) {
    return { root, enemyColumn, playerColumn };
  }

  root.innerHTML = `
    <div class="log-column enemy-column">
      <div class="log-column-title">Pression ennemie</div>
      <div class="log-column-body" id="action-log-enemy"></div>
    </div>
    <div class="log-column player-column">
      <div class="log-column-title">Actions du Sans-eclat</div>
      <div class="log-column-body" id="action-log-player"></div>
    </div>
  `;
  enemyColumn = document.getElementById("action-log-enemy");
  playerColumn = document.getElementById("action-log-player");
  return { root, enemyColumn, playerColumn };
};

const getLogSide = (message, className = "") => {
  const playerClasses = [
    "log-self",
    "log-heal",
    "log-runes",
    "log-ash-activation",
  ];
  if (playerClasses.includes(className)) return "player";

  if (
    message.startsWith("Vous") ||
    message.startsWith("Votre heros") ||
    message.startsWith("Vous etes") ||
    message.startsWith("Vous subissez") ||
    message.startsWith("Vous brulez") ||
    message.startsWith("Vous vous blessez") ||
    message.startsWith("CENDRE") ||
    message.startsWith("BOSS VAINCU") ||
    message.startsWith("OBJET UNIQUE") ||
    message.startsWith("Copie de") ||
    message.startsWith("Site de grace") ||
    message.startsWith("De retour") ||
    message.startsWith("ESQUIVE ! Vous")
  ) {
    return "player";
  }

  return "enemy";
};

const getLogKind = (message = "", className = "") => {
  if (className === "log-runes") return "runes";
  if (className === "log-heal") return "heal";
  if (className === "log-event") return "event";
  if (className === "log-ash-activation" || message.startsWith("CENDRE"))
    return "ash";
  if (className === "log-crit" || message.startsWith("BOSS VAINCU"))
    return "boss";
  if (message.includes("esquive") || message.includes("ESQUIVE"))
    return "status";
  if (message.includes("Objet") || message.includes("OBJET")) return "loot";
  return "system";
};

const refreshConversationHighlights = (layout) => {
  if (!layout) return;
  [layout.enemyColumn, layout.playerColumn].forEach((column) => {
    const entries = column.querySelectorAll(".log-entry");
    entries.forEach((entry, index) => {
      entry.classList.toggle("log-entry-latest", index === 0);
    });
  });
};

let currentInventoryFilter = "Tous";
let lastInventorySnapshot = "";
const updateInventoryDisplay = () => {
  const currentSnapshot = JSON.stringify(
    gameState.inventory.map((i) => ({ id: i.id, lv: i.level })),
  );
  if (gameState.world.isExploring) return;
  if (
    currentSnapshot === lastInventorySnapshot &&
    !runtimeState.filterChanged
  ) {
    console.log("MEMORED INVENTORY UPDATE");
    return;
  }
  lastInventorySnapshot = currentSnapshot;
  runtimeState.filterChanged = false;

  const invGrid = document.getElementById("inventory-grid");
  invGrid.innerHTML = "";

  if (gameState.inventory.length === 0) {
    invGrid.innerHTML =
      '<div style="color: grey; margin-bottom: 10px;">Inventaire vide</div>';
    return;
  }

  const filteredInventory = gameState.inventory.filter((item) => {
    if (currentInventoryFilter === "Tous") return true;
    return ITEMS[item.id].type === currentInventoryFilter;
  });

  // 2. Trier une copie de l'inventaire
  const sortedInventory = filteredInventory.sort((a, b) => b.level - a.level);

  if (sortedInventory.length === 0) {
    invGrid.innerHTML =
      '<div style="color: grey; padding: 10px;">Aucun objet de ce type</div>';
    return;
  }

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
    itemDiv.classList.add(`rarity-${getItemRarity(item.id)}`);

    const currentlyEquippedId = gameState.equipped[slotKey];
    if (currentlyEquippedId && currentlyEquippedId === item.id) {
      itemDiv.classList.add("equipped-highlight"); // Ajoute un style pour l'objet Ã©quipÃ©
    }

    const progressText =
      item.level >= 10 ? "MAX" : `(${item.count}/${item.level})`;
    itemDiv.innerHTML = `
      <span class="inventory-item-type">${itemData.type}</span>
      <span class="inventory-item-rarity">${getItemRarity(item.id)}</span>
      <strong class="inventory-item-name">${item.name}</strong>
      <span class="inventory-item-meta">Niv.${item.level}</span>
      <span class="inventory-item-progress">${progressText}</span>
    `;
    attachTooltipEvents(itemDiv, item);

    itemDiv.onclick = () => equipItem(item.id);
    invGrid.appendChild(itemDiv);
  });
};

window.setInventoryFilter = (type) => {
  currentInventoryFilter = type;
  runtimeState.filterChanged = true;
  updateInventoryDisplay();
};

window.toggleInventoryCollapse = () => {
  const grid = document.getElementById("inventory-section");
  const btn = document.getElementById("btn-collapse");
  const filters = document.getElementById("filter-buttons");

  if (grid.style.display === "none") {
    grid.style.display = "block";
    filters.style.display = "flex";
    btn.innerText = "▼ Inventaire";
  } else {
    grid.style.display = "none";
    filters.style.display = "none";
    btn.innerText = "▲ Inventaire (replie)";
  }
};

window.toggleInventoryCollapse = () => {
  const grid = document.getElementById("inventory-section");
  const btn = document.getElementById("btn-collapse");
  const filters = document.getElementById("filter-buttons");

  if (!grid || !btn || !filters) return;

  if (grid.style.display === "none") {
    grid.style.display = "block";
    filters.style.display = "flex";
    btn.innerText = "Reduire l'inventaire";
  } else {
    grid.style.display = "none";
    filters.style.display = "none";
    btn.innerText = "Afficher l'inventaire";
  }
};

export const updateStatusIcons = () => {
  const pContainer = document.getElementById("player-status-container");
  const eContainer = document.getElementById("enemy-status-container");

  const renderStatus = (eff) => {
    const data = STATUS_EFFECTS[eff.id];
    if (!data) return "";
    if (eff.id !== "BLEED" && eff.id !== "FROSTBITE" && eff.duration <= 0)
      return "";
    if ((eff.id === "BLEED" || eff.id === "FROSTBITE") && eff.stacks <= 0)
      return "";

    let text = "";
    if (eff.id === "BLEED" || eff.id === "FROSTBITE") {
      text = ` (${eff.stacks})`;
    } else {
      // Si la durÃ©e est >= 50, on considÃ¨re que c'est un passif et on n'affiche pas de chiffre
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
  const container = document.getElementById("ash-container");
  const ashBtn = document.getElementById("ash-button");
  const ash = ASHES_OF_WAR[gameState.equippedAsh];
  if (!container || !ashBtn) return;

  if (ash && gameState.world.isExploring) {
    container.classList.remove("is-hidden");
    document.getElementById("ash-name").innerText = ash.name;
    document.getElementById("ash-uses").innerText = runtimeState.ashUsesLeft;
    ashBtn.disabled = runtimeState.ashUsesLeft <= 0 || runtimeState.ashIsPrimed;

    if (runtimeState.ashIsPrimed) {
      ashBtn.classList.add("ash-primed");
    } else {
      ashBtn.classList.remove("ash-primed");
    }
    return;
  }

  container.classList.add("is-hidden");
  ashBtn.classList.remove("ash-primed");
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

  // Calcul des stats spÃ©cifiques
  const dodgeChance = Math.floor(
    Math.min(0.5, gameState.stats.dexterity / 400) * 100,
  );
  const flatPen = eff.flatDamagePenetration || 0;
  const percentPen = (eff.percentDamagePenetration || 0) * 100;
  const maxHp = Math.floor(getHealth(eff.vigor));
  const resistances = eff.resistances || {};

  container.innerHTML = `
    <div class="rt-stat"><span>Niveau:</span> <b>${eff.level || 0}</b></div>
    <div class="rt-stat"><span>Runes depensees:</span> <b>${gameState.stats.runesSpent || 0}</b></div>
    <hr>
    <div class="rt-stat"><span>Force Totale:</span> <b>${eff.strength.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Vigueur Totale:</span> <b>${eff.vigor.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Points de Vie Max:</span> <b>${maxHp}</b></div> <hr>
    <div class="rt-stat"><span>Dexterite totale:</span> <b>${eff.dexterity.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Int Totale:</span> <b>${eff.intelligence.toFixed(1)}</b></div>
    <hr>
    <div class="rt-stat"><span>Taux d'Esquive:</span> <b>${dodgeChance.toFixed(1)}%</b></div>
    <div class="rt-stat"><span>Penetration (fixe):</span> <b>${flatPen.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Penetration (%):</span> <b>${percentPen.toFixed(1)}%</b></div>
    <hr>
    <div class="rt-stat"><span>Armure:</span> <b>${eff.armor.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Attaques / Tour:</span> <b>${eff.attacksPerTurn}</b></div>
    <div class="rt-stat"><span>Degats de zone (Splash):</span> <b>${(eff.splashDamage || 0).toFixed(1)}</b></div>
    <div class="rt-stat"><span>Deg. min. Epines:</span> <b>${Math.floor(eff.vigor / 2) || 0}</b></div>
    <div class="rt-stat"><span>Mitig. Boss:</span> <b>${((eff.bossMitigation || 0) * 100).toFixed(1)}%</b></div>
    <div class="rt-stat"><span>Gain de Runes:</span> <b>${((eff.runeGainMult || 0) * 100).toFixed(1)}%</b></div>
    <hr>
    <div class="rt-stat"><span>Res. Poison:</span> <b>${resistances.poison || 0}</b></div>
    <div class="rt-stat"><span>Res. Gel:</span> <b>${resistances.gel || 0}</b></div>
    <div class="rt-stat"><span>Res. Folie:</span> <b>${resistances.folie || 0}</b></div>
    <div class="rt-stat"><span>Res. Putrefaction:</span> <b>${resistances.putrefaction || 0}</b></div>
  `;
};

export const updateUI = () => {
  applyTheme();
  updateScreenState();
  updateNavState();
  updateRuneDisplay();
  updateStatDisplay();
  updateEquipmentDisplay();
  updateInventoryEquippedDisplay();
  updateBiomeDisplay();
  renderPreparationDisplay();
  updateCombatPresentation();
  updateEnemyIntentDisplay();
  updateJournalDisplay();
  updateInventoryDisplay();
  updateCodexDisplay();
  updateCycleDisplay();
  updateStatusIcons();
  updateAshButton();
  updateAshesDisplay();
  updateRealTimeStatsDisplay();
  updateOfflineDisplay();
};

export const toggleView = (view) => {
  const camp = document.getElementById("camp-view");
  const biome = document.getElementById("biome-view");
  const particles = document.getElementById("fire-particles");
  const nav = document.getElementById("primary-nav");

  if (view === "biome") {
    camp.style.display = "none";
    biome.style.display = "block";
    gameState.world.isExploring = true;
    ensureUiState().currentScreen = "combat";
    if (nav) nav.style.display = "none";
    if (particles) particles.classList.add("hidden");
    playDungeonMusic();
  } else {
    clearRunBuffs();
    runtimeState.enemyIntent = null;
    gameState.runes.banked += gameState.runes.carried;
    gameState.runes.carried = 0;
    const layout = ensureBattleLogLayout();
    if (layout) {
      layout.enemyColumn.innerHTML = "";
      layout.playerColumn.innerHTML = "";
      const entry = document.createElement("p");
      entry.className = "log-entry player-side";
      entry.innerText = "> De retour au repos...";
      layout.playerColumn.prepend(entry);
      refreshConversationHighlights(layout);
    }
    camp.style.display = "block";
    biome.style.display = "none";
    gameState.world.isExploring = false;
    if (nav) nav.style.display = "flex";
    navigateTo("hub");
    if (particles) particles.classList.remove("hidden");
    playCampMusic();
    checkForUpdate();
    saveGame();
  }
  updateUI();
};

export const ActionLog = (message, className = "") => {
  const layout = ensureBattleLogLayout();
  if (!layout) return;
  const side = getLogSide(message, className);
  const kind = getLogKind(message, className);
  const targetColumn =
    side === "player" ? layout.playerColumn : layout.enemyColumn;
  const latest = targetColumn.querySelector(".log-entry");
  if (latest && latest.dataset.rawMessage === message) {
    const nextCount = Number(latest.dataset.repeatCount || "1") + 1;
    latest.dataset.repeatCount = String(nextCount);
    let badge = latest.querySelector(".log-repeat-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "log-repeat-badge";
      latest.appendChild(badge);
    }
    badge.innerText = `x${nextCount}`;
  } else {
    const entry = document.createElement("p");
    entry.innerText = `> ${message}`;
    entry.classList.add("log-entry", "log-system");
    entry.dataset.rawMessage = message;
    entry.dataset.repeatCount = "1";
    entry.dataset.kind = kind;
    if (className) {
      entry.classList.add(className);
    }
    entry.classList.add(side === "player" ? "player-side" : "enemy-side");
    entry.classList.add(`log-kind-${kind}`);
    targetColumn.prepend(entry);
  }
  refreshConversationHighlights(layout);
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
  // Respect offline bank speedups for the visual shake timeout
  const delayed = (fn, ms) => {
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
    } catch (e) {}
    return setTimeout(fn, delay);
  };

  delayed(() => {
    container.classList.remove("shake-effect");
  }, 400);
};

export const showTooltip = (e, item) => {
  const tooltip = document.getElementById("tooltip");
  const itemData = ITEMS[item.id];

  // 1. On utilise tes VRAIES statistiques actuelles comme base de calcul
  const base = {
    ...gameState.stats,
    // Valeurs par dÃ©faut si non dÃ©finies dans ton state initial
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
  // Liste des stats Ã  comparer
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

      // On affiche la valeur absolue de la diffÃ©rence (ex: +3 Vigueur)
      statBonus += `<br><span class="tooltip-stat" style="color:${color}">${sign}${Math.floor(diff)} ${
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
    statBonus += `<br><span style="color:#4dff4d">+${dDiff.toFixed(1)}x DÃ©gÃ¢ts Crit</span>`;
  }

  if (modified.attacksPerTurn > base.attacksPerTurn) {
    statBonus += `<br><span style="color:#4dff4d">+${modified.attacksPerTurn - base.attacksPerTurn} Attaque(s)</span>`;
  }

  let setInfo = "";
  if (itemData.set) {
    const setDef = ITEM_SETS[itemData.set];
    const count = Object.values(gameState.equipped).filter(
      (id) => ITEMS[id]?.set === itemData.set,
    ).length;

    setInfo = `<hr style="border:0; border-top:1px solid #444; margin:5px 0;">`;
    setInfo += `<strong style="color:var(--hover-btn)">PANOPLIE : ${setDef.name} (${count}/3)</strong>`;

    Object.keys(setDef.bonuses).forEach((tier) => {
      const isActive = count >= parseInt(tier);
      const color = isActive ? "#4dff4d" : "#777";
      const prefix = isActive ? "âœ…" : "ðŸ”’";
      const bonusDesc = setDef.bonuses[tier].desc; // Utilise la variable du set

      setInfo += `<br><span style="color:${color}; font-size: 0.9em;">${prefix} [${tier} pcs] : ${bonusDesc}</span>`;
    });
  }

  tooltip.innerHTML = `
    <strong style="color:var(--active-btn)">${itemData.name} (Niv.${item.level})</strong>
    <br><small style="font-style:italic; color:#aaa;">${itemData.description}</small>
    <hr style="border:0; border-top:1px solid #444; margin:5px 0;">
    <strong>Bonus de l'objet :</strong>${statBonus || "<br><span style='color:grey'>Aucun</span>"}
    ${setInfo}
  `;

  tooltip.classList.remove("tooltip-hidden");
  moveTooltip(e);
};

const ITEM_TYPE_TO_SLOT_KEY = {
  Arme: "weapon",
  Armure: "armor",
  Accessoire: "accessory",
};

const getProjectedEffectiveStats = (item) => {
  const slotKey = ITEM_TYPE_TO_SLOT_KEY[ITEMS[item.id]?.type];
  const simulatedEquipped = { ...gameState.equipped };

  if (slotKey) {
    simulatedEquipped[slotKey] = item.id;
  }

  let effStats = {
    ...gameState.stats,
    attacksPerTurn: 1,
    runeGainMult: 0,
    bossMitigation: 0,
    resistances: { poison: 0, gel: 0, folie: 0, putrefaction: 0 },
  };

  const applyItemBonus = (type) => {
    Object.keys(simulatedEquipped).forEach((equippedSlot) => {
      const itemId = simulatedEquipped[equippedSlot];
      const itemData = ITEMS[itemId];

      if (itemData && itemData[type]) {
        const invItem = gameState.inventory.find(
          (inventoryItem) => inventoryItem.id === itemId,
        );
        const level =
          itemId === item.id ? item.level : invItem ? invItem.level : 1;
        itemData[type](effStats, level);
      }
    });
  };

  applyItemBonus("applyFlat");
  effStats.armor += Math.floor((gameState.stats.dexterity * 0.5) / 4);
  effStats.strength += Math.floor(
    gameState.stats.dexterity / 4 + gameState.stats.intelligence / 4,
  );

  const setCounts = {};
  Object.values(simulatedEquipped).forEach((itemId) => {
    if (itemId && ITEMS[itemId]?.set) {
      const setName = ITEMS[itemId].set;
      setCounts[setName] = (setCounts[setName] || 0) + 1;
    }
  });

  Object.keys(setCounts).forEach((setName) => {
    const count = setCounts[setName];
    const setDef = ITEM_SETS[setName];
    if (setDef && setDef.bonuses) {
      for (let i = 1; i <= count; i++) {
        if (setDef.bonuses[i] && setDef.bonuses[i].effect) {
          setDef.bonuses[i].effect(effStats);
        }
      }
    }
  });

  applyItemBonus("applyMult");

  [
    "strength",
    "vigor",
    "dexterity",
    "intelligence",
    "armor",
    "splashDamage",
  ].forEach((key) => {
    if (effStats[key] !== undefined) effStats[key] = Math.round(effStats[key]);
  });

  if (
    gameState.playerEffects.some((effect) => effect.id === "DEW_PROTECTION")
  ) {
    effStats.armor += 50;
  }

  applyPreparationStats(effStats);

  return effStats;
};

const formatTooltipValue = (statName, value) => {
  if (statName === "critChance") return `${(value * 100).toFixed(1)}%`;
  if (statName === "bossMitigation") return `${(value * 100).toFixed(1)}%`;
  if (statName === "runeGainMult") return `${(value * 100).toFixed(1)}%`;
  if (statName === "critDamage") return `${value.toFixed(1)}x`;
  return `${value}`;
};

const showItemComparisonTooltip = (e, item) => {
  const tooltip = document.getElementById("tooltip");
  const itemData = ITEMS[item.id];
  const currentEff = getEffectiveStats();
  const projectedEff = getProjectedEffectiveStats(item);

  const compareStats = [
    ["vigor", "Vigueur"],
    ["strength", "Force"],
    ["dexterity", "Dexterite"],
    ["intelligence", "Intelligence"],
    ["armor", "Armure"],
    ["splashDamage", "Zone"],
    ["critChance", "Crit %"],
    ["critDamage", "Crit Dmg"],
    ["attacksPerTurn", "Attaques"],
    ["bossMitigation", "Mitig. boss"],
    ["runeGainMult", "Gain runes"],
  ];

  const comparisonRows = compareStats
    .map(([statName, label]) => {
      const currentValue = currentEff[statName] ?? 0;
      const nextValue = projectedEff[statName] ?? currentValue;
      const diff = nextValue - currentValue;
      if (Math.abs(diff) < 0.001) return "";

      const diffText =
        diff > 0
          ? `+${formatTooltipValue(statName, diff)}`
          : formatTooltipValue(statName, diff);

      return `
        <div class="tooltip-compare-row compact">
          <span class="tooltip-compare-stat">${label}</span>
          <span class="tooltip-compare-next">${formatTooltipValue(statName, nextValue)}</span>
          <span class="tooltip-compare-diff ${diff > 0 ? "is-positive" : "is-negative"}">${diffText}</span>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  const slotKey = ITEM_TYPE_TO_SLOT_KEY[itemData.type];
  const simulatedEquipped = { ...gameState.equipped };
  if (slotKey) {
    simulatedEquipped[slotKey] = item.id;
  }

  const resistanceRows = ["poison", "gel", "folie", "putrefaction"]
    .map((hazard) => {
      const currentValue = currentEff.resistances?.[hazard] ?? 0;
      const nextValue = projectedEff.resistances?.[hazard] ?? currentValue;
      const diff = nextValue - currentValue;
      if (!diff) return "";
      return `
        <div class="tooltip-compare-row compact">
          <span class="tooltip-compare-stat">${HAZARD_LABELS[hazard] || hazard}</span>
          <span class="tooltip-compare-next">${nextValue}</span>
          <span class="tooltip-compare-diff ${diff > 0 ? "is-positive" : "is-negative"}">${diff > 0 ? `+${diff}` : diff}</span>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  let setInfo = "";
  if (itemData.set) {
    const setDef = ITEM_SETS[itemData.set];
    const currentCount = Object.values(gameState.equipped).filter(
      (id) => ITEMS[id]?.set === itemData.set,
    ).length;
    const projectedCount = Object.values(simulatedEquipped).filter(
      (id) => ITEMS[id]?.set === itemData.set,
    ).length;

    setInfo = `<hr class="tooltip-rule">`;
    setInfo += `<strong class="tooltip-set-title">PANOPLIE : ${setDef.name} (${projectedCount}/3)</strong>`;
    if (projectedCount !== currentCount) {
      setInfo += `<br><span class="tooltip-set-bonus is-active">Apres equipement: ${currentCount} -> ${projectedCount} piece(s)</span>`;
    }

    Object.keys(setDef.bonuses).forEach((tier) => {
      const isActive = projectedCount >= parseInt(tier, 10);
      const prefix = isActive ? "[Actif]" : "[Verrouille]";
      const bonusDesc = setDef.bonuses[tier].desc;
      setInfo += `<br><span class="tooltip-set-bonus${isActive ? " is-active" : ""}">${prefix} [${tier} pcs] : ${bonusDesc}</span>`;
    });
  }

  tooltip.innerHTML = `
    <strong class="tooltip-title">${itemData.name} (Niv.${item.level})</strong>
    <small class="tooltip-subtitle">${itemData.type} · ${getItemRarity(item.id)}</small>
    <small class="tooltip-subtitle">${itemData.description}</small>
    <hr class="tooltip-rule">
    <strong class="tooltip-section-title">Changements a l'equipement</strong>
    ${comparisonRows ? `<div class="tooltip-compare-grid compact">${comparisonRows}</div>` : `<span class="tooltip-empty">Aucun changement visible sur vos stats effectives.</span>`}
    ${resistanceRows ? `<strong class="tooltip-section-title">Resistances</strong><div class="tooltip-compare-grid compact">${resistanceRows}</div>` : ""}
    ${setInfo}
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
      text: "Augmente la puissance de vos attaques.<br><strong>1 point = 1 degat de base.</strong>",
    },
    dexterity: {
      title: "Dexterite",
      text: "Ameliore votre agilite au combat.<br><strong>4 points = 1% d'Esquive.</strong><br><small>(Maximum 50%)</small>. Et 4 points = +0.5 d'Armure. 4 points en dexterite = 1 force. <small>(Les bonus sont attribues par rapport aux stats de BASE)</small>",
    },
    intelligence: {
      title: "Intelligence",
      text: "Augmente votre capacite a absorber l'energie des runes.<br><strong>1 point = +1% de Runes.</strong> (max +50%). 4 points en Intelligence = 1 force.",
    },
    critChance: {
      title: "Chance de Critique",
      text: "Probabilite d'infliger un coup critique lors d'une attaque.",
    },
    critDamage: {
      title: "Degats Critiques",
      text: "Multiplicateur de degats applique lors d'un coup critique.",
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
    graceMarker.title = "Site de Grace";
    markersContainer.appendChild(graceMarker);
    const bossMarker = document.createElement("div");
    bossMarker.className = "marker marker-boss";
    bossMarker.style.left = "100%";
    bossMarker.title = "Boss de zone";
    markersContainer.appendChild(bossMarker);
  }
};

export const toggleOptions = (show) => {
  navigateTo(show ? "options" : "hub");
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

    volumeSlider.oninput = (e) => {
      const volume = parseFloat(e.target.value);

      campAudio.volume = volume;
      dungeonAudio.volume = volume;

      if (!gameState.save) gameState.save = {};
      gameState.save.audioVolume = volume;

      saveGame();
    };
  }
};

// ui.js

const attachTooltipEvents = (element, itemOrId, isAsh = false) => {
  // 1. Pour PC : Le hover classique
  element.onmouseenter = (e) =>
    isAsh
      ? showAshTooltip(e, itemOrId)
      : showItemComparisonTooltip(e, itemOrId);
  element.onmouseleave = () => hideTooltip();
  element.onmousemove = (e) => moveTooltip(e);

  // 2. Pour Mobile (et PC au clic) : Appuyer pour afficher, relÃ¢cher pour cacher
  element.onpointerdown = (e) => {
    // EmpÃªche le clic droit ou les menus contextuels mobiles de gÃªner
    isAsh
      ? showAshTooltip(e, itemOrId)
      : showItemComparisonTooltip(e, itemOrId);
  };

  element.onpointerup = () => hideTooltip();
  element.onpointercancel = () => hideTooltip(); // Si le doigt glisse hors de l'Ã©cran
};
