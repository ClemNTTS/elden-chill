/*
 * Dans quel etat arrive-t-on devant le boss ?
 *
 * banc-boss.mjs mesure un boss a pleine vie. Ce n'est jamais le cas en jeu :
 * on traverse le biome d'abord. Le feu de camp, a mi-parcours, rend les points
 * de vie — seule la SECONDE MOITIE du biome compte donc, et c'est elle qui
 * decide si le boss est jouable.
 *
 * MODELE DE L'APPROCHE :
 *
 *   rencontres standard = plancher(longueur / 2) - 2
 *   plus UNE rencontre d'elite, un rare apparaissant dans la derniere portion
 *
 * Les deux soustraits sont la place du boss et celle de l'elite.
 *
 * Chaque rencontre est simulee plusieurs fois, groupes et compagnons compris,
 * et on retient la moyenne des points de vie perdus. Le boss est ensuite livre
 * avec ce qui reste, pas avec la barre pleine.
 *
 * CE QUE LE MODELE IGNORE, et qui le rend PESSIMISTE : cendres de guerre,
 * soins, benedictions de preparation, afflictions posees par le joueur,
 * esquive apportee par les objets au-dela de la dexterite. Il est OPTIMISTE
 * sur un point : il suppose qu'on encaisse chaque groupe sans jamais se replier.
 *
 *   node tools/banc-biome.mjs --biome=altus_plateau --niveau=165 \
 *     --stats=intelligence:135,vigor:30 \
 *     --arme=loretta_glintstone_sickle --armure=alchimist_suit \
 *     --accessoire=lunar_resilience_talisman
 */
import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();

const { playerDamagePerTurn } = await import("./simulate-balance.mjs");
const { gameState, getEffectiveStats, getHealth } = await import("../state.js");
const { syncCritStats, getCritPointsTotal, CRIT_MAX_RANK } = await import(
  "../crit.js"
);
const { MONSTERS } = await import("../monster.js");
const { BIOMES } = await import("../biome.js");
const { ITEMS } = await import("../item.js");

const NL = String.fromCharCode(10);
const arg = (nom, defaut) =>
  process.argv.find((x) => x.startsWith(`--${nom}=`))?.split("=")[1] ?? defaut;

const BIOME_ID = arg("biome", "altus_plateau");
const NIVEAU = Number(arg("niveau", 165));
const NIVEAU_OBJET = Number(arg("niveau-objet", 10));
const TIRAGES = Number(arg("tirages", 10));

/* ------------------------------------------------------------------ */
/* Personnage                                                         */
/* ------------------------------------------------------------------ */

const s = gameState.stats;
s.vigor = 0;
s.strength = 0;
s.dexterity = 0;
s.intelligence = 0;
for (const part of arg("stats", "intelligence:135,vigor:30").split(",")) {
  const [nom, valeur] = part.split(":");
  s[nom] = Number(valeur);
}
s.level = NIVEAU;
const pts = getCritPointsTotal();
s.critRanks = {
  chance: Math.min(CRIT_MAX_RANK.chance, Math.floor(pts * 0.6)),
  damage: Math.min(CRIT_MAX_RANK.damage, pts - Math.floor(pts * 0.6)),
};
syncCritStats();

const equipement = {
  weapon: arg("arme", null),
  armor: arg("armure", null),
  accessory: arg("accessoire", null),
};
gameState.inventory = Object.values(equipement)
  .filter(Boolean)
  .map((id) => ({ id, name: id, level: NIVEAU_OBJET, count: 0 }));
gameState.equipped = equipement;

const eff = getEffectiveStats();
const PV_MAX = getHealth(eff.vigor);

