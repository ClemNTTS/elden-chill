import { applyEffect } from "../combat.js";
import { ITEM_TYPES } from "../constants.js";
import { gameState, runtimeState } from "../state.js";
import { ITEM_RARITIES } from "../systems.js";
import { ActionLog } from "../ui.js";

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
      "Force et Intelligence. Vos coups peuvent déposer une morsure de foudre.",
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
    description: "Résistance accrue au feu, au gel et aux pics de dégâts.",
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
    description: "Chance de critique et dégâts d'explosion liés à l'Intelligence.",
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
    description: "Force massive, cadence plus faible mais posture écrasante.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 14 + itemLevel * 2;
      stats.armor += 12 + itemLevel * 3;
    },
    applyMult: (stats) => {
      stats.attacksPerTurn = Math.max(1, stats.attacksPerTurn);
    },
  },
  arena_colossus_plate: {
    name: "Harnois des arènes gelées",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "COLOSSUS_ARENA",
    description: "Armure et vigueur. Chaque coup reçu alimente votre posture.",
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
    description: "Convertit une partie de l'armure en force brutale.",
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
      "Arme cérémonielle. Intelligence, critique et putréfaction se répondent.",
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
    description: "Tenue légère dédiée aux expéditions corrompues.",
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
      "Les statuts hostiles deviennent un levier offensif au lieu d'être un poids.",
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
    description: "Réduit les dégâts lourds et transforme l'armure en force défensive.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 30 + itemLevel * 4;
      stats.bossMitigation += 0.05 + itemLevel * 0.005;
    },
    applyMult: (stats) => {
      stats.strength += Math.floor(stats.armor * 0.08);
    },
  },
  talisman_execution: {
    name: "Talisman du couperet final",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: "Punition accrue sur les ennemis déjà affaiblis.",
    applyFlat: (stats, itemLevel) => {
      stats.critChance += 0.06 + itemLevel * 0.006;
      stats.critDamage += 0.12 + itemLevel * 0.02;
    },
  },
  talisman_storm_dragon: {
    name: "Talisman de tempête draconique",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: "Foudre et souffle gagnent en portée et en éclat.",
    applyFlat: (stats, itemLevel) => {
      stats.splashDamage += 10 + itemLevel * 6;
      stats.intelligence += 4 + Math.floor(itemLevel / 2);
    },
  },
  talisman_blackrot: {
    name: "Talisman de corruption rituelle",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    description: "Convertit une part de vos résistances en pénétration et critique.",
    applyMult: (stats, itemLevel) => {
      const totalRes =
        stats.resistances.poison +
        stats.resistances.gel +
        stats.resistances.folie +
        stats.resistances.putrefaction;
      stats.percentDamagePenetration += Math.min(0.25, totalRes * 0.01);
      stats.critChance += Math.min(0.12, totalRes * 0.004);
    },
  },
  talisman_wayfarer: {
    name: "Talisman du veilleur de sentier",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: "Affûte la route: meilleures rencontres et plus de butin rare.",
    applyFlat: (stats, itemLevel) => {
      stats.runeGainMult += 0.08 + itemLevel * 0.01;
    },
  },
};
