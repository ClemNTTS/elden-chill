/*
 * Contrats de zone.
 *
 * Deux proprietes portent tout le systeme, et ce sont elles que ces tests
 * verrouillent :
 *
 *   - un contrat legendaire paie en quelque chose que le farm ne donne PAS.
 *     Sinon il n'est qu'un raccourci, et le joueur optimal l'ignore ;
 *   - une recompense venue d'une sauvegarde est bornee. Le contrat est le seul
 *     endroit du jeu ou un objet de sauvegarde porte directement une quantite
 *     de runes et un niveau a verser.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mountDomStub } from "../tools/headless-stub.mjs";

mountDomStub();
const c = await import("../contracts.js");
const { CONTRACT_ITEM_IDS } = await import("../constants.js");
const { LOOT_TABLES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");

/** Generateur deterministe, pour que les tirages soient reproductibles. */
const suite = (valeurs) => {
  let i = 0;
  return () => valeurs[i++ % valeurs.length];
};

test("les objets de contrat sont introuvables ailleurs dans le jeu", () => {
  // C'est la promesse faite au joueur : sans elle, un contrat legendaire ne
  // vaut pas l'effort qu'il demande.
  for (const [biome, table] of Object.entries(LOOT_TABLES || {})) {
    for (const entree of table || []) {
      assert.ok(
        !CONTRACT_ITEM_IDS.includes(entree.id),
        `${entree.id} est dans la table de butin de ${biome}`,
      );
    }
  }

  for (const [id, monstre] of Object.entries(MONSTERS || {})) {
    for (const drop of monstre.drops || []) {
      assert.ok(
        !CONTRACT_ITEM_IDS.includes(drop.id),
        `${drop.id} tombe du monstre ${id}`,
      );
    }
  }
});

test("chaque objet exclusif est complet et equipable", async () => {
  const { ITEMS } = await import("../item.js");
  const { CONTRACT_ITEMS } = await import("../items/contracts.js");
  for (const id of CONTRACT_ITEM_IDS) {
    const objet = ITEMS[id];
    assert.ok(objet, `${id} absent de ITEMS`);
    assert.equal(typeof objet.name, "string");
    assert.ok(
      ["Arme", "Armure", "Accessoire"].includes(objet.type),
      `${id} : type invalide (${objet.type})`,
    );
    assert.ok(
      objet.description?.includes("Exclusif aux contrats"),
      `${id} : la description doit annoncer l'exclusivite`,
    );
  }
  assert.equal(Object.keys(CONTRACT_ITEMS).length, CONTRACT_ITEM_IDS.length);
});

test("les cinq panoplies couvrent un archetype chacune, en trois pieces", async () => {
  const { CONTRACT_ITEMS, SETS_PAR_ARCHETYPE, piecesDuSet } = await import(
    "../items/contracts.js"
  );
  const { ITEM_SETS } = await import("../constants.js");

  const archetypes = Object.keys(SETS_PAR_ARCHETYPE);
  assert.equal(archetypes.length, 5, "un set par archetype de build");

  for (const [archetype, setId] of Object.entries(SETS_PAR_ARCHETYPE)) {
    const pieces = piecesDuSet(setId);
    assert.equal(pieces.length, 3, `${setId} doit compter trois pieces`);

    // Une arme, une armure, un accessoire : sinon le set est inequipable,
    // puisque le jeu n'a que ces trois emplacements.
    const types = new Set(pieces.map((id) => CONTRACT_ITEMS[id].type));
    for (const attendu of ["Arme", "Armure", "Accessoire"]) {
      assert.ok(
        types.has(attendu),
        `${setId} (${archetype}) n'a pas de piece de type ${attendu}`,
      );
    }

    const def = ITEM_SETS[setId];
    assert.ok(def, `${setId} n'a pas de bonus de panoplie declare`);
    assert.ok(
      def.bonuses?.[2] && def.bonuses?.[3],
      `${setId} : bonus 2 et 3 requis`,
    );
  }
});

test("chaque piece exclusive declare son set", async () => {
  const { CONTRACT_ITEMS } = await import("../items/contracts.js");
  const { ITEM_SETS } = await import("../constants.js");
  for (const [id, objet] of Object.entries(CONTRACT_ITEMS)) {
    assert.ok(objet.set, `${id} sans set`);
    assert.ok(ITEM_SETS[objet.set], `${id} pointe vers un set inexistant`);
  }
});

test("aucun bonus d'objet de contrat ne depend de l'historique de la partie", async () => {
  /*
   * La premiere Lame du Serment lisait le NOMBRE de contrats honores. Le bonus
   * etait plafonne, mais le principe restait mauvais : compteur jamais remis a
   * zero, puissance illisible sur la fiche de l'objet, valeur dependante de
   * l'historique plutot que de l'etat present.
   *
   * Ce test echoue si un futur objet relit `contracts.completed` ou `total`.
   */
  const source = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("../items/contracts.js", import.meta.url), "utf8"),
  );
  assert.ok(
    !/contracts\?\.\s*(completed|total)/.test(source),
    "un objet de contrat lit un compteur cumulatif",
  );
});

