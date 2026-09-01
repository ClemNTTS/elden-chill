import { applyEffect } from "../combat.js";
import { ITEM_TYPES } from "../constants.js";
import { gameState, getHealth, runtimeState,
  healPlayer,
} from "../state.js";
import { ActionLog } from "../ui.js";

export const DEPTHS = {
  ainsel_shard_spear: {
    name: "Lance d'Eclat d'Ainsel",
    type: ITEM_TYPES.WEAPON,
    set: "AINSEL_ASTRAL",
    description:
      "Dex +12%, Int +12%. Convertit 45% (+2% / niv) de votre Dexterité en Force et applique 2 Gelures sur critique.",
    applyMult: (stats, itemLevel) => {
      stats.dexterity *= 1.12;
      stats.intelligence *= 1.12;
      stats.strength += Math.floor(stats.dexterity * (0.45 + 0.02 * (itemLevel - 1)));
    },
    funcOnHit: (stats, targetEffects) => {
      if (Math.random() < stats.critChance) {
        applyEffect(targetEffects, "FROSTBITE", 2);
        ActionLog("Lance d'Ainsel : éclats lunaires et gelure.", "log-status");
      }
    },
  },

  ainsel_starmap: {
    name: "Carte Stellaire d'Ainsel",
    type: ITEM_TYPES.ACCESSORY,
    set: "AINSEL_ASTRAL",
    description:
      "Int +18%. Chaque tranche de 10 Int de base ajoute 3 dégâts de zone. Les ennemis gelés subissent aussi une Brûlure légère.",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.18;
      const baseInt = gameState.stats.intelligence || 0;
      stats.splashDamage += Math.floor(baseInt / 10) * 3;
    },
    funcOnHit: (stats, targetEffects) => {
      if (targetEffects.some((effect) => effect.id === "FROSTBITE")) {
        applyEffect(targetEffects, "BURN", 1);
        ActionLog("Carte Stellaire : la glace se fissure sous la chaleur astrale.", "log-status");
      }
    },
  },

  ainsel_silk_robe: {
    name: "Robe de Soie d'Ainsel",
    type: ITEM_TYPES.ARMOR,
    set: "AINSEL_ASTRAL",
    description:
      "Dex +10%, Armure +18 (+3 / niv). Si vous avez plus de 30 Int de base, gagne 10% d'esquive supplémentaire.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 18 + 3 * (itemLevel - 1);
    },
    applyMult: (stats) => {
      stats.dexterity *= 1.1;
      const baseInt = gameState.stats.intelligence || 0;
      if (baseInt > 30) {
        stats.dexterity *= 1.1;
      }
    },
  },

  rootbound_maul: {
    name: "Maillet Sépulcral",
    type: ITEM_TYPES.WEAPON,
    set: "ROOTBOUND",
    description:
      "Force +18%. Convertit 18% (+2% / niv) de la Vigueur totale en Force. Si vous avez des Épines, gagne +10% dégâts.",
    applyMult: (stats, itemLevel) => {
      stats.strength *= 1.18;
      stats.strength += Math.floor(stats.vigor * (0.18 + 0.02 * (itemLevel - 1)));
    },
    funcOnHit: () => {
      const hasThorns = gameState.playerEffects.some((effect) => effect.id === "THORNS");
      if (hasThorns) {
        runtimeState.nextAtkMultBonus = Math.max(runtimeState.nextAtkMultBonus, 1.1);
      }
    },
  },

  rootbound_plate: {
    name: "Cuirasse des Racines",
    type: ITEM_TYPES.ARMOR,
    set: "ROOTBOUND",
    description:
      "Armure +35 (+5 / niv). Réduit de 1 les charges de Saignement et de Brûlure au début du tour.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 35 + 5 * (itemLevel - 1);
    },
    passiveStatusReduction: (playerEffects) => {
      playerEffects.forEach((effect) => {
        if (effect.id === "BLEED" || effect.id === "BURN") {
          if (typeof effect.stacks === "number") {
            effect.stacks = Math.max(0, effect.stacks - 1);
          }
          if (typeof effect.duration === "number") {
            effect.duration = Math.max(0, effect.duration - 1);
          }
        }
      });
      return playerEffects;
    },
  },

  prince_bark_talisman: {
    name: "Talisman d'Ecorce Princière",
    type: ITEM_TYPES.ACCESSORY,
    set: "ROOTBOUND",
    description:
      "Vigueur +15%. Chaque tranche de 100 Armure soigne 1% de vos PV max à chaque coup porté.",
    applyMult: (stats) => {
      stats.vigor *= 1.15;
    },
    funcOnHit: (stats) => {
      const armorBands = Math.floor(stats.armor / 100);
      if (armorBands <= 0) return;
      const heal = Math.floor(getHealth(stats.vigor) * (armorBands * 0.01));
      const healed = healPlayer(heal, getHealth(stats.vigor));
      if (healed > 0) ActionLog(`Écorce princière : +${healed} PV.`, "log-heal");
    },
  },

  rotbloom_blade: {
    name: "Lame Rotfleur",
    type: ITEM_TYPES.WEAPON,
    set: "ROTBLOOM",
    description:
      "Force +12%, Dex +12%. 35% de chance d'appliquer 2 Putréfactions, +10% dégâts sur cible déjà affectée.",
    applyMult: (stats) => {
      stats.strength *= 1.12;
      stats.dexterity *= 1.12;
    },
    onHitEffect: { id: "SCARLET_ROT", duration: 2, chance: 0.35 },
    funcOnHit: (stats, targetEffects) => {
      if (targetEffects.some((effect) => ["SCARLET_ROT", "POISON", "BLEED"].includes(effect.id))) {
        runtimeState.nextAtkMultBonus = Math.max(runtimeState.nextAtkMultBonus, 1.1);
      }
    },
  },

  rotbloom_mail: {
    name: "Cotte Rotfleur",
    type: ITEM_TYPES.ARMOR,
    set: "ROTBLOOM",
    description:
      "Vigueur +12%, Armure +24. Les statuts négatifs expirent 20% plus vite et la Putréfaction est ralentie.",
    applyFlat: (stats) => {
      stats.armor += 24;
    },
    applyMult: (stats) => {
      stats.vigor *= 1.12;
    },
    passiveStatusReduction: (playerEffects) => {
      playerEffects.forEach((effect) => {
        if (["SCARLET_ROT", "POISON", "BLEED", "BURN"].includes(effect.id) && Math.random() < 0.2) {
          if (typeof effect.duration === "number") {
            effect.duration = Math.max(0, effect.duration - 1);
          }
          if (typeof effect.stacks === "number") {
            effect.stacks = Math.max(0, effect.stacks - 1);
          }
        }
      });
      return playerEffects;
    },
  },

  rotbloom_idol: {
    name: "Idole Rotfleur",
    type: ITEM_TYPES.ACCESSORY,
    set: "ROTBLOOM",
    description:
      "Crit +8%. Chaque statut négatif sur la cible donne +4 pénétration fixe. Si vos PV tombent sous 20%, gagne Épines pendant 2 tours.",
    applyMult: (stats) => {
      stats.critChance += 0.08;
    },
    funcOnHit: (stats, targetEffects) => {
      stats.flatDamagePenetration += targetEffects.length * 4;
      if (runtimeState.playerCurrentHp < getHealth(stats.vigor) * 0.2) {
        applyEffect(gameState.playerEffects, "THORNS", 2);
      }
    },
  },
};
