import { rollCrit } from "./crit.js";
import {
  gameState,
  getEffectiveStats,
  getHealth,
  healPlayer,
  runtimeState,
} from "./state.js";
import { applyEffect } from "./status-apply.js";
import { getResistanceForEffect } from "./systems.js";

/*
 * Critique sur un tic d'affliction.
 *
 * Le Saignement, la Gelure, la Folie et le Fleau mortel critent deja : leur
 * bonus s'ajoute au coup AVANT le jet de critique dans combat.js, qui les
 * multiplie donc avec le reste. Poison, Putrefaction et Brulure sont calcules
 * ICI, a part, et un jet de critique ne les touchait jamais — un build
 * construit sur eux ne tirait donc rien de ses points de critique sur cette
 * part de ses degats, contrairement a un build qui ne fait que taper.
 *
 * Le bonus est a MOITIE de celui d'un coup normal : ces trois afflictions
 * ignorent deja l'armure (POISON, BRULURE) ou sont plafonnees par rapport au
 * coup du joueur (BRULURE, PUTREFACTION) — un critique plein en plus les
 * ferait cumuler deux avantages a la fois.
 */
const critTick = (eff, degats) => {
  const crit = rollCrit(eff);
  if (!crit.isCrit) return degats;
  return Math.floor(degats * (1 + (crit.multiplier - 1) * 0.5));
};

