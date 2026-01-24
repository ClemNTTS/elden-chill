export const ITEMS = {
  iron_sword: {
    categorie: "weapon",
    name: "Épée en Fer",
    description: "+5 Force <em style='color: grey;'>(+ 2 / Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.strength += 5 + 2 * (itemLevel - 1);
    },
  },
  twin_blade: {
    categorie: "two_handed_weapon",
    name: "Lames Jumelles",
    description:
      "Attaque 2 fois, -50% Force.\n<em style='color: grey;'>Réduis le malus de 5% par niveau (max 40%)</em>",
    apply: (stats, itemLevel) => {
      stats.attacksPerTurn = 2;
      if (0.05 * (itemLevel - 1) >= 0.4) {
        stats.strength *= 0.9;
      } else {
        stats.strength *= 0.5 + 0.05 * (itemLevel - 1);
      }
    },
  },
  crimson_amber: {
    categorie: "accessory",
    name: "Médaillon d'Ambre",
    description:
      "Vigueur x1.2 <em style='color: grey;'>( plus 0.1 par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * (1.2 + 0.1 * (itemLevel - 1)));
    },
  },
  great_shield: {
    categorie: "shield",
    name: "Grand Bouclier",
    description:
      "Vigueur x1.5 mais -20% Force. <em style='color: grey;'>(+0.05x Force par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * 1.5);
      stats.strength *= 0.8 + 0.05 * (itemLevel - 1);
    },
  },
  keen_dagger: {
    categorie: "weapon",
    name: "Dague Afilée",
    description:
      "+10% Chance Crit. <em style='color: grey;'>(+2% par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.critChance += 0.1 + 0.02 * (itemLevel - 1);
    },
  },
  scavenger_mask: {
    categorie: "accessory",
    name: "Masque de Pillard",
    description:
      "Dégâts Crit x2 mais Vigueur x0.4. <em style='color: grey;'>(+0.1x Vigueur par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.critDamage *= 2;
      stats.vigor = Math.floor(stats.vigor * (0.4 + 0.1 * (itemLevel - 1)));
    },
  },
};

export const LOOT_TABLES = {
  necrolimbe: [
    { id: "iron_sword", chance: 0.6 },
    { id: "crimson_amber", chance: 0.3 },
    { id: "twin_blade", chance: 0.1 },
  ],
  caelid: [
    { id: "twin_blade", chance: 0.15 },
    { id: "great_shield", chance: 0.3 },
    { id: "keen_dagger", chance: 0.5 },
    { id: "scavenger_mask", chance: 0.05 },
  ],
};

export const MONSTERS = {
  soldier: { name: "Soldat de Godrick", hp: 30, atk: 5, runes: 15, type: "normal" },
  wolf: { name: "Loup Affamé", hp: 15, atk: 8, runes: 10, type: "normal" },
  knight_elite: {
    name: "Chevalier d'Élite",
    hp: 80,
    atk: 15,
    runes: 100,
    type: "rare",
    loot: "keen_dagger",
  },
  margit: {
    name: "Margit le Déchu",
    hp: 200,
    atk: 25,
    runes: 500,
    isBoss: true,
    type: "boss",
  },
  rotten_stray: { name: "Chien Errant Putréfié", hp: 70, atk: 18, runes: 80, type: "normal" },
  giant_crow: { name: "Corbeau Géant", hp: 135, atk: 20, runes: 150, type: "normal" },
  rot_apostle: {
    name: "Apôtre de la Pourriture",
    hp: 120,
    atk: 22,
    runes: 200,
    type: "rare",
    loot: "scavenger_mask",
  },
  radahn: {
    name: "Vestige de Radahn",
    hp: 500,
    atk: 45,
    runes: 3000,
    isBoss: true,
    type: "boss",
  },
};

export const BIOMES = {
  necrolimbe: {
    name: "Nécrolimbe",
    monsters: ["soldier", "wolf"],
    rareMonster: "knight_elite",
    boss: "margit",
    length: 10,
    unlocks: "caelid",
    firstClearReward: "slots", // Unlocks all 4 slot types
  },
  caelid: {
    name: "Caelid",
    monsters: ["rotten_stray", "giant_crow"],
    rareMonster: "rot_apostle",
    boss: "radahn",
    length: 15,
    unlocks: null,
    firstClearReward: "accessory", // Unlocks new accessory slot
  },
};
