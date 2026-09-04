/*
 * Combien de builds tiennent la route a un moment donne du jeu ?
 *
 * Retour de terrain a la sortie de l'Academie : "je me suis senti oblige de
 * suivre les panoplies, sinon pas de build puissant". C'est une impression
 * mesurable — il suffit de comparer la meilleure combinaison LIBRE a la
 * meilleure combinaison qui declenche un bonus de panoplie.
 *
 * On enumere les trois emplacements sur tout le butin joignable a ce stade, on
 * evalue chaque combinaison avec le VRAI getEffectiveStats, et on classe.
 *
 *   node tools/audit-diversite.mjs
 *   node tools/audit-diversite.mjs --jusqua=altus_plateau --niveau=90
 */
import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();

const { BUILDS, applyBuild, playerDamagePerTurn } = await import(
  "./simulate-balance.mjs"
);
const { gameState, getEffectiveStats, getHealth } = await import("../state.js");
const { ITEMS } = await import("../item.js");
const { ITEM_SETS } = await import("../constants.js");
const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");
const { BIOME_GUIDE } = await import("../world-map.js");

const NL = String.fromCharCode(10);
const arg = (n, d) =>
  process.argv.find((x) => x.startsWith("--" + n + "="))?.split("=")[1] ?? d;
const JUSQUA = arg("jusqua", "raya_lucaria_academy");
const NIVEAU = Number(
  arg("niveau", BIOME_GUIDE[JUSQUA]?.recommendedLevel?.[0] || 60),
);
const NIVEAU_OBJET = Number(arg("niveau-objet", 6));
const ARMURE_CIBLE = Number(arg("armure", 180));

/*
 * Butin joignable a ce stade.
 *
 * Premiere version : parcours en largeur du graphe de deblocage, stoppe au
 * biome vise. Faux — les autres branches filaient devant. Le pool contenait
 * l'epee de Radahn, Nokron, Ainsel et le Lac de la Putrefaction, tous
 * POSTERIEURS a l'Academie. L'outil concluait donc que le meilleur build
 * disponible tenait dans un butin que le joueur n'avait pas.
 *
 * Le bon critere est le niveau recommande : un joueur au niveau N a
 * plausiblement nettoye les biomes dont la bande commence en dessous.
 */
const atteints = Object.keys(BIOMES).filter((id) => {
  const bande = BIOME_GUIDE[id]?.recommendedLevel;
  return bande && bande[0] <= NIVEAU && !BIOMES[id].isTrial;
});

const pool = new Set();
for (const id of atteints) {
  for (const e of LOOT_TABLES[id] || []) if (e.id) pool.add(e.id);
  for (const cle of ["monsters", "rareMonsters"]) {
    for (const m of BIOMES[id][cle] || []) {
      for (const d of MONSTERS[m]?.drops || []) if (d.id) pool.add(d.id);
    }
  }
}
const objets = [...pool].filter((id) => ITEMS[id]);
const parType = (t) => objets.filter((id) => ITEMS[id].type === t);
const armes = parType("Arme");
const armures = parType("Armure");
const accessoires = parType("Accessoire");

/* Une combinaison declenche une panoplie si deux pieces au moins la partagent. */
const panoplieDe = (ids) => {
  const compte = new Map();
  for (const id of ids) {
    const s = ITEMS[id]?.set;
    if (s) compte.set(s, (compte.get(s) || 0) + 1);
  }
  for (const [s, n] of compte)
    if (n >= 2 && ITEM_SETS[s]) return { set: s, pieces: n };
  return null;
};

const evaluer = (arme, armure, accessoire) => {
  const porte = [arme, armure, accessoire].filter(Boolean);
  gameState.inventory = porte.map((id) => ({
    id,
    name: id,
    level: NIVEAU_OBJET,
    count: 0,
  }));
  gameState.equipped = { weapon: arme, armor: armure, accessory: accessoire };
  let eff;
  try {
    eff = getEffectiveStats();
  } catch {
    return null;
  }
  const degats = playerDamagePerTurn(eff, ARMURE_CIBLE);
  const pv = getHealth(eff.vigor);
  /* Score unique : degats et survie comptent autant l'un que l'autre. */
  return {
    score: Math.sqrt(Math.max(0, degats) * Math.max(1, pv)),
    degats,
    pv,
  };
};

