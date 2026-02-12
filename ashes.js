import {
  gameState,
  getEffectiveStats,
  getHealth,
  runtimeState,
} from "./state.js";

export const ASHES_OF_WAR = {
  beginer_tarnished_heal: {
    name: "Soin du Sans-Éclat",
    description:
      "Restaure 5PV par niveau (max : 250 PV). +1 utilisation si vous avez battu un troll",
    get maxUses() {
      return gameState.world.unlockedBiomes.length > 1 ? 2 : 1;
    },
    effect: (stats, enemy) => {
      const healAmount = Math.min(gameState.stats.level * 5, 250);
      const maxHp = getHealth(getEffectiveStats().vigor);

      runtimeState.playerCurrentHp = Math.min(
        maxHp,
        runtimeState.playerCurrentHp + healAmount,
      );

      return {
        msg: `Vous récupérez ${healAmount} PV !`,
      };
    },
  },
  storm_stomp: {
    name: "Piétinement Tempétueux",
    description:
      "Augmente vos dégats légèrement et étourdit l'ennemi au prochain coup.",
    maxUses: 2,
    effect: (stats, enemy) => {
      return {
        damageMult: 1.2,
        status: { id: "STUN", duration: 1 },
        msg: "La tempête déséquilibre l'ennemi !",
      };
    },
  },
  bloody_slash: {
    name: "Entaille Sanglante",
    description:
      "Sacrifie 5% de vos PV max pour infliger d'énormes dégâts (x2.5) et 3 saignements.",
    maxUses: 3,
    effect: (stats, enemy) => {
      runtimeState.playerCurrentHp -= getHealth(
        getEffectiveStats().vigor * 0.05,
      );
      return {
        damageMult: 2.5,
        status: { id: "BLEED", duration: 3 },
        msg: "Une entaille sanglante déchire l'air !",
      };
    },
  },
  great_shield: {
    name: "Rempart Inébranlable",
    description: "Vous procure 25 d'armure pour le combat.(cumulable)",
    maxUses: 4,
    effect: (stats, enemy) => {
      runtimeState.playerArmorDebuff -= 25;
      return {
        msg: "Vous vous protégez derrière votre bouclier !",
      };
    },
  },
  hoarfrost_stomp: {
    name: "Frimas (Piétinement de Givre)",
    description:
      "Frappe le sol pour créer un cône de glace. Inflige des dégâts de zone (x1.5) et applique 5 charges de Gelure.",
    maxUses: 3,
    effect: (stats, enemy) => {
      return {
        damageMult: 1.5,
        status: { id: "FROSTBITE", duration: 5 },
        msg: "Une vague de givre se propage au sol !",
      };
    },
  },

  starcaller_cry: {
    name: "Cri des Astres",
    description:
      "Vous invoquez la gravité. Si l'ennemi principal a un effet de statut il subit 30% de dégâts supplémentaires",
    maxUses: 4,
    effect: (stats, enemy) => {
      const hasStatus = gameState.ennemyEffects.length > 0;
      return {
        damageMult: hasStatus ? 1.3 : 1.0,
        msg: hasStatus
          ? "La gravité écrase l'ennemi affaibli !"
          : "L'appel des astres résonne dans le vide...",
      };
    },
  },
};
