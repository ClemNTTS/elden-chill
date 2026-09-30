import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { terminerRetourAuCamp, handleDeath } = await import("../core.js");
const { toggleView } = await import("../ui.js");
const { loadGame, saveGame, SAVE_NAME } = await import("../save.js");

const preparer = () => {
  localStorage.clear();
  etatNeuf();
  state.gameState.runes = { banked: 815, carried: 348 };
  state.gameState.world.isExploring = true;
  state.runtimeState.ferveurBank = 0;
  state.runtimeState.currentLoopCount = 0;
};

test("retour volontaire : les runes sont sauvegardees avant l'affichage du Hub", () => {
  preparer();
  const getElement = document.getElementById;
  // Le moteur doit pouvoir terminer le repli meme si l'affichage echoue ensuite.
  document.getElementById = () => { throw new Error("affichage du camp"); };
  try {
    terminerRetourAuCamp();
  } finally {
    document.getElementById = getElement;
  }
  assert.deepEqual(state.gameState.runes, { banked: 1163, carried: 0 });
  assert.equal(state.gameState.world.isExploring, false);
  assert.equal(state.gameState.ui.currentScreen, "hub");
  const saved = localStorage.getItem(SAVE_NAME);
  assert.ok(saved);
  etatNeuf();
  loadGame();
  assert.deepEqual(state.gameState.runes, { banked: 1163, carried: 0 });
  assert.equal(localStorage.getItem(SAVE_NAME), saved);
});

test("le repli encaisse la Ferveur une seule fois", () => {
  preparer();
  state.runtimeState.ferveurBank = 42;
  terminerRetourAuCamp();
  terminerRetourAuCamp();
  assert.deepEqual(state.gameState.runes, { banked: 1205, carried: 0 });
  assert.equal(state.runtimeState.ferveurBank, 0);
});

test("le bouton de retour au camp appelle bien l'encaissement", () => {
  preparer();
  const timeout = globalThis.setTimeout;
  const fetch = globalThis.fetch;
  globalThis.setTimeout = () => 0;
  globalThis.fetch = async () => ({ json: async () => ({}) });
  try {
    toggleView("camp");
  } finally {
    globalThis.setTimeout = timeout;
    globalThis.fetch = fetch;
  }
  assert.deepEqual(state.gameState.runes, { banked: 1163, carried: 0 });
  assert.equal(state.gameState.world.isExploring, false);
});

test("un repli interdit ne transfere aucune rune", () => {
  preparer();
  state.gameState.preparation.activeRunBuffs = [{ noRetreat: 1 }];
  toggleView("camp");
  assert.deepEqual(state.gameState.runes, { banked: 815, carried: 348 });
  assert.equal(state.gameState.world.isExploring, true);
});

for (const exploring of [true, false]) {
  test(`chargement au camp : corrige les runes portees (expedition=${exploring})`, () => {
    preparer();
    state.gameState.world.isExploring = exploring;
    saveGame();
    etatNeuf();
    loadGame();
    assert.deepEqual(state.gameState.runes, { banked: 1163, carried: 0 });
    assert.equal(state.gameState.world.isExploring, false);
    const saved = localStorage.getItem(SAVE_NAME);
    etatNeuf();
    loadGame();
    assert.deepEqual(state.gameState.runes, { banked: 1163, carried: 0 });
    assert.equal(localStorage.getItem(SAVE_NAME), saved);
  });
}

test("la mort perd toujours les runes portees et la Ferveur", () => {
  preparer();
  state.runtimeState.ferveurBank = 42;
  const timeout = globalThis.setTimeout;
  globalThis.setTimeout = () => 0;
  try {
    handleDeath();
    terminerRetourAuCamp();
  } finally {
    globalThis.setTimeout = timeout;
  }
  assert.deepEqual(state.gameState.runes, { banked: 815, carried: 0 });
  assert.equal(state.runtimeState.ferveurBank, 0);
});
