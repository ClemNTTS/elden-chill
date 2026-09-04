import { ASHES_OF_WAR } from "./ashes.js";
import { HAZARD_LABELS, ITEM_SETS } from "./constants.js";
/*
 * Panneau de description : contenu, positionnement et cablage des evenements.
 *
 * Extrait de ui.js. Le panneau y occupait quatre cents lignes eparpillees, et
 * son cablage etait duplique a cinq endroits — chacun avec ses propres
 * evenements. C'est de cette dispersion qu'est ne le panneau reste bloque en
 * affiche sur mobile : quatre des cinq cablages n'ecoutaient que la souris,
 * donc n'avaient aucun chemin de fermeture au toucher, et rien dans le fichier
 * ne rendait cette divergence visible.
 *
 * Tout passe maintenant par `attachTooltipEvents`, seul point d'entree.
 */
import { ITEMS } from "./item.js";
import { gameState, getEffectiveStats } from "./state.js";
import { applyPreparationStats, getItemRarity } from "./systems.js";

/*
 * Echappement HTML, en defense de profondeur.
 *
 * shared/player-profile.js borne deja ce qui sort d'une sauvegarde, et c'est
 * la vraie barriere. Mais ce fichier compte plus de quarante `innerHTML` : il
 * suffit d'en oublier un pour rouvrir le trou, et rien n'empeche une future
 * source de texte de contourner la normalisation. Le cout est nul, on echappe.
 */
