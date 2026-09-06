import assert from "node:assert/strict";
/*
 * Secondes phases des boss.
 *
 * Une seconde phase se resumait a « le boss tape plus fort » et son controle
 * etait ecrit deux fois, avec deux implementations divergentes. Ces tests
 * figent la forme unique, et surtout la contrainte qui gouverne le systeme :
 * le jeu doit pouvoir tourner sans personne devant l'ecran, donc aucun
 * comportement ne peut demander une reaction.
 */
import test from "node:test";
import { mountDomStub } from "../tools/headless-stub.mjs";

mountDomStub();

const bp = await import("../boss-phases.js");
const { MONSTERS } = await import("../monster.js");
const { BIOMES } = await import("../biome.js");
const { MAIN_BOSS_BIOMES } = await import("../rebirth.js");
const { STATUS_EFFECTS } = await import("../status.js");

/** Un boss minimal, a l'ancienne ecriture. */
const bossLegacy = (patch = {}) => ({
  name: "Boss",
  hp: 100,
  maxHp: 1000,
  atk: 100,
  armor: 100,
  hasSecondPhase: true,
  thresholdForPhase2: 0.5,
  isInSecondPhase: false,
  ...patch,
});

test("les deux ecritures de seconde phase se lisent pareil", () => {
  const ancien = bp.lirePhase2(
    bossLegacy({
      thresholdForPhase2: 0.4,
      dmgMultPhase2: 2,
      dodgePhase2: 0.3,
      flavorTextPhase2: "texte",
      comportementsPhase2: ["frenesie"],
    }),
  );
  const moderne = bp.lirePhase2({
    phase2: {
      seuil: 0.4,
      multDegats: 2,
      esquive: 0.3,
      texte: "texte",
      comportements: ["frenesie"],
    },
  });
  assert.deepEqual(ancien, moderne);
});

test("un monstre sans seconde phase n'en a pas", () => {
  assert.equal(bp.lirePhase2({ name: "x" }), null);
  assert.equal(bp.lirePhase2(null), null);
});

test("un comportement invente est ignore, pas propage", () => {
  const phase = bp.lirePhase2(
    bossLegacy({ comportementsPhase2: ["frenesie", "teleportation"] }),
  );
  assert.deepEqual(phase.comportements, ["frenesie"]);
});

test("la phase ne se declenche qu'au seuil, et une seule fois", () => {
  const boss = bossLegacy({ dmgMultPhase2: 2 });
  assert.equal(bp.declencherPhase2(boss, 600), null, "au-dessus du seuil");
  assert.equal(boss.isInSecondPhase, false);
  assert.equal(boss.atk, 100);

  const entree = bp.declencherPhase2(boss, 500);
  assert.notEqual(entree, null, "au seuil exactement");
  assert.equal(boss.isInSecondPhase, true);
  assert.equal(boss.atk, 200);

  assert.equal(bp.declencherPhase2(boss, 100), null, "jamais deux fois");
  assert.equal(boss.atk, 200, "les effets ne se cumulent pas");
});

test("les anciens champs continuent de fonctionner", () => {
  const boss = bossLegacy({
    dmgMultPhase2: 3,
    dodgePhase2: 0.4,
    effectsPhase2: { id: "BURN", duration: 3, chance: 0.5 },
    flavorTextPhase2: "Il hurle.",
  });
  const entree = bp.declencherPhase2(boss, 400);
  assert.equal(boss.atk, 300);
  assert.equal(boss.dodgeChance, 0.4);
  assert.equal(boss.onHitEffect.id, "BURN");
  assert.deepEqual(entree.messages, ["Il hurle."]);
});

/* ------------------------------------------------------------------ */
/* Comportements                                                      */
/* ------------------------------------------------------------------ */

test("la carapace double l'armure, une seule fois", () => {
  const boss = bossLegacy({ armor: 250, comportementsPhase2: ["carapace"] });
  bp.declencherPhase2(boss, 500);
  assert.equal(boss.armor, 500);
  bp.declencherPhase2(boss, 100);
  assert.equal(boss.armor, 500);
});

