import { ITEM_SETS } from "./constants.js";
import { getRebirthRuneBonus, getRebirthVigorMult } from "./rebirth.js";
import { ITEMS } from "./item.js";
import { applyPreparationStats } from "./systems.js";
import { DEFAULT_PLAYER_PROFILE } from "./shared/player-profile.js";

// Saved state
export const DEFAULT_GAME_STATE = JSON.parse(
  JSON.stringify(DEFAULT_PLAYER_PROFILE),
);

export let gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE));

// Non-saved, runtime state
export const runtimeState = {
  currentEnemyGroup: [],
  defeatedEnemies: [],
  areaCleared: false,
  playerCurrentHp: 0,
  currentCombatSession: 0,
  currentLoopCount: 0,
  autoRestartDeaths: 0,
  ashUsesLeft: 0,
  ashIsPrimed: false,
  enemyIntent: null,
  combatFrozen: false,
  playerArmorDebuff: 0,
  nextAtkMultBonus: 1,
  nextNbAtkBonus: 0,
  usedRenaissance: false,
  usedAbsolution: false,
  filterChanged: false,
  offlineSpeedMultiplier: 3, // default speed multiplier when using offline bank (reduced to x3)
};

export function setGameState(newState) {
  // Deux pieges evites ici, tous deux visibles a la remise a zero :
  //
  // 1. Tester la verite de la valeur (`if (newState.equippedAsh)`) empeche
  //    toute remise a null. Une cendre restait equipee apres un reset. On
  //    teste donc la PRESENCE de la cle, pas sa valeur.
  // 2. Object.assign sur un tableau recopie les indices mais ne raccourcit
  //    jamais la cible : charger un profil avec moins d'elements laissait des
  //    entrees perimees a la fin. Les tableaux sont remplaces, pas fusionnes.
  const mergeObject = (key) => {
    if (key in newState && newState[key] && typeof newState[key] === "object") {
      Object.assign(gameState[key], newState[key]);
    }
  };

  const replaceArray = (key, fallback = []) => {
    if (key in newState) {
      gameState[key] = Array.isArray(newState[key])
        ? [...newState[key]]
        : fallback;
    }
  };

  ["runes", "stats", "equipped", "ui", "preparation", "journal", "codex", "save", "rebirth", "automation"]
    .forEach(mergeObject);

  mergeObject("ashesOfWaruses");

  replaceArray("playerEffects");
  replaceArray("ennemyEffects");
  replaceArray("ashesOfWarOwned");
  replaceArray("order");

  if ("equippedAsh" in newState) {
    gameState.equippedAsh = newState.equippedAsh ?? null;
  }

  if (newState.world) {
    Object.assign(gameState.world, newState.world);
    if (
      !gameState.world.unlockedBiomes ||
      gameState.world.unlockedBiomes.length === 0
    ) {
      gameState.world.unlockedBiomes = ["limgrave_west"];
    }
  }

  gameState.inventory = Array.isArray(newState.inventory)
    ? [...newState.inventory]
    : [];
}

/*
 * Courbe d'attaques supplementaires de la dexterite.
 *
 * Elle est convexe, et ce n'est pas cosmetique. Les degats par tour valent
 * `attaques x force` : avec un diviseur lineaire, ce produit de deux termes
 * lineaires culmine mecaniquement au milieu du budget. Mesure faite avec
 * l'ancien diviseur de 40 — l'optimum tombait a 76 de dexterite, ce qui
 * rendait un investissement *principalement* en dexterite moins bon qu'un
 * demi-investissement. L'exact inverse de l'intention.
 *
 * L'exposant deplace l'optimum a 112 sans toucher au pic (263 contre 270
 * degats par tour), affaiblit nettement la dexterite precoce (1,15 attaque a
 * 20 points contre 1,50 avant) et recompense enfin l'engagement complet
 * (5,97 attaques a 150 contre 4,75).
 */
export const DEX_ATTACK_DIVISOR = 60;
export const DEX_ATTACK_EXPONENT = 1.75;

/** Attaques supplementaires apportees par la dexterite, partie decimale incluse. */
export const getDexExtraAttacks = (dexterity = 0) =>
  Math.pow(Math.max(0, dexterity) / DEX_ATTACK_DIVISOR, DEX_ATTACK_EXPONENT);

/**
 * Rendement de l'intelligence.
 *
 * Le plafond etait a 50 (`min(0.5, int/100)`) : l'intelligence etait finie a
 * 50 points sur un budget de 150, et chaque point au-dela ne servait plus qu'a
 * nourrir la force a 25%. Il suit desormais le budget complet.
 */
