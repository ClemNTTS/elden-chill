//import { gameState, getHealth, runtimeState } from "./state.js";

import { gameState, getHealth, runtimeState } from "./state.js";
import { ActionLog } from "./ui.js";

export const ITEM_TYPES = {
  WEAPON: "Arme",
  ARMOR: "Armure",
  ACCESSORY: "Accessoire",
};

export const ITEMS = {
  fists: {
    name: "poings",
    description: "+5 Force",
    type: ITEM_TYPES.WEAPON,
    apply: (stats, itemLevel) => {
      stats.strength += 5;
    },
  },
  iron_sword: {
    name: "Épée en Fer",
    description: "+5 Force <em style='color: grey;'>(+ 2 / Niv)</em>",
    type: ITEM_TYPES.WEAPON,
    apply: (stats, itemLevel) => {
      stats.strength += 5 + 2 * (itemLevel - 1);
    },
  },
  crimson_amber: {
    name: "Médaillon d'Ambre",
    type: ITEM_TYPES.ACCESSORY,
    description: "Vigueur +6% <em style='color: grey;'>( plus 3% par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * (1.06 + 0.03 * (itemLevel - 1)));
    },
  },
  bloodhound_fang: {
    name: "Croc de Limier",
    type: ITEM_TYPES.WEAPON,
    description:
      "Convertit 20% de la Dextérité en force bonus. 35% chance d'appliquer 3 saignements.<em style='color: grey;'>(+5% dext scaling par Niv)</em>",
    apply: (stats, itemLevel) => {
      const conversionRatio = 0.2 + 0.05 * (itemLevel - 1);
      stats.strength += Math.floor(stats.dexterity * conversionRatio);
    },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.35 },
  },
  leather_vest: {
    name: "Veste en Cuir",
    type: ITEM_TYPES.ARMOR,
    description:
      "Augmente l'armure de 5. <em style='color: grey;'>(+2 par Niv)</em>",
    apply: (stats, itemLevel) => {
      const flatDamageReduction = 5 + 2 * (itemLevel - 1);
      stats.flatDamageReduction += flatDamageReduction;
    },
  },
  great_shield: {
    name: "Pavois du Chevalier",
    type: ITEM_TYPES.ARMOR,
    description:
      "Vigueur +30% mais -50% Dextérité. Ajoute 15% de votre Vigueur à votre Force. <em style='color: grey;'>(+3% / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * 1.3);

      stats.dexterity = Math.floor(stats.dexterity * 0.5);

      const conversionRatio = 0.15 + 0.03 * (itemLevel - 1);
      stats.strength += Math.floor(stats.vigor * conversionRatio);
    },
  },
  keen_dagger: {
    name: "Dague Afilée",
    type: ITEM_TYPES.WEAPON,
    description:
      "+10% Chance Crit. <em style='color: grey;'>(+2% par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.critChance += 0.1 + 0.02 * (itemLevel - 1);
    },
  },
  scavenger_mask: {
    name: "Masque de Pillard",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Dégâts Crit x2 mais Vigueur -40% <em style='color: grey;'>(+4% Vigueur par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.critDamage *= 2;
      stats.vigor = Math.floor(stats.vigor * (0.4 + 0.04 * (itemLevel - 1)));
    },
  },
  scholars_ring: {
    name: "Anneau d'Érudit",
    type: ITEM_TYPES.ACCESSORY,
    description: "+5 Intelligence <em style='color: grey;'>(+2 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.intelligence += 5 + 2 * (itemLevel - 1);
    },
  },

  twin_blade: {
    name: "Lames Jumelles",
    type: ITEM_TYPES.WEAPON,
    description:
      "Attaque 2 fois, mais réduit la Force de 60%. <em style='color: grey;'>(Malus réduit de 3% par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.attacksPerTurn = 2;
      const penaltyReduction = 0.03 * (itemLevel - 1);
      stats.strength *= 0.4 + penaltyReduction;
    },
  },

  leather_boots: {
    name: "Bottes de Cuir",
    type: ITEM_TYPES.ARMOR,
    description: "+5 Dextérité <em style='color: grey;'>(+2 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.dexterity += 5 + 2 * (itemLevel - 1);
    },
  },
  briar_armor: {
    name: "Armure de Ronce",
    type: ITEM_TYPES.ARMOR,
    description: "Renvoie 15% des dégâts subis à l'attaquant.",
    apply: (stats, itemLevel) => {
      stats.vigor += 2 * itemLevel;
    },
    passiveStatus: "THORNS",
  },
  burn_sword: {
    name: "Épée Brûlante",
    type: ITEM_TYPES.WEAPON,
    description:
      "Attaques avec 30% de chance d'infliger 3 Brûlures. +10 Force <em style='color: grey;'>(+5 / Niv)</em>. Récupérez 50HP si l'ennemi attaqué est déjà Brûlé.",
    apply: (stats, itemLevel) => {
      stats.strength += 10 + 5 * (itemLevel - 1);
    },
    funcOnHit: (stats, targetEffects) => {
      if (targetEffects.some((eff) => eff.id === "BURN")) {
        const healAmount = 50;
        const maxHp = getHealth(stats.vigor);

        runtimeState.playerCurrentHp = Math.min(
          maxHp,
          runtimeState.playerCurrentHp + healAmount,
        );
        ActionLog("L'Épée Brûlante vous soigne de 50 PV !", "log-heal");
      }
    },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.3 },
  },
  kama: {
    name: "Kama (Faucille)",
    type: ITEM_TYPES.WEAPON,
    description:
      "Une faucille rapide qui inflige Saignement. +5 Dextérité <em style='color: grey;'>(+1 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.dexterity += 5 + (itemLevel - 1);
    },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.4 },
  },
  astronomer_staff: {
    name: "Bâton de l'Astronome",
    type: ITEM_TYPES.WEAPON,
    description:
      "Convertit 20% de l'Intelligence en Force et en Dégâts de zone bonus. <em style='color: grey;'>(+5% par Niv)</em>",
    apply: (stats, itemLevel) => {
      const conversionRatio = 0.2 + 0.05 * (itemLevel - 1);
      stats.strength     += Math.floor(stats.intelligence * conversionRatio);
      stats.splashDamage += Math.floor(stats.intelligence * conversionRatio);
    },
  },

  styptic_boluses: {
    name: "Boluses Styptiques",
    type: ITEM_TYPES.ARMOR,
    description:
      "+5 d'armure <em style='color: grey;'>(+0.5 / Niv)</em>Réduit de moitié les charges de Saignement au début de votre tour.",
    passiveEffect: "HALVE_BLEED",
    apply: (stats, itemLevel) => {
      stats.armor += 5 + Math.floor(0.5 * (itemLevel - 1));
    },
  },

  troll_necklace: {
    name: "Pendentif de Troll",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "+30% de chance d'appliquer 4 poisons. +1% Crit Chance <em style='color: grey;'>(+1% par Niv)",
    apply: (stats, itemLevel) => {
      stats.critChance += 0.01 + 0.01 * (itemLevel - 1);
    },
    onHitEffect: { id: "POISON", duration: 4, chance: 0.3 },
  },

  knight_greatsword: {
    name: "Grande Épée de Chevalier",
    type: ITEM_TYPES.WEAPON,
    description:
      "+15 Force, -5 Vigueur, +20% Force <em style='color: grey;'>(+5 Force/ Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.strength += Math.floor(15 + 5 * (itemLevel - 1));
      stats.strength = Math.floor(1.2 * stats.strength);
      stats.vigor -= 5;
      if (stats.vigor < 0) stats.vigor = 0;
    },
  },
};
