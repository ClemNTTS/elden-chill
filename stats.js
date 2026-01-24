import { ITEMS } from "./gameData.js";
import { updateUI } from "./ui.js";

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

  equipped: [null, null, null, null, null],

  unlockedSlots: {
    shield: false,
    weapon: false,
    armor: false,
    accessory: 0, // Start with 0 accessory slots, will be unlocked
  },

  firstTimeCleared: {}, // Track first-time clears per biome

  inventory: [],

  world: {
    currentBiome: "necrolimbe",
    unlockedBiomes: ["necrolimbe"],
    progress: 0,
    isExploring: false,
  },
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

const equipItem = (itemId) => {
  const item = ITEMS[itemId];
  if (!item) return;

  const itemCategory = item.categorie;
  
  // Check if item is already equipped - unequip it
  const alreadyEquippedIndex = gameState.equipped.indexOf(itemId);
  if (alreadyEquippedIndex !== -1) {
    gameState.equipped[alreadyEquippedIndex] = null;
    console.log(`${item.name} unequipped`);
    updateUI();
    return;
  }

  // Determine which slot(s) this item can go to
  let validSlots = [];
  
  if (itemCategory === "shield") {
    validSlots = [0]; // Gauche slot only
  } else if (itemCategory === "weapon" || itemCategory === "two_handed_weapon") {
    validSlots = [1]; // Droite slot only
  } else if (itemCategory === "armor") {
    validSlots = [2]; // Armor slot
  } else if (itemCategory === "accessory") {
    validSlots = [3, 4, 5]; // Accessory slots (extendable)
  }

  // For shields: check if two-handed weapon is equipped in slot 1
  if (itemCategory === "shield") {
    const droiteItem = gameState.equipped[1];
    if (droiteItem) {
      const droiteItemData = ITEMS[droiteItem];
      if (droiteItemData && droiteItemData.categorie === "two_handed_weapon") {
        // Remove the two-handed weapon
        const removedName = droiteItemData.name;
        gameState.equipped[1] = null;
        console.log(`${removedName} removed to equip shield in left hand`);
      }
    }
    // Equip shield in slot 0
    gameState.equipped[0] = itemId;
    console.log(`${item.name} equipped in left hand`);
  }
  
  // For weapons: check slot 0 if two-handed
  else if (itemCategory === "two_handed_weapon") {
    // Remove shield from slot 0 if present
    if (gameState.equipped[0]) {
      const shieldName = ITEMS[gameState.equipped[0]]?.name || "Item";
      console.log(`${shieldName} removed - two-handed weapon requires both hands`);
      gameState.equipped[0] = null;
    }
    // Equip weapon in slot 1
    gameState.equipped[1] = itemId;
    console.log(`${item.name} equipped in right hand (two-handed)`);
  }
  
  // For normal weapons: just equip in slot 1
  else if (itemCategory === "weapon") {
    gameState.equipped[1] = itemId;
    console.log(`${item.name} equipped in right hand`);
  }
  
  // For armor: equip in slot 2
  else if (itemCategory === "armor") {
    if (gameState.equipped[2]) {
      const oldArmor = ITEMS[gameState.equipped[2]]?.name || "Item";
      console.log(`${oldArmor} unequipped`);
    }
    gameState.equipped[2] = itemId;
    console.log(`${item.name} equipped as armor`);
  }
  
  // For accessories: find first empty accessory slot or replace if clicking same item
  else if (itemCategory === "accessory") {
    // Check if we have any unlocked accessory slots
    const maxAccessorySlots = 3 + gameState.unlockedSlots.accessory;
    
    let equipSlot = -1;
    // Find first empty slot within unlocked range
    for (let i = 3; i < Math.min(3 + maxAccessorySlots, gameState.equipped.length); i++) {
      if (!gameState.equipped[i]) {
        equipSlot = i;
        break;
      }
    }
    
    // If no empty slot, don't show alert - just don't equip
    if (equipSlot === -1) {
      console.log(`No empty accessory slot available`);
      updateUI();
      return;
    }
    
    gameState.equipped[equipSlot] = itemId;
    console.log(`${item.name} equipped as accessory (slot ${equipSlot - 2})`);
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

const upgradeCosts = {
  vigor: 10,
  strength: 10,
  critChance: 150,
  critDamage: 1500,
};

export { gameState, getEffectiveStats, equipItem, getUpgradeCost, showTooltip, moveTooltip, hideTooltip, upgradeCosts };