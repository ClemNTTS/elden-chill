// Confronte la surcouche anglaise au catalogue francais.
//
// Trois defauts possibles, tous silencieux a l'execution :
//
//   MANQUANTE  — une cle francaise sans equivalent anglais. Le joueur
//                anglophone voit du francais au milieu de sa page.
//   ORPHELINE  — une cle anglaise qui ne correspond a rien. Traduction ecrite
//                pour rien, souvent a cause d'un identifiant invente. C'est
//                arrive des la premiere tranche, avec un "ash.heal" inexistant.
//   IDENTIQUE  — une valeur anglaise strictement egale au francais. Parfois
//                legitime (un nom propre), le plus souvent un oubli.
//
//   node tools/audit-traduction.mjs
//   node tools/audit-traduction.mjs --liste

import { readFileSync } from "fs";

const NL = String.fromCharCode(10);
const tout = process.argv.includes("--liste");

const FR = JSON.parse(readFileSync("locales/fr.json", "utf8"));
const { EN } = await import("../locales/en.js");

const clesFr = Object.keys(FR);
const clesEn = Object.keys(EN);

const manquantes = clesFr.filter((k) => !(k in EN));
const orphelines = clesEn.filter((k) => !(k in FR));
const identiques = clesEn.filter((k) => k in FR && EN[k] === FR[k]);

/* On regroupe les manquantes par prefixe : c'est ainsi qu'on traduit. */
const parPrefixe = {};
for (const k of manquantes) {
  const p = k.slice(0, k.indexOf("."));
  parPrefixe[p] = (parPrefixe[p] || 0) + 1;
}

const couverture = clesFr.length
  ? Math.round((100 * (clesFr.length - manquantes.length)) / clesFr.length)
  : 0;

console.log(`Couverture anglaise : ${couverture}% (${clesFr.length - manquantes.length} / ${clesFr.length})` + NL);
console.log(`  manquantes  ${String(manquantes.length).padStart(5)}`);
console.log(`  orphelines  ${String(orphelines.length).padStart(5)}`);
console.log(`  identiques  ${String(identiques.length).padStart(5)}` + NL);

if (Object.keys(parPrefixe).length) {
  console.log("Manquantes par source :" + NL);
  for (const [p, n] of Object.entries(parPrefixe).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(14)} ${String(n).padStart(5)}`);
  }
  console.log("");
}

if (orphelines.length) {
  console.log(`--- ORPHELINES (${orphelines.length}) : traduites pour rien ---`);
  for (const k of orphelines) console.log(`  ${k}`);
  console.log("");
}

if (identiques.length) {
  console.log(`--- IDENTIQUES AU FRANCAIS (${identiques.length}) ---`);
  for (const k of identiques.slice(0, tout ? identiques.length : 10)) {
    console.log(`  ${k.padEnd(46)} ${FR[k].slice(0, 40)}`);
  }
  if (!tout && identiques.length > 10) {
    console.log(`  (${identiques.length - 10} autres, relancer avec --liste)`);
  }
  console.log("");
}

if (tout && manquantes.length) {
  console.log(`--- MANQUANTES (${manquantes.length}) ---`);
  for (const k of manquantes) console.log(`  "${k}": ${JSON.stringify(FR[k])},`);
}

// Une orpheline est une vraie erreur ; une manquante est du travail restant.
process.exitCode = orphelines.length ? 1 : 0;
