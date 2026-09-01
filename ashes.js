import { applyEffect } from "./combat.js";
import {
  gameState,
  getEffectiveStats,
  getHealth,
  runtimeState,
  healPlayer,
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

      healPlayer(healAmount, maxHp);

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
  executioners_step: {
    name: "Pas de l'Executeur",
    description:
      "Convertit le prochain coup en execution precise : degats critiques accrus et saignement.",
    maxUses: 3,
    effect: () => ({
      damageMult: 1.9,
      status: { id: "BLEED", duration: 4 },
      msg: "Votre pas se cale sur le rythme d'une execution nette.",
    }),
  },
  dragonstorm_howl: {
    name: "Hurlement de Tempete draconique",
    description:
      "Canalise Gelmir. Degats de zone renforces et brulure appliquee au prochain impact.",
    maxUses: 3,
    effect: () => ({
      damageMult: 1.45,
      status: { id: "BURN", duration: 2 },
      msg: "Le hurlement draconique enrobe votre prochain coup d'eclairs brulants.",
    }),
  },
  rotveil_litany: {
    name: "Litanie du Voile putride",
    description:
      "Applique la putrefaction au prochain coup et renforce legerement votre penetration.",
    maxUses: 3,
    effect: () => {
      runtimeState.nextAtkMultBonus = Math.max(runtimeState.nextAtkMultBonus, 1.25);
      return {
        status: { id: "SCARLET_ROT", duration: 2 },
        msg: "Le voile putride murmure et rend votre arme corruptrice.",
      };
    },
  },
  colossus_roar: {
    name: "Rugissement du Colosse",
    description:
      "Vous ancre dans le sol. Le prochain coup gagne puissance et votre armure augmente un instant.",
    maxUses: 2,
    effect: () => {
      runtimeState.playerArmorDebuff -= 35;
      return {
        damageMult: 1.55,
        msg: "Votre rugissement durcit l'air et braque le duel.",
      };
    },
  },
  astral_shatter: {
    name: "Fracture Astrale",
    description:
      "Convertit l'intelligence en degats de zone et stun legerement l'ennemi principal.",
    maxUses: 3,
    effect: () => ({
      damageMult: 1.25,
      status: { id: "STUN", duration: 1 },
      msg: "Une fracture astrale s'ouvre sous les pas de la menace.",
    }),
  },
  rootward_vow: {
    name: "Voeu du Garderacine",
    description:
      "Serment defensif. Releve votre armure et vous soigne legerement au passage.",
    maxUses: 3,
    effect: () => {
      runtimeState.playerArmorDebuff -= 30;
      const healAmount = Math.min(180, getHealth(getEffectiveStats().vigor) * 0.08);
      healPlayer(healAmount, getHealth(getEffectiveStats().vigor));
      return {
        msg: `Les racines referment vos plaies (+${Math.floor(healAmount)} PV).`,
      };
    },
  },
  /* ================================================================
     Cendres de la version complete.

     Chacune repond a un trait de biome precis plutot que d'ajouter un
     multiplicateur de plus : c'est la seule facon de rendre le choix de
     cendre dependant de la destination.
     ================================================================ */

  madding_toll: {
    name: "Glas affolant",
    description:
      "Retourne la Folie contre l'ennemi : 6 cumuls d'un coup, soit presque le seuil de declenchement.",
    maxUses: 3,
    effect: (stats, enemy) => {
      applyEffect(gameState.ennemyEffects, "MADNESS", 6);
      return { msg: "Le glas resonne : l'esprit d'en face vacille." };
    },
  },

  briar_riposte: {
    name: "Riposte de la Ronce",
    description:
      "Convertit votre armure en degats : un coup egal a 150% de votre armure effective.",
    maxUses: 2,
    effect: (stats) => {
      // Exprime en multiplicateur plutot qu'en degats fixes : le moteur ne lit
      // que damageMult, et un rapport armure/force reste lisible.
      const ratio = Math.max(1.2, Math.min(4, (stats.armor || 100) / Math.max(1, stats.strength) * 2));
      applyEffect(gameState.ennemyEffects, "THORNS", 3);
      return {
        damageMult: ratio,
        msg: `Les ronces jaillissent de votre garde (x${ratio.toFixed(1)}).`,
      };
    },
  },

  magma_eruption: {
    name: "Eruption de magma",
    description:
      "Frappe tout le groupe. Degats de zone egaux a 80% de votre Intelligence, plus la Brulure.",
    maxUses: 3,
    effect: (stats) => {
      // Le splash du tour vient de stats.splashDamage, lu par performAttack :
      // on le gonfle pour ce tour au lieu d'inventer un champ.
      stats.splashDamage += Math.floor((stats.intelligence || 0) * 0.8) + 40;
      return {
        damageMult: 1.3,
        status: { id: "BURN", duration: 4 },
        msg: "Le sol se fend et crache une gerbe de magma.",
      };
    },
  },

  sleep_pot: {
    name: "Pot de sommeil",
    description:
      "Endort la cible pour 2 tours. Le sommeil se brise au premier coup : a jouer pour souffler, pas pour enchainer.",
    maxUses: 2,
    effect: () => {
      applyEffect(gameState.ennemyEffects, "SLEEP", 2);
      return { msg: "Une vapeur epaisse retombe : l'ennemi ferme les yeux." };
    },
  },

  destined_cut: {
    name: "Entaille destinee",
    description:
      "Applique 6 cumuls de Fleau mortel. A douze, la cible perd un quart de sa vie maximale.",
    maxUses: 2,
    effect: () => {
      applyEffect(gameState.ennemyEffects, "DEATH_BLIGHT", 6);
      return { msg: "Une ligne noire s'ouvre dans l'air et suit la cible." };
    },
  },

  golden_vow: {
    name: "Voeu dore",
    description:
      "Le serment de l'Ordre : +40% de degats sur votre prochaine attaque, et 60 d'armure regagnee.",
    maxUses: 3,
    effect: () => {
      runtimeState.nextAtkMultBonus = 1.4;
      runtimeState.playerArmorDebuff -= 60;
      return { msg: "Le voeu dore se referme sur vous." };
    },
  },
};
