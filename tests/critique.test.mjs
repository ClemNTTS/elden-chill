import assert from "node:assert/strict";
/*
 * Points de competence critique.
 *
 * Deuxieme regression fondatrice : `respecCritPoints()` portait le texte de
 * confirmation de la renaissance, copie par erreur, qui lisait un `next`
 * absent de sa portee. L'exception levee empechait la reinitialisation — le
 * bouton ne faisait rien, sans le moindre signe visible.
 */
import test from "node:test";
import { crit, etatNeuf } from "./aide.mjs";

test("un point de competence tous les dix niveaux", () => {
  for (const [level, attendu] of [
    [0, 0],
    [9, 0],
    [10, 1],
    [99, 9],
    [220, 22],
  ]) {
    etatNeuf({ stats: { level } });
    assert.equal(crit.getCritPointsTotal(), attendu, `niveau ${level}`);
  }
});

test("depenser un point releve la statistique correspondante", () => {
  const jeu = etatNeuf({ stats: { level: 100 } });
  crit.syncCritStats();

  assert.ok(crit.spendCritPoint("chance"));
  assert.equal(crit.getCritRanks().chance, 1);
  assert.equal(crit.getCritPointsSpent(), 1);
  assert.equal(crit.getCritPointsAvailable(), 9);
  assert.equal(
    jeu.stats.critChance,
    crit.CRIT_BASE.chance + crit.CRIT_PER_RANK.chance,
    "critChance n'a pas suivi le rang",
  );

  assert.ok(crit.spendCritPoint("damage", 2));
  assert.equal(
    jeu.stats.critDamage,
    crit.CRIT_BASE.damage + 2 * crit.CRIT_PER_RANK.damage,
  );
});

test("on ne peut pas depenser plus de points qu'on en a", () => {
  etatNeuf({ stats: { level: 10 } }); // un seul point
  assert.ok(crit.spendCritPoint("chance"));
  assert.equal(crit.spendCritPoint("chance"), false, "second point accorde");
  assert.equal(crit.getCritPointsAvailable(), 0);
});

test("les plafonds par voie sont respectes", () => {
  etatNeuf({ stats: { level: 10000 } });
  crit.spendCritPoint("chance", 999);
  crit.spendCritPoint("damage", 999);
  assert.equal(crit.getCritRanks().chance, crit.CRIT_MAX_RANK.chance);
  assert.equal(crit.getCritRanks().damage, crit.CRIT_MAX_RANK.damage);
});

test("une voie inconnue est refusee", () => {
  etatNeuf({ stats: { level: 100 } });
  assert.equal(crit.spendCritPoint("vigor"), false);
  assert.equal(crit.getCritPointsSpent(), 0);
});

test("la reinitialisation rend tous les points et remet les bases", () => {
  const jeu = etatNeuf({ stats: { level: 150 } });
  crit.spendCritPoint("chance", 5);
  crit.spendCritPoint("damage", 4);
  assert.equal(crit.getCritPointsSpent(), 9);

  crit.resetCritRanks();

  assert.equal(crit.getCritRanks().chance, 0);
  assert.equal(crit.getCritRanks().damage, 0);
  assert.equal(crit.getCritPointsAvailable(), crit.getCritPointsTotal());
  assert.equal(jeu.stats.critChance, crit.CRIT_BASE.chance);
  assert.equal(jeu.stats.critDamage, crit.CRIT_BASE.damage);
});

test("respecCritPoints ne jette pas et remet reellement les rangs a zero", async () => {
  // Le cas exact du bug : la fonction levait un ReferenceError avant
  // d'atteindre resetCritRanks().
  globalThis.confirm = () => true;
  const actions = await import("../actions.js");

  etatNeuf({ stats: { level: 150 } });
  crit.spendCritPoint("chance", 3);
  assert.equal(crit.getCritPointsSpent(), 3);

  assert.doesNotThrow(
    () => actions.respecCritPoints(),
    "respecCritPoints a jete",
  );
  assert.equal(crit.getCritPointsSpent(), 0, "les rangs n'ont pas ete rendus");

  globalThis.confirm = () => false;
});

test("un refus de confirmation laisse les points en place", async () => {
  globalThis.confirm = () => false;
  const actions = await import("../actions.js");

  etatNeuf({ stats: { level: 150 } });
  crit.spendCritPoint("damage", 2);
  actions.respecCritPoints();
  assert.equal(
    crit.getCritPointsSpent(),
    2,
    "les points ont ete rendus malgre le refus",
  );
});

test("le jet de critique respecte la probabilite annoncee", () => {
  const stats = { critChance: 0, critDamage: 2 };
  assert.equal(
    crit.rollCrit(stats, () => 0).isCrit,
    false,
    "0% a quand meme crit",
  );

  const sur = { critChance: 1, critDamage: 2 };
  assert.equal(
    crit.rollCrit(sur, () => 0.99).isCrit,
    true,
    "100% n'a pas crit",
  );
});

test("au-dela de 100%, le surplus devient du super critique", () => {
  const stats = { critChance: 1.35, critDamage: 3 };
  assert.equal(crit.getSuperCritChance(stats).toFixed(2), "0.35");

  // Deux tirages : le premier passe le seuil de critique, le second decide
  // du super critique.
  const tirages = [0, 0];
  let i = 0;
  const r = crit.rollCrit(stats, () => tirages[i++]);
  assert.equal(r.isCrit, true);
  assert.equal(r.isSuper, true);
  assert.equal(r.multiplier, 3 * crit.SUPER_CRIT_MULTIPLIER);
});

test("le multiplicateur moyen croit avec la chance critique", () => {
  const faible = crit.getCritDamageMultiplier({
    critChance: 0.2,
    critDamage: 2,
  });
  const fort = crit.getCritDamageMultiplier({ critChance: 0.8, critDamage: 2 });
  assert.ok(fort > faible, `${fort} n'est pas superieur a ${faible}`);
  assert.ok(faible >= 1, "un critique ne peut pas reduire les degats moyens");
});
