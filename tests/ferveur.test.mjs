/*
 * Ferveur : la prime d'escalade.
 *
 * Le systeme n'a d'interet que si aucun reglage de `stopAfterCycle` n'est
 * optimal en toutes circonstances. Ces tests verrouillent les proprietes qui
 * garantissent cela : la prime monte, le danger aussi, et la reserve est
 * perdue a la mort.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mountDomStub } from "../tools/headless-stub.mjs";

mountDomStub();
const esc = await import("../escalation.js");

test("le rang suit les cycles et sature au plafond", () => {
  assert.equal(esc.getFerveurRang(0), 0);
  assert.equal(esc.getFerveurRang(1), 1);
  assert.equal(esc.getFerveurRang(esc.FERVEUR_RANG_MAX), esc.FERVEUR_RANG_MAX);
  assert.equal(esc.getFerveurRang(999), esc.FERVEUR_RANG_MAX, "le rang doit saturer");
  assert.equal(esc.getFerveurRang(-5), 0, "un compteur negatif ne doit pas donner de rang");
});

test("la prime est nulle au premier cycle", () => {
  // Sinon le systeme taxerait un joueur qui ne fait qu'une boucle.
  assert.equal(esc.getFerveurMultRunes(0), 1);
  assert.equal(esc.getPrimeFerveur(1000, 0), 0);
  assert.equal(esc.getFerveurMultDanger(0), 1);
});

test("la prime croit strictement avec le rang, jusqu'au plafond", () => {
  let precedent = esc.getFerveurMultRunes(0);
  for (let c = 1; c <= esc.FERVEUR_RANG_MAX; c++) {
    const actuel = esc.getFerveurMultRunes(c);
    assert.ok(actuel > precedent, `la prime stagne au cycle ${c}`);
    precedent = actuel;
  }
  assert.equal(
    esc.getFerveurMultRunes(esc.FERVEUR_RANG_MAX + 20),
    esc.getFerveurMultRunes(esc.FERVEUR_RANG_MAX),
    "la prime doit cesser de monter au plafond",
  );
});

test("le danger continue de monter APRES le plafond de prime", () => {
  // C'est ce qui empeche d'enchainer indefiniment sans consequence.
  const auPlafond = esc.getFerveurMultDanger(esc.FERVEUR_RANG_MAX);
  const bienAudela = esc.getFerveurMultDanger(esc.FERVEUR_RANG_MAX + 20);
  assert.ok(
    bienAudela > auPlafond,
    "passe le plafond, enchainer doit couter quelque chose",
  );
});

test("a rang egal la prime progresse plus vite que le danger", () => {
  // Sinon monter en Ferveur serait un piege, et personne ne le ferait.
  for (let c = 1; c <= esc.FERVEUR_RANG_MAX; c++) {
    const prime = esc.getFerveurMultRunes(c) - 1;
    const danger = esc.getFerveurMultDanger(c) - 1;
    assert.ok(prime > danger, `au rang ${c} : prime ${prime} <= danger ${danger}`);
  }
});

test("la prime se calcule sur le gain de base, arrondie a l'entier", () => {
  const prime = esc.getPrimeFerveur(100, 4);
  assert.equal(prime, Math.floor(100 * 4 * esc.FERVEUR_PRIME_PAR_RANG));
  assert.ok(Number.isInteger(prime), "les runes sont entieres");
});

test("les seuils de butin se declenchent aux rangs annonces", () => {
  assert.equal(esc.getFerveurTiragesButin(esc.FERVEUR_RANG_BUTIN - 1), 0);
  assert.equal(esc.getFerveurTiragesButin(esc.FERVEUR_RANG_BUTIN), 1);
  assert.equal(esc.getFerveurBoostRarete(esc.FERVEUR_RANG_RARETE - 1), 0);
  assert.equal(esc.getFerveurBoostRarete(esc.FERVEUR_RANG_RARETE), esc.FERVEUR_BOOST_RARETE);
});

test("la reserve de Ferveur ne survit pas a un rechargement", async () => {
  // Elle vit dans runtimeState, jamais dans gameState : une mise qu'on met a
  // l'abri en fermant l'onglet ne serait plus une mise.
  const { runtimeState } = await import("../state.js");
  const profil = await import("../shared/player-profile.js");

  assert.equal(
    "ferveurBank" in runtimeState,
    true,
    "la reserve doit exister dans l'etat runtime",
  );
  const sauvegarde = profil.normalizePlayerProfile({
    ferveurBank: 999999,
    runtimeState: { ferveurBank: 999999 },
  });
  assert.equal(
    sauvegarde.ferveurBank,
    undefined,
    "la reserve ne doit jamais etre persistee dans le profil",
  );
});

test("aucun rang ne produit de valeur non finie", () => {
  for (const c of [0, 1, 7, 10, 50, 1000]) {
    for (const f of [
      esc.getFerveurMultRunes,
      esc.getFerveurMultDanger,
      esc.getFerveurTiragesButin,
      esc.getFerveurBoostRarete,
    ]) {
      assert.ok(Number.isFinite(f(c)), `${f.name}(${c}) = ${f(c)}`);
    }
    assert.ok(Number.isFinite(esc.getPrimeFerveur(100, c)));
  }
});
