// Quelles cles de buff de run sont REELLEMENT lues par le moteur ?
//
// registerRunBuff accepte n'importe quel objet. Une cle inventee ne provoque
// aucune erreur et ne fait rien — meme piege que les statistiques fictives des
// objets. Cet outil confronte les cles ecrites par les evenements, les traits
// de biome et les benedictions a celles que le code consulte.
//
//   node tools/audit-runbuffs.mjs

import { readFileSync, readdirSync } from "node:fs";

const NL = String.fromCharCode(10);
const sources = [
  "systems.js",
  "biome-traits.js",
  "core.js",
  "combat.js",
  "state.js",
  "spawn.js",
  "ui.js",
];
const textes = Object.fromEntries(
  sources.map((f) => [f, readFileSync(f, "utf8")]),
);

/* Cles ECRITES : tout objet passe a registerRunBuff, plus les runBuff des traits. */
const ecrites = new Set();
for (const [fichier, src] of Object.entries(textes)) {
  for (const m of src.matchAll(/registerRunBuff\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    for (const k of m[1].matchAll(/^\s*([a-zA-Z_]\w*)\s*:/gm))
      ecrites.add(k[1]);
  }
  if (fichier === "biome-traits.js") {
    for (const m of src.matchAll(/runBuff:\s*\{([\s\S]*?)\}/g)) {
      for (const k of m[1].matchAll(/([a-zA-Z_]\w*)\s*:/g)) ecrites.add(k[1]);
    }
  }
}

/* Cles LUES : getRunModifier("x") et tout acces .x sur un buff. */
const lues = new Set();
for (const src of Object.values(textes)) {
  for (const m of src.matchAll(/getRunModifier\(\s*["'](\w+)["']/g))
    lues.add(m[1]);
  for (const m of src.matchAll(/activeRunBuffs[\s\S]{0,120}?\.(\w+)/g))
    lues.add(m[1]);
  for (const m of src.matchAll(/\bbuffs?\.(\w+)/g)) lues.add(m[1]);
  for (const m of src.matchAll(/\bbuff\)\s*=>\s*[\w.]*\.?(\w+)/g))
    lues.add(m[1]);
}

/* Descriptives : ces cles servent a l'affichage, pas au calcul. */
const AFFICHAGE = new Set(["id", "label", "kind", "duration", "icon"]);

const mortes = [...ecrites]
  .filter((k) => !lues.has(k) && !AFFICHAGE.has(k))
  .sort();

console.log(
  `Cles ecrites par les evenements et traits : ${[...ecrites].sort().join(", ")}` +
    NL,
);
console.log(`Cles lues par le moteur : ${[...lues].sort().join(", ")}` + NL);
if (mortes.length) {
  console.log(`SANS EFFET (${mortes.length}) : ${mortes.join(", ")}`);
  console.log(
    "A verifier a la main : la detection des lectures est approximative.",
  );
} else {
  console.log("Toutes les cles ecrites semblent lues quelque part.");
}
