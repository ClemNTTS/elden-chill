import { applyEffect } from "../status-apply.js";
import {
  CONTRACT_ITEM_IDS,
  ITEM_TYPES,
  SETS_PAR_ARCHETYPE,
} from "../constants.js";
import { gameState, healPlayer, runtimeState } from "../state.js";
import { ActionLog } from "../ui-action-log.js";

/*
 * Butin exclusif des contrats : cinq panoplies, une par archetype de build.
 *
 * POURQUOI DES PANOPLIES ET NON DES PIECES ISOLEES
 *
 * Un objet isole se compare a ce que le joueur porte deja et finit presque
 * toujours perdant : trois emplacements, et l'equipement de fin de parcours est
 * dense. Une panoplie propose une DIRECTION — completer les trois pieces
 * devient un objectif en soi, ce qu'un systeme de contrats doit produire.
 *
 * Un set par archetype, parce que le jeu recompense deja la specialisation :
 * force, dexterite, intelligence, vigueur, et les afflictions, qui forment un
 * axe a part entiere avec BLEED, SCARLET_ROT, MADNESS et DEATH_BLIGHT.
 *
 * TOUTES CES PIECES SONT `isAlwaysMax`
 *
 * Elles n'ont AUCUN scaling par niveau, et arrivent directement a leur valeur
 * finale. C'est une necessite, pas un confort.
 *
 * Le jeu fait monter un objet de niveau avec des copies, et il en faut
 * `count >= level` a chaque palier : passer de 1 a 10 demande 45 copies. Or
 * seuls les contrats rares et legendaires donnent un objet, soit 38% des
 * tirages, repartis sur les trois pieces d'un set — il faudrait de l'ordre de
 * 350 contrats pour amener UNE piece au maximum.
 *
 * Une premiere version laissait ces objets naitre au niveau 1 avec un scaling
 * par niveau. Le butin annonce comme exclusif serait donc reste eternellement a
 * sa valeur la plus faible, et un contrat legendaire aurait paye moins qu'un
 * objet ramasse sur un monstre. Les valeurs ci-dessous sont celles que
 * l'ancienne echelle atteignait au niveau 10 : la puissance ne change pas, elle
 * est simplement atteignable.
 *
 * AUCUN SCALING SUR L'HISTORIQUE NON PLUS
 *
 * La premiere Lame du Serment gagnait en puissance avec le NOMBRE de contrats
 * honores. Le bonus etait plafonne, mais le principe restait mauvais : un
 * compteur jamais reinitialise, et une puissance illisible sur la fiche de
 * l'objet. Elle lit desormais la RARETE DU CONTRAT EN COURS — borne par nature,
 * et qui pousse a prendre les contrats difficiles.
 */

/** Bonus de la Lame du Serment selon la rarete du contrat en cours. */
const SERMENT_PAR_RARETE = {
  commune: 0.08,
  rare: 0.18,
  legendaire: 0.3,
};

const bonusSerment = () => {
  const contrat = gameState.contracts?.actif;
  if (!contrat || contrat.honore) return 0;
  return SERMENT_PAR_RARETE[contrat.rarete] || 0;
};

