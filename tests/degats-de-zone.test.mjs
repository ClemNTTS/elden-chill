/*
 * Degats de zone (splashDamage) contre une cible seule.
 *
 * splashDamage ne touchait que « le reste du groupe » (targetGroup[1..]).
 * Contre un boss solo — la quasi-totalite des combats qui comptent pour juger
 * un build — chaque objet qui en donne (baton de l'astronome, robe du sage de
 * Caelid, sets ACADEMY_PRIME/AINSEL_ASTRAL...) ne faisait litteralement rien.
 * Voir SPLASH_SOLO_RATIO dans combat.js.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf } from "./aide.mjs";

const { performAttack } = await import("../combat.js");

const statsSansCrit = (splashDamage) => ({
  strength: 100,
  splashDamage,
  critChance: 0,
  critDamage: 2,
});

test("une cible seule encaisse la moitie des degats de zone", () => {
  etatNeuf();
  const cible = { name: "Boss", hp: 1000, maxHp: 1000, armor: 100 };

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: [cible], // seul dans son groupe, comme un boss
    stats: statsSansCrit(40),
    targetEffects: [],
    logPrefix: "Vous",
    isPlayer: true,
  });

  // 100 degats physiques (armure 100 => multiplicateur 1) + 20 de zone (50%
  // de 40) : 1000 - 100 - 20 = 880.
  assert.equal(cible.hp, 880);
});

test("une cible seule sans targetGroup fourni encaisse aussi les degats de zone", () => {
  etatNeuf();
  const cible = { name: "Boss", hp: 1000, maxHp: 1000, armor: 100 };

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: null,
    stats: statsSansCrit(40),
    targetEffects: [],
    logPrefix: "Vous",
    isPlayer: true,
  });

  assert.equal(cible.hp, 880);
});

test("un groupe encaisse la totalite des degats de zone sur les autres membres", () => {
  etatNeuf();
  const cible = { name: "Loup", hp: 1000, maxHp: 1000, armor: 100 };
  const compagnon = { name: "Loup", hp: 500, maxHp: 500, armor: 100 };
  const groupe = [cible, compagnon];

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: groupe,
    stats: statsSansCrit(40),
    targetEffects: [],
    logPrefix: "Vous",
    isPlayer: true,
  });

  // La cible principale n'encaisse QUE les degats physiques : le splash va
  // au reste du groupe, en entier, pas la moitie.
  assert.equal(cible.hp, 900);
  assert.equal(compagnon.hp, 460);
});

test("sans degats de zone, rien ne change contre une cible seule", () => {
  etatNeuf();
  const cible = { name: "Boss", hp: 1000, maxHp: 1000, armor: 100 };

  performAttack({
    attackers: [{}],
    target: cible,
    targetGroup: [cible],
    stats: statsSansCrit(0),
    targetEffects: [],
    logPrefix: "Vous",
    isPlayer: true,
  });

  assert.equal(cible.hp, 900);
});
