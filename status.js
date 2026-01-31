import {
  gameState,
  getEffectiveStats,
  getHealth,
  runtimeState,
} from "./state.js";

export const STATUS_EFFECTS = {
  POISON: {
    id: "POISON",
    name: "Poison",
    color: "#2ecc71",
    onTurnStart: (entity) => {
      const isPlayer = "currentHp" in entity;
      let damage = 0;

      if (isPlayer) {
        damage = Math.floor(gameState.stats.level * 0.7);
        entity.currentHp -= Math.min(damage, 1);
      } else {
        const eff = getEffectiveStats();
        const baseDot = Math.floor((entity.maxHp || 100) * 0.01);
        const bonusInt = Math.floor(eff.intelligence * 0.5);

        damage = Math.max(2, Math.floor(baseDot + bonusInt));
        entity.hp -= damage;
      }

      return {
        damage,
        message: `${entity.name} subit ${damage} dégâts de poison !`,
      };
    },
  },
  THORNS: {
    id: "THORNS",
    name: "Épines",
    color: "#148d0b",
    onBeingHit: (attacker, target, damageTaken) => {
      const isPlayerTarget = "currentHp" in target;
      let reflectDamage = Math.floor(damageTaken * 0.15);

      if (isPlayerTarget) {
        const effectiveStats = getEffectiveStats();
        reflectDamage += Math.floor(effectiveStats.vigor * 0.5);
      } else {
        reflectDamage += Math.floor(damageTaken * 0.15);
      }

      reflectDamage = Math.max(1, reflectDamage);

      if ("currentHp" in attacker) {
        attacker.currentHp -= reflectDamage;
      } else {
        attacker.hp -= reflectDamage;
      }

      return {
        damage: reflectDamage,
        message: `${!isPlayerTarget ? "Vous vous blessez" : attacker.name + " se blesse"} sur les épines ! (-${reflectDamage} PV)`,
      };
    },
  },
  BLEED: {
    id: "BLEED",
    name: "Saignement",
    color: "#e74c3c",
  },
  STUN: {
    id: "STUN",
    name: "Étourdi",
    color: "#f1c40f",
    onTurnStart: (entity) => {
      return {
        skipTurn: true,
        message: `${entity.name} est étourdi et ne peut pas agir !`,
      };
    },
  },
  SCARLET_ROT: {
    id: "SCARLET_ROT",
    name: "Putréfaction",
    color: "#922b21",
    onTurnStart: (entity) => {
      const damage = Math.max(2, Math.floor((entity.maxHp || 100) * 0.05));
      if (entity.hasOwnProperty("currentHp")) {
        entity.currentHp -= damage;
      } else {
        entity.hp -= damage;
      }
      return {
        damage,
        message: `${entity.name} est rongé par la putréfaction (-${damage} PV) !`,
      };
    },
  },
  BURN: {
    id: "BURN",
    name: "Brûlure",
    color: "#e74c3c",
    onTurnStart: (entity) => {
      const max = entity.maxHp || entity.hp || 100;
      let damage = 0;
      if (entity.hasOwnProperty("currentHp")) {
        const eff = getEffectiveStats();
        const maxHealth = getHealth(eff.vigor);
        damage = Math.min(
          Math.floor(maxHealth * 0.03),
          Math.floor((maxHealth - entity.currentHp) * 0.1),
        );
        entity.currentHp -= damage;
      } else {
        damage = Math.max(1, Math.floor((max * 0.1) / 2));
        entity.hp -= damage;
      }
      return {
        damage,
        message: `${entity.name} brûle ! (-${damage} PV)`,
      };
    },
  },
  FROSTBITE: {
    id: "FROSTBITE",
    name: "Gelure",
    color: "#3dd6c9",
  },
};
