import { applyEffect } from "../status-apply.js";
import { CONTRACT_ITEM_IDS, ITEM_TYPES } from "../constants.js";
import { gameState, healPlayer, runtimeState } from "../state.js";
import { ActionLog } from "../ui-action-log.js";

/*
 * Butin exclusif des contrats legendaires.
 *
 * Ces objets ne figurent dans AUCUNE table de butin de biome et ne tombent
 * d'aucun monstre : c'est leur raison d'etre. Un contrat legendaire demande un
 * effort qu'aucune boucle de farm ne remplace, et doit donc payer en quelque
 * chose que le farm ne donne pas.
 *
 * Ils sont volontairement ORTHOGONAUX aux panoplies existantes : aucun ne
 * porte de bonus de set, chacun propose un effet que le reste du jeu n'offre
 * pas. Un objet exclusif qui serait simplement "la meme chose en mieux"
 * aplatirait les builds au lieu d'en ouvrir.
 */
export const CONTRACT_ITEMS = {
  oath_blade: {
    name: "Lame du Serment",
    type: ITEM_TYPES.WEAPON,
    description:
      "Exclusif aux contrats. Force +18%. Serment tenu : chaque contrat honore depuis la derniere renaissance ajoute +2% de Force, jusqu'a +40%.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.18;
      /*
       * L'arme lit le compteur de contrats honores : elle recompense la
       * pratique du systeme plutot que le niveau de l'objet. C'est le seul
       * endroit du jeu ou une statistique depend de l'historique du joueur.
       */
      const honores = gameState.contracts?.completed || 0;
      const bonus = Math.min(0.4, honores * 0.02 * (1 + 0.05 * (itemLevel - 1)));
      stats.strength *= 1 + bonus;
    },
  },

  ledger_of_debts: {
    name: "Registre des Dettes",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Exclusif aux contrats. +25% de gain de runes. Dette exigee : les ennemis rares rapportent le double, mais vous subissez 8% de degats en plus.",
    applyFlat: (stats, itemLevel) => {
      stats.runeGainMult += 0.25 + 0.02 * (itemLevel - 1);
    },
    applyMult: (stats) => {
      // Un malus assume : l'objet est un pari, pas une amelioration seche.
      stats.armor *= 0.92;
    },
  },

  mourners_veil: {
    name: "Voile des Endeuilles",
    type: ITEM_TYPES.ARMOR,
    description:
      "Exclusif aux contrats. +30 Armure (+3 / Niv). Veille : la premiere fois que vous tombez sous 30% de vos PV dans un combat, vous etes soigne de 20% de vos PV maximum.",
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

  writ_of_ruin: {
    name: "Bref de Ruine",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Exclusif aux contrats. Intelligence +15%. Sentence : chaque coup a 25% (+2% / Niv) de chance d'appliquer 3 cumuls de Fleau mortel.",
    applyMult: (stats) => {
      stats.intelligence *= 1.15;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const chance = 0.25 + 0.02 * (itemLevel - 1);
      if (Math.random() < chance) {
        applyEffect(targetEffects, "DEATH_BLIGHT", 3);
        ActionLog("Bref de Ruine : la sentence s'inscrit.", "log-status");
      }
    },
  },
};

/* La liste vit dans constants.js, qui n'importe rien : voir son commentaire.
 * Reexportee ici par commodite. */
export { CONTRACT_ITEM_IDS };
