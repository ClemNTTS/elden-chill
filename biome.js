export const LOOT_TABLES = {
  /*===========================
    Tier 0 -> 1 Biomes
  ============================*/
  limgrave_west: [
    { id: "iron_sword", chance: 0.2 },
    { id: "crimson_amber", chance: 0.3 },
    { id: "scholars_ring", chance: 0.2 },
    { id: "kama", chance: 0.3 },
  ],

  /*===========================
    Tier 1 -> 2 Biomes
  ============================*/
  limgrave_east: [
    { id: "bloodhound_fang", chance: 0.4 },
    { id: "leather_vest", chance: 0.2 },
    { id: "kama", chance: 0.4 },
  ],
  limgrave_north: [
    { id: "margit_shackle", chance: 0.2 },
    { id: "knight_greatsword", chance: 0.2 },
    { id: "briar_armor", chance: 0.4 },
    { id: "margit_hammer", chance: 0.02 },
  ],
  limgrave_lake: [
    { id: "burned_dragon_hearth", chance: 0.15 },
    { id: "burn_sword", chance: 0.5 },
  ],
  caelid_west: [
    { id: "great_shield", chance: 0.1 },
    { id: "keen_dagger", chance: 0.6 },
    { id: "leather_boots", chance: 0.3 },
  ],
  /*===========================
    Tier 3
  ============================*/
  weeping_peninsula: [
    { id: "zamor_curved_sword", chance: 0.5 },
    { id: "radagon_scarseal", chance: 0.5 },
  ],

  enter_stormwind_castle: [
    { id: "twin_blade", chance: 0.5 },
    { id: "forged_grip", chance: 0.5 },
  ],

  stormwind_castle: [
    { id: "godrick_knight_armor", chance: 0.1 },
    { id: "godrick_great_rune", chance: 0.4 },
    { id: "godrick_axe", chance: 0.5 },
  ],

  morne_castle: [
    { id: "rune_fragment", chance: 0.2 },
    { id: "pumkin_helm", chance: 0.2 },
    { id: "grafted_blade_greatsword", chance: 0.6 },
  ],

  caelid_west: [
    { id: "rotten_greataxe", chance: 0.15 },
    { id: "vermilion_seed", chance: 0.2 },
    { id: "sage_caelid_robe", chance: 0.3 },
    { id: "winged_sword_insignia", chance: 0.35 },
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
    unlocks: ["limgrave_north", "limgrave_east", "limgrave_lake"],
  },
  limgrave_east: {
    name: "Nécrolimbe Est",
    rareMonsters: ["runeBear1", "troll1_duo"],
    maxRareSpawns: 1,
    monsters: ["kaiden_sellsword", "godrick_knight1"],
    boss: "bloodhound_knight_darriwil",
    length: 12,
    unlocks: null,
    unlocks: ["weeping_peninsula", "caelid_west"],
  },
  limgrave_north: {
    name: "Valorage",
    rareMonsters: ["bell_bearing_hunter1", "crucible_knight1"],
    maxRareSpawns: 1,
    monsters: ["white_wolf", "kaiden_sellsword", "godrick_knight1"],
    boss: "margit",
    length: 10,
    unlocks: ["enter_stormwind_castle"],
    //unlocks: ["enter_stormwind_castle", "liurnia_south"],
  },
  limgrave_lake: {
    name: "Lac de Nécrolimbe",
    rareMonsters: ["noble_mage"],
    maxRareSpawns: 6,
    monsters: ["noble_sword", "giant_crab"],
    boss: "limgrave_dragon",
    length: 6,
    unlocks: null,
  },

  /*===========================
    Tier 3
  ============================*/
  weeping_peninsula: {
    name: "Péninsule larmoyante",
    rareMonsters: ["nighth_cavalery", "half_human_queen"],
    maxRareSpawns: 3,
    monsters: ["servant_poison", "bats"],
    boss: "hero_of_zamor",
    length: 11,
    unlocks: ["morne_castle"],
  },
  morne_castle: {
    name: "Château de Vent-Hurlant",
    rareMonsters: ["lesser_mad_pumkin_head"],
    maxRareSpawns: 2,
    monsters: ["misbegotten_servant", "misbegotten_warrior"],
    boss: "misbegotten_leonine",
    length: 8,
    unlocks: null,
  },
  enter_stormwind_castle: {
    name: "Entrée de Voile Orage",
    rareMonsters: ["banished_knight"],
    maxRareSpawns: 2,
    monsters: ["exile_soldier1", "exile_soldier2", "exile_soldier3"],
    boss: "grafted_scion",
    length: 10,
    unlocks: ["stormwind_castle"],
  },
  stormwind_castle: {
    name: "Château de Voile Orage",
    rareMonsters: ["banished_knight"],
    maxRareSpawns: 6,
    monsters: ["stormveil_hawk"],
    boss: "godrick",
    length: 6,
    unlocks: null,
  },

  caelid_west: {
    name: "Entrée de Caélid",
    rareMonsters: ["caelid_knight"],
    maxRareSpawns: 5,
    monsters: ["rotten_stray", "kindred_of_rot"],
    boss: "commander_oneil_weak",
    length: 18,
    unlocks: null,
    //unlocks: ["redmane_castle"]
  },

  /*===========================
    Tier 4
  ============================*/
  liurnia_south: {
    name: "WIP Liurnia des Lacs - Sud",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["clayman", "sorcerer"],
    boss: "rennala",
    length: 18,
    unlocks: ["liurnia_east", "liurnia_west"],
  },
  liurnia_east: {
    name: "WIP Liurnia des Lacs - Est",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["ainsel_river"],
  },
  ainsel_river: {
    name: "WIP Rivière Ainsel",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: null,
  },
  liurnia_west: {
    name: "WIP Liurnia des Lacs - Ouest",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["caria_mansion", "raya_lucaria_academy"],
  },
  caria_mansion: {
    name: "WIP Manoir de Caria",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["siofra_river"],
  },
  raya_lucaria_academy: {
    name: "WIP Académie de Raya Lucaria",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["clayman", "sorcerer"],
    boss: "rennala",
    length: 18,
    unlocks: null,
  },
  siofra_river: {
    name: "WIP Rivière Siofra",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
  },

  redmane_castle: {
    name: "Château du Lion rouge",
    monsters: ["rotten_stray", "giant_crow"],
    boss: "radahn",
    length: 15,
    unlocks: ["nokron"],
  },
  nokron: {
    name: "WIP Nokron, Cité Éternelle",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["deeproot_depths"],
  },
  deeproot_depths: {
    name: "WIP Profondeurs de la Souche",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["rotlake"],
  },
  rotlake: {
    name: "WIP Lac de la Putréfaction",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["altus_plateau"],
  },
  altus_plateau: {
    name: "WIP Plateau d'Altus",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["mount_gelmir"],
  },
  mount_gelmir: {
    name: "WIP Mont Gelmir",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: null,
  },
  leyndell_royal: {
    name: "WIP Leyndell, Cité Royale",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["forbidden_land"],
  },
  forbidden_land: {
    name: "WIP Terre Interdite",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["mountaintops"],
  },
  mountaintops: {
    name: "WIP Sommets des Géants",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["consecrated_snowfield"],
  },
  consecrated_snowfield: {
    name: "WIP Plaine Enneigée Consacrée",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["mohgwyn_palace"],
  },
  mohgwyn_palace: {
    name: "WIP Palais de Mohgwyn",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["miquella_haligtree"],
  },
  miquella_haligtree: {
    name: "WIP Arbre Sacré de Miquella",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["crumbling_farum_azula"],
  },
  crumbling_farum_azula: {
    name: "WIP Farum Azula en Ruines",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["Leyndell_ash"],
  },
  Leyndell_ash: {
    name: "WIP Leyndell, Capitale des Cendres",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: ["erdTree"],
  },
  erdTree: {
    name: "WIP Arbre-Monde",
    rareMonsters: [""],
    maxRareSpawns: 1,
    monsters: ["", ""],
    boss: "",
    length: 12,
    unlocks: null,
  },
};
