export const V21_MONSTERS = {
  altus_praetor_guard: {
    name: "Gardien prétorien d'Altus",
    hp: 1800,
    atk: 148,
    armor: 180,
    runes: 9800,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.18 },
  },
  altus_chariot_knight: {
    name: "Chevalier du char d'Altus",
    hp: 2600,
    atk: 188,
    armor: 210,
    runes: 18500,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    drops: [
      { id: "altus_exec_blade", chance: 0.45 },
      { id: "altus_exec_cloak", chance: 0.55 },
      { id: "talisman_execution", chance: 0.35 },
    ],
    onTurnAction: (enemy) => {
      if (!enemy._charged) {
        enemy._charged = true;
        return {
          msg: "Le chevalier se met en joue pour une charge d'exécution.",
          skipAttack: true,
        };
      }
      enemy._charged = false;
      return { dmgMult: 1.65, msg: "La charge d'Altus fend l'air." };
    },
  },

  gelmir_hexmage: {
    name: "Hexer de Gelmir",
    hp: 3200,
    atk: 188,
    armor: 165,
    runes: 24000,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BURN", duration: 2, chance: 0.25 },
  },
  serpent_inquisitor: {
    name: "Inquisiteur du serpent",
    hp: 4050,
    atk: 212,
    armor: 190,
    runes: 31500,
    isRare: true,
    specificStats: { attacksPerTurn: 2, critChance: 0.08 },
    drops: [
      { id: "gelmir_dragon_fang", chance: 0.4 },
      { id: "gelmir_dragon_hide", chance: 0.55 },
      { ashId: "dragonstorm_howl", chance: 0.35 },
    ],
    onTurnAction: (enemy) => {
      if (!enemy._moltenSkin) {
        enemy._moltenSkin = true;
        enemy.armor += 30;
        return {
          msg: "Le serpent inquisitorial se couvre d'un vernis de lave.",
          skipAttack: true,
        };
      }
      enemy._moltenSkin = false;
      enemy.armor = Math.max(100, enemy.armor - 30);
      return {
        dmgMult: 1.4,
        msg: "Le vernis craque et libère une morsure en fusion.",
      };
    },
  },
  praetor_fragment: {
    name: "Fragment du Prêteur",
    hp: 19883,
    atk: 187,
    armor: 225,
    runes: 132000,
    isBoss: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BURN", duration: 2, chance: 0.35 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "Le fragment ouvre la gueule du volcan et vomit des éclats draconiques.",
    effectsPhase2: { id: "BURN", duration: 3, chance: 0.55 },
    onTurnAction: (enemy) => {
      enemy._phaseCounter = (enemy._phaseCounter || 0) + 1;
      if (enemy._phaseCounter % 3 === 1) {
        return {
          msg: "Le fragment canalise une gerbe volcanique.",
          skipAttack: true,
        };
      }
      if (enemy._phaseCounter % 3 === 2) {
        return { dmgMult: 1.55, msg: "Le magma jaillit dans un cône étroit." };
      }
      return {
        dmgMult: 1.15,
        healAmount: 420,
        msg: "Le fragment dévore la lave et cicatrise son noyau.",
      };
    },
  },

  giant_fire_disciple: {
    name: "Disciple des flammes géantes",
    hp: 4700,
    atk: 238,
    armor: 200,
    runes: 36000,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.22 },
  },
  icy_colossus: {
    name: "Colosse du blanc néant",
    hp: 6200,
    atk: 282,
    armor: 260,
    runes: 47000,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    drops: [
      { id: "giant_breaker_maul", chance: 0.42 },
      { id: "arena_colossus_plate", chance: 0.52 },
      { ashId: "colossus_roar", chance: 0.34 },
    ],
    onTurnAction: (enemy) => {
      enemy._stance = (enemy._stance || 0) + 1;
      if (enemy._stance % 2 === 1) {
        enemy.armor += 40;
        return {
          msg: "Le colosse enfonce ses talons et verrouille sa posture.",
          skipAttack: true,
        };
      }
      enemy.armor = Math.max(160, enemy.armor - 40);
      return {
        dmgMult: 1.8,
        msg: "Le colosse libère un coup de masse qui fend la neige.",
      };
    },
  },
  fire_giant_shard: {
    name: "Éclat du Géant de feu",
    hp: 35200,
    atk: 368,
    armor: 240,
    runes: 188000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.38 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "L'éclat déchire la neige et lève un bras de braise antique.",
    effectsPhase2: { id: "BURN", duration: 4, chance: 0.55 },
    onTurnAction: (enemy) => {
      enemy._pattern = (enemy._pattern || 0) + 1;
      if (enemy._pattern % 3 === 1) {
        return {
          msg: "L'éclat écrase la neige et prépare un lancer incandescent.",
          skipAttack: true,
        };
      }
      if (enemy._pattern % 3 === 2) {
        return {
          dmgMult: 2.1,
          msg: "Le bras du géant catapulte un astre de braise.",
        };
      }
      enemy.armor += 25;
      return {
        dmgMult: 1.15,
        msg: "Le géant s'ancre dans la glace et gagne en inertie.",
      };
    },
  },

  azula_beast_lord: {
    name: "Seigneur bestial d'Azula",
    hp: 7200,
    atk: 308,
    armor: 220,
    runes: 52000,
    specificStats: { attacksPerTurn: 3 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.24 },
  },
  azula_black_priest: {
    name: "Prêtre noir de Farum",
    hp: 5900,
    atk: 282,
    armor: 210,
    runes: 61000,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    drops: [
      { id: "azula_black_censer", chance: 0.38 },
      { id: "azula_black_veil", chance: 0.5 },
      { ashId: "rotveil_litany", chance: 0.38 },
    ],
    onTurnAction: (enemy) => {
      enemy._prayer = (enemy._prayer || 0) + 1;
      if (enemy._prayer % 3 === 1) {
        return {
          msg: "Le prêtre noir ouvre un office de cendres et déforme l'air.",
          skipAttack: true,
        };
      }
      if (enemy._prayer % 3 === 2) {
        return {
          dmgMult: 1.35,
          healAmount: 320,
          msg: "Le rite noir détourne votre souffle et nourrit le prêtre.",
        };
      }
      return { dmgMult: 1.6, msg: "La liturgie bascule en exécution." };
    },
  },
  azula_tempest_avatar: {
    name: "Avatar des tempêtes d'Azula",
    hp: 44800,
    atk: 392,
    armor: 255,
    runes: 255000,
    isBoss: true,
    specificStats: { attacksPerTurn: 2, critChance: 0.12 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.25 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.45,
    flavorTextPhase2:
      "L'avatar se fracture et la tempête révèle un cœur de relique noire.",
    effectsPhase2: { id: "SCARLET_ROT", duration: 2, chance: 0.35 },
    onTurnAction: (enemy) => {
      enemy._stormCounter = (enemy._stormCounter || 0) + 1;
      if (enemy._stormCounter % 4 === 1) {
        return {
          msg: "L'avatar compresse la foudre autour de sa relique.",
          skipAttack: true,
        };
      }
      if (enemy._stormCounter % 4 === 2) {
        return {
          dmgMult: 1.4,
          msg: "Une rafale entaille tout le champ de ruines.",
        };
      }
      if (enemy._stormCounter % 4 === 3) {
        return {
          dmgMult: 2.05,
          msg: "La relique explose dans une descente céleste.",
        };
      }
      enemy.armor += 35;
      return {
        msg: "Les pierres d'Azula tournent autour de l'avatar et le reforgent.",
        skipAttack: true,
      };
    },
  },
};
