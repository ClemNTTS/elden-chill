/*
 * Budget de points de vie d'une zone.
 *
 * Le contrat, formule par l'auteur du jeu : les monstres normaux sont faciles,
 * les elites blessent pour de bon, et le boss est le vrai combat — celui ou
 * l'on perd le gros de ses points de vie. On se presente donc devant lui a la
 * moitie de sa barre environ.
 *
 * Ce module mesure les quatre nombres qui disent si une zone respecte ce
 * contrat : le cout d'un groupe standard, celui d'une elite, celui de la
 * traversee entiere, et celui du boss. tools/banc-biome.mjs les affiche pour
 * une main donnee ; ici on les calcule pour la main de REFERENCE, celle que le
 * garde-fou de progression garantit, afin qu'un test puisse s'en servir.
 *
 * SECONDE MOITIE SEULEMENT : le feu de camp rend les points de vie a
 * mi-parcours, donc seule la seconde moitie decide de l'etat dans lequel on
 * arrive. Voir le modele detaille dans tools/banc-biome.mjs.
 *
 * CE QUE LE MODELE IGNORE, et qui le rend pessimiste : cendres de guerre,
 * soins, benedictions de preparation. Les bornes des tests sont larges en
 * consequence.
 */
import { mountDomStub } from "./headless-stub.mjs";

mountDomStub();

