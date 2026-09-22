/*
 * Toxine (Charognard toxique) : un cumul par tic de Poison, mais SEULEMENT
 * si l'equipement le permet (stats.toxineParTic). Explose au seuil comme la
 * Folie ou la Gelure, et — contrairement au Poison lui-meme — le burst
 * profite du critique du joueur, puisqu'il rejoint `damage` avant le jet de
 * critique (combat.js).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { performAttack } = await import("../combat.js");
const { STATUS_EFFECTS } = await import("../status.js");

const cibleAvecToxine = (stacks, hp = 5000) => ({
  name: "Charogne",
  hp,
  maxHp: hp,
  armor: 100,
});

test("sans stats.toxineParTic, le Poison ne pose jamais de Toxine", () => {
  etatNeuf({ stats: { intelligence: 0, critChance: 0 } });
  const cible = cibleAvecToxine(0);
  const targetEffects = [];

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: [cible],
    stats: { strength: 50, critChance: 0 },
    targetEffects,
    logPrefix: "Vous",
    isPlayer: true,
  });
  // Un coup ne pose pas de Poison lui-meme (aucun onHitEffect ici) ; ce test
  // verifie juste qu'aucune Toxine n'apparait sans le Poison de la Faucille
  // du Charognard, via un tic direct.
  const entity = { hp: 5000, maxHp: 5000 };
  STATUS_EFFECTS.POISON.onTurnStart(entity, targetEffects);
  assert.ok(!targetEffects.some((e) => e.id === "TOXIN"));
});

test("avec stats.toxineParTic, chaque tic de Poison pose 1 cumul de Toxine", () => {
  etatNeuf({ stats: { critChance: 0 } });
  state.gameState.equipped = {
    weapon: "carrion_scythe",
    armor: null,
    accessory: null,
  };
  const entity = { hp: 5000, maxHp: 5000 };
  const targetEffects = [];

  STATUS_EFFECTS.POISON.onTurnStart(entity, targetEffects);
  assert.equal(targetEffects.find((e) => e.id === "TOXIN")?.stacks, 1);

  STATUS_EFFECTS.POISON.onTurnStart(entity, targetEffects);
  assert.equal(targetEffects.find((e) => e.id === "TOXIN")?.stacks, 2);
});

test("la Toxine explose a 8 cumuls et consomme le compteur", () => {
  etatNeuf({ stats: { critChance: 0 } });
  const cible = { name: "Charogne", hp: 5000, maxHp: 5000, armor: 100 };
  const targetEffects = [{ id: "TOXIN", stacks: 8 }];

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: [cible],
    stats: { strength: 100, critChance: 0 },
    targetEffects,
    logPrefix: "Vous",
    isPlayer: true,
  });

  // 100 degats de coup (armure 100 => x1) : la cible a perdu plus que ca,
  // preuve que le burst de Toxine s'est ajoute.
  assert.ok(cible.hp < 5000 - 100);
  assert.ok(!targetEffects.some((e) => e.id === "TOXIN"));
});

test("sous 8 cumuls, la Toxine n'explose pas", () => {
  etatNeuf({ stats: { critChance: 0 } });
  const cible = { name: "Charogne", hp: 5000, maxHp: 5000, armor: 100 };
  const targetEffects = [{ id: "TOXIN", stacks: 7 }];

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: [cible],
    stats: { strength: 100, critChance: 0 },
    targetEffects,
    logPrefix: "Vous",
    isPlayer: true,
  });

  assert.equal(cible.hp, 5000 - 100);
  assert.equal(targetEffects.find((e) => e.id === "TOXIN")?.stacks, 7);
});

test("le seuil descend a 6 avec stats.toxineSeuilReduit", () => {
  etatNeuf({ stats: { critChance: 0 } });
  const cible = { name: "Charogne", hp: 5000, maxHp: 5000, armor: 100 };
  const targetEffects = [{ id: "TOXIN", stacks: 6 }];

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: [cible],
    stats: { strength: 100, critChance: 0, toxineSeuilReduit: true },
    targetEffects,
    logPrefix: "Vous",
    isPlayer: true,
  });

  assert.ok(cible.hp < 5000 - 100);
  assert.ok(!targetEffects.some((e) => e.id === "TOXIN"));
});
