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

/** Tirages par rencontre : groupes et points de vie sont aleatoires. */
const TIRAGES = 10;

/*
 * Zones soumises au contrat.
 *
 * Les sept premieres en sont exclues, et c'est un CHOIX, pas un oubli.
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
export const ZONES_SOUS_CONTRAT = MAIN_BOSS_BIOMES.slice(7);

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
    boss: !!modele.isBoss,
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

const combattre = (eff, arme, groupe, pv, armurePhase2 = null, seuil = 0) => {
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
        recu += Math.floor(ennemi.atk * (100 / Math.max(1, eff.armor)));
    }
    pv -= Math.floor(recu * cadence * (1 - esquive));
  }
  return { perdus: depart - pv, tours, mort: pv <= 0 };
};

/** Budget mesure d'une zone, en part des points de vie maximum. */
export const mesurerBudgetZone = (biomeId) => {
  const biome = BIOMES[biomeId];
  const modeleBoss = MONSTERS[biome?.boss];
  const rang = MAIN_BOSS_BIOMES.indexOf(biomeId);
  const plafond = Math.min(
    MAX_LEVEL,
    LEVEL_CAP_BASE + LEVEL_PER_MAIN_BOSS * Math.max(0, rang),
  );
  // Le niveau que le garde-fou de progression garantit a cette etape.
  const niveau = Math.floor(plafond * 0.8);
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
        somme += combattre(eff, palier.arme, composer(id), PV).perdus;
      }
    }
    return somme / (TIRAGES * ids.length) / PV;
  };

  const groupe = cout(biome.monsters);
  const elite = cout(biome.rareMonsters);
  const rencontres = Math.max(0, Math.floor(biome.length / 2) - 2);
  const traversee = groupe * rencontres + elite;
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
    arrivee,
    boss,
    total: traversee + boss,
    gagne,
  };
};