test("le Serment est borne par la rarete du contrat en cours", async () => {
  const { CONTRACT_ITEMS } = await import("../items/contracts.js");
  const { gameState } = await import("../state.js");
  const lame = CONTRACT_ITEMS.oath_blade;

  const mesurer = () => {
    const stats = { strength: 100 };
    lame.applyMult(stats, 10);
    return stats.strength;
  };

  gameState.contracts = { actif: null, completed: 9999, total: 9999 };
  const sansContrat = mesurer();

  gameState.contracts.actif = { rarete: "commune", honore: false };
  const commune = mesurer();
  gameState.contracts.actif = { rarete: "legendaire", honore: false };
  const legendaire = mesurer();

  assert.ok(commune > sansContrat, "un contrat en cours doit donner un bonus");
  assert.ok(
    legendaire > commune,
    "le legendaire doit payer plus que la commune",
  );

  // Le plafond est atteint des le legendaire : rien ne peut aller au-dela.
  gameState.contracts.actif = { rarete: "legendaire", honore: true };
  assert.equal(
    mesurer(),
    sansContrat,
    "un contrat deja honore ne doit plus donner de bonus",
  );

  // Et surtout : 9999 contrats honores n'y changent rien.
  assert.equal(
    sansContrat,
    118,
    "sans contrat en cours, seul le +18% de base s'applique",
  );
  gameState.contracts = { actif: null, completed: 0, total: 0 };
});

test("une panoplie complete reste dans une fourchette raisonnable", async () => {
  /*
   * Garde-fou d'equilibrage, pas de correction.
   *
   * Les pieces se cumulent avec le bonus de set, et plusieurs convertissent
   * une statistique en une autre (armure -> force, intelligence -> zone). Une
   * conversion mal calibree ne produit pas d'erreur : elle produit un build
   * qui ecrase tous les autres, en silence.
   *
   * On borne donc le gain d'une panoplie de niveau 1 sur des statistiques
   * egales. Le seuil est large a dessein : ce test attrape un facteur dix, pas
   * un ajustement de dix pour cent.
   */
  const { gameState, getEffectiveStats } = await import("../state.js");
  const { SETS_PAR_ARCHETYPE, CONTRACT_ITEMS, piecesDuSet } = await import(
    "../items/contracts.js"
  );

  const statsDeBase = {
    level: 60,
    strength: 100,
    dexterity: 100,
    intelligence: 100,
    vigor: 100,
    armor: 100,
    splashDamage: 0,
    critChance: 0.05,
    critDamage: 1.5,
    critRanks: { chance: 0, damage: 0 },
    flatDamagePenetration: 0,
    percentDamagePenetration: 0,
    runesSpent: 0,
  };

  const mesurer = (equipement, inventaire) => {
    gameState.stats = { ...statsDeBase };
    gameState.inventory = inventaire;
    gameState.equipped = equipement;
    gameState.preparation = { activeRunBuffs: [] };
    return getEffectiveStats();
  };

  const nu = mesurer({ weapon: null, armor: null, accessory: null }, [
    { id: "fists", name: "poings", level: 10, count: 0 },
  ]);

  for (const [archetype, setId] of Object.entries(SETS_PAR_ARCHETYPE)) {
    const pieces = piecesDuSet(setId);
    const equipement = { weapon: null, armor: null, accessory: null };
    for (const id of pieces) {
      const type = CONTRACT_ITEMS[id].type;
      const cle =
        type === "Arme" ? "weapon" : type === "Armure" ? "armor" : "accessory";
      equipement[cle] = id;
    }

    const equipe = mesurer(equipement, [
      { id: "fists", name: "poings", level: 10, count: 0 },
      /*
       * Niveau 10 : c'est le SEUL niveau auquel ces pieces existent. Elles
       * sont toutes `isAlwaysMax` et arrivent directement a leur valeur
       * finale. Mesurer a 1 testerait un etat que le jeu ne produit jamais.
       */
      ...pieces.map((id) => ({
        id,
        name: CONTRACT_ITEMS[id].name,
        level: 10,
        count: 0,
      })),
    ]);

    for (const [cle, valeur] of Object.entries(equipe)) {
      if (typeof valeur === "number") {
        assert.ok(Number.isFinite(valeur), `${setId} : ${cle} vaut ${valeur}`);
      }
    }

    for (const cle of [
      "strength",
      "dexterity",
      "intelligence",
      "vigor",
      "armor",
    ]) {
      const rapport = equipe[cle] / (nu[cle] || 1);
      assert.ok(
        rapport <= 5,
        `${setId} (${archetype}) multiplie ${cle} par ${rapport.toFixed(1)} : verifier la conversion`,
      );
    }

    // Le set doit tout de meme apporter quelque chose de visible.
    const cleArchetype =
      archetype === "afflictions" ? "flatDamagePenetration" : archetype;
    assert.ok(
      equipe[cleArchetype] > nu[cleArchetype],
      `${setId} n'ameliore pas ${cleArchetype}, sa raison d'etre`,
    );
  }

  gameState.stats = { ...statsDeBase };
});

