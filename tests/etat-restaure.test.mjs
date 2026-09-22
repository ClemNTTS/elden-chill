import assert from "node:assert/strict";
/*
 * Ce que le chargement rend vraiment au joueur.
 *
 * setGameState() ne copie pas le profil : il fusionne cle par cle, a partir
 * d'une LISTE ECRITE A LA MAIN. Une cle absente de cette liste n'est pas
 * restauree, et rien ne le signale — la sauvegarde sur disque la contient,
 * l'etat en memoire ne la voit jamais.
 *
 * C'est arrive deux fois d'un coup : `contracts` et `loadouts` manquaient. Le
 * joueur perdait a chaque rechargement son contrat en cours, ses compteurs de
 * contrats, l'annonce de deblocage — d'ou le bandeau du niveau 100 qui
 * revenait indefiniment — et ses panoplies enregistrees.
 *
 * Ce test ne verifie pas une cle en particulier : il balaie tout le profil par
 * defaut. La prochaine cle ajoutee sera couverte sans que personne y pense.
 */
import test from "node:test";
import { state } from "./aide.mjs";

const { gameState, setGameState } = state;
const { normalizePlayerProfile } = await import("../shared/player-profile.js");

/*
 * Cles volontairement non restaurees, avec leur raison. Toute autre cle du
 * profil doit survivre.
 */
const NON_RESTAUREES = new Map([
  ["playerEffects", "afflictions du combat en cours, videes au retour au camp"],
  ["ennemyEffects", "afflictions de l'ennemi, sans objet hors combat"],
]);

/** Une valeur reconnaissable, du bon type, pour chaque cle du profil. */
const valeurTemoin = (valeur) => {
  if (Array.isArray(valeur)) return [{ temoin: "restaure" }];
  if (valeur && typeof valeur === "object") {
    return { ...valeur, temoin: "restaure" };
  }
  if (typeof valeur === "number") return valeur + 7;
  if (typeof valeur === "boolean") return !valeur;
  return "restaure";
};

test("toute cle du profil survit au chargement", () => {
  const profil = normalizePlayerProfile({});
  const oublis = [];

  for (const cle of Object.keys(profil)) {
    if (NON_RESTAUREES.has(cle)) continue;
    const neuf = normalizePlayerProfile({});
    neuf[cle] = valeurTemoin(profil[cle]);
    setGameState(neuf);

    const rendu = JSON.stringify(gameState[cle] ?? null);
    if (!rendu.includes("restaure")) {
      oublis.push(`${cle} : la sauvegarde la porte, le chargement la perd`);
    }
  }

  assert.deepEqual(oublis, []);
});

test("le contrat en cours et ses compteurs traversent un rechargement", () => {
  const profil = normalizePlayerProfile({});
  profil.contracts = {
    actif: { titre: "Contrat temoin" },
    completed: 7,
    total: 9,
    annonce: true,
    faveur: 12,
  };
  setGameState(profil);

  assert.equal(gameState.contracts.actif.titre, "Contrat temoin");
  assert.equal(gameState.contracts.completed, 7);
  assert.equal(gameState.contracts.faveur, 12);
  // Le drapeau d'annonce : c'est lui qui evitait au bandeau du niveau 100 de
  // se rejouer a chaque rechargement.
  assert.equal(gameState.contracts.annonce, true);
});

test("les panoplies enregistrees traversent un rechargement", () => {
  const profil = normalizePlayerProfile({});
  profil.loadouts = [{ nom: "Build temoin", equipped: {} }];
  setGameState(profil);

  assert.equal(gameState.loadouts.length, 1);
  assert.equal(gameState.loadouts[0].nom, "Build temoin");
});
