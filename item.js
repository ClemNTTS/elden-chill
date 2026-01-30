import { gameState, getHealth, runtimeState } from "./state.js";
import { ActionLog, formatNumber } from "./ui.js";

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
    description: "+5 Force <em style='color: grey;'>(+ 2 / Niv)</em>",
    type: ITEM_TYPES.WEAPON,
    applyFlat: (stats, itemLevel) => {
      stats.strength += 5 + 2 * (itemLevel - 1);
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
      "Augmente l'armure de 5. <em style='color: grey;'>(+2 par Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      const armor = 5 + 2 * (itemLevel - 1);
      stats.armor += armor;
    },
  },
  keen_dagger: {
    name: "Dague Afilée",
    type: ITEM_TYPES.WEAPON,
    description: "+5% Chance Crit. <em style='color: grey;'>(+2% par Niv)</em>",
    applyMult: (stats, itemLevel) => {
      stats.critChance += 0.05 + 0.02 * (itemLevel - 1);
    },
  },
  scholars_ring: {
    name: "Anneau d'Érudit",
    type: ITEM_TYPES.ACCESSORY,
    description: "+5 Intelligence <em style='color: grey;'>(+2 / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 5 + 2 * (itemLevel - 1);
    },
  },
  leather_boots: {
    name: "Bottes de Cuir",
    type: ITEM_TYPES.ARMOR,
    description: "+5 Dextérité <em style='color: grey;'>(+2 / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.dexterity += 5 + 2 * (itemLevel - 1);
    },
  },
  kama: {
    name: "Faucille",
    type: ITEM_TYPES.WEAPON,
    description:
      "Une faucille rapide qui inflige 2 Poison. +5 Intelligence <em style='color: grey;'>(+2 / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 5;
      stats.intelligence += 5 + 2 * (itemLevel - 1);
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
      "+2 Dextérité <em style='color: grey;'>(+2 / Niv)</em>. Convertit 20% de la Dextérité en force bonus. 35% chance d'appliquer 3 saignements.<em style='color: grey;'>(+5% dext scaling par Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.dexterity += 2 * itemLevel;
    },
    applyMult: (stats, itemLevel) => {
      const conversionRatio = 0.2 + 0.05 * (itemLevel - 1);
      stats.strength += Math.floor(stats.dexterity * conversionRatio);
    },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.35 },
  },

  margit_shackle: {
    name: "Entraves de Margit",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true,
    description: "Vous gagnez 8% de chance d'étourdir l'ennemi",
    onHitEffect: { id: "STUN", duration: 1, chance: 0.08 },
  },

  briar_armor: {
    name: "Armure de Ronce",
    type: ITEM_TYPES.ARMOR,
    description:
      "+5  Vigueur  + 1/Niv, Votre armure vous done épine constament.",
    applyFlat: (stats, itemLevel) => {
      stats.vigor += 5 + 1 * (itemLevel - 1);
    },
    passiveStatus: "THORNS",
  },
  astronomer_staff: {
    name: "Bâton de l'Astronome",
    type: ITEM_TYPES.WEAPON,
    description:
      "Convertit 20% de l'Intelligence en Force et en Dégâts de zone bonus. <em style='color: grey;'>(+5% par Niv)</em>. +7 Intelligence <em style='color: grey;'>(+2 / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 7 + 2 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      const conversionRatio = 0.2 + 0.05 * (itemLevel - 1);
      stats.strength += Math.floor(stats.intelligence * conversionRatio);
      stats.splashDamage += Math.floor(stats.intelligence * conversionRatio);
    },
  },
  styptic_boluses: {
    name: "Boluses Styptiques",
    type: ITEM_TYPES.ARMOR,
    description:
      "+5 d'armure <em style='color: grey;'>(+0.5 / Niv)</em>Réduit de moitié les charges de Saignement au début de votre tour.",
    passiveEffect: "HALVE_BLEED",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 5 + Math.floor(0.5 * (itemLevel - 1));
    },
  },

  troll_necklace: {
    name: "Pendentif de Troll",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "+30% de chance d'appliquer 4 poisons. BONUS : Si vous avez 20 Intelligence de base, +2% Crit Chance par Niveau",
    applyFlat: (stats, itemLevel) => {
      const baseInt = gameState.stats.intelligence || 0;
      if (baseInt >= 20) {
        stats.critChance += 0.02 * itemLevel;
      }
    },
    onHitEffect: { id: "POISON", duration: 4, chance: 0.3 },
  },
  knight_greatsword: {
    name: "Grande Épée de Chevalier",
    type: ITEM_TYPES.WEAPON,
    description:
      "+10 Force, -5 Vigueur, +15% Force <em style='color: grey;'>(+4 Force/ Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.strength += Math.floor(10 + 4 * (itemLevel - 1));
      stats.vigor -= 5;
      if (stats.vigor < 0) stats.vigor = 0;
    },
    applyMult: (stats, itemLevel) => {
      stats.strength = Math.floor(1.15 * stats.strength);
    },
  },
  /*===========================
            TIER 3
  ============================*/
  margit_hammer: {
    name: "Marteau de Margit",
    type: ITEM_TYPES.WEAPON,
    description:
      "Requiert 20 Dextérité de base pour être utilisé.+3 Force par level. Donne 20% de Force  (+1% / Niveau), Convertit +100% de la Dextérité en Dégats de zone. Converit 50% de la Dextérité en Force. <em style='color: grey;'>(+5% de chance d'étourdir l'ennemi pendant 2 tours.</em>",
    applyFlat: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex >= 20) {
        stats.splashDamage += Math.floor(stats.dexterity);
        stats.strength += Math.floor(0.5 * stats.dexterity);
        stats.strength += 3 * itemLevel;
      }
    },
    applyMult: (stats, itemLevel) => {
      const baseDex = gameState.stats.dexterity || 0;
      if (baseDex >= 20) {
        stats.strength = Math.floor((1.2 + 0.01 * itemLevel) * stats.strength);
      }
    },
    onHitEffect: { id: "STUN", duration: 2, chance: 0.15 },
  },

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
        console.log(itemLevel);
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

  burn_sword: {
    name: "Épée Brûlante",
    type: ITEM_TYPES.WEAPON,
    description:
      "Attaques avec 30% de chance d'infliger 3 Brûlures. +10 Force <em style='color: grey;'>(+3 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 10 + 3 * (itemLevel - 1);
    },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.3 },
  },
  piercing_talisman: {
    name: "Sceau de la Grande Brèche",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Pénétration fixe +10. Gagnez 10% de pénétration d'armure <em style='color: grey;'>(+3% / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.flatDamagePenetration += 10;
    },
    applyMult: (stats, itemLevel) => {
      stats.percentDamagePenetration += 0.1 + 0.03 * (itemLevel - 1);
    },
  },

  queen_staff: {
    name: "Bâton de la Reine",
    type: ITEM_TYPES.WEAPON,
    description:
      "Vous convertissez 75% de votre inteligence en force bonus. +15 d'intelligence <em style='color: grey;'>(+5 / Niv)</em>",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 15 + 5 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      const conversion = Math.floor(0.75 * stats.intelligence);
      stats.strength += conversion;
    },
  },

  radagon_scarseal: {
    name: "Sceau Meurtri de Radagon",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Vous gagnez un peu de points dans toutes les stats (+1/Niv) mais perdez 20 d'armure",
    applyFlat: (stats, itemLevel) => {
      const bonusStats = itemLevel;
      stats.strength += bonusStats;
      stats.dexterity += bonusStats;
      stats.intelligence += bonusStats;
      stats.vigor += bonusStats;
      stats.armor -= 20;
    },
  },

  sentinel_armor: {
    name: "Armure de Sentinelle",
    type: ITEM_TYPES.ARMOR,
    description:
      "Gagnez +5 vigueur <em style='color: grey;'>(+2 / Niv) et +1 d'armure / Niv</em>",
    applyFlat: (stats, itemLevel) => {
      stats.vigor += 5 + 2 * (itemLevel - 1);
      stats.armor += 1 + (itemLevel - 1);
    },
  },

  twin_blade: {
    name: "Lames Jumelles",
    type: ITEM_TYPES.WEAPON,
    description:
      "Attaque 2 fois, 35% de chance d'appliquer 3 saignements mais réduit la Force de 60%. <em style='color: grey;'>(Malus réduit de 3% par Niv)</em>",
    applyMult: (stats, itemLevel) => {
      stats.attacksPerTurn = 2;
      const penaltyReduction = 0.03 * (itemLevel - 1);
      stats.strength *= 0.4 + penaltyReduction;
    },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.35 },
  },

  //========== TIER CAELID
  great_shield: {
    name: "Pavois du Chevalier",
    type: ITEM_TYPES.ARMOR,
    description:
      "Vigueur +30% mais -50% Dextérité. Ajoute 15% de votre Vigueur à votre Force. <em style='color: grey;'>(+3% / Niv)</em>",
    applyMult: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * 1.3);

      stats.dexterity = Math.floor(stats.dexterity * 0.5);

      const conversionRatio = 0.15 + 0.03 * (itemLevel - 1);
      stats.strength += Math.floor(stats.vigor * conversionRatio);
    },
  },

  scavenger_mask: {
    name: "Masque de Pillard",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Dégâts Crit x2 mais Vigueur -40% <em style='color: grey;'>(+4% Vigueur par Niv)</em>",
    applyMult: (stats, itemLevel) => {
      stats.critDamage *= 2;
      stats.vigor = Math.floor(stats.vigor * (0.4 + 0.04 * (itemLevel - 1)));
    },
  },
};
