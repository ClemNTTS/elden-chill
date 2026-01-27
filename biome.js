export const LOOT_TABLES = {
  limgrave_west: [
    { id: "iron_sword", chance: 0.5 },
    { id: "crimson_amber", chance: 0.3 },
    { id: "scholars_ring", chance: 0.1 },
    { id: "kama", chance: 0.1 },
  ],
  limgrave_east: [
    { id: "bloodhound_fang", chance: 0.2 },
    { id: "leather_vest", chance: 0.3 },
    { id: "kama", chance: 0.4 },
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



export const BIOMES = {
  limgrave_west: {
    name: "Nécrolimbe Ouest",
    rareMonsters: ["beastman1"],
    maxRareSpawns: 2,
    monsters: ["soldier1", "wolf1"],
    boss: "troll1_boss",
    length: 10,
    unlocks: "limgrave_east",
  },
  limgrave_east: {
    name: "Nécrolimbe Est",
    rareMonsters: ["runeBear1", "troll1_duo"],
    maxRareSpawns: 1,
    monsters: ["kaiden_sellsword", "godrick_knight"],
    boss: "bloodhound_knight_darriwil",
    length: 12,
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