test("toute piece de contrat est isAlwaysMax et sans scaling par niveau", async () => {
  /*
   * Sans cela, le butin exclusif serait inatteignable a sa vraie valeur.
   *
   * Le jeu monte un objet de niveau avec des copies, et il en faut
   * `count >= level` a chaque palier : de 1 a 10, 45 copies. Seuls les contrats
   * rares et legendaires donnent un objet (38% des tirages), repartis sur trois
   * pieces — de l'ordre de 350 contrats pour amener UNE piece au maximum.
   *
   * Une piece de contrat qui naitrait au niveau 1 avec un scaling resterait
   * donc eternellement a sa valeur la plus faible, et un contrat legendaire
   * paierait moins qu'un objet ramasse sur un monstre.
   */
  const { CONTRACT_ITEMS } = await import("../items/contracts.js");
  const source = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("../items/contracts.js", import.meta.url), "utf8"),
  );

  for (const [id, objet] of Object.entries(CONTRACT_ITEMS)) {
    assert.equal(objet.isAlwaysMax, true, `${id} doit etre isAlwaysMax`);
    assert.ok(
      !/\(\+[^)]*\/ Niv\)/.test(objet.description || ""),
      `${id} : la description annonce encore un scaling par niveau`,
    );
  }

  assert.ok(
    !source.includes("itemLevel"),
    "une piece de contrat lit encore itemLevel : elle n'a pas de niveau a lire",
  );
});

test("une piece deja possedee n'est jamais reproposee", async () => {
  // Une copie n'ajoute rien a un objet isAlwaysMax. L'offrir en recompense
  // d'un contrat legendaire serait pire que de ne rien offrir.
  const { gameState } = await import("../state.js");
  const { proposerContrat, getContratActif } = await import("../actions.js");
  const { CONTRACT_ITEM_IDS, CONTRACTS_MIN_LEVEL } = await import(
    "../constants.js"
  );

  gameState.world.unlockedBiomes = ["limgrave_west"];
  // Au-dessus du seuil de deblocage : en dessous, aucun contrat n'est tire.
  gameState.stats = {
    ...gameState.stats,
    level: CONTRACTS_MIN_LEVEL,
    strength: 50,
  };
  gameState.equipped = { weapon: null, armor: null, accessory: null };
  gameState.inventory = [
    { id: "fists", name: "poings", level: 10, count: 0 },
    ...CONTRACT_ITEM_IDS.map((id) => ({ id, name: id, level: 10, count: 0 })),
  ];
  gameState.contracts = { actif: null, completed: 0, total: 0 };

  for (let i = 0; i < 30; i++) {
    proposerContrat("limgrave_west");
    const contrat = getContratActif();
    assert.equal(
      contrat.recompense.objet,
      null,
      "tout est deja possede : aucun objet ne doit etre promis",
    );
  }
});

test("la part d'objet est rendue en runes quand le pool est vide", () => {
  // Sinon un joueur qui a tout ramasse verrait ses contrats legendaires payer
  // comme des communs, et la rarete deviendrait un mot vide.
  const avecObjet = c.calculerRecompense(
    c.RARETES.LEGENDAIRE,
    40,
    "oath_blade",
  );
  const sansObjet = c.calculerRecompense(c.RARETES.LEGENDAIRE, 40, null);

  assert.equal(avecObjet.objet, "oath_blade");
  assert.equal(sansObjet.objet, null);
  assert.ok(
    sansObjet.runes > avecObjet.runes,
    `sans objet, les runes doivent compenser (${sansObjet.runes} vs ${avecObjet.runes})`,
  );

  // Une commune ne promet pas d'objet : elle ne doit donc rien compenser.
  assert.equal(
    c.calculerRecompense(c.RARETES.COMMUNE, 40, null).runes,
    c.calculerRecompense(c.RARETES.COMMUNE, 40, "oath_blade").runes,
  );
});