const resultats = [];
for (const build of Object.keys(BUILDS)) {
  applyBuild(BUILDS[build], NIVEAU);
  const combos = [];
  for (const a of [null, ...armes]) {
    for (const b of [null, ...armures]) {
      for (const c of [null, ...accessoires]) {
        const r = evaluer(a, b, c);
        if (!r) continue;
        combos.push({ a, b, c, ...r, panoplie: panoplieDe([a, b, c]) });
      }
    }
  }
  combos.sort((x, y) => y.score - x.score);
  const meilleur = combos[0];
  const meilleurLibre = combos.find((x) => !x.panoplie);
  const meilleurPanoplie = combos.find((x) => x.panoplie);
  /* Combien de combinaisons tiennent a 10% du sommet ? C'est la mesure de la
   * marge de manoeuvre laissee au joueur. */
  const viables = combos.filter((x) => x.score >= meilleur.score * 0.9).length;
  const viables20 = combos.filter(
    (x) => x.score >= meilleur.score * 0.8,
  ).length;

  /* Concentration par emplacement : le meilleur score ATTEIGNABLE avec chaque
   * objet. Si le deuxieme est loin derriere le premier, l'emplacement n'offre
   * aucun choix, quelle que soit la richesse du butin. */
  const sommetPar = (slot, ids) => {
    const best = new Map();
    for (const c of combos) {
      const id = c[slot];
      if (!id) continue;
      if (!best.has(id) || best.get(id) < c.score) best.set(id, c.score);
    }
    return [...best.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
  };
  const sommets = {
    arme: sommetPar("a", armes),
    armure: sommetPar("b", armures),
    accessoire: sommetPar("c", accessoires),
  };
  resultats.push({
    build,
    meilleur,
    meilleurLibre,
    meilleurPanoplie,
    viables,
    viables20,
    sommets,
    total: combos.length,
  });
}

console.log(
  "BUTIN JOIGNABLE JUSQU'A " + (BIOMES[JUSQUA]?.name || JUSQUA).toUpperCase(),
);
console.log("  biomes traverses : " + atteints.length);
console.log(
  "  objets           : " +
    objets.length +
    "  (" +
    armes.length +
    " armes, " +
    armures.length +
    " armures, " +
    accessoires.length +
    " accessoires)",
);
console.log(
  "  niveau teste     : " + NIVEAU + ", objets au niveau " + NIVEAU_OBJET + NL,
);

console.log(
  "BUILD        COMBOS   <10%   <20%   MEILLEUR LIBRE vs MEILLEUR PANOPLIE",
);
for (const r of resultats) {
  const ecart =
    r.meilleurLibre && r.meilleurPanoplie
      ? ((r.meilleurLibre.score / r.meilleurPanoplie.score - 1) * 100).toFixed(
          1,
        ) + "%"
      : "—";
  console.log(
    r.build.padEnd(13) +
      String(r.total).padStart(6) +
      String(r.viables).padStart(7) +
      String(r.viables20).padStart(7) +
      "   " +
      (r.meilleur.panoplie ? "panoplie gagne" : "libre gagne").padEnd(16) +
      " ecart libre : " +
      ecart,
  );
}

console.log(NL + "DETAIL PAR BUILD");
for (const r of resultats) {
  console.log(NL + "  " + r.build.toUpperCase());
  const ligne = (t, c) =>
    c
      ? "    " +
        t.padEnd(20) +
        [c.a, c.b, c.c]
          .map((x) => x || "—")
          .join(" + ")
          .padEnd(70) +
        " score " +
        Math.round(c.score) +
        (c.panoplie
          ? "  [" + c.panoplie.set + " x" + c.panoplie.pieces + "]"
          : "")
      : "    " + t + " —";
  console.log(ligne("meilleur", r.meilleur));
  console.log(ligne("meilleur sans set", r.meilleurLibre));
}

console.log(NL + "CONCENTRATION PAR EMPLACEMENT");
console.log(
  "Le meilleur score atteignable avec chaque objet. Un ecart net entre le",
);
console.log(
  "premier et le deuxieme veut dire que l'emplacement n'offre aucun choix." +
    NL,
);
for (const r of resultats) {
  console.log("  " + r.build.toUpperCase());
  for (const [slot, tops] of Object.entries(r.sommets)) {
    if (!tops.length) continue;
    const tete = tops[0][1];
    const ligne = tops
      .map(([id, sc]) => id + " (" + ((sc / tete - 1) * 100).toFixed(0) + "%)")
      .join("  ·  ");
    console.log("    " + slot.padEnd(12) + ligne);
  }
  console.log("");
}
