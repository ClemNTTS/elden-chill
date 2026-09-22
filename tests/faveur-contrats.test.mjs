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
  DELAI_REROLL_MS,
  FAVEUR_MAX,
  FAVEUR_PAR_RARETE,
  RARETES,
  attenteAvantRelance,
  chanceLegendaire,
  faveurApresContrat,
  formaterAttente,
  genererContrat,
  normaliserContrat,
  normaliserFaveur,
  peutRelancer,
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

/*
 * Relance d'un contrat.
 *
 * L'abandon etait libre, immediat et illimite : on relancait en boucle jusqu'a
 * tomber sur un objectif facile dans la zone qu'on farmait deja. Un contrat
 * qu'on refuse sans rien risquer ne demande aucune decision.
 */
test("un contrat frais ne peut pas etre relance", () => {
  const maintenant = 1_000_000_000_000;
  const contrat = { demandeA: maintenant, expire: false };
  assert.equal(peutRelancer(contrat, maintenant), false);
  assert.equal(attenteAvantRelance(contrat, maintenant), DELAI_REROLL_MS);
});

test("la relance s'ouvre vingt-quatre heures apres la demande", () => {
  const demande = 1_000_000_000_000;
  const contrat = { demandeA: demande, expire: false };
  assert.equal(peutRelancer(contrat, demande + DELAI_REROLL_MS - 1), false);
  assert.equal(peutRelancer(contrat, demande + DELAI_REROLL_MS), true);
  assert.equal(attenteAvantRelance(contrat, demande + DELAI_REROLL_MS), 0);
});

test("un contrat expire se jette sans attendre", () => {
  // Il n'a plus rien a donner : le retenir ne protege rien.
  const maintenant = 1_000_000_000_000;
  assert.equal(
    peutRelancer({ demandeA: maintenant, expire: true }, maintenant),
    true,
  );
});

test("un contrat d'avant la regle n'est pas pris en otage", () => {
  // Pas d'horodatage : on ne lui applique pas un delai qui n'existait pas
  // quand il a ete tire.
  assert.equal(peutRelancer({ expire: false }, Date.now()), true);
});

test("l'attente se lit en clair", () => {
  assert.equal(formaterAttente(0), "moins d'une minute");
  assert.equal(formaterAttente(90 * 1000), "2 minutes");
  assert.equal(formaterAttente(45 * 60 * 1000), "45 minutes");
  assert.equal(formaterAttente(60 * 60 * 1000), "une heure");
  assert.equal(formaterAttente(DELAI_REROLL_MS), "24 heures");
});

test("un contrat genere porte la date de sa demande", () => {
  const maintenant = 1_700_000_000_000;
  const contrat = genererContrat({
    biomeId: "nokron",
    nomBiome: "Nokron",
    niveauJoueur: 150,
    maintenant,
    random: () => 0.5,
  });
  assert.equal(contrat.demandeA, maintenant);
  assert.equal(peutRelancer(contrat, maintenant), false);
});

test("un horodatage venu du futur ne bloque pas la relance a jamais", () => {
  const forge = normaliserContrat({
    ...genererContrat({
      biomeId: "nokron",
      nomBiome: "Nokron",
      niveauJoueur: 150,
      random: () => 0.5,
    }),
    demandeA: Date.now() + 10 * DELAI_REROLL_MS,
  });
  assert.ok(forge.demandeA <= Date.now());
});
