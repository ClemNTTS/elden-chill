/*
 * A quel niveau un boss devient-il jouable ?
 *
 * La mesure vivait dans banc-boss.mjs, qui est un rapport qu'on lit a la main.
 * Elle en sort parce qu'un test s'en sert desormais : le plafond de niveau et
 * la difficulte des boss doivent rester compatibles, et cette verification-la
 * ne doit pas dependre de quelqu'un qui pense a lancer un outil.
 *
 * MARGE : combien de fois le joueur survit au temps qu'il met a tuer.
 *   marge 1 = il meurt au moment exact ou le boss tombe, sans aucune erreur
 *   marge 2 = il a de quoi se tromper
 *
 * Le modele est calibre sur six releves de terrain (voir banc-boss.mjs) :
 * l'ecart moyen est de -1,7 niveau depuis que les afflictions y sont entrees,
 * contre -6,2 avant. Il ignore encore les cendres, les benedictions et les
 * phases de boss, donc il reste legerement pessimiste : un boss qu'il declare
 * jouable l'est surement, un boss qu'il declare hors de portee merite d'etre
 * regarde.
 */
import { mountDomStub } from "./headless-stub.mjs";

mountDomStub();

const {
  BUILDS,
  applyBuild,
  enemyDamagePerTurn,
  lootPoolFor,
  playerDamagePerTurn,
} = await import("./simulate-balance.mjs");
const { gameState, getEffectiveStats, getHealth } = await import("../state.js");
const { BIOMES } = await import("../biome.js");
const { ITEMS } = await import("../item.js");
const { MONSTERS } = await import("../monster.js");
const { BIOME_GUIDE } = await import("../world-map.js");

/** Niveau au-dela duquel le balayage abandonne. */
export const NIVEAU_MAX_MESURE = 220;

/*
 * L'equipement reellement porte par le joueur qui a fourni les releves, dans
 * l'ordre ou il l'a adopte. Chaque palier vaut a partir du biome indique.
 */
export const PALIERS = [
  { des: "limgrave_west", arme: "kama", armure: null, accessoire: null },
  {
    des: "limgrave_north",
    arme: "kama",
    armure: "alchimist_suit",
    accessoire: "scholars_ring",
  },
  {
    des: "stormwind_castle",
    arme: "queen_staff",
    armure: "alchimist_suit",
    accessoire: "troll_necklace",
  },
  {
    des: "liurnia_south",
    arme: "carian_glintstone_staff",
    armure: "carian_knight_armor",
    accessoire: "troll_necklace",
  },
  {
    des: "raya_lucaria_academy",
    arme: "carian_glintstone_staff",
    armure: "carian_knight_armor",
    accessoire: "godrick_great_rune",
  },
  {
    des: "nokron",
    arme: "carian_glintstone_staff",
    armure: "carian_knight_armor",
    accessoire: "moon_of_nokstella",
  },
];

/*
 * Le rang d'un biome se lit sur son niveau recommande, PAS sur sa position
 * dans biome.js. L'ordre de declaration place le Plateau d'Altus, qui se joue
 * vers 160, avant Nokron, qui se joue vers 116 : choisir le palier
 * d'equipement avec cet ordre-la revenait a opposer le boss d'Altus a
 * l'equipement de l'Academie, deux chapitres trop tot.
 */
const ordre = Object.keys(BIOMES);
const rangDe = (id) => {
  const bande = BIOME_GUIDE[id]?.recommendedLevel?.[0];
  if (typeof bande === "number") return bande;
  const i = ordre.indexOf(id);
  return i === -1 ? 1e9 : i;
};

