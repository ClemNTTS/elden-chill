// Que vaut chaque build au DEBUT du jeu, contre le premier gros boss ?
//
// Le simulateur complet farme jusqu'au niveau 55 avant d'attaquer Godrick, ce
// qui masque completement le probleme : un joueur reel y arrive vers 24-28.
// Cet outil fige le niveau et l'equipement disponible A CE MOMENT, et compare
// les quatre builds sur la seule question qui compte — combien de tours pour
// tuer le boss, et combien de tours avant de mourir.
//
//   node tools/diag-debut.mjs [niveau]

import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");

const { gameState, getEffectiveStats, getHealth, getMagicDamage } = await import("../state.js");
const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { ITEMS } = await import("../item.js");
const { MONSTERS } = await import("../monster.js");
const { ITEM_TYPES } = await import("../constants.js");
const { DEFAULT_PLAYER_PROFILE } = await import("../shared/player-profile.js");

const NIVEAU = Number(process.argv[2]) || 28;
const BOSS = "godrick";

/*
 * Biomes atteignables avant le boss, derives du graphe de deblocage.
 *
 * Les lister a la main m'a fait ecrire un id inexistant ("stormhill"), et le
 * pool d'objets est alors reste vide sans que rien ne le signale.
 */
const CIBLE_BIOME = "stormwind_castle";
const PRECOCES = (() => {
  const vus = new Set(["limgrave_west"]);
  const file = [["limgrave_west", 0]];
  const ordre = [];
  while (file.length) {
    const [id, d] = file.shift();
    if (id === CIBLE_BIOME) continue; // on s'arrete au biome du boss
    ordre.push(id);
    for (const n of BIOMES[id]?.unlocks || []) {
      if (BIOMES[n] && !vus.has(n)) { vus.add(n); file.push([n, d + 1]); }
    }
  }
  return ordre.slice(0, 7);
})();

/* Objets qu'un joueur peut RAISONNABLEMENT avoir a ce stade. */
const dispo = new Set();
for (const id of PRECOCES) {
  for (const e of LOOT_TABLES[id] || []) if (e.id) dispo.add(e.id);
  for (const cle of ["monsters", "rareMonsters"]) {
    for (const m of BIOMES[id]?.[cle] || []) {
      for (const d of MONSTERS[m]?.drops || []) if (d.id) dispo.add(d.id);
    }
  }
}
dispo.add("fists");

const BUILDS = {
  Force: { strength: 0.7, vigor: 0.3 },
  Dexterite: { dexterity: 0.7, vigor: 0.3 },
  Intelligence: { intelligence: 0.7, vigor: 0.3 },
  Vigueur: { strength: 0.3, vigor: 0.7 },
};

/* Points a repartir : meme regle que la montee de niveau du jeu. */
const POINTS = (NIVEAU - 1) * 3;

const poser = (poids, equipement) => {
  gameState.stats = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.stats));
  gameState.preparation = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.preparation));
  gameState.stats.level = NIVEAU;
  for (const [stat, part] of Object.entries(poids)) {
    gameState.stats[stat] = Math.floor(POINTS * part);
  }
  gameState.inventory = Object.keys(equipement)
    .filter((k) => equipement[k])
    .map((k) => ({ id: equipement[k], name: equipement[k], level: 5, count: 0 }));
  gameState.equipped = { weapon: null, armor: null, accessory: null, ...equipement };
  return getEffectiveStats();
};

/** Degats par tour contre une armure donnee, calque sur combat.js. */
const dpt = (eff, armure) => {
  const a = Math.max(
    armure * 0.25,
    Math.max(1, armure * (1 - (eff.percentDamagePenetration || 0)) - (eff.flatDamagePenetration || 0)),
  );
  const c = Math.max(0, eff.critChance || 0);
  const hit = Math.min(1, c);
  const sup = Math.min(1, Math.max(0, c - 1));
  const d = eff.critDamage || 1.5;
  const crit = 1 - hit + (hit - sup) * d + sup * d * 2;
  const attaques = (eff.attacksPerTurn || 1) + (eff.extraAttackChance || 0);
  return (
    attaques * Math.floor(eff.strength * crit * (100 / a)) +
    Math.floor(getMagicDamage(eff.intelligence) * crit)
  );
};

const parType = (t) => [...dispo].filter((id) => ITEMS[id]?.type === t);
const armes = parType(ITEM_TYPES.WEAPON);
const armures = parType(ITEM_TYPES.ARMOR);
const accessoires = parType(ITEM_TYPES.ACCESSORY);

const boss = MONSTERS[BOSS];
if (!boss) {
  console.log(`Boss ${BOSS} introuvable. Ids disponibles contenant "godrick" :`,
    Object.keys(MONSTERS).filter((k) => k.includes("godrick")));
  process.exit(1);
}

const NL = String.fromCharCode(10);
console.log(`Niveau ${NIVEAU} — ${POINTS} points repartis, objets des six premiers biomes (niveau 5).`);
console.log(`Cible : ${boss.name} — ${boss.hp} PV, ${boss.armor} armure, ${boss.atk} attaque.` + NL);
console.log("build            arme                        degats/tour  tours  PV joueur  survie  verdict");

const lignes = [];
for (const [nom, poids] of Object.entries(BUILDS)) {
  let meilleur = null;
  if (!armes.length) throw new Error("aucune arme dans le pool : les biomes precoces sont mal derives");
  for (const w of armes) {
    for (const ar of armures.concat([null])) {
      for (const ac of accessoires.concat([null])) {
        const eff = poser(poids, { weapon: w, armor: ar, accessory: ac });
        const d = dpt(eff, boss.armor);
        if (!meilleur || d > meilleur.d) {
          meilleur = { d, w, eff, pv: getHealth(eff.vigor) };
        }
      }
    }
  }
  const tours = meilleur.d > 0 ? boss.hp / meilleur.d : Infinity;
  // Combien de tours le joueur encaisse-t-il ?
  const encaisse = Math.max(1, boss.atk * (100 / Math.max(1, meilleur.eff.armor)));
  const survie = meilleur.pv / encaisse;
  lignes.push({ nom, ...meilleur, tours, survie });
}

const refTours = Math.min(...lignes.map((l) => l.tours));
for (const l of lignes) {
  const verdict = l.tours <= refTours * 1.25 ? "" : l.tours > refTours * 2 ? "  <-- tres en retrait" : "  <- en retrait";
  console.log(
    `${l.nom.padEnd(15)} ${(ITEMS[l.w]?.name || l.w).slice(0, 26).padEnd(28)}` +
    `${String(Math.round(l.d)).padStart(9)}  ${l.tours.toFixed(1).padStart(6)}` +
    `${String(Math.round(l.pv)).padStart(10)}  ${l.survie.toFixed(1).padStart(6)}${verdict}`,
  );
}

const ecart = Math.max(...lignes.map((l) => l.tours)) / refTours;
console.log(NL + `Ecart entre le meilleur et le pire build : x${ecart.toFixed(1)} en tours pour tuer le boss.`);