test("chaque panoplie domine sur SA statistique, et pas sur celle des autres", async () => {
  /*
   * Le garde-fou de fourchette ne suffit pas.
   *
   * Il avait laisse passer un vrai desequilibre : la panoplie VIGUEUR montait a
   * x2.14 en Force, contre x2.23 pour la panoplie FORCE, tout en offrant pres
   * du triple d'armure et +92% de soins recus. Aucun ratio ne depassait le
   * plafond, mais le set tank dominait le set de degats sur son propre terrain
   * — et le choix d'archetype n'avait plus d'objet.
   *
   * On verifie donc l'identite de chaque panoplie : celle d'un archetype doit
   * etre la meilleure sur la statistique qui la definit.
   */
  const { gameState, getEffectiveStats } = await import("../state.js");
  const { SETS_PAR_ARCHETYPE, CONTRACT_ITEMS, piecesDuSet } = await import(
    "../items/contracts.js"
  );

  const statsDeBase = {
    level: 60,
    strength: 100,
    dexterity: 100,
    intelligence: 100,
    vigor: 100,
    armor: 100,
    splashDamage: 0,
    critChance: 0.05,
    critDamage: 1.5,
    critRanks: { chance: 0, damage: 0 },
    flatDamagePenetration: 0,
    percentDamagePenetration: 0,
    runesSpent: 0,
  };

  const mesures = {};
  for (const [, setId] of Object.entries(SETS_PAR_ARCHETYPE)) {
    const pieces = piecesDuSet(setId);
    const equipement = { weapon: null, armor: null, accessory: null };
    for (const id of pieces) {
      const type = CONTRACT_ITEMS[id].type;
      equipement[
        type === "Arme" ? "weapon" : type === "Armure" ? "armor" : "accessory"
      ] = id;
    }
    gameState.stats = { ...statsDeBase };
    gameState.preparation = { activeRunBuffs: [] };
    gameState.inventory = [
      { id: "fists", name: "poings", level: 10, count: 0 },
      ...pieces.map((id) => ({ id, name: id, level: 10, count: 0 })),
    ];
    gameState.equipped = equipement;
    mesures[setId] = getEffectiveStats();
  }

  /*
   * La panoplie `setId` doit dominer sur `cle` AVEC UNE MARGE.
   *
   * La domination stricte ne suffit pas : dans le cas qui a motive ce test, la
   * panoplie VIGUEUR atteignait 96% de la Force de la panoplie FORCE. Elle ne
   * la depassait donc pas, et un test d'inegalite simple passait — alors qu'un
   * set qui offre 96% des degats du specialiste ET le triple de son armure
   * rend l'autre inutile.
   *
   * 25% de marge : assez pour qu'un specialiste reste identifiable, assez
   * large pour ne pas se declencher sur un ajustement mineur.
   */
  const MARGE = 1.25;
  const doitDominer = (setId, cle) => {
    for (const [autre, stats] of Object.entries(mesures)) {
      if (autre === setId) continue;
      const rapport = mesures[setId][cle] / (stats[cle] || 0.0001);
      assert.ok(
        rapport >= MARGE,
        `${setId} ne domine pas assez ${autre} sur ${cle} : ${mesures[setId][cle]} contre ${stats[cle]} (rapport ${rapport.toFixed(2)}, minimum ${MARGE})`,
      );
    }
  };

  doitDominer("OATHBOUND", "strength");
  doitDominer("MOURNER", "armor");
  doitDominer("ARCHIVIST", "splashDamage");
  doitDominer("BOUNTY_HUNTER", "critChance");

  /*
   * SENTENCE ne se mesure pas en statistiques.
   *
   * Sa penetration d'armure est elevee, mais ce n'est qu'un moyen : le moteur
   * convertit deja la Force en penetration (strength / 1.3), si bien que la
   * panoplie FORCE en obtient presque autant sans en faire son sujet. Tester
   * cette cle reviendrait a exiger que SENTENCE batte OATHBOUND sur un terrain
   * qui n'est pas le sien.
   *
   * Son identite, ce sont les afflictions. On compte donc combien chaque
   * panoplie en applique sur un coup, tirages forces au succes.
   */
  const compterAfflictions = (setId) =>
    piecesDuSet(setId).reduce((total, id) => {
      /*
       * Comptage statique sur le corps de funcOnHit plutot qu'execution.
       *
       * Executer ces fonctions ferait remonter applyEffect jusqu'aux
       * resistances, donc aux statistiques effectives et a l'etat de combat :
       * le test dependrait alors du moteur entier pour compter des lignes.
       */
      const corps = CONTRACT_ITEMS[id].funcOnHit?.toString() || "";
      return total + (corps.match(/applyEffect\(/g) || []).length;
    }, 0);

  const afflictionsSentence = compterAfflictions("SENTENCE");
  assert.ok(
    afflictionsSentence >= 2,
    `SENTENCE doit appliquer plusieurs afflictions par coup, il en applique ${afflictionsSentence}`,
  );
  for (const setId of Object.values(SETS_PAR_ARCHETYPE)) {
    if (setId === "SENTENCE") continue;
    assert.ok(
      afflictionsSentence > compterAfflictions(setId),
      `${setId} applique autant d'afflictions que SENTENCE, dont c'est la raison d'etre`,
    );
  }

  gameState.stats = { ...statsDeBase };
});

test("seule la rarete legendaire donne un niveau", () => {
  for (const rarete of Object.values(c.RARETES)) {
    const r = c.calculerRecompense(rarete, 50, "oath_blade");
    if (rarete === c.RARETES.LEGENDAIRE) {
      assert.equal(r.niveau, 1, "le legendaire doit donner un niveau");
    } else {
      assert.equal(r.niveau, 0, `${rarete} ne doit pas donner de niveau`);
    }
  }
});

test("la commune ne donne jamais d'objet, la rare et la legendaire oui", () => {
  assert.equal(
    c.calculerRecompense(c.RARETES.COMMUNE, 10, "oath_blade").objet,
    null,
  );
  assert.equal(
    c.calculerRecompense(c.RARETES.RARE, 10, "oath_blade").objet,
    "oath_blade",
  );
  assert.equal(
    c.calculerRecompense(c.RARETES.LEGENDAIRE, 10, "oath_blade").objet,
    "oath_blade",
  );
});

test("les runes croissent avec la rarete et avec le niveau du joueur", () => {
  const niveau = 40;
  const commune = c.calculerRecompense(c.RARETES.COMMUNE, niveau).runes;
  const rare = c.calculerRecompense(c.RARETES.RARE, niveau).runes;
  const legendaire = c.calculerRecompense(c.RARETES.LEGENDAIRE, niveau).runes;
  assert.ok(
    commune < rare && rare < legendaire,
    `${commune} / ${rare} / ${legendaire}`,
  );

  // L'indexation sur le niveau est ce qui garde les zones anciennes utiles.
  assert.ok(
    c.calculerRecompense(c.RARETES.COMMUNE, 100).runes >
      c.calculerRecompense(c.RARETES.COMMUNE, 10).runes,
    "la recompense doit suivre le niveau du joueur",
  );
});

test("un objectif est d'autant plus grand que la rarete est haute", () => {
  const commun = c.genererContrat({
    biomeId: "limgrave_west",
    nomBiome: "Necrolimbe",
    random: suite([0.0, 0.0]),
  });
  const legendaire = c.genererContrat({
    biomeId: "limgrave_west",
    nomBiome: "Necrolimbe",
    random: suite([0.99, 0.0]),
  });
  assert.equal(commun.rarete, c.RARETES.COMMUNE);
  assert.equal(legendaire.rarete, c.RARETES.LEGENDAIRE);
  assert.ok(
    legendaire.objectif > commun.objectif,
    `${legendaire.objectif} devrait depasser ${commun.objectif}`,
  );
});

test("les objectifs longs sont refuses aux contrats communs", () => {
  // Un contrat annonce comme rapide ne doit pas demander d'abattre un boss.
  const communs = c.modelesPour(c.RARETES.COMMUNE).map((m) => m.id);
  assert.ok(!communs.includes("boss"), "le boss ne doit pas tomber en commun");
  assert.ok(
    !communs.includes("ferveur"),
    "la Ferveur ne doit pas tomber en commun",
  );
  assert.ok(c.modelesPour(c.RARETES.LEGENDAIRE).length > communs.length);
});

test("un contrat n'avance que dans sa propre zone", () => {
  const contrat = c.genererContrat({
    biomeId: "limgrave_west",
    nomBiome: "Necrolimbe",
    random: suite([0.0, 0.0]),
  });
  const ailleurs = c.avancerContrat(
    contrat,
    contrat.evenement,
    5,
    "caelid_west",
  );
  assert.equal(ailleurs.avancement, 0, "un kill hors zone ne doit pas compter");

  const surPlace = c.avancerContrat(
    contrat,
    contrat.evenement,
    5,
    "limgrave_west",
  );
  assert.equal(surPlace.avancement, 5);
});

test("un evenement d'un autre type ne fait pas avancer", () => {
  const contrat = c.genererContrat({
    biomeId: "limgrave_west",
    random: suite([0.0, 0.0]),
  });
  const apres = c.avancerContrat(
    contrat,
    "evenement_inconnu",
    99,
    "limgrave_west",
  );
  assert.equal(apres.avancement, 0);
});

test("un contrat honore ne peut pas l'etre deux fois", () => {
  let contrat = c.genererContrat({
    biomeId: "limgrave_west",
    random: suite([0.0, 0.0]),
  });
  contrat = c.avancerContrat(contrat, contrat.evenement, 9999, "limgrave_west");
  assert.equal(contrat.honore, true);
  assert.equal(
    contrat.avancement,
    contrat.objectif,
    "l'avancement ne doit pas depasser",
  );

  const encore = c.avancerContrat(
    contrat,
    contrat.evenement,
    50,
    "limgrave_west",
  );
  assert.equal(
    encore.avancement,
    contrat.objectif,
    "un contrat fini ne bouge plus",
  );
});

test("la Ferveur se mesure en palier atteint, pas en cumul", () => {
  // Le rang est notifie tel quel a chaque cycle : additionner donnerait
  // 1+2+3 = 6 pour trois cycles au lieu du rang 3.
  const contrat = {
    evenement: "ferveur",
    biomeId: "z",
    objectif: 3,
    avancement: 0,
    honore: false,
  };
  let etat = c.avancerContrat(contrat, "ferveur", 1, "z");
  etat = c.avancerContrat(etat, "ferveur", 2, "z");
  assert.equal(
    etat.avancement,
    2,
    "le palier doit remplacer, pas s'additionner",
  );
  assert.equal(etat.honore, false);

  etat = c.avancerContrat(etat, "ferveur", 3, "z");
  assert.equal(etat.honore, true);

  // Un rang qui redescend ne doit pas faire reculer l'avancement acquis.
  const contratAcquis = { ...contrat, avancement: 2 };
  assert.equal(
    c.avancerContrat(contratAcquis, "ferveur", 1, "z").avancement,
    2,
  );
});

test("la progression reste entre 0 et 1", () => {
  assert.equal(c.progressionContrat(null), 0);
  assert.equal(c.progressionContrat({ avancement: 0, objectif: 10 }), 0);
  assert.equal(c.progressionContrat({ avancement: 5, objectif: 10 }), 0.5);
  assert.equal(c.progressionContrat({ avancement: 99, objectif: 10 }), 1);
});

test("une recompense forgee est bornee a la normalisation", () => {
  const forge = c.normaliserContrat({
    biomeId: "limgrave_west",
    objectif: 1,
    avancement: 1,
    rarete: "legendaire",
    recompense: { runes: 1e18, niveau: 9999, objet: "<script>" },
  });
  assert.ok(forge.recompense.runes <= 1e9, "les runes doivent etre plafonnees");
  assert.equal(
    forge.recompense.niveau,
    1,
    "un contrat ne donne jamais plus d'un niveau",
  );
  assert.equal(
    forge.recompense.objet,
    null,
    "un identifiant forge doit etre refuse",
  );
});

test("un contrat sans zone valable est rejete", () => {
  assert.equal(c.normaliserContrat(null), null);
  assert.equal(c.normaliserContrat({ biomeId: "<script>" }), null);
  assert.equal(c.normaliserContrat({ biomeId: 42 }), null);
  assert.equal(c.genererContrat({ biomeId: null }), null);
});

test("l'avancement d'une sauvegarde ne peut pas depasser l'objectif", () => {
  const out = c.normaliserContrat({
    biomeId: "limgrave_west",
    objectif: 5,
    avancement: 500,
  });
  assert.equal(out.avancement, 5);
  assert.equal(out.honore, true);
});

test("tout contrat genere est complet et affichable", () => {
  for (let i = 0; i < 200; i++) {
    const contrat = c.genererContrat({
      biomeId: "limgrave_west",
      nomBiome: "Necrolimbe Ouest",
      niveauJoueur: 1 + (i % 90),
      objetsExclusifs: CONTRACT_ITEM_IDS,
    });
    assert.ok(contrat.titre?.length > 0, "titre vide");
    assert.ok(
      contrat.texte?.includes(String(contrat.objectif)),
      "texte incoherent",
    );
    assert.ok(contrat.objectif >= 1);
    assert.ok(Number.isFinite(contrat.recompense.runes));
    assert.ok(Object.values(c.RARETES).includes(contrat.rarete));
    if (contrat.recompense.objet) {
      assert.ok(
        CONTRACT_ITEM_IDS.includes(contrat.recompense.objet),
        "un contrat ne doit recompenser qu'avec des objets exclusifs",
      );
    }
  }
});

/*
 * Verrou de niveau.
 *
 * Les contrats renvoient dans une zone deja depassee : avant d'avoir un
 * arriere, le systeme ne dit rien. Le verrou est pose dans les regles, pas
 * seulement dans l'affichage, pour qu'aucun chemin ne le contourne.
 */
test("aucun contrat n'existe sous le niveau de deblocage", async () => {
  const { gameState } = await import("../state.js");
  const { proposerContrat, getContratActif, contratsDebloques } = await import(
    "../actions.js"
  );
  const { CONTRACTS_MIN_LEVEL } = await import("../constants.js");

  gameState.world.unlockedBiomes = ["limgrave_west"];
  gameState.contracts = { actif: null, completed: 0, total: 0 };
  gameState.stats = { ...gameState.stats, level: CONTRACTS_MIN_LEVEL - 1 };

  assert.equal(contratsDebloques(), false);
  assert.equal(proposerContrat("limgrave_west"), null);
  assert.equal(getContratActif(), null);

  gameState.stats = { ...gameState.stats, level: CONTRACTS_MIN_LEVEL };

  assert.equal(contratsDebloques(), true);
  assert.notEqual(proposerContrat("limgrave_west"), null);
  assert.notEqual(getContratActif(), null);
});

/*
 * Aucun objectif ne doit etre hors d'atteinte.
 *
 * Le contrat legendaire de Ferveur demandait le rang 15 alors que
 * getFerveurRang() borne le rang a FERVEUR_RANG_MAX. La barre montait
 * jusqu'a 10 puis se figeait : le contrat le plus rare du jeu etait le seul a
 * ne jamais pouvoir tomber, et rien ne le disait.
 */
test("aucun contrat de Ferveur ne demande plus que le rang maximum", async () => {
  const { FERVEUR_RANG_MAX } = await import("../escalation.js");
  const modele = c.MODELES.find((m) => m.id === "ferveur");

  for (const rarete of Object.values(c.RARETES)) {
    const contrat = c.genererContrat({
      biomeId: "limgrave_west",
      nomBiome: "Necrolimbe Ouest",
      niveauJoueur: 150,
      // random fige sur ce modele : tirerRarete est force par le meme flux,
      // on verifie donc directement l'objectif calcule pour chaque rarete.
      random: () => 0,
    });
    assert.ok(contrat.objectif >= 1);
    if (contrat.evenement === "ferveur") {
      assert.ok(
        contrat.objectif <= FERVEUR_RANG_MAX,
        `objectif ${contrat.objectif} > rang max ${FERVEUR_RANG_MAX}`,
      );
    }
    void rarete;
  }

  // Le calcul brut, rarete par rarete, sans dependre du tirage.
  for (const [rarete, reglages] of Object.entries(c.REGLAGES_RARETE)) {
    const brut = Math.round(modele.base * reglages.facteurObjectif);
    assert.ok(
      Math.min(modele.plafond, brut) <= FERVEUR_RANG_MAX,
      `${rarete} : ${brut} depasse le rang maximum`,
    );
  }
});

/*
 * Le meme piege peut revenir sur un futur modele : tout objectif borne par une
 * mecanique du jeu doit declarer son plafond.
 */
test("tout modele borne par une mecanique declare son plafond", () => {
  for (const modele of c.MODELES) {
    if (modele.evenement !== "ferveur") continue;
    assert.equal(
      typeof modele.plafond,
      "number",
      `${modele.id} vise un rang borne : il doit declarer un plafond`,
    );
  }
});

/*
 * Annonce du deblocage.
 *
 * Le panneau se materialisait dans le camp sans un mot. Le drapeau vit dans la
 * sauvegarde pour que l'annonce ne se rejoue pas a chaque rechargement.
 */
test("le deblocage s'annonce une fois, et une seule", async () => {
  const { gameState } = await import("../state.js");
  const { verifierDeblocageContrats } = await import("../actions.js");
  const { CONTRACTS_MIN_LEVEL } = await import("../constants.js");

  gameState.contracts = { actif: null, completed: 0, total: 0, annonce: false };
  gameState.stats = { ...gameState.stats, level: CONTRACTS_MIN_LEVEL - 1 };
  assert.equal(verifierDeblocageContrats(), false, "rien sous le seuil");

  gameState.stats = { ...gameState.stats, level: CONTRACTS_MIN_LEVEL };
  assert.equal(verifierDeblocageContrats(), true, "annonce au franchissement");
  assert.equal(gameState.contracts.annonce, true);
  assert.equal(verifierDeblocageContrats(), false, "jamais deux fois");
});

test("le drapeau d'annonce traverse la sauvegarde", async () => {
  const { normalizePlayerProfile } = await import(
    "../shared/player-profile.js"
  );
  assert.equal(
    normalizePlayerProfile({ contracts: { annonce: true } }).contracts.annonce,
    true,
  );
  assert.equal(normalizePlayerProfile({}).contracts.annonce, false);
});

/* ================================================================== *
 * Modeles de contrainte, filtres, echeance et chaine                 *
 * ================================================================== */

test("les neuf modeles sont distincts et complets", () => {
  const ids = c.MODELES.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, "identifiants dupliques");
  for (const m of c.MODELES) {
    assert.equal(typeof m.evenement, "string");
    assert.ok(m.base >= 1, `${m.id} : base invalide`);
    assert.equal(typeof m.titre(3, "Zone", m.filtre), "string");
    const texte = m.texte(3, "Zone", m.filtre || m.filtres?.[0]);
    assert.ok(texte.length > 10, `${m.id} : texte trop court`);
    assert.ok(!texte.includes("undefined"), `${m.id} : ${texte}`);
  }
});

