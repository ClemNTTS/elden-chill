// Confronte la description d'un objet a ce que son code fait reellement.
//
// Une description qui ment est pire qu'une description absente : le joueur
// construit son build dessus. Et c'est le genre d'erreur qui ne se voit jamais
// en relecture, parce que le texte et le code sont a vingt lignes d'ecart et
// qu'on ne modifie presque jamais les deux en meme temps.
//
// Methode : on extrait les nombres de la description (pourcentages et entiers)
// et ceux du corps des fonctions, puis on signale les nombres annonces qui
// n'apparaissent nulle part dans le code. C'est une heuristique — elle produit
// des faux positifs quand un nombre est calcule plutot qu'ecrit — donc elle
// classe ses resultats par niveau de suspicion au lieu de trancher.
//
//   node tools/audit-descriptions.mjs
//   node tools/audit-descriptions.mjs --tout   (affiche aussi les cas douteux)

import { readFileSync, readdirSync } from "fs";

const files = ["item.js", ...readdirSync("items").map((f) => `items/${f}`)];
const showAll = process.argv.includes("--tout");

/** Nombres cites dans un texte, pourcentages ramenes en fraction. */
const numbersInText = (text) => {
  const out = new Set();
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
    out.add(Math.round(parseFloat(m[1].replace(",", ".")) * 100) / 10000);
  }
  for (const m of text.matchAll(/(?<![%\d.,])(\d+(?:[.,]\d+)?)(?!\s*%)/g)) {
    out.add(parseFloat(m[1].replace(",", ".")));
  }
  return out;
};

/** Nombres litteraux presents dans du code. */
const numbersInCode = (code) => {
  const out = new Set();
  for (const m of code.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)/g)) {
    const v = parseFloat(m[1]);
    out.add(v);
    // Un ratio ecrit 0.18 se lit "18%" dans la description.
    if (v < 1) out.add(Math.round(v * 10000) / 10000);
    // Les formes multiplicatives : *= 1.2 se lit "+20%", *= 0.85 se lit "-15%".
    // Sans ca l'outil signalait comme absents des nombres bien presents, sous
    // une autre ecriture.
    if (v > 1 && v < 3) out.add(Math.round((v - 1) * 10000) / 10000);
    if (v < 1 && v > 0) out.add(Math.round((1 - v) * 10000) / 10000);
  }
  return out;
};

const suspects = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const entries = [...src.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*\{/gm)];

  entries.forEach((entry, index) => {
    const start = entry.index;
    const end = index + 1 < entries.length ? entries[index + 1].index : src.length;
    const body = src.slice(start, end);

    const desc = body.match(/description:\s*((?:"[^"]*"\s*\+?\s*)+)/);
    if (!desc) return;
    const text = desc[1].replace(/"/g, " ");

    // Le code, sans la description ni les commentaires.
    const code = body
      .replace(/description:\s*(?:"[^"]*"\s*\+?\s*)+,/, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    const said = numbersInText(text);
    const done = numbersInCode(code);

    // On ignore les nombres trop courants pour signifier quoi que ce soit.
    const bruit = new Set([0, 1, 2, 3, 10, 100]);
    const orphelins = [...said].filter((n) => !bruit.has(n) && !done.has(n));
    if (!orphelins.length) return;

    const nom = (body.match(/name:\s*"([^"]+)"/) || [])[1] || entry[1];
    const ligne = src.slice(0, start).split("\n").length;
    // Plus il manque de nombres, plus c'est probablement une vraie desync.
    suspects.push({
      file,
      ligne,
      nom,
      manquants: orphelins,
      gravite: orphelins.length / Math.max(1, said.size),
    });
  });
}

suspects.sort((a, b) => b.gravite - a.gravite);
const forts = suspects.filter((s) => s.gravite >= 0.5);
const faibles = suspects.filter((s) => s.gravite < 0.5);

console.log(
  `${suspects.length} objet(s) dont la description cite un nombre absent du code.\n` +
    `Les nombres calcules plutot qu'ecrits produisent des faux positifs : a verifier a la main.\n`,
);
console.log(`--- SUSPICION FORTE (${forts.length}) : plus de la moitie des nombres annonces sont introuvables\n`);
for (const s of forts) {
  console.log(`  ${s.nom.slice(0, 36).padEnd(38)} ${s.file}:${s.ligne}`);
  console.log(`     annonce sans equivalent dans le code : ${s.manquants.join(", ")}`);
}
if (showAll) {
  console.log(`\n--- SUSPICION FAIBLE (${faibles.length})\n`);
  for (const s of faibles) {
    console.log(`  ${s.nom.slice(0, 36).padEnd(38)} ${s.file}:${s.ligne}  ->  ${s.manquants.join(", ")}`);
  }
} else {
  console.log(`\n(${faibles.length} cas de suspicion faible masques, relancer avec --tout)`);
}
