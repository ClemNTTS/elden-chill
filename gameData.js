export const ITEMS = {
  iron_sword: {
    name: "Épée en Fer",
    description: "+5 Force",
    apply: (stats) => {
      stats.strength += 5;
    },
  },
  twin_blade: {
    name: "Lames Jumelles",
    description:
      "Attaque 2 fois, -50% Force.\n<em style='color: grey;'>Réduis le malus de 5% par niveau</em>",
    apply: (stats) => {
      stats.attacksPerTurn = 2;
      stats.strength *= 0.5;
    },
  },
  crimson_amber: {
    name: "Médaillon d'Ambre",
    description:
      "Vigueur x1.2 <em style='color: grey;'>( plus 0.1 par Niv)</em>",
    apply: (stats) => {
      stats.vigor = Math.floor(stats.vigor * (1.2 + 0.1 * (stats.level - 1)));
    },
  },
};

export const LOOT_TABLES = {
  necrolimbe: [
    { id: "iron_sword", chance: 0.6 },
    { id: "crimson_amber", chance: 0.3 },
    { id: "twin_blade", chance: 0.1 },
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
};

export const BIOMES = {
  necrolimbe: {
    name: "Nécrolimbe",
    monsters: ["soldier", "wolf"],
    boss: "margit",
    length: 10,
  },
};
