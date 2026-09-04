import { applyEffect } from "../status-apply.js";
import { CONTRACT_ITEM_IDS, ITEM_TYPES } from "../constants.js";
import { gameState, healPlayer, runtimeState } from "../state.js";
import { ActionLog } from "../ui-action-log.js";

/*
 * Butin exclusif des contrats : cinq panoplies, une par archetype de build.
 *
 * POURQUOI DES PANOPLIES ET NON DES PIECES ISOLEES
 *
 * La premiere version proposait quatre objets sans lien entre eux. Un objet
 * isole se compare a ce que le joueur porte deja et finit presque toujours
 * perdant : trois emplacements, et l'equipement de fin de parcours est deja
 * dense. Une panoplie, elle, propose une DIRECTION — completer les trois
 * pieces devient un objectif en soi, ce qui est exactement ce qu'un systeme de
 * contrats doit produire.
 *
 * Un set par archetype, parce que le jeu recompense deja la specialisation :
 * force, dexterite, intelligence, vigueur, et les afflictions, qui forment un
 * axe a part entiere avec BLEED, SCARLET_ROT, MADNESS et DEATH_BLIGHT.
 *
 * AUCUN SCALING SUR L'HISTORIQUE
 *
 * La premiere Lame du Serment gagnait en puissance avec le NOMBRE de contrats
 * honores. Le bonus etait plafonne, mais le principe restait mauvais : un
 * compteur qui ne se reinitialise jamais, une puissance que le joueur ne peut
 * pas lire sur la fiche de l'objet, et une valeur qui depend de l'historique de
 * la partie plutot que de l'etat present.
 *
 * Elle lit desormais la RARETE DU CONTRAT EN COURS : borne par nature, lisible
 * d'un coup d'oeil, et qui pousse a prendre les contrats difficiles plutot qu'a
 * enchainer les faciles.
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
    description:
      "Exclusif aux contrats. +35 Armure (+3 / Niv). Convertit 20% (+1% / Niv) de votre Armure en Force.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 35 + 3 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      stats.strength += Math.floor(stats.armor * (0.2 + 0.01 * (itemLevel - 1)));
    },
  },

  seal_of_the_pact: {
    name: "Sceau du Pacte",
    type: ITEM_TYPES.ACCESSORY,
    set: "OATHBOUND",
    description:
      "Exclusif aux contrats. Force +12%. Penetration d'armure +15 (+3 / Niv).",
    applyFlat: (stats, itemLevel) => {
      stats.flatDamagePenetration += 15 + 3 * (itemLevel - 1);
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
    description:
      "Exclusif aux contrats. Dexterite +20%. Chance critique +8% (+1% / Niv).",
    applyFlat: (stats, itemLevel) => {
      stats.critChance += 0.08 + 0.01 * (itemLevel - 1);
    },
    applyMult: (stats) => {
      stats.dexterity *= 1.2;
    },
  },

  quarry_stalkers_garb: {
    name: "Tenue du Rabatteur",
    type: ITEM_TYPES.ARMOR,
    set: "BOUNTY_HUNTER",
    description:
      "Exclusif aux contrats. Dexterite +15%. Esquive +6% (+0.5% / Niv) et +12 Armure.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 12;
      stats.dodgeChance += 0.06 + 0.005 * (itemLevel - 1);
    },
    applyMult: (stats) => {
      stats.dexterity *= 1.15;
    },
  },

  ledger_of_debts: {
    name: "Registre des Dettes",
    type: ITEM_TYPES.ACCESSORY,
    set: "BOUNTY_HUNTER",
    description:
      "Exclusif aux contrats. +25% (+2% / Niv) de gain de runes. Dette exigee : votre armure est reduite de 8%.",
    applyFlat: (stats, itemLevel) => {
      stats.runeGainMult += 0.25 + 0.02 * (itemLevel - 1);
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
    description:
      "Exclusif aux contrats. Intelligence +20%. Sentence : chaque coup a 25% (+2% / Niv) de chance d'appliquer 3 cumuls de Fleau mortel.",
    applyMult: (stats) => {
      stats.intelligence *= 1.2;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const chance = 0.25 + 0.02 * (itemLevel - 1);
      if (Math.random() < chance) {
        applyEffect(targetEffects, "DEATH_BLIGHT", 3);
        ActionLog("Bref de Ruine : la sentence s'inscrit.", "log-status");
      }
    },
  },

  archivists_mantle: {
    name: "Manteau de l'Archiviste",
    type: ITEM_TYPES.ARMOR,
    set: "ARCHIVIST",
    description:
      "Exclusif aux contrats. Intelligence +15%. Degats de zone +30 (+6 / Niv).",
    applyFlat: (stats, itemLevel) => {
      stats.splashDamage += 30 + 6 * (itemLevel - 1);
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
    description:
      "Exclusif aux contrats. Convertit 30% (+2% / Niv) de votre Intelligence en degats de zone.",
    applyMult: (stats, itemLevel) => {
      stats.splashDamage += Math.floor(
        stats.intelligence * (0.3 + 0.02 * (itemLevel - 1)),
      );
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
    description:
      "Exclusif aux contrats. +60 Armure (+6 / Niv). Convertit 35% (+2% / Niv) de votre Armure en Force.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 60 + 6 * (itemLevel - 1);
    },
    applyMult: (stats, itemLevel) => {
      stats.strength += Math.floor(
        stats.armor * (0.35 + 0.02 * (itemLevel - 1)),
      );
    },
  },

  mourners_veil: {
    name: "Voile des Endeuilles",
    type: ITEM_TYPES.ARMOR,
    set: "MOURNER",
    description:
      "Exclusif aux contrats. +30 Armure (+3 / Niv). Veille : la premiere fois que vous tombez sous 30% de vos PV dans un combat, vous etes soigne de 20% (+1% / Niv) de vos PV maximum.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 30 + 3 * (itemLevel - 1);
    },
    funcOnBeingHit: (stats, attacker, damage, itemLevel) => {
      const maxHp = stats.maxHp || 0;
      if (!maxHp || runtimeState.voileUtilise) return;
      if (runtimeState.playerCurrentHp > maxHp * 0.3) return;

      runtimeState.voileUtilise = true;
      const soin = Math.floor(maxHp * (0.2 + 0.01 * (itemLevel - 1)));
      const rendu = healPlayer(soin, maxHp);
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
    description:
      "Exclusif aux contrats. Vigueur +12%. Soins recus +25% (+3% / Niv).",
    applyFlat: (stats, itemLevel) => {
      stats.healReceivedMult += 0.25 + 0.03 * (itemLevel - 1);
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
    description:
      "Exclusif aux contrats. Force +10%. Chaque coup applique 2 Saignements et a 20% (+2% / Niv) de chance d'ajouter la Putrefaction.",
    applyMult: (stats) => {
      stats.strength *= 1.1;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      applyEffect(targetEffects, "BLEED", 2);
      if (Math.random() < 0.2 + 0.02 * (itemLevel - 1)) {
        applyEffect(targetEffects, "SCARLET_ROT", 2);
        ActionLog("Croc du Verdict : la plaie se corrompt.", "log-status");
      }
    },
  },

  plague_writ_shroud: {
    name: "Suaire du Bref Pestilent",
    type: ITEM_TYPES.ARMOR,
    set: "SENTENCE",
    description:
      "Exclusif aux contrats. +25 Armure. +4 a toutes les resistances (+1 / Niv) : porter la peste demande d'y survivre.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 25;
      const gain = 4 + 1 * (itemLevel - 1);
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
    description:
      "Exclusif aux contrats. Penetration d'armure +10 (+2 / Niv). Chaque coup a 25% (+2% / Niv) de chance d'appliquer 2 cumuls de Folie.",
    applyFlat: (stats, itemLevel) => {
      stats.flatDamagePenetration += 10 + 2 * (itemLevel - 1);
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.25 + 0.02 * (itemLevel - 1)) {
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
 * correspond au build du joueur, et en priorite une piece qu'il n'a pas
 * encore. Sans cela, completer une panoplie de trois pieces tirees au hasard
 * parmi quinze demanderait des dizaines de contrats legendaires — la
 * recompense serait annoncee et jamais atteinte.
 */
export const SETS_PAR_ARCHETYPE = {
  strength: "OATHBOUND",
  dexterity: "BOUNTY_HUNTER",
  intelligence: "ARCHIVIST",
  vigor: "MOURNER",
  afflictions: "SENTENCE",
};

/** Identifiants d'un set de contrat. */
export const piecesDuSet = (setId) =>
  Object.entries(CONTRACT_ITEMS)
    .filter(([, objet]) => objet.set === setId)
    .map(([id]) => id);

/* La liste vit dans constants.js, qui n'importe rien : voir son commentaire.
 * Reexportee ici par commodite. */
export { CONTRACT_ITEM_IDS };
