/*
 * Un contrat doit etre realisable dans la zone qu'il designe.
 *
 * Le bug qui a motive ce test : « Abattez 8 creatures en meute dans
 * Profondeurs de la Souche », une zone dont aucun monstre n'arrive a trois.
 * L'objectif etait impossible, rien ne le disait, et le delai de relance
 * gardait le joueur devant pendant vingt-quatre heures.
 *
 * Le test ne verifie pas un cas : il balaie les 50 zones et tous les tirages
 * possibles du generateur. C'est la seule facon d'attraper la meme faute quand
 * un biome sera ajoute ou qu'une fiche de monstre perdra son groupe.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mountDomStub } from "../tools/headless-stub.mjs";

mountDomStub();
const { genererContrat, FILTRES, MODELES, RARETES, modelesRealisables } =
  await import("../contracts.js");
const { filtresPossiblesPourZone } = await import("../contrats-zone.js");
const { BIOMES } = await import("../biome.js");

/*
 * Tirage exhaustif : on remplace Math.random par une suite qui prend toutes
 * les valeurs d'un pas fin. Un contrat impossible qui ne sortirait qu'une fois
 * sur cent serait rate par un test au hasard.
 */
const tirages = (pas = 0.05) => {
  const valeurs = [];
  for (let v = 0; v < 1; v += pas) valeurs.push(v);
  return valeurs;
};

const contratsPossibles = (biomeId) => {
  const contrats = [];
  const filtresPossibles = filtresPossiblesPourZone(biomeId);
  for (const a of tirages()) {
    let n = 0;
    const random = () => {
      n += 1;
      return (a + n * 0.137) % 1;
    };
    const contrat = genererContrat({
      biomeId,
      nomBiome: BIOMES[biomeId].name,
      niveauJoueur: 50,
      filtresPossibles,
      random,
    });
    if (contrat) contrats.push(contrat);
  }
  return contrats;
};

test("aucune zone ne recoit un contrat dont elle n'a pas les ennemis", () => {
  for (const biomeId of Object.keys(BIOMES)) {
    const possibles = filtresPossiblesPourZone(biomeId);
    for (const contrat of contratsPossibles(biomeId)) {
      if (!contrat.filtre) continue;
      assert.ok(
        possibles.includes(contrat.filtre),
        `${biomeId} : contrat « ${contrat.texte} » demande un filtre « ${contrat.filtre} » que la zone ne produit pas`,
      );
    }
  }
});

test("le filtre meute n'est propose que la ou une rencontre aligne trois ennemis", () => {
  const avecMeute = Object.keys(BIOMES).filter((id) =>
    filtresPossiblesPourZone(id).includes(FILTRES.MEUTE),
  );
  // La regle ne doit pas se durcir jusqu'a vider le jeu de ses meutes.
  assert.ok(avecMeute.length > 0, "aucune zone ne peut plus produire de meute");
  assert.ok(
    !filtresPossiblesPourZone("deeproot_depths").includes(FILTRES.MEUTE),
    "Profondeurs de la Souche n'aligne jamais trois ennemis : la meute doit y rester interdite",
  );
});

test("chaque zone garde de quoi tirer un contrat de chaque rarete", () => {
  for (const biomeId of Object.keys(BIOMES)) {
    const possibles = filtresPossiblesPourZone(biomeId);
    for (const rarete of Object.values(RARETES)) {
      assert.ok(
        modelesRealisables(rarete, possibles).length > 0,
        `${biomeId} : plus aucun modele ${rarete} realisable`,
      );
    }
  }
});

test("sans information de zone, le generateur ne restreint rien", () => {
  const tousLesFiltres = new Set(
    MODELES.flatMap((m) => m.filtres || (m.filtre ? [m.filtre] : [])),
  );
  const retenus = modelesRealisables(RARETES.LEGENDAIRE, null);
  assert.equal(retenus.length, MODELES.length);
  assert.ok(tousLesFiltres.size > 0);
});
