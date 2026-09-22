import assert from "node:assert/strict";
/*
 * Plafond de la putrefaction.
 *
 * Elle etait la seule affliction que rien ne bornait : 5% des points de vie
 * maximum par tour, quelle que soit la force du joueur. Sa part des degats
 * passait de 29% sur le boss d'Altus a 71% sur la Bete d'Elden, sur le meme
 * build — assez pour que tous les archetypes abandonnent leur arme au profit
 * d'une arme a putrefaction. Elle suit desormais la meme regle que la gelure
 * et le fleau mortel : bornee par le coup du joueur.
 */
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { STATUS_EFFECTS } = await import("../status.js");
const putrefaction = STATUS_EFFECTS.SCARLET_ROT;
const ennemi = (maxHp) => ({ name: "cible", maxHp, hp: maxHp });

// Chance de critique a 0 partout : depuis que les tics peuvent criter (voir
// critTick dans status.js), un critique ferait varier ces valeurs figees et
// rendrait ces tests intermittents. Le critique a son propre test.
test("sans coup de reference, la putrefaction tique a plein", () => {
  etatNeuf({ stats: { critChance: 0 } });
  state.runtimeState.degatsJoueurDuTour = 0;
  assert.equal(putrefaction.onTurnStart(ennemi(10000)).damage, 500);
});

test("le coup du joueur borne la putrefaction a sa moitie", () => {
  etatNeuf({ stats: { critChance: 0 } });
  state.runtimeState.degatsJoueurDuTour = 200;
  assert.equal(putrefaction.onTurnStart(ennemi(10000)).damage, 100);
});

test("un gros cogneur garde les 5% pleins, le plafond ne mord pas", () => {
  etatNeuf({ stats: { critChance: 0 } });
  state.runtimeState.degatsJoueurDuTour = 4000;
  assert.equal(putrefaction.onTurnStart(ennemi(10000)).damage, 500);
});

test("la part de la putrefaction ne gonfle plus avec la vie du boss", () => {
  etatNeuf({ stats: { critChance: 0 } });
  const coup = 1000;
  state.runtimeState.degatsJoueurDuTour = coup;
  const part = (pv) => {
    const d = putrefaction.onTurnStart(ennemi(pv)).damage;
    return d / (d + coup);
  };
  // 8 500 PV : le boss d'Altus. 78 000 : la Bete d'Elden.
  assert.ok(Math.abs(part(78000) - part(8500)) < 0.2);
  assert.ok(part(78000) <= 0.34);
});

test("subie par le joueur, elle reste a 5% : c'est une menace, pas une arme", () => {
  const partie = etatNeuf({ stats: { critChance: 0 } });
  partie.stats.resistances = {};
  state.runtimeState.degatsJoueurDuTour = 10; // un coup derisoire ne l'adoucit pas
  const joueur = { currentHp: 4000 };
  const { damage } = putrefaction.onTurnStart({ ...joueur, maxHp: 4000 });
  assert.equal(damage, 200);
});