const { BUILDS, applyBuild, playerDamagePerTurn } = await import(
  "./simulate-balance.mjs"
);
const { degatsAfflictions, palierPour } = await import("./mesure-boss.mjs");
const { gameState, getEffectiveStats, getHealth } = await import("../state.js");
const { BIOMES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");
const { LEVEL_CAP_BASE, LEVEL_PER_MAIN_BOSS, MAIN_BOSS_BIOMES } = await import(
  "../rebirth.js"
);
const { MAX_LEVEL } = await import("../shared/player-profile.js");
const { BIOME_GUIDE, getBandeRecommandee } = await import("../world-map.js");

/** Tirages par rencontre : groupes et points de vie sont aleatoires. */
const TIRAGES = 10;

/*
 * Toutes les zones qui ont un boss et des monstres, annexes comprises.
 *
 * La premiere version ne couvrait que la trame principale. Les biomes annexes
 * n'etaient alors mesures par RIEN : le Lac de la Putrefaction coutait 47% des
 * points de vie par groupe standard et 68% par elite, soit trois fois le
 * budget entier avant meme le feu de camp. Un joueur de niveau 185 y mourait
 * sans jamais atteindre le milieu de la zone.
 *
 * Une zone facultative peut etre dure. Elle ne peut pas etre impossible sans
 * que personne ne s'en apercoive.
 */
export const ZONES_MESURABLES = Object.keys(BIOMES).filter(
  (id) => BIOMES[id].boss && BIOMES[id].monsters?.length && BIOME_GUIDE[id],
);

/*
 * Zones soumises au contrat.
 *
 * Les sept premieres de la trame en sont exclues, et c'est un CHOIX.
 *
 * Elles se traversent a 5-9% des points de vie et le boss n'y coute que 7 a
 * 19% : on termine l'Academie de Raya Lucaria a 88% de sa barre, tres loin du
 * budget de ~90% que le contrat demande. L'ecart est reel et mesure.
 *
 * Il reste en place parce que l'auteur du jeu, a qui ces chiffres ont ete
 * montres, a tranche : « jusqu'a l'Academie de Raya ca ne m'a pas choque. »
 * Le contrat decrit ce que la partie doit devenir, pas un uniforme a passer
 * sur les premieres heures — un debut de partie ou l'on meurt en traversant
 * Necrolimbe serait fidele au budget et infidele au jeu.
 *
 * Ne pas etendre cette liste vers le debut sans la meme conversation.
 */
/*
 * Zones dont la FORME a ete reglee sur le contrat.
 *
 * Liste explicite, et volontairement pas une regle du genre « tout ce qui est
 * apres l'Academie de Raya ». Deux raisons :
 *
 *   - « Jusqu'a l'Academie de Raya ca ne m'a pas choque » : la progression du
 *     debut convient telle quelle, tres en dessous du budget, et c'est assume ;
 *   - entre les deux, des zones annexes comme Nokron ou la Riviere Ainsel se
 *     jouent bien sans coller au contrat. Les y forcer durcirait ce que
 *     personne n'a signale.
 *
 * Y figurent la trame principale a partir du Plateau d'Altus, et les zones
 * annexes qu'on a du corriger parce qu'elles etaient infranchissables.
 *
 * Le Chateau Sol et l'Enclos des Champions en ont ete retires apres coup : une
 * fois rendus franchissables ils se traversent a 73% des points de vie, donc
 * plus doux que le contrat. Ce sont des zones facultatives et courtes ; les
 * durcir pour tenir une cible n'aurait servi que la cible.
 *
 * Tout le reste du jeu reste soumis aux regles de SURETE — franchissable, feu
 * de camp atteignable — qui, elles, ne souffrent aucune exception.
 */
export const ZONES_SOUS_CONTRAT = [
  ...MAIN_BOSS_BIOMES.slice(7),
  "rotlake",
  "divine_tower",
  "consecrated_snowfield",
  "mohgwyn_palace",
  "giants_catacombs",
  "miquella_haligtree",
  "elphael",
].filter((id) => ZONES_MESURABLES.includes(id));

const tailleDuGroupe = (combinaisons) => {
  if (!combinaisons) return 1;
  const r = Math.random();
  let cumul = 0;
  for (const entree of combinaisons) {
    cumul += entree.chance;
    if (r <= cumul) return entree.size;
  }
  return combinaisons.at(-1).size;
};

/*
 * Afflictions SUBIES, longtemps absentes du modele.
 *
 * On comptait ce que le joueur inflige et pas ce qu'il encaisse. Or au Lac de
 * la Putrefaction, quatre monstres sur cinq posent la Putrefaction, qui ronge
 * 5% des points de vie MAXIMUM par tour : sur un combat de dix tours, c'est la
 * moitie de la barre, invisible pour le banc. La zone paraissait dure, elle
 * etait mortelle.
 *
 * Modelise : putrefaction, poison et brulure, les trois qui tiquent chaque
 * tour. Le saignement et la gelure frappent par seuils sur le coup de
 * l'attaquant et sont deja, en partie, dans les degats directs. Le banc reste
 * donc un peu optimiste sur les zones de saignement.
 */
const degatsSubisParTour = (groupe, pvMax, niveau) => {
  let total = 0;
  for (const ennemi of groupe) {
    if (ennemi.hp <= 0 || !ennemi.affliction) continue;
    const { id, chance, duration } = ennemi.affliction;
    // Presence : au moins une pose par tour, prolongee par la duree.
    const presence = Math.min(1, chance * Math.max(1, duration));
    if (id === "SCARLET_ROT") total += pvMax * 0.05 * presence;
    else if (id === "POISON") total += niveau * 0.7 * presence;
    else if (id === "BURN") total += pvMax * 0.03 * presence;
  }
  return total;
};

/*
 * Cadence reelle d'un boss scripte.
 *
 * Le banc supposait que tout ennemi frappe une fois par tour a pleine
 * puissance. Douze boss ont un `onTurnAction` qui dit autre chose : certains
 * sautent des tours, d'autres frappent double. L'ecart va de 0,95 a 1,50 —
 * jusqu'a 50% de degats en plus ou en moins que ce que le banc comptait.
 *
 * C'est ce trou qui a laisse passer le Noble Godskin, a 0,95 : plus faible
 * qu'un boss sans mecanique, et personne ne pouvait le voir puisque la mesure
 * ne regardait pas la mecanique.
 *
 * On deroule douze tours a vide pour en tirer un multiplicateur moyen. Les
 * comportements qui dependent des points de vie restants (frenesie, carapace)
 * ne sont pas captures ici : ils passent par comportementsPhase2, que le banc
 * traite a part.
 */
const cadenceDe = (modele) => {
  if (typeof modele.onTurnAction !== "function") return 1;
  const sonde = { ...modele, hp: modele.hp, maxHp: modele.hp };
  let somme = 0;
  for (let tour = 0; tour < 12; tour += 1) {
    let action = {};
    try {
      action = modele.onTurnAction(sonde, {}) || {};
    } catch {
      return 1;
    }
    if (action.skipAttack) continue;
    somme += action.dmgMult || 1;
  }
  return somme / 12;
};

const instancier = (modele) => {
  const pv = Math.floor(
    modele.hp * (modele.isBoss || modele.isRare ? 1 : 1 + Math.random()),
  );
  return {
    hp: pv,
    maxHp: pv,
    atk: modele.atk,
    armor: modele.armor ?? 100,
    esquive: modele.dodgeChance ?? 0,
    cadence: modele.specificStats?.attacksPerTurn || 1,
    // Ce que son comportement de tour lui fait reellement infliger.
    scenario: cadenceDe(modele),
    boss: !!modele.isBoss,
    affliction: modele.onHitEffect || null,
  };
};

const composer = (modeleId) => {
  const modele = MONSTERS[modeleId];
  if (!modele) return [];
  const groupe = [];
  const taille = modele.companion
    ? 1
    : tailleDuGroupe(modele.groupCombinations);
  for (let i = 0; i < taille; i += 1) groupe.push(instancier(modele));
  if (modele.companion) {
    const nombre =
      modele.companionCount ?? tailleDuGroupe(modele.groupCombinations);
    for (let i = 0; i < nombre; i += 1) {
      const compagnon = MONSTERS[modele.companion[i % modele.companion.length]];
      if (compagnon) groupe.push(instancier(compagnon));
    }
  }
  return groupe;
};

const combattre = (
  eff,
  arme,
  groupe,
  pv,
  armurePhase2 = null,
  seuil = 0,
  pvMax = pv,
  niveau = 1,
) => {
  const depart = pv;
  let tours = 0;
  const total = groupe.reduce((n, e) => n + e.hp, 0);
  let restant = total;
  const esquive = Math.min(0.5, (gameState.stats.dexterity || 0) / 400);

  while (restant > 0 && pv > 0 && tours < 400) {
    tours += 1;
    const devant = groupe.find((e) => e.hp > 0);
    if (!devant) break;
    const armure =
      armurePhase2 && restant <= total * seuil ? armurePhase2 : devant.armor;
    const vivants = groupe.filter((e) => e.hp > 0).length;
    const coup = playerDamagePerTurn(eff, armure, vivants);
    devant.hp -=
      Math.floor(coup * (1 - devant.esquive)) +
      degatsAfflictions(eff, arme, devant, coup, devant.boss);
    restant = groupe.reduce((n, e) => n + Math.max(0, e.hp), 0);
    if (restant <= 0) break;

    const cadence = groupe.find((e) => e.hp > 0)?.cadence || 1;
    let recu = 0;
    for (const ennemi of groupe) {
      if (ennemi.hp > 0)
        recu += Math.floor(
          ennemi.atk * (ennemi.scenario ?? 1) * (100 / Math.max(1, eff.armor)),
        );
    }
    pv -= Math.floor(recu * cadence * (1 - esquive));
    pv -= Math.floor(degatsSubisParTour(groupe, pvMax, niveau));
  }
  return { perdus: depart - pv, tours, mort: pv <= 0 };
};

/** Budget mesure d'une zone, en part des points de vie maximum. */
export const mesurerBudgetZone = (biomeId) => {
  const biome = BIOMES[biomeId];
  const modeleBoss = MONSTERS[biome?.boss];
  /*
   * A quel niveau mesure-t-on ?
   *
   * Pour un biome de la trame principale, celui que le plafond garantit a son
   * etape : 80% du plafond, la promesse du garde-fou de progression.
   *
   * Pour un biome ANNEXE, il n'y a pas d'etape — il n'ouvre aucun niveau. On
   * prend le HAUT de sa bande recommandee : une zone facultative se visite
   * avec les niveaux gagnes sur la trame principale, donc en surniveau par
   * rapport a son plancher. Mesurer au plancher declarait perdues des zones
   * qu'un joueur reel a nettoyees — Nokron, le Manoir de Caria, la Riviere
   * Ainsel —, ce qui aurait conduit a les affaiblir pour rien.
   *
   * Sans ce cas, `indexOf` renvoyait -1, le plafond retombait a 25 et toutes
   * les zones annexes etaient mesurees au niveau 20 : elles ressortaient
   * toutes injouables, defaut de la mesure et non du jeu.
   */
  const rang = MAIN_BOSS_BIOMES.indexOf(biomeId);
  const niveau =
    rang >= 0
      ? Math.floor(
          Math.min(MAX_LEVEL, LEVEL_CAP_BASE + LEVEL_PER_MAIN_BOSS * rang) *
            0.8,
        )
      : (getBandeRecommandee(biomeId)?.[1] ?? 1);
  const palier = palierPour(biomeId, 8);

  applyBuild(BUILDS.int, niveau);
  gameState.inventory = [palier.arme, palier.armure, palier.accessoire]
    .filter(Boolean)
    .map((id) => ({ id, name: id, level: 8, count: 0 }));
  gameState.equipped = {
    weapon: palier.arme,
    armor: palier.armure,
    accessory: palier.accessoire,
  };

  const eff = getEffectiveStats();
  const PV = getHealth(eff.vigor);
  const cout = (ids) => {
    if (!ids?.length) return 0;
    let somme = 0;
    for (let i = 0; i < TIRAGES; i += 1) {
      for (const id of ids) {
        somme += combattre(
          eff,
          palier.arme,
          composer(id),
          PV,
          null,
          0,
          PV,
          niveau,
        ).perdus;
      }
    }
    return somme / (TIRAGES * ids.length) / PV;
  };

  const groupe = cout(biome.monsters);
  const elite = cout(biome.rareMonsters);
  const rencontres = Math.max(0, Math.floor(biome.length / 2) - 2);
  const traversee = groupe * rencontres + elite;
  /*
   * Premiere moitie : le meme nombre de rencontres, sans boss. C'est elle qui
   * decide si l'on atteint le feu de camp — et donc si la zone est jouable du
   * tout.
   */
  const premiereMoitie =
    groupe * Math.max(0, Math.floor(biome.length / 2) - 1) + elite;
  const arrivee = 1 - traversee;

  let boss = 0;
  let gagne = false;
  if (arrivee > 0) {
    const armurePhase2 = (modeleBoss.comportementsPhase2 || []).includes(
      "carapace",
    )
      ? (modeleBoss.armor ?? 100) * 2
      : null;
    /*
     * Le combat de boss est moyenne comme le reste.
     *
     * Mesure une seule fois, il faisait osciller le budget du Trone entre 90 et
     * 98% selon le tirage de points de vie, donc clignoter le test qui le garde.
     * Un garde-fou qui echoue une fois sur trois finit desactive.
     */
    let somme = 0;
    let morts = 0;
    for (let i = 0; i < TIRAGES; i += 1) {
      const r = combattre(
        eff,
        palier.arme,
        composer(biome.boss),
        PV * arrivee,
        armurePhase2,
        modeleBoss.thresholdForPhase2 ?? 0,
        PV,
        niveau,
      );
      somme += Math.min(arrivee, r.perdus / PV);
      if (r.mort) morts += 1;
    }
    boss = somme / TIRAGES;
    gagne = morts === 0;
  }

  return {
    biomeId,
    nom: biome.name,
    niveau,
    groupe,
    elite,
    traversee,
    premiereMoitie,
    arrivee,
    boss,
    total: traversee + boss,
    gagne,
  };
};
