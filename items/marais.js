import { ITEM_RARITIES, ITEM_TYPES } from "../constants.js";

/*
 * CHAROGNARD (Marais de la Charogne) — le Poison qui s'intensifie.
 *
 * Trois pieces autour d'une idee : chaque tic de Poison inflige devrait
 * laisser une trace, pas seulement mordre une fois et attendre le suivant.
 * La Faux pose un cumul de Toxine par tic (stats.toxineParTic, lu par
 * status.js) ; au seuil, la Toxine explose — voir TOXIN_THRESHOLD et le bloc
 * « SEUIL DE TOXINE » dans combat.js, et la panoplie CHAROGNARD dans
 * constants.js pour l'abaissement du seuil a 3 pieces.
 *
 * `stats.toxineParTic` est un GARDE-FOU, pas un detail : sans lui, n'importe
 * quel personnage qui pose du Poison — la Faucille de tier 1 comprise —
 * heriterait gratuitement de l'escalade. C'est cette arme precise qui ouvre
 * la voie.
 */

export const MARSH_ITEMS = {
  carrion_scythe: {
    name: "Faux du Charognard",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    set: "CHAROGNARD",
    description:
      "Intelligence +18% <em style='color: grey;'>(+1% / Niv)</em>. " +
      "45% de chance d'infliger 3 Poison <em style='color: grey;'>(+2% / Niv)</em>. " +
      "Chaque tic de Poison inflige laisse un cumul de Toxine, qui explose au seuil.",
    applyMult: (stats, itemLevel) => {
      stats.intelligence *= 1.18 + 0.01 * (itemLevel - 1);
      // Garde-fou : voir le commentaire d'en-tete. Pose inconditionnellement
      // des que l'arme est equipee, quel que soit son niveau.
      stats.toxineParTic = true;
    },
    onHitEffect: { id: "POISON", duration: 3, chance: 0.45 },
  },

  plague_hide_armor: {
    name: "Cuirasse pestilentielle",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "CHAROGNARD",
    description:
      "+130 Armure <em style='color: grey;'>(+8 / Niv)</em>. " +
      "Manier la peste a un prix : -12 Résistance Poison.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 130 + itemLevel * 8;
      // Malus assume, comme le Registre des Dettes ou l'Eclat de jarre
      // guerriere : l'objet est un pari, pas une amelioration seche.
      stats.resistances.poison -= 12;
    },
  },

  plague_amulet: {
    name: "Amulette de la peste",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    set: "CHAROGNARD",
    description:
      "Convertit 35% de votre Intelligence en Dégâts de zone " +
      "<em style='color: grey;'>(+2% / Niv)</em>. +8 Résistance Poison : de quoi manier " +
      "la charogne sans trop s'y salir.",
    applyFlat: (stats) => {
      stats.resistances.poison += 8;
    },
    applyMult: (stats, itemLevel) => {
      stats.splashDamage += Math.floor(
        stats.intelligence * (0.35 + 0.02 * (itemLevel - 1)),
      );
    },
  },
};
