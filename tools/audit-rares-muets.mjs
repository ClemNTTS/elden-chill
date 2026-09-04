/*
 * Quels rares n'apparaissent jamais, et qu'emportent-ils avec eux ?
 *
 * core.js decide l'apparition d'un rare avec `biome.maxRareSpawns || 0`. Un
 * biome qui declare des `rareMonsters` mais OUBLIE `maxRareSpawns` ne fait donc
 * jamais apparaitre ses rares — sans erreur, sans avertissement, sans rien
 * dans le journal. Le contenu est ecrit, referencE, et injouable.
 *
 * Retour de terrain qui a mis la puce a l'oreille : "la panoplie du chevalier
 * Carien est la seule des deux jouable a ce stade".
 *
 *   node tools/audit-rares-muets.mjs
 */
import { BIOMES, LOOT_TABLES } from "../biome.js";
import { MONSTERS } from "../monster.js";

/* Un rare parle s'il apparait dans AU MOINS un biome qui l'autorise. */
const rarePeutApparaitre = new Map();
const biomesMuets = [];

for (const [biomeId, biome] of Object.entries(BIOMES)) {
  const rares = biome.rareMonsters || [];
  if (!rares.length) continue;
  /* Le || 0 de core.js : champ absent et 0 explicite se valent. */
  const autorise = (biome.maxRareSpawns || 0) > 0;
  if (!autorise) {
    biomesMuets.push({
      id: biomeId,
      nom: biome.name,
      rares,
      declare: Object.hasOwn(biome, "maxRareSpawns"),
    });
  }
  for (const r of rares) {
    rarePeutApparaitre.set(r, rarePeutApparaitre.get(r) || false || autorise);
  }
}

/* Tout ce qui tombe ailleurs que d'un rare muet reste joignable. */
const joignable = new Set();
for (const table of Object.values(LOOT_TABLES)) {
  for (const e of table) joignable.add(e.ashId || e.id);
}
for (const [id, m] of Object.entries(MONSTERS)) {
  const estRareMuet = rarePeutApparaitre.has(id) && !rarePeutApparaitre.get(id);
  if (estRareMuet) continue;
  for (const d of m.drops || []) joignable.add(d.ashId || d.id);
}

console.log("BIOMES QUI DECLARENT DES RARES SANS POUVOIR LES FAIRE APPARAITRE");
if (!biomesMuets.length) console.log("  aucun");
for (const b of biomesMuets) {
  console.log(
    "  " +
      b.nom.padEnd(26) +
      (b.declare ? "maxRareSpawns: 0 (voulu)" : "champ ABSENT") +
      "   rares : " +
      b.rares.join(", "),
  );
}

console.log("\nCONTENU PERDU AVEC EUX");
let perdus = 0;
for (const [rareId, peut] of rarePeutApparaitre) {
  if (peut) continue;
  const m = MONSTERS[rareId];
  if (!m) continue;
  console.log("  " + (m.name || rareId) + " (" + rareId + ")");
  for (const d of m.drops || []) {
    const cle = d.ashId || d.id;
    const ailleurs = joignable.has(cle);
    perdus += ailleurs ? 0 : 1;
    console.log(
      "      " +
        cle.padEnd(26) +
        (d.chance * 100).toFixed(0).padStart(3) +
        "%   " +
        (ailleurs ? "aussi ailleurs" : "→ INTROUVABLE AUTREMENT"),
    );
  }
}
console.log("\nentrees introuvables autrement : " + perdus);
