/*
 * La progression annoncee tient-elle debout ?
 *
 * Retour de terrain : "les niveaux recommandes ne sont pas exacts", un mur a
 * Caelid (assume), et surtout deux options apres Rennala jugees infranchissables.
 *
 * Cet outil parcourt le graphe des deblocages et mesure, pour chaque biome, le
 * saut de niveau recommande depuis le biome qui y mene. Un saut n'est pas un
 * defaut en soi — un mur peut etre voulu — mais un saut qu'on n'a pas decide
 * est un accident.
 *
 *   node tools/audit-progression.mjs
 */
import { BIOMES } from "../biome.js";
import { BIOME_GUIDE } from "../world-map.js";

const bande = (id) => BIOME_GUIDE[id]?.recommendedLevel ?? null;

/* Qui mene a quoi. */
const menantsVers = new Map();
for (const [id, biome] of Object.entries(BIOMES)) {
  for (const suivant of biome.unlocks || []) {
    if (!menantsVers.has(suivant)) menantsVers.set(suivant, []);
    menantsVers.get(suivant).push(id);
  }
}

const sauts = [];
for (const [id, biome] of Object.entries(BIOMES)) {
  const cible = bande(id);
  if (!cible) continue;
  const parents = menantsVers.get(id) || [];
  if (!parents.length) continue;

  /* Le joueur arrive par le chemin le plus avance qu'il ait ouvert : on prend
   * le parent dont la bande finit le plus haut, c'est le cas le plus favorable
   * au jeu. Si meme celui-la laisse un trou, le trou est reel. */
  const parent = parents
    .map((p) => ({ id: p, b: bande(p) }))
    .filter((p) => p.b)
    .sort((a, b) => b.b[1] - a.b[1])[0];
  if (!parent) continue;

  sauts.push({
    id,
    nom: BIOMES[id].name,
    depuis: parent.id,
    finParent: parent.b[1],
    debut: cible[0],
    /* Le trou : ce que le joueur doit gagner APRES avoir fini le biome
     * precedent, juste pour atteindre le bas de la bande suivante. */
    trou: cible[0] - parent.b[1],
    boss: BIOMES[id].boss || "—",
  });
}

sauts.sort((a, b) => b.trou - a.trou);

console.log(
  "BIOME                        DEPUIS                  FIN→DEBUT   TROU",
);
for (const s of sauts) {
  const marque = s.trou > 0 ? (s.trou >= 10 ? " ⚠" : " ·") : "";
  console.log(
    s.nom.slice(0, 27).padEnd(29) +
      s.depuis.padEnd(24) +
      (s.finParent + "→" + s.debut).padStart(8) +
      String(s.trou).padStart(7) +
      marque,
  );
}

const murs = sauts.filter((s) => s.trou >= 10);
console.log("\nbiomes mesures : " + sauts.length);
console.log("murs de 10 niveaux ou plus : " + murs.length);
for (const m of murs) {
  console.log(
    "  " + m.nom.padEnd(28) + "+" + m.trou + " niveaux, boss " + m.boss,
  );
}