/* ------------------------------------------------------------------ */
/* Composition d'un groupe, comme spawn.js                            */
/* ------------------------------------------------------------------ */

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
  // Les monstres standard tirent entre x1 et x2 de points de vie, comme
  // createEnemyInstance(). Boss et rares n'y ont pas droit.
  const variation = modele.isBoss || modele.isRare ? 1 : 1 + Math.random();
  const pv = Math.floor(modele.hp * variation);
  return {
    nom: modele.name,
    hp: pv,
    maxHp: pv,
    atk: modele.atk,
    armor: modele.armor ?? 100,
    esquive: modele.dodgeChance ?? 0,
    attaques: modele.specificStats?.attacksPerTurn || 1,
  };
};

const composer = (modeleId) => {
  const modele = MONSTERS[modeleId];
  const groupe = [];
  const taille = modele.companion
    ? 1
    : tailleDuGroupe(modele.groupCombinations);
  for (let i = 0; i < taille; i++) groupe.push(instancier(modele));
  if (modele.companion) {
    const nombre =
      modele.companionCount ?? tailleDuGroupe(modele.groupCombinations);
    for (let i = 0; i < nombre; i++) {
      const compagnon = MONSTERS[modele.companion[i % modele.companion.length]];
      if (compagnon) groupe.push(instancier(compagnon));
    }
  }
  return groupe;
};

/* ------------------------------------------------------------------ */
/* Afflictions posees par l'arme                                      */
/* ------------------------------------------------------------------ */

/*
 * Les mesurer change le verdict, et pas a la marge : sur un boss a forte vie
 * elles pesent plus que le coup lui-meme. Les ignorer rendait le banc si
 * pessimiste qu'aucun equipement ne passait.
 *
 * Sont modelisees celles qui infligent des degats par tour ou par seuil :
 * putrefaction, poison, gelure. Le saignement et la folie, qui dependent de
 * jets a l'impact, sont laisses de cote : le banc reste donc un peu pessimiste.
 */
const afflictionsDeLArme = () => {
  const arme = ITEMS[gameState.equipped.weapon];
  if (!arme) return [];
  const source = [
    typeof arme.funcOnHit === "function" ? arme.funcOnHit.toString() : "",
    arme.onHitEffect ? JSON.stringify(arme.onHitEffect) : "",
  ].join(" ");
  const posees = [];
  for (const id of ["SCARLET_ROT", "POISON", "FROSTBITE"]) {
    if (!source.includes(id)) continue;
    // A defaut de lire le jet exact, on prend une chance prudente de 30%.
    const chance = arme.onHitEffect?.chance ?? 0.3;
    posees.push({ id, chance });
  }
  return posees;
};

const AFFLICTIONS = afflictionsDeLArme();

/** Degats d'affliction esperes par tour contre une cible donnee. */
const degatsAfflictions = (cible, coupDuTour, estBoss) => {
  if (AFFLICTIONS.length === 0) return 0;
  const attaques = (eff.attacksPerTurn || 1) + (eff.extraAttackChance || 0);
  let total = 0;
  for (const { id, chance } of AFFLICTIONS) {
    // Presence : au moins une application dans le tour, portee par la duree.
    const pose = 1 - (1 - chance) ** Math.max(1, attaques);
    const presence = Math.min(1, pose * 2);
    if (id === "SCARLET_ROT") {
      // Plafonnee a la moitie du coup depuis le correctif.
      total +=
        Math.min(Math.floor(cible.maxHp * 0.05), Math.floor(coupDuTour * 0.5)) *
        presence;
    } else if (id === "POISON") {
      total +=
        Math.floor(cible.maxHp * 0.01 + (eff.intelligence || 0) * 0.5) *
        presence;
    } else if (id === "FROSTBITE") {
      // Un palier tous les dix cumuls, donc environ un cinquieme de tour.
      const palier = Math.min(
        Math.floor(cible.maxHp * 0.1) + 30,
        coupDuTour * 6,
      );
      total += ((estBoss ? palier * 0.7 : palier) / 5) * presence;
    }
  }
  return Math.floor(total);
};

/* ------------------------------------------------------------------ */
/* Un combat                                                          */
/* ------------------------------------------------------------------ */

