import assert from "node:assert/strict";
/*
 * Le contrat d'une zone, en points de vie.
 *
 * Formule par l'auteur du jeu : les monstres normaux sont faciles, les elites
 * blessent pour de bon, et le boss est le vrai combat — celui ou l'on perd le
 * gros de ses points de vie. On doit donc se presenter devant lui a la moitie
 * de sa barre environ, pas a 100% (le combat devient une formalite ou oblige a
 * le tuer en deux coups) ni a 0% (on meurt dans le couloir).
 *
 * CE QUE CE TEST REMPLACE
 *
 * Une premiere version gardait le RAPPORT entre les points de vie d'un boss et
 * ceux d'un monstre de sa zone. C'etait un proxy : il attrapait le symptome —
 * des monstres devenus aussi dangereux que le boss — sans dire ce qu'on
 * voulait a la place. Le budget le dit.
 *
 * MESURE
 *
 * tools/banc-biome.mjs, au niveau que le plafond garantit (80% du plafond),
 * avec l'equipement joignable a ce stade. La seconde moitie du biome seulement :
 * le feu de camp rend les points de vie a mi-parcours.
 *
 * Le modele ignore cendres, soins et benedictions : il est donc pessimiste, et
 * les bornes ci-dessous sont larges en consequence.
 */
import test from "node:test";

const { mesurerBudgetZone, ZONES_SOUS_CONTRAT } = await import(
  "../tools/budget-zone.mjs"
);

/*
 * Bornes.
 *
 * Larges a dessein : ce test protege une INTENTION — le boss reste le moment
 * fort — pas un reglage au point pres. Un test trop serre se mettrait a
 * clignoter au premier ajustement et finirait desactive.
 */
const GROUPE_MAX = 0.08; // un groupe standard reste du remplissage
const ELITE_MIN = 0.12; // une elite se sent passer
const ARRIVEE_MIN = 0.35; // on arrive devant le boss avec de quoi jouer
const ARRIVEE_MAX = 0.7; // mais pas la barre pleine, sinon le boss ne pese rien
const TOTAL_MAX = 0.97; // et la zone entiere reste franchissable

const budgets = ZONES_SOUS_CONTRAT.map((id) => mesurerBudgetZone(id));

test("la zone entiere se franchit au niveau que le plafond garantit", () => {
  const echecs = budgets
    .filter((b) => !b.gagne || b.total > TOTAL_MAX)
    .map(
      (b) =>
        `${b.nom} : ${Math.round(b.total * 100)}% du budget, ${b.gagne ? "gagne de justesse" : "PERDU"}`,
    );
  assert.deepEqual(echecs, []);
});

test("un monstre normal reste du remplissage", () => {
  const trop = budgets
    .filter((b) => b.groupe > GROUPE_MAX)
    .map(
      (b) =>
        `${b.nom} : un groupe coute ${Math.round(b.groupe * 100)}% des points de vie`,
    );
  assert.deepEqual(trop, []);
});

test("une elite se sent passer", () => {
  const fades = budgets
    .filter((b) => b.elite < ELITE_MIN)
    .map(
      (b) =>
        `${b.nom} : une elite ne coute que ${Math.round(b.elite * 100)}% des points de vie`,
    );
  assert.deepEqual(fades, []);
});

test("on arrive devant le boss autour de la moitie de sa barre", () => {
  const hors = budgets
    .filter((b) => b.arrivee < ARRIVEE_MIN || b.arrivee > ARRIVEE_MAX)
    .map((b) => `${b.nom} : arrivee a ${Math.round(b.arrivee * 100)}%`);
  assert.deepEqual(hors, []);
});

test("le boss reste le moment ou l'on perd le plus", () => {
  const faibles = budgets
    .filter((b) => b.boss < b.groupe * 4)
    .map(
      (b) =>
        `${b.nom} : le boss coute ${Math.round(b.boss * 100)}%, un groupe ${Math.round(b.groupe * 100)}%`,
    );
  assert.deepEqual(faibles, []);
});
