import { BIOMES, ITEMS, LOOT_TABLES, STATUS_EFFECTS } from "./gameData.js";
import { gameState, getEffectiveStats, runtimeState, getHealth } from "./state.js";
import { getUpgradeCost, upgradeStat, equipItem } from "./actions.js";
import { startExploration } from "./core.js";
import { saveGame } from "./save.js";

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
};

const updateBiomeDisplay = () => {
  const list = document.getElementById("biome-list");
  list.innerHTML = "";

  Object.keys(BIOMES).forEach((id) => {
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

  const typeToSlotKey = {
    Arme: "weapon",
    Armure: "armor",
    Accessoire: "accessory",
  };

  gameState.inventory.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "inventory-item";

    const itemData = ITEMS[item.id];
    const slotKey = typeToSlotKey[itemData.type];

    // Add class for the item's type for coloring
    if (slotKey) {
      itemDiv.classList.add(`item-type-${slotKey}`);
    }

    // Add a class if there's a type conflict
    const currentlyEquippedId = gameState.equipped[slotKey];
    if (currentlyEquippedId && currentlyEquippedId !== item.id) {
      itemDiv.classList.add("item-type-conflict");
    }

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

export const updateStatusIcons = () => {
  const pContainer = document.getElementById("player-status-container");
  const eContainer = document.getElementById("enemy-status-container");

  const renderStatus = (eff) => {
    const data = STATUS_EFFECTS[eff.id];
    if (!data) return "";

    // Si la durée est >= 50, on considère que c'est un passif et on n'affiche pas de chiffre
    const durationText = eff.duration >= 50 ? "" : ` (${eff.duration})`;

    return `<div class="status-icon" style="background-color: ${data.color}" title="${data.name}">
              ${data.name}${durationText}
            </div>`;
  };

  if (pContainer) {
    pContainer.innerHTML = gameState.playerEffects.map(renderStatus).join("");
  }

  if (eContainer) {
    eContainer.innerHTML = gameState.ennemyEffects.map(renderStatus).join("");
  }
};

export const updateUI = () => {
  updateRuneDisplay();
  updateStatDisplay();
  updateEquipmentDisplay();
  updateBiomeDisplay();
  updateInventoryDisplay();
  updateCycleDisplay();
  updateStatusIcons();
};

export const toggleView = (view) => {
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
  if (runtimeState.currentEnemyGroup && runtimeState.currentEnemyGroup.length > 0) {
    const firstEnemy = runtimeState.currentEnemyGroup[0];
    const enemyPercent =
      (firstEnemy.hp / firstEnemy.maxHp) * 100;
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
  let base = {
    vigor: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    critChance: 0.05,
    critDamage: 1.5,
    attacksPerTurn: 1,
  };
  let modified = { ...base };
  itemData.apply(modified, item.level);
  let statBonus = "";
  const statsToCompare = ["strength", "vigor", "dexterity", "intelligence"];
  const isMultiplicative =
    itemData.description.includes("%") || itemData.description.includes("*");
  statsToCompare.forEach((s) => {
    const diff = modified[s] - base[s];
    if (diff !== 0) {
      let displayValue = "";
      const isPos = diff > 0;
      const color = isPos ? "#4dff4d" : "#ff4d4d";
      if (isMultiplicative) {
        const percent = (modified[s] / base[s] - 1) * 100;
        displayValue = `${isPos ? "+" : ""}${percent.toFixed(0)}%`;
      } else {
        displayValue = `${isPos ? "+" : ""}${diff.toFixed(0)}`;
      }
      statBonus += `<br><span class="tooltip-stat" style="color:${color}">${displayValue} ${
        s.charAt(0).toUpperCase() + s.slice(1)
      }</span>`;
    }
  });
  if (modified.critChance !== base.critChance) {
    const cDiff = (modified.critChance - base.critChance) * 100;
    statBonus += `<br><span style="color:#4dff4d">+${cDiff.toFixed(
      0,
    )}% Crit</span>`;
  }
  if (modified.attacksPerTurn > 1) {
    statBonus += `<br><span style="color:#4dff4d">+${
      modified.attacksPerTurn - 1
    } Attaque(s)</span>`;
  }
  tooltip.innerHTML = `
    <strong style="color:var(--active-btn)">${itemData.name} (Niv.${item.level})</strong><br>
    <small style="font-style:italic; color:#aaa;">${itemData.description}</small>
    <hr style="border:0; border-top:1px solid #444; margin:5px 0;">
    <strong>Effet actuel :</strong>${statBonus}
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
      text: "Augmente la puissance de vos attaques.<br><strong>1 point = 1 dégât de base. 10 dégats de base.</strong>",
    },
    dexterity: {
      title: "Dextérité",
      text: "Améliore votre agilité au combat.<br><strong>5 points = 1% d'Esquive.</strong><br><small>(Maximum 50%)</small>",
    },
    intelligence: {
      title: "Intelligence",
      text: "Augmente votre capacité à absorber l'énergie des runes.<br><strong>1 point = +1% de Runes.</strong>",
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
