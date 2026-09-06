import {
  gameState,
  getEffectiveStats,
  getHealth,
  healPlayer,
  runtimeState,
} from "./state.js";
import { applyEffect } from "./status-apply.js";

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
      "Sacrifie 5% de vos PV actuels pour infliger d'énormes dégâts (x2.5) et 3 saignements.",
    maxUses: 3,
    effect: (stats, enemy) => {
      // 5% des PV ACTUELS, pas des PV max : le cout suit l'etat reel du
      // joueur et ne peut jamais l'achever.
      //
      // L'ancienne ligne passait le 0.05 a getHealth() au lieu de l'appliquer
      // a son resultat : getHealth(vigor * 0.05) renvoyait le plancher de
      // 300 PV plus une poignee de points, soit un cout fixe bien superieur
      // aux 5% annonces en debut de partie.
      const cost = Math.floor(runtimeState.playerCurrentHp * 0.05);
      runtimeState.playerCurrentHp = Math.max(
        1,
        runtimeState.playerCurrentHp - cost,
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
      runtimeState.nextAtkMultBonus = Math.max(
        runtimeState.nextAtkMultBonus,
        1.25,
      );
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
      const healAmount = Math.min(
        180,
        getHealth(getEffectiveStats().vigor) * 0.08,
      );
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
      const ratio = Math.max(
        1.2,
        Math.min(4, ((stats.armor || 100) / Math.max(1, stats.strength)) * 2),
      );
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
  /* ================================================================== *
   * Cendres de fin de partie                                           *
   *                                                                    *
   * Les dix-huit premieres couvrent la montee ; passe le niveau 100, le*
   * joueur affrontait cinquante zones avec l'outillage du debut.       *
   *                                                                    *
   * DEUX REGLES ONT GOUVERNE CELLES-CI.                                *
   *                                                                    *
   * 1. Tout est exprime en POURCENTAGES ou en statistiques du joueur,  *
   *    jamais en nombres fixes. Un boss de fin a 95 000 PV, un boss de *
   *    debut en a 150 : une valeur ecrite en dur serait ridicule d'un  *
   *    cote ou de l'autre, et il faudrait la reajuster a chaque ajout  *
   *    de contenu.                                                     *
   *                                                                    *
   * 2. Chacune REPOND a quelque chose que la fin de partie oppose au   *
   *    joueur — un comportement de seconde phase, un rang de Ferveur,  *
   *    une armure devenue infranchissable. Une cendre qui se contente  *
   *    de taper plus fort n'ajoute pas une decision, elle ajoute un    *
   *    nombre.                                                         *
   * ================================================================== */

  /*
   * Reponse a la carapace : le seul comportement de phase que rien ne
   * traversait sans un investissement massif en Force.
   */
  order_decree: {
    name: "Decret de l'Ordre",
    description:
      "Le prochain coup ignore l'armure adverse. Plus la cible est blindee, plus le decret pese.",
    maxUses: 2,
    effect: (stats, enemy) => {
      /*
       * L'armure est soustraite aux degats par performAttack ; on ne peut pas
       * la contourner depuis ici. On la convertit donc en multiplicateur, ce
       * qui revient au meme et reste lisible dans le journal.
       */
      const armure = Math.max(0, enemy?.armor || 0);
      const frappe = Math.max(1, stats.strength || 1);
      const ratio = Math.max(1.5, Math.min(5, 1 + armure / frappe));
      return {
        damageMult: ratio,
        msg:
          "Le decret tombe : l'armure ne compte plus (x" +
          ratio.toFixed(1) +
          ").",
      };
    },
  },

  /*
   * Reponse a la regeneration et au drain. Sans elle, un boss qui se soigne
   * plus vite qu'on ne le frappe est une impasse totale : aucune duree de
   * combat n'en vient a bout, seul un meilleur build le peut. Cette cendre
   * offre la deuxieme reponse.
   */
  death_seal: {
    name: "Sceau de Mort",
    description:
      "Scelle les soins de la cible pendant 4 tours : regeneration, drain et absorption ne lui rendent plus rien.",
    maxUses: 2,
    effect: (_stats, enemy) => {
      if (!enemy) return {};
      enemy.soinsScelles = 4;
      return { msg: enemy.name + " ne se refermera plus." };
    },
  },

  /*
   * Reponse a l'invocation. Les degats de zone existaient sans avoir jamais
   * de moment ou ils sont indispensables : un boss qui se dedouble le leur
   * donne, et cette cendre les rend accessibles a tous les archetypes.
   */
  broken_echo: {
    name: "Echo brise",
    description:
      "Brise les echos : degats de zone egaux a 15% des PV restants de la cible principale.",
    maxUses: 2,
    effect: (stats, enemy) => {
      const eclat = Math.floor(Math.max(0, enemy?.hp || 0) * 0.15);
      stats.splashDamage += eclat;
      return {
        damageMult: 1.2,
        msg: "L'echo se fend et retombe sur les siens (" + eclat + " de zone).",
      };
    },
  },

  /*
   * Reponse a la malediction et a la mue. Un boss qui impose une affliction
   * chaque tour finit par en empiler quatre : les resistances y repondent en
   * amont, celle-ci y repond une fois qu'il est trop tard.
   */
  miquella_tear: {
    name: "Larme de Miquella",
    description: "Efface toutes vos afflictions et rend 35% de vos PV maximum.",
    maxUses: 1,
    effect: () => {
      const purgees = gameState.playerEffects.length;
      gameState.playerEffects.length = 0;

      const pvMax = getHealth(getEffectiveStats().vigor);
      healPlayer(Math.floor(pvMax * 0.35), pvMax);

      return {
        msg: purgees
          ? "La larme dissout " +
            purgees +
            " affliction(s) et referme vos plaies."
          : "La larme referme vos plaies.",
      };
    },
  },

  /*
   * Recompense le pari de la Ferveur.
   *
   * Jusqu'ici la Ferveur ne payait qu'en runes : elle rendait le combat plus
   * dur sans jamais rendre le joueur plus fort. Cette cendre convertit le rang
   * en puissance, et donne une raison de plus d'enchainer un cycle — donc de
   * laisser la reserve sur la table.
   */
  ashen_oath: {
    name: "Serment cendreux",
    description:
      "Convertit votre rang de Ferveur en puissance : +25% de degats par rang, jusqu'a x3,5.",
    maxUses: 2,
    effect: () => {
      const rang = Math.max(0, runtimeState.currentLoopCount || 0);
      const ratio = Math.min(3.5, 1 + rang * 0.25);
      return {
        damageMult: ratio,
        msg:
          "Le serment se nourrit de votre ferveur (x" + ratio.toFixed(2) + ").",
      };
    },
  },

  /*
   * La Vigueur ne servait qu'a encaisser. Elle devient une voie offensive —
   * la seule qui frappe sans rien devoir a une arme.
   */
  beast_roar: {
    name: "Rugissement bestial",
    description:
      "Change votre masse en menace : degats de zone egaux a 6% de vos PV maximum, et l'ennemi saigne.",
    maxUses: 3,
    effect: (stats) => {
      const pvMax = getHealth(getEffectiveStats().vigor);
      stats.splashDamage += Math.floor(pvMax * 0.06);
      applyEffect(gameState.ennemyEffects, "BLEED", 4);
      return { damageMult: 1.5, msg: "Le sanctuaire repond a votre cri." };
    },
  },

  /*
   * La Dexterite n'avait aucune cendre. Elle en recoit une qui joue son jeu :
   * pas un gros coup, mais deux de plus.
   */
  blade_dance: {
    name: "Danse des lames",
    description:
      "Deux attaques supplementaires au prochain tour, et le saignement pour les accompagner.",
    maxUses: 2,
    effect: () => {
      runtimeState.nextNbAtkBonus += 2;
      applyEffect(gameState.ennemyEffects, "BLEED", 3);
      return { msg: "Vos lames se dedoublent." };
    },
  },

  /*
   * Contrepoint de l'Eruption de magma : celle-ci concentre au lieu de
   * disperser. L'Intelligence avait de quoi nettoyer un groupe, rien pour
   * abattre une cible unique.
   */
  comet_azur: {
    name: "Comete d'Azur",
    description:
      "Un rayon continu sur une seule cible : degats doubles, plus 1% par point d'Intelligence, jusqu'a x6.",
    maxUses: 1,
    effect: (stats) => {
      const ratio = Math.min(6, 2 + (stats.intelligence || 0) * 0.01);
      return {
        damageMult: ratio,
        msg: "Le rayon ne faiblit pas (x" + ratio.toFixed(1) + ").",
      };
    },
  },

  /*
   * Voie des afflictions. Les objets qui posent des statuts existent, mais
   * aucune cendre n'en imposait DEUX : c'est la difference entre subir une
   * resistance et la contourner.
   */
  elphael_sting: {
    name: "Dard d'Elphael",
    description:
      "Putrefaction et saignement d'un seul geste, six cumuls chacun.",
    maxUses: 2,
    effect: () => {
      applyEffect(gameState.ennemyEffects, "SCARLET_ROT", 6);
      applyEffect(gameState.ennemyEffects, "BLEED", 6);
      return { msg: "Le dard entre, et deux poisons le suivent." };
    },
  },

  /*
   * Voie defensive de fin de partie. Le Rempart Inebranlable donne 25
   * d'armure, ce qui ne veut plus rien dire face a un boss qui frappe a 700 :
   * celle-ci est proportionnelle, donc elle vieillit avec le contenu.
   */
  jar_vessel: {
    name: "Vase des Geants",
    description:
      "Vous scelle dans la ceramique : armure augmentee de 40% de votre Vigueur pour le combat, et les ronces vous protegent.",
    maxUses: 2,
    effect: (stats) => {
      const gain = Math.floor((stats.vigor || 0) * 0.4) + 30;
      runtimeState.playerArmorDebuff -= gain;
      applyEffect(gameState.playerEffects, "THORNS", 4);
      return {
        msg: "La ceramique se referme sur vous (+" + gain + " d'armure).",
      };
    },
  },
};
