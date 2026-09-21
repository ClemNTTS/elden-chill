import assert from "node:assert/strict";
/*
 * Pastilles d'afflictions.
 *
 * L'affichage tranchait "cumuls ou duree" en nommant BLEED et FROSTBITE en
 * dur. La folie et le fleau mortel ont ete ajoutes au meme jeu de cumuls plus
 * tard : n'ayant pas de champ `duration`, ils affichaient "undefined" sous
 * l'icone et ne quittaient jamais la barre. Ce test garde la regle pour toute
 * affliction de STACKING_EFFECTS, celles a venir comprises.
 */
import test from "node:test";
import { STACKING_EFFECTS, decrireAffliction } from "../status-apply.js";
import { STATUS_EFFECTS } from "../status.js";

test("une affliction a cumuls affiche son nombre de cumuls", () => {
  for (const id of STACKING_EFFECTS) {
    assert.deepEqual(decrireAffliction({ id, stacks: 5 }), {
      visible: true,
      compteur: "5",
    });
    assert.equal(decrireAffliction({ id, stacks: 0 }).visible, false);
  }
});

test("aucune affliction n'affiche jamais 'undefined'", () => {
  for (const id of Object.keys(STATUS_EFFECTS)) {
    for (const effet of [
      { id, stacks: 3 },
      { id, duration: 3 },
      { id, duration: 99 },
    ]) {
      const vu = decrireAffliction(effet);
      if (vu.visible) assert.notEqual(vu.compteur, "undefined");
    }
  }
});

test("une affliction a duree se tait passe 50 tours, c'est un passif", () => {
  assert.deepEqual(decrireAffliction({ id: "POISON", duration: 3 }), {
    visible: true,
    compteur: "3",
  });
  assert.deepEqual(decrireAffliction({ id: "DEW_PROTECTION", duration: 99 }), {
    visible: true,
    compteur: "",
  });
  assert.equal(decrireAffliction({ id: "POISON", duration: 0 }).visible, false);
});