/*
 * Au-dela du dernier palier releve, l'equipement est CALCULE.
 *
 * Les paliers ci-dessus s'arretent a Nokron, parce que c'est la que s'arretent
 * les releves de terrain. Mesurer le Trone d'Elden avec le baton de Liurnia
 * n'a aucun sens : le banc declarait onze boss "hors de portee" alors qu'il
 * leur opposait un equipement de milieu de partie.
 *
 * Le piege connu, ecrit dans banc-boss.mjs, etait d'ouvrir tout le catalogue :
 * un personnage de niveau 1 battait Rennala avec cinq objets de fin de partie.
 * On ne prend donc QUE le butin des biomes deja traverses, ce qui est
 * exactement ce que le joueur a en main en arrivant.
 */
const cacheDesPaliers = new Map();

const NIVEAU_DE_REFERENCE = 150;

const palierCalcule = (biomeId, niveauObjet) => {
  const cle = `${biomeId}:${niveauObjet}`;
  if (cacheDesPaliers.has(cle)) return cacheDesPaliers.get(cle);

  const avant = ordre.filter((id) => rangDe(id) <= rangDe(biomeId));
  const pool = lootPoolFor(avant);
  const boss = MONSTERS[BIOMES[biomeId]?.boss];
  const armure = boss?.armor || 100;

  applyBuild(BUILDS.int, NIVEAU_DE_REFERENCE);
  gameState.inventory = pool.map((id) => ({
    id,
    name: id,
    level: niveauObjet,
    count: 0,
  }));
  gameState.equipped = { weapon: null, armor: null, accessory: null };

  // Deux passes : une panoplie ne se declare qu'une fois sa premiere piece
  // portee, elle ne peut donc pas gagner en une seule.
  for (let passe = 0; passe < 2; passe += 1) {
    for (const [emplacement, type] of Object.entries({
      weapon: "Arme",
      armor: "Armure",
      accessory: "Accessoire",
    })) {
      let meilleur = gameState.equipped[emplacement];
      let score = -1;
      for (const id of [null, ...pool]) {
        if (id && ITEMS[id].type !== type) continue;
        gameState.equipped[emplacement] = id;
        let eff;
        try {
          eff = getEffectiveStats();
        } catch {
          continue;
        }
        const note =
          playerDamagePerTurn(eff, armure) *
          Math.sqrt(Math.max(1, getHealth(eff.vigor)));
        if (note > score) {
          score = note;
          meilleur = id;
        }
      }
      gameState.equipped[emplacement] = meilleur;
    }
  }

  const palier = {
    des: biomeId,
    arme: gameState.equipped.weapon,
    armure: gameState.equipped.armor,
    accessoire: gameState.equipped.accessory,
    calcule: true,
  };
  cacheDesPaliers.set(cle, palier);
  return palier;
};

/** Dernier biome couvert par un palier releve sur le terrain. */
const DERNIER_RELEVE = PALIERS.at(-1).des;

/** Palier d'equipement en vigueur au moment ou l'on atteint ce biome. */
export const palierPour = (biomeId, niveauObjet = 6) => {
  if (rangDe(biomeId) > rangDe(DERNIER_RELEVE)) {
    return palierCalcule(biomeId, niveauObjet);
  }
  let choisi = PALIERS[0];
  for (const p of PALIERS) if (rangDe(p.des) <= rangDe(biomeId)) choisi = p;
  return choisi;
};

const equiper = (palier, niveauObjet) => {
  const porte = [palier.arme, palier.armure, palier.accessoire].filter(Boolean);
  gameState.inventory = porte.map((id) => ({
    id,
    name: id,
    level: niveauObjet,
    count: 0,
  }));
  gameState.equipped = {
    weapon: palier.arme,
    armor: palier.armure,
    accessory: palier.accessoire,
  };
};

/*
 * Afflictions posees par l'arme portee.
 *
 * Les ignorer n'etait pas une approximation acceptable : mesurees sur la Bete
 * d'Elden, elles pesent entre un tiers et deux tiers des degats reels. Un banc
 * qui les oublie declare "hors de portee" des boss que le jeu rend jouables,
 * et on finirait par affaiblir des boss pour compenser une erreur de mesure.
 *
 * Restent hors du modele : le saignement et la folie, qui dependent de jets a
 * l'impact, ainsi que les cendres et les benedictions. Le banc reste donc
 * pessimiste, mais d'un cran et non d'un facteur trois.
 */
