// Quels objets, cendres et bénédictions n'ont pas d'icone ?
//
// getItemIcon renvoie null quand l'identifiant est absent de la table de
// cellules, et l'interface affiche alors un carre hachure. Rien ne signale le
// manque : il se voit uniquement en jouant, une fois l'objet ramasse.
//
//   node tools/audit-icones.mjs
//   node tools/audit-icones.mjs --liste   (tous les noms, pas seulement le compte)

import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");

const { ITEMS } = await import("../item.js");
const { ASHES_OF_WAR } = await import("../ashes.js");
const { ITEM_TYPES } = await import("../constants.js");
const { getItemIcon, getAshIcon } = await import("../icons.js");
const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");

const tout = process.argv.includes("--liste");
const NL = String.fromCharCode(10);

/* Profondeur d'apparition, pour trier : un objet de fin de jeu sans icone est
   moins urgent qu'une arme du premier chapitre. */
const profondeur = {};
{
  const vus = new Set(["limgrave_west"]);
  const file = [["limgrave_west", 0]];
  while (file.length) {
    const [id, d] = file.shift();
    const noter = (x) => {
      if (x && (profondeur[x] === undefined || d < profondeur[x]))
        profondeur[x] = d;
    };
    for (const e of LOOT_TABLES[id] || []) {
      noter(e.id);
      noter(e.ashId);
    }
    for (const cle of ["monsters", "rareMonsters"]) {
      for (const m of BIOMES[id]?.[cle] || []) {
        for (const drop of MONSTERS[m]?.drops || []) {
          noter(drop.id);
          noter(drop.ashId);
        }
      }
    }
    for (const n of BIOMES[id]?.unlocks || []) {
      if (BIOMES[n] && !vus.has(n)) {
        vus.add(n);
        file.push([n, d + 1]);
      }
    }
  }
}

const manquants = { Arme: [], Armure: [], Accessoire: [], Cendre: [] };

for (const [id, item] of Object.entries(ITEMS)) {
  if (!item.type) continue;
  if (getItemIcon(id, 10)) continue;
  manquants[item.type]?.push({ id, nom: item.name || id, p: profondeur[id] });
}
for (const [id, ash] of Object.entries(ASHES_OF_WAR)) {
  if (getAshIcon(id)) continue;
  manquants.Cendre.push({ id, nom: ash.name || id, p: profondeur[id] });
}

const totaux = {
  Arme: Object.values(ITEMS).filter((i) => i.type === ITEM_TYPES.WEAPON).length,
  Armure: Object.values(ITEMS).filter((i) => i.type === ITEM_TYPES.ARMOR)
    .length,
  Accessoire: Object.values(ITEMS).filter(
    (i) => i.type === ITEM_TYPES.ACCESSORY,
  ).length,
  Cendre: Object.keys(ASHES_OF_WAR).length,
};

let total = 0;
for (const [type, liste] of Object.entries(manquants)) {
  total += liste.length;
  console.log(
    `${type.padEnd(12)} ${String(liste.length).padStart(3)} sans icone / ${totaux[type]}`,
  );
}
console.log(NL + `${total} entrees affichent un carre hachure.` + NL);

for (const [type, liste] of Object.entries(manquants)) {
  if (!liste.length) continue;
  liste.sort((a, b) => (a.p ?? 99) - (b.p ?? 99));
  const proches = liste.filter((x) => x.p !== undefined && x.p <= 4);
  console.log(`--- ${type} (${liste.length}) ---`);
  if (proches.length) {
    console.log(
      "  Rencontres tot (a 4 biomes ou moins du depart), a traiter en premier :",
    );
    for (const x of proches)
      console.log(
        `    ${String(x.p).padStart(2)}  ${x.nom.slice(0, 40).padEnd(42)} ${x.id}`,
      );
  }
  const reste = liste.filter((x) => !proches.includes(x));
  if (tout) {
    for (const x of reste)
      console.log(
        `    ${String(x.p ?? "--").padStart(2)}  ${x.nom.slice(0, 40).padEnd(42)} ${x.id}`,
      );
  } else if (reste.length) {
    console.log(`  (${reste.length} autres, relancer avec --liste)`);
  }
  console.log("");
}
process.exitCode = total ? 1 : 0;
