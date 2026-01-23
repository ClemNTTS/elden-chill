export const ITEMS = {
  iron_sword: {
    name: "Épée en Fer",
    description: "+5 Force <em style='color: grey;'>(x Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.strength += 5 * itemLevel;
    },
  },
  twin_blade: {
    name: "Lames Jumelles",
    description:
      "Attaque 2 fois, -50% Force.\n<em style='color: grey;'>Réduis le malus de 5% par niveau</em>",
    apply: (stats, itemLevel) => {
      stats.attacksPerTurn = 2;
      stats.strength *= 0.5 + 0.05 * (itemLevel - 1); // Correction : on réduit le malus donc on ajoute
    },
  },
  crimson_amber: {
    name: "Médaillon d'Ambre",
    description:
      "Vigueur x1.2 <em style='color: grey;'>( plus 0.1 par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * (1.2 + 0.1 * (itemLevel - 1)));
    },
  },
  great_shield: {
    name: "Grand Bouclier",
    description:
      "Vigueur x1.5 mais -20% Force. <em style='color: grey;'>(+0.05x Force par Niv)</em>",
    apply: (stats, itemLevel) => {
      stats.vigor = Math.floor(stats.vigor * 1.5);
      stats.strength *= 0.8 + 0.05 * (itemLevel - 1);
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
  soldier: { name: "Soldat de Godrick", hp: 30, atk: 5, runes: 15 },
  wolf: { name: "Loup Affamé", hp: 15, atk: 8, runes: 10 },
  margit: {
    name: "Margit le Déchu",
    hp: 200,
    atk: 25,
    runes: 500,
    isBoss: true,
  },
  rotten_stray: { name: "Chien Errant Putréfié", hp: 60, atk: 12, runes: 40 },
  giant_crow: { name: "Corbeau Géant", hp: 120, atk: 18, runes: 85 },
  radahn: {
    name: "Vestige de Radahn",
    hp: 500,
    atk: 45,
    runes: 2500,
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
    unlocks: null,
  },
};