export const INT_RUNE_CAP = 1.5;

/*
 * Degats magiques par point d'intelligence.
 *
 * Ils sont ajoutes APRES la division par l'armure : ils l'ignorent
 * entierement. C'est ce qui donne a l'intelligence une place que ni la force
 * ni la dexterite n'occupent — les deux voient leurs degats divises par
 * l'armure de la cible, qui monte a 620 en fin de parcours.
 *
 * Le coefficient est calibre pour la parite a budget plein contre une cible
 * d'armure moyenne : a 150 d'intelligence, 120 de degats magiques plus 14 de
 * physique derive, contre 150 pour un build force pur.
 *
 * La penetration en pourcentage a ete ecartee volontairement : les objets en
 * cumulent deja jusqu'a 0,9, et `armor` est clampe a 1 dans combat.js. Un
 * bonus de stat par-dessus aurait fait franchir 100% et multiplie les degats
 * par cent.
 */
export const INT_MAGIC_PER_POINT = 0.6;
export const getMagicDamage = (intelligence = 0) =>
  Math.floor(Math.max(0, intelligence) * INT_MAGIC_PER_POINT);

export function getEffectiveStats() {
  let effStats = {
    ...gameState.stats,
    attacksPerTurn: 1,
    extraAttackChance: 0,
    // Gain permanent des renaissances, avant tout bonus d'objet.
    runeGainMult: getRebirthRuneBonus(),
    // Multiplicateur des soins RECUS. Lu par healPlayer, seul point de passage
    // des soins du joueur, donc un objet qui le modifie agit partout.
    healReceivedMult: 1,
    bossMitigation: 0,
    resistances: {
      poison: 0,
      gel: 0,
      folie: 0,
      putrefaction: 0,
    },
  };

  const applyItemBonus = (type) => {
    Object.keys(gameState.equipped).forEach((slotType) => {
      const itemId = gameState.equipped[slotType];
      const itemData = ITEMS[itemId];

      if (itemData && itemData[type]) {
        const invItem = gameState.inventory.find((i) => i.id === itemId);
        const level = invItem ? invItem.level : 1;
        itemData[type](effStats, level);
      }
    });
  };

  // 1. Bonus "Flat" (Additions fixes des objets)
  applyItemBonus("applyFlat");

  // 2. Scaling de base des attributs (Dex -> Armure/Force, Int -> Force)
  effStats.armor += Math.floor((gameState.stats.dexterity * 0.5) / 4);
  effStats.strength += Math.floor(
    gameState.stats.dexterity / 4 + gameState.stats.intelligence / 4,
  );

  // 3. LOGIQUE DES PANOPLIES (SETS)
  const setCounts = {};
  Object.values(gameState.equipped).forEach((itemId) => {
    if (itemId && ITEMS[itemId]?.set) {
      const setName = ITEMS[itemId].set;
      setCounts[setName] = (setCounts[setName] || 0) + 1;
    }
  });

  Object.keys(setCounts).forEach((setName) => {
    const count = setCounts[setName];
    const setDef = ITEM_SETS[setName];
    if (setDef && setDef.bonuses) {
      // On applique chaque palier atteint (ex: bonus de 2 pièces, puis de 3)
      for (let i = 1; i <= count; i++) {
        if (setDef.bonuses[i] && setDef.bonuses[i].effect) {
          setDef.bonuses[i].effect(effStats);
        }
      }
    }
  });

  // 4. Bonus "Mult" (Multiplicateurs % des objets)
  applyItemBonus("applyMult");

  /*
   * 5. Attaques supplementaires de dexterite.
   *
   * Les degats valent la force (combat.js), et la dexterite n'en rend qu'un
   * quart : sans multiplicateur, un build dexterite valait structurellement
   * quatre fois moins qu'un build force. La courbe est definie plus haut ; la
   * dexterite garde en prime son esquive et son armure, qu'elle paie en
   * fragilite face aux coups uniques.
   *
   * Corollaire assume : les effets a l'impact se declenchent par attaque, donc
   * la dexterite est aussi la voie des afflictions.
   */
  /*
   * Levier propre a la FORCE : penetration d'armure fixe.
   *
   * Diagnostic a l'origine de ce bloc (tools/audit-conversions.mjs) : huit
   * objets convertissent la dexterite en force, six l'armure, cinq la vigueur,
   * quatre l'intelligence — et un seul convertit la force en autre chose. La
   * force etait un puits : toutes les autres voies rapportaient leur propre
   * effet PLUS de la force, tandis qu'investir en force ne rapportait que de
   * la force. Aucun build force ne pouvait rivaliser, et le simulateur le
   * mesurait : 918 cycles contre 605 pour la dexterite.
   *
   * La penetration est le seul levier qu'aucune autre statistique ne touche,
   * et il monte en valeur exactement la ou la force souffre : les cibles
   * blindees de fin de parcours. Sur la force de BASE, comme les attaques de
   * dexterite, pour ne pas recreer une boucle avec les objets.
   */
  effStats.flatDamagePenetration += Math.floor((gameState.stats.strength || 0) / 1.3);

  /*
   * Levier propre a la VIGUEUR : mitigation des boss.
   *
   * `bossMitigation` existait dans le moteur sans qu'aucune statistique ne
   * l'alimente. Il donne a la vigueur une identite defensive que ni l'armure
   * ni les points de vie ne remplacent, puisqu'il agit apres la division par
   * l'armure. Plafonne a 25%, la mitigation totale l'etant deja a 45%.
   */
  effStats.bossMitigation =
    (effStats.bossMitigation || 0) +
    Math.min(0.25, (gameState.stats.vigor || 0) / 900);

  // Noeud "Sang endurci" : applique apres les objets pour qu'il les amplifie,
  // et avant l'arrondi final pour ne pas perdre les decimales.
  effStats.vigor *= getRebirthVigorMult();

  /*
   * Sur la dexterite de BASE, pas l'effective.
   *
   * Avec l'effective, les objets en pourcentage de dexterite creaient une
   * boucle multiplicative : +21% de dexterite donnait +39% d'attaques a cause
   * de l'exposant, et chaque attaque multipliait a son tour toute la force
   * gagnee par ailleurs. Mesure au simulateur : un build dexterite atteignait
   * 10,2 attaques par tour et 7 fois les degats d'un build force a
   * investissement egal.
   *
   * C'est aussi la convention du reste du moteur : l'esquive et les conditions
   * d'objet lisent deja gameState.stats.dexterity.
   */
  const dexAttacks = getDexExtraAttacks(gameState.stats.dexterity);
  effStats.attacksPerTurn += Math.floor(dexAttacks);
  /*
   * Le reste devient une chance d'attaque supplementaire, tiree a chaque tour.
   *
   * Sans ca, le palier etait une falaise : a 79 de dexterite on frappait deux
   * fois, a 80 trois fois, soit +48% de degats par tour pour un seul point.
   * La progression devient continue et il n'y a plus de seuil a viser au point
   * pres.
   */
  effStats.extraAttackChance = dexAttacks - Math.floor(dexAttacks);

  // 6. Arrondi final pour éviter les PV/Dégâts à virgule
  const keysToFloor = [
    "strength",
    "vigor",
    "dexterity",
    "intelligence",
    "armor",
    "splashDamage",
  ];
  keysToFloor.forEach((key) => {
    if (effStats[key] !== undefined) effStats[key] = Math.round(effStats[key]);
  });

  if (gameState.playerEffects.some((e) => e.id === "DEW_PROTECTION")) {
    effStats.armor += 50;
  }

  applyPreparationStats(effStats);

  return effStats;
}

