import assert from "node:assert/strict";
/*
 * Renaissance : le parcours complet, et l'arbre.
 *
 * requestRebirth() plantait sur un import manquant (syncCritStats) juste apres
 * performRebirth() : la partie changeait en memoire, rien ne se sauvegardait
 * ni ne s'affichait, et le joueur devait rafraichir. Aucun test n'appelait le
 * vrai gestionnaire, seulement performRebirth().
 */
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { requestRebirth } = await import("../actions.js");
const rebirth = await import("../rebirth.js");

const pretARenaitre = () => {
  etatNeuf({ stats: { level: 185 } });
  state.gameState.world.isExploring = false;
  state.gameState.rebirth.finalCleared = true;
};

test("accepter la Renaissance l'execute jusqu'au bout et recharge la page", () => {
  pretARenaitre();
  const avant = rebirth.getRebirthCount();
  let recharge = 0;
  const { confirm, alert } = globalThis;
  const reload = globalThis.location.reload;
  globalThis.confirm = () => true;
  globalThis.alert = () => {};
  globalThis.location.reload = () => {
    recharge += 1;
  };
  try {
    assert.doesNotThrow(() => requestRebirth());
  } finally {
    Object.assign(globalThis, { confirm, alert });
    globalThis.location.reload = reload;
  }
  assert.equal(rebirth.getRebirthCount(), avant + 1);
  assert.equal(state.gameState.stats.level, 0);
  assert.equal(recharge, 1);
});

test("Grace persistante plafonne a 2 rangs, le 3e point est rendu", () => {
  pretARenaitre();
  state.gameState.rebirth.count = 2; // 4 points
  state.gameState.rebirth.tree.grace = 3; // ancienne sauvegarde
  assert.equal(rebirth.getNodeRank("grace"), 2);
  assert.equal(rebirth.getRebirthPointsAvailable(), 2);
});

test("les trois nouvelles voies de combat s'appliquent", () => {
  etatNeuf();
  const sans = state.getEffectiveStats();
  state.gameState.rebirth.tree.eye = 5;
  state.gameState.rebirth.tree.bark = 5;
  state.gameState.rebirth.tree.edge = 5;
  const avec = state.getEffectiveStats();
  assert.ok(Math.abs(avec.critChance - sans.critChance - 0.1) < 1e-9);
  assert.equal(avec.armor, Math.round(sans.armor * 1.25));
  assert.ok(Math.abs(rebirth.getRebirthDamageMult() - 1.2) < 1e-9);
});

test("Peau de tempete et Brise-Armure s'appliquent", () => {
  etatNeuf();
  const sans = state.getEffectiveStats();
  state.gameState.rebirth.tree.storm = 5;
  state.gameState.rebirth.tree.breaker = 5;
  const avec = state.getEffectiveStats();
  for (const cle of Object.keys(sans.resistances)) {
    assert.equal(avec.resistances[cle], sans.resistances[cle] + 5);
  }
  assert.ok(
    Math.abs(
      avec.percentDamagePenetration - sans.percentDamagePenetration - 0.15,
    ) < 1e-9,
  );
});

test("l'arbre compte dix voies, et ne se reinitialise plus", async () => {
  assert.equal(rebirth.REBIRTH_NODES.length, 10);
  assert.equal("resetRebirthTree" in rebirth, false);
  const actions = await import("../actions.js");
  assert.equal("respecRebirthTree" in actions, false);
});

test("investir un point demande confirmation", async () => {
  pretARenaitre();
  state.gameState.rebirth.count = 1; // 2 points
  const { investRebirthNode } = await import("../actions.js");
  const { confirm } = globalThis;
  try {
    globalThis.confirm = () => false;
    investRebirthNode("edge");
    assert.equal(rebirth.getNodeRank("edge"), 0);
    globalThis.confirm = () => true;
    investRebirthNode("edge");
    assert.equal(rebirth.getNodeRank("edge"), 1);
  } finally {
    globalThis.confirm = confirm;
  }
});

test("reinitialiser la sauvegarde efface aussi l'arbre de renaissance", async () => {
  etatNeuf();
  state.gameState.rebirth.count = 3;
  state.gameState.rebirth.tree.edge = 5;
  const { resetGameState } = await import("../save.js");
  resetGameState();
  assert.equal(rebirth.getRebirthCount(), 0);
  assert.equal(rebirth.getNodeRank("edge"), 0);
});