test("un filtre ecarte un evenement qui ne porte pas l'etiquette", () => {
  const base = {
    evenement: "monstre",
    filtre: c.FILTRES.AFFLICTION,
    objectif: 3,
    avancement: 0,
    biomeId: "z",
    honore: false,
  };
  assert.equal(c.avancerContrat(base, "monstre", 1, "z", []).avancement, 0);
  assert.equal(
    c.avancerContrat(base, "monstre", 1, "z", [c.FILTRES.RAPIDE]).avancement,
    0,
  );
  assert.equal(
    c.avancerContrat(base, "monstre", 1, "z", [c.FILTRES.AFFLICTION])
      .avancement,
    1,
  );
});

test("une mort remet a zero un contrat « sans mourir », meme hors zone", () => {
  const contrat = {
    evenement: "cycle",
    annuleSur: "mort",
    objectif: 3,
    avancement: 2,
    biomeId: "z",
    honore: false,
  };
  assert.equal(c.avancerContrat(contrat, "mort", 1, null).avancement, 0);
  assert.equal(c.avancerContrat(contrat, "mort", 1, "autre").avancement, 0);
  // Un contrat sans annuleSur ne bronche pas.
  const ordinaire = { ...contrat, annuleSur: null };
  assert.equal(c.avancerContrat(ordinaire, "mort", 1, null).avancement, 2);
});

