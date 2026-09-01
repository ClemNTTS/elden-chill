import { applyEffect } from "../combat.js";
import { ITEM_TYPES } from "../constants.js";
import { gameState, getHealth, runtimeState } from "../state.js";
import { ActionLog } from "../ui.js";

export const NOKRON = {
  nokron_flame_dagger: {
    name: "Dague Enflamée de Nokron",
    type: ITEM_TYPES.WEAPON,
    description:
      "Tier 5. Dextérité +20%. Convertit 55% (+2% / Niv) de votre Dextérité en Force. Dague Enflamée : Chaque coup a 30% (+2% / Niv) de chance d'infliger 2 Brûlures et 1 Saignement.",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.2;
      stats.strength += Math.floor(
        stats.dexterity * (0.55 + 0.02 * (itemLevel - 1)),
      );
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const chance = 0.3 + 0.02 * (itemLevel - 1);
      if (Math.random() < chance) {
        applyEffect(targetEffects, "BURN", 2);
        applyEffect(targetEffects, "BLEED", 1);
        ActionLog(
          "Dague de Nokron : Flamme éternelle et saignement !",
          "log-status",
        );
      }
    },
  },

  mercury_breastplate: {
    name: "Plastron de Mercure",
    type: ITEM_TYPES.ARMOR,
    description:
      "Tier 5. +20 d'Armure (+1 / Niv). Une armure qui durcit au fur et à mesure que tu reçois des coups, augmentant ton Armure pendant le combat de 1 (+0.2 / Niv).",

    applyFlat: (stats, itemLevel) => {
      stats.armor += 20 + 1 * (itemLevel - 1);
    },
    funcOnBeingHit: (stats, attacker, damage, itemLevel) => {
      const bonus = 1 + 0.2 * (itemLevel - 1);
      stats.armor += Math.floor(bonus);
      ActionLog(
        `Plastron de Mercure : L'armure se durcit ! (+${bonus} Armure)`,
        "log-status",
      );
    },
  },

  silver_tear_mask: {
    name: "Masque de Larme d'Argent",
    type: ITEM_TYPES.ARMOR,
    isAlwaysMax: true,
    description:
      "Tier 5. FORCE +15%. Mimétisme de Force : Vous gagnez +1% (+0.4% / Niveau) de Force pour chaque tranche de 5 points de Dextérité de base.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.15;
      const baseDex = gameState.stats.dexterity || 0;
      const ratio = 0.01 + 0.004 * (itemLevel - 1);
      /*
       * Plafond a +100%.
       *
       * Sans lui, ce mimetisme etait un multiplicateur de force sans borne
       * indexe sur la dexterite : a 154 de dexterite il valait deja x2,38, et
       * il continuait de monter. C'est lui, et non la courbe d'attaques, qui
       * mettait la voie dexterite 33% devant toutes les autres au simulateur.
       */
      stats.strength *= 1 + Math.min(1, Math.floor(baseDex / 5) * ratio);
    },
  },

  celestial_dew_talisman: {
    name: "Rosée Céleste Bénie",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Tier 5. Vigueur +20%. +2% de Force par niveau. Absolution : Une fois par combat, si vos PV tombent sous 30%, tous vos effets de statut négatifs sont purifiés et vous gagnez +50 d'Armure pour 3 tours.",
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 1.2;
      // Bonus de force : $Stats \times (1 + 0.02 \times \text{Niveau})$
      stats.strength = Math.floor(stats.strength * (1 + 0.02 * itemLevel));
    },
    funcOnBeingHit: (stats) => {
      const maxHp = getHealth(stats.vigor);

      // Condition d'activation : PV < 30% et non utilisé ce combat
      if (
        runtimeState.playerCurrentHp < maxHp * 0.3 &&
        !runtimeState.usedAbsolution
      ) {
        // 1. Purification
        gameState.playerEffects = [];

        // 2. Application du statut (3 tours)
        applyEffect(gameState.playerEffects, "DEW_PROTECTION", 3);

        runtimeState.usedAbsolution = true;
        ActionLog(
          "Rosée Céleste : Vos péchés sont lavés, votre peau durcit !",
          "log-heal",
        );
      }
    },
  },
};