test("la frenesie ajoute exactement une attaque par tour", () => {
  const sansStats = bossLegacy({ comportementsPhase2: ["frenesie"] });
  bp.declencherPhase2(sansStats, 500);
  assert.equal(sansStats.specificStats.attacksPerTurn, 2);

  const avecStats = bossLegacy({
    comportementsPhase2: ["frenesie"],
    specificStats: { attacksPerTurn: 3 },
  });
  bp.declencherPhase2(avecStats, 500);
  assert.equal(avecStats.specificStats.attacksPerTurn, 4);
});

test("la regeneration rend une part des PV maximum a chaque tour", () => {
  const boss = bossLegacy({
    comportementsPhase2: ["regeneration"],
    phaseRegen: 0.1,
  });
  bp.declencherPhase2(boss, 500);
  assert.equal(bp.actionDePhase(boss).healAmount, 100);
  // Toujours actif au tour suivant : ce n'est pas un effet d'entree.
  assert.equal(bp.actionDePhase(boss).healAmount, 100);
});

test("la malediction n'impose qu'un statut connu du jeu", () => {
  const boss = bossLegacy({
    comportementsPhase2: ["malediction"],
    phaseMalediction: { id: "SCARLET_ROT", duration: 3 },
  });
  bp.declencherPhase2(boss, 500);
  const action = bp.actionDePhase(boss);
  assert.deepEqual(action.effets, [{ id: "SCARLET_ROT", duree: 3 }]);
  assert.ok(STATUS_EFFECTS[action.effets[0].id], "statut inconnu du jeu");

  // Sans reglage, le comportement ne fabrique pas d'affliction fantome.
  const muet = bossLegacy({ comportementsPhase2: ["malediction"] });
  bp.declencherPhase2(muet, 500);
  assert.deepEqual(bp.actionDePhase(muet).effets, []);
});

test("la riposte est plafonnee et ne depend pas du coup recu", () => {
  const boss = bossLegacy({
    comportementsPhase2: ["riposte"],
    phaseRiposte: 0.15,
  });
  bp.declencherPhase2(boss, 500);

  // 2% de 1000 PV max = 20, quoi qu'il arrive.
  assert.equal(bp.riposteDePhase(boss, 100).renvoi, 15);
  assert.equal(bp.riposteDePhase(boss, 1e9).renvoi, 20, "plafond a 2% des PV");
  assert.equal(bp.riposteDePhase(boss, 0).renvoi, 0);
  assert.equal(bp.riposteDePhase(boss, -50).renvoi, 0);
});

test("un ennemi sans comportement ne riposte pas", () => {
  assert.equal(bp.riposteDePhase(bossLegacy(), 1000).renvoi, 0);
  assert.equal(bp.riposteDePhase(null, 1000).renvoi, 0);
});

test("les echos sont affaiblis, et ne sont ni boss ni elite", () => {
  const boss = bossLegacy({
    name: "Titan",
    comportementsPhase2: ["invocation"],
    phaseInvocations: 3,
    phasePuissanceEcho: 0.2,
    isBoss: true,
    drops: [{ id: "oath_blade", chance: 1 }],
  });
  const entree = bp.declencherPhase2(boss, 500);

  assert.equal(entree.invocations.length, 3);
  for (const echo of entree.invocations) {
    assert.equal(echo.name, "Echo de Titan");
    assert.equal(echo.maxHp, 200);
    assert.equal(echo.atk, 20);
    /*
     * Sans ces garanties, un boss qui se dedouble triplerait ses drops, ferait
     * avancer trois fois un contrat de boss, et chacun de ses echos
     * declencherait sa propre seconde phase.
     */
    assert.equal(echo.isBoss, false);
    assert.equal(echo.isRare, false);
    assert.deepEqual(echo.drops, []);
    assert.equal(bp.lirePhase2(echo), null, "un echo n'a pas de phase 2");
    assert.deepEqual(bp.libellesDePhase(echo), []);
  }
});