export const afflictionsDeLArme = (armeId) => {
  const arme = ITEMS[armeId];
  if (!arme) return [];
  const source = [
    typeof arme.funcOnHit === "function" ? arme.funcOnHit.toString() : "",
    arme.onHitEffect ? JSON.stringify(arme.onHitEffect) : "",
  ].join(" ");
  return (
    ["SCARLET_ROT", "POISON", "FROSTBITE"]
      .filter((id) => source.includes(id))
      // A defaut de lire le jet exact, une chance prudente de 30%.
      .map((id) => ({ id, chance: arme.onHitEffect?.chance ?? 0.3 }))
  );
};

/** Degats d'affliction esperes par tour contre cette cible. */
export const degatsAfflictions = (eff, armeId, cible, coupDuTour, estBoss) => {
  const posees = afflictionsDeLArme(armeId);
  if (posees.length === 0) return 0;
  const pvMax = cible.maxHp || cible.hp || 100;
  const attaques = (eff.attacksPerTurn || 1) + (eff.extraAttackChance || 0);
  let total = 0;
  for (const { id, chance } of posees) {
    // Presence : au moins une pose dans le tour, prolongee par la duree.
    const presence = Math.min(
      1,
      (1 - (1 - chance) ** Math.max(1, attaques)) * 2,
    );
    if (id === "SCARLET_ROT") {
      // Bornee a la moitie du coup, comme dans status.js.
      total +=
        Math.min(Math.floor(pvMax * 0.05), Math.floor(coupDuTour * 0.5)) *
        presence;
    } else if (id === "POISON") {
      total +=
        Math.floor(pvMax * 0.01 + (eff.intelligence || 0) * 0.5) * presence;
    } else if (id === "FROSTBITE") {
      // Un palier tous les dix cumuls, soit environ un cinquieme par tour.
      const palier = Math.min(Math.floor(pvMax * 0.1) + 30, coupDuTour * 6);
      total += ((estBoss ? palier * 0.7 : palier) / 5) * presence;
    }
  }
  return Math.floor(total);
};

/** Marge du joueur contre ce boss, a ce niveau, avec cet equipement. */
export const margeContre = (boss, niveau, palier, niveauObjet = 6) => {
  applyBuild(BUILDS.int, niveau);
  equiper(palier, niveauObjet);
  let eff;
  try {
    eff = getEffectiveStats();
  } catch {
    return 0;
  }
  const pv = getHealth(eff.vigor);
  const coup = Math.max(1, playerDamagePerTurn(eff, boss.armor || 100));
  const parTour =
    coup +
    degatsAfflictions(eff, palier.arme, boss, coup, Boolean(boss.isBoss));
  const toursPourTuer = boss.hp / parTour;
  return pv / Math.max(1, enemyDamagePerTurn(eff, boss)) / toursPourTuer;
};

/** Premier niveau atteignant cette marge, ou null au-dela du balayage. */
export const niveauPourMarge = (boss, seuil, palier, niveauObjet = 6) => {
  for (let n = 1; n <= NIVEAU_MAX_MESURE; n += 1) {
    if (margeContre(boss, n, palier, niveauObjet) >= seuil) return n;
  }
  return null;
};

/** Niveau minimum viable contre le boss de ce biome. */
export const niveauDeSurvie = (biomeId, boss, niveauObjet = 6) =>
  niveauPourMarge(boss, 1, palierPour(biomeId, niveauObjet), niveauObjet);

/** Niveau confortable contre le boss de ce biome. */
export const niveauDeConfort = (biomeId, boss, niveauObjet = 6) =>
  niveauPourMarge(boss, 2, palierPour(biomeId, niveauObjet), niveauObjet);
