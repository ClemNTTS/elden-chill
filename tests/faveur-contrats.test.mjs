import assert from "node:assert/strict";
/*
 * Faveur de contrat.
 *
 * Le legendaire tombait sur un poids fixe de 8, soit une chance sur douze a
 * chaque tirage, indefiniment et sans memoire : un joueur pouvait en enchainer
 * quarante sans rien voir, et rien de ce qu'il faisait n'avait d'effet dessus.
 * La faveur transforme ce jet de des en jauge — on sait ou on en est, et ce
 * qu'il faut faire pour avancer.
 */
import test from "node:test";
import {
  FAVEUR_MAX,
  FAVEUR_PAR_RARETE,
  RARETES,
  chanceLegendaire,
  faveurApresContrat,
  normaliserFaveur,
  tirerRarete,
} from "../contracts.js";
import { FAVEUR_CONTRAT_MAX } from "../shared/player-profile.js";

test("sans faveur, le legendaire reste un horizon lointain", () => {
  const chance = chanceLegendaire(0);
  assert.ok(chance > 0.005 && chance < 0.02, `chance de base : ${chance}`);
});

test("honorer un contrat augmente la chance, un rare plus qu'un commun", () => {
  const commun = faveurApresContrat(0, RARETES.COMMUNE);
  const rare = faveurApresContrat(0, RARETES.RARE);
  assert.ok(rare > commun);
  assert.ok(chanceLegendaire(rare) > chanceLegendaire(commun));
  assert.ok(chanceLegendaire(commun) > chanceLegendaire(0));
});

test("la chance monte avec la faveur, sans jamais devenir certaine", () => {
  let precedente = chanceLegendaire(0);
  for (let f = 1; f <= FAVEUR_MAX; f += 1) {
    const chance = chanceLegendaire(f);
    assert.ok(chance > precedente, `la faveur ${f} n'apporte rien`);
    precedente = chance;
  }
  assert.ok(precedente < 0.5, `chance au plafond : ${precedente}`);
});

test("un legendaire honore remet la jauge a zero", () => {
  assert.equal(faveurApresContrat(FAVEUR_MAX, RARETES.LEGENDAIRE), 0);
  assert.equal(FAVEUR_PAR_RARETE[RARETES.LEGENDAIRE], 0);
});

test("la faveur est bornee, meme venant d'une sauvegarde forgee", () => {
  assert.equal(normaliserFaveur(10000), FAVEUR_MAX);
  assert.equal(normaliserFaveur(-5), 0);
  assert.equal(normaliserFaveur("douze"), 0);
  assert.equal(normaliserFaveur(undefined), 0);
});

test("le plafond recopie dans le profil de sauvegarde suit celui des regles", () => {
  // La valeur est dupliquee pour ne pas creer de cycle d'imports : ce test est
  // ce qui garantit que les deux copies ne divergent pas.
  assert.equal(FAVEUR_CONTRAT_MAX, FAVEUR_MAX);
});

test("a jet identique, la faveur change le resultat", () => {
  // Le meme jet donne un contrat rare sans faveur et un legendaire avec :
  // c'est tout ce que la mecanique promet, verifie sur un tirage unique.
  const jet = () => 0.8;
  assert.equal(tirerRarete(jet, 0), RARETES.RARE);
  assert.equal(tirerRarete(jet, 30), RARETES.LEGENDAIRE);
});

test("la faveur raccourcit surtout les longues disettes", () => {
  /*
   * L'interet du systeme n'est pas la moyenne, c'est la QUEUE de distribution.
   * A 8% fixe, un joueur sur cent attendait plus de cinquante contrats.
   */
  let graine = 12345;
  const aleatoire = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  };
  let pire = 0;
  for (let essai = 0; essai < 500; essai += 1) {
    let faveur = 0;
    let tirages = 0;
    while (true) {
      tirages += 1;
      const rarete = tirerRarete(aleatoire, faveur);
      if (rarete === RARETES.LEGENDAIRE) break;
      faveur = faveurApresContrat(faveur, rarete);
    }
    pire = Math.max(pire, tirages);
  }
  // Le plafond de faveur borne mecaniquement l'attente : au pire on finit a
  // 30% par tirage, la ou 8% fixe laissait des series de plus de cent.
  assert.ok(pire <= 60, `pire attente observee : ${pire}`);
});
