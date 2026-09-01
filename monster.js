/*regles de bases que je vais tester
hp d'origine divisé par 10 pour les mobs. pour les normaux, un multiplicateur de 1 a 2 sure la vie et le drop de runes
mobs normaux ont un drop de rune de base egal au minimum in game. les Rares ont un tier. Les boss sont divisé par 10. Exception si le monstre n est normalement pas un boss, tiraité au cas par cas.
*/
import { V21_MONSTERS } from "./monsters/v21.js";
import { ENDGAME_MONSTERS, TRIAL_MONSTERS } from "./monsters/endgame.js";

export const MONSTERS = {
  // === LIMGRAVE WEST===
  soldier1: {
    name: "Soldat de Godrick",
    hp: 19,
    atk: 5,
    runes: 40,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.1 },
  },
  wolf1: {
    name: "Loup Affamé",
    hp: 8,
    atk: 6,
    runes: 60,
    groupCombinations: [
      { size: 1, chance: 0.5 },
      { size: 2, chance: 0.3 },
      { size: 3, chance: 0.2 },
    ],
  },
  beastman1: {
    name: "Homme-Bête de Farum Azula",
    hp: 84,
    atk: 16,
    runes: 333,
    isRare: true,
    drops: [
      { id: "iron_sword", chance: 0.95 },
      { id: "keen_dagger", chance: 0.95 },
      { id: "heavy_club", chance: 0.95 },
      { ashId: "beginer_tarnished_heal", chance: 0.8, unique: true },
    ],
  },
  troll1_boss: {
    name: "Troll des Collines",
    hp: 147,
    atk: 15,
    runes: 500,
    isBoss: true,
    hasSecondPhase: true,
    isInSecondPhase: false,
    thresholdForPhase2: 0.5,
    dmgMultPhase2: 2,
    flavorTextPhase2: "Le Troll, fou de rage, sort son épée !",
  },
  // === LIMGRAVE EAST===
  godrick_knight1: {
    name: "Chevalier de Godrick",
    hp: 49,
    atk: 10,
    runes: 170,
  },
  kaiden_sellsword: {
    name: "Mercenaire de Kaiden",
    hp: 28,
    atk: 20,
    runes: 155,
  },
  troll1_duo: {
    name: "Troll des Collines",
    hp: 120,
    atk: 15,
    runes: 450,
    isRare: true,
    hasSecondPhase: true,
    isInSecondPhase: false,
    thresholdForPhase2: 0.5,
    dmgMultPhase2: 2,
    flavorTextPhase2: "Le Troll, fou de rage, sort sont épée !",
    groupCombinations: [{ size: 2, chance: 1.0 }],
    drops: [
      { id: "troll_necklace", chance: 0.7 },
      { id: "leather_boots", chance: 0.8 },
      { id: "kama", chance: 0.45 },
    ],
  },
  runeBear1: {
    name: "Ours Runique",
    hp: 210,
    atk: 22,
    runes: 850,
    isRare: true,
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.3 },
    groupCombinations: [
      { size: 1, chance: 0.9 },
      { size: 2, chance: 0.1 },
    ],
    drops: [
      { id: "styptic_boluses", chance: 0.45 },
      { id: "leather_vest", chance: 0.6 },
      { id: "bloodhound_fang", chance: 0.45 },
      { ashId: "bloody_slash", chance: 0.02, unique: true },
    ],
  },
  bloodhound_knight_darriwil: {
    name: "Chevalier Limier Darriwil",
    hp: 225, //2x health compared to ingame
    atk: 30,
    runes: 975,
    isBoss: true,
    onHitEffect: { id: "BLEED", duration: 5, chance: 0.8 },
  },
  // === LIMGRAVE NORTH===
  white_wolf: {
    name: "Loup Blanc",
    hp: 30,
    atk: 24,
    runes: 100,
    groupCombinations: [
      { size: 1, chance: 0.7 },
      { size: 2, chance: 0.3 },
    ],
    companion: ["wolf2"],
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.4 },
  },
  wolf2: {
    name: "Loup Affamé",
    hp: 16,
    atk: 12,
    runes: 80,
    groupCombinations: [
      { size: 1, chance: 0.5 },
      { size: 2, chance: 0.5 },
    ],
  },
  bell_bearing_hunter1: {
    name: "Chasseur de Clochettes",
    hp: 215,
    atk: 32,
    runes: 600,
    isRare: true,
    onHitEffect: { id: "BLEED", duration: 1, chance: 1.0 },
    drops: [
      { id: "knight_greatsword", chance: 0.95 },
      { ashId: "bloody_slash", chance: 0.03, unique: true },
    ],
  },
  crucible_knight1: {
    name: "Chevalier du Creuset",
    hp: 280,
    atk: 30,
    runes: 440,
    dodgeChance: 0.15,
    isRare: true,
    drops: [
      { id: "briar_armor", chance: 0.15 },
      { id: "styptic_boluses", chance: 0.8 },
    ],
  },
  margit: {
    name: "Margit le Déchu",
    hp: 350,
    atk: 45,
    runes: 2400,
    isBoss: true,
    dodgeChance: 0.2,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.333 },
  },
  // === LIMGRAVE LAKE===
  noble_sword: {
    name: "Épéiste Noble",
    hp: 9,
    atk: 5,
    runes: 10,
    groupCombinations: [
      { size: 2, chance: 0.5 },
      { size: 3, chance: 0.4 },
      { size: 4, chance: 0.1 },
    ],
  },
  giant_crab: {
    name: "Crabe Géant",
    hp: 80,
    atk: 15,
    runes: 62,
  },
  noble_mage: {
    name: "Mage Noble",
    hp: 25,
    atk: 7,
    runes: 15,
    isRare: true,
    companion: ["noble_sword"],
    groupCombinations: [
      { size: 1, chance: 0.5 },
      { size: 2, chance: 0.5 },
    ],
    drops: [
      { id: "astronomer_staff", chance: 0.75 },
      { id: "scholars_ring", chance: 0.65 },
    ],
  },
  limgrave_dragon: {
    name: "Dragon volant Agheel",
    hp: 840,
    atk: 42,
    runes: 2500,
    isBoss: true,
    onHitEffect: { id: "BURN", duration: 2, chance: 0.5 },
  },
  // === WEEPING PENINSULA ===
  servant_poison: {
    name: "Servante empoisonée",
    hp: 34,
    atk: 15,
    onHitEffect: { id: "POISON", duration: 2, chance: 0.5 },
    runes: 153,
    groupCombinations: [
      { size: 1, chance: 0.5 },
      { size: 2, chance: 0.5 },
    ],
  },

  bats: {
    name: "Chauve-souris",
    hp: 10,
    atk: 6,
    runes: 95,
    companion: ["chanting_dame"],
    companionCount: 1,
    groupCombinations: [
      { size: 3, chance: 0.5 },
      { size: 4, chance: 0.5 },
    ],
  },
  chanting_dame: {
    name: "Sirène Chantante",
    hp: 50,
    atk: 20,
    runes: 250,
    onHitEffect: { id: "STUN", duration: 2, chance: 0.15 },
  },

  servant_poison_companion: {
    name: "Servante empoisonée",
    runes: 70,
    hp: 24,
    atk: 13,
    onHitEffect: { id: "POISON", duration: 2, chance: 0.8 },
    groupCombinations: [
      { size: 2, chance: 0.5 },
      { size: 3, chance: 0.5 },
    ],
  },

  half_human_queen: {
    name: "Reine Demi-Humaine",
    hp: 294,
    atk: 35,
    runes: 605,
    isRare: true,
    companion: ["servant_poison_companion"],
    companionCount: 3,
    drops: [
      {
        id: "queen_staff",
        chance: 0.75,
      },
    ],
  },

  nighth_cavalery: {
    name: "Cavalier de la Nuit",
    hp: 280,
    atk: 28,
    runes: 700,
    isRare: true,
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.5 },
    drops: [
      { id: "night_cavalry_armor", chance: 0.75 },
      { ashId: "great_shield", chance: 0.03, unique: true },
    ],
  },

  hero_of_zamor: {
    name: "Héros de Zamor",
    isBoss: true,
    hp: 650,
    atk: 55,
    armor: 115,
    runes: 2000,
    dodgeChance: 0.22,
    effectsPhase2: { id: "FROSTBITE", duration: 5, chance: 0.5 },
    hasSecondPhase: true,
    isInSecondPhase: false,
    thresholdForPhase2: 0.7,
    flavorTextPhase2: "La lame du Hero de Zamor se refroidit!",
  },

  // === MORNE CASTLE ===
  misbegotten_warrior: {
    name: "Chimère Léonine",
    hp: 98,
    atk: 35,
    runes: 280,
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.3 },
  },

  misbegotten_servant: {
    name: "Serviteur Chimérique",
    hp: 55,
    atk: 18,
    runes: 110,
    groupCombinations: [
      { size: 2, chance: 0.6 },
      { size: 3, chance: 0.4 },
    ],
  },

  lesser_mad_pumkin_head: {
    name: "Tête de Citrouille Mineure",
    hp: 340,
    atk: 38,
    runes: 640,
    armor: 150,
    isRare: true,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.35 },
    drops: [
      { id: "pumkin_helm", chance: 0.7 },
      { id: "grafted_blade_greatsword", chance: 0.02 },
    ],
  },

  misbegotten_leonine: {
    name: "Chimère Léonine",
    hp: 700,
    atk: 35,
    runes: 3800,
    isBoss: true,
    armor: 115,
    dodgeChance: 0.25,
    specificStats: { attacksPerTurn: 2, critChance: 0.1, critDamage: 1.5 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.09 },

    hasSecondPhase: true,
    thresholdForPhase2: 0.4,
    dmgMultPhase2: 1.4,
    flavorTextPhase2:
      "La Chimère pousse un rugissement bestial, sa soif de vengeance décuple sa force !",
  },

  // === ENTER STORMWIND CASTLE ===
  exile_soldier1: {
    name: "Soldat d'Exil",
    hp: 40,
    atk: 15,
    armor: 110,
    runes: 210,
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.4 },
  },
  exile_soldier2: {
    name: "Soldat d'Exil",
    hp: 30,
    atk: 8,
    armor: 110,
    runes: 210,
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
    onHitEffect: { id: "BURN", duration: 2, chance: 0.4 },
  },
  exile_soldier3: {
    name: "Soldat d'Exil",
    hp: 50,
    atk: 20,
    armor: 110,
    runes: 210,
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
  },
  banished_knight: {
    name: "Chevalier Banni",
    hp: 350,
    atk: 35,
    runes: 600,
    isRare: true,
    armor: 150,
    drops: [
      { id: "hunter_cap", chance: 0.85 },
      { id: "alchimist_suit", chance: 0.75 },
      { ashId: "storm_stomp", chance: 0.025, unique: true },
    ],
    onHitEffect: { id: "STUN", duration: 1, chance: 0.1 },
  },

  grafted_scion: {
    name: "Rejeton Greffé",
    hp: 412,
    atk: 35,
    runes: 2200,
    isBoss: true,
    armor: 90,
    hasSecondPhase: true,
    isInSecondPhase: false,
    thresholdForPhase2: 0.4,
    dmgMultPhase2: 2,
    flavorTextPhase2: "Le Rejeton Greffé hurle et déchaîne ses nombreux bras !",
    effectsPhase2: { id: "BLEED", duration: 4, chance: 0.5 },
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.3 },
  },

  // === STORMWIND CASTLE ===

  stormveil_hawk: {
    name: "Faucon de Tempête",
    hp: 65,
    atk: 12,
    runes: 180,
    dodgeChance: 0.05,
    groupCombinations: [
      { size: 2, chance: 0.4 },
      { size: 3, chance: 0.6 },
    ],
    onHitEffect: { id: "BLEED", duration: 1, chance: 0.3 },
  },

  godrick: {
    name: "Godrick le Greffé",
    hp: 1100,
    atk: 65,
    runes: 5000,
    armor: 125,
    dodgeChance: 0.05,
    isBoss: true,
    hasSecondPhase: true,
    thresholdForPhase2: 0.55,
    flavorTextPhase2: "GUEEERRIER ! Je t'ordonne de t'agenouiller !",
    effectsPhase2: { id: "BURN", duration: 3, chance: 0.9 },
  },

  // === CAELID WEST===

  rotten_stray: {
    name: "Chien Errant Putréfié",
    hp: 85,
    atk: 22,
    runes: 210,
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.35 },
    groupCombinations: [
      { size: 1, chance: 0.6 },
      { size: 2, chance: 0.4 },
    ],
  },

  kindred_of_rot: {
    name: "Serviteur de la Putréfaction",
    hp: 120,
    atk: 28,
    runes: 250,
    groupCombinations: [
      { size: 2, chance: 0.6 },
      { size: 3, chance: 0.4 },
    ],
    onHitEffect: { id: "POISON", duration: 2, chance: 0.4 },
  },

  crystal_snail: {
    name: "Escargot de Cristal",
    hp: 440,
    atk: 35,
    runes: 300,
    armor: 250,
    isRare: true,
    passiveStatus: "THORNS",
    onHitEffect: { id: "POISON", duration: 3, chance: 0.2 },
    drops: [
      { id: "crystal_shell_mail", chance: 0.65 },
      { id: "snail_slime_mantle", chance: 0.65 },
    ],
  },

  caelid_knight: {
    name: "Chevalier de Caélid",
    hp: 550,
    atk: 55,
    runes: 1200,
    isRare: true,
    armor: 140,
    drops: [
      { id: "stormhawk_feather", chance: 0.65 },
      { id: "winged_sword_insignia", chance: 0.85 },
    ],
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.2 },
  },

  commander_oneil_weak: {
    name: "Commandant O'Neil (Exilé)",
    hp: 1400,
    atk: 50,
    runes: 4500,
    isBoss: true,
    armor: 150,
    companion: ["exile_soldier2"],
    companionCount: 2,
    flavorTextPhase2:
      "Le Commandant plante son étendard dans la terre corrompue !",
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    dmgMultPhase2: 1.3,
  },

  commander_oneil_strong: {
    name: "Commandant O'Neil (Exilé)",
    hp: 1400,
    atk: 90,
    runes: 4500,
    isBoss: true,
    armor: 150,
    companion: ["exile_soldier1"],
    companionCount: 4,
    flavorTextPhase2:
      "Le Commandant plante son étendard dans la terre corrompue !",
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    dmgMultPhase2: 1.3,
  },

  // === LIURNIA SOUTH ===
  clayman: {
    name: "Homme d'Argile",
    hp: 78,
    atk: 20,
    runes: 450,
    armor: 140,
    groupCombinations: [
      { size: 2, chance: 0.7 },
      { size: 3, chance: 0.3 },
    ],
  },

  raya_sorcerer: {
    name: "Sorcier de l'Académie",
    hp: 98,
    atk: 30,
    armor: 85,
    runes: 520,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.05 },
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
  },

  giant_lobster: {
    name: "Homard Géant",
    hp: 550,
    atk: 35,
    runes: 1800,
    isRare: true,
    armor: 130,
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.25 },
    drops: [
      { id: "carian_glintstone_staff", chance: 0.62 },
      { id: "carian_knight_armor", chance: 0.7 },
      { id: "snail_slime_mantle", chance: 0.9 },
      { ashId: "hoarfrost_stomp", chance: 0.07, unique: true },
    ],
  },

  red_wolf_radagon: {
    name: "Loup Rouge de Radagon",
    hp: 916,
    atk: 41,
    runes: 8500,
    isBoss: true,
    dodgeChance: 0.15,
    specificStats: { attacksPerTurn: 2, critChance: 0.1, critDamage: 1.5 },
    flavorTextPhase2: "Le loup invoque une lame magique étincelante !",
    hasSecondPhase: true,
    thresholdForPhase2: 0.45,
    dmgMultPhase2: 1.3,
  },

  // --- BOSS DE LIURNIA EST ---
  bell_bearing_hunter_liurnia: {
    name: "Chasseur de Perles de Liurnia",
    hp: 1200,
    atk: 62,
    runes: 5500,
    isBoss: true,
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Le Chasseur de Perles vous traque !",
    dmgMultPhase2: 1.5,
    armor: 150,
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.6 },
  },

  carian_knight_bols: {
    name: "Bols, Chevalier Carien",
    hp: 1200,
    atk: 55,
    runes: 5500,
    isBoss: true,
    armor: 160,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.3 },
  },

  abductor_virgin: {
    name: "Vierge Ravisseuse",
    hp: 500,
    atk: 50,
    runes: 2200,
    isRare: true,
    armor: 135,
    onHitEffect: { id: "STUN", duration: 2, chance: 0.4 },
    drops: [
      { id: "lobster_shell_plate", chance: 0.7 },
      { id: "marsh_great_hammer", chance: 0.6 },
    ],
  },

  fingercreeper_large: {
    name: "Main de Doigts Géante",
    hp: 650,
    atk: 21,
    runes: 1500,
    isRare: true,
    specificStats: { attacksPerTurn: 3, critChance: 0.1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.05 },
    drops: [
      { id: "marsh_great_hammer", chance: 0.65 },
      { id: "lobster_shell_plate", chance: 0.65 },
    ],
  },

  // --- ACADÉMIE ---
  marionette_soldier: {
    name: "Soldat Marionnette",
    hp: 110,
    atk: 10,
    runes: 480,
    specificStats: { attacksPerTurn: 4, critChance: 0.1 },
    groupCombinations: [
      { size: 2, chance: 0.8 },
      { size: 3, chance: 0.2 },
    ],
  },

  living_jar_large: {
    name: "Grande Jarre Vivante",
    hp: 550,
    atk: 35,
    runes: 1200,
    armor: 220,
    isRare: true,
    onHitEffect: { id: "STUN", duration: 2, chance: 0.08 },
    drops: [
      { id: "heavy_crystal_gauntlets", chance: 0.75 },
      { id: "crystal_crust_armor", chance: 0.75 },
    ],
  },

  rennala: {
    name: "Rennala, Reine de la Pleine Lune",
    hp: 2600,
    atk: 70,
    runes: 10000,
    isBoss: true,
    armor: 80,
    hasSecondPhase: true,
    thresholdForPhase2: 0.4,
    flavorTextPhase2: "Naîs à nouveau, sous la lune de sang !",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.1 },
    specificStats: { attacksPerTurn: 1, critChance: 0.2, critDamage: 2.0 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.15 },
  },

  // === MARAIS DE LIURNIA
  liurnia_dragon_smarag: {
    name: "Smarag, Dragon de Pierre d'Éclat",
    hp: 6600,
    atk: 175,
    runes: 22000,
    isBoss: true,
    armor: 140,
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.4 }, // Le froid magique
    drops: [
      { id: "glintstone_dragon_heart", chance: 1.0 }, // Drop garanti
    ],
  },

  // --- CARIA MANSION ---
  lesser_fingercreeper: {
    name: "Petite Main de Doigts",
    hp: 210,
    atk: 32,
    runes: 880,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "POISON", duration: 1, chance: 0.15 },
    groupCombinations: [
      { size: 2, chance: 0.7 },
      { size: 3, chance: 0.3 },
    ],
  },

  carian_troll_knight: {
    name: "Chevalier Troll de Caria",
    hp: 1400,
    atk: 70,
    runes: 5500,
    isRare: true,
    armor: 180,
    onHitEffect: { id: "STUN", duration: 2, chance: 0.3 },
    drops: [
      { id: "carian_troll_gauntlet", chance: 0.5 },
      { id: "finger_stitcher_needle", chance: 0.5 },
    ],
  },

  royal_knight_loretta: {
    name: "Loretta, Chevalier Royal",
    hp: 3200,
    atk: 105,
    runes: 12000,
    isBoss: true,
    armor: 130,
    dodgeChance: 0.15,
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "Loretta prépare son arc de pierre d'éclat... Le grand arc de Loretta !",
    specificStats: { attacksPerTurn: 1, splashDamage: 40 }, // Dégâts de zone en P2
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.4 },
  },

  // --- MONSTRES DE CAÉLID ---
  giant_dog: {
    name: "Chien T-Rex Géant",
    hp: 450,
    atk: 55,
    runes: 850,
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.4 },
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
  },
  radahn_soldier: {
    name: "Soldat de Radahn",
    hp: 180,
    atk: 32,
    runes: 350,
    armor: 120,
    onHitEffect: { id: "BURN", duration: 2, chance: 0.2 },
  },
  giant_crow: {
    name: "Corbeau Monstrueux",
    hp: 380,
    atk: 65,
    runes: 920,
    dodgeChance: 0.15,
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
    isRare: true,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.2 },
    drops: [
      { id: "stormhawk_feather", chance: 0.5 },
      { id: "winged_sword_insignia", chance: 0.4 },
    ],
  },

  rotten_marionetist: {
    name: "Marionnettiste Putréfié",
    hp: 320,
    atk: 25,
    runes: 800,
    isRare: true,
    specificStats: { attacksPerTurn: 3 },
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.25 },
    drops: [
      { id: "marionette_scimitar", chance: 0.55 },
      { id: "marionette_mask", chance: 0.55 },
    ],
  },

  winged_paladin: {
    name: "Paladin Ailé",
    hp: 600,
    atk: 65,
    runes: 2500,
    isRare: true,
    armor: 180,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.2 },
    drops: [
      { id: "executioner_greataxe", chance: 0.45 },
      { id: "executioner_hood", chance: 0.45 },
      { id: "guillotine_pendant", chance: 0.45 },
      { ashId: "starcaller_cry", chance: 0.25, unique: true },
    ],
  },

  radahn: {
    name: "Radahn le Fléau des Astres",
    hp: 10000,
    atk: 220,
    runes: 55000,
    isBoss: true,
    armor: 220,
    specificStats: { attacksPerTurn: 2, splashDamage: 100 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Radahn disparaît dans le ciel... UNE MÉTÉORE APPROCHE !",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.3 },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.4 },
  },
  // --- BOSS : EKZYKES L'INCURABLE ---
  ekzykes: {
    name: "Ekzykes l'Incurable",
    hp: 9500,
    atk: 180,
    runes: 55000,
    isBoss: true,
    armor: 160,
    onHitEffect: { id: "SCARLET_ROT", duration: 5, chance: 0.6 },
  },

  // --- Plateau ---
  leyndell_soldier: {
    name: "Soldat de Leyndell",
    hp: 220,
    atk: 58,
    runes: 1500,
    armor: 150,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.08 },
    groupCombinations: [
      { size: 2, chance: 0.7 },
      { size: 3, chance: 0.3 },
    ],
  },

  altus_omen: {
    name: "Augure du Plateau",
    hp: 650,
    atk: 75,
    runes: 2100,
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.25 },
  },

  tree_sentinel_altus: {
    name: "Sentinelle de l'Arbre (Altus)",
    hp: 2800,
    atk: 110,
    runes: 14500,
    isRare: true,
    armor: 220,
    specificStats: { critChance: 0.15 },
    drops: [
      { id: "golden_tree_halberd", chance: 0.5 },
      { id: "golden_sentinel_armor", chance: 0.5 },
    ],
  },

  wormface_altus: {
    name: "Visage de Ver",
    hp: 2200,
    atk: 85,
    runes: 6200,
    isRare: true,
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.4 },
    drops: [{ id: "sentinel_greatshield_talisman", chance: 0.7 }],
  },

  draconic_tree_sentinel: {
    name: "Sentinelle Dracogarde de l'Arbre",
    hp: 8500,
    atk: 165,
    runes: 52000,
    isBoss: true,
    armor: 250,
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "Les cieux s'assombrissent... La foudre s'abat sur son bouclier !",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.12 },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.3 },
  },

  // RIVER

  ancestral_follower: {
    name: "Disciple Ancestral",
    hp: 550,
    atk: 45,
    runes: 450,
  },

  siofra_rat: {
    name: "Rat de Siofra",
    hp: 45,
    atk: 18,
    runes: 120,
    groupCombinations: [
      { size: 3, chance: 0.6 },
      { size: 5, chance: 0.4 },
    ], // Attaques en meute
  },

  ancestral_sniper: {
    name: "Archer Ancestral",
    hp: 1000,
    runes: 5000,
    armor: 80,
    atk: 83,
    isRare: true,
    isCharging: false,
    drops: [
      { id: "starlight_pendant", chance: 0.15 },
      { id: "horn_bow_talisman", chance: 0.75 },
    ],

    onTurnAction: (enemy, player) => {
      if (!enemy.isCharging) {
        enemy.isCharging = true;
        return {
          msg: `${enemy.name} bande son arc de corne...`,
          skipAttack: true,
        };
      } else {
        enemy.isCharging = false;
        return { msg: "TIR MAGIQUE !", dmgMult: 3.0 };
      }
    },
  },

  ancestral_spirit: {
    name: "Esprit Ancestral",
    hp: 2500,
    atk: 140,
    runes: 12000,
    isBoss: true,
    dodgeChance: 0.2,
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    onTurnAction: (enemy, player) => {
      // Se soigne de 40 PV s'il est sous 50% de vie
      if (enemy.hp < enemy.maxHp * 0.5) {
        const heal = 40;
        return {
          msg: "L'esprit absorbe l'essence des forêts...",
          healAmount: heal,
        };
      }
      return {};
    },
  },

  // --- NOKRON, CITÉ ÉTERNELLE ---
  silver_tear_nokron: {
    name: "Larme d'Argent",
    hp: 450,
    atk: 45,
    runes: 1200,
    armor: 80,
    isHardened: false,
    onTurnAction: (enemy, player) => {
      enemy.isHardened = !enemy.isHardened;
      enemy.armor = enemy.isHardened ? 300 : 80;
      return {
        msg: enemy.isHardened
          ? "La Larme d'Argent se fige et durcit comme de l'acier !"
          : "La Larme se liquéfie, redevenant vulnérable.",
      };
    },
  },

  nox_monk: {
    name: "Moine de Nox",
    hp: 800,
    atk: 55,
    runes: 1500,
    armor: 120,
    dodgeChance: 0.3,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.2 },
  },

  giant_silver_tear: {
    name: "Larme d'Argent Géante",
    hp: 1800,
    atk: 90,
    runes: 8000,
    isRare: true,
    armor: 200,
    isExploding: false,
    drops: [
      { id: "silver_tear_mask", chance: 0.75 },
      { id: "mercury_breastplate", chance: 0.75 },
    ],
    onTurnAction: (enemy) => {
      if (enemy.hp < enemy.maxHp * 0.2 && !enemy.isExploding) {
        enemy.isExploding = true;
        return {
          msg: "La Larme Géante vibre violemment... elle va exploser !",
        };
      }
      if (enemy.isExploding) {
        enemy.hp = 0; // L'ennemi meurt dans l'explosion
        return {
          msg: "BOOM ! La Larme explose en un nuage de givre !",
          dmgMult: 3.0,
        };
      }
      return {};
    },
  },

  mimic_tear_boss: {
    name: "Larme Imitatrice",
    hp: 13000,
    atk: 100,
    runes: 45000,
    isBoss: true,
    copied: false,
    onTurnAction: (enemy, player) => {
      // Au premier tour, elle analyse et copie vos statistiques effectives
      if (!enemy.copied) {
        const eff = getEffectiveStats();
        enemy.atk = Math.floor(eff.strength * 1.2); // Elle frappe 20% plus fort que vous
        enemy.armor = Math.floor(eff.armor);
        enemy.copied = true;
        return {
          msg: "La Larme prend votre forme et reflète votre propre puissance !",
        };
      }
      return {};
    },
  },

  // --- RIVIERE AINSEL ---
  ainsel_ant: {
    name: "Fourmi d'Ainsel",
    hp: 620,
    atk: 62,
    runes: 1600,
    armor: 135,
    groupCombinations: [
      { size: 2, chance: 0.7 },
      { size: 3, chance: 0.3 },
    ],
    onHitEffect: { id: "POISON", duration: 2, chance: 0.25 },
  },

  ainsel_priest: {
    name: "Prêtre d'Ainsel",
    hp: 520,
    atk: 78,
    runes: 1750,
    armor: 110,
    groupCombinations: [
      { size: 1, chance: 0.8 },
      { size: 2, chance: 0.2 },
    ],
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.2 },
  },

  ainsel_oracle: {
    name: "Oracle d'Ainsel",
    hp: 1650,
    atk: 105,
    runes: 7200,
    armor: 150,
    isRare: true,
    specificStats: { attacksPerTurn: 2, critChance: 0.12 },
    drops: [
      { id: "ainsel_starmap", chance: 0.55 },
      { id: "ainsel_silk_robe", chance: 0.55 },
    ],
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.35 },
  },

  malformed_starling: {
    name: "Astre Déchu Juvenile",
    hp: 2100,
    atk: 118,
    runes: 8600,
    armor: 165,
    isRare: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 40 },
    drops: [
      { id: "ainsel_shard_spear", chance: 0.7 },
      { id: "ainsel_starmap", chance: 0.45 },
    ],
    onTurnAction: (enemy) => {
      if (!enemy.isCharging) {
        enemy.isCharging = true;
        return {
          msg: "L'astre attire les runes vers un point de rupture...",
          skipAttack: true,
        };
      }
      enemy.isCharging = false;
      return { msg: "Explosion gravitationnelle !", dmgMult: 2.2 };
    },
  },

  dragonkin_ainsel: {
    name: "Soldat Draconide d'Ainsel",
    hp: 16500,
    atk: 240,
    runes: 68000,
    isBoss: true,
    armor: 240,
    specificStats: { attacksPerTurn: 2, splashDamage: 80 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.45,
    flavorTextPhase2:
      "Le soldat draconide arrache la glace du lit de la rivière.",
    effectsPhase2: { id: "FROSTBITE", duration: 3, chance: 0.45 },
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.25 },
  },

  // --- DEEPROOT DEPTHS ---
  root_shambler: {
    name: "Errant Racinaire",
    hp: 880,
    atk: 88,
    runes: 1900,
    armor: 170,
    onHitEffect: { id: "STUN", duration: 1, chance: 0.12 },
  },

  root_guardian: {
    name: "Gardien Sépulcral",
    hp: 1200,
    atk: 98,
    runes: 2150,
    armor: 210,
    groupCombinations: [
      { size: 1, chance: 0.75 },
      { size: 2, chance: 0.25 },
    ],
  },

  siluria_remnant: {
    name: "Vestige de Siluria",
    hp: 2500,
    atk: 140,
    runes: 9200,
    armor: 240,
    isRare: true,
    drops: [
      { id: "rootbound_maul", chance: 0.55 },
      { id: "prince_bark_talisman", chance: 0.55 },
    ],
    onHitEffect: { id: "STUN", duration: 2, chance: 0.2 },
  },

  deathblight_basilisk: {
    name: "Basilic de Mort",
    hp: 1800,
    atk: 110,
    runes: 8100,
    armor: 120,
    isRare: true,
    specificStats: { attacksPerTurn: 3 },
    drops: [
      { id: "rootbound_plate", chance: 0.7 },
      { id: "prince_bark_talisman", chance: 0.4 },
    ],
    onHitEffect: { id: "BURN", duration: 2, chance: 0.2 },
  },

  fia_champion_echo: {
    name: "Reflet du Champion de Fia",
    hp: 17500,
    atk: 225,
    runes: 72000,
    isBoss: true,
    armor: 260,
    specificStats: { attacksPerTurn: 2, critChance: 0.12, critDamage: 1.8 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "Le champion se drape de racines et de souvenirs ensevelis.",
    onTurnAction: (enemy) => {
      if (enemy.hp < enemy.maxHp * 0.35 && !enemy.usedRootHeal) {
        enemy.usedRootHeal = true;
        return {
          msg: "Les racines s'abreuvent de la mort et le reforgent.",
          healAmount: 1400,
        };
      }
      return {};
    },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.25 },
  },

  // --- LAKE OF ROT ---
  rot_pest: {
    name: "Serviteur Pestiféré",
    hp: 980,
    atk: 105,
    runes: 2200,
    armor: 150,
    groupCombinations: [
      { size: 2, chance: 0.7 },
      { size: 3, chance: 0.3 },
    ],
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.3 },
  },

  scarlet_monk: {
    name: "Moine Ecarlate",
    hp: 1300,
    atk: 118,
    runes: 2500,
    armor: 175,
    onHitEffect: { id: "POISON", duration: 2, chance: 0.35 },
  },

  cleanrot_revenant: {
    name: "Revenant Putréchevalier",
    hp: 2600,
    atk: 148,
    runes: 9800,
    armor: 210,
    isRare: true,
    specificStats: { attacksPerTurn: 3 },
    drops: [
      { id: "rotbloom_blade", chance: 0.55 },
      { id: "rotbloom_idol", chance: 0.55 },
    ],
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.45 },
  },

  ulcerated_rot_spirit: {
    name: "Esprit Putride Ulcéré",
    hp: 3200,
    atk: 165,
    runes: 11000,
    armor: 180,
    isRare: true,
    specificStats: { attacksPerTurn: 2, splashDamage: 60 },
    drops: [
      { id: "rotbloom_mail", chance: 0.7 },
      { id: "rotbloom_blade", chance: 0.45 },
    ],
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.45 },
  },

  astel_bud: {
    name: "Bourgeon d'Astel",
    hp: 20500,
    atk: 285,
    runes: 86000,
    isBoss: true,
    armor: 230,
    specificStats: { attacksPerTurn: 2, splashDamage: 120, critChance: 0.12 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.45,
    flavorTextPhase2:
      "Le bourgeon cosmique éclot et inonde le lac de runes affamées.",
    effectsPhase2: { id: "SCARLET_ROT", duration: 3, chance: 0.55 },
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.35 },
  },
  ...V21_MONSTERS,
  ...ENDGAME_MONSTERS,
  ...TRIAL_MONSTERS,
};

// Chaque monstre porte desormais sa propre cle. Les instances de combat sont
// des copies du template (spread) : sans ce marquage elles perdaient leur
// identifiant, et le retrouver par le nom est impossible — plusieurs monstres
// partagent le meme (deux "Loup Affame", deux "Troll des Collines", deux
// "Chimere Leonine").
Object.entries(MONSTERS).forEach(([id, monster]) => {
  monster.id = id;
});
