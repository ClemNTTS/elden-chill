import assert from "node:assert/strict";
/*
 * Assainissement des sauvegardes.
 *
 * Une sauvegarde n'est pas une entree de confiance : le sceau HMAC empeche
 * l'edition triviale mais sa clef est livree avec le bundle, et le code de
 * transfert est fait pour circuler entre joueurs. Un nom d'objet forge
 * atteignait `innerHTML` sans filtre.
 */
import test from "node:test";
import { profil } from "./aide.mjs";

const { normalizePlayerProfile } = profil;

const CHARGES_UTILES = [
  '<img src=x onerror="alert(1)">',
  "<script>alert(1)</script>",
  '"><svg onload=alert(1)>',
  "<iframe src=javascript:alert(1)>",
  "javascript:alert(1)",
  "<a href='x'>lien</a>",
];

test("un nom d'objet forge ne peut plus porter de balisage", () => {
  for (const charge of CHARGES_UTILES) {
    const out = normalizePlayerProfile({
      inventory: [{ id: "fists", name: charge, level: 1, count: 1 }],
    });
    const nom = out.inventory[0].name;

    for (const interdit of ["<", ">", "&", '"', "'", "`"]) {
      assert.ok(
        !nom.includes(interdit),
        `"${interdit}" a survecu dans "${nom}" (charge : ${charge})`,
      );
    }
  }
});

test("un identifiant d'objet forge fait rejeter la ligne", () => {
  const out = normalizePlayerProfile({
    inventory: [
      { id: "<script>", name: "x", level: 1 },
      { id: "../../etc/passwd", name: "y", level: 1 },
      { id: "fists", name: "poings", level: 1 },
    ],
  });
  assert.equal(out.inventory.length, 1, "des lignes invalides ont survecu");
  assert.equal(out.inventory[0].id, "fists");
});

test("un emplacement equipe illisible retombe a null", () => {
  const out = normalizePlayerProfile({
    equipped: {
      weapon: "<img onerror=1>",
      armor: "plate_armor",
      accessory: null,
    },
  });
  assert.equal(out.equipped.weapon, null);
  assert.equal(out.equipped.armor, "plate_armor");
  assert.equal(out.equipped.accessory, null);
});

test("une cendre equipee forgee est refusee", () => {
  const out = normalizePlayerProfile({ equippedAsh: "<svg onload=1>" });
  assert.equal(out.equippedAsh, null);

  const bon = normalizePlayerProfile({ equippedAsh: "bloody_slash" });
  assert.equal(bon.equippedAsh, "bloody_slash");
});

test("les cendres possedees sont filtrees une a une", () => {
  const out = normalizePlayerProfile({
    ashesOfWarOwned: ["bloody_slash", "<script>", null, 42, "golden_vow"],
  });
  assert.deepEqual(out.ashesOfWarOwned, ["bloody_slash", "golden_vow"]);
});

test("les nombres de la sauvegarde sont bornes", () => {
  const out = normalizePlayerProfile({
    runes: { banked: -500, carried: "beaucoup" },
    stats: { level: -10 },
    inventory: [{ id: "fists", name: "poings", level: -3, count: -7 }],
  });
  assert.equal(out.runes.banked, 0);
  assert.equal(out.runes.carried, 0);
  assert.equal(out.stats.level, 0);
  assert.ok(out.inventory[0].level >= 0);
  assert.ok(out.inventory[0].count >= 0);
});

test("un nom legitime traverse la normalisation intact", () => {
  const out = normalizePlayerProfile({
    inventory: [
      {
        id: "sword_broken",
        name: "Epee brisee du Sans-Eclat",
        level: 3,
        count: 2,
      },
    ],
  });
  assert.equal(out.inventory[0].name, "Epee brisee du Sans-Eclat");
  assert.equal(out.inventory[0].level, 3);
  assert.equal(out.inventory[0].count, 2);
});

test("un inventaire vide ou absurde retombe sur l'inventaire par defaut", () => {
  for (const entree of [
    undefined,
    null,
    [],
    "pas un tableau",
    [{}, { id: 42 }],
  ]) {
    const out = normalizePlayerProfile({ inventory: entree });
    assert.ok(
      out.inventory.length > 0,
      `inventaire vide pour ${JSON.stringify(entree)}`,
    );
    assert.ok(out.inventory.every((i) => typeof i.id === "string"));
  }
});

test("une sauvegarde vide produit un profil complet et coherent", () => {
  const out = normalizePlayerProfile({});
  assert.ok(out.stats && out.runes && out.world && out.inventory);
  assert.ok(out.world.unlockedBiomes.length > 0);
  assert.equal(
    typeof out.save.profileId === "string" || out.save.profileId === undefined,
    true,
  );
});
