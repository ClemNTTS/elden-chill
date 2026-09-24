import assert from "node:assert/strict";
/*
 * Recherche de l'inventaire (inventory-search.js).
 *
 * Le cas qui a motive le debut-de-mot : "int" ne doit pas trouver "points de
 * vie", sinon la recherche la plus courante renvoie presque tout.
 */
import test from "node:test";
import { objetCorrespond } from "../inventory-search.js";

const baton = {
  name: "Bâton de l'Académie",
  description: "+15% d'Intelligence <em style='color: grey;'>(+1% / Niv)</em>.",
  type: "Arme",
};
const cape = {
  name: "Cape en peau de bête",
  description:
    "+31 Armure. Chaque tranche de 20 Vigueur rend des points de vie.",
  type: "Armure",
};

test("une abreviation retrouve la stat entiere", () => {
  assert.equal(objetCorrespond(baton, "INT"), true);
  assert.equal(objetCorrespond(cape, "vig"), true);
});

test("on compare des debuts de mots, pas des sous-chaines", () => {
  // "points" contient "int" : il ne doit pas compter.
  assert.equal(objetCorrespond(cape, "int"), false);
});

test("accents, casse et balises sont ignores", () => {
  assert.equal(objetCorrespond(baton, "academie"), true);
  assert.equal(objetCorrespond(cape, "BETE"), true);
  assert.equal(objetCorrespond(baton, "grey"), false);
});

test("plusieurs mots doivent tous apparaitre", () => {
  assert.equal(objetCorrespond(cape, "armure vigueur"), true);
  assert.equal(objetCorrespond(cape, "armure intelligence"), false);
});

test("une requete vide laisse tout passer", () => {
  assert.equal(objetCorrespond(baton, ""), true);
  assert.equal(objetCorrespond(baton, "   "), true);
});

test("le nom se cherche n'importe ou, meme en milieu de mot", () => {
  assert.equal(objetCorrespond(baton, "cademi"), true);
  assert.equal(objetCorrespond(cape, "eau de"), true);
  // La description reste en debut de mot : "ints" (de "points") ne sort pas.
  assert.equal(objetCorrespond(cape, "ints"), false);
});

test("les alias anglais pointent vers le mot du jeu", () => {
  assert.equal(objetCorrespond({ description: "+10% de Force" }, "str"), true);
});
