// Bestiaire des biomes de fin de parcours.
//
// Ces quatre biomes existaient dans le graphe mais etaient des coquilles
// vides : `monsters: ["", ""]`, `boss: ""`. Deux d'entre eux n'avaient meme
// aucun predecesseur, ce qui rendait inatteignables les cinq derniers biomes
// du jeu. Ce module leur donne un contenu jouable.
//
// Calibrage : la progression allait de mount_gelmir (3200 pv standard, boss a
// 24800) a crumbling_farum_azula (7200 pv standard, boss a 44800). Les paliers
// ci-dessous s'intercalent dans cet intervalle sans le rompre. Les runes
// suivent les ratios releves sur les biomes existants — environ 7,7x les pv
// pour un monstre standard, 7,6x pour un rare, 5,3x pour un boss.

export const ENDGAME_MONSTERS = {
  /* ================= CIMES DES GEANTS ================= */
  // Reference par le biome depuis toujours mais jamais defini : le faire
  // apparaitre plantait le combat sur `MONSTERS[id]` undefined.
  mountaintops_bird: {
    name: "Rapace des cimes",
    hp: 4100,
    atk: 255,
    armor: 150,
    runes: 31500,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.2 },
  },

  /* ================= LEYNDELL, CITE ROYALE ================= */
  leyndell_gilded_knight: {
    name: "Chevalier dore de Leyndell",
    hp: 3600,
    atk: 196,
    armor: 240,
    runes: 27700,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.18 },
  },
  leyndell_omen_killer: {
    name: "Tueur d'Omen",
    hp: 3850,
    atk: 205,
    armor: 170,
    runes: 29600,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.26 },
  },
  leyndell_tree_watcher: {
    name: "Veilleur de l'Arbre",
    hp: 4400,
    atk: 228,
    armor: 260,
    runes: 33400,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    drops: [
      { id: "altus_exec_sigil", chance: 0.3 },
      { id: "talisman_posture", chance: 0.26 },
    ],
    onTurnAction: (enemy) => {
      // Alterne garde et represailles : deux tours a encaisser, un a craindre.
      enemy._guard = (enemy._guard || 0) + 1;
      if (enemy._guard % 3 === 0) {
        return { dmgMult: 2.1, msg: "Le veilleur abat sa hallebarde de tout son poids." };
      }
      enemy.armor += 25;
      return { msg: "Le veilleur resserre sa garde dorée.", skipAttack: true };
    },
  },
  leyndell_erdtree_avatar: {
    name: "Avatar de l'Arbre-Monde",
    hp: 27000,
    atk: 305,
    armor: 250,
    runes: 143000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 80 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.22 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "L'avatar fend son propre tronc : la sève dorée prend feu.",
    effectsPhase2: { id: "BURN", duration: 3, chance: 0.4 },
    onTurnAction: (enemy) => {
      enemy._pattern = (enemy._pattern || 0) + 1;
      if (enemy._pattern % 3 === 1) {
        return { msg: "L'avatar plante ses racines et aspire la lumière.", skipAttack: true };
      }
      if (enemy._pattern % 3 === 2) {
        return { dmgMult: 1.7, msg: "Un balayage de racines dorées traverse la cour." };
      }
      return { msg: "L'avatar frappe du plat de son tronc." };
    },
  },

  /* ================= TERRE INTERDITE ================= */
  forbidden_black_knife: {
    name: "Lame noire des interdits",
    hp: 4200,
    atk: 248,
    armor: 160,
    runes: 32300,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.3 },
  },
  forbidden_grave_bird: {
    name: "Corbeau des sepultures",
    hp: 4350,
    atk: 232,
    armor: 140,
    runes: 33500,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "FROSTBITE", duration: 2, chance: 0.22 },
  },
  forbidden_deathbird: {
    name: "Oiseau de mort",
    hp: 5100,
    atk: 262,
    armor: 200,
    runes: 38800,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    drops: [
      { id: "talisman_wayfarer", chance: 0.28 },
      { id: "rune_fragment", chance: 0.24 },
    ],
    onTurnAction: (enemy) => {
      enemy._swoop = (enemy._swoop || 0) + 1;
      if (enemy._swoop % 2 === 0) {
        return { dmgMult: 1.9, msg: "L'oiseau de mort fond sur vous, faux en avant." };
      }
      return { msg: "L'oiseau de mort prend de l'altitude." };
    },
  },
  forbidden_gravekeeper: {
    name: "Gardien des tombes interdites",
    hp: 30500,
    atk: 335,
    armor: 235,
    runes: 162000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 90 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.3 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.45,
    flavorTextPhase2: "Le gardien laisse tomber son manteau : dessous, il n'y a plus de chair.",
    effectsPhase2: { id: "BLEED", duration: 4, chance: 0.48 },
    onTurnAction: (enemy) => {
      enemy._pattern = (enemy._pattern || 0) + 1;
      if (enemy._pattern % 4 === 0) {
        return { dmgMult: 2.2, msg: "Le gardien libère une lame de brume glacée." };
      }
      return { msg: "Le gardien avance d'un pas mesuré." };
    },
  },

  /* ================= PLAINE ENNEIGEE CONSACREE ================= */
  snowfield_albinauric_rider: {
    name: "Cavalier albinaurique",
    hp: 5400,
    atk: 272,
    armor: 210,
    runes: 41500,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.3 },
  },
  snowfield_frost_hound: {
    name: "Molosse de givre",
    hp: 5250,
    atk: 286,
    armor: 165,
    runes: 40400,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.24 },
  },
  snowfield_night_cavalry: {
    name: "Cavalerie nocturne",
    hp: 6800,
    atk: 305,
    armor: 250,
    runes: 51700,
    isRare: true,
    specificStats: { attacksPerTurn: 1 },
    drops: [
      { id: "arena_colossus_token", chance: 0.28 },
      { id: "talisman_posture", chance: 0.24 },
    ],
    onTurnAction: (enemy) => {
      enemy._charge = (enemy._charge || 0) + 1;
      if (enemy._charge % 3 === 1) {
        return { msg: "La cavalerie nocturne prend son elan dans la neige.", skipAttack: true };
      }
      return { dmgMult: 1.6, msg: "La charge nocturne fend la plaine." };
    },
  },
  snowfield_rime_dragon: {
    name: "Dragon de givre consacre",
    hp: 38000,
    atk: 352,
    armor: 255,
    runes: 201000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 110 },
    onHitEffect: { id: "FROSTBITE", duration: 3, chance: 0.42 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Le dragon replie ses ailes et le froid cesse d'etre du vent.",
    effectsPhase2: { id: "FROSTBITE", duration: 4, chance: 0.6 },
    onTurnAction: (enemy) => {
      enemy._pattern = (enemy._pattern || 0) + 1;
      if (enemy._pattern % 3 === 1) {
        return { msg: "Le dragon inspire ; l'air se charge de cristaux.", skipAttack: true };
      }
      if (enemy._pattern % 3 === 2) {
        return { dmgMult: 2.0, msg: "Un souffle de givre balaie la plaine consacree." };
      }
      return { msg: "Le dragon frappe du poitrail." };
    },
  },

  /* ================= PALAIS DE MOHGWYN ================= */
  mohgwyn_blood_noble: {
    name: "Noble sanglant",
    hp: 6100,
    atk: 298,
    armor: 215,
    runes: 47000,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.36 },
  },
  mohgwyn_albinauric_wretch: {
    name: "Miserable albinaurique",
    hp: 5900,
    atk: 312,
    armor: 150,
    runes: 45400,
    specificStats: { attacksPerTurn: 2 },
    onHitEffect: { id: "BLEED", duration: 2, chance: 0.28 },
  },
  mohgwyn_blood_hound: {
    name: "Limier de sang",
    hp: 7500,
    atk: 330,
    armor: 230,
    runes: 57000,
    isRare: true,
    specificStats: { attacksPerTurn: 2 },
    drops: [
      { id: "azula_black_censer", chance: 0.26 },
      { id: "talisman_blackrot", chance: 0.24 },
    ],
    onTurnAction: (enemy) => {
      // Se soigne sur le sang verse : recompense les builds qui tuent vite.
      enemy._feed = (enemy._feed || 0) + 1;
      if (enemy._feed % 3 === 0) {
        const heal = Math.floor(enemy.maxHp * 0.06);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        return { msg: `Le limier laper le sang et recouvre ${heal} points de vie.` };
      }
      return { dmgMult: 1.3, msg: "Le limier ouvre une plaie nette." };
    },
  },
  mohgwyn_blood_lord_echo: {
    name: "Echo du seigneur du sang",
    hp: 41000,
    atk: 375,
    armor: 245,
    runes: 217000,
    isBoss: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 120 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.45 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.4,
    flavorTextPhase2: "L'echo leve son trident : le palais entier se met a saigner.",
    effectsPhase2: { id: "BLEED", duration: 4, chance: 0.62 },
    onTurnAction: (enemy) => {
      enemy._pattern = (enemy._pattern || 0) + 1;
      if (enemy._pattern % 4 === 0) {
        return { dmgMult: 2.4, msg: "Le sang accumule retombe en une seule vague." };
      }
      return { msg: "L'echo tourne autour de vous, trident bas." };
    },
  },

  /* ================= ARBRE SACRE DE MIQUELLA ================= */
  haligtree_misbegotten_crusader: {
    name: "Croise mal-ne",
    hp: 6800,
    atk: 318,
    armor: 225,
    runes: 52400,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.24 },
  },
  haligtree_putrid_avatar: {
    name: "Avatar putride",
    hp: 7000,
    atk: 305,
    armor: 245,
    runes: 53900,
    specificStats: { attacksPerTurn: 1 },
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.34 },
  },
  haligtree_oracle_envoy: {
    name: "Envoye oracle",
    hp: 8200,
    atk: 342,
    armor: 270,
    runes: 62300,
    isRare: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 60 },
    drops: [
      { id: "azula_black_idol", chance: 0.26 },
      { id: "talisman_wayfarer", chance: 0.24 },
    ],
    onTurnAction: (enemy) => {
      enemy._horn = (enemy._horn || 0) + 1;
      if (enemy._horn % 2 === 0) {
        return { dmgMult: 1.8, msg: "L'envoye souffle dans sa trompe : l'onde ratisse large." };
      }
      return { msg: "L'envoye reprend son souffle." };
    },
  },
  haligtree_rot_knight: {
    name: "Chevalier de la putrefaction",
    hp: 43000,
    atk: 388,
    armor: 265,
    runes: 228000,
    isBoss: true,
    specificStats: { attacksPerTurn: 2, splashDamage: 100 },
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.4 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "L'armure cede ; ce qui sort n'est plus soigne par personne.",
    effectsPhase2: { id: "SCARLET_ROT", duration: 4, chance: 0.6 },
    onTurnAction: (enemy) => {
      enemy._pattern = (enemy._pattern || 0) + 1;
      if (enemy._pattern % 3 === 1) {
        return { msg: "Le chevalier ancre sa lame dans le tronc.", skipAttack: true };
      }
      if (enemy._pattern % 3 === 2) {
        return { dmgMult: 2.0, msg: "Une gerbe de spores ecarlates jaillit de la lame." };
      }
      return { msg: "Le chevalier enchaine deux estocs." };
    },
  },
};