export const STATUS_EFFECTS = {
  POISON: {
    id: "POISON",
    name: "Poison",
    color: "#2ecc71",
    onTurnStart: (entity, effectsArray) => {
      const isPlayer = "currentHp" in entity;
      let damage = 0;

      if (isPlayer) {
        damage = Math.max(
          1,
          Math.floor(
            gameState.stats.level *
              0.7 *
              (1 - Math.min(0.6, getResistanceForEffect("POISON") * 0.08)),
          ),
        );
        entity.currentHp -= damage;
      } else {
        const eff = getEffectiveStats();
        const baseDot = Math.floor((entity.maxHp || 100) * 0.01);
        const bonusInt = Math.floor(eff.intelligence * 0.5);

        damage = Math.max(2, critTick(eff, Math.floor(baseDot + bonusInt)));
        entity.hp -= damage;

        /*
         * Toxine : un cumul par tic, MAIS seulement si l'equipement le
         * permet (stats.toxineParTic). Sans ce garde-fou, tout personnage
         * qui pose du Poison — la Faucille de tier 1 comprise — gagnerait
         * gratuitement l'escalade du Charognard toxique. C'est un objet
         * precis qui ouvre cette voie, pas le Poison lui-meme.
         */
        if (eff.toxineParTic && effectsArray) {
          applyEffect(effectsArray, "TOXIN", 1);
        }

        /*
         * Vol de vie necromantique : meme principe, gate par
         * stats.poisonLifesteal (0 par defaut). Plafonne a 50% du tic : le
         * Poison ignore deja l'armure, un soin sans plafond en ferait une
         * source de vie infinie contre n'importe quel adversaire qui dure.
         */
        const vol = Math.min(0.5, eff.poisonLifesteal || 0);
        if (vol > 0) {
          const maxHp = getHealth(eff.vigor);
          const soin = healPlayer(Math.floor(damage * vol), maxHp);
          if (soin > 0) {
            return {
              damage,
              message: `${entity.name} subit ${damage} dégâts de poison, et vous en absorbez ${soin} !`,
            };
          }
        }
      }

      return {
        damage,
        message: isPlayer
          ? `Vous subissez ${damage} dégâts de poison !`
          : `${entity.name} subit ${damage} dégâts de poison !`,
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
        message: `${!isPlayerTarget ? "Vous vous blessez" : `${attacker.name} se blesse`} sur les épines ! (-${reflectDamage} PV)`,
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
      const isPlayer = "currentHp" in entity;
      return {
        skipTurn: true,
        message: isPlayer
          ? "Vous êtes étourdi et ne pouvez pas agir !"
          : `${entity.name} est étourdi et ne peut pas agir !`,
      };
    },
  },
  /*
   * Putrefaction. 5% des points de vie maximum par tour.
   *
   * SUBIE par le joueur, elle reste a 5% pleins, attenues par la resistance :
   * c'est une menace, et elle est calibree comme telle.
   *
   * INFLIGEE a un ennemi, elle est plafonnee par rapport au coup du joueur,
   * comme la gelure et le fleau mortel le sont deja (voir AFFLICTION_CAP dans
   * combat.js). Elle y avait echappe, et c'est la seule affliction que rien ne
   * bornait : sa part des degats passait de 29% sur le boss d'Altus a 71% sur
   * la Bete d'Elden, sur le MEME build, uniquement parce que le boss a plus de
   * vie. Tous les archetypes convergeaient donc vers une arme a putrefaction,
   * quitte a abandonner une arme trois fois plus forte au corps a corps :
   * l'affliction ne recompensait plus le build, elle le remplacait.
   *
   * Le plafond est a la moitie du coup, la ou la gelure accepte six fois le
   * sien : la gelure eclate une fois tous les dix cumuls, la putrefaction
   * tique a chaque tour. A cadence egale, les deux se valent.
   */
  SCARLET_ROT: {
    id: "SCARLET_ROT",
    name: "Putréfaction",
    color: "#922b21",
    onTurnStart: (entity) => {
      const baseDamage = Math.max(2, Math.floor((entity.maxHp || 100) * 0.05));
      const isPlayer = Object.hasOwn(entity, "currentHp");
      // Au tout premier tour, le joueur n'a pas encore frappe : faute de
      // reference, l'affliction tique a plein. Elle sera bornee des le tour
      // suivant.
      const reference = runtimeState.degatsJoueurDuTour;
      const damage = isPlayer
        ? Math.max(
            1,
            Math.floor(
              baseDamage *
                (1 -
                  Math.min(0.65, getResistanceForEffect("SCARLET_ROT") * 0.08)),
            ),
          )
        : critTick(
            getEffectiveStats(),
            reference > 0
              ? Math.max(2, Math.min(baseDamage, Math.floor(reference * 0.5)))
              : baseDamage,
          );

      if (isPlayer) {
        entity.currentHp -= damage;
      } else {
        entity.hp -= damage;
      }

      return {
        damage,
        message: isPlayer
          ? `Vous êtes rongé par la putréfaction (-${damage} PV) !`
          : `${entity.name} est rongé par la putréfaction (-${damage} PV) !`,
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
      const isPlayer = Object.hasOwn(entity, "currentHp");

      if (isPlayer) {
        const eff = getEffectiveStats();
        const maxHealth = getHealth(eff.vigor);
        damage = Math.min(
          Math.floor(maxHealth * 0.03),
          Math.floor((maxHealth - entity.currentHp) * 0.1),
        );
        damage = Math.max(
          1,
          Math.floor(
            damage *
              (1 - Math.min(0.55, getResistanceForEffect("BURN") * 0.06)),
          ),
        );
        entity.currentHp -= damage;
      } else {
        const base = Math.min(
          Math.floor(max * 0.02),
          Math.floor((max - entity.hp) * 0.1),
        );

        /*
         * Bonus d'Intelligence, sur le meme principe que POISON (bonusInt
         * ci-dessus) : sans lui, aucune affliction sur la duree ne recompensait
         * l'Intelligence, et tout personnage d'Intelligence n'avait plus qu'une
         * seule voie — convertir l'Intelligence en Force (Loretta, Marteau de
         * Haima) — pour compter en fin de partie.
         *
         * PLAFONNE, contrairement au bonus de POISON : la Putrefaction a deja
         * appris cette lecon a ce module (voir le commentaire au-dessus de
         * SCARLET_ROT) en tiquant a 5% des PV maximum sans aucun plafond —
         * tous les archetypes convergeaient vers une arme de putrefaction. La
         * Brulure est le point d'entree d'un axe de jeu voulu ("mage
         * pyromancien" : panoplies qui multiplient ou prolongent ses tics), et
         * l'ouvrir sans plafond recreerait exactement le meme piege des le
         * premier objet qui en boosterait la duree ou la cadence. Le bonus
         * reste donc borne a la moitie du dernier coup du joueur, comme la
         * Putrefaction : il complete un build a l'arme, il ne le remplace pas.
         */
        const eff = getEffectiveStats();
        const bonusInt = Math.floor(eff.intelligence * 0.5);
        const reference = runtimeState.degatsJoueurDuTour;
        const bonusPlafonne =
          reference > 0
            ? Math.min(bonusInt, Math.floor(reference * 0.5))
            : bonusInt;

        damage = critTick(eff, base + bonusPlafonne);
        entity.hp -= damage;
      }

      return {
        damage,
        message: isPlayer
          ? `Vous brûlez ! (-${damage} PV)`
          : `${entity.name} brûle ! (-${damage} PV)`,
      };
    },
  },
  FROSTBITE: {
    id: "FROSTBITE",
    name: "Gelure",
    color: "#3dd6c9",
  },
  /*
   * Toxine. Cumuls, comme la Gelure : rien ne se passe jusqu'au seuil, puis
   * tout part d'un coup. Le declenchement (SEUIL DE TOXINE) est dans
   * combat.js, la pose d'un cumul dans POISON.onTurnStart ci-dessus.
   */
  TOXIN: {
    id: "TOXIN",
    name: "Toxine",
    color: "#7ac74f",
  },
  /*
   * Folie. Elle comble un trou : `folie` existait comme resistance et comme
   * affliction de biome depuis toujours, mais aucun statut ne l'appliquait —
   * les biomes qui la declaraient n'avaient donc aucun effet propre.
   *
   * Fonctionne par cumuls, comme la gelure : rien ne se passe jusqu'au seuil,
   * puis tout part d'un coup. Le declenchement est dans combat.js.
   */
  MADNESS: {
    id: "MADNESS",
    name: "Folie",
    color: "#f1c40f",
  },

  /*
   * Fleau mortel. Cumuls egalement, mais le seuil frappe en pourcentage des
   * points de vie maximum : c'est la seule affliction qui menace autant une
   * cible a 4 000 000 de pv qu'une a 200. Dans le jeu d'origine elle tue net ;
   * ici elle prend un quart de la vie, ce qui reste brutal sans rendre une
   * expedition injouable sur un seul jet malheureux.
   */
  DEATH_BLIGHT: {
    id: "DEATH_BLIGHT",
    name: "Fleau mortel",
    color: "#8e8e9c",
  },

  /*
   * Sommeil. Fait sauter des tours, mais se dissipe au premier coup encaisse
   * (voir performAttack). C'est ce qui l'empeche d'etre un simple etourdissement
   * plus long : endormir une cible que l'on frappe soi-meme ne sert a rien, il
   * faut le jouer avec des degats sur la duree ou pour souffler.
   */
  SLEEP: {
    id: "SLEEP",
    name: "Sommeil",
    color: "#7d8ac4",
    onTurnStart: (entity) => {
      const isPlayer = "currentHp" in entity;
      return {
        skipTurn: true,
        message: isPlayer
          ? "Vous dormez debout et ne pouvez pas agir !"
          : `${entity.name} dort profondement.`,
      };
    },
  },

  DEW_PROTECTION: {
    id: "DEW_PROTECTION",
    name: "Protection de Rosée",
    color: "#85c1e9",
    onTurnStart: () => {
      return { message: "La rosée céleste renforce votre défense." };
    },
  },
};
