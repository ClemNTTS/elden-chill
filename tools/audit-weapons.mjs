// Verifie qu'aucune arme n'est un piege.
//
// LA BONNE REGLE, apprise a mes depens : une arme doit battre les poings sur
// LE BUILD QU'ELLE SERT, pas a statistiques nulles.
//
// La premiere version de cet outil mesurait a 0 partout et signalait 24 armes
// "mortes". C'etait un faux diagnostic : ces armes convertissent ou multiplient
// une statistique, donc elles ne valent rien tant qu'on n'a pas investi dedans
// — ce qui est exactement leur raison d'etre. Verifie sur leur build, elles
// battent toutes les poings : a 40 de dexterite le Cimeterre donne 37 contre 22,
// a 40 d'intelligence le Baton de la Reine 35 contre 15.
//
// Sur la foi de ce faux diagnostic j'avais ajoute une base fixe a quatre armes,
// ce qui effacait leur identite. Tout a ete remis en etat.
//
// Reste un cas reel mais benin : un personnage a 0 statistique — donc neuf, ou
// juste apres un remboursement de runes — qui equipe une arme a scaling pur
// tape a 0 jusqu'a reinvestir.
//
//   node tools/audit-weapons.mjs

import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");

const { gameState, getEffectiveStats, getMagicDamage } = await import("../state.js");
const { ITEMS } = await import("../item.js");
const { DEFAULT_PLAYER_PROFILE } = await import("../shared/player-profile.js");
const { ITEM_TYPES } = await import("../constants.js");
const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");

/*
 * Profondeur a laquelle une arme devient obtenable, en nombre de biomes depuis
 * le depart. Une arme de fin de parcours qui donne 0 a statistiques nulles
 * n'est pas un piege : personne ne l'equipe avec 0 partout. Une arme du
 * premier chapitre, si.
 */
const depth = {};
{
  const queue = [["limgrave_west", 0]];
  const seen = new Set(["limgrave_west"]);
  while (queue.length) {
    const [id, d] = queue.shift();
    const collect = (itemId) => {
      if (itemId && (depth[itemId] === undefined || d < depth[itemId])) depth[itemId] = d;
    };
    for (const e of LOOT_TABLES[id] || []) collect(e.id);
    for (const key of ["monsters", "rareMonsters"]) {
      for (const m of BIOMES[id]?.[key] || []) {
        for (const drop of MONSTERS[m]?.drops || []) collect(drop.id);
      }
    }
    for (const n of BIOMES[id]?.unlocks || []) {
      if (BIOMES[n] && !seen.has(n)) { seen.add(n); queue.push([n, d + 1]); }
    }
  }
}
/** Au-dela, le joueur a forcement investi des points. */
const SEUIL_PRECOCE = 5;

/** Force apportee par une arme a un personnage vierge. */
const strengthAtZero = (id, level) => {
  Object.assign(gameState.stats, JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.stats)));
  gameState.preparation = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.preparation));
  gameState.inventory = [{ id, name: id, level, count: 0 }];
  gameState.equipped = { weapon: id, armor: null, accessory: null };
  try {
    return getEffectiveStats().strength;
  } catch {
    return null;
  }
};

/* Armure de reference : un ennemi de milieu de partie. */
const ARMURE_REF = 200;

const PLANCHER = strengthAtZero("fists", 10);

const NL = String.fromCharCode(10);

/* Chaque arme est jugee sur le build qu'elle sert, a 40 points investis. */
/*
 * Quatre builds purs ET deux hybrides.
 *
 * Plusieurs armes exigent DEUX statistiques de base — l'Epee Courbe de Zamor
 * demande 15 de Force et 18 de Dexterite, la Grande Epee Forgee 30 et 10. Un
 * build pur n'en satisfait jamais qu'une, la branche ne s'executait pas, et
 * l'arme ressortait "sans emploi". Juger une arme sur des builds qui ne
 * peuvent pas l'equiper ne prouve rien.
 */
const BUILDS = {
  strength: { label: "Force", stats: { strength: 40 } },
  dexterity: { label: "Dexterite", stats: { dexterity: 40 } },
  intelligence: { label: "Intelligence", stats: { intelligence: 40 } },
  vigor: { label: "Vigueur", stats: { vigor: 40 } },
  strDex: { label: "Force/Dex", stats: { strength: 32, dexterity: 32 } },
  intDex: { label: "Int/Dex", stats: { intelligence: 32, dexterity: 32 } },
};

/*
 * Degats par tour, et pas la Force seule.
 *
 * Mesurer la Force seule m'a fait declarer "sans emploi" des armes qui donnent
 * une attaque supplementaire ou du critique — les Lames Jumelles perdent 5 de
 * Force et gagnent une attaque entiere. Comparer une seule dimension d'un
 * systeme multiplicatif ne prouve rien.
 */
