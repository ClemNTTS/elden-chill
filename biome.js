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
  liurnia_south: [
    { id: "carian_glintstone_staff", chance: 0.2 },
    { id: "moon_of_nokstella", chance: 0.2 },
    { id: "icerind_hatchet", chance: 0.3 },
    { id: "black_knife_gauntlets", chance: 0.3 },
  ],
  raya_lucaria_academy: [
    { id: "academy_glintstone_staff", chance: 0.3 },
    { id: "carian_crusher", chance: 0.3 },
    { id: "karolos_mask", chance: 0.4 },
  ],
  liurnia_west: [
    { id: "raya_lucaria_robe", chance: 0.4 },
    { id: "heavy_crystal_gauntlets", chance: 0.3 },
    { id: "crystal_crust_armor", chance: 0.3 },
  ],

  liurnia_east: [
    { id: "crystal_crust_armor", chance: 0.5 },
    { id: "carian_crusher", chance: 0.5 },
    { id: "bog_amulet", chance: 0.4 },
  ],

  liurnia_marsh: [{ id: "glintstone_dragon_heart", chance: 1 }],

  caelid_south: [
    { id: "executioner_greataxe", chance: 0.2 },
    { id: "executioner_hood", chance: 0.2 },
    { id: "guillotine_pendant", chance: 0.2 },
    { id: "marionette_scimitar", chance: 0.4 },
  ],

  redmane_castle: [
    { id: "radahn_lion_armor", chance: 0.5 },
    { id: "starscourge_greatsword", chance: 0.5 },
  ],
  caelid_dragonbarrow: [{ id: "rotten_dragon_heart", chance: 1 }],

  altus_plateau: [
    { id: "golden_tree_halberd", chance: 0.3 },
    { id: "golden_sentinel_armor", chance: 0.3 },
    { id: "sentinel_greatshield_talisman", chance: 0.4 },
    { id: "altus_exec_blade", chance: 0.18 },
    { id: "altus_exec_cloak", chance: 0.22 },
    { id: "altus_exec_sigil", chance: 0.14 },
  ],

  mount_gelmir: [
    { id: "gelmir_dragon_fang", chance: 0.22 },
    { id: "gelmir_dragon_hide", chance: 0.26 },
    { id: "gelmir_dragon_eye", chance: 0.12 },
    { id: "talisman_storm_dragon", chance: 0.2 },
    { id: "rune_fragment", chance: 0.2 },
  ],

  mountaintops: [
    { id: "giant_breaker_maul", chance: 0.2 },
    { id: "arena_colossus_plate", chance: 0.24 },
    { id: "arena_colossus_token", chance: 0.18 },
    { id: "talisman_posture", chance: 0.18 },
    { id: "rune_fragment", chance: 0.2 },
  ],

  crumbling_farum_azula: [
    { id: "azula_black_censer", chance: 0.18 },
    { id: "azula_black_veil", chance: 0.24 },
    { id: "azula_black_idol", chance: 0.16 },
    { id: "talisman_blackrot", chance: 0.18 },
    { id: "talisman_wayfarer", chance: 0.24 },
  ],

  caria_mansion: [
    { id: "loretta_glintstone_sickle", chance: 0.3 },
    { id: "lunar_resilience_talisman", chance: 0.7 },
  ],

  siofra_river: [
    { id: "ancestral_renaissance_horn", chance: 0.05 },
    { id: "ancient_bone_axe", chance: 0.45 },
    { id: "ancestral_spirit_horn", chance: 0.5 },
  ],

  nokron: [
    { id: "celestial_dew_talisman", chance: 0.5 },
    { id: "nokron_flame_dagger", chance: 0.5 },
  ],
  ainsel_river: [
    { id: "ainsel_shard_spear", chance: 0.34 },
    { id: "ainsel_starmap", chance: 0.33 },
    { id: "ainsel_silk_robe", chance: 0.33 },
  ],
  deeproot_depths: [
    { id: "rootbound_maul", chance: 0.34 },
    { id: "rootbound_plate", chance: 0.33 },
    { id: "prince_bark_talisman", chance: 0.33 },
  ],
  rotlake: [
    { id: "rotbloom_blade", chance: 0.34 },
    { id: "rotbloom_mail", chance: 0.33 },
    { id: "rotbloom_idol", chance: 0.33 },
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
    length: 10,
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
    unlocks: ["liurnia_south"],
  },

  caelid_west: {
    name: "Entrée de Caélid",
    rareMonsters: ["caelid_knight", "crystal_snail"],
    maxRareSpawns: 5,
    monsters: ["rotten_stray", "kindred_of_rot"],
    boss: "commander_oneil_weak",
    length: 14,
    unlocks: null,
    unlocks: ["caelid_south", "caelid_dragonbarrow"],
  },

  /*===========================
    Tier 4
  ============================*/
  liurnia_south: {
    name: "Liurnia des Lacs (Sud)",
    rareMonsters: ["giant_lobster"],
    maxRareSpawns: 3,
    monsters: ["clayman", "raya_sorcerer"],
    boss: "red_wolf_radagon",
    length: 10,
    unlocks: ["liurnia_east", "liurnia_west", "liurnia_marsh"],
  },

  liurnia_marsh: {
    name: "Marais de Liurnia",
    rareMonsters: ["giant_lobster"],
    maxRareSpawns: 5,
    monsters: ["clayman"],
    boss: "liurnia_dragon_smarag",
    length: 6,
    unlocks: null,
  },

  liurnia_east: {
    name: "Liurnia des Lacs (Est)",
    monsters: ["raya_sorcerer", "marionette_soldier"],
    rareMonsters: ["abductor_virgin", "fingercreeper_large"],
    maxRareSpawns: 3,
    boss: "bell_bearing_hunter_liurnia",
    length: 10,
    unlocks: ["raya_lucaria_academy"],
  },

  liurnia_west: {
    name: "Liurnia des Lacs (Ouest)",
    monsters: ["marionette_soldier", "raya_sorcerer"],
    rareMonsters: ["abductor_virgin", "fingercreeper_large"],
    maxRareSpawns: 3,
    boss: "carian_knight_bols",
    length: 10,
    unlocks: ["raya_lucaria_academy"],
  },

  raya_lucaria_academy: {
    name: "Académie de Raya Lucaria",
    rareMonsters: ["living_jar_large"],
    maxRareSpawns: 2,
    monsters: ["marionette_soldier", "raya_sorcerer"],
    boss: "rennala",
    length: 12,
    unlocks: ["altus_plateau", "caria_mansion"],
  },

  altus_plateau: {
    name: "Plateau d'Altus",
    monsters: ["leyndell_soldier", "altus_omen", "altus_praetor_guard"],
    rareMonsters: ["tree_sentinel_altus", "wormface_altus", "altus_chariot_knight"],
    maxRareSpawns: 3,
    boss: "draconic_tree_sentinel",
    length: 15,
    unlocks: ["mount_gelmir"],
    hazards: ["folie"],
  },

  caria_mansion: {
    name: "Manoir de Caria",
    monsters: ["lesser_fingercreeper"],
    rareMonsters: ["carian_troll_knight"],
    maxRareSpawns: 3,
    boss: "royal_knight_loretta",
    length: 8,
    unlocks: ["siofra_river"],
  },

  caelid_south: {
    name: "Sud de Caélid",
    monsters: ["radahn_soldier", "giant_dog"],
    rareMonsters: ["giant_crow", "rotten_marionetist"],
    maxRareSpawns: 2,
    boss: "commander_oneil_strong",
    length: 12,
    unlocks: ["redmane_castle"],
  },

  caelid_dragonbarrow: {
    name: "Tertre Draconique",
    monsters: ["giant_dog", "radahn_soldier"],
    rareMonsters: ["rotten_marionetist"],
    boss: "ekzykes",
    length: 6,
    unlocks: null,
  },

  redmane_castle: {
    name: "Château du Lion Rouge",
    monsters: ["radahn_soldier"],
    rareMonsters: ["winged_paladin"],
    boss: "radahn",
    length: 8,
    // unlocks: null,
    unlocks: ["nokron"],
  },

  siofra_river: {
    name: "Rivière Siofra",
    monsters: ["ancestral_follower", "siofra_rat"],
    rareMonsters: ["ancestral_sniper"],
    maxRareSpawns: 2,
    boss: "ancestral_spirit",
    length: 15,
    unlocks: ["redmane_castle"],
  },

  nokron: {
    name: "Nokron, Cité Éternelle",
    monsters: ["silver_tear_nokron", "nox_monk"],
    rareMonsters: ["giant_silver_tear"],
    maxRareSpawns: 2,
    boss: "mimic_tear_boss",
    length: 12,
    unlocks: ["ainsel_river", "deeproot_depths"],
  },
  // ---
  ainsel_river: {
    name: "Rivière Ainsel",
    rareMonsters: ["ainsel_oracle", "malformed_starling"],
    maxRareSpawns: 3,
    monsters: ["ainsel_ant", "ainsel_priest"],
    boss: "dragonkin_ainsel",
    length: 12,
    unlocks: ["rotlake"],
  },

  deeproot_depths: {
    name: "Profondeurs de la Souche",
    rareMonsters: ["siluria_remnant", "deathblight_basilisk"],
    maxRareSpawns: 3,
    monsters: ["root_shambler", "root_guardian"],
    boss: "fia_champion_echo",
    length: 12,
    unlocks: null,
  },
  rotlake: {
    name: "Lac de la Putréfaction",
    rareMonsters: ["cleanrot_revenant", "ulcerated_rot_spirit"],
    maxRareSpawns: 3,
    monsters: ["rot_pest", "scarlet_monk"],
    boss: "astel_bud",
    length: 12,
    unlocks: null,
  },

  mount_gelmir: {
    name: "Mont Gelmir",
    rareMonsters: ["serpent_inquisitor"],
    maxRareSpawns: 2,
    monsters: ["gelmir_hexmage", "altus_omen"],
    boss: "praetor_fragment",
    length: 14,
    unlocks: ["mountaintops"],
    hazards: ["poison", "putrefaction"],
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
    name: "Cimes des Geants",
    rareMonsters: ["icy_colossus"],
    maxRareSpawns: 2,
    monsters: ["giant_fire_disciple", "mountaintops_bird"],
    boss: "fire_giant_shard",
    length: 16,
    unlocks: ["crumbling_farum_azula"],
    hazards: ["gel", "folie"],
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
    name: "Farum Azula en Ruines",
    rareMonsters: ["azula_black_priest"],
    maxRareSpawns: 3,
    monsters: ["azula_beast_lord", "beastman1"],
    boss: "azula_tempest_avatar",
    length: 17,
    unlocks: ["Leyndell_ash"],
    hazards: ["folie", "putrefaction"],
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

