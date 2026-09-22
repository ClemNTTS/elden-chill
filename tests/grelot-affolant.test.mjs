/*
 * Grelot affolant (madding_charm) : sa source de Folie.
 *
 * La faucille du celebrant (meme set FESTIVAL) pose la Folie sur l'ENNEMI,
 * jamais sur le joueur. L'ancienne version du grelot lisait les cumuls du
 * joueur : rien ne les lui donnait jamais, l'objet etait mort. Il lit
 * desormais ceux de la cible.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { ITEMS } = await import("../item.js");
const grelot = ITEMS.madding_charm;

test("sans Folie sur la cible, le grelot ne rend rien", () => {
  etatNeuf();
  state.gameState.ennemyEffects = [];
  const stats = { strength: 100 };
  grelot.applyMult(stats, 1);
  assert.equal(stats.strength, 100);
});

test("le grelot paie sur les cumuls de Folie de la cible, pas du joueur", () => {
  etatNeuf();
  state.gameState.ennemyEffects = [{ id: "MADNESS", stacks: 5, duration: 2 }];
  state.gameState.playerEffects = [{ id: "MADNESS", stacks: 99, duration: 2 }];
  const stats = { strength: 100 };
  grelot.applyMult(stats, 1);
  // 5 cumuls * (2 + floor(1/3)) = 10
  assert.equal(stats.strength, 110);
});

test("le bonus grandit avec le niveau de l'objet", () => {
  etatNeuf();
  state.gameState.ennemyEffects = [{ id: "MADNESS", stacks: 5, duration: 2 }];
  const stats = { strength: 100 };
  grelot.applyMult(stats, 10);
  // 5 cumuls * (2 + floor(10/3)) = 25
  assert.equal(stats.strength, 125);
});