/* ================================================================== */
/* Epreuves : boss hors progression                                   */
/* ================================================================== */
//
// Ni butin ni runes : la recompense est l'exploit. Les paliers partent a
// quatre fois le boss final (44 800 pv) et progressent d'un facteur trois,
// pour rester hors de portee pendant plusieurs renaissances.

export const TRIAL_MONSTERS = {
  trial_watcher_boss: {
    name: "Le Veilleur sans Nom",
    hp: 180000,
    atk: 620,
    armor: 280,
    runes: 0,
    isBoss: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 200 },
    onHitEffect: { id: "STUN", duration: 1, chance: 0.28 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Le Veilleur ouvre les yeux pour la premiere fois.",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.4 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 4 === 0) {
        return { dmgMult: 2.5, msg: "Le Veilleur abaisse sa garde et frappe une seule fois." };
      }
      return { msg: "Le Veilleur vous observe sans bouger." };
    },
  },
  trial_twin_boss: {
    name: "Les Jumeaux d'Ombre",
    hp: 540000,
    atk: 900,
    armor: 320,
    runes: 0,
    isBoss: true,
    // Deux attaques par tour : la seule epreuve qui punit le manque d'armure
    // plutot que le manque de degats.
    specificStats: { attacksPerTurn: 2, splashDamage: 260 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.4 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Le second jumeau cesse d'imiter le premier.",
    effectsPhase2: { id: "BLEED", duration: 4, chance: 0.55 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 3 === 0) {
        return { dmgMult: 1.9, msg: "Les jumeaux frappent au meme instant." };
      }
      return { msg: "Les jumeaux se separent et vous encerclent." };
    },
  },
  trial_hollow_boss: {
    name: "La Couronne Creuse",
    hp: 1600000,
    atk: 1300,
    armor: 360,
    runes: 0,
    isBoss: true,
    specificStats: { attacksPerTurn: 1, splashDamage: 340 },
    onHitEffect: { id: "SCARLET_ROT", duration: 3, chance: 0.42 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.6,
    flavorTextPhase2: "La couronne se remet en place. Il n'y a personne dessous.",
    effectsPhase2: { id: "SCARLET_ROT", duration: 4, chance: 0.6 },
    onTurnAction: (enemy) => {
      // Se soigne tant qu'on ne la tue pas assez vite : filtre les builds qui
      // n'ont pas assez de degats par tour, pas ceux qui manquent de patience.
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 5 === 0) {
        const heal = Math.floor(enemy.maxHp * 0.04);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        return { msg: `La couronne se recompose et regagne ${heal} points de vie.` };
      }
      return { dmgMult: 1.4, msg: "La couronne tourne lentement sur elle-meme." };
    },
  },
  trial_first_boss: {
    name: "Le Premier Sans-Eclat",
    hp: 4500000,
    atk: 1900,
    armor: 400,
    runes: 0,
    isBoss: true,
    specificStats: { attacksPerTurn: 2, splashDamage: 420 },
    onHitEffect: { id: "BLEED", duration: 3, chance: 0.45 },
    hasSecondPhase: true,
    thresholdForPhase2: 0.5,
    flavorTextPhase2: "Il vous rend votre garde. Il connait deja la suite.",
    effectsPhase2: { id: "STUN", duration: 2, chance: 0.35 },
    onTurnAction: (enemy) => {
      enemy._p = (enemy._p || 0) + 1;
      if (enemy._p % 4 === 1) {
        enemy.armor += 60;
        return { msg: "Le Premier Sans-Eclat adopte votre propre garde.", skipAttack: true };
      }
      if (enemy._p % 4 === 3) {
        enemy.armor = Math.max(400, enemy.armor - 60);
        return { dmgMult: 2.6, msg: "Il enchaine la riposte que vous auriez faite." };
      }
      return { msg: "Il avance d'un pas, exactement comme vous." };
    },
  },
};