const dptWith = (id, stats, level) => {
  /*
   * Le critique de BASE fait partie du personnage sonde.
   *
   * Plusieurs armes exigent un minimum de critique investi pour s'activer —
   * les Lames Jumelles demandent 20 de dexterite ET 10% de critique. Avec un
   * critique a zero leur branche ne s'executait jamais et elles ressortaient
   * "sans emploi". La lecon avait ete notee sans que l'outil soit corrige.
   */
  const st = {
    vigor: 0, strength: 0, dexterity: 0, intelligence: 0, level: 50,
    critChance: 0.15, critDamage: 2, ...stats,
  };
  Object.assign(gameState.stats, JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.stats)), st);
  gameState.preparation = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.preparation));
  gameState.inventory = [{ id, name: id, level, count: 0 }];
  gameState.equipped = { weapon: id, armor: null, accessory: null };
  try {
    const e = getEffectiveStats();
    const c = Math.max(0, e.critChance || 0);
    const hit = Math.min(1, c);
    const crit = 1 - hit + hit * (e.critDamage || 1.5);
    const atk = (e.attacksPerTurn || 1) + (e.extraAttackChance || 0);
    /*
     * L'armure de la cible entre dans le calcul.
     *
     * Sans elle, une arme dont tout l'interet est la penetration mesurait
     * zero : la Hachette de Givre donne +15% de penetration et aucune Force,
     * elle ressortait "sans emploi". Meme formule que combat.js, plancher a
     * 25% de l'armure d'origine compris.
     */
    const armure = Math.max(
      ARMURE_REF * 0.25,
      Math.max(
        1,
        ARMURE_REF * (1 - (e.percentDamagePenetration || 0)) -
          (e.flatDamagePenetration || 0),
      ),
    );
    const mult = 100 / armure;
    /*
     * Les degats magiques comptent.
     *
     * Ne mesurer que la Force sous-evaluait systematiquement les armes
     * d'intelligence : l'Encensoir noir d'Azula donne +10 Intelligence et
     * aucune conversion, donc zero Force. Il ressortait "sans emploi" alors
     * que toute sa puissance passe par la magie, qui ignore l'armure.
     */
    // Le physique passe par l'armure, la magie non : elle s'ajoute apres la
    // division, exactement comme dans combat.js.
    return (
      e.strength * atk * crit * mult + getMagicDamage(e.intelligence) * crit
    );
  } catch {
    return -1;
  }
};

const strengthWith = (id, stat, level) => {
  const st = {
    vigor: 0, strength: 0, dexterity: 0, intelligence: 0, level: 50,
    critChance: 0.15, critDamage: 2,
  };
  st[stat] = 40;
  Object.assign(gameState.stats, JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.stats)), st);
  gameState.preparation = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.preparation));
  gameState.inventory = [{ id, name: id, level, count: 0 }];
  gameState.equipped = { weapon: id, armor: null, accessory: null };
  try { return getEffectiveStats().strength; } catch { return -1; }
};

const inutiles = [];
const nulles = [];

for (const [id, item] of Object.entries(ITEMS)) {
  if (item.type !== ITEM_TYPES.WEAPON || id === "fists") continue;

  // Meilleur ecart face aux poings, sur les quatre builds, au niveau 5.
  let meilleur = -Infinity;
  let meilleurBuild = null;
  for (const build of Object.values(BUILDS)) {
    const ecart = dptWith(id, build.stats, 5) - dptWith("fists", build.stats, 10);
    if (ecart > meilleur) { meilleur = ecart; meilleurBuild = build.label; }
  }
  if (meilleur <= 0) inutiles.push({ nom: item.name, meilleur, meilleurBuild });
  if (strengthAtZero(id, 1) <= 0) nulles.push(item.name);
}

console.log(`Reference : les poings donnent ${PLANCHER} de Force a 0 statistique.` + NL);

console.log(`--- ARMES SANS EMPLOI (${inutiles.length}) : degats/tour inferieurs aux poings sur les QUATRE builds` + NL);
for (const w of inutiles) {
  console.log(`  ${w.nom.slice(0, 34).padEnd(36)} meilleur cas : ${w.meilleurBuild}, ecart ${w.meilleur.toFixed(1)} degats/tour`);
}
if (!inutiles.length) console.log("  aucune : chaque arme trouve un build ou elle est superieure");

console.log(NL + `--- INFO : ${nulles.length} armes donnent 0 a statistiques nulles.`);
console.log("  Normal pour une arme a scaling. Seul cas genant : un personnage neuf");
console.log("  ou fraichement rembourse qui l'equipe et tape a 0 jusqu'a reinvestir.");

console.log(NL + `${Object.values(ITEMS).filter((i) => i.type === ITEM_TYPES.WEAPON).length} armes verifiees.`);
process.exitCode = inutiles.length ? 1 : 0;
