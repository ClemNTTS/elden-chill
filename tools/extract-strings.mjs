// Inventaire de tout le texte affiche au joueur, avec une cle stable par
// chaine.
//
// Deux familles bien distinctes, qui ne se traduisent pas de la meme facon :
//
//   CONTENU  — noms et descriptions d'objets, monstres, biomes, cendres,
//              benedictions... Ils vivent dans des objets de donnees, indexes
//              par identifiant. La cle est donc derivable : item.iron_sword.name.
//
//   INTERFACE — libelles du HTML, messages de journal, gabarits de ui.js. Pas
//              d'identifiant naturel : il faut leur en donner un.
//
//   node tools/extract-strings.mjs
//   node tools/extract-strings.mjs --ecrire   (ecrit locales/fr.json)

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");

const NL = String.fromCharCode(10);
const ecrire = process.argv.includes("--ecrire");

const { ITEMS } = await import("../item.js");
const { MONSTERS } = await import("../monster.js");
const { BIOMES } = await import("../biome.js");
const { ASHES_OF_WAR } = await import("../ashes.js");
const { BLESSINGS, PREP_CONSUMABLES, EVENT_DEFS } = await import("../systems.js");
const { BIOME_TRAITS } = await import("../biome-traits.js");
const { TRIALS, REBIRTH_NODES } = await import("../rebirth.js");

/** Champs textuels qu'une entree de contenu peut porter. */
const CHAMPS = [
  "name",
  "description",
  "detailedDescription",
  "detail",
  "title",
  "flavorTextPhase2",
];

const catalogue = {};
const parSource = {};

const collecter = (prefixe, table) => {
  let n = 0;
  for (const [id, entree] of Object.entries(table || {})) {
    if (!entree || typeof entree !== "object") continue;
    for (const champ of CHAMPS) {
      const valeur = entree[champ];
      if (typeof valeur !== "string" || !valeur.trim()) continue;
      catalogue[`${prefixe}.${id}.${champ}`] = valeur;
      n += 1;
    }
  }
  parSource[prefixe] = n;
};

collecter("item", ITEMS);
collecter("monster", MONSTERS);
collecter("biome", BIOMES);
collecter("ash", ASHES_OF_WAR);
collecter("blessing", BLESSINGS);
collecter("consumable", PREP_CONSUMABLES);
collecter("event", EVENT_DEFS);
collecter("trait", BIOME_TRAITS);
// TRIALS et REBIRTH_NODES sont des tableaux : on les indexe par leur id.
collecter("trial", Object.fromEntries((TRIALS || []).map((t) => [t.id, t])));
collecter("rebirth", Object.fromEntries((REBIRTH_NODES || []).map((n) => [n.id, n])));

/* ------------------------------------------------------------------ */
/* Interface : HTML                                                    */
/* ------------------------------------------------------------------ */

const html = readFileSync("index.html", "utf8");
let nHtml = 0;

// Texte entre balises, hors script et style.
const sansCode = html
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<!--[\s\S]*?-->/g, "");

for (const m of sansCode.matchAll(/>([^<>]*[A-Za-zÀ-ÿ]{2,}[^<>]*)</g)) {
  const texte = m[1].trim();
  // On ecarte ce qui n'est pas une phrase : entites seules, nombres, symboles.
  if (!texte || /^[\d\s.,:;·/+\-—&]*$/.test(texte)) continue;
  if (/^&[a-z]+;$/.test(texte)) continue;
  catalogue[`ui.html.${nHtml}`] = texte;
  nHtml += 1;
}

// Attributs visibles.
let nAttr = 0;
for (const m of sansCode.matchAll(/\b(title|aria-label|placeholder)="([^"]+)"/g)) {
  if (/^[\d\s]*$/.test(m[2])) continue;
  catalogue[`ui.attr.${nAttr}`] = m[2];
  nAttr += 1;
}
parSource["ui.html"] = nHtml;
parSource["ui.attr"] = nAttr;

/* ------------------------------------------------------------------ */
/* Interface : messages de journal                                     */
/* ------------------------------------------------------------------ */

/*
 * ActionLog et addJournalEntry contiennent presque toujours des gabarits avec
 * interpolation. On les COMPTE ici sans les extraire : une chaine avec des
 * `${...}` ne se traduit pas en la recopiant, il faut la transformer en
 * fonction ou en gabarit a trous. C'est le morceau le plus delicat.
 */
const fichiersJs = ["core.js", "combat.js", "ui.js", "actions.js", "systems.js",
                    "spawn.js", "rebirth.js", "save.js", "game.js"];
let messages = 0;
let messagesInterpoles = 0;
for (const f of fichiersJs) {
  if (!existsSync(f)) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/(?:ActionLog|addJournalEntry)\(([\s\S]{0,400}?)\)/g)) {
    messages += 1;
    if (/\$\{/.test(m[1])) messagesInterpoles += 1;
  }
}
parSource["journal (appels)"] = messages;

/* ------------------------------------------------------------------ */
/* Rapport                                                             */
/* ------------------------------------------------------------------ */

const total = Object.keys(catalogue).length;
console.log("Texte affiche au joueur, par source :" + NL);
for (const [source, n] of Object.entries(parSource)) {
  console.log(`  ${source.padEnd(18)} ${String(n).padStart(5)}`);
}
console.log(NL + `  ${String(total).padStart(5)} chaines extractibles avec une cle stable`);
console.log(`  ${String(messagesInterpoles).padStart(5)} des ${messages} appels de journal contiennent une interpolation` + NL);

/* Les plus longues donnent une idee du travail de redaction. */
const parLongueur = Object.entries(catalogue).sort((a, b) => b[1].length - a[1].length);
const signes = parLongueur.reduce((s, [, v]) => s + v.length, 0);
console.log(`  ${signes} signes au total, soit ${Math.round(signes / 1500)} pages environ.`);
console.log(`  La plus longue : ${parLongueur[0][0]} (${parLongueur[0][1].length} signes)` + NL);

if (ecrire) {
  mkdirSync("locales", { recursive: true });
  writeFileSync("locales/fr.json", JSON.stringify(catalogue, null, 2) + NL, "utf8");
  console.log(`locales/fr.json ecrit : ${total} entrees.`);
} else {
  console.log("(relancer avec --ecrire pour produire locales/fr.json)");
}
