import assert from "node:assert/strict";
/*
 * Les `onTurnAction` sont du code isole : rien ne les appelle avant que le
 * monstre concerne apparaisse en jeu. La Larme Imitatrice lisait
 * `getEffectiveStats()` sans que monster.js l'importe — le combat se figeait
 * sur une ReferenceError, au douzieme palier de Nokron, c'est-a-dire a
 * l'endroit le plus couteux possible pour le joueur.
 *
 * Ce test execute chaque comportement au moins une fois, hors combat.
 */
import test from "node:test";
import { etatNeuf } from "./aide.mjs";

const { MONSTERS } = await import("../monster.js");

const comportements = Object.entries(MONSTERS).filter(
  ([, m]) => typeof m.onTurnAction === "function",
);

test("chaque monstre a un comportement de tour executable", () => {
  assert.ok(comportements.length > 0);
  etatNeuf();

  for (const [id, modele] of comportements) {
    // Deux tours : les comportements a bascule ou a declenchement unique
    // (durcissement, copie, explosion) passent par leurs deux branches.
    for (const pv of [modele.hp, Math.floor(modele.hp * 0.1)]) {
      const ennemi = { ...modele, maxHp: modele.hp, hp: pv };
      const joueur = { atk: 100, hp: 1000 };
      assert.doesNotThrow(
        () => modele.onTurnAction(ennemi, joueur),
        `onTurnAction de ${id} leve une erreur`,
      );
    }
  }
});
