import assert from "node:assert/strict";
/*
 * Baton de Pierre d'Eclat Carien : le soin par coup est plafonne a 45 PV.
 * Sans plafond, il suivait l'Intelligence et rendait la fin de partie triviale.
 */
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { ITEMS, SOIN_MAX_BATON_CARIEN } = await import("../item.js");
const baton = ITEMS.carian_glintstone_staff;

const soinPour = (intelligence) => {
  etatNeuf({ stats: { vigor: 60 } });
  state.runtimeState.playerCurrentHp = 1; // de la marge pour soigner
  const avant = state.runtimeState.playerCurrentHp;
  baton.funcOnHit({ intelligence, vigor: 60 }, [], 10);
  return state.runtimeState.playerCurrentHp - avant;
};

test("en fin de partie, le soin ne depasse pas 45 PV par coup", () => {
  assert.equal(SOIN_MAX_BATON_CARIEN, 45);
  assert.equal(soinPour(600), 45);
});

test("sous le plafond, le soin reste proportionnel a l'Intelligence", () => {
  // 40% de 50 = 20 PV, sous le plafond.
  assert.equal(soinPour(50), 20);
});