export const CONTRACT_ITEMS = {
  /* ================================================================
     SERMENT — archetype FORCE
     Degats bruts, recompense la prise de contrats difficiles.
     ================================================================ */

  oath_blade: {
    name: "Lame du Serment",
    type: ITEM_TYPES.WEAPON,
    set: "OATHBOUND",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. Force +18%. Serment : tant qu'un contrat est en cours, Force +8% (commune), +18% (rare) ou +30% (legendaire).",
    applyMult: (stats) => {
      stats.strength *= 1.18;
      /*
       * Lit la rarete du contrat EN COURS, pas un compteur cumule : le bonus
       * est borne par nature et se lit sur le panneau de contrat.
       */
      stats.strength *= 1 + bonusSerment();
    },
  },

  oathbound_plate: {
    name: "Harnois du Serment",
    type: ITEM_TYPES.ARMOR,
    set: "OATHBOUND",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. +62 Armure. Convertit 29% de votre Armure en Force.",
    applyFlat: (stats) => {
      stats.armor += 62;
    },
    applyMult: (stats) => {
      stats.strength += Math.floor(stats.armor * 0.29);
    },
  },

  seal_of_the_pact: {
    name: "Sceau du Pacte",
    type: ITEM_TYPES.ACCESSORY,
    set: "OATHBOUND",
    isAlwaysMax: true,
    description: "Exclusif aux contrats. Force +12%. Penetration d'armure +42.",
    applyFlat: (stats) => {
      stats.flatDamagePenetration += 42;
    },
    applyMult: (stats) => {
      stats.strength *= 1.12;
    },
  },

  /* ================================================================
     TRAQUE — archetype DEXTERITE
     Cadence et critiques.
     ================================================================ */

  hunters_edge: {
    name: "Tranchant du Traqueur",
    type: ITEM_TYPES.WEAPON,
    set: "BOUNTY_HUNTER",
    isAlwaysMax: true,
    description: "Exclusif aux contrats. Dexterite +20%. Chance critique +17%.",
    applyFlat: (stats) => {
      stats.critChance += 0.17;
    },
    applyMult: (stats) => {
      stats.dexterity *= 1.2;
    },
  },

  quarry_stalkers_garb: {
    name: "Tenue du Rabatteur",
    type: ITEM_TYPES.ARMOR,
    set: "BOUNTY_HUNTER",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. Dexterite +15%. Esquive +10% et +12 Armure.",
    applyFlat: (stats) => {
      stats.armor += 12;
      stats.dodgeChance += 0.1;
    },
    applyMult: (stats) => {
      stats.dexterity *= 1.15;
    },
  },

  ledger_of_debts: {
    name: "Registre des Dettes",
    type: ITEM_TYPES.ACCESSORY,
    set: "BOUNTY_HUNTER",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. +43% de gain de runes. Dette exigee : votre armure est reduite de 8%.",
    applyFlat: (stats) => {
      stats.runeGainMult += 0.43;
    },
    applyMult: (stats) => {
      // Un malus assume : l'objet est un pari, pas une amelioration seche.
      stats.armor *= 0.92;
    },
  },

  /* ================================================================
     ARCHIVES — archetype INTELLIGENCE
     Degats de zone et magie.
     ================================================================ */

  writ_of_ruin: {
    name: "Bref de Ruine",
    type: ITEM_TYPES.WEAPON,
    set: "ARCHIVIST",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. Intelligence +20%. Sentence : chaque coup a 43% de chance d'appliquer 3 cumuls de Fleau mortel.",
    applyMult: (stats) => {
      stats.intelligence *= 1.2;
    },
    funcOnHit: (stats, targetEffects) => {
      if (Math.random() < 0.43) {
        applyEffect(targetEffects, "DEATH_BLIGHT", 3);
        ActionLog("Bref de Ruine : la sentence s'inscrit.", "log-status");
      }
    },
  },

  archivists_mantle: {
    name: "Manteau de l'Archiviste",
    type: ITEM_TYPES.ARMOR,
    set: "ARCHIVIST",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. Intelligence +15%. Degats de zone +84 et +18 Armure.",
    applyFlat: (stats) => {
      stats.splashDamage += 84;
      stats.armor += 18;
    },
    applyMult: (stats) => {
      stats.intelligence *= 1.15;
    },
  },

  unsigned_clause: {
    name: "Clause non Signee",
    type: ITEM_TYPES.ACCESSORY,
    set: "ARCHIVIST",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. Convertit 48% de votre Intelligence en degats de zone.",
    applyMult: (stats) => {
      stats.splashDamage += Math.floor(stats.intelligence * 0.48);
    },
  },

  /* ================================================================
     VEILLE — archetype VIGUEUR / TANK
     Survie et sustain.
     ================================================================ */

  vigil_greatshield: {
    name: "Pavois de la Veille",
    type: ITEM_TYPES.WEAPON,
    set: "MOURNER",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. +114 Armure. Convertit 28% de votre Armure en Force.",
    applyFlat: (stats) => {
      stats.armor += 114;
    },
    applyMult: (stats) => {
      /*
       * 28% et non 53%.
       *
       * Mesure a statistiques egales : avec 53%, la panoplie complete montait a
       * x2.14 en Force — autant que la panoplie FORCE (x2.23) — tout en offrant
       * pres du triple d'armure, +92% de soins recus et +15% de mitigation de
       * boss. Le set tank dominait le set de degats sur son propre terrain, ce
       * qui rendait le choix d'archetype sans objet.
       *
       * L'armure de ce set est deja tres haute (323 a statistiques egales) :
       * un point de conversion s'y paie donc bien plus cher qu'ailleurs.
       */
      stats.strength += Math.floor(stats.armor * 0.28);
    },
  },

  mourners_veil: {
    name: "Voile des Endeuilles",
    type: ITEM_TYPES.ARMOR,
    set: "MOURNER",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. +57 Armure. Veille : la premiere fois que vous tombez sous 30% de vos PV dans un combat, vous etes soigne de 29% de vos PV maximum.",
    applyFlat: (stats) => {
      stats.armor += 57;
    },
    funcOnBeingHit: (stats) => {
      const maxHp = stats.maxHp || 0;
      if (!maxHp || runtimeState.voileUtilise) return;
      if (runtimeState.playerCurrentHp > maxHp * 0.3) return;

      runtimeState.voileUtilise = true;
      const rendu = healPlayer(Math.floor(maxHp * 0.29), maxHp);
      if (rendu > 0) {
        ActionLog(
          `Voile des Endeuilles : la veille vous releve (+${Math.floor(rendu)} PV).`,
          "log-heal",
        );
      }
    },
  },

  widows_token: {
    name: "Jeton de la Veuve",
    type: ITEM_TYPES.ACCESSORY,
    set: "MOURNER",
    isAlwaysMax: true,
    description: "Exclusif aux contrats. Vigueur +12%. Soins recus +52%.",
    applyFlat: (stats) => {
      stats.healReceivedMult += 0.52;
    },
    applyMult: (stats) => {
      stats.vigor *= 1.12;
    },
  },

  /* ================================================================
     SENTENCE — archetype AFFLICTIONS
     Un axe a part entiere dans ce jeu, pas une variante de l'intelligence.
     ================================================================ */

  verdict_fang: {
    name: "Croc du Verdict",
    type: ITEM_TYPES.WEAPON,
    set: "SENTENCE",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. Force +10%. Chaque coup applique 2 Saignements et a 38% de chance d'ajouter la Putrefaction.",
    applyMult: (stats) => {
      stats.strength *= 1.1;
    },
    funcOnHit: (stats, targetEffects) => {
      applyEffect(targetEffects, "BLEED", 2);
      if (Math.random() < 0.38) {
        applyEffect(targetEffects, "SCARLET_ROT", 2);
        ActionLog("Croc du Verdict : la plaie se corrompt.", "log-status");
      }
    },
  },

  plague_writ_shroud: {
    name: "Suaire du Bref Pestilent",
    type: ITEM_TYPES.ARMOR,
    set: "SENTENCE",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. +25 Armure. +13 a toutes les resistances : porter la peste demande d'y survivre.",
    applyFlat: (stats) => {
      stats.armor += 25;
      const gain = 13;
      stats.resistances.poison += gain;
      stats.resistances.gel += gain;
      stats.resistances.folie += gain;
      stats.resistances.putrefaction += gain;
    },
  },

  bailiffs_brand: {
    name: "Marque de l'Huissier",
    type: ITEM_TYPES.ACCESSORY,
    set: "SENTENCE",
    isAlwaysMax: true,
    description:
      "Exclusif aux contrats. Penetration d'armure +28. Chaque coup a 43% de chance d'appliquer 2 cumuls de Folie.",
    applyFlat: (stats) => {
      stats.flatDamagePenetration += 28;
    },
    funcOnHit: (stats, targetEffects) => {
      if (Math.random() < 0.43) {
        applyEffect(targetEffects, "MADNESS", 2);
        ActionLog("Marque de l'Huissier : la sommation resonne.", "log-status");
      }
    },
  },
};

/*
 * Correspondance archetype -> panoplie.
 *
 * Sert au tirage des recompenses : un contrat propose une piece du set qui
 * correspond au build du joueur, et en priorite une piece qu'il n'a pas encore.
 * Sans cela, completer une panoplie de trois pieces tirees au hasard parmi
 * quinze demanderait des dizaines de contrats — la recompense serait annoncee
 * et jamais atteinte.
 */

/** Identifiants d'un set de contrat. */
export const piecesDuSet = (setId) =>
  Object.entries(CONTRACT_ITEMS)
    .filter(([, objet]) => objet.set === setId)
    .map(([id]) => id);

/* La liste et la table d'archetypes vivent dans constants.js, qui n'importe
 * rien : voir son commentaire. Reexportees ici par commodite. */
export { CONTRACT_ITEM_IDS, SETS_PAR_ARCHETYPE };
