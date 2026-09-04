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
]);

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