export const echapperHtml = (valeur) =>
  String(valeur ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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
      const isActive = count >= Number.parseInt(tier);
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

  const effStats = {
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

      if (itemData?.[type]) {
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
    if (setDef?.bonuses) {
      for (let i = 1; i <= count; i++) {
        if (setDef.bonuses[i]?.effect) {
          setDef.bonuses[i].effect(effStats);
        }
      }
    }
  });

  applyItemBonus("applyMult");

  // Garder l'aperçu d'équipement aligné avec getEffectiveStats() : la
  // vigueur de base procure toujours de la mitigation contre les boss, quel
  // que soit l'objet simulé.
  effStats.bossMitigation =
    (effStats.bossMitigation || 0) +
    Math.min(0.25, (gameState.stats.vigor || 0) / 900);

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
      const isActive = projectedCount >= Number.parseInt(tier, 10);
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
      text:
        "La voie de l'endurance." +
        "<br><strong>Augmente vos points de vie maximum</strong>, par paliers degressifs." +
        "<br><strong>Reduit les degats des boss</strong> : 9 points = 1% de mitigation, jusqu'a 25%." +
        "<br><small>Sert aussi de base de calcul a plusieurs cendres de guerre et statuts.</small>",
    },
    strength: {
      title: "Force",
      text:
        "La voie du coup unique, et la seule qui perce les armures." +
        "<br><strong>1 point = 1 degat de base</strong>, par attaque." +
        "<br><strong>2 points = 1 de penetration fixe</strong>, soustraite a l'armure adverse." +
        "<br><small>La penetration est le levier qu'aucune autre statistique ne touche, et elle vaut d'autant plus que la cible est blindee.</small>",
    },
    dexterity: {
      title: "Dexterite",
      text:
        "La voie des afflictions : vous frappez plus souvent, donc vous appliquez plus de statuts." +
        "<br><strong>Attaques par tour : 1 + (Dexterite / 60) puissance 1,75.</strong>" +
        "<br><small>La courbe accelere : 40 points donnent 1,5 attaque, 80 en donnent 2,7, et 150 en donnent 6. Un investissement lourd rapporte plus que proportionnellement.</small>" +
        "<br><small>Les effets a l'impact (saignement, gel, poison) se declenchent <b>a chaque attaque</b> : chaque attaque gagnee est aussi une chance de proc en plus.</small>" +
        "<br>4 points = 1% d'Esquive <small>(maximum 50%)</small>." +
        "<br>4 points = +0.5 d'Armure." +
        "<br>4 points = 1 de Force.",
    },
    intelligence: {
      title: "Intelligence",
      text:
        "La voie du sortilege : vos degats ignorent l'armure." +
        "<br><strong>1 point = +0.6 degat magique</strong>, une fois par tour." +
        "<br><small>Ces degats sont ajoutes <b>apres</b> la reduction d'armure : ils ne sont jamais divises par elle. Ils se lancent une fois par tour et non a chaque coup, pour ne pas se multiplier avec les attaques de la dexterite.</small>" +
        "<br><strong>1 point = +1% de Runes</strong> <small>(maximum +150%)</small>." +
        "<br>4 points = 1 de Force.",
    },
    critChance: {
      title: "Chance de Critique",
      text: "Probabilite d'infliger un coup critique. +5 points de pourcentage par point de competence. Au-dela de 100%, le surplus devient de la chance de super critique.",
    },
    critDamage: {
      title: "Degats Critiques",
      text: "Multiplicateur applique lors d'un coup critique. +0,25x par point de competence. Un super critique double ce multiplicateur.",
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

/*
 * Filet de securite : sur mobile, le panneau restait affiche indefiniment.
 *
 * Deux causes. D'abord, les navigateurs tactiles synthetisent mouseenter et
 * mousemove APRES le relachement du doigt : le panneau, ferme au pointerup,
 * etait rouvert dans la foulee par le faux mouseenter — et comme aucun
 * mouseleave ne suit jamais un doigt, plus rien ne le refermait. Ensuite,
 * plusieurs emplacements ne cablaient que les evenements souris, donc
 * n'avaient aucun chemin de fermeture au toucher.
 *
 * Ce filet ferme le panneau des qu'un pointeur non-souris est relache ou
 * annule n'importe ou dans la page, et a tout defilement.
 */
let tooltipDismissBound = false;
const bindGlobalTooltipDismiss = () => {
  if (tooltipDismissBound) return;
  tooltipDismissBound = true;
  const dismiss = (e) => {
    if (e && e.pointerType === "mouse") return;
    hideTooltip();
  };
  document.addEventListener("pointerup", dismiss, true);
  document.addEventListener("pointercancel", dismiss, true);
  window.addEventListener("scroll", () => hideTooltip(), true);
};

/** Detache tout cablage de panneau pose par attachTooltipEvents. */
export const detachTooltipEvents = (element) => {
  if (!element) return;
  element.onmouseenter = null;
  element.onmousemove = null;
  element.onmouseleave = null;
  element.onpointerenter = null;
  element.onpointermove = null;
  element.onpointerleave = null;
  element.onpointerdown = null;
  element.onpointerup = null;
  element.onpointercancel = null;
};

export const attachTooltipEvents = (element, itemOrId, isAsh = false) => {
  if (!element) return;
  bindGlobalTooltipDismiss();
  detachTooltipEvents(element);

  const show = (e) =>
    isAsh
      ? showAshTooltip(e, itemOrId)
      : showItemComparisonTooltip(e, itemOrId);

  // Souris : survol classique. Filtre sur pointerType, sans quoi le faux
  // survol emis apres un tap rouvrirait le panneau (voir plus haut).
  element.onpointerenter = (e) => {
    if (e.pointerType !== "mouse") return;
    show(e);
  };
  element.onpointermove = (e) => {
    if (e.pointerType !== "mouse") return;
    moveTooltip(e);
  };
  element.onpointerleave = (e) => {
    if (e.pointerType !== "mouse") return;
    hideTooltip();
  };

  // Tactile et stylet : appui maintenu pour lire, relachement pour fermer.
  element.onpointerdown = (e) => {
    if (e.pointerType === "mouse") return;
    show(e);
  };
  element.onpointerup = (e) => {
    if (e.pointerType === "mouse") return;
    hideTooltip();
  };
  element.onpointercancel = () => hideTooltip();
};

/* Exporte pour ui.js, qui le reexporte aux appelants historiques. */
export { showItemComparisonTooltip };
