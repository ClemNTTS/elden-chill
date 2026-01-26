import { runtimeState } from "./state.js";

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
};

export const LOOT_TABLES = {
  limgrave_west: [
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
  soldier: {
    name: "Soldat de Godrick",
    hp: 30,
    atk: 5,
    runes: 15,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.1 },
  },
  wolf: { name: "Loup Affamé", hp: 15, atk: 8, runes: 10 },
  wolf_2: { name: "Couple de Loups Affamés", hp: 15, atk: 16, runes: 10, linkedFight:"wolf" },
  wolf_3: { name: "Meute de Loups Affamés", hp: 15, atk: 24, runes: 10, linkedFight:"wolf_2" },
  margit: {
    name: "Margit le Déchu",
    hp: 200,
    atk: 25,
    runes: 500,
    isBoss: true,
  },
  godrick_knight: {
    name: "Chevalier de Godrick",
    hp: 75,
    atk: 10,
    runes: 270,
    isRare: true,
    drops: [
      { item: "knight_greatsword", chance: 0.05 },
      { ash: "storm_stomp", chance: 0.2, unique: true },
    ],
  },
  rotten_stray: {
    name: "Chien Errant Putréfié",
    hp: 70,
    atk: 18,
    runes: 80,
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.3 },
  },
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
  crucible_knight: {
    name: "Chevalier du Creuset",
    hp: 180,
    atk: 22,
    runes: 450,
    isRare: true,
    drops: [
      { id: "briar_armor", chance: 0.2 },
      { ashId: "ash_stomp", chance: 0.5, unique: true },
    ],
  },
  beastman: {
    name: "Homme-Bête de Farum Azula",
    hp: 140,
    atk: 18,
    runes: 300,
    isRare: true,
    drops: [{ id: "iron_sword", chance: 0.8 }],
  },
};
export const BIOMES = {
  limgrave_west: {
    name: "Nécrolimbe Ouest",
    rareMonsters: ["crucible_knight", "beastman"],
    maxRareSpawns: 2,
    monsters: ["soldier", "wolf", "wolf_3"],
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

export const STATUS_EFFECTS = {
  POISON: {
    id: "POISON",
    name: "Poison",
    color: "#2ecc71",
    onTurnStart: (entity, isPlayer) => {
      const damage = Math.max(1, Math.floor(entity.maxHp * 0.03));
      entity.currentHp -= damage;
      return {
        damage,
        message: `${entity.name} subit ${damage} dégâts de poison !`,
      };
    },
  },
  THORNS: {
    id: "THORNS",
    name: "Épines",
    color: "#148d0b",
    onBeingHit: (attacker, damageTaken) => {
      const reflectDamage = Math.max(1, Math.floor(damageTaken * 0.15));
      if (attacker.name && attacker.name === "player") {
        runtimeState.playerCurrentHp -= reflectDamage;
      } else {
        attacker.currentHp -= reflectDamage;
      }

      return {
        damage: reflectDamage,
        message: `${attacker.name === "player" ? "Vous vous blessez" : attacker.name + " se blesse"} sur les épines ! (-${reflectDamage} PV)`,
      };
    },
  },
  BLEED: {
    id: "BLEED",
    name: "Saignement",
    color: "#e74c3c",
    onBeingHit: (attacker, defender, damageTaken) => {
      // Le saignement pourrait avoir une chance de proc des dégâts bonus
      if (Math.random() < 0.2) {
        const bonus = Math.floor(defender.maxHp * 0.1);
        defender.currentHp -= bonus;
        return { damage: bonus, message: "HÉMORRAGIE ! Dégâts massifs !" };
      }
    },
  },
  STUN: {
    id: "STUN",
    name: "Étourdi",
    color: "#f1c40f",
    onTurnStart: (entity) => {
      return {
        skipTurn: true,
        message: `${entity.name} est étourdi et ne peut pas agir !`,
      };
    },
  },
  SCARLET_ROT: {
    id: "SCARLET_ROT",
    name: "Putréfaction",
    color: "#922b21",
    onTurnStart: (entity) => {
      const damage = Math.max(2, Math.floor(entity.maxHp * 0.05));
      entity.currentHp -= damage;
      return {
        damage,
        message: `${entity.name} est rongé par la putréfaction (-${damage} PV) !`,
      };
    },
  },
};
