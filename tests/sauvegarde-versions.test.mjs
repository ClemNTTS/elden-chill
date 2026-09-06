import assert from "node:assert/strict";
/*
 * Compatibilite des sauvegardes entre versions du jeu.
 *
 * Regression majeure de la 2.5 : la compatibilite exigeait la meme ligne
 * `major.minor`. Passer de 2.4.0 a 2.5.0 rendait donc chaque sauvegarde
 * existante "incompatible" — quarantaine, partie neuve, niveau 0, sur tous les
 * appareils du joueur a la fois. Ces tests figent la regle qui remplace celle-la
 * pour qu'aucune montee de version ne puisse la reintroduire.
 */
import test from "node:test";
import { profil } from "./aide.mjs";

const sauvegarde = await import("../save.js");
const crypto = await import("../save-crypto.js");

const {
  PLAYER_PROFILE_VERSION,
  isCompatibleSaveVersion,
  comparerVersions,
  normalizePlayerProfile,
} = profil;

const {
  SAVE_NAME,
  SAVE_BACKUP_NAME,
  SAVE_QUARANTINE_NAME,
  loadGame,
  lastLoadReport,
} = sauvegarde;

/** Ecrit une enveloppe scellee portant la version demandee. */
const poserSauvegarde = (cle, { version, level = 0, banked = 0 }) => {
  const profile = normalizePlayerProfile({
    stats: { level },
    runes: { banked },
  });
  profile.save.version = version;
  localStorage.setItem(cle, crypto.sealSave(profile));
  return profile;
};

const videStockage = () => {
  localStorage.clear();
};

test("une sauvegarde d'une version anterieure reste chargeable", () => {
  assert.equal(isCompatibleSaveVersion("2.4.0"), true);
  assert.equal(isCompatibleSaveVersion("2.3.1"), true);
  assert.equal(isCompatibleSaveVersion("2.0.0"), true);
  assert.equal(isCompatibleSaveVersion(PLAYER_PROFILE_VERSION), true);
});

/*
 * Toutes les versions publiees doivent rester chargeables.
 *
 * C'est le test qui aurait evite le desastre de la 2.5 : le passage de 2.4.0 a
 * 2.5.0 avait rendu chaque sauvegarde existante « incompatible », et les
 * joueurs sont repartis niveau 0 sur tous leurs appareils. Toute nouvelle
 * version publiee s'ajoute a cette liste ; si l'une d'elles cesse de passer,
 * c'est qu'on vient de reproduire le bug.
 */
test("chaque version publiee du jeu reste chargeable", () => {
  const PUBLIEES = ["2.0.0", "2.3.0", "2.3.1", "2.4.0", "2.5.0", "3.0.0"];
  for (const version of PUBLIEES) {
    assert.equal(
      isCompatibleSaveVersion(version),
      true,
      `une sauvegarde ${version} est refusee par la version ${PLAYER_PROFILE_VERSION}`,
    );
  }
});

test("le jeu, son manifeste et le profil annoncent la meme version", async () => {
  const fs = await import("node:fs");
  const lire = (chemin) =>
    JSON.parse(fs.readFileSync(new URL(chemin, import.meta.url), "utf8"))
      .version;

  /*
   * version-check.js compare version.json au numero embarque dans le bundle
   * pour detecter un deploiement. Si les deux divergent, chaque chargement
   * croit qu'une mise a jour vient de sortir et recharge la page en boucle.
   */
  assert.equal(lire("../version.json"), PLAYER_PROFILE_VERSION);
  assert.equal(lire("../package.json"), PLAYER_PROFILE_VERSION);
});

test("une sauvegarde plus recente que le code est refusee", () => {
  assert.equal(isCompatibleSaveVersion("9.9.9"), false);
});

test("une sauvegarde anterieure au format supporte est refusee", () => {
  assert.equal(isCompatibleSaveVersion("0.2.0"), false);
  assert.equal(isCompatibleSaveVersion(""), false);
  assert.equal(isCompatibleSaveVersion(undefined), false);
});

test("la comparaison de versions suit l'ordre numerique, pas l'ordre texte", () => {
  assert.equal(comparerVersions("2.10.0", "2.9.0"), 1);
  assert.equal(comparerVersions("2.5", "2.5.0"), 0);
  assert.equal(comparerVersions("2.4.9", "2.5.0"), -1);
});

test("une sauvegarde 2.4 posee dans le navigateur est relue sans perte", () => {
  videStockage();
  poserSauvegarde(SAVE_NAME, { version: "2.4.0", level: 125, banked: 4200 });

  const rapport = loadGame();

  assert.equal(rapport.status, "loaded");
  assert.equal(lastLoadReport.status, "loaded");
});

test("une progression mise en quarantaine est repechee sous une partie vierge", () => {
  videStockage();

  // L'etat laisse par le bug : une partie neuve en place, l'ancienne de cote.
  const ancienne = normalizePlayerProfile({
    stats: { level: 125 },
    runes: { banked: 4200 },
  });
  ancienne.save.version = "2.4.0";
  localStorage.setItem(
    SAVE_QUARANTINE_NAME,
    JSON.stringify({
      reason: "INCOMPATIBLE_VERSION",
      at: Date.now(),
      payload: crypto.sealSave(ancienne),
    }),
  );
  poserSauvegarde(SAVE_NAME, { version: PLAYER_PROFILE_VERSION, level: 0 });

  const rapport = loadGame();

  assert.equal(rapport.status, "recovered-quarantine");
  assert.equal(localStorage.getItem(SAVE_QUARANTINE_NAME), null);
});

test("une partie en cours n'est jamais remplacee par la quarantaine", () => {
  videStockage();

  const ancienne = normalizePlayerProfile({ stats: { level: 125 } });
  ancienne.save.version = "2.4.0";
  localStorage.setItem(
    SAVE_QUARANTINE_NAME,
    JSON.stringify({ reason: "TAMPERED", payload: crypto.sealSave(ancienne) }),
  );
  poserSauvegarde(SAVE_NAME, { version: PLAYER_PROFILE_VERSION, level: 7 });

  const rapport = loadGame();

  assert.equal(rapport.status, "loaded");
  assert.notEqual(localStorage.getItem(SAVE_QUARANTINE_NAME), null);
});

test("une enveloppe illisible ne chasse pas la copie de secours valable", () => {
  videStockage();
  poserSauvegarde(SAVE_BACKUP_NAME, {
    version: PLAYER_PROFILE_VERSION,
    level: 42,
  });
  localStorage.setItem(SAVE_NAME, "n'importe quoi");

  const rapport = loadGame();

  assert.equal(rapport.status, "restored-backup");
});
