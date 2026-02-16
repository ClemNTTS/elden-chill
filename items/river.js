import { applyEffect } from "../combat.js";
import { ITEM_TYPES } from "../constants.js";
import { gameState, getHealth, runtimeState } from "../state.js";
import { ActionLog } from "../ui.js";

export const RIVER = {
  // RIVER
  horn_bow_talisman: {
    name: "🌀💨 Arc de Corne de Disciple",
    type: ITEM_TYPES.ACCESSORY,
    description:
      "Dex +15%. Tir de Précision : Chaque tranche de 10 Dex de base offre +2% (+0.5% / Niv) de chance d'ÉTOURDIR l'ennemi (max 50%).",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.15;
      const baseDex = gameState.stats.dexterity || 0;
      stats.customStunChance = Math.min(
        0.5,
        Math.floor(baseDex / 10) * (0.02 + 0.005 * (itemLevel - 1)),
      );
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < (stats.customStunChance || 0)) {
        applyEffect(targetEffects, "STUN", 1); //
        ActionLog(
          "Arc de Corne : Tir de précision ! (Étourdissement)",
          "log-status",
        );
      }
    },
  },

  starlight_pendant: {
    name: "🌀❄️🧠 Pendentif de Lumière Stellaire",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true,
    description:
      "Int +20%. Gelure Astrale : Frapper un ennemi ÉTOURDI applique instantanément 5 charges de GELURE.",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.2;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (targetEffects.some((e) => e.id === "STUN")) {
        applyEffect(targetEffects, "FROSTBITE", 5); //
        ActionLog(
          "Pendentif : Le froid stellaire paralyse le sang ! (+5 Gelure)",
          "log-status",
        );
      }
    },
  },

  ancestral_spirit_horn: {
    name: "🌀❤️❤️‍🩹 Corne de l'Esprit Ancestral",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true,

    description:
      "Vigueur +15%. Chant de Vie : Tant que l'ennemi est ÉTOURDI, chaque coup vous soigne de 2% de vos PV Max.",
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 1.15;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (targetEffects.some((e) => e.id === "STUN")) {
        const heal = Math.floor(getHealth(stats.vigor) * 0.02); //
        runtimeState.playerCurrentHp = Math.min(
          getHealth(stats.vigor),
          runtimeState.playerCurrentHp + heal,
        );
        ActionLog(`L'Esprit vous soigne : +${heal} PV`, "log-heal");
      }
    },
  },

  ancient_bone_axe: {
    name: "🌀⚔️🛡️🎯 Hache d'Os des Anciens",
    type: ITEM_TYPES.WEAPON,
    description:
      "Force +20% (+2% / Niv). Poids Ancestral : Si votre Armure est > à l'ennemi, les Critiques peuvent doubler la durée du STUN en cours.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.2 + 0.02 * (itemLevel - 1);
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const enemy = runtimeState.currentEnemyGroup[0];
      if (enemy && stats.armor > (enemy.armor || 0)) {
        const stun = targetEffects.find((e) => e.id === "STUN");
        if (stun && Math.random() < 0.2) {
          stun.duration *= 2;
          ActionLog(
            "Hache d'Os : Le choc prolonge l'étourdissement !",
            "log-crit",
          );
        }
      }
    },
  },

  ancestral_renaissance_horn: {
    name: "⚔️🧠❤️‍🩹Corne de la Renaissance Ancestrale",
    type: ITEM_TYPES.ACCESSORY,
    isAlwaysMax: true, // Objet légendaire, pas de niveaux
    description:
      "Tier 5. Force et Intelligence +15%. Harmonie Primordiale : Augmente votre Force de 1% pour chaque point d'Intelligence de base. Cycle de Vie : Une fois par donjon, si vos PV tombent sous 5%, vos PV sont restaurés à 25% de vos PV Max.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.15;
      stats.intelligence *= 1.15;

      const baseInt = gameState.stats.intelligence || 0;
      stats.strength *= 1 + baseInt / 100;
    },
    funcOnBeingHit: (stats, attacker, damage, itemLevel) => {
      const maxHp = getHealth(stats.vigor);

      // Cycle de Vie : Se déclenche sous 5% PV, une fois par donjon
      if (
        runtimeState.playerCurrentHp < maxHp * 0.05 &&
        !runtimeState.usedRenaissance
      ) {
        runtimeState.playerCurrentHp = maxHp * 0.25; // Soigne à 25%
        runtimeState.usedRenaissance = true;
        ActionLog("LA CORNE RÉSONNE : Renaissance Ancestrale !", "log-heal");
      }
    },
  },
};
