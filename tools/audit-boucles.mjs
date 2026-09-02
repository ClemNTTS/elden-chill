// Quels objets convertissent depuis la statistique EFFECTIVE plutot que la base ?
//
// La regle du projet : une conversion lit gameState.stats.X, la valeur investie
// par le joueur. Lire stats.X — la valeur effective — cree une boucle : l'objet
// augmente la statistique, puis convertit la valeur qu'il vient d'augmenter, et
// toute autre piece touchant cette statistique nourrit la meme boucle.
//
// C'est ce qui rendait le build intelligence dominant en debut de partie : le
// Baton de la Reine appliquait +10% d'Intelligence puis convertissait 58% de
// l'effective en Force, rendant 42 de Force pour 48 d'Intelligence investie —
// sans un seul point depense en Force, et avec les degats magiques en plus.
//
// ATTENTION a la forme du motif. La premiere version cherchait "Math.floor("
// suivi immediatement de "stats.X" et ratait la moitie des cas : la statistique
// peut etre a droite de la multiplication, et l'appel peut tenir sur plusieurs
// lignes. On lit l'instruction entiere, jusqu'au point-virgule.
//
//   node tools/audit-boucles.mjs

import { readFileSync, readdirSync } from "fs";

const fichiers = ["item.js", ...readdirSync("items").map((f) => `items/${f}`)];
const STATS = ["strength", "dexterity", "intelligence", "vigor"];
const NL = String.fromCharCode(10);

const suspects = [];

for (const fichier of fichiers) {
  const src = readFileSync(fichier, "utf8");
  const entrees = [...src.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*\{/gm)];

  entrees.forEach((entree, i) => {
    const debut = entree.index;
    const fin = i + 1 < entrees.length ? entrees[i + 1].index : src.length;
    const corps = src
      .slice(debut, fin)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const nom = (corps.match(/name:\s*"([^"]+)"/) || [])[1] || entree[1];

    for (const m of corps.matchAll(/stats\.(\w+)\s*\+=\s*([^;]+);/g)) {
      const cible = m[1];
      const expression = m[2];
      for (const source of STATS) {
        // Se multiplier soi-meme est un bonus en pourcentage, pas une conversion.
        if (source === cible) continue;
        const effectif = new RegExp(`(?<!gameState\\.)stats\\.${source}\\b`);
        if (!effectif.test(expression)) continue;
        suspects.push({
          fichier,
          ligne: src.slice(0, debut + m.index).split(NL).length,
          nom,
          id: entree[1],
          cible,
          source,
        });
      }
    }
  });
}

if (!suspects.length) {
  console.log("Aucune conversion ne lit la statistique effective.");
} else {
  console.log(
    `${suspects.length} conversion(s) lisent la statistique EFFECTIVE au lieu de la base.` + NL,
  );
  const parSource = {};
  for (const s of suspects) (parSource[s.source] ||= []).push(s);
  for (const [source, liste] of Object.entries(parSource)) {
    console.log(`--- depuis ${source} (${liste.length}) ---`);
    for (const s of liste) {
      console.log(
        `  ${s.nom.slice(0, 32).padEnd(34)} -> ${s.cible.padEnd(13)} ${s.fichier}:${s.ligne}`,
      );
    }
    console.log("");
  }
}
process.exitCode = suspects.length ? 1 : 0;
