import { applyEffect } from "./combat.js";
import { gameState, getHealth, runtimeState } from "./state.js";
import { ActionLog } from "./ui.js";

export const ITEM_TYPES = {
  WEAPON: "Arme",
  ARMOR: "Armure",
  ACCESSORY: "Accessoire",
};

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
      "Augmente l'armure de 5. <em style='color: grey;'>(+1 par Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      const armor = 5 + 1 * (itemLevel - 1);
      stats.armor += armor;
    },
  },
  keen_dagger: {
    name: "Dague Afilée",
    type: ITEM_TYPES.WEAPON,
    description:
      "+5% Chance Crit. <em style='color: grey;'>(+1% par Niv)</em>, ",
    applyMult: (stats, itemLevel) => {
      stats.critChance += 0.05 + 0.01 * (itemLevel - 1);
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
    description: "+1 Dextérité / Niv",
    applyFlat: (stats, itemLevel) => {
      stats.dexterity += itemLevel;
    },
  },
  kama: {
    name: "Faucille",
    type: ITEM_TYPES.WEAPON,
    description:
      "Une faucille rapide qui inflige 2 Poison <small>dégats du poison = 1% PV max de la cible + 50% Int</small>. +5 Intelligence, +1% d'intelligence par niveau",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 5;
    },
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1 + 0.01 * itemLevel;
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
      "+5 Dextérité (+1 / Niv). Convertit 25% (+1% / Niveau) de la Dextérité en force bonus. 40% chance d'appliquer 3 saignements",
    applyFlat: (stats, itemLevel) => {
      stats.dexterity += 5 + 1 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      const conversionRatio = 0.25 + 0.01 * (itemLevel - 1);
      stats.strength += Math.floor(stats.dexterity * conversionRatio);
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
      "+45% de chance d'appliquer 3 poisons. BONUS : Si vous avez 20 Intelligence de base, +2% Crit Chance par Niveau",
    applyFlat: (stats, itemLevel) => {
      const baseInt = gameState.stats.intelligence || 0;
      if (baseInt >= 20) {
        stats.critChance += 0.02 * itemLevel;
      }
    },
    onHitEffect: { id: "POISON", duration: 3, chance: 0.45 },
  },
  knight_greatsword: {
    name: "Grande Épée de Chevalier",
    type: ITEM_TYPES.WEAPON,
    description:
      "+5 Force, -20% Vigueur, +15% Force <em style='color: grey;'>(+1.5% Force/ Niv)</em>",
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
      "Requiert 20 Dextérité de base pour être utilisé. Donne +20% de Force , Convertit +50% de la Dextérité de base en Dégats de zone. Converit 25% (+4% / Niveau) de la Dextérité en Force. <em style='color: grey;'>(+10% de chance d'étourdir l'ennemi pendant 2 tours.)</em>",
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
        const conversionRatio = 0.25 + 0.04 * itemLevel;
        stats.strength += Math.floor(stats.dexterity * conversionRatio);
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

        runtimeState.playerCurrentHp = Math.min(
          maxHp,
          runtimeState.playerCurrentHp + healAmount,
        );
        ActionLog(`Vous vous soignez de ${healAmount} PV.`, "log-heal");
      }
    },
  },
  //dragon lac nécrolimbe 50%
  burn_sword: {
    name: "Épée Brûlante",
    type: ITEM_TYPES.WEAPON,
    description:
      "Attaques avec 30% de chance d'infliger 2 Brûlures. +3.5% Force et +2% d'Armure / Niv",
    applyFlat: (stats, itemLevel) => {
      stats.strength *= 1 + 0.035 * itemLevel;
      stats.armor *= 1 + 0.02 * itemLevel;
    },
    onHitEffect: { id: "BURN", duration: 2, chance: 0.3 },
  },

  //wipping_peninsule 33%
  zamor_curved_sword: {
    name: "Épée Courbe de Zamor",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 15 de Force et 18 de Dextérité de base pour être utilisé. +1% de Force et +2% de Dextérité par Niveau. Convertit +4% de la dextérité en Force par Niveau. 25% de chance d'infliger 3 Gelures.",
    applyFlat: (stats, itemLevel) => {
      const baseStr = gameState.stats.strength || 0;
      const baseDex = gameState.stats.dexterity || 0;
      if (baseStr >= 18 && baseDex >= 15) {
        stats.strength *= 1 + 0.01 * itemLevel;
        stats.dexterity *= 1 + 0.02 * itemLevel;
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseStr = gameState.stats.strength || 0;
      const baseDex = gameState.stats.dexterity || 0;
      const ratio = 0.04 * itemLevel;
      if (baseStr >= 18 && baseDex >= 15) {
        stats.strength += Math.floor(ratio * stats.dexterity);
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
      stats.strength *= 1.05 + 0.01 * itemLevel;
      stats.dexterity *= 1.05 + 0.01 * itemLevel;
      stats.intelligence *= 1.05 + 0.01 * itemLevel;
      stats.vigor *= 1.05 + 0.01 * itemLevel;
      stats.armor -= 20;
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
        stats.strength += 10 + 3 * (itemLevel - 1);
        stats.armor += 15 + 2 * (itemLevel - 1);
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
        stats.strength *= 1.15 + 0.02 * (itemLevel - 1);
        stats.intelligence -= 5;
        stats.vigor -= 5;
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
      if (playerEffects.some((eff) => eff.id === "STUN")) {
        playerEffects.forEach((eff) => {
          if (eff.id === "STUN") {
            eff.duration = Math.max(0, eff.duration - 1);
            ActionLog(
              "Casque de Citrouille : L'étourdissement est réduit !",
              "log-heal",
            );
          }
        });
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
      "Requiert 10 de dextérité de base. Pour chaque tranche de 10 points de dextérité de BASE -> +5% de Chance de Critique . Augmente votre armure de 10% (+1% / Niv)",
    applyFlat: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex >= 10) {
        stats.armor *= 1.1 + 0.01 * itemLevel;
        stats.critChance += 0.05 * Math.floor(baseDex / 10);
      }
    },
  },

  alchimist_suit: {
    name: "Veste de l'Alchimiste",
    type: ITEM_TYPES.ARMOR,
    description:
      "Requiert 20 Intelligence de base. Vous gagnez 10% (+2%/Niv) de votre intelligence de base en vigueur. Vos sorts se divisent ! -30% d'Intelligence de base convertis en dégats de zone",
    applyFlat: (stats, itemLevel) => {
      const baseInt = gameState.stats.intelligence || 0;
      if (baseInt >= 20) {
        stats.intelligence -= Math.floor(baseInt * 0.3);
        stats.vigor += Math.floor((0.1 + 0.02 * itemLevel) * baseInt);
        const bonus = Math.floor(0.3 * baseInt);
        stats.splashDamage += bonus;
      }
    },
  },

  twin_blade: {
    name: "Lames Jumelles",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 20 de dextérité et 10% de chance de Crit de base pour être utilisé. Attaque 2 fois, 35% (+1% / Niveau) de chance d'appliquer 3 saignements. Vous gagnez 35% (+1% / Niv) de votre Dextérité en Force.",
    applyFlat: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      const baseCrit = gameState.stats.critChance || 0;
      if (baseDex >= 20 && baseCrit >= 0.1 - 0.0001) {
        stats.attacksPerTurn = 2;
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      const baseCrit = gameState.stats.critChance || 0;
      if (baseDex >= 20 && baseCrit >= 0.1 - 0.0001) {
        const ratio = 0.35 + 0.01 * itemLevel;
        stats.strength += Math.floor(stats.dexterity * ratio);
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
    applyFlat: (stats, itemLevel) => {
      const baseStr = gameState.stats.strength || 0;
      if (baseStr >= 30) {
        stats.splashDamage += Math.floor(stats.strength * 0.5);
        stats.strength *= 1.2 + 0.02 * itemLevel;
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
      const armorBonus = Math.floor(baseInt / 10) * 0.05 + 0.01 * itemLevel;
      stats.armor *= 1 + armorBonus;
    },
  },

  snail_slime_mantle: {
    name: "Manteau de Cristal",
    type: ITEM_TYPES.ARMOR,
    description:
      "Dextérité +15%. Pour chaque tranche de 10 points de Dextérité de BASE, gagnez +1% de Chance de Critique. (+0.5% / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.15;
      const baseDex = gameState.stats.dexterity || 0;
      const critBonus = Math.floor(baseDex / 10) * 0.01 + 0.005 * itemLevel;
      stats.critChance += critBonus;
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
    description:
      "Dextérité +10%. Augmente vos Dégâts Critiques de 0.1x pour chaque tranche de 10 points de Dextérité de BASE. (+0.02x / Niv)",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.1;

      const baseDex = gameState.stats.dexterity || 0;
      const bonusCritDmg = Math.floor(baseDex / 10) * 0.1 + 0.02 * itemLevel;

      stats.critDamage += bonusCritDmg;
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
      "Requiert 24 de Vigueur. +15% Vigueur (+2% / Niv). Vous soigne de 5% de vos PV Max à chaque coup porté.",
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 1.15 + 0.02 * (itemLevel - 1);
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const heal = Math.floor(getHealth(stats.vigor) * 0.05);
      runtimeState.playerCurrentHp = Math.min(
        getHealth(stats.vigor),
        runtimeState.playerCurrentHp + heal,
      );
      ActionLog(`Soin de Graine : +${heal} PV`, "log-heal");
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
      "Une plume imprégnée de vents ancestraux. Augmente vos dégâts finaux de 25% contre les ennemis de type 'Greffé'. +5% Dextérité par Niveau.",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1 + 0.05 * itemLevel;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (runtimeState.currentEnemyGroup[0]?.name.includes("Greffé")) {
        runtimeState.nextAtkMultBonus += 0.25;
      }
    },
  },
};