test("l'echeance se decompte partout et finit par expirer", () => {
  let contrat = {
    evenement: "cycle",
    objectif: 10,
    avancement: 0,
    biomeId: "z",
    echeance: 3,
    cyclesRestants: 3,
    expire: false,
    honore: false,
  };
  contrat = c.ecoulerEcheance(contrat);
  assert.equal(contrat.cyclesRestants, 2);
  assert.equal(contrat.expire, false);
  contrat = c.ecoulerEcheance(c.ecoulerEcheance(contrat));
  assert.equal(contrat.cyclesRestants, 0);
  assert.equal(contrat.expire, true);
  // Expire, il n'avance plus.
  assert.equal(c.avancerContrat(contrat, "cycle", 1, "z").avancement, 0);
});

test("un contrat honore ne peut plus expirer", () => {
  const honore = {
    evenement: "cycle",
    objectif: 1,
    avancement: 1,
    honore: true,
    echeance: 1,
    cyclesRestants: 1,
    expire: false,
  };
  // Rendu tel quel, sans copie : rien n'a bouge.
  assert.equal(c.ecoulerEcheance(honore), honore);
  assert.equal(c.ecoulerEcheance(honore).expire, false);
  assert.equal(c.ecoulerEcheance(honore).cyclesRestants, 1);
});

