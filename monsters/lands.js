// Bestiaire de la version complete : les 14 biomes ajoutes pour terminer la
// trame principale et ouvrir trois zones annexes.
//
// Les statistiques ne sont pas ecrites a la main. Elles sont interpolees sur la
// courbe des 32 biomes d'origine, qui va de 14 pv (Necrolimbe Ouest) a 7200
// (Farum Azula), soit environ x1,22 par biome. Les ratios releves sur cette
// meme courbe sont reconduits :
//
//     rare   = standard x1,2      boss   = standard x6,8
//     atkStd = pv x0,052          atkBoss = atkStd x1,35
//     runes  = pv x7,7 (std), x7,6 (rare), x5,3 (boss)
//
// Ecrire ces nombres a l'instinct sur quatorze biomes aurait garanti des
// ruptures de difficulte ; les deriver garantit l'inverse.

export const LANDS_MONSTERS = {
  /* ============ VILLAGE DE DOMINULA (ch. VI) ============ */
  dominula_celebrant: {
    name: "Celebrant de Dominula",
    hp: 1150,
    atk: 60,
    armor: 190,
    runes: 8900,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "MADNESS", duration: 2, chance: 0.28 },
  },
  dominula_drummer: {
    name: "Tambour du festival",
    hp: 1150,
    atk: 58,
    armor: 175,
    runes: 8900,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "MADNESS", duration: 3, chance: 0.34 },
    onTurnAction: (enemy) => {
      // Il ne frappe pas : il accelere la cadence des autres. Le tuer en
      // premier est le bon reflexe, et c'est tout le propos du biome.
      enemy._beat = (enemy._beat || 0) + 1;
      if (enemy._beat % 2 === 1) {
        return {
          msg: "Le tambour redouble : la danse s'emballe.",
          skipAttack: true,
        };
      }
      return { dmgMult: 1.5, msg: "Le tambour frappe en mesure." };
    },
  },
  dominula_maypole_dancer: {
    name: "Danseuse du mat",
    hp: 1400,
    atk: 67,
    armor: 205,
    runes: 10600,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "MADNESS", duration: 3, chance: 0.4 },
    drops: [
      { id: "celebrant_sickle", chance: 0.34 },
      { id: "madding_charm", chance: 0.3 },
    ],
  },
  godskin_apostle: {
    name: "Apotre Godskin",
    hp: 8000,
    atk: 81,
    armor: 230,
    runes: 42000,
    isBoss: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.32 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "L'apotre deroule son corps comme une lanière et cesse de viser.",
    effectsPhase2: { id: "MADNESS", duration: 4, chance: 0.45 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return {
          dmgMult: 2.0,
          msg: "L'apotre s'etire sur toute la place et fauche.",
        };
      }
      return { msg: "L'apotre avance en glissant, faux basse." };
    },
  },

  /* ============ CHATEAU OMBRAGE (ch. VI) ============ */
  shaded_sentry: {
    name: "Sentinelle ombragee",
    hp: 1485,
    atk: 77,
    armor: 240,
    runes: 11400,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "POISON", duration: 3, chance: 0.36 },
  },
  shaded_poison_hound: {
    name: "Limier bilieux",
    hp: 1400,
    atk: 80,
    armor: 150,
    runes: 11000,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "POISON", duration: 2, chance: 0.3 },
  },
  shaded_briar_scion: {
    name: "Rejeton de la Ronce",
    hp: 1800,
    atk: 86,
    armor: 255,
    runes: 13700,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "THORNS", duration: 3, chance: 0.4 },
    drops: [
      { id: "briar_greatsword", chance: 0.32 },
      { id: "shaded_pauldron", chance: 0.36 },
    ],
    onTurnAction: (enemy) => {
      enemy._thorn = (enemy._thorn || 0) + 1;
      if (enemy._thorn % 3 === 0) {
        enemy.armor += 30;
        return {
          msg: "Les ronces se referment sur son armure.",
          skipAttack: true,
        };
      }
      return {
        dmgMult: 1.35,
        msg: "Le rejeton fouette de ses lianes barbelees.",
      };
    },
  },
  elemer_briar: {
    name: "Elemer de la Ronce",
    hp: 10000,
    atk: 104,
    armor: 265,
    runes: 53000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "THORNS", duration: 3, chance: 0.4 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.45,
    flavorTextPhase2: "Elemer lache son epee, qui continue de tourner seule.",
    effectsPhase2: { id: "BLEED", duration: 4, chance: 0.5 },
    onTurnAction: (enemy) => {
      // Il se teleporte au lieu de frapper : un tour sur trois est gratuit
      // pour le joueur, mais le suivant fait mal.
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 1) {
        return {
          msg: "Elemer disparait dans un tourbillon de ronces.",
          skipAttack: true,
        };
      }
      if (enemy._p % 3 === 2) {
        return {
          dmgMult: 2.2,
          msg: "Il reapparait derriere vous, lame en avant.",
        };
      }
      return { msg: "Elemer croise sa lame et la vôtre." };
    },
  },

  /* ============ MANOIR DU VOLCAN (ch. VII) ============ */
  volcano_manservant: {
    name: "Serviteur du Manoir",
    hp: 862,
    atk: 46,
    armor: 205,
    runes: 18500,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.34 },
  },
  volcano_abductor: {
    name: "Vierge Ravisseuse",
    hp: 934,
    atk: 43,
    armor: 245,
    runes: 20000,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.3 },
    onTurnAction: (enemy) => {
      enemy._grip = (enemy._grip || 0) + 1;
      if (enemy._grip % 4 === 0) {
        return {
          dmgMult: 2.4,
          msg: "La Ravisseuse vous enserre et vous broie.",
        };
      }
      return { msg: "La Ravisseuse tourne sur ses roues." };
    },
  },
  volcano_iron_virgin: {
    name: "Vierge de Fer",
    hp: 3741,
    atk: 181,
    armor: 280,
    runes: 22000,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BLEED", duration: 4, chance: 0.42 },
    drops: [
      { id: "manor_contract_seal", chance: 0.34 },
      { id: "magma_whip", chance: 0.3 },
    ],
  },
  godskin_noble: {
    comportementsPhase2: ["regeneration"],
    phaseRegen: 0.05,
    name: "Noble Godskin",
    hp: 9196,
    atk: 95,
    armor: 223,
    runes: 87000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.36 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Le Noble se gonfle et cesse de toucher le sol.",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.3 },
    /*
     * Il roule : un tour d'elan, puis un ecrasement.
     *
     * L'ancienne version prenait DEUX tours d'elan pour un cycle de quatre.
     * Sa cadence effective tombait a 0,95 — moins qu'un boss sans mecanique du
     * tout, le plus faible des douze boss scriptes du jeu. Un joueur de niveau
     * 185 terminait le Manoir du Volcan a 95% de ses points de vie et disait,
     * a juste titre : « le boss est faible, ou alors je n'ai pas compris son
     * action. »
     *
     * Les deux a la fois. Une fenetre de deux tours sans danger n'est pas une
     * fenetre, c'est une pause : il n'y a rien a esquiver, rien a preparer, et
     * le coup qui suit ne rattrape pas ce qui n'a pas ete inflige. Un tour
     * d'elan sur trois porte la cadence a 1,33, dans la bande de ses pairs
     * (Rykard 1,27, Chateau Sol 1,07, Farum Azula 1,25), et rend l'elan lisible
     * parce qu'il est suivi de l'ecrasement au tour d'apres, pas deux plus loin.
     */
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 1) {
        return {
          msg: "Le Noble se replie en boule et prend de la vitesse.",
          skipAttack: true,
        };
      }
      if (enemy._p % 3 === 2) {
        return {
          dmgMult: 3,
          msg: "La masse du Noble s'abat de tout son poids.",
        };
      }
      return { msg: "Le Noble se redresse en soufflant." };
    },
  },

  /* ============ ANTRE DE RYKARD (ch. VII) ============ */
  rykard_serpent_spawn: {
    name: "Rejeton serpentin",
    hp: 1057,
    atk: 55,
    armor: 210,
    runes: 23000,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.38 },
  },
  rykard_devoured: {
    name: "Devore du banquet",
    hp: 1098,
    atk: 52,
    armor: 190,
    runes: 23800,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "MADNESS", duration: 3, chance: 0.32 },
  },
  rykard_blasphemous_priest: {
    name: "Pretre blasphematoire",
    hp: 3456,
    atk: 166,
    armor: 250,
    runes: 27400,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BURN", duration: 4, chance: 0.44 },
    drops: [
      { id: "blasphemous_chalice", chance: 0.34 },
      { id: "serpent_scale_mail", chance: 0.32 },
    ],
  },
  rykard_lord_blasphemy: {
    comportementsPhase2: ["drain", "malediction"],
    phaseMalediction: { id: "BURN", duration: 3 },
    name: "Rykard, Seigneur de la Blasphemie",
    hp: 6626,
    atk: 67,
    armor: 229,
    runes: 109000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BURN", duration: 4, chance: 0.46 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Le serpent recrache Rykard jusqu'a la taille. Il rit.",
    effectsPhase2: { id: "BURN", duration: 5, chance: 0.6 },
    onTurnAction: (enemy) => {
      // Il se soigne massivement : le seul boss du jeu qu'un build trop lent
      // ne peut pas tuer, quelle que soit sa patience.
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 4 === 0) {
        const heal = Math.floor(enemy.maxHp * 0.08);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        return { msg: `Le serpent devore un fidele et regagne ${heal} PV.` };
      }
      if (enemy._p % 4 === 2) {
        return {
          dmgMult: 2.1,
          msg: "Une vague de magma remonte le long de la fosse.",
        };
      }
      return { msg: "Rykard fait tournoyer le Mangeur de Dieux." };
    },
  },

  /* ============ TOUR DIVINE (ch. VIII) ============ */
  divine_tower_watch: {
    name: "Garde de la Tour",
    hp: 2178,
    atk: 113,
    armor: 250,
    runes: 30700,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.24 },
  },
  divine_tower_oracle: {
    name: "Oracle scelle",
    hp: 2075,
    atk: 116,
    armor: 195,
    runes: 29300,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "MADNESS", duration: 3, chance: 0.36 },
  },
  divine_tower_gargoyle: {
    name: "Gargouille de la Tour",
    hp: 4032,
    atk: 194,
    armor: 285,
    runes: 36500,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "POISON", duration: 3, chance: 0.4 },
    drops: [
      { id: "tower_seal_ring", chance: 0.32 },
      { id: "gargoyle_halberd", chance: 0.3 },
    ],
  },
  divine_tower_keeper: {
    name: "Gardien de la Tour Divine",
    hp: 18164,
    atk: 188,
    armor: 270,
    runes: 143000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.3 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Le sceau cede. La Tour elle-meme se met a resonner.",
    effectsPhase2: { id: "MADNESS", duration: 4, chance: 0.5 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 1) {
        enemy.armor += 45;
        return {
          msg: "Le Gardien plante sa lance et se scelle.",
          skipAttack: true,
        };
      }
      enemy.armor = Math.max(270, enemy.armor - 45);
      return { dmgMult: 1.7, msg: "Le Gardien libere une onde de sceau." };
    },
  },

  /* ============ CHATEAU SOL (ch. VIII) ============ */
  sol_banished_knight: {
    name: "Chevalier banni de Sol",
    hp: 1320,
    atk: 69,
    armor: 275,
    runes: 33900,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.34 },
  },
  sol_night_stalker: {
    name: "Rodeur de la nuit",
    hp: 1260,
    atk: 72,
    armor: 190,
    runes: 32300,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "SLEEP", duration: 2, chance: 0.26 },
  },
  sol_eochaid_wraith: {
    name: "Spectre d'Eochaid",
    hp: 3445,
    atk: 166,
    armor: 260,
    runes: 40300,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "SLEEP", duration: 3, chance: 0.38 },
    drops: [
      { id: "eochaid_dancing_blade", chance: 0.32 },
      { id: "night_cloak", chance: 0.34 },
    ],
  },
  commander_niall: {
    name: "Commandant Niall",
    hp: 12000,
    atk: 124,
    armor: 280,
    runes: 159000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.4 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.6,
    flavorTextPhase2:
      "Niall congedie ses spectres et avance seul, sans sa jambe.",
    effectsPhase2: { id: "SLEEP", duration: 2, chance: 0.3 },
    onTurnAction: (enemy) => {
      // Il invoque : deux tours ou il ne frappe pas mais gagne de l'armure,
      // puis une charge. La nuit eternelle du biome rend l'esquive inutile,
      // il faut donc encaisser ou tuer vite.
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 4 === 1) {
        enemy.armor += 40;
        return {
          msg: "Niall appelle deux spectres a ses cotes.",
          skipAttack: true,
        };
      }
      if (enemy._p % 4 === 3) {
        enemy.armor = Math.max(280, enemy.armor - 40);
        return {
          dmgMult: 2.3,
          msg: "Niall charge, hallebarde chargee de givre.",
        };
      }
      return { msg: "Niall progresse d'un pas lourd." };
    },
  },

  /* ============ CATACOMBES DES GEANTS (ch. VIII) ============ */
  catacomb_ember_shade: {
    name: "Ombre des braises",
    hp: 2134,
    atk: 110,
    armor: 200,
    runes: 35400,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.4 },
  },
  catacomb_grave_giant: {
    name: "Geant des tombes",
    hp: 2272,
    atk: 107,
    armor: 265,
    runes: 37700,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.28 },
  },
  catacomb_ancient_hero: {
    name: "Heros ancien de Zamor",
    hp: 8525,
    atk: 415,
    armor: 275,
    runes: 41800,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.42 },
    drops: [
      { id: "zamor_ice_curved", chance: 0.32 },
      { id: "giant_crusher_plate", chance: 0.3 },
    ],
  },
  catacomb_burnt_spirit: {
    name: "Esprit d'Arbre calcine",
    hp: 13406,
    atk: 138,
    armor: 250,
    runes: 167000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BURN", duration: 4, chance: 0.48 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "L'ecorce se fend et laisse voir le brasier qu'elle contenait.",
    effectsPhase2: { id: "BURN", duration: 5, chance: 0.62 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return {
          dmgMult: 2.4,
          msg: "L'esprit s'effondre sur vous de toute sa hauteur.",
        };
      }
      return { msg: "L'esprit rampe le long de la voute." };
    },
  },

  /* ============ ELPHAEL (ch. IX) ============ */
  elphael_cleanrot_knight: {
    name: "Chevalier de la Purge",
    hp: 2356,
    atk: 124,
    armor: 285,
    runes: 55800,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.42 },
  },
  elphael_rot_swarm: {
    name: "Nuee putride",
    hp: 2242,
    atk: 125,
    armor: 175,
    runes: 53100,
    specificStats: { attacksPerTurn: 3 },
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.3 },
  },
  elphael_rot_dog: {
    name: "Chien de la Purge",
    hp: 7308,
    atk: 354,
    armor: 255,
    runes: 66100,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "SCARLET_ROT", duration: 4, chance: 0.5 },
    drops: [
      { id: "cleanrot_spear", chance: 0.32 },
      { id: "haligtree_crest_shield", chance: 0.3 },
    ],
  },
  malenia_blade: {
    name: "Malenia, Lame de Miquella",
    hp: 12555,
    atk: 126,
    armor: 275,
    runes: 262000,
    isBoss: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "SCARLET_ROT", duration: 4, chance: 0.5 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "Elle se releve en fleur. « Je suis Malenia, Lame de Miquella. »",
    effectsPhase2: { id: "SCARLET_ROT", duration: 5, chance: 0.7 },
    onTurnAction: (enemy) => {
      // Elle se soigne de ce qu'elle inflige : la seule facon de la contenir
      // est de ne pas se faire toucher, donc l'esquive et l'armure comptent
      // enfin autant que les degats.
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        const heal = Math.floor(enemy.maxHp * 0.05);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        return {
          dmgMult: 1.6,
          msg: `Danse de l'Eau : chaque coup porte la soigne (+${heal} PV).`,
        };
      }
      return { msg: "Malenia glisse d'un pied sur l'autre, lame basse." };
    },
  },

  /* ============ FARUM AZULA, ABIME (ch. IX) ============ */
  azula_dragon_warrior: {
    name: "Guerrier draconique",
    hp: 2163,
    atk: 112,
    armor: 275,
    runes: 67000,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.3 },
  },
  azula_storm_hawk: {
    name: "Faucon des tempetes",
    hp: 2038,
    atk: 117,
    armor: 195,
    runes: 63100,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.36 },
  },
  azula_maliketh: {
    name: "Maliketh, Lame de Mort",
    hp: 4682,
    atk: 227,
    armor: 270,
    runes: 79400,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "DEATH_BLIGHT", duration: 3, chance: 0.4 },
    drops: [
      { id: "blade_of_destined_death", chance: 0.3 },
      { id: "black_beast_mantle", chance: 0.32 },
    ],
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 2 === 0) {
        return {
          dmgMult: 1.9,
          msg: "Maliketh bondit du mur et retombe lame en avant.",
        };
      }
      return { msg: "Maliketh court sur les colonnes brisees." };
    },
  },
  placidusax: {
    comportementsPhase2: ["carapace", "mue"],
    phaseMue: { id: "DEATH_BLIGHT", duration: 3, chance: 0.4 },
    name: "Placidusax, Dragon-Seigneur",
    hp: 11678,
    atk: 121,
    armor: 210,
    runes: 313000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BURN", duration: 4, chance: 0.5 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "Les deux tetes se redressent ensemble. Le temps s'arrete une seconde.",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.4 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 4 === 1) {
        return {
          msg: "Placidusax disparait. L'air devient immobile.",
          skipAttack: true,
        };
      }
      if (enemy._p % 4 === 2) {
        return {
          dmgMult: 3.0,
          msg: "Il reapparait au-dessus de vous et souffle.",
        };
      }
      return { msg: "Les deux gueules claquent en alternance." };
    },
  },

  /* ============ LEYNDELL LA CENDREUSE (ch. X) ============ */
  ash_gilded_guard: {
    name: "Garde dore calcine",
    hp: 1998,
    atk: 104,
    armor: 290,
    runes: 77000,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BURN", duration: 3, chance: 0.4 },
  },
  ash_putrid_avatar: {
    name: "Avatar des cendres",
    hp: 2079,
    atk: 101,
    armor: 265,
    runes: 80000,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.38 },
  },
  ash_gideon_ozz: {
    name: "Gideon Ofnir, le Tout-Savant",
    hp: 7114,
    atk: 345,
    armor: 250,
    runes: 91200,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "MADNESS", duration: 3, chance: 0.42 },
    drops: [
      { id: "all_knowing_helm", chance: 0.32 },
      { id: "ozz_grimoire", chance: 0.3 },
    ],
    onTurnAction: (enemy) => {
      // Il change de sort a chaque tour : impossible de se preparer a une
      // seule affliction.
      enemy._p = (enemy._p || 0) + 1;
      const cycle = enemy._p % 3;
      if (cycle === 0)
        return { dmgMult: 1.5, msg: "Gideon lance une comete de Ranni." };
      if (cycle === 1)
        return { dmgMult: 1.5, msg: "Gideon invoque les lames de Rykard." };
      return { dmgMult: 1.5, msg: "Gideon deploie les ailes de Placidusax." };
    },
  },
  hoarah_loux: {
    comportementsPhase2: ["frenesie", "riposte"],
    phaseRiposte: 0.12,
    name: "Hoarah Loux, Conquerant",
    hp: 24690,
    atk: 256,
    armor: 200,
    runes: 360000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.35 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2:
      "Godfrey jette sa hache et arrache son manteau. « Vois-tu ? »",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.5 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 5 === 0) {
        return {
          dmgMult: 3.2,
          msg: "Hoarah Loux vous saisit et vous ecrase au sol.",
        };
      }
      if (enemy._p % 5 === 3) {
        return {
          dmgMult: 1.8,
          msg: "Il frappe le sol : l'onde remonte dans vos jambes.",
        };
      }
      return { msg: "Le Conquerant avance, poings ouverts." };
    },
  },

  /* ============ TRONE D'ELDEN (ch. X) ============ */
  throne_golden_shade: {
    name: "Ombre doree",
    hp: 4255,
    atk: 222,
    armor: 295,
    runes: 88600,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "DEATH_BLIGHT", duration: 2, chance: 0.3 },
  },
  throne_order_fragment: {
    name: "Fragment de l'Ordre",
    hp: 3053,
    atk: 171,
    armor: 240,
    runes: 84700,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "MADNESS", duration: 3, chance: 0.4 },
  },
  throne_radagon: {
    name: "Radagon de l'Ordre d'Or",
    hp: 7408,
    atk: 361,
    armor: 280,
    runes: 104900,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.4 },
    drops: [
      { id: "radagon_hammer", chance: 0.3 },
      { id: "golden_order_seal", chance: 0.32 },
    ],
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return {
          dmgMult: 2.4,
          msg: "Radagon se teleporte et abat le Marteau d'Or.",
        };
      }
      return { msg: "Radagon trace un sceau dore dans l'air." };
    },
  },
  elden_beast: {
    comportementsPhase2: ["regeneration", "mue"],
    phaseRegen: 0.03,
    phaseMue: { id: "MADNESS", duration: 3, chance: 0.45 },
    name: "Bete d'Elden",
    hp: 23200,
    atk: 240,
    armor: 210,
    runes: 413000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "DEATH_BLIGHT", duration: 3, chance: 0.45 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.4,
    flavorTextPhase2:
      "La Bete se replie sur l'Anneau et repand l'Ordre comme une maree.",
    effectsPhase2: { id: "DEATH_BLIGHT", duration: 4, chance: 0.62 },
    onTurnAction: (enemy) => {
      // Elle fuit : un tour sur deux hors de portee. C'est le boss le plus
      // long du jeu, et c'est voulu — la fin doit se meriter en tenue, pas en
      // pic de degats.
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 2 === 1) {
        return {
          msg: "La Bete s'eloigne en nageant dans le vide.",
          skipAttack: true,
        };
      }
      if (enemy._p % 6 === 0) {
        return {
          dmgMult: 3.0,
          msg: "L'Anneau d'Elden se referme : une pluie d'or tombe.",
        };
      }
      return {
        dmgMult: 1.6,
        msg: "La Bete balaie l'espace de sa queue etoilee.",
      };
    },
  },

  /* ============ FARUM AZULA EN RUINES : correctif ============ */
  // Le biome listait `beastman1` (84 pv) parmi ses monstres standard, a cote
  // d'azula_beast_lord (7200) et d'un boss a 44 800. L'intention — il y a bien
  // des hommes-betes a Farum Azula — est conservee, au bon palier.
  azula_beastman: {
    name: "Homme-bete de Farum Azula",
    hp: 1575,
    atk: 70,
    armor: 230,
    runes: 53900,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.34 },
  },

  /* ============ SANCTUAIRE BESTIAL (bonus) ============ */
  bestial_cleric: {
    name: "Clerc bestial",
    hp: 1275,
    atk: 66,
    armor: 200,
    runes: 11600,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.32 },
  },
  bestial_vulture: {
    name: "Vautour du sanctuaire",
    hp: 1207,
    atk: 70,
    armor: 165,
    runes: 11000,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.28 },
  },
  bestial_black_blade: {
    name: "Lame noire bestiale",
    hp: 3150,
    atk: 152,
    armor: 235,
    runes: 13700,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "DEATH_BLIGHT", duration: 2, chance: 0.3 },
    drops: [
      { id: "bestial_sanction", chance: 0.4 },
      { id: "deathroot_charm", chance: 0.38 },
    ],
  },
  gurranq_beast_clergyman: {
    name: "Gurranq, Bete de la Mort",
    hp: 7000,
    atk: 74,
    armor: 245,
    runes: 53000,
    isBoss: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "DEATH_BLIGHT", duration: 3, chance: 0.4 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.45,
    flavorTextPhase2:
      "Gurranq oublie ce qu'il etait et se met a quatre pattes.",
    effectsPhase2: { id: "BLEED", duration: 4, chance: 0.5 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return {
          dmgMult: 2.2,
          msg: "Gurranq laboure le sol de ses deux griffes.",
        };
      }
      return { msg: "Gurranq gronde, affame." };
    },
  },

  /* ============ JARBURG (bonus) ============ */
  jarburg_living_jar: {
    name: "Jarre vivante",
    hp: 400,
    atk: 21,
    armor: 120,
    runes: 3100,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.2 },
  },
  jarburg_jar_bairn: {
    name: "Petite jarre",
    hp: 360,
    atk: 19,
    armor: 100,
    runes: 2800,
    specificStats: { attacksPerTurn: 1 },
  },
  jarburg_alexander_shard: {
    name: "Eclat d'Alexander",
    hp: 500,
    atk: 24,
    armor: 150,
    runes: 3800,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    drops: [
      { id: "warrior_jar_shard", chance: 0.45 },
      { id: "jar_lid_shield", chance: 0.42 },
    ],
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return {
          dmgMult: 2.5,
          msg: "L'eclat se lance en avant comme un boulet.",
        };
      }
      return { msg: "L'eclat roule sur lui-meme en cliquetant." };
    },
  },
  jarburg_great_jar: {
    name: "Grande Jarre",
    hp: 1587,
    atk: 28,
    armor: 180,
    runes: 13000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.2 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 4 === 0) {
        return {
          dmgMult: 2.0,
          msg: "La Grande Jarre bascule et ecrase tout sous elle.",
        };
      }
      return { msg: "La Grande Jarre oscille lourdement." };
    },
  },

  /* ============ ENCLOS DES CHAMPIONS (bonus) ============ */
  // Chaque palier est un champion : le trait `gauntlet` interdit les soins et
  // la longueur du biome vaut le nombre de champions.
  evergaol_fortissax: {
    name: "Lichdragon Fortissax",
    hp: 2700,
    atk: 140,
    armor: 285,
    runes: 69300,
    isBoss: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "DEATH_BLIGHT", duration: 3, chance: 0.42 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return { dmgMult: 2.3, msg: "Fortissax appelle la foudre du Fleau." };
      }
      return { msg: "Fortissax rampe entre les racines." };
    },
  },
  evergaol_astel: {
    name: "Astel, Naturel du Vide",
    hp: 2790,
    atk: 144,
    armor: 240,
    runes: 71600,
    isBoss: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "MADNESS", duration: 3, chance: 0.44 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 4 === 0) {
        return {
          dmgMult: 2.6,
          msg: "Astel ouvre une faille : la gravite se retourne.",
        };
      }
      return { msg: "Astel derive au-dessus du sable." };
    },
  },
  evergaol_ancient_dragon: {
    name: "Dragon ancien Lansseax",
    hp: 9180,
    atk: 445,
    armor: 295,
    runes: 82100,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 2, chance: 0.38 },
    drops: [
      { id: "lansseax_glaive_ring", chance: 0.34 },
      { id: "ancient_dragon_scale", chance: 0.32 },
    ],
  },
  evergaol_nameless_champion: {
    name: "Le Champion sans Nom",
    hp: 18300,
    atk: 142,
    armor: 300,
    runes: 323000,
    isBoss: true,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 4, chance: 0.48 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Il change de garde. C'est la vôtre.",
    effectsPhase2: { id: "DEATH_BLIGHT", duration: 3, chance: 0.5 },
    onTurnAction: (enemy) => {
      // Il copie le rythme du joueur : deux coups rapides, puis un lourd.
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return {
          dmgMult: 2.5,
          msg: "Le Champion enchaine la riposte parfaite.",
        };
      }
      return { msg: "Le Champion vous rend coup pour coup." };
    },
  },
};
