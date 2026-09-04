/*
 * Panoplies enregistrees.
 *
 * Le risque principal n'est pas l'ergonomie mais la coherence : une panoplie
 * doit rester un raccourci de mise en place, et ne jamais devenir une source
 * de puissance ni un moyen d'equiper ce qu'on ne possede pas.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mountDomStub } from "../tools/headless-stub.mjs";

mountDomStub();
const lo = await import("../loadouts.js");
const profil = await import("../shared/player-profile.js");

test("la normalisation rend toujours exactement trois emplacements", () => {
  for (const entree of [
    undefined,
    null,
    [],
    "x",
    [{}],
    new Array(9).fill({}),
  ]) {
    const out = lo.normaliserPanoplies(entree);
    assert.equal(out.length, lo.NB_PANOPLIES, `pour ${JSON.stringify(entree)}`);
  }
});

test("un profil ancien recoit des emplacements vides", () => {
  const out = lo.normaliserPanoplies(
    profil.normalizePlayerProfile({}).loadouts,
  );
  assert.equal(out.length, lo.NB_PANOPLIES);
  assert.ok(out.every((p) => p.vide));
});

test("un identifiant forge est refuse comme partout ailleurs", () => {
  const out = lo.normaliserPanoplies([
    {
      nom: "Triche",
      weapon: "<img onerror=1>",
      armor: "../../x",
      accessory: "plate_armor",
    },
  ]);
  assert.equal(out[0].weapon, null);
  assert.equal(out[0].armor, null);
  assert.equal(out[0].accessory, "plate_armor");
});

test("un nom est borne en longueur et jamais vide", () => {
  const out = lo.normaliserPanoplies([
    { nom: "x".repeat(200), weapon: "fists" },
  ]);
  assert.ok(out[0].nom.length <= lo.NOM_PANOPLIE_MAX);

  const sansNom = lo.normaliserPanoplies([{ nom: "   ", weapon: "fists" }]);
  assert.ok(
    sansNom[0].nom.trim().length > 0,
    "un nom vide doit retomber sur un defaut",
  );
});

test("capturer puis resoudre restitue l'equipement a l'identique", () => {
  const etat = {
    equipped: {
      weapon: "sword_broken",
      armor: "plate_armor",
      accessory: "bog_amulet",
    },
    equippedAsh: "bloody_slash",
  };
  const panoplie = lo.capturerPanoplie(etat, "Tank");
  const { applicable, manquants } = lo.resoudrePanoplie(
    panoplie,
    () => true,
    () => true,
  );

  assert.deepEqual(manquants, []);
  assert.equal(applicable.weapon, "sword_broken");
  assert.equal(applicable.armor, "plate_armor");
  assert.equal(applicable.accessory, "bog_amulet");
  assert.equal(applicable.ash, "bloody_slash");
});

test("une piece non possedee est signalee, pas equipee", () => {
  // Le cas reel : une panoplie enregistree avant une renaissance.
  const panoplie = {
    nom: "Avant renaissance",
    weapon: "sword_broken",
    armor: "plate_armor",
    accessory: null,
    ash: "golden_vow",
  };
  const possede = (id) => id === "sword_broken";
  const { applicable, manquants } = lo.resoudrePanoplie(
    panoplie,
    possede,
    () => false,
  );

  assert.equal(applicable.weapon, "sword_broken");
  assert.equal(
    applicable.armor,
    null,
    "une piece perdue ne doit pas etre equipee",
  );
  assert.equal(applicable.ash, null);
  assert.deepEqual(manquants.sort(), ["golden_vow", "plate_armor"]);
});

test("une panoplie ne transporte aucune statistique", () => {
  // Garde-fou de conception : recharger doit produire l'etat qu'un joueur
  // patient aurait atteint a la main, jamais davantage.
  const panoplie = lo.capturerPanoplie(
    {
      equipped: { weapon: "fists", armor: null, accessory: null },
      equippedAsh: null,
      stats: { level: 999, strength: 999 },
      runes: { banked: 1e9 },
    },
    "Test",
  );
  assert.deepEqual(
    Object.keys(panoplie).sort(),
    ["accessory", "armor", "ash", "nom", "vide", "weapon"],
    "une panoplie ne doit contenir que des emplacements et son nom",
  );
});

test("l'etat actif se detecte sur les quatre emplacements", () => {
  const etat = {
    equipped: { weapon: "a", armor: "b", accessory: "c" },
    equippedAsh: "d",
  };
  const exacte = {
    nom: "x",
    weapon: "a",
    armor: "b",
    accessory: "c",
    ash: "d",
    vide: false,
  };
  assert.equal(lo.panoplieEstActive(exacte, etat), true);

  // La cendre compte : deux builds identiques sauf la cendre sont differents.
  assert.equal(
    lo.panoplieEstActive({ ...exacte, ash: "autre" }, etat),
    false,
    "la cendre doit entrer dans la comparaison",
  );
  assert.equal(lo.panoplieEstActive({ ...exacte, vide: true }, etat), false);
});

test("les panoplies survivent a un aller-retour de sauvegarde", () => {
  const panoplies = lo.normaliserPanoplies([
    { nom: "Statuts", weapon: "sword_broken", ash: "bloody_slash" },
  ]);
  const profilOut = profil.normalizePlayerProfile({ loadouts: panoplies });
  const relu = lo.normaliserPanoplies(profilOut.loadouts);

  assert.equal(relu[0].nom, "Statuts");
  assert.equal(relu[0].weapon, "sword_broken");
  assert.equal(relu[0].ash, "bloody_slash");
  assert.equal(relu[0].vide, false);
});
