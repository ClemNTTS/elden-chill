import { gameState, getHealth, runtimeState } from "./state.js";

export const STATUS_EFFECTS = {
  POISON: {
    id: "POISON",
    name: "Poison",
    color: "#2ecc71",
    onTurnStart: (entity) => {
      const damage = Math.max(1, Math.floor((entity.maxHp || 100) * 0.03));
      if (entity.hasOwnProperty("currentHp")) {
        entity.currentHp -= damage;
      } else {
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
    onBeingHit: (attacker, _, damageTaken) => {
      const reflectDamage = Math.max(1, Math.floor(damageTaken * 0.15));
      if (attacker.name && attacker.name === "player") {
        runtimeState.playerCurrentHp -= reflectDamage;
      } else {
        attacker.hp -= reflectDamage;
      }

      return {
        damage: reflectDamage,
        message: `${attacker.name === "player" ? "Vous vous blessez" : attacker.name + " se blesse"} sur les épines ! (-${reflectDamage} PV)`,
      };
    },
  },
  BLEED: {
  id: "BLEED",
  name: "Saignement",
  color: "#e74c3c",
  onBeingHit: (attacker, defender, damageTaken) => {
    if (Math.random() < 0.2) {
      let bonus;
      let message;

      // Use currentHp / hp consistently
      const currentHp = defender.currentHp ?? defender.hp ?? 0;
      const maxHp = defender.maxHp ?? getHealth(gameState.stats.vigor);

      bonus = Math.floor(maxHp * 0.1);

      // Apply damage to the entity passed in
      if ("currentHp" in defender) {
        defender.currentHp = Math.max(0, currentHp - bonus);
      } else if ("hp" in defender) {
        defender.hp = Math.max(0, currentHp - bonus);
      }

      if ("currentHp" in defender) { //la repetition est volontaire pour garder la clarté et permettre des messages différents si besoin
        message = `HÉMORRAGIE ! ${defender.name} subit ${bonus} dégâts !`;
      } else {
        message = `HÉMORRAGIE ! ${defender.name} subit ${bonus} dégâts !`;
      }

      return { damage: bonus, message };
    }
  },
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
        const maxHealth = getHealth(gameState.stats.vigor);
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
};