/**
 * Le biome scelle-t-il les soins ? (trait `noHeal`, voir biome-traits.js)
 *
 * Lu directement dans gameState plutot que via getRunModifier : systems.js
 * importe state.js, l'inverse creerait un cycle.
 */
export const isHealingSealed = () =>
  (gameState.preparation?.activeRunBuffs || []).some((buff) => buff.noHeal);

/**
 * Point de passage unique de tous les soins du joueur.
 *
 * Il y avait huit endroits qui ecrivaient `playerCurrentHp` a la main : en
 * oublier un rendait le trait "Grace scellee" mensonger. Renvoie le soin
 * reellement applique, 0 si scelle.
 */
export const healPlayer = (amount, maxHp) => {
  if (!(amount > 0) || isHealingSealed()) return 0;
  const eff = getEffectiveStats();
  const scaled = amount * (eff.healReceivedMult ?? 1);
  if (!(scaled > 0)) return 0;
  const cap = maxHp ?? getHealth(eff.vigor);
  const before = runtimeState.playerCurrentHp;
  runtimeState.playerCurrentHp = Math.min(cap, before + scaled);
  return runtimeState.playerCurrentHp - before;
};

export function getHealth(vigor) {
  let hp = 300;

  if (vigor <= 40) {
    hp += vigor * 45;
  } else if (vigor <= 60) {
    hp += 2200 + (vigor - 40) * 35;
  } else {
    hp += 3000 + (vigor - 60) * 25;
  }

  return Math.floor(hp);
}
