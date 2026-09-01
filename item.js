import { applyEffect } from "./combat.js";
import { ITEM_TYPES } from "./constants.js";
import { DEPTHS } from "./items/depths.js";
import { NOKRON } from "./items/nokron.js";
import { RIVER } from "./items/river.js";
import { V21_ITEMS } from "./items/v21.js";
import { LANDS_ITEMS } from "./items/lands.js";
import { gameState, getHealth, runtimeState,
  healPlayer,
} from "./state.js";
import { ActionLog } from "./ui.js";

export const ITEMS = {
  /*===========================
            TIER 0
  ============================*/
  fists: {
    name: "poings",
    description: "+5 Force",
    type: ITEM_TYPES.WEAPON,
    applyFlat: (stats, itemLevel) => {
      stats.strength += 5;
    },
  },

  rune_fragment: {
    name: "Fragment de Runes",
    type: ITEM_TYPES.ACCESSORY,
    description: "C'es super joli mais pas très utile ...",
    isAlwaysMax: true,
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 1;
    },
  },
  /*===========================
            TIER 1
  ============================*/
  iron_sword: {
    name: "Épée en Fer",
    description: "+5 Force <em style='color: grey;'>(+ 0.5 / Niv)</em>",
    type: ITEM_TYPES.WEAPON,
    applyFlat: (stats, itemLevel) => {
      stats.strength += 5 + 0.5 * (itemLevel - 1);
    },
  },
  crimson_amber: {
    name: "Médaillon d'Ambre",
    type: ITEM_TYPES.ACCESSORY,
    description: "Vigueur  +1 par Niv",
    applyFlat: (stats, itemLevel) => {
      stats.vigor += itemLevel;
    },
  },
  leather_vest: {
    name: "Veste en Cuir",
    type: ITEM_TYPES.ARMOR,
    description:
      "Augmente l'armure de 15. <em style='color: grey;'>(+1 par Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      const armor = 15 + 1 * (itemLevel - 1);
      stats.armor += armor;
    },
  },

  keen_dagger: {
    name: "Dague Affûtée",
    type: ITEM_TYPES.WEAPON,
    description:
      "+5 de Force. Dextérité +15%. Convertit 18% (+1% / Niv) de la Dex de base en Force. +10% Chance de Critique (+2% / Niv).",
    applyFlat: (stats, itemLevel) => {
      // 5, comme les poings de depart : une arme d'ouverture ne doit pas etre
      // en retrait sur l'equipement initial. La conversion de dexterite vient
      // par-dessus.
      stats.strength += 5;
      stats.dexterity *= 1.15;
    },
    applyMult: (stats, itemLevel) => {
      const ratio = 0.18 + 0.01 * (itemLevel - 1);
      // Sur la dexterite de BASE : l'effective est deja gonflee par les objets
      // en pourcentage, et convertir dessus empilait deux multiplicateurs.
      stats.strength += Math.floor((gameState.stats.dexterity || 0) * ratio);
      stats.critChance += 0.1 + 0.02 * (itemLevel - 1);
    },
  },

  heavy_club: {
    name: "Gourdin Lourd",
    description:
      "+5 de Force. Transforme 25% de votre vigueur de base en Force (+1% / Niv). Réduit la Dextérité de 10%.",
    type: ITEM_TYPES.WEAPON,
    applyFlat: (stats, itemLevel) => {
      // Base fixe de 5, alignee sur les poings : sans elle, un personnage sans
      // vigueur investie ne tirait aucun degat de cette arme. La conversion de
      // vigueur reste ce qui la distingue, elle s'ajoute par-dessus.
      stats.strength += 5;
      const baseVigor = gameState.stats.vigor || 0;
      const ratio = 0.25 + 0.01 * (itemLevel - 1);
      stats.strength += Math.floor(baseVigor * ratio);
    },
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 0.9;
    },
  },
  scholars_ring: {
    name: "Anneau d'Érudit",
    type: ITEM_TYPES.ACCESSORY,
    description: "+5 Intelligence <em style='color: grey;'>(+1 / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 5 + 1 * (itemLevel - 1);
    },
  },
  leather_boots: {
    name: "Bottes de Cuir",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "+1 Dextérité / Niv. Chaque point de dextérité de base vous procure également 1 de vigueur (max 15)",
    applyFlat: (stats, itemLevel) => {
      stats.dexterity += itemLevel;
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex > 0) {
        stats.vigor += Math.min(15, baseDex);
      }
    },
  },
  kama: {
    name: "Faucille",
    type: ITEM_TYPES.WEAPON,
    description:
      "Une lame rapide. Ajoute 30% (+2%/Niv) de votre Intelligence à votre Force. Inflige 2 Poison (1% PV Max + 50% Int). +5 d'Intelligence",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 5;
    },
    applyMult: (stats, itemLevel) => {
      stats.strength += Math.floor(
        stats.intelligence * (0.3 + 0.02 * itemLevel),
      );
    },
    onHitEffect: { id: "POISON", duration: 2, chance: 1 },
  },
  /*===========================
            TIER 2
  ============================*/
  bloodhound_fang: {
    name: "Croc de Limier",
    type: ITEM_TYPES.WEAPON,
    description:
      "+5 Dextérité (+1 / Niv). Convertit 15% (+1% / Niveau) de la Dextérité de base en force bonus. 40% chance d'appliquer 3 saignements",
    applyFlat: (stats, itemLevel) => {
      stats.dexterity += 5 + 1 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      const conversionRatio = 0.15 + 0.01 * (itemLevel - 1);
      stats.strength += Math.floor((gameState.stats.dexterity || 0) * conversionRatio);
    },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.4 },
  },

  margit_shackle: {
    name: "Entraves de Margit",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true,
    description:
      "Vous gagnez 8% de chance d'étourdir l'ennemi. +1% de force par niveau",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1 + 0.01 * itemLevel;
    },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.08 },
  },

  briar_armor: {
    name: "Armure de Ronce",
    type: ITEM_TYPES.ARMOR,
    description:
      "+1 Vigueur /Niv, -25% de force. Votre armure vous donne épine constament.",
    applyFlat: (stats, itemLevel) => {
      stats.vigor += itemLevel;
    },
    applyMult: (stats, itemLevel) => {
      stats.strength *= 0.75;
    },
    passiveStatus: "THORNS",
  },
  astronomer_staff: {
    name: "Bâton de l'Astronome",
    type: ITEM_TYPES.WEAPON,
    description:
      "Convertit 20% de l'Intelligence en Force et en Dégâts de zone bonus. <em style='color: grey;'>(+2% par Niv)</em>. +4 Intelligence <em style='color: grey;'>(+1 / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 4 + 1 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      const conversionRatio = 0.2 + 0.02 * (itemLevel - 1);
      stats.strength += Math.floor(stats.intelligence * conversionRatio);
      stats.splashDamage += Math.floor(stats.intelligence * conversionRatio);
    },
  },
  styptic_boluses: {
    name: "Boluses Styptiques",
    type: ITEM_TYPES.ARMOR,
    description:
      "+5 d'armure <em style='color: grey;'>(+1 / Niv)</em>Réduit de moitié les charges de Saignement au début de votre tour.",
    passiveEffect: "HALVE_BLEED",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 5 + Math.floor(1 * (itemLevel - 1));
    },
  },

  troll_necklace: {
    name: "Pendentif de Troll",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Intelligence +5 et 45% de chance d'appliquer 3 poison. Si vous avez 20 Intelligence de base, vous gagnez en précision : +1% Chance Crit par tranche de 10 Int de base. (+0.5% / Niv)",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 5;
    },
    applyMult: (stats, itemLevel) => {
      const baseInt = gameState.stats.intelligence || 0;
      if (baseInt >= 20) {
        const critBonus = Math.floor(baseInt / 10) * 0.01 + 0.005 * itemLevel;
        stats.critChance += critBonus;
      }
    },
    onHitEffect: { id: "POISON", duration: 3, chance: 0.45 },
  },
  knight_greatsword: {
    name: "Grande Épée de Chevalier",
    type: ITEM_TYPES.WEAPON,
    description:
      "+5 Force, -10% Vigueur, +15% Force <em style='color: grey;'>(+1.5% Force/ Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 5;
    },
    applyMult: (stats, itemLevel) => {
      stats.strength = Math.floor((1.15 + 0.015 * itemLevel) * stats.strength);
      stats.vigor *= 0.9;
    },
  },
  /*===========================
            TIER 3
  ============================*/
  //margit
  margit_hammer: {
    name: "Marteau de Margit",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 20 Dextérité de base pour être utilisé. Donne +20% de Force , Convertit +50% de la Dextérité de base en Dégats de zone. Convertit 15% (+2% / Niveau) de la Dextérité de base en Force. <em style='color: grey;'>(+10% de chance d'étourdir l'ennemi pendant 2 tours.)</em>",
    applyFlat: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex >= 20) {
        stats.splashDamage += Math.floor(baseDex / 2);
        stats.strength = Math.floor(1.2 * stats.strength);
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex >= 20) {
        const conversionRatio = 0.15 + 0.02 * itemLevel;
        stats.strength += Math.floor((gameState.stats.dexterity || 0) * conversionRatio);
      }
    },
    onHitEffect: { id: "STUN", duration: 2, chance: 0.1 },
  },

  //dragon lac nécrolimbe 50%
  burned_dragon_hearth: {
    name: "Cœur de Dragon Brûlé",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Le coeur de dragon pompe votre vigueur -0.8 / Niveau. Si vous touchez un ennemi brulé, vous vous soignez de 10PV / Niveau",
    applyFlat: (stats, itemLevel) => {
      stats.vigor -= Math.round(0.8 * itemLevel);
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (!itemLevel) {
        return;
      }
      if (targetEffects.some((eff) => eff.id === "BURN")) {
        const healAmount = 10 * itemLevel;
        const maxHp = getHealth(stats.vigor);

        const healed = healPlayer(healAmount, maxHp);
        if (healed > 0) ActionLog(`Vous vous soignez de ${healed} PV.`, "log-heal");
      }
    },
  },
  //dragon lac nécrolimbe 50%
  burn_sword: {
    name: "Épée Brûlante",
    type: ITEM_TYPES.WEAPON,
    description:
      "Attaques avec 30% de chance d'infliger 2 Brûlures. +3.5% Force et +2% d'Armure / Niv",
    applyMult: (stats, itemLevel) => {
      stats.strength = Math.floor(
        stats.strength * (1 + 0.035 * (itemLevel - 1)),
      );
      stats.armor = Math.floor(stats.armor * (1 + 0.02 * (itemLevel - 1)));
    },
    onHitEffect: { id: "BURN", duration: 2, chance: 0.3 },
  },

  //wipping_peninsule 33%
  zamor_curved_sword: {
    name: "Épée Courbe de Zamor",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 15 de Force et 18 de Dextérité de base pour être utilisé. +1% de Force et +2% de Dextérité par Niveau. Convertit 2,5% de la dextérité de base en Force par Niveau. 25% de chance d'infliger 3 Gelures.",
    applyMult: (stats, itemLevel) => {
      const baseStr = gameState.stats.strength || 0;
      const baseDex = gameState.stats.dexterity || 0;
      if (baseStr >= 15 && baseDex >= 18) {
        stats.strength = Math.floor(
          stats.strength * (1 + 0.01 * (itemLevel - 1)),
        );
        stats.dexterity = Math.floor(
          stats.dexterity * (1 + 0.02 * (itemLevel - 1)),
        );
        const ratio = 0.025 * (itemLevel - 1);
        stats.strength += Math.floor(ratio * (gameState.stats.dexterity || 0));
      }
    },
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.25 },
  },
  //half_human_queen 50%
  queen_staff: {
    name: "Bâton de la Reine",
    type: ITEM_TYPES.WEAPON,
    description:
      "Vous convertissez 50% (+2% par Niveau) de votre intelligence par Niveau en force. +10% d'intelligence",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence *= 1.1;
    },
    applyMult: (stats, itemLevel) => {
      const conversion = Math.floor(
        (0.5 + 0.02 * (itemLevel - 1)) * stats.intelligence,
      );
      stats.strength += conversion;
    },
  },
  //wipping_peninsule 33%
  radagon_scarseal: {
    name: "Sceau Meurtri de Radagon",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Vous gagnez un peu de points dans toutes les stats +5% (+1%/Niv) mais perdez 20 d'armure",
    applyFlat: (stats, itemLevel) => {
      stats.armor -= 20;
    },
    applyMult: (stats, itemLevel) => {
      const mult = 1.05 + 0.01 * (itemLevel - 1);
      stats.strength = Math.floor(stats.strength * mult);
      stats.dexterity = Math.floor(stats.dexterity * mult);
      stats.intelligence = Math.floor(stats.intelligence * mult);
      stats.vigor = Math.floor(stats.vigor * mult);
    },
  },
  //nighth_cavalery 75%
  night_cavalry_armor: {
    name: "Armure de Cavalier de la Nuit",
    type: ITEM_TYPES.ARMOR,
    description:
      "Requiert 40 de vigueur de base pour être utilisé. +10% de Force (+1% par Niveau)  et réduit les dégâts subis en augmentant l'Armure de 15 (+2 / Niv). Et donne 15% de chance d'appliquer 2 saignements",
    applyFlat: (stats, itemLevel) => {
      const baseVigor = gameState.stats.vigor || 0;
      if (baseVigor >= 40) {
        stats.armor += 15 + 2 * (itemLevel - 1);
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseVigor = gameState.stats.vigor || 0;
      if (baseVigor >= 40) {
        stats.strength = Math.floor(
          stats.strength * (1.1 + 0.01 * (itemLevel - 1)),
        );
      }
    },
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.15 },
  },

  // === MORNE CASTLE ===
  grafted_blade_greatsword: {
    name: "Grande Épée Forgée",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 30 de Force et 10 de Dextérité de base. +15% de Force (+2% / Niv). 15% de chance d'appliquer saignement (+1 stack / Niveau). Une vraie épée de guerrier sans servelle : perdez 5 d'intelligence et de vigueur",
    applyFlat: (stats, itemLevel) => {
      const baseStr = gameState.stats.strength || 0;
      const baseDex = gameState.stats.dexterity || 0;
      if (baseStr >= 30 && baseDex >= 10) {
        stats.intelligence -= 5;
        stats.vigor -= 5;
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseStr = gameState.stats.strength || 0;
      const baseDex = gameState.stats.dexterity || 0;
      if (baseStr >= 30 && baseDex >= 10) {
        stats.strength = Math.floor(
          stats.strength * (1.15 + 0.02 * (itemLevel - 1)),
        );
      }
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (!itemLevel) return;
      const baseStr = gameState.stats.strength || 0;
      const baseDex = gameState.stats.dexterity || 0;
      if (baseStr >= 30 && baseDex >= 10) {
        if (Math.random() < 0.15) {
          applyEffect(targetEffects, "BLEED", itemLevel);
          ActionLog(
            `Grande Épée Forgée : ${itemLevel} Saignement appliqué !`,
            "log-status",
          );
        }
      }
    },
  },

  pumkin_helm: {
    name: "Casque de Citrouille",
    type: ITEM_TYPES.ARMOR,
    description:
      "Réduit les dégâts subis en augmentant l'Armure de 15 (+5 / Niv). Cependant, votre vision est réduite : -15% de Chance de Critique. Vous empêche d'être étourdi pendant 1 tour",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 15 + 5 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      stats.critChance = Math.max(0, stats.critChance - 0.15);
    },
    passiveStatusReduction: (playerEffects, itemLevel) => {
      for (let i = playerEffects.length - 1; i >= 0; i--) {
        if (playerEffects[i].id === "STUN") {
          playerEffects[i].duration -= 1;

          if (playerEffects[i].duration <= 0) {
            playerEffects.splice(i, 1);
            ActionLog(
              "Casque de Citrouille : L'étourdissement est annulé !",
              "log-heal",
            );
          }
        }
      }
      return playerEffects;
    },
  },

  //=== enter_stormwind_castle ===
  forged_grip: {
    name: "Manche Forgée",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Vous convertissez -15% de Dex et de Force en dégats de zone. Chaque niveau du Manche forgé multiplie le gain de 20% ",
    applyMult: (stats, itemLevel) => {
      const gain = stats.strength * 0.15 + stats.dexterity * 0.15;
      stats.splashDamage += Math.floor(gain * (1 + 0.2 * (itemLevel - 1)));
      stats.strength *= 1 - 0.15;
      stats.dexterity *= 1 - 0.15;
    },
  },

  hunter_cap: {
    name: "Cape du Chasseur",
    type: ITEM_TYPES.ARMOR,
    description:
      "Requiert 10 Dex. +5% Armure (+0.5% / Niv). Chaque tranche de 10 Dex de base offre +3% Chance Crit.",
    applyFlat: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex >= 10) {
        stats.critChance += 0.03 * Math.floor(baseDex / 10);
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex >= 10) {
        stats.armor = Math.floor(
          stats.armor * (1.05 + 0.005 * (itemLevel - 1)),
        );
      }
    },
  },

  alchimist_suit: {
    name: "Veste de l'Alchimiste",
    type: ITEM_TYPES.ARMOR,
    description:
      "Requiert 20 Intelligence de base. Ajoute 15% (+2% / Niveau) de votre Int de base à votre Vigueur. Vos sorts se divisent : 30% de l'Int de base devient des Dégâts de zone.",
    applyFlat: (stats, itemLevel) => {
      const baseInt = gameState.stats.intelligence || 0;
      if (baseInt >= 20) {
        stats.vigor += Math.floor((0.15 + 0.02 * itemLevel) * baseInt);
        stats.splashDamage += Math.floor(0.3 * baseInt);
      }
    },
  },

  twin_blade: {
    name: "Lames Jumelles",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 20 de dextérité et 10% de chance de Crit de base pour être utilisé. Attaque 2 fois, 35% (+1% / Niveau) de chance d'appliquer 3 saignements. Vous gagnez 20% (+1% / Niv) de votre Dextérité de base en Force.",
    applyFlat: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      const baseCrit = gameState.stats.critChance || 0;
      if (baseDex >= 20 && baseCrit >= 0.1 - 0.0001) {
        stats.attacksPerTurn++;
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      const baseCrit = gameState.stats.critChance || 0;
      if (baseDex >= 20 && baseCrit >= 0.1 - 0.0001) {
        const ratio = 0.2 + 0.01 * itemLevel;
        stats.strength += Math.floor((gameState.stats.dexterity || 0) * ratio);
      }
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (
        !itemLevel ||
        gameState.stats.dexterity < 20 ||
        gameState.stats.critChance < 0.1 - 0.0001
      ) {
        return;
      }
      const chance = 0.35 + 0.01 * itemLevel;
      if (Math.random() < chance) {
        applyEffect(targetEffects, "BLEED", 3);
        ActionLog("Lames Jumelles : 3 Saignements appliqués !", "log-status");
      }
    },
  },
  //= = = = = =

  // === GODRICK DROPS ===

  godrick_knight_armor: {
    name: "Armure de Chevalier de Godrick",
    type: ITEM_TYPES.ARMOR,
    description:
      "Requiert 25 de Vigueur de base. Augmente l'Armure de 20 (+3 / Niv) et la Force de 10% (+1% / Niv). Réduis de 1 les charges de Feu au début de votre tour",

    passiveStatusReduction: (playerEffects, itemLevel) => {
      if (playerEffects.some((eff) => eff.id === "BURN")) {
        playerEffects.forEach((eff) => {
          if (eff.id === "BURN") {
            eff.duration = Math.max(0, eff.duration - 1);
            ActionLog(
              "L'Armure de Godrick étouffe les flammes ! (-1 de brûlure)",
              "log-heal",
            );
          }
        });
      }
      return playerEffects;
    },
    applyFlat: (stats, itemLevel) => {
      const baseVigor = gameState.stats.vigor || 0;
      if (baseVigor >= 25) {
        stats.armor += 20 + 3 * (itemLevel - 1);
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseVigor = gameState.stats.vigor || 0;
      if (baseVigor >= 25) {
        stats.strength *= 1.1 + 0.01 * (itemLevel - 1);
      }
    },
  },

  godrick_great_rune: {
    name: "Rune Majeure de Godrick",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true,
    description:
      "Une rune restaurant le pouvoir de la lignée dorée. +15% d'intelligence (+1.5% / Niv). Vous donne 10% d'étourdire l'ennemi pendant 1 tour (+1 de durée quand la rune atteint le niveau 10)",

    applyMult: (stats, itemLevel) => {
      stats.intelligence = Math.round(
        (1.15 + 0.015 * (itemLevel - 1)) * stats.intelligence,
      );
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      let stun = Math.random() < 0.1;
      if (!stun) return;

      if (itemLevel >= 10 && stun) {
        applyEffect(targetEffects, "STUN", 2);
        ActionLog(
          `Rune de Godrick : Ennemi étourdi pendant 2 tours !`,
          "log-status",
        );
      } else {
        applyEffect(targetEffects, "STUN", 1);
        ActionLog(
          `Rune de Godrick : Ennemi étourdi pendant 1 tour !`,
          "log-status",
        );
      }
    },
  },

  godrick_axe: {
    name: "Hache de Godrick",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 30 de Force de base. Inflige d'énormes dégâts de zone (50% de la Force). +20% Force (+2% / Niv).",
    applyMult: (stats, itemLevel) => {
      const baseStr = gameState.stats.strength || 0;
      if (baseStr >= 30) {
        stats.strength = Math.floor(
          stats.strength * (1.2 + 0.02 * (itemLevel - 1)),
        );
        stats.splashDamage += Math.floor(stats.strength * 0.5);
      }
    },
  },
  //= = = = = =

  crystal_shell_mail: {
    name: "Carapace Cristalline",
    type: ITEM_TYPES.ARMOR,
    description:
      "Intelligence +15%. Chaque tranche de 10 points d'Intelligence de BASE augmente votre Armure de 5%. (+1% / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.15;
      const baseInt = gameState.stats.intelligence || 0;
      const armorBonus =
        Math.floor(baseInt / 10) * (0.05 + 0.01 * (itemLevel - 1));
      stats.armor *= 1 + armorBonus;
    },
  },

  snail_slime_mantle: {
    name: "Manteau de Cristal",
    type: ITEM_TYPES.ARMOR,
    set: "FROST_ASSASSIN",
    description:
      "Dextérité +15%. La finesse ignore l'armure : +1 Pénétration Fixe par tranche de 10 Dex de base. (+1 / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.15;
      const baseDex = gameState.stats.dexterity || 0;
      stats.flatDamagePenetration += Math.floor(baseDex / 10) * itemLevel;
    },
  },

  rotten_greataxe: {
    name: "Grande Hache Putréfiée",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 30 de Vigueur.Force +15%. Ajoute 10% de votre Vigueur à votre Force. (+2% / Niveau). 20% de chance d'appliquer 2 putréfactions",
    applyMult: (stats, itemLevel) => {
      const baseVig = gameState.stats.vigor || 0;
      if (baseVig >= 30) {
        stats.strength *= 1.15;
        const ratio = 0.1 + 0.02 * (itemLevel - 1);
        stats.strength += Math.floor(stats.vigor * ratio);
      }
    },
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.2 },
  },

  winged_sword_insignia: {
    name: "Insigne de l'Épée Ailée",
    type: ITEM_TYPES.ACCESSORY,
    set: "MARIONETTE_MASTER",
    description:
      "Dextérité +10%. Augmente vos Dégâts Critiques de 0.1x pour chaque tranche de 10 points de Dextérité de BASE. (+0.02x / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.1;

      const baseDex = gameState.stats.dexterity || 0;
      const bonusCritDmg = Math.floor(baseDex / 10) * 0.1 + 0.02 * itemLevel;

      stats.critDamage += bonusCritDmg;
    },
  },

  marionette_scimitar: {
    name: "Cimeterre de Marionnette",
    type: ITEM_TYPES.WEAPON,
    set: "MARIONETTE_MASTER",
    description:
      "Dextérité +10%. Vous convertissez 38% de votre Dextérité de base en Force. Chaque coup a 25% de chance de déclencher une attaque supplémentaire immédiate. (+1% / Niv)",
    applyFlat: (stats, itemLevel) => {
      stats.dexterity = Math.floor(stats.dexterity * 1.1);
    },
    applyMult: (stats, itemLevel) => {
      const conversionRatio = 0.38;
      stats.strength += Math.floor((gameState.stats.dexterity || 0) * conversionRatio);
    },

    funcOnHit: (stats, targetEffects, itemLevel) => {
      if ( runtimeState.nextNbAtkBonus === 0 && Math.random() < 0.25 + 0.01 * itemLevel ) {
        runtimeState.nextNbAtkBonus++;
        ActionLog("Cimeterre : Attaque réflexe !", "log-status");
      }
    },
  },

  marionette_mask: {
    name: "Masque de Soldat Marionnette",
    type: ITEM_TYPES.ARMOR,
    set: "MARIONETTE_MASTER",
    description:
      "Dextérité +5% (+1% / Niv). Vos mouvements erratiques augmentent votre esquive de 5%.",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.05 + 0.01 * itemLevel;
      stats.dodgeChance += 0.05;
    },
  },

  sage_caelid_robe: {
    name: "Robe du Sage de Caélid",
    type: ITEM_TYPES.ARMOR,
    description:
      "Intelligence +20%. Réduit votre Vigueur de 15% mais convertit 50% de l'Int en Dégâts de zone.",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.2;
      stats.vigor *= 0.85;
      stats.splashDamage += Math.floor(stats.intelligence * 0.5);
    },
  },

  vermilion_seed: {
    name: "Graine de Vermillon",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Requiert 42 de Vigueur. +10% Vigueur (+1% / Niv). Vous soigne de 1% de vos PV Max à chaque coup porté.",
    applyMult: (stats, itemLevel) => {
      const baseVig = gameState.stats.vigor || 0;
      if (baseVig >= 42) {
        stats.vigor *= 1.1 + 0.01 * (itemLevel - 1);
      }
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (!itemLevel) return;
      const baseVig = gameState.stats.vigor || 0;
      if (baseVig < 42) return;

      const heal = Math.floor(getHealth(stats.vigor) * 0.01);
      const healed = healPlayer(heal, getHealth(stats.vigor));
      if (healed > 0) ActionLog(`Soin de Graine : +${healed} PV`, "log-heal");
    },
  },

  /*===========================
            TIER 4

            Les tiers 4 sont des tiers 3 avec une nouvelle mécanique, les bonus sur ennemis spécifiques
  ============================*/
  // --- ITEM SPÉCIAL ANTI-GODRICK ---
  stormhawk_feather: {
    name: "Plume de Faucon de Tempête",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Vents de tempête : +2% Str, Dex et Int par Niveau. +25% dégâts contre les 'Greffés'.",
    applyMult: (stats, itemLevel) => {
      const mult = 1 + 0.02 * itemLevel;
      stats.dexterity *= mult;
      stats.strength *= mult;
      stats.intelligence *= mult;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (runtimeState.currentEnemyGroup[0]?.name.includes("Greffé")) {
        runtimeState.nextAtkMultBonus = 1.25;
      }
    },
  },
  // -----

  carian_glintstone_staff: {
    name: "Bâton de Pierre d'Éclat Carien",
    set: "CARIAN_KNIGHT",
    type: ITEM_TYPES.WEAPON,
    description:
      "Int +15%. +60% de votre intelligenc en force. Vous drainez la vie des ennemis. Vous soigne de 10% de votre Intelligence totale à chaque coup. (+3% / Niveau).",
    applyMult: (stats, itemLevel) => {
      stats.intelligence = Math.floor(stats.intelligence * 1.15);
      stats.strength += Math.floor(stats.intelligence * 0.6);
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (!itemLevel) return;
      const heal = Math.floor(stats.intelligence * (0.1 + 0.03 * itemLevel));
      const maxHp = getHealth(stats.vigor);
      const healed = healPlayer(heal, maxHp);
      if (healed > 0) ActionLog(`Siphon Carien : +${healed} PV`, "log-heal");
    },
  },

  moon_of_nokstella: {
    name: "Lune de Nokstella",
    type: ITEM_TYPES.ACCESSORY,
    set: "CARIAN_KNIGHT",
    description:
      "Chaque tranche de 10 points d'Int de BASE augmente vos Dégâts de Zone (Splash) de 1 dégât et vos dégâts Splash sont augmentés de 15%. (+2% / Niv)",
    applyMult: (stats, itemLevel) => {
      const baseInt = gameState.stats.intelligence || 0;
      const splash = Math.floor(baseInt / 10) * (1.15 + 0.02 * itemLevel);
      stats.splashDamage += Math.floor(splash);
    },
  },

  carian_knight_armor: {
    name: "Armure de Chevalier Carien",
    set: "CARIAN_KNIGHT",
    type: ITEM_TYPES.ARMOR,
    description:
      "Vigueur +25%. Ajoute 20% de votre Intelligence totale à votre Armure physique. (+2% / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * 1.25);
      const intToArmor = stats.intelligence * (0.2 + 0.02 * itemLevel);
      stats.armor += Math.floor(intToArmor);
    },
  },

  icerind_hatchet: {
    name: "Hachette de Givre",
    type: ITEM_TYPES.WEAPON,
    set: "FROST_ASSASSIN",
    description:
      "Dextérité +15%. Vos attaques ignorent 10% de l'armure adverse (+1% / Niveau). Applique 2 Gelures (35% chance).",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.15;
      stats.percentDamagePenetration += 0.1 + 0.01 * itemLevel;
    },
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.35 },
  },

  black_knife_gauntlets: {
    name: "Gantelets de Mailles Noires",
    type: ITEM_TYPES.ACCESSORY,
    set: "FROST_ASSASSIN",
    description:
      "Dextérité +10%. Vos coups critiques sont plus brutaux (+0.1x Deg. Crit. / Niv).",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.1;
      stats.critDamage += 0.1 * itemLevel;
    },
  },

  // --- ITEM DE DRAGON (SAMARAG) ---
  glintstone_dragon_heart: {
    name: "Cœur de Dragon d'Éclat",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true,
    description:
      "La faim de Smarag : Convertit 100% de votre Intelligence de base en Force. Cependant, la magie pèse sur votre corps : -35% Vigueur.",
    applyFlat: (stats, itemLevel) => {
      const intPower = gameState.stats.intelligence;
      stats.strength += Math.floor(intPower);
    },
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 0.65;
    },
  },

  // --- SET DE L'ACADÉMIE ---
  academy_glintstone_staff: {
    name: "Bâton d'Éclat de l'Académie",
    type: ITEM_TYPES.WEAPON,
    set: "ACADEMY_PRIME",
    description:
      "Intelligence +15%. Vos sorts ignorent 20% de l'armure (+1% / Niv). Ajoute 20% de l'Int à la Force. (+1% / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.15;
      stats.percentDamagePenetration += 0.2 + 0.01 * itemLevel;
      stats.strength += Math.floor(
        stats.intelligence * (0.2 + 0.01 * itemLevel),
      );
    },
  },

  raya_lucaria_robe: {
    name: "Robe d'Érudit de Raya Lucaria",
    type: ITEM_TYPES.ARMOR,
    set: "ACADEMY_PRIME",
    description:
      "Intelligence +10% (+1% /Niv) et Vigueur +10% (+1% /Niv). Réduit les dégâts de Poison et de Brûlure.",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.1 + 0.1 * itemLevel;
      stats.vigor *= 1.1 + 0.1 * itemLevel;
    },
    passiveStatusReduction: (playerEffects, itemLevel) => {
      playerEffects.forEach((eff) => {
        if (eff.id === "POISON" || eff.id === "BURN") {
          if (Math.random() < 0.2) {
            eff.duration = Math.max(0, eff.duration - 1);
            ActionLog(
              `Robe de Raya Lucaria : Résistance élémentaire activée ! (-1 ${eff.id})`,
              "log-heal",
            );
          }
        }
      });
      return playerEffects;
    },
  },

  karolos_mask: {
    name: "Masque de Pierre d'Éclat de Karolos",
    type: ITEM_TYPES.ACCESSORY,
    set: "ACADEMY_PRIME",
    description:
      "Intelligence +15%. Augmente votre armure de 2% par Niveau. 40% de chance d'infliger brûlure.",
    onHitEffect: { id: "BURN", duration: 2, chance: 0.4 },
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.15;
      stats.armor *= 1 + 0.02 * itemLevel;
    },
  },

  // --- ITEMS VIGUEUR rares liurnia E et W---
  marsh_great_hammer: {
    name: "Grand Marteau des Marais",
    type: ITEM_TYPES.WEAPON,
    set: "MARSH_WARDEN",
    description:
      "Vigueur +15%. Ajoute 20% de votre Vigueur à votre Force. (+2% / Niv). 8% de chance d'étourdissement",
    onHitEffect: { id: "STUN", duration: 1, chance: 0.08 },
    applyFlat: (stats, itemLevel) => {
      stats.vigor *= 1.15;
    },
    applyMult: (stats, itemLevel) => {
      stats.strength += Math.floor(stats.vigor * (0.2 + 0.02 * itemLevel));
    },
  },
  lobster_shell_plate: {
    name: "Plastron de Carapace de Homard",
    type: ITEM_TYPES.ARMOR,
    set: "MARSH_WARDEN",
    description:
      "Vigueur +15% (+3% / Niv). Réduit de 1 les charges de Poison au début de votre tour.",
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 1.15 + 0.03 * itemLevel;
    },
    passiveStatusReduction: (playerEffects, itemLevel) => {
      if (playerEffects.some((eff) => eff.id === "POISON")) {
        playerEffects.forEach((eff) => {
          if (eff.id === "POISON") {
            eff.duration = Math.max(0, eff.duration - 1);
            ActionLog(
              "Plastron de Homard : Le poison est filtré ! (-1 charge)",
              "log-heal",
            );
          }
        });
      }
      return playerEffects;
    },
  },

  // --- ITEMS FORCE (Liurnia Est/Ouest) ---
  carian_crusher: {
    name: "Broyeur Carien",
    type: ITEM_TYPES.WEAPON,
    set: "CRYSTAL_BULWARK",
    description: "Force +15%. Ignore 20% de l'armure ennemie. (+1% / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.15;
      stats.percentDamagePenetration += 0.2 + 0.01 * itemLevel;
    },
  },
  heavy_crystal_gauntlets: {
    name: "Gantelets de Cristal Massif",
    type: ITEM_TYPES.ACCESSORY,
    set: "CRYSTAL_BULWARK",
    description:
      "Force +10%. Vous avez 20% de chance de vous appliquer 1 épine (+0.5 durée / Niveau).",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.1;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.2) {
        const duration = 1 + Math.floor(0.5 * (itemLevel - 1));
        applyEffect(gameState.playerEffects, "THORNS", duration);
        ActionLog(
          `Gantelets de Cristal : Épines activées (${duration} tours) !`,
          "log-status",
        );
      }
    },
  },

  bog_amulet: {
    name: "Amulette de la Tourbière",
    type: ITEM_TYPES.ACCESSORY,
    set: "MARSH_WARDEN",
    description:
      "Vigueur +20%. La pression du marais renforce vos coups : chaque points de Vigueur de base ajoute 0.25 à votre Pénétration d'Armure Fixe. (+0.05 / Niv) pour un maximum de 30",
    applyMult: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * 1.2); // Apply multiplicative vigor bonus
      const baseVig = gameState.stats.vigor || 0; // Use original base vigor for calculation as per description
      stats.flatDamagePenetration += Math.min(
        30,
        Math.floor(baseVig * (0.25 + 0.05 * (itemLevel - 1))),
      );
    },
  },

  crystal_crust_armor: {
    name: "Armure de Croûte Cristalline",
    type: ITEM_TYPES.ARMOR,
    set: "CRYSTAL_BULWARK",
    description:
      "Force +10%. Votre armure est si dense qu'elle augmente votre Force totale de 5% si vous avez plus de 150 d'Armure. (+1% / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.1;
      if (stats.armor > 150) {
        stats.strength *= 1.05 + 0.01 * itemLevel;
      }
    },
  },

  starscourge_greatsword: {
    name: "Espadon du Fléau des Astres",
    type: ITEM_TYPES.WEAPON,
    description:
      "Force +25%. La gravité renforce vos coups : ajoute 50% de votre Armure totale à votre Force. (+5% / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.25;
      const gravityBonus = stats.armor * (0.5 + 0.05 * (itemLevel - 1));
      stats.strength += Math.floor(gravityBonus);
    },
  },

  radahn_lion_armor: {
    name: "Armure du Lion de Radahn",
    type: ITEM_TYPES.ARMOR,
    isAlwaysMax: true,
    description:
      "Force +15%. Immunité partielle : Réduit de 2 les charges de Putréfaction et de Saignement au début du tour.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.15;
    },
    passiveStatusReduction: (playerEffects, itemLevel) => {
      playerEffects.forEach((eff) => {
        if (eff.id === "SCARLET_ROT" || eff.id === "BLEED") {
          eff.duration = Math.max(0, eff.duration - 2);
          eff.stacks = Math.max(0, (eff.stacks || 0) - 2);
        }
      });
      return playerEffects;
    },
  },

  rotten_dragon_heart: {
    name: "Cœur de Dragon Putréfié",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true,
    description:
      "Vos attaques ont 40% de chance d'infliger 3 Putréfactions. Augmente vos dégâts de 20% contre les ennemis infectés.",
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.4 },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (
        targetEffects.some((e) => e.id === "SCARLET_ROT" || e.id === "POISON")
      ) {
        runtimeState.nextAtkMultBonus = 1.2;
      }
    },
  },

  // --- EXECUTER ---

  executioner_greataxe: {
    name: "Grande Hache de Bourreau",
    type: ITEM_TYPES.WEAPON,
    set: "EXECUTIONER",
    description:
      "Force +20% (+2% / Niv). Vos critiques infligent 0.5x dégâts supplémentaires mais votre Armure baisse de 20.",
    applyFlat: (stats, itemLevel) => {
      stats.armor -= 20;
    },
    applyMult: (stats, itemLevel) => {
      stats.strength = Math.floor(
        stats.strength * (1.2 + 0.02 * (itemLevel - 1)),
      );
      stats.critDamage += 0.5;
    },
  },

  executioner_hood: {
    name: "Cagoule de Bourreau",
    type: ITEM_TYPES.ARMOR,
    set: "EXECUTIONER",
    description:
      "Chance de Critique +10% (+1% / Niv). Vigueur -10% : Le poids de la culpabilité affaiblit le corps.",
    applyMult: (stats, itemLevel) => {
      stats.critChance += 0.1 + 0.01 * itemLevel;
      stats.vigor *= 0.9;
    },
  },

  guillotine_pendant: {
    name: "Pendentif de la Guillotine",
    type: ITEM_TYPES.ACCESSORY,
    set: "EXECUTIONER",
    description:
      "Force +10%. Si l'ennemi a moins de 30% de PV, vos chances de critique augmentent de 35%.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.1;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const target = runtimeState.currentEnemyGroup[0];
      if (target && target.hp / target.maxHp < 0.3) {
        stats.critChance += 0.35;
      }
    },
  },

  // ALTUR
  golden_tree_halberd: {
    name: "Hallebarde de l'Arbre d'Or",
    type: ITEM_TYPES.WEAPON,
    set: "TREE_SENTINEL",
    description:
      "Vigueur +15%. Convertissez 15% (+2%/Niv) de votre Vigueur en Force. 40% de chance d'activer 'Épines' (15% dégâts renvoyés + 0.5x Vigueur) pendant 2 tours.",
    applyMult: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * 1.15); // Apply vigor multiplication first
      stats.strength += Math.floor(
        stats.vigor * (0.15 + 0.02 * (itemLevel - 1)),
      ); // Then calculate strength from potentially increased vigor
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.4) {
        applyEffect(gameState.playerEffects, "THORNS", 2);
        ActionLog("Épines dorées activées !", "log-status");
      }
    },
  },

  golden_sentinel_armor: {
    name: "Plastron de la Sentinelle",
    type: ITEM_TYPES.ARMOR,
    set: "TREE_SENTINEL",
    description:
      "Armure +30 (+5 / Niv). Vigueur +10%. Réduit la durée de TOUS les statuts négatifs de 1 tour.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 30 + 5 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 1.1;
    },
    passiveStatusReduction: (playerEffects, itemLevel) => {
      playerEffects.forEach((eff) => {
        if (eff.id !== "THORNS") {
          eff.duration = Math.max(0, eff.duration - 1);
        }
      });
      return playerEffects;
    },
  },

  sentinel_greatshield_talisman: {
    name: "Talisman du Grand Bouclier",
    type: ITEM_TYPES.ACCESSORY,
    set: "TREE_SENTINEL",
    description:
      "Vigueur +10% (+1% / Niv). La sève de l'Arbre coule en vous : si vous avez le statut 'Épines', vous récupérez 5 PV (+2 / Niv) au début du tour.",
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 1.1 + 0.01 * (itemLevel - 1);
    },

    funcOnHit: (stats, targetEffects, itemLevel) => {
      const hasThorns = gameState.playerEffects.some((e) => e.id === "THORNS");
      if (hasThorns) {
        const heal = 5 + 2 * (itemLevel - 1);
        const maxHp = getHealth(stats.vigor);
        const healed = healPlayer(heal, maxHp);
        if (healed > 0) ActionLog(`Sève de l'Arbre : +${healed} PV !`, "log-heal");
      }
    },
  },

  // CARIA MANSION

  loretta_glintstone_sickle: {
    name: "Faucille d'Éclat de Loretta",
    type: ITEM_TYPES.WEAPON,
    isAlwaysMax: true,
    description:
      "Intelligence +15%. Convertit 70% de l'Int en Force. Fracassement : Vos attaques contre un ennemi déjà gelé ignorent 50% de son Armure. 40% de chance d'appliquer 2 Gelures.",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.15;
      stats.strength += Math.floor(stats.intelligence * 0.7);
    },
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.4 },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const isFrozen = targetEffects.some((e) => e.id === "FROSTBITE");
      if (isFrozen) {
        stats.percentDamagePenetration = Math.max(
          stats.percentDamagePenetration,
          0.5,
        );
        ActionLog(
          "Faucille de Loretta : La glace vole en éclats ! (Pénétration +50%)",
          "log-status",
        );
      }
    },
  },

  carian_troll_gauntlet: {
    name: "Gantelet du Troll de Caria",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Force +10% (+1% / Niv). Force de Frappe : Frapper un ennemi étourdi (STUN) propage 100% de vos dégâts à tous les autres ennemis du groupe.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.1 + 0.01 * itemLevel;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const isStunned = targetEffects.some((e) => e.id === "STUN");
      if (isStunned) {
        stats.splashDamage = stats.strength;
        ActionLog("Gantelet : Onde de choc sur ennemi étourdi !", "log-crit");
      }
    },
  },

  finger_stitcher_needle: {
    name: "Aiguille à coudre des Doigts",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Dextérité +12% (+1% / Niv). Infection Croisée : Si vous frappez un ennemi qui saigne, vous lui appliquez du poison du même nombre que de saignement.",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.12 + 0.01 * itemLevel;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const bleedEffect = targetEffects.find((e) => e.id === "BLEED");
      if (bleedEffect && bleedEffect.duration > 0) {
        applyEffect(targetEffects, "POISON", bleedEffect.duration);
        ActionLog(
          `Aiguille : Infection ! +${bleedEffect.duration} Poison appliqué.`,
          "log-status",
        );
      }
    },
  },

  lunar_resilience_talisman: {
    name: "Talisman de Résilience Lunaire",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Vigueur +15% (+2% / Niv). Armure de Souffrance : Gagnez +20 d'Armure pour chaque effet de statut négatif DIFFERENTS qui vous affecte actuellement.",
    applyMult: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * (1.15 + 0.02 * itemLevel));
      const statusCount = gameState.playerEffects.filter((e) =>
        ["POISON", "BLEED", "BURN", "SCARLET_ROT", "FROSTBITE"].includes(e.id),
      ).length;
      stats.armor += statusCount * 20;
    },
  },

  ...RIVER,
  ...NOKRON,
  ...DEPTHS,
  ...V21_ITEMS,
  ...LANDS_ITEMS,
};
