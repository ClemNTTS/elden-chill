import { applyEffect } from "../status-apply.js";
import { ITEM_TYPES } from "../constants.js";
import { gameState, runtimeState } from "../state.js";
import { ITEM_RARITIES } from "../constants.js";
import { ActionLog } from "../ui-action-log.js";

export const V21_ITEMS = {
  altus_exec_blade: {
    name: "Lame de l'Exécuteur doré",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "GILDED_EXECUTIONER",
    description:
      "Force +10. Convertit 45% de vos chances de critique en dégâts critiques. Accentue les finishers.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 10 + itemLevel;
    },
    applyMult: (stats, itemLevel) => {
      stats.critDamage += stats.critChance * (0.45 + 0.02 * itemLevel);
      stats.percentDamagePenetration += 0.04 + 0.01 * itemLevel;
    },
  },
  altus_exec_cloak: {
    name: "Manteau du verdict",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "GILDED_EXECUTIONER",
    description: "Armure +40. Votre silhouette gagne en précision létale.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 40 + itemLevel * 5;
      stats.critChance += 0.04 + itemLevel * 0.005;
    },
  },
  altus_exec_sigil: {
    name: "Sceau du bourreau",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "GILDED_EXECUTIONER",
    description:
      "Critique +8%. Les ennemis saignants prennent une exécution supplémentaire.",
    applyFlat: (stats, itemLevel) => {
      stats.critChance += 0.08 + itemLevel * 0.01;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const bleed = targetEffects.find((effect) => effect.id === "BLEED");
      if (!bleed) return;
      const bonus = Math.max(3, Math.floor((stats.strength || 0) * 0.18));
      targetEffects.__executionBonus = bonus;
      ActionLog(`Le sceau de l'exécuteur ouvre une fenêtre létale (+${bonus} dégâts).`, "log-crit");
    },
  },

  gelmir_dragon_fang: {
    name: "Crochet draconique de Gelmir",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "GELMIR_DRAGON",
    description:
      "+9 Force <em style='color: grey;'>(+1 / Niv)</em>. +5 Intelligence <em style='color: grey;'>(+1 tous les 2 / Niv)</em>. " +
      "23% de chance d'infliger 2 Brûlure <em style='color: grey;'>(+1% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 8 + itemLevel;
      stats.intelligence += 5 + Math.floor(itemLevel / 2);
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.22 + itemLevel * 0.01) {
        applyEffect(targetEffects, "BURN", 2);
        ActionLog("La morsure draconique allume une foudre brûlante.", "log-status");
      }
    },
  },
  gelmir_dragon_hide: {
    name: "Peau draconique calcinée",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "GELMIR_DRAGON",
    description:
      "+49 Armure <em style='color: grey;'>(+4 / Niv)</em>. +2 Résistance Gel <em style='color: grey;'>(+1 tous les 3 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 45 + itemLevel * 4;
      stats.resistances.gel += 2 + Math.floor(itemLevel / 3);
    },
  },
  gelmir_dragon_eye: {
    name: "Œil de dragon rougi",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "GELMIR_DRAGON",
    description:
      "+5,5% Chance de Critique <em style='color: grey;'>(+0,5% / Niv)</em>. " +
      "Convertit 24% de votre Intelligence en Dégâts de zone <em style='color: grey;'>(+2% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.critChance += 0.05 + itemLevel * 0.005;
    },
    applyMult: (stats, itemLevel) => {
      stats.splashDamage += Math.floor(stats.intelligence * (0.22 + itemLevel * 0.02));
    },
  },

  giant_breaker_maul: {
    name: "Marteau du briseur de géants",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "COLOSSUS_ARENA",
    description:
      "+16 Force <em style='color: grey;'>(+2 / Niv)</em>. +15 Armure <em style='color: grey;'>(+3 / Niv)</em>. " +
      "Arme lourde : vous perdez une attaque par tour, sans jamais descendre " +
      "sous une attaque.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 14 + itemLevel * 2;
      stats.armor += 12 + itemLevel * 3;
    },
    applyMult: (stats) => {
      // Math.max(1, stats.attacksPerTurn) ne faisait rien : la valeur etait
      // deja au moins 1. La description annoncait une cadence reduite, elle
      // l'est desormais pour de bon.
      stats.attacksPerTurn = Math.max(1, stats.attacksPerTurn - 1);
    },
  },
  arena_colossus_plate: {
    name: "Harnois des arènes gelées",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "COLOSSUS_ARENA",
    description:
      "+65 Armure <em style='color: grey;'>(+5 / Niv)</em>. +6 Vigueur <em style='color: grey;'>(+1 tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 60 + itemLevel * 5;
      stats.vigor += 6 + Math.floor(itemLevel / 2);
    },
  },
  arena_colossus_token: {
    name: "Jeton du gladiateur indompté",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "COLOSSUS_ARENA",
    description:
      "Convertit 13% de votre Armure en Force <em style='color: grey;'>(+1% / Niv)</em>.",
    applyMult: (stats, itemLevel) => {
      stats.strength += Math.floor(stats.armor * (0.12 + itemLevel * 0.01));
    },
  },

  azula_black_censer: {
    name: "Encensoir noir d'Azula",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "BLACK_REVENANT",
    description:
      "+10 Intelligence <em style='color: grey;'>(+1 / Niv)</em>. +3,5% Chance de Critique <em style='color: grey;'>(+0,5% / Niv)</em>. " +
      "19% de chance d'infliger 2 Putréfaction <em style='color: grey;'>(+1% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 9 + itemLevel;
      stats.critChance += 0.03 + itemLevel * 0.005;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.18 + itemLevel * 0.01) {
        applyEffect(targetEffects, "SCARLET_ROT", 2);
        ActionLog("L'encens noir laisse une putréfaction rituelle.", "log-status");
      }
    },
  },
  azula_black_veil: {
    name: "Voile du revenant noir",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "BLACK_REVENANT",
    description:
      "+33 Armure <em style='color: grey;'>(+3 / Niv)</em>. " +
      "+3 Résistance Putréfaction et +2 Résistance Folie <em style='color: grey;'>(+1 chacune tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 30 + itemLevel * 3;
      stats.resistances.putrefaction += 3 + Math.floor(itemLevel / 2);
      stats.resistances.folie += 2 + Math.floor(itemLevel / 2);
    },
  },
  azula_black_idol: {
    name: "Idole du crépuscule pourri",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "BLACK_REVENANT",
    description:
      "Par affliction active sur vous parmi Poison, Putréfaction, Gel et " +
      "Étourdissement : +6 Intelligence <em style='color: grey;'>(+1 / Niv)</em> et +4% Pénétration, " +
      "cette pénétration plafonnant à 20%.",
    applyMult: (stats, itemLevel) => {
      const statusCount = gameState.playerEffects.filter((effect) =>
        ["POISON", "SCARLET_ROT", "FROSTBITE", "STUN"].includes(effect.id),
      ).length;
      stats.intelligence += statusCount * (5 + itemLevel);
      stats.percentDamagePenetration += Math.min(0.2, statusCount * 0.04);
    },
  },

  talisman_posture: {
    name: "Talisman de posture de duelliste",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description:
      "+34 Armure <em style='color: grey;'>(+4 / Niv)</em>. +5,5% de réduction des dégâts de boss <em style='color: grey;'>(+0,5% / Niv)</em>. " +
      "Convertit 8,4% de votre Armure en Force <em style='color: grey;'>(+0,4% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 30 + itemLevel * 4;
      stats.bossMitigation += 0.05 + itemLevel * 0.005;
    },
    applyMult: (stats, itemLevel) => {
      stats.strength += Math.floor(stats.armor * (0.08 + itemLevel * 0.004));
    },
  },
  talisman_execution: {
    name: "Talisman du couperet final",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description:
      "+6,6% Chance de Critique <em style='color: grey;'>(+0,6% / Niv)</em>. +14% Dégâts Critiques <em style='color: grey;'>(+2% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.critChance += 0.06 + itemLevel * 0.006;
      stats.critDamage += 0.12 + itemLevel * 0.02;
    },
  },
  talisman_storm_dragon: {
    name: "Talisman de tempête draconique",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description:
      "+16 Dégâts de zone <em style='color: grey;'>(+6 / Niv)</em>. +4 Intelligence <em style='color: grey;'>(+1 tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.splashDamage += 10 + itemLevel * 6;
      stats.intelligence += 4 + Math.floor(itemLevel / 2);
    },
  },
  talisman_blackrot: {
    name: "Talisman de corruption rituelle",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    description:
      "Vos Résistances Poison, Gel, Folie et Putréfaction cumulées donnent " +
      "1,1% de Pénétration <em style='color: grey;'>(+0,1% / Niv)</em> et 0,44% de Chance de Critique <em style='color: grey;'>(+0,04% / Niv)</em> " +
      "par point, plafonnés à 25% et 12%.",
    applyMult: (stats, itemLevel) => {
      const totalRes =
        stats.resistances.poison +
        stats.resistances.gel +
        stats.resistances.folie +
        stats.resistances.putrefaction;
      stats.percentDamagePenetration += Math.min(
        0.25,
        totalRes * (0.01 + itemLevel * 0.001),
      );
      stats.critChance += Math.min(0.12, totalRes * (0.004 + itemLevel * 0.0004));
    },
  },
  talisman_wayfarer: {
    name: "Talisman du veilleur de sentier",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description:
      "+9% de runes gagnées <em style='color: grey;'>(+1% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.runeGainMult += 0.08 + itemLevel * 0.01;
    },
  },
};
