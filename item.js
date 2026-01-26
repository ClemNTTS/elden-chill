//import { gameState, getHealth, runtimeState } from "./state.js";

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
    description:
      "Vigueur +10% <em style='color: grey;'>( plus 5% par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * (1.1 + 0.05 * (itemLevel - 1)));
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
      "Attaques avec une chance d'infliger Brûlure. +8 Force <em style='color: grey;'>(+4 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.strength += 8 + 4 * (itemLevel - 1);
    },
    onHitEffect: { id: "BURN", duration: 2, chance: 0.3 },
  },
  kama: {
    name: "Kama (Faucille)",
    type: ITEM_TYPES.WEAPON,
    description:
      "Une faucille rapide qui inflige Saignement. +5 Dextérité <em style='color: grey;'>(+1 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.dexterity += 5 + (itemLevel - 1);
    },
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.3 },
  },
  bloodhound_fang: {
    name: "Croc de Limier",
    type: ITEM_TYPES.WEAPON,
    description:
      "Convertit 10% de la Dextérité en Dégats critiques bonus. <em style='color: grey;'>(+1% par Niv)</em>",
    apply: (stats, itemLevel) => {
      const conversionRatio = 0.1 + 0.02 * (itemLevel - 1);
      stats.critDamage += Math.floor(stats.dexterity * conversionRatio);
    },
  },
  astronomer_staff: {
    name: "Bâton de l'Astronome",
    type: ITEM_TYPES.WEAPON,
    description:
      "Convertit 20% de l'Intelligence en Dégâts de zone bonus. <em style='color: grey;'>(+2% par Niv)</em>",
    apply: (stats, itemLevel) => {
      const conversionRatio = 0.2 + 0.02 * (itemLevel - 1);
      stats.splashDamage += Math.floor(stats.intelligence * conversionRatio);
    },
  },
};