/** Points de vie perdus pour nettoyer ce groupe, en partant de `pv`. */
const combattre = (groupe, pv, armurePhase2 = null, seuilPhase2 = 0) => {
  const depart = pv;
  let tours = 0;
  const total = groupe.reduce((n, e) => n + e.hp, 0);
  let restant = total;
  const esquiveJoueur = Math.min(0.5, (gameState.stats.dexterity || 0) / 400);

  while (restant > 0 && pv > 0 && tours < 500) {
    tours++;
    const devant = groupe.find((e) => e.hp > 0);
    if (!devant) break;

    // Carapace : l'armure du boss double sous le seuil de seconde phase.
    const armure =
      armurePhase2 && restant <= total * seuilPhase2
        ? armurePhase2
        : devant.armor;

    const vivants = groupe.filter((e) => e.hp > 0).length;
    const inflige = playerDamagePerTurn(eff, armure, vivants);
    devant.hp -=
      Math.floor(inflige * (1 - devant.esquive)) +
      degatsAfflictions(devant, inflige, armurePhase2 !== null);
    restant = groupe.reduce((n, e) => n + Math.max(0, e.hp), 0);
    if (restant <= 0) break;

    // Tous les ennemis vivants frappent, autant de fois que le premier.
    const cadence = groupe.find((e) => e.hp > 0)?.attaques || 1;
    let recu = 0;
    for (const ennemi of groupe) {
      if (ennemi.hp <= 0) continue;
      recu += Math.floor(ennemi.atk * (100 / Math.max(1, eff.armor)));
    }
    pv -= Math.floor(recu * cadence * (1 - esquiveJoueur));
  }
  return { perdus: depart - pv, tours, mort: pv <= 0 };
};

const moyenne = (ids) => {
  if (!ids || ids.length === 0) return 0;
  let somme = 0;
  for (let i = 0; i < TIRAGES; i++) {
    for (const id of ids) somme += combattre(composer(id), PV_MAX).perdus;
  }
  return somme / (TIRAGES * ids.length);
};

/* ------------------------------------------------------------------ */
/* Rapport                                                            */
/* ------------------------------------------------------------------ */

const biome = BIOMES[BIOME_ID];
const standard = moyenne(biome.monsters);
const elite = moyenne(biome.rareMonsters);
const rencontres = Math.max(0, Math.floor(biome.length / 2) - 2);
const usure = Math.round(standard * rencontres + elite);
const pvAuBoss = Math.max(1, PV_MAX - usure);

const boss = MONSTERS[biome.boss];
const carapace = (boss.comportementsPhase2 || []).includes("carapace");
const resultat = combattre(
  composer(biome.boss),
  pvAuBoss,
  carapace ? (boss.armor ?? 100) * 2 : null,
  boss.thresholdForPhase2 ?? boss.phase2?.seuil ?? 0,
);

const objets = Object.values(equipement)
  .filter(Boolean)
  .map((id) => ITEMS[id]?.name || id)
  .join(" + ");

console.log(
  [
    `${biome.name} — niveau ${NIVEAU}, ${PV_MAX} PV max`,
    `equipement : ${objets || "aucun"} (niveau ${NIVEAU_OBJET})`,
    "",
    `usure moyenne, groupe standard : ${Math.round(standard)} PV`,
    `usure moyenne, elite           : ${Math.round(elite)} PV`,
    `seconde moitie du biome        : ${rencontres} groupes + 1 elite`,
    "",
    `devant ${boss.name} : ${pvAuBoss} / ${PV_MAX} PV (${Math.round((100 * pvAuBoss) / PV_MAX)}%)`,
    resultat.mort
      ? `MORT au tour ${resultat.tours} du combat de boss.`
      : `BOSS VAINCU en ${resultat.tours} tours, ${pvAuBoss - resultat.perdus} PV restants.`,
  ].join(NL),
);
