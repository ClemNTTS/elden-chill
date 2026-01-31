/*regles de bases que je vais tester
hp d'origine divisé par 10 pour les mobs. pour les normaux, un multiplicateur de 1 a 2 sure la vie et le drop de runes
mobs normaux ont un drop de rune de base egal au minimum in game. les Rares ont un tier. Les boss sont divisé par 10. Exception si le monstre n est normalement pas un boss, tiraité au cas par cas.
*/
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
      { id: "keen_dagger", chance: 0.45 },
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
    flavorTextPhase2: "Le Troll, fou de rage, sort sont épée !",
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
    hp: 30,
    atk: 28,
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
      { id: "troll_necklace", chance: 0.35 },
      { id: "leather_boots", chance: 0.45 },
      { id: "kama", chance: 0.2 },
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
      { id: "styptic_boluses", chance: 0.2 },
      { id: "leather_vest", chance: 0.6 },
      { id: "bloodhound_fang", chance: 0.2 },
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
    hp: 245,
    atk: 35,
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
    dodgeChance: 0.333,
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
      { id: "astronomer_staff", chance: 0.65 },
      { id: "scholars_ring", chance: 0.5 },
    ],
  },
  limgrave_dragon: {
    name: "Dragon volant Agheel",
    hp: 980,
    atk: 60,
    runes: 2500,
    isBoss: true,
    onHitEffect: { id: "BURN", duration: 2, chance: 0.5 },
  },
  // === WEEPING PENINSULA ===
  servant_poison: {
    name: "Servante empoisonée",
    hp: 55,
    atk: 20,
    onHitEffect: { id: "POISON", duration: 2, chance: 0.5 },
    runes: 153,
    groupCombinations: [
      { size: 1, chance: 0.5 },
      { size: 2, chance: 0.5 },
    ],
  },

  bats: {
    name: "Chauve-souris",
    hp: 22,
    atk: 8,
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
    hp: 90,
    atk: 20,
    runes: 250,
    onHitEffect: { id: "STUN", duration: 2, chance: 0.15 },
  },

  servant_poison_companion: {
    name: "Servante empoisonée",
    runes: 70,
    hp: 50,
    atk: 13,
    onHitEffect: { id: "POISON", duration: 2, chance: 0.8 },
    groupCombinations: [
      { size: 2, chance: 0.5 },
      { size: 3, chance: 0.5 },
    ],
  },

  half_human_queen: {
    name: "Reine Demi-Humaine",
    hp: 324,
    atk: 35,
    runes: 605,
    isRare: true,
    companion: ["servant_poison_companion"],
    companionCount: 3,
    drops: [
      {
        id: "queen_staff",
        chance: 0.5,
      },
    ],
  },

  nighth_cavalery: {
    name: "Cavalier de la Nuit",
    hp: 380,
    atk: 55,
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
    hp: 950,
    atk: 75,
    armor: 125,
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
    hp: 120,
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
    hp: 65,
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
      { id: "pumkin_helm", chance: 0.6 },
      { id: "grafted_blade_greatsword", chance: 0.02 },
    ],
  },

  misbegotten_leonine: {
    name: "Chimère Léonine",
    hp: 1100,
    atk: 45,
    runes: 3800,
    isBoss: true,
    armor: 115,
    dodgeChance: 0.25,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.25 },

    hasSecondPhase: true,
    thresholdForPhase2: 0.4,
    dmgMultPhase2: 1.4,
    flavorTextPhase2:
      "La Chimère pousse un rugissement bestial, sa soif de vengeance décuple sa force !",
  },

  // === ENTER STORMWIND CASTLE ===
  exile_soldier1: {
    name: "Soldat d'Exil",
    hp: 110,
    atk: 25,
    armor: 120,
    runes: 210,
    groupCombinations: [
      { size: 1, chance: 0.6 },
      { size: 2, chance: 0.4 },
    ],
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.4 },
  },
  exile_soldier2: {
    name: "Soldat d'Exil",
    hp: 100,
    atk: 25,
    armor: 110,
    runes: 210,
    groupCombinations: [
      { size: 1, chance: 0.6 },
      { size: 2, chance: 0.4 },
    ],
    onHitEffect: { id: "BURN", duration: 3, chance: 0.4 },
  },
  exile_soldier3: {
    name: "Soldat d'Exil",
    hp: 120,
    atk: 25,
    armor: 130,
    runes: 210,
    groupCombinations: [
      { size: 1, chance: 0.6 },
      { size: 2, chance: 0.4 },
    ],
  },
  banished_knight: {
    name: "Chevalier Banni",
    hp: 450,
    atk: 50,
    runes: 600,
    isRare: true,
    armor: 135,
    drops: [
      { id: "hunter_cap", chance: 0.4 },
      { id: "alchimist_suit", chance: 0.4 },
      { ashId: "storm_stomp", chance: 0.025, unique: true },
    ],
    onHitEffect: { id: "STUN", duration: 1, chance: 0.1 },
  },

  grafted_scion: {
    name: "Rejeton Greffé",
    hp: 1200,
    atk: 35,
    runes: 2200,
    isBoss: true,
    armor: 110,
    hasSecondPhase: true,
    isInSecondPhase: false,
    thresholdForPhase2: 0.5,
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
    atk: 32,
    runes: 180,
    dodgeChance: 0.3,
    groupCombinations: [
      { size: 2, chance: 0.4 },
      { size: 3, chance: 0.6 },
    ],
    onHitEffect: { id: "BLEED", duration: 1, chance: 0.3 },
  },

  godrick: {
    name: "Godrick le Greffé",
    hp: 1800,
    atk: 85,
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
    atk: 32,
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
    hp: 340,
    atk: 15,
    runes: 300,
    armor: 250,
    isRare: true,
    passiveStatus: "THORNS",
    onHitEffect: { id: "POISON", duration: 3, chance: 0.2 },
    drops: [
      { id: "crystal_shell_mail", chance: 0.15 },
      { id: "snail_slime_mantle", chance: 0.15 },
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
      { id: "stormhawk_feather", chance: 0.15 },
      { id: "winged_sword_insignia", chance: 0.35 },
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

  // === LIURNIA===
  clayman: { name: "Homme d'Argile", hp: 250, atk: 35, runes: 400 },
  sorcerer: { name: "Sorcier de Raya Lucaria", hp: 180, atk: 55, runes: 550 },
  rennala: {
    name: "Rennala, Reine de la Pleine Lune",
    hp: 3200,
    atk: 80,
    runes: 15000,
    isBoss: true,
  },
};
