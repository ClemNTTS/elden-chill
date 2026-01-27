import { runtimeState } from "./state.js";
import { STATUS_EFFECTS } from "./status.js"; 

export const ASHES_OF_WAR = {
  storm_stomp: {
    name: "Piétinement Tempétueux",
    description:
      "Augmente vos dégats légèrement et étourdit l'ennemi au prochain coup.",
    maxUses: 3,
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
      "Sacrifie un peu de PV pour infliger d'énormes dégâts de saignement.",
    maxUses: 2,
    effect: (stats, enemy) => {
      runtimeState.playerCurrentHp -= 20; // Risque/Récompense
      return {
        damageMult: 2.5,
        status: { id: "BLEED", duration: 3 },
        msg: "Une entaille sanglante déchire l'air !",
      };
    },
  },
};
