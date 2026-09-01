// Inventaire des conversions entre statistiques.
//
// Un objet qui transforme une statistique en une autre cree un couplage : la
// source gagne la valeur de la cible EN PLUS de la sienne. Quand plusieurs
// objets convertissent vers la meme cible, ils se cumulent, et une voie prend
// une avance que rien dans les chiffres bruts ne laisse voir.
//
// C'est exactement ce qui mettait la dexterite 34% devant : huit conversions
// vers la force, toutes alimentees par la dexterite.
//
//   node tools/audit-conversions.mjs

import { readFileSync, readdirSync } from "fs";

const files = [
  "item.js",
  ...readdirSync("items").map((f) => `items/${f}`),
  "constants.js",
];

const STATS = ["strength", "dexterity", "intelligence", "vigor", "armor"];
const found = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  let owner = "?";
  lines.forEach((line, index) => {
    const named =
      line.match(/^\s{4}name:\s*"([^"]+)"/) || line.match(/^\s{2}([A-Z_]+):\s*\{/);
    if (named) owner = named[1];

    for (const target of STATS) {
      const assign = new RegExp("stats\\." + target + "\\s*(\\+=|\\*=|=)([^;]*)");
      const match = line.match(assign);
      if (!match) continue;
      const expression = match[2];

      for (const source of STATS) {
        if (source === target) continue;
        const capitalised = source[0].toUpperCase() + source.slice(1);
        const usesSource = new RegExp(
          "(stats|gameState\\.stats)\\." + source + "|base" + capitalised,
          "i",
        );
        if (usesSource.test(expression)) {
          found.push({ file, line: index + 1, owner, source, target });
        }
      }
    }
  });
}

const byPair = {};
for (const c of found) (byPair[c.source + " -> " + c.target] ||= []).push(c);

console.log("Conversions entre statistiques, par couple :\n");
for (const [pair, list] of Object.entries(byPair).sort(
  (a, b) => b[1].length - a[1].length,
)) {
  console.log(`${pair}   (${list.length})`);
  for (const c of list) {
    console.log(`   ${String(c.owner).slice(0, 34).padEnd(36)} ${c.file}:${c.line}`);
  }
  console.log();
}

const totals = {};
for (const c of found) totals[c.source] = (totals[c.source] || 0) + 1;
console.log("Nombre de conversions PARTANT de chaque statistique :");
for (const [stat, n] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${stat.padEnd(14)} ${n}`);
}
