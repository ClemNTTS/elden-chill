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
