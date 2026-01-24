export const ITEMS = {
  iron_sword: {
    name: "Épée en Fer",
    description: "+5 Force <em style='color: grey;'>(+ 2 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.strength += 5 + 2 * (itemLevel - 1);
    },
  },
  crimson_amber: {
    name: "Médaillon d'Ambre",
    description:
      "Vigueur +10% <em style='color: grey;'>( plus 5% par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * (1.1 + 0.05 * (itemLevel - 1)));
    },
  },
  great_shield: {
    name: "Pavois du Chevalier",
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
    description:
      "+10% Chance Crit. <em style='color: grey;'>(+2% par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.critChance += 0.1 + 0.02 * (itemLevel - 1);
    },
  },
  scavenger_mask: {
    name: "Masque de Pillard",
    description:
      "Dégâts Crit x2 mais Vigueur -40% <em style='color: grey;'>(+4% Vigueur par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.critDamage *= 2;
      stats.vigor = Math.floor(stats.vigor * (0.4 + 0.04 * (itemLevel - 1)));
    },
  },
  scholars_ring: {
    name: "Anneau d'Érudit",
    description: "+5 Intelligence <em style='color: grey;'>(+2 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.intelligence += 5 + 2 * (itemLevel - 1);
    },
  },

  twin_blade: {
    name: "Lames Jumelles",
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
    description: "+5 Dextérité <em style='color: grey;'>(+2 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.dexterity += 5 + 2 * (itemLevel - 1);
    },
  },
};

export const LOOT_TABLES = {
  necrolimbe: [
    { id: "iron_sword", chance: 0.6 },
    { id: "crimson_amber", chance: 0.3 },
    { id: "scholars_ring", chance: 0.1 },
  ],
  caelid: [
    { id: "great_shield", chance: 0.1 },
    { id: "keen_dagger", chance: 0.6 },
    { id: "leather_boots", chance: 0.3 },
  ],
  liurnia: [
    { id: "twin_blade", chance: 0.2 },
    { id: "scavenger_mask", chance: 0.8 },
  ],
};

export const MONSTERS = {
  soldier: { name: "Soldat de Godrick", hp: 30, atk: 5, runes: 15 },
  wolf: { name: "Loup Affamé", hp: 15, atk: 8, runes: 10 },
  margit: {
    name: "Margit le Déchu",
    hp: 200,
    atk: 25,
    runes: 500,
    isBoss: true,
  },
  rotten_stray: { name: "Chien Errant Putréfié", hp: 70, atk: 18, runes: 80 },
  giant_crow: { name: "Corbeau Géant", hp: 135, atk: 20, runes: 150 },
  radahn: {
    name: "Vestige de Radahn",
    hp: 500,
    atk: 45,
    runes: 3000,
    isBoss: true,
  },
  clayman: { name: "Homme d'Argile", hp: 250, atk: 35, runes: 400 },
  sorcerer: { name: "Sorcier de Raya Lucaria", hp: 180, atk: 55, runes: 550 },
  rennala: {
    name: "Rennala, Reine de la Pleine Lune",
    hp: 1200,
    atk: 80,
    runes: 15000,
    isBoss: true,
  },
};
export const BIOMES = {
  necrolimbe: {
    name: "Nécrolimbe",
    monsters: ["soldier", "wolf"],
    boss: "margit",
    length: 10,
    unlocks: "caelid",
  },
  caelid: {
    name: "Caelid",
    monsters: ["rotten_stray", "giant_crow"],
    boss: "radahn",
    length: 15,
    unlocks: "liurnia",
  },
  liurnia: {
    name: "Liurnia des Lacs",
    monsters: ["clayman", "sorcerer"],
    boss: "rennala",
    length: 18,
    unlocks: null,
  },
};