test("une chaine avance d'etape en etape puis paie sa prime", () => {
  const premier = c.genererContrat({
    biomeId: "limgrave_west",
    nomBiome: "Necrolimbe Ouest",
    niveauJoueur: 150,
    chaineHeritee: { rang: 1, sur: 3 },
    random: () => 0.5,
  });
  assert.equal(
    premier.rarete,
    c.RARETES.LEGENDAIRE,
    "une chaine reste legendaire",
  );
  assert.deepEqual(premier.chaine, { rang: 1, sur: 3 });
  assert.equal(c.primeDeChaine(premier), 0, "pas de prime avant la fin");

  const deuxieme = c.etapeSuivanteChaine(premier, {
    biomeId: "liurnia_lake",
    nomBiome: "Lac de Liurnia",
    niveauJoueur: 150,
    random: () => 0.5,
  });
  assert.equal(deuxieme.chaine.rang, 2);

  const dernier = { ...deuxieme, chaine: { rang: 3, sur: 3 } };
  assert.equal(
    c.etapeSuivanteChaine(dernier, {}),
    null,
    "pas de quatrieme etape",
  );
  assert.equal(
    c.primeDeChaine(dernier),
    Math.floor(dernier.recompense.runes * c.PRIME_CHAINE),
  );
});

test("un contrat a echeance paie plus qu'un contrat sans delai", () => {
  const sansDelai = c.genererContrat({
    biomeId: "z",
    nomBiome: "Zone",
    niveauJoueur: 100,
    // random tres haut : pas d'echeance (CHANCE_ECHEANCE = 0.35), pas de chaine
    random: () => 0.99,
  });
  assert.equal(sansDelai.echeance, 0);

  // On rejoue le meme tirage en forcant l'echeance a se declencher.
  let appels = 0;
  const avecDelai = c.genererContrat({
    biomeId: "z",
    nomBiome: "Zone",
    niveauJoueur: 100,
    // Les premiers tirages choisissent rarete/modele/filtre/objet ; seul le
    // tirage d'echeance doit passer sous le seuil.
    random: () => {
      appels += 1;
      return appels >= 4 ? 0.01 : 0.99;
    },
  });
  if (avecDelai.echeance > 0) {
    assert.ok(avecDelai.recompense.runes > sansDelai.recompense.runes);
    assert.equal(avecDelai.cyclesRestants, avecDelai.echeance);
  }
});

