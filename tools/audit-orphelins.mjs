// Contenu orphelin : ce qui existe dans le code mais que personne ne peut voir.
//
// Un biome qu'aucun autre ne debloque, un monstre qui n'apparait dans aucune
// zone, un objet qu'aucune table de butin ne lache, une cendre sans source :
// du travail ecrit puis rendu invisible. Rien ne le signale, parce que rien
// n'est casse — c'est simplement inatteignable.
//
//   node tools/audit-orphelins.mjs

import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");

const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");
const { ITEMS } = await import("../item.js");
const { ASHES_OF_WAR } = await import("../ashes.js");
const { BLESSINGS, PREP_CONSUMABLES, PREPARATION_UNLOCKS } = await import(
  "../systems.js"
);
const { DEFAULT_PLAYER_PROFILE } = await import("../shared/player-profile.js");
const { TRIALS } = await import("../rebirth.js");

const NL = String.fromCharCode(10);
const DEPART = "limgrave_west";

/* ---- Biomes atteignables depuis le depart ---- */
const atteignables = new Set([DEPART]);
{
  const file = [DEPART];
  while (file.length) {
    for (const suivant of BIOMES[file.shift()]?.unlocks || []) {
      if (BIOMES[suivant] && !atteignables.has(suivant)) {
        atteignables.add(suivant);
        file.push(suivant);
      }
    }
  }
}
/*
 * Les epreuves ne sont debloquees par aucun biome : elles s'ouvrent par la
 * renaissance. Sans cette ligne, les quatre ressortaient comme injouables.
 */
for (const epreuve of TRIALS) {
  if (epreuve.biomeId) atteignables.add(epreuve.biomeId);
  if (BIOMES[epreuve.id]) atteignables.add(epreuve.id);
}
const biomesOrphelins = Object.keys(BIOMES).filter(
  (id) => !atteignables.has(id),
);

/* ---- Monstres places quelque part ---- */
const monstresUtilises = new Set();
for (const biome of Object.values(BIOMES)) {
  for (const cle of ["monsters", "rareMonsters"]) {
    for (const m of biome[cle] || []) monstresUtilises.add(m);
  }
  if (biome.boss) monstresUtilises.add(biome.boss);
}
/*
 * Les compagnons comptent.
 *
 * Un monstre peut n'etre place dans aucune zone et rester parfaitement
 * jouable : spawn.js tire les compagnons dans le champ `companion` du
 * monstre principal. Trois creatures ressortaient orphelines a tort.
 * On propage en boucle : un compagnon peut lui-meme en avoir.
 */
let ajout = true;
while (ajout) {
  ajout = false;
  for (const id of [...monstresUtilises]) {
    for (const compagnon of MONSTERS[id]?.companion || []) {
      if (MONSTERS[compagnon] && !monstresUtilises.has(compagnon)) {
        monstresUtilises.add(compagnon);
        ajout = true;
      }
    }
  }
}
const monstresOrphelins = Object.keys(MONSTERS).filter(
  (id) => !monstresUtilises.has(id),
);

/* ---- Objets et cendres obtenables ---- */
const objetsObtenables = new Set(
  Object.values(DEFAULT_PLAYER_PROFILE.inventory || []).map((i) => i.id),
);
objetsObtenables.add("fists");
const cendresObtenables = new Set(DEFAULT_PLAYER_PROFILE.ashesOfWarOwned || []);
for (const [biomeId, table] of Object.entries(LOOT_TABLES)) {
  if (!BIOMES[biomeId]) continue;
  for (const entree of table) {
    if (entree.id) objetsObtenables.add(entree.id);
    if (entree.ashId) cendresObtenables.add(entree.ashId);
  }
}
for (const biome of Object.values(BIOMES)) {
  for (const cle of ["monsters", "rareMonsters"]) {
    for (const m of biome[cle] || []) {
      for (const d of MONSTERS[m]?.drops || []) {
        if (d.id) objetsObtenables.add(d.id);
        if (d.ashId) cendresObtenables.add(d.ashId);
      }
    }
  }
  if (biome.boss) {
    for (const d of MONSTERS[biome.boss]?.drops || []) {
      if (d.id) objetsObtenables.add(d.id);
      if (d.ashId) cendresObtenables.add(d.ashId);
    }
  }
}
const objetsOrphelins = Object.keys(ITEMS).filter(
  (id) => ITEMS[id].type && !objetsObtenables.has(id),
);
const cendresOrphelines = Object.keys(ASHES_OF_WAR).filter(
  (id) => !cendresObtenables.has(id),
);

/* ---- Preparations : chaque entree a-t-elle un biome source ? ---- */
const sourcePrep = new Set();
for (const recompense of Object.values(PREPARATION_UNLOCKS)) {
  if (recompense.blessingId) sourcePrep.add(recompense.blessingId);
  if (recompense.consumableId) sourcePrep.add(recompense.consumableId);
}
for (const id of DEFAULT_PLAYER_PROFILE.preparation?.unlockedBlessings || [])
  sourcePrep.add(id);
for (const id of DEFAULT_PLAYER_PROFILE.preparation?.unlockedConsumables || [])
  sourcePrep.add(id);
const prepOrphelines = [
  ...Object.keys(BLESSINGS).filter((id) => !sourcePrep.has(id)),
  ...Object.keys(PREP_CONSUMABLES).filter((id) => !sourcePrep.has(id)),
];

/* ---- Recompenses attachees a un biome inexistant ---- */
const recompensesMortes = Object.keys(PREPARATION_UNLOCKS).filter(
  (id) => !BIOMES[id],
);
const lootMort = Object.keys(LOOT_TABLES).filter((id) => !BIOMES[id]);

const rapport = [
  [
    "Biomes qu'aucun autre ne debloque",
    biomesOrphelins,
    Object.keys(BIOMES).length,
  ],
  [
    "Monstres places dans aucune zone",
    monstresOrphelins,
    Object.keys(MONSTERS).length,
  ],
  [
    "Objets qu'aucune source ne lache",
    objetsOrphelins,
    Object.keys(ITEMS).filter((i) => ITEMS[i].type).length,
  ],
  ["Cendres sans source", cendresOrphelines, Object.keys(ASHES_OF_WAR).length],
  [
    "Preparations sans biome source",
    prepOrphelines,
    Object.keys(BLESSINGS).length + Object.keys(PREP_CONSUMABLES).length,
  ],
  [
    "Recompenses sur un biome inexistant",
    recompensesMortes,
    Object.keys(PREPARATION_UNLOCKS).length,
  ],
  [
    "Tables de butin sur un biome inexistant",
    lootMort,
    Object.keys(LOOT_TABLES).length,
  ],
];

let total = 0;
for (const [titre, liste, sur] of rapport) {
  total += liste.length;
  console.log(
    `${titre.padEnd(44)} ${String(liste.length).padStart(3)} / ${sur}`,
  );
}
console.log(NL + `${total} element(s) inatteignable(s).` + NL);
for (const [titre, liste] of rapport) {
  if (!liste.length) continue;
  console.log(`--- ${titre} ---`);
  for (const id of liste) {
    const nom =
      BIOMES[id]?.name ||
      MONSTERS[id]?.name ||
      ITEMS[id]?.name ||
      ASHES_OF_WAR[id]?.name ||
      BLESSINGS[id]?.name ||
      PREP_CONSUMABLES[id]?.name ||
      "";
    console.log(`  ${String(nom).slice(0, 36).padEnd(38)} ${id}`);
  }
  console.log("");
}
process.exitCode = total ? 1 : 0;
