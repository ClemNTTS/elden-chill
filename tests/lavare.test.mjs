/*
 * L'Avare (set ECONOME) : le seul set de contrat qui ne cible aucun
 * archetype.
 *
 * Contrairement aux cinq autres (OATHBOUND, BOUNTY_HUNTER, ARCHIVIST,
 * MOURNER, SENTENCE), il ne convertit ni Force, ni Dexterite, ni
 * Intelligence, ni Vigueur investie : il lit les runes PORTEES
 * (gameState.runes.carried), une ressource que tout archetype possede
 * egalement. Ces tests verifient qu'il reste universel, plafonne, et que
 * poolRecompense() (actions.js) le propose EN PLUS du set d'archetype, pas a
 * sa place.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { ITEMS } = await import("../item.js");
const { SETS_PAR_ARCHETYPE, SET_UNIVERSEL } = await import("../constants.js");
const { piecesDuSet } = await import("../items/contracts.js");

const equiper = (runes) => {
  etatNeuf();
  state.gameState.equipped = {
    weapon: "miser_blade",
    armor: "miser_plate",
    accessory: "leaded_purse",
  };
  state.gameState.runes.carried = runes;
  return state.getEffectiveStats();
};

test("ECONOME n'est cible d'aucun archetype, mais compte trois pieces d'un type chacune", () => {
  assert.ok(
    !Object.values(SETS_PAR_ARCHETYPE).includes(SET_UNIVERSEL),
    "ECONOME ne doit apparaitre dans aucune correspondance archetype -> set",
  );
  const pieces = piecesDuSet(SET_UNIVERSEL);
  assert.equal(pieces.length, 3);
  const types = new Set(pieces.map((id) => ITEMS[id].type));
  for (const attendu of ["Arme", "Armure", "Accessoire"]) {
    assert.ok(
      types.has(attendu),
      `ECONOME n'a pas de piece de type ${attendu}`,
    );
  }
});

test("sans runes portees, la panoplie ne rend rien de plus que sa base", () => {
  const eff = equiper(0);
  assert.equal(eff.strength, 0);
  assert.equal(eff.armor, 100); // armure de base du profil, inchangee
});

test("les runes portees se convertissent en Force et en Armure", () => {
  const eff = equiper(50000);
  // getEffectiveStats arrondit strength/armor a l'entier le plus proche
  // (etape 6, "arrondi final") : les valeurs attendues le sont aussi.
  // Lame : floor(50000/4000) = 12 tranches -> +12 Force
  // Bourse : floor(50000/5000) = 10 tranches -> mult 1.20
  assert.equal(eff.strength, Math.round(12 * 1.2));
  // Cuirasse : floor(50000/3000) = 16 tranches -> +48 Armure, sur une base de 100
  assert.equal(eff.armor, Math.round((100 + 48) * 1.2));
});

test("le plafond tient meme avec un tresor demesure", () => {
  const avecPlafond = equiper(500000);
  const auDela = equiper(50000000);
  assert.equal(avecPlafond.strength, auDela.strength);
  assert.equal(avecPlafond.armor, auDela.armor);
  // Plafond : 30 tranches (Lame) * mult 1.4 (20 tranches, Bourse) = 42
  assert.equal(avecPlafond.strength, Math.round(30 * 1.4));
});

test("Absolution : sauve la vie une fois par expedition, contre la moitie des runes portees", () => {
  const eff = equiper(40000);
  const maxHp = state.getHealth(eff.vigor);
  state.runtimeState.playerCurrentHp = Math.floor(maxHp * 0.03);
  state.runtimeState.avareUtilise = false;

  ITEMS.leaded_purse.funcOnBeingHit(eff);

  assert.equal(state.runtimeState.playerCurrentHp, Math.floor(maxHp * 0.25));
  assert.equal(state.gameState.runes.carried, 20000);
  assert.equal(state.runtimeState.avareUtilise, true);
});

test("Absolution ne se declenche pas deux fois", () => {
  const eff = equiper(40000);
  const maxHp = state.getHealth(eff.vigor);
  state.runtimeState.playerCurrentHp = 1;
  state.runtimeState.avareUtilise = true; // deja consommee cette expedition

  ITEMS.leaded_purse.funcOnBeingHit(eff);

  assert.equal(state.runtimeState.playerCurrentHp, 1);
  assert.equal(state.gameState.runes.carried, 40000);
});

test("Absolution exige la panoplie complete", () => {
  etatNeuf();
  state.gameState.equipped = {
    weapon: "miser_blade",
    armor: null,
    accessory: "leaded_purse",
  };
  state.gameState.runes.carried = 40000;
  state.runtimeState.avareUtilise = false;
  const eff = state.getEffectiveStats();
  state.runtimeState.playerCurrentHp = 1;

  ITEMS.leaded_purse.funcOnBeingHit(eff);

  assert.equal(state.runtimeState.avareUtilise, false);
  assert.equal(state.gameState.runes.carried, 40000);
});

test("Absolution ne se declenche pas au-dessus du seuil de vie critique", () => {
  const eff = equiper(40000);
  const maxHp = state.getHealth(eff.vigor);
  state.runtimeState.playerCurrentHp = Math.floor(maxHp * 0.5); // en pleine forme
  state.runtimeState.avareUtilise = false;

  ITEMS.leaded_purse.funcOnBeingHit(eff);

  assert.equal(state.runtimeState.avareUtilise, false);
  assert.equal(state.gameState.runes.carried, 40000);
});
