/*
 * Necromancien : vol de vie sur les tics de Poison (stats.poisonLifesteal),
 * deux pieces LIBRES a Elphael (necromancer_seal, gravewarden_cloak), sans
 * `set:` — chacune vaut seule, et se cumulent si les deux sont portees.
 * Plafonne a 50% du tic quel que soit le nombre de pieces.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { STATUS_EFFECTS } = await import("../status.js");
const cible = () => ({ name: "Charogne", hp: 5000, maxHp: 5000 });

test("sans equipement, aucun vol de vie", () => {
  etatNeuf({ stats: { intelligence: 100, critChance: 0 } });
  const avant = state.runtimeState.playerCurrentHp;
  STATUS_EFFECTS.POISON.onTurnStart(cible());
  assert.equal(state.runtimeState.playerCurrentHp, avant);
});

test("le Sceau necromantique seul rend une partie du tic en PV", () => {
  etatNeuf({ stats: { intelligence: 100, vigor: 60, critChance: 0 } });
  state.gameState.equipped = {
    weapon: null,
    armor: null,
    accessory: "necromancer_seal",
  };
  state.runtimeState.playerCurrentHp = 1; // loin du plein, pour voir le soin
  const eff = state.getEffectiveStats();

  const { damage } = STATUS_EFFECTS.POISON.onTurnStart(cible());

  const attendu = Math.min(0.5, eff.poisonLifesteal);
  assert.ok(attendu > 0);
  assert.equal(
    state.runtimeState.playerCurrentHp,
    1 + Math.floor(damage * attendu),
  );
});

test("les deux pieces se cumulent, plafonnees a 50% du tic", () => {
  etatNeuf({ stats: { intelligence: 300, vigor: 60, critChance: 0 } });
  state.gameState.equipped = {
    weapon: null,
    armor: "gravewarden_cloak",
    accessory: "necromancer_seal",
  };
  state.gameState.inventory = [
    { id: "gravewarden_cloak", level: 10, count: 0 },
    { id: "necromancer_seal", level: 10, count: 0 },
  ];
  state.runtimeState.playerCurrentHp = 1;
  const eff = state.getEffectiveStats();

  // A niveau 10, 0.3+0.02*9=0.48 (sceau) + 0.1+0.01*9=0.19 (robe) = 0.67,
  // plafonne a 0.5 par le tic lui-meme.
  assert.ok(eff.poisonLifesteal > 0.5);

  const { damage } = STATUS_EFFECTS.POISON.onTurnStart(cible());
  assert.equal(
    state.runtimeState.playerCurrentHp,
    1 + Math.floor(damage * 0.5),
  );
});
