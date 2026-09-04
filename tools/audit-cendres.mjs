import { readFileSync } from "node:fs";
/*
 * Quand un joueur obtient-il REELLEMENT chaque cendre de guerre ?
 *
 * Retour de terrain apres une journee de jeu : premiere cendre au niveau 110,
 * alors que la moitie des cendres sont ecrites comme du materiel de debut.
 *
 * Une cendre tombe par deux voies, et il faut les deux pour conclure :
 *   - la table de butin du biome, tiree une fois par biome termine ;
 *   - le butin d'un monstre RARE, qui doit d'abord apparaitre.
 *
 * Un premier jet de cet outil ne regardait que les tables de butin et
 * concluait a neuf cendres inaccessibles. C'etait faux : elles tombent
 * toutes de monstres. Le probleme n'est pas l'absence de source, c'est
 * l'esperance.
 *
 *   node tools/audit-cendres.mjs
 */
import { BIOMES, LOOT_TABLES } from "../biome.js";
import { MONSTERS } from "../monster.js";
import { BIOME_GUIDE } from "../world-map.js";

/* Les noms des cendres se lisent au texte : ashes.js importe combat.js, qui
 * remonte jusqu'a game.js et son objet window. */
const nomsCendres = {};
{
  const src = readFileSync(new URL("../ashes.js", import.meta.url), "utf8");
  const re = /^ {2}([a-z0-9_]+): \{/gm;
  let m;
  while ((m = re.exec(src))) {
    const bloc = src.slice(m.index, m.index + 400);
    const n = /name:\s*"([^"]+)"/.exec(bloc);
    nomsCendres[m[1]] = n ? n[1] : m[1];
  }
}

/* ashId -> [{ biome, voie, parRun }] */
const sources = new Map();
const ajouter = (ashId, entree) => {
  if (!sources.has(ashId)) sources.set(ashId, []);
  sources.get(ashId).push(entree);
};

for (const [biomeId, biome] of Object.entries(BIOMES)) {
  /* Voie 1 : la table de butin, un tirage pondere par biome termine. */
  const table = LOOT_TABLES[biomeId] || [];
  const poidsTotal = table.reduce((s, e) => s + (e.chance ?? 1), 0);
  for (const entree of table) {
    if (!entree.ashId) continue;
    ajouter(entree.ashId, {
      biome: biomeId,
      voie: "table",
      parRun: poidsTotal > 0 ? (entree.chance ?? 1) / poidsTotal : 0,
    });
  }

  /* Voie 2 : le butin d'un rare, qui doit d'abord etre tire parmi les rares
   * du biome, autant de fois que maxRareSpawns l'autorise. */
  const rares = biome.rareMonsters || [];
  const apparitions = biome.maxRareSpawns || 0;
  for (const rareId of rares) {
    for (const drop of MONSTERS[rareId]?.drops || []) {
      if (!drop.ashId) continue;
      const parApparition = (1 / rares.length) * (drop.chance ?? 0);
      ajouter(drop.ashId, {
        biome: biomeId,
        voie: `rare ${rareId}`,
        parRun: 1 - (1 - parApparition) ** apparitions,
      });
    }
  }
}

const lignes = Object.keys(nomsCendres).map((ashId) => {
  const src = sources.get(ashId) || [];
  /* Le biome le plus tot ou la cendre peut tomber, et le meilleur taux. */
  const parBiome = src.map((s) => ({
    ...s,
    niveau: BIOME_GUIDE[s.biome]?.recommendedLevel?.[0] ?? null,
  }));
  const plusTot = parBiome.length
    ? parBiome.reduce((a, b) =>
        (a.niveau ?? 1e9) <= (b.niveau ?? 1e9) ? a : b,
      )
    : null;
  const meilleur = parBiome.length
    ? parBiome.reduce((a, b) => (a.parRun >= b.parRun ? a : b))
    : null;
  return {
    nom: nomsCendres[ashId],
    niveau: plusTot?.niveau ?? null,
    voie: plusTot?.voie ?? "—",
    parRun: plusTot?.parRun ?? 0,
    /* Esperance : nombre de fois qu'il faut terminer le biome. */
    runs: plusTot?.parRun ? 1 / plusTot.parRun : Number.POSITIVE_INFINITY,
    meilleurRuns: meilleur?.parRun
      ? 1 / meilleur.parRun
      : Number.POSITIVE_INFINITY,
  };
});

lignes.sort((a, b) => (a.niveau ?? 1e9) - (b.niveau ?? 1e9));

console.log(
  "CENDRE                            NIV  VOIE LA PLUS PRECOCE      /RUN    RUNS ATTENDUS",
);
for (const l of lignes) {
  console.log(
    l.nom.padEnd(34) +
      String(l.niveau ?? "—").padStart(4) +
      "  " +
      l.voie.padEnd(28) +
      (l.parRun * 100).toFixed(1).padStart(5) +
      "%  " +
      (Number.isFinite(l.runs) ? l.runs.toFixed(1) : "jamais").padStart(8),
  );
}

const lentes = lignes.filter((l) => l.runs > 20);
console.log("\ncendres : " + lignes.length);
console.log("qui demandent plus de 20 runs du biome : " + lentes.length);
for (const l of lentes) {
  console.log(
    "  " +
      l.nom.padEnd(34) +
      (Number.isFinite(l.runs) ? l.runs.toFixed(0) + " runs" : "jamais"),
  );
}
