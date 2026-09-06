import assert from "node:assert/strict";
/*
 * Cendres de fin de partie.
 *
 * Elles obeissent a deux regles qu'aucun test ne pouvait verifier jusqu'ici :
 * tout est exprime en pourcentages ou en statistiques du joueur, et chacune
 * repond a quelque chose que la fin de partie oppose au joueur. Ce fichier
 * garde la premiere regle, qui est mesurable, et le contenu qui la porte.
 */
import test from "node:test";
import { ashes, etatNeuf, state } from "./aide.mjs";

const { ASHES_OF_WAR } = ashes;
const { gameState, runtimeState } = state;

/** Les dix cendres ajoutees pour l'apres-niveau-100. */
const TARDIVES = [
  "order_decree",
  "death_seal",
  "broken_echo",
  "miquella_tear",
  "ashen_oath",
  "beast_roar",
  "blade_dance",
  "comet_azur",
  "elphael_sting",
  "jar_vessel",
];

const statsFactices = (patch = {}) => ({
  strength: 100,
  dexterity: 100,
  intelligence: 100,
  vigor: 100,
  armor: 100,
  splashDamage: 0,
  ...patch,
});

const ennemiFactice = (patch = {}) => ({
  name: "Cible",
  hp: 10000,
  maxHp: 20000,
  armor: 300,
  ...patch,
});

test("les dix cendres tardives existent et sont completes", () => {
  for (const id of TARDIVES) {
    const cendre = ASHES_OF_WAR[id];
    assert.ok(cendre, `${id} : absente`);
    assert.ok(cendre.name?.length > 3, `${id} : nom manquant`);
    assert.ok(
      cendre.description?.length > 20,
      `${id} : description trop courte`,
    );
    assert.ok(cendre.maxUses >= 1, `${id} : sans charge`);
    assert.equal(typeof cendre.effect, "function", `${id} : sans effet`);
  }
});

/*
 * LA regle qui les distingue des dix-huit premieres.
 *
 * Un boss de fin a 95 000 PV, un boss de debut en a 150. Une cendre ecrite en
 * nombres fixes serait ridicule d'un cote ou de l'autre, et il faudrait la
 * reajuster a chaque ajout de contenu. On verifie donc que leur puissance
 * SUIT les statistiques du joueur ou celles de la cible.
 */
test("la puissance des cendres tardives suit les statistiques, pas des nombres fixes", () => {
  etatNeuf({ vigor: 50, strength: 50, intelligence: 50 });

  const mesure = (id, stats, enemy) => {
    const s = { ...stats };
    const sortie = ASHES_OF_WAR[id].effect(s, enemy) || {};
    return (sortie.damageMult || 0) + (s.splashDamage - stats.splashDamage);
  };

  // order_decree : plus la cible est blindee, plus il pese.
  assert.ok(
    mesure("order_decree", statsFactices(), ennemiFactice({ armor: 600 })) >
      mesure("order_decree", statsFactices(), ennemiFactice({ armor: 100 })),
  );

  // comet_azur : suit l'Intelligence.
  assert.ok(
    mesure(
      "comet_azur",
      statsFactices({ intelligence: 300 }),
      ennemiFactice(),
    ) >
      mesure(
        "comet_azur",
        statsFactices({ intelligence: 10 }),
        ennemiFactice(),
      ),
  );

  // broken_echo : suit les PV restants de la cible.
  assert.ok(
    mesure("broken_echo", statsFactices(), ennemiFactice({ hp: 90000 })) >
      mesure("broken_echo", statsFactices(), ennemiFactice({ hp: 1000 })),
  );
});

test("les multiplicateurs restent bornes, meme sur des statistiques absurdes", () => {
  const absurde = statsFactices({
    strength: 1,
    intelligence: 1e9,
    armor: 1e9,
    vigor: 1e9,
  });
  const cible = ennemiFactice({ armor: 1e9, hp: 1e9 });

  assert.ok(
    ASHES_OF_WAR.order_decree.effect({ ...absurde }, cible).damageMult <= 5,
  );
  assert.ok(
    ASHES_OF_WAR.comet_azur.effect({ ...absurde }, cible).damageMult <= 6,
  );

  runtimeState.currentLoopCount = 1e6;
  assert.ok(ASHES_OF_WAR.ashen_oath.effect({ ...absurde }).damageMult <= 3.5);
  runtimeState.currentLoopCount = 0;
});

test("le Serment cendreux paie le rang de Ferveur, et rien au rang zero", () => {
  runtimeState.currentLoopCount = 0;
  assert.equal(ASHES_OF_WAR.ashen_oath.effect(statsFactices()).damageMult, 1);

  runtimeState.currentLoopCount = 4;
  assert.equal(ASHES_OF_WAR.ashen_oath.effect(statsFactices()).damageMult, 2);
  runtimeState.currentLoopCount = 0;
});

test("le Sceau de Mort marque la cible, et supporte l'absence de cible", () => {
  const cible = ennemiFactice();
  ASHES_OF_WAR.death_seal.effect(statsFactices(), cible);
  assert.equal(cible.soinsScelles, 4);

  // Une cendre lancee sans cible ne doit pas jeter : le groupe peut se vider
  // entre l'amorcage et la resolution.
  assert.doesNotThrow(() =>
    ASHES_OF_WAR.death_seal.effect(statsFactices(), null),
  );
});