test("la normalisation refuse un filtre invente et borne la chaine", () => {
  const propre = c.normaliserContrat({
    biomeId: "z",
    objectif: 5,
    avancement: 1,
    filtre: "<script>",
    chaine: { rang: 99, sur: 9999 },
    echeance: 1e9,
    cyclesRestants: -5,
  });
  assert.equal(propre.filtre, null);
  assert.equal(propre.chaine.sur, 10);
  assert.equal(propre.chaine.rang, 10);
  assert.equal(propre.echeance, 999);
  assert.equal(propre.cyclesRestants, 0);
  assert.equal(propre.expire, true, "delai epuise et objectif non atteint");

  const valide = c.normaliserContrat({
    biomeId: "z",
    objectif: 5,
    filtre: c.FILTRES.MEUTE,
  });
  assert.equal(valide.filtre, c.FILTRES.MEUTE);
  assert.equal(valide.chaine, null);
});

test("chaque filtre du catalogue porte un libelle", () => {
  for (const filtre of Object.values(c.FILTRES)) {
    assert.equal(
      typeof c.LIBELLE_FILTRE[filtre],
      "string",
      `${filtre} : libelle manquant, le texte du contrat dirait "undefined"`,
    );
  }
});

test("tout filtre declare par un modele existe au catalogue", () => {
  const connus = new Set(Object.values(c.FILTRES));
  for (const m of c.MODELES) {
    for (const f of m.filtres || (m.filtre ? [m.filtre] : [])) {
      assert.ok(connus.has(f), `${m.id} : filtre inconnu ${f}`);
    }
  }
});
