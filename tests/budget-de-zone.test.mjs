import assert from "node:assert/strict";
/*
 * Le contrat d'une zone, en points de vie.
 *
 * Formule par l'auteur du jeu : les monstres normaux sont faciles, les elites
 * blessent pour de bon, et le boss est le vrai combat — celui ou l'on perd le
 * gros de ses points de vie. On doit donc se presenter devant lui a la moitie
 * de sa barre environ, pas a 100% (le combat devient une formalite, ou oblige
 * a le tuer en deux coups) ni a 0% (on meurt dans le couloir).
 *
 * DEUX NIVEAUX D'EXIGENCE
 *
 * Les regles de SURETE — la zone se franchit, le feu de camp s'atteint —
 * valent pour TOUTES les zones mesurables, debut de partie et annexes
 * comprises. Une zone facultative a le droit d'etre dure ; elle n'a pas le
 * droit d'etre impossible sans que personne ne s'en apercoive, ce qui etait le
 * cas du Lac de la Putrefaction : 47% des points de vie par groupe standard,
 * trois fois le budget entier avant meme le feu de camp.
 *
 * Les regles de FORME ne valent que pour les zones dont la forme a ete reglee
 * (voir ZONES_SOUS_CONTRAT). Les imposer partout durcirait un debut de partie
 * qui convient, et des zones annexes que personne n'a signalees.
 *
 * MESURE : tools/budget-zone.mjs, au niveau que le plafond garantit pour la
 * trame principale, au haut de la bande recommandee pour une zone annexe.
 * Le modele ignore cendres, soins et benedictions : il est pessimiste, et les
 * bornes ci-dessous sont larges en consequence.
 */
import test from "node:test";

const { mesurerBudgetZone, ZONES_MESURABLES, ZONES_SOUS_CONTRAT } =
  await import("../tools/budget-zone.mjs");

/*
 * Bornes.
 *
 * Larges a dessein : ce test protege une INTENTION, pas un reglage au point
 * pres. Un test trop serre clignote au premier ajustement et finit desactive.
 */
const GROUPE_MAX = 0.08; // un groupe standard reste du remplissage
const ELITE_MIN = 0.12; // une elite se sent passer
const ARRIVEE_MIN = 0.35; // on arrive devant le boss avec de quoi jouer
const ARRIVEE_MAX = 0.75; // mais pas la barre pleine, sinon le boss ne pese rien

const toutes = ZONES_MESURABLES.map((id) => mesurerBudgetZone(id));
const sousContrat = toutes.filter((b) =>
  ZONES_SOUS_CONTRAT.includes(b.biomeId),
);

/* ---------------------------------------------------------------- */
/* Surete : vrai partout, sans exception                            */
/* ---------------------------------------------------------------- */

test("aucune zone du jeu n'est infranchissable", () => {
  /*
   * Le critere est la MORT, pas un pourcentage de budget.
   *
   * Un seuil "total <= 97%" a d'abord ete pose, et il clignotait : plusieurs
   * zones vivent entre 90 et 98% du budget, et c'est voulu — finir un biome a
   * 3% de sa barre, c'est exactement le contrat. Le seuil punissait
   * l'intention qu'il etait cense proteger.
   *
   * `gagne` agrege dix tirages et ne passe que si aucun ne tue le joueur.
   */
  const echecs = toutes
    .filter((b) => !b.gagne)
    .map((b) => `${b.nom} : PERDU (${Math.round(b.total * 100)}% du budget)`);
  assert.deepEqual(echecs, []);
});

test("on atteint toujours le feu de camp de mi-parcours", () => {
  /*
   * Le feu de camp rend les points de vie a mi-parcours. Mourir AVANT lui veut
   * dire que la premiere moitie coute a elle seule plus que la barre entiere :
   * la zone se referme sur le joueur sans meme lui montrer son boss.
   */
  const echecs = toutes
    .filter((b) => b.premiereMoitie >= 1)
    .map(
      (b) =>
        `${b.nom} : la premiere moitie coute ${Math.round(b.premiereMoitie * 100)}% des points de vie`,
    );
  assert.deepEqual(echecs, []);
});

/* ---------------------------------------------------------------- */
/* Forme : seulement la ou elle a ete reglee                        */
/* ---------------------------------------------------------------- */

test("un monstre normal reste du remplissage", () => {
  const trop = sousContrat
    .filter((b) => b.groupe > GROUPE_MAX)
    .map(
      (b) =>
        `${b.nom} : un groupe coute ${Math.round(b.groupe * 100)}% des points de vie`,
    );
  assert.deepEqual(trop, []);
});

test("une elite se sent passer", () => {
  const fades = sousContrat
    .filter((b) => b.elite < ELITE_MIN)
    .map(
      (b) =>
        `${b.nom} : une elite ne coute que ${Math.round(b.elite * 100)}% des points de vie`,
    );
  assert.deepEqual(fades, []);
});

test("on arrive devant le boss autour de la moitie de sa barre", () => {
  const hors = sousContrat
    .filter((b) => b.arrivee < ARRIVEE_MIN || b.arrivee > ARRIVEE_MAX)
    .map((b) => `${b.nom} : arrivee a ${Math.round(b.arrivee * 100)}%`);
  assert.deepEqual(hors, []);
});

test("le boss reste le moment ou l'on perd le plus", () => {
  const faibles = sousContrat
    .filter((b) => b.boss < b.groupe * 4)
    .map(
      (b) =>
        `${b.nom} : le boss coute ${Math.round(b.boss * 100)}%, un groupe ${Math.round(b.groupe * 100)}%`,
    );
  assert.deepEqual(faibles, []);
});
