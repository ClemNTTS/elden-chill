/*
 * Application d'une affliction sur une cible.
 *
 * Ce module n'existe que pour rompre un cycle d'imports.
 *
 * `applyEffect` vivait dans combat.js. Or combat.js remonte jusqu'a ui.js et
 * core.js, donc jusqu'a game.js et son objet window : les huit modules de
 * DONNEES qui appliquent une affliction (ashes.js, item.js, biome-traits.js et
 * les cinq tables d'objets) tiraient ainsi tout le moteur d'affichage derriere
 * eux, et ashes.js <-> combat.js formait en prime un cycle direct.
 *
 * Le cout etait concret : aucun de ces modules ne s'important hors navigateur,
 * ils etaient intestables. tools/audit-cendres.mjs le contourne en lisant
 * ashes.js au TEXTE avec une expression reguliere, faute de pouvoir l'importer.
 *
 * Ici, la seule dependance est systems.js, qui ne connait pas l'affichage.
 */
import { adjustStatusApplication } from "./systems.js";

/** Afflictions qui s'accumulent au lieu de durer un nombre de tours. */
export const STACKING_EFFECTS = new Set([
  "BLEED",
  "FROSTBITE",
  "MADNESS",
  "DEATH_BLIGHT",
  // Toxine : cumul pose par un tic de Poison quand l'equipement le permet
  // (voir stats.toxineParTic dans status.js). Explose au seuil, comme les
  // quatre autres.
  "TOXIN",
]);

/**
 * Ce que fait chaque affliction, pour le panneau au survol de son icone en
 * combat. Les chiffres recopient les regles de status.js et combat.js
 * (seuils, pourcentages, plafonds) : a mettre a jour avec elles.
 */
export const DESCRIPTIONS_AFFLICTIONS = {
  POISON:
    "Inflige des dégâts à chaque tour, sans tenir compte de l'armure. Sur un ennemi, ils grandissent avec votre Intelligence.",
  THORNS:
    "Renvoie une partie des dégâts reçus à celui qui frappe. Sur le Sans-éclat, le renvoi grandit avec la Vigueur.",
  BLEED:
    "S'accumule. À chaque coup reçu, 10 % de chance par cumul de déclencher une hémorragie : +20 % de dégâts par cumul sur ce coup, puis les cumuls sont consommés.",
  STUN: "La cible perd ses tours tant que l'effet dure.",
  SCARLET_ROT:
    "Ronge 5 % des PV max à chaque tour. Sur un ennemi, plafonné à la moitié de votre dernier coup.",
  BURN: "Dégâts à chaque tour, d'autant plus forts que la cible est déjà blessée. Sur un ennemi, bonus d'Intelligence plafonné à la moitié de votre dernier coup.",
  FROSTBITE:
    "S'accumule. À 10 cumuls, la gelure éclate : 10 % des PV max en dégâts (plafonné, réduit contre les boss) et 20 d'armure en moins.",
  TOXIN:
    "S'accumule avec le Poison. Au seuil (8 cumuls, 6 avec la panoplie du Charognard toxique), la toxine éclate : 8 % des PV max en dégâts, plafonné.",
  MADNESS:
    "S'accumule. À 8 cumuls, l'esprit cède : gros surplus de dégâts sur le coup et un tour perdu.",
  DEATH_BLIGHT:
    "S'accumule. À 12 cumuls, la cible perd 12 % de ses PV max sur le coup suivant, plafonné.",
  SLEEP: "La cible perd ses tours, mais se réveille au premier coup encaissé.",
  DEW_PROTECTION: "+50 d'armure tant que l'effet dure.",
};

/**
 * Ce qu'une affliction doit afficher : rien si elle est eteinte, sinon le
 * nombre a mettre sur la pastille.
 *
 * Vit ici, avec STACKING_EFFECTS, et non dans ui.js : l'affichage nommait
 * BLEED et FROSTBITE en dur, si bien que la folie et le fleau mortel, ajoutes
 * ensuite au meme jeu de cumuls, affichaient "undefined" et ne disparaissaient
 * jamais de la barre. La question « cumuls ou duree ? » n'a qu'une reponse,
 * elle ne doit exister qu'a un seul endroit.
 *
 * Une duree de 50 ou plus est un passif : on n'affiche pas de compteur.
 */
export const decrireAffliction = (effet) => {
  if (STACKING_EFFECTS.has(effet.id)) {
    const cumuls = effet.stacks || 0;
    return cumuls > 0
      ? { visible: true, compteur: String(cumuls) }
      : { visible: false };
  }
  const duree = effet.duration || 0;
  if (duree <= 0) return { visible: false };
  return { visible: true, compteur: duree >= 50 ? "" : String(duree) };
};

export const applyEffect = (targetEffects, effectId, value) => {
  if (!targetEffects.__owner) {
    targetEffects.__owner = true;
  }
  // value can be duration or stacks
  const existing = targetEffects.find((e) => e.id === effectId);
  const adjustedValue = adjustStatusApplication(
    effectId,
    value || 1,
    targetEffects,
  );
  if (STACKING_EFFECTS.has(effectId)) {
    if (existing) {
      existing.stacks = (existing.stacks || 0) + adjustedValue;
    } else {
      targetEffects.push({ id: effectId, stacks: adjustedValue });
    }
  } else {
    if (existing) {
      existing.duration = Math.max(existing.duration, adjustedValue);
    } else {
      targetEffects.push({ id: effectId, duration: adjustedValue });
    }
  }
};
