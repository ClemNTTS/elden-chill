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
    hp: 142,
    atk: 16,
    runes: 333,
    isRare: true,
    drops: [
      { id: "iron_sword", chance: 0.95 },
      { ashId: "beginer_tarnished_heal", chance: 0.8, unique: true },
    ],
  },
  troll1_boss: {
    name: "Troll des Collines",
    hp: 217,
    atk: 20,
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
    hp: 75,
    atk: 10,
    runes: 170,
  },
  kaiden_sellsword: {
    name: "Mercenaire de Kaiden",
    hp: 35,
    atk: 28,
    runes: 155,
  },
  troll1_duo: {
    name: "Troll des Collines",
    hp: 150,
    atk: 20,
    runes: 450,
    isRare: true,
    hasSecondPhase: true,
    isInSecondPhase: false,
    thresholdForPhase2: 0.5,
    dmgMultPhase2: 2,
    flavorTextPhase2: "Le Troll, fou de rage, sort sont épée !",
    groupCombinations: [{ size: 2, chance: 1.0 }],
    drops: [
      { id: "troll_necklace", chance: 0.8 },
      { id: "leather_boots", chance: 0.2 },
    ],
  },
  runeBear1: {
    name: "Ours Runique",
    hp: 294,
    atk: 30,
    runes: 850,
    isRare: true,
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.4 },
    groupCombinations: [
      { size: 1, chance: 0.9 },
      { size: 2, chance: 0.1 },
      { ashId: "bloody_slash", chance: 0.05, unique: true },
    ],
    drops: [
      { id: "styptic_boluses", chance: 0.2 },
      { id: "leather_vest", chance: 0.8 },
    ],
  },
  bloodhound_knight_darriwil: {
    name: "Chevalier Limier Darriwil",
    hp: 300, //2x health compared to ingame
    atk: 40,
    runes: 975,
    isBoss: true,
    onHitEffect: { id: "BLEED", duration: 5, chance: 0.8 },
  },
  // === LIMGRAVE NORTH===
  white_wolf: {
    name: "Loup Blanc",
    hp: 40,
    atk: 30,
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
    hp: 405,
    atk: 80,
    runes: 600,
    isRare: true,
    onHitEffect: { id: "BLEED", duration: 1, chance: 1.0 },
    drops: [{ id: "knight_greatsword", chance: 0.95 }],
  },
  crucible_knight1: {
    name: "Chevalier du Creuset",
    hp: 280,
    atk: 40,
    runes: 440,
    dodgeChance: 0.333,
    isRare: true,
    drops: [
      { id: "briar_armor", chance: 0.15 },
      { id: "styptic_boluses", chance: 0.8 },
      { ashId: "storm_stomp", chance: 0.05, unique: true },
    ],
  },
  margit: {
    name: "Margit le Déchu",
    hp: 420,
    atk: 60,
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
      { id: "astronomer_staff", chance: 0.5 },
      { id: "scholars_ring", chance: 0.5 },
    ],
  },
  limgrave_dragon: {
    name: "Dragon volant Agheel",
    hp: 1600,
    atk: 90,
    runes: 2500,
    isBoss: true,
    onHitEffect: { id: "BURN", duration: 2, chance: 0.5 },
  },
  // === WEEPING PENINSULA ===
  servant_poison: {
    name: "Servante empoisonée",
    hp: 122,
    atk: 25,
    onHitEffect: { id: "POISON", duration: 2, chance: 0.8 },
    runes: 153,
    groupCombinations: [
      { size: 1, chance: 0.5 },
      { size: 2, chance: 0.5 },
    ],
  },

  servant_poison_companion: {
    name: "Servante empoisonée",
    rune: 113,
    hp: 50,
    atk: 12,
    onHitEffect: { id: "POISON", duration: 2, chance: 0.8 },
  },

  half_human_queen: {
    name: "Reine Demi-Humaine",
    hp: 824,
    atk: 35,
    runes: 1005,
    isRare: true,
    companion: ["servant_poison_companion"],
    drops: [
      {
        id: "queen_staff",
        chance: 0.5,
      },
    ],
  },

  // === CAELID WEST===
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
    hp: 9572,
    atk: 45,
    runes: 3000,
    isBoss: true,
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
