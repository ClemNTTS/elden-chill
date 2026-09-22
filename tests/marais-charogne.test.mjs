/*
 * Marais de la Charogne : donjon annexe apres l'Academie de Raya Lucaria,
 * qui porte la panoplie CHAROGNARD (Poison escaladant). Verifie le cablage
 * de base — le reste (equilibrage HP/degats) releve des bancs dedies.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mountDomStub } from "../tools/headless-stub.mjs";

mountDomStub();
const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");
const { ITEMS } = await import("../item.js");
const { ITEM_SETS } = await import("../constants.js");

test("le donjon existe et est accessible depuis l'Academie", () => {
  assert.ok(BIOMES.carrion_marsh, "le biome carrion_marsh doit exister");
  assert.ok(
    BIOMES.raya_lucaria_academy.unlocks.includes("carrion_marsh"),
    "l'Academie doit debloquer le Marais",
  );
});

test("ses monstres et son boss existent, avec un comportement executable", () => {
  const biome = BIOMES.carrion_marsh;
  for (const id of [...biome.monsters, ...biome.rareMonsters, biome.boss]) {
    assert.ok(MONSTERS[id], `monstre manquant : ${id}`);
  }
  const boss = MONSTERS[biome.boss];
  assert.equal(boss.isBoss, true);
  assert.equal(boss.hasSecondPhase, true);
});

test("la Matriarche fait tomber les pieces de la Faux et de la Cuirasse", () => {
  const matriarche = MONSTERS.marsh_plague_matriarch;
  assert.ok(matriarche.isRare);
  const dropped = matriarche.drops.map((d) => d.id);
  assert.ok(dropped.includes("carrion_scythe"));
  assert.ok(dropped.includes("plague_hide_armor"));
});

test("la table de butin de la zone couvre les trois pieces CHAROGNARD", () => {
  const table = LOOT_TABLES.carrion_marsh.map((l) => l.id);
  for (const id of ["carrion_scythe", "plague_hide_armor", "plague_amulet"]) {
    assert.ok(table.includes(id), `${id} absent de la table de butin`);
  }
});

test("CHAROGNARD est une panoplie complete de trois types", () => {
  const pieces = Object.entries(ITEMS)
    .filter(([, item]) => item.set === "CHAROGNARD")
    .map(([id]) => id);
  assert.equal(pieces.length, 3);
  const types = new Set(pieces.map((id) => ITEMS[id].type));
  for (const attendu of ["Arme", "Armure", "Accessoire"]) {
    assert.ok(types.has(attendu), `CHAROGNARD n'a pas de piece ${attendu}`);
  }
  assert.ok(ITEM_SETS.CHAROGNARD.bonuses[2]);
  assert.ok(ITEM_SETS.CHAROGNARD.bonuses[3]);
});
