// Regenere locales/en.js a partir de locales/en.json.
//
// Les traductions se redigent dans le JSON : ajouter une entree a un fichier de
// 900 lignes de JavaScript a la main finit toujours par une virgule oubliee ou
// une apostrophe mal echappee. Le module JS n'est qu'un emballage, pour que le
// catalogue s'importe sans assertion d'import.
//
//   node tools/build-locale.mjs

import { readFileSync, writeFileSync } from "fs";

const NL = String.fromCharCode(10);
const catalogue = JSON.parse(readFileSync("locales/en.json", "utf8"));

/* Regroupe par prefixe pour que le fichier reste lisible. */
const parPrefixe = {};
for (const [cle, valeur] of Object.entries(catalogue)) {
  const p = cle.slice(0, cle.indexOf("."));
  (parPrefixe[p] ||= []).push([cle, valeur]);
}

const TITRES = {
  item: "Objets",
  monster: "Monstres",
  biome: "Biomes",
  ash: "Cendres de guerre",
  blessing: "Benedictions",
  consumable: "Consommables de preparation",
  event: "Evenements",
  trait: "Traits de biome",
  trial: "Epreuves",
  rebirth: "Noeuds de renaissance",
  ui: "Interface",
};

let sortie = `// Surcouche anglaise. FICHIER GENERE — ne pas modifier a la main.
//
// Source : locales/en.json, regenere par tools/build-locale.mjs.
//
// Les cles ont la forme \`prefixe.identifiant.champ\` et viennent de
// tools/extract-strings.mjs. Le francais n'a pas de catalogue : les fichiers
// de donnees SONT la version francaise. Voir i18n.js.
//
// tools/audit-traduction.mjs signale les cles manquantes, orphelines ou
// restees identiques au francais.

export const EN = {`;

for (const [prefixe, entrees] of Object.entries(parPrefixe)) {
  sortie += `${NL}${NL}  /* --- ${TITRES[prefixe] || prefixe} (${entrees.length}) --- */${NL}`;
  for (const [cle, valeur] of entrees) {
    sortie += `  ${JSON.stringify(cle)}: ${JSON.stringify(valeur)},${NL}`;
  }
}

sortie += `};${NL}`;

/*
 * Table francais -> anglais pour les libelles du HTML.
 *
 * Les cles d'interface sont positionnelles (ui.html.42) : s'en servir a
 * l'execution serait fragile, deplacer un bloc dans index.html decalerait tout.
 * On appare donc par le TEXTE. Cette table est generee a partir des deux
 * catalogues, elle ne peut donc pas se desynchroniser.
 */
const FR = JSON.parse(readFileSync("locales/fr.json", "utf8"));
const paires = {};
for (const [cle, anglais] of Object.entries(catalogue)) {
  if (!cle.startsWith("ui.")) continue;
  const francais = FR[cle];
  if (francais) paires[francais] = anglais;
}

sortie += `${NL}/* Libelles statiques du HTML, apparies par leur texte francais. */${NL}`;
sortie += `export const EN_UI = ${JSON.stringify(paires, null, 2)};${NL}`;

writeFileSync("locales/en.js", sortie, "utf8");
console.log(`locales/en.js regenere : ${Object.keys(catalogue).length} entrees.`);
