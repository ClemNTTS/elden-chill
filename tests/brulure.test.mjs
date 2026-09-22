/*
 * Bonus d'Intelligence sur la Brulure, et son plafond.
 *
 * Avant ce changement, aucune affliction sur la duree ne recompensait
 * l'Intelligence sauf le Poison : un personnage d'Intelligence n'avait plus
 * qu'une seule voie qui compte en fin de partie, convertir l'Intelligence en
 * Force (Loretta, Marteau de Haima). Voir le commentaire dans status.js.
 *
 * Le bonus est plafonne a la moitie du dernier coup du joueur, exactement
 * comme la Putrefaction (voir tests/putrefaction.test.mjs) : c'est un
 * complement a une arme, pas un remplacement.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { STATUS_EFFECTS } = await import("../status.js");
const brulure = STATUS_EFFECTS.BURN;
// maxHp - hp = 50 000, assez pour que le plafond « 10% de l'ecart » ne morde
// pas sur la base a 2% de maxHp (2 000).
const ennemi = () => ({ name: "cible", maxHp: 100000, hp: 50000 });

test("sans intelligence, la brulure ne change pas", () => {
  etatNeuf({ stats: { intelligence: 0 } });
  state.runtimeState.degatsJoueurDuTour = 0;
  assert.equal(brulure.onTurnStart(ennemi()).damage, 2000);
});

test("sans coup de reference, le bonus d'intelligence tique a plein", () => {
  etatNeuf({ stats: { intelligence: 200 } });
  state.runtimeState.degatsJoueurDuTour = 0;
  // base 2000 + bonusInt floor(200*0.5) = 100
  assert.equal(brulure.onTurnStart(ennemi()).damage, 2100);
});

test("le coup du joueur borne le bonus a sa moitie", () => {
  etatNeuf({ stats: { intelligence: 200 } });
  state.runtimeState.degatsJoueurDuTour = 100;
  // bonusInt = 100, plafond = floor(100*0.5) = 50 : le plafond mord
  assert.equal(brulure.onTurnStart(ennemi()).damage, 2050);
});

test("un gros cogneur garde son bonus plein, le plafond ne mord pas", () => {
  etatNeuf({ stats: { intelligence: 200 } });
  state.runtimeState.degatsJoueurDuTour = 1000;
  // plafond = 500, tres au-dessus du bonusInt de 100
  assert.equal(brulure.onTurnStart(ennemi()).damage, 2100);
});

test("subie par le joueur, la brulure ignore l'intelligence de l'ennemi", () => {
  const partie = etatNeuf({ stats: { vigor: 100 } });
  partie.stats.resistances = {};
  const maxHealth = state.getHealth(state.getEffectiveStats().vigor);
  const joueur = { currentHp: Math.floor(maxHealth * 0.5) };
  const { damage } = brulure.onTurnStart(joueur);
  assert.equal(damage, Math.floor(maxHealth * 0.03));
});