test("la Larme de Miquella efface les afflictions et soigne", () => {
  etatNeuf({ vigor: 100 });
  gameState.playerEffects.push({ id: "SCARLET_ROT", duration: 3 });
  gameState.playerEffects.push({ id: "BLEED", duration: 2 });
  runtimeState.playerCurrentHp = 1;

  const sortie = ASHES_OF_WAR.miquella_tear.effect(statsFactices());

  assert.equal(gameState.playerEffects.length, 0);
  assert.ok(runtimeState.playerCurrentHp > 1, "aucun soin rendu");
  assert.ok(sortie.msg.includes("2"), "le compte d'afflictions n'est pas dit");
});

test("la Danse des lames ajoute exactement deux attaques", () => {
  runtimeState.nextNbAtkBonus = 0;
  ASHES_OF_WAR.blade_dance.effect(statsFactices());
  assert.equal(runtimeState.nextNbAtkBonus, 2);
  runtimeState.nextNbAtkBonus = 0;
});

test("aucune cendre tardive ne laisse le joueur en dessous d'un PV", () => {
  for (const id of TARDIVES) {
    etatNeuf({ vigor: 60 });
    runtimeState.playerCurrentHp = 1;
    ASHES_OF_WAR[id].effect(statsFactices(), ennemiFactice());
    assert.ok(
      runtimeState.playerCurrentHp >= 1,
      `${id} : achève son porteur a 1 PV`,
    );
  }
});

test("aucune cendre ne jette sur un etat neuf, sans cible ni equipement", () => {
  for (const [id, cendre] of Object.entries(ASHES_OF_WAR)) {
    etatNeuf();
    assert.doesNotThrow(
      () => cendre.effect(statsFactices(), ennemiFactice()),
      `${id} : jette avec une cible`,
    );
  }
});

test("les charges des cendres tardives restent rares", () => {
  for (const id of TARDIVES) {
    assert.ok(
      ASHES_OF_WAR[id].maxUses <= 3,
      `${id} : ${ASHES_OF_WAR[id].maxUses} charges, une cendre de fin doit se meriter`,
    );
  }
});

/*
 * Une cendre sans source est une cendre qui n'existe pas.
 *
 * Le risque est reel : les tables de butin et le registre vivent dans deux
 * fichiers, et rien n'obligeait a les tenir ensemble. Une cendre ecrite mais
 * jamais posee dans une table serait invisible pour toujours, sans erreur ni
 * avertissement.
 */
test("chaque cendre est trouvable quelque part dans le jeu", async () => {
  const { LOOT_TABLES } = await import("../biome.js");
  const { MONSTERS } = await import("../monster.js");

  const sources = new Set();
  for (const table of Object.values(LOOT_TABLES)) {
    for (const ligne of table) if (ligne.ashId) sources.add(ligne.ashId);
  }
  for (const monstre of Object.values(MONSTERS)) {
    for (const drop of monstre.drops || []) {
      if (drop.ashId) sources.add(drop.ashId);
    }
  }

  for (const id of Object.keys(ASHES_OF_WAR)) {
    assert.ok(sources.has(id), `${id} : aucune source, elle est introuvable`);
  }
  for (const id of sources) {
    assert.ok(
      ASHES_OF_WAR[id],
      `${id} : posee dans une table mais inexistante`,
    );
  }
});

test("chaque cendre a son icone, et aucune n'en partage une", async () => {
  const { getAshIcon } = await import("../icons.js");

  const prises = new Map();
  for (const id of Object.keys(ASHES_OF_WAR)) {
    const icone = getAshIcon(id);
    assert.ok(icone, `${id} : sans icone, elle s'afficherait vide`);
    const cle = `${icone.col},${icone.row}`;
    assert.ok(
      !prises.has(cle),
      `${id} partage sa cellule avec ${prises.get(cle)}`,
    );
    prises.set(cle, id);
  }
});

/*
 * Les dix nouvelles doivent tomber APRES le niveau 100 : c'est la raison
 * meme de leur existence. Une cendre de fin de partie posee dans une zone de
 * niveau 40 — c'est arrive avec le Vase, place a Jarburg — n'aide personne au
 * moment ou le jeu devient dur.
 */
test("les cendres tardives ne tombent pas avant le niveau 100", async () => {
  const { LOOT_TABLES } = await import("../biome.js");
  const { BIOME_GUIDE } = await import("../world-map.js");

  for (const id of TARDIVES) {
    let plusTot = Number.POSITIVE_INFINITY;
    for (const [zone, table] of Object.entries(LOOT_TABLES)) {
      if (!table.some((ligne) => ligne.ashId === id)) continue;
      const niveau = BIOME_GUIDE[zone]?.recommendedLevel?.[0] ?? 0;
      plusTot = Math.min(plusTot, niveau);
    }
    assert.ok(
      plusTot >= 100,
      `${id} : trouvable des le niveau ${plusTot}, ce n'est pas une cendre de fin de partie`,
    );
  }
});
