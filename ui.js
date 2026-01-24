import { gameState, getEffectiveStats, equipItem, getUpgradeCost, showTooltip, moveTooltip, hideTooltip, upgradeCosts } from "./stats.js";
import { BIOMES, ITEMS } from "./gameData.js";
import { saveGame } from "./save.js";
import { startExploration } from "./exploration.js";

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
    
    // Check if current slot has a two-handed weapon equipped
    const rightHandItem = gameState.equipped[1];
    let isTwoHandedActive = false;
    if (rightHandItem) {
      const rightItemData = ITEMS[rightHandItem];
      isTwoHandedActive = rightItemData && rightItemData.categorie === "two_handed_weapon";
    }
    
    // For left hand (slot 0): if two-handed is active, show the weapon there too
    if (index === 0 && isTwoHandedActive) {
      const itemInInv = gameState.inventory.find((i) => i.id === rightHandItem);
      if (itemInInv) {
        const itemData = ITEMS[rightHandItem];
        slot.innerText = `${itemInInv.name} (Lv.${itemInInv.level})`;
        slot.onmouseenter = (e) => showTooltip(e, itemInInv);
        slot.onmousemove = (e) => moveTooltip(e);
        slot.onmouseleave = () => hideTooltip();
        // Apply color mixing for two-handed weapon in left slot
        slot.style.opacity = "0.7";
        slot.style.borderStyle = "double";
      }
      return;
    }
    
    if (itemId) {
      const itemInInv = gameState.inventory.find((i) => i.id === itemId);
      if (itemInInv) {
        slot.innerText = `${itemInInv.name} (Lv.${itemInInv.level})`;
        slot.onmouseenter = (e) => showTooltip(e, itemInInv);
        slot.onmousemove = (e) => moveTooltip(e);
        slot.onmouseleave = () => hideTooltip();
        // Reset visual style for regular items
        slot.style.opacity = "1";
        slot.style.borderStyle = "dashed";
      }
    } else {
      // Show placeholder text for empty slots
      let placeholder = "";
      if (index === 0) placeholder = "Gauche (Bouclier)";
      else if (index === 1) placeholder = "Droite (Arme)";
      else if (index === 2) placeholder = "Armure";
      else placeholder = "Accessoire";
      
      slot.innerText = placeholder;
      slot.onmouseenter = null;
      // Reset visual style
      slot.style.opacity = "1";
      slot.style.borderStyle = "dashed";
    }
  });

  // Control visibility of equipment and inventory sections
  const equipmentSection = document.getElementById("equipment-section");
  const inventorySection = document.getElementById("inventory-section");
  const gameContainer = document.getElementById("game-container");
  const hasAnySlot = gameState.unlockedSlots.shield || 
                     gameState.unlockedSlots.weapon || 
                     gameState.unlockedSlots.armor || 
                     gameState.unlockedSlots.accessory > 0;
  
  if (equipmentSection) {
    equipmentSection.style.display = hasAnySlot ? "block" : "none";
  }
  if (inventorySection) {
    inventorySection.style.display = hasAnySlot ? "block" : "none";
  }
  
  // Adjust container height based on visible sections
  if (gameContainer) {
    if (hasAnySlot) {
      // Sections are visible, use auto height or normal sizing
      gameContainer.style.minHeight = "auto";
    } else {
      // Sections are hidden, increase height for better appearance
      gameContainer.style.minHeight = "600px";
    }
  }
  
  // Hide additional accessory slots that aren't unlocked yet
  for (let i = 4; i < 5; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) {
      const maxAccessorySlots = 3 + gameState.unlockedSlots.accessory;
      slot.style.display = i < maxAccessorySlots ? "flex" : "none";
    }
  }

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
      
      const itemData = ITEMS[item.id];
      const category = itemData ? itemData.categorie : "unknown";
      
      const progressText =
        item.level >= 10 ? "MAX" : `(${item.count}/${item.level})`;
      
      // Create category badge
      let categoryBadge = "";
      if (category === "shield") categoryBadge = "🛡️ Bouclier";
      else if (category === "weapon") categoryBadge = "⚔️ Arme";
      else if (category === "two_handed_weapon") categoryBadge = "🗡️ 2-Main";
      else if (category === "armor") categoryBadge = "🛡️ Armure";
      else if (category === "accessory") categoryBadge = "✨ Accessoire";
      
      itemDiv.innerHTML = `<strong>${item.name}</strong><br><small>${categoryBadge}</small><br>Niv.${item.level}<br>${progressText}`;

      itemDiv.onmouseenter = (e) => showTooltip(e, item);
      itemDiv.onmousemove = (e) => moveTooltip(e);
      itemDiv.onmouseleave = () => hideTooltip();

      itemDiv.onclick = () => equipItem(item.id);
      itemDiv.setAttribute("data-category", category);
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

export { updateUI, toggleView };