test("la mue remplace l'affliction de contact", () => {
  const boss = bossLegacy({
    comportementsPhase2: ["mue"],
    onHitEffect: { id: "POISON", duration: 2, chance: 0.3 },
    phaseMue: { id: "DEATH_BLIGHT", duration: 3, chance: 0.4 },
  });
  bp.declencherPhase2(boss, 500);
  assert.equal(boss.onHitEffect.id, "DEATH_BLIGHT");
});

test("plusieurs comportements se cumulent sans s'ecraser", () => {
  const boss = bossLegacy({
    comportementsPhase2: ["regeneration", "drain", "malediction"],
    phaseRegen: 0.05,
    phaseDrain: 0.4,
    phaseMalediction: { id: "BURN", duration: 2 },
  });
  bp.declencherPhase2(boss, 500);
  const action = bp.actionDePhase(boss);
  assert.equal(action.healAmount, 50);
  assert.equal(action.drain, 0.4);
  assert.equal(action.effets.length, 1);
  assert.equal(action.messages.length, 3);
});

/* ------------------------------------------------------------------ */
/* Garde-fous de contenu                                              */
/* ------------------------------------------------------------------ */

test("chaque comportement declare un libelle et une description", () => {
  for (const [id, c] of Object.entries(bp.COMPORTEMENTS)) {
    assert.equal(typeof c.libelle, "string", `${id} : libelle manquant`);
    assert.ok(c.description?.length > 10, `${id} : description manquante`);
    assert.ok(
      c.surEntree || c.surTour || c.surDegatsSubis,
      `${id} : comportement sans effet`,
    );
  }
});

/*
 * LA regle du jeu : il doit pouvoir tourner sans personne devant l'ecran.
 *
 * Un comportement qui empecherait le joueur d'attaquer, ou qui exigerait une
 * action pour etre survecu, casserait le coeur du jeu. On verifie qu'aucun ne
 * renvoie skipTurn ni ne touche a l'etat du joueur.
 */
test("aucun comportement ne demande une reaction du joueur", () => {
  for (const [id, c] of Object.entries(bp.COMPORTEMENTS)) {
    const boss = bossLegacy({
      phaseMalediction: { id: "BURN", duration: 2 },
      phaseMue: { id: "BURN", duration: 2 },
    });
    const entree = c.surEntree?.(boss) || {};
    const tour = c.surTour?.(boss, {}) || {};
    const riposte = c.surDegatsSubis?.(boss, 100) || {};
    for (const action of [entree, tour, riposte]) {
      assert.equal(
        action.skipAttack,
        undefined,
        `${id} : empeche le joueur d'agir`,
      );
    }
  }
});

test("tous les boss principaux ont une seconde phase", () => {
  for (const zone of MAIN_BOSS_BIOMES) {
    const bossId = BIOMES[zone]?.boss;
    const boss = MONSTERS[bossId];
    assert.ok(boss, `${zone} : boss ${bossId} introuvable`);
    assert.notEqual(
      bp.lirePhase2(boss),
      null,
      `${bossId} (${zone}) : aucune seconde phase`,
    );
  }
});

test("tout boss qui declare un comportement en declare le reglage", () => {
  const exigences = {
    malediction: "phaseMalediction",
    mue: "phaseMue",
  };

  for (const [id, boss] of Object.entries(MONSTERS)) {
    const phase = bp.lirePhase2(boss);
    if (!phase) continue;
    for (const comportement of phase.comportements) {
      const champ = exigences[comportement];
      if (!champ) continue;
      assert.ok(
        boss[champ]?.id,
        `${id} : comportement « ${comportement} » sans ${champ}, il ne ferait rien`,
      );
      assert.ok(
        STATUS_EFFECTS[boss[champ].id],
        `${id} : ${champ} pointe un statut inconnu (${boss[champ].id})`,
      );
    }
  }
});
