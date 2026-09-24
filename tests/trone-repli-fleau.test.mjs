import assert from "node:assert/strict";
/*
 * Trone d'Elden : "Nulle part ou fuir" et Fleau mortel.
 *
 * 1. Le repli n'est interdit que jusqu'a la premiere victoire sur le boss.
 *    L'expedition enchaine les cycles seule : un blocage permanent ne laissait
 *    que la mort pour sortir.
 * 2. Quand c'est le JOUEUR qui porte douze cumuls, c'est lui qui paie, et pas
 *    l'ennemi qui le frappe.
 */
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { repliInterdit } = await import("../biome-traits.js");
const { performAttack } = await import("../combat.js");

const auTrone = () => {
  etatNeuf();
  state.gameState.world.isExploring = true;
  state.gameState.preparation.activeRunBuffs = [{ noRetreat: 1 }];
};

test("le repli est bloque au Trone tant que le boss n'est pas tombe", () => {
  auTrone();
  state.runtimeState.currentLoopCount = 0;
  assert.equal(repliInterdit(), true);
});

test("le repli redevient possible des le premier cycle boucle", () => {
  auTrone();
  state.runtimeState.currentLoopCount = 1;
  assert.equal(repliInterdit(), false);
});

test("hors du Trone, rien ne bloque le repli", () => {
  etatNeuf();
  state.gameState.world.isExploring = true;
  state.runtimeState.currentLoopCount = 0;
  assert.equal(repliInterdit(), false);
});

test("douze cumuls sur le joueur : le joueur perd les PV, pas l'ennemi", () => {
  etatNeuf();
  const effets = [{ id: "DEATH_BLIGHT", stacks: 12, duration: 1 }];
  const ennemi = { name: "Radagon", hp: 7000, maxHp: 7000, atk: 300 };
  const joueur = { name: "Votre heros", currentHp: 5000, maxHp: 5000 };
  const alea = Math.random;
  Math.random = () => 0.99; // ni esquive, ni critique
  try {
    performAttack({
      attackers: [ennemi],
      target: joueur,
      targetGroup: null,
      targetEffects: effets,
      stats: null,
      logPrefix: ennemi.name,
      isPlayer: false,
    });
  } finally {
    Math.random = alea;
  }
  assert.equal(ennemi.hp, 7000);
  assert.ok(5000 - joueur.currentHp > 300, "le fleau s'ajoute au coup");
  assert.equal(
    effets.some((e) => e.id === "DEATH_BLIGHT"),
    false,
    "les cumuls sont consommes",
  );
});
