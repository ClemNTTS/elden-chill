// Deux objets ne doivent pas partager une cellule, et une cellule ne doit pas
// etre vide : dans les deux cas le joueur voit une image qui ne correspond a
// rien. audit-icones.mjs ne verifie que la PRESENCE d'une correspondance.

import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");

const { ITEMS } = await import("../item.js");
const { ASHES_OF_WAR } = await import("../ashes.js");
const { getItemIcon, getAshIcon, ATLASES } = await import("../icons.js");
const { readFileSync } = await import("node:fs");
const { execFileSync } = await import("node:child_process");

const NL = String.fromCharCode(10);
const parCellule = new Map();

const noter = (id, nom, icone) => {
  if (!icone) return;
  // Les quatre planches d'armes partagent leurs coordonnees : une seule cle.
  const planche = icone.atlas.startsWith("weapons") ? "weapons" : icone.atlas;
  const cle = `${planche}:${icone.col},${icone.row}`;
  (parCellule.get(cle) || parCellule.set(cle, []).get(cle)).push(
    `${nom} (${id})`,
  );
};

for (const [id, item] of Object.entries(ITEMS)) {
  if (item.type) noter(id, item.name || id, getItemIcon(id, 10));
}
for (const [id, ash] of Object.entries(ASHES_OF_WAR)) {
  noter(id, ash.name || id, getAshIcon(id));
}

/*
 * Partage assume : les poings n'ont pas d'arme et reutilisent volontairement le
 * gantelet de la Manche Forgee. Sans cette exception l'outil sort toujours en
 * echec, et un vrai doublon passerait inapercu au milieu du bruit.
 */
const PARTAGES_ASSUMES = new Set(["accessories:0,1"]);

const doublons = [...parCellule].filter(
  ([cle, l]) => l.length > 1 && !PARTAGES_ASSUMES.has(cle),
);
console.log(
  `${parCellule.size} cellules utilisees, ${doublons.length} partagee(s).` + NL,
);
for (const [cle, liste] of doublons) {
  console.log(`  ${cle}`);
  for (const n of liste) console.log(`     ${n}`);
}

// Les cellules vides se verifient en Python : Pillow lit les PNG, pas Node.
const cellules = [...parCellule.keys()].map((c) => {
  const [planche, xy] = c.split(":");
  const [col, row] = xy.split(",").map(Number);
  return { planche, col, row };
});
execFileSync("python", ["tools/check_icon_cells.py"], {
  input: JSON.stringify({ cellules, atlases: ATLASES }),
  stdio: ["pipe", "inherit", "inherit"],
});
process.exitCode = doublons.length ? 1 : 0;
