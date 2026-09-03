/*
 * A quel niveau chaque boss tombe-t-il, avec un equipement impose ?
 *
 * Le simulateur general repond "MUR" sans dire a quel niveau le mur cede : il
 * s'arrete quand son plafond de farm est atteint. Ici on balaie le niveau
 * jusqu'a la victoire, ce qui donne un nombre comparable a une partie reelle.
 *
 * L'INTERET EST LA CALIBRATION. Six points de terrain sont connus, releves par
 * un joueur en archetype intelligence. On mesure les memes combats avec son
 * equipement, on compare, et l'ecart donne le biais du modele. Un modele dont
 * on connait le biais vaut mieux qu'un modele qu'on croit exact.
 *
 * Ce que le modele ignore, et qui le rend PESSIMISTE : cendres de guerre,
 * benedictions, afflictions, phases de boss, effets a l'impact des objets.
 *
 *   node tools/banc-boss.mjs
 *   node tools/banc-boss.mjs --niveau-objet=8
 */
import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();

const {
  BUILDS,
  applyBuild,
  playerDamagePerTurn,
  enemyDamagePerTurn,
} = await import("./simulate-balance.mjs");
const { gameState, getEffectiveStats, getHealth } = await import("../state.js");
const { MONSTERS } = await import("../monster.js");
const { BIOMES } = await import("../biome.js");
const { BIOME_GUIDE } = await import("../world-map.js");

const NL = String.fromCharCode(10);
const niveauObjet = Number(
  process.argv.find((x) => x.startsWith("--niveau-objet="))?.split("=")[1] || 6,
);

/*
 * L'equipement reellement porte par le joueur qui a fourni les releves, dans
 * l'ordre ou il l'a adopte. Chaque palier vaut a partir du biome indique.
 */
const PALIERS = [
  { des: "limgrave_west", arme: "kama", armure: null, accessoire: null },
  { des: "limgrave_north", arme: "kama", armure: "alchimist_suit", accessoire: "scholars_ring" },
  { des: "stormwind_castle", arme: "queen_staff", armure: "alchimist_suit", accessoire: "troll_necklace" },
  { des: "liurnia_south", arme: "carian_glintstone_staff", armure: "carian_knight_armor", accessoire: "troll_necklace" },
  { des: "raya_lucaria_academy", arme: "carian_glintstone_staff", armure: "carian_knight_armor", accessoire: "godrick_great_rune" },
  { des: "nokron", arme: "carian_glintstone_staff", armure: "carian_knight_armor", accessoire: "moon_of_nokstella" },
];

/* Ordre de progression, pour savoir quel palier s'applique. */
const ordre = Object.keys(BIOMES);
const rangDe = (id) => {
  const i = ordre.indexOf(id);
  return i === -1 ? 1e9 : i;
};
const palierPour = (biomeId) => {
  let choisi = PALIERS[0];
  for (const p of PALIERS) if (rangDe(p.des) <= rangDe(biomeId)) choisi = p;
  return choisi;
};

const equiper = (palier) => {
  const porte = [palier.arme, palier.armure, palier.accessoire].filter(Boolean);
  gameState.inventory = porte.map((id) => ({
    id,
    name: id,
    level: niveauObjet,
    count: 0,
  }));
  gameState.equipped = {
    weapon: palier.arme,
    armor: palier.armure,
    accessory: palier.accessoire,
  };
};

/* Marge = combien de fois le joueur survit au temps qu'il met a tuer. */
const margeContre = (boss, niveau, palier) => {
  applyBuild(BUILDS.int, niveau);
  equiper(palier);
  let eff;
  try {
    eff = getEffectiveStats();
  } catch {
    return 0;
  }
  const pv = getHealth(eff.vigor);
  const degatsJoueur = Math.max(1, playerDamagePerTurn(eff, boss.armor || 100));
  const toursPourTuer = boss.hp / degatsJoueur;
  const degatsSubis = Math.max(1, enemyDamagePerTurn(eff, boss));
  return pv / degatsSubis / toursPourTuer;
};

/*
 * Une colonne "meilleur equipement disponible" a ete tentee puis retiree.
 * equipBest attribue le niveau 8 a tout l'inventaire : un personnage de niveau
 * 1 portant cinq objets de fin de partie battait Rennala, et la colonne
 * affichait "1". Une mesure fausse est pire qu'une mesure absente.
 */
const MAX = 220;
const niveauPour = (mesure, seuil) => {
  for (let n = 1; n <= MAX; n += 1) {
    if (mesure(n) >= seuil) return n;
  }
  return null;
};

/* Les releves de terrain, pour mesurer le biais du modele. */
const RELEVES = {
  limgrave_west: 9,
  limgrave_north: 17,
  limgrave_east: 20,
  stormwind_castle: 38,
  raya_lucaria_academy: 82,
  redmane_castle: 126,
};

const lignes = [];
for (const [biomeId, biome] of Object.entries(BIOMES)) {
  const boss = MONSTERS[biome.boss];
  if (!boss) continue;
  const palier = palierPour(biomeId);
  const survie = niveauPour((n) => margeContre(boss, n, palier), 1.0);
  const confort = niveauPour((n) => margeContre(boss, n, palier), 2.0);
  const bande = BIOME_GUIDE[biomeId]?.recommendedLevel ?? null;
  lignes.push({
    biomeId,
    nom: biome.name,
    boss: boss.name,
    bande,
    survie,
    confort,
    releve: RELEVES[biomeId] ?? null,
  });
}

console.log("BIOME                        BOSS                       BANDE      SURVIE  CONFORT  RELEVE");
for (const l of lignes) {
  console.log(
    l.nom.slice(0, 27).padEnd(29) +
      l.boss.slice(0, 25).padEnd(27) +
      (l.bande ? l.bande[0] + "-" + l.bande[1] : "—").padEnd(11) +
      String(l.survie ?? ">220").padStart(6) +
      String(l.confort ?? ">220").padStart(9) +
      (l.releve ? String(l.releve).padStart(8) : "        "),
  );
}

console.log(NL + "CALIBRATION SUR LES RELEVES DE TERRAIN");
console.log("biome                     releve   survie   confort   ecart(confort)");
const ecarts = [];
for (const l of lignes) {
  if (!l.releve) continue;
  const e = l.confort ? l.releve - l.confort : null;
  if (e !== null) ecarts.push(e);
  console.log(
    l.biomeId.padEnd(26) +
      String(l.releve).padStart(6) +
      String(l.survie ?? ">220").padStart(9) +
      String(l.confort ?? ">220").padStart(10) +
      (e === null ? "      —" : (e > 0 ? "+" : "") + e).padStart(16),
  );
}
if (ecarts.length) {
  const moy = ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
  console.log(NL + "  ecart moyen releve - confort : " + (moy > 0 ? "+" : "") + moy.toFixed(1));
}

/* ------------------------------------------------------------------ */
/* Recalage des bandes recommandees                                   */
/* ------------------------------------------------------------------ */

/*
 * La bande devient [survie, confort] : le minimum viable et le confortable.
 *
 * Validation sur les six releves de terrain : cinq tombent dans la bande ainsi
 * definie ou a un cheveu. Le sixieme, Rennala a 82, est au-dessus — le joueur
 * dit lui-meme avoir avance avec un peu d'avance de niveau.
 *
 * Pour les biomes que le banc ne sait pas mesurer (">220" : l'equipement de
 * reference est celui du milieu de partie, pas celui qu'on porte au Trone
 * d'Elden), on n'invente rien. On decale la bande existante pour qu'elle cesse
 * au moins de reculer par rapport au biome qui y mene — une bande qui redescend
 * de Nokron 120 a Ainsel 68 est fausse quel que soit le modele.
 */
if (process.argv.includes("--ecrire-bandes")) {
  const { readFileSync, writeFileSync } = await import("fs");
  const MAX_BANDE = 220;

  const parents = new Map();
  for (const [id, biome] of Object.entries(BIOMES)) {
    for (const suivant of biome.unlocks || []) {
      if (!parents.has(suivant)) parents.set(suivant, []);
      parents.get(suivant).push(id);
    }
  }

  /* Ordre topologique depuis le depart, pour qu'un parent soit toujours
   * calcule avant son enfant. */
  const ordreTopo = [];
  const vus = new Set();
  const file = ["limgrave_west"];
  while (file.length) {
    const id = file.shift();
    if (vus.has(id) || !BIOMES[id]) continue;
    vus.add(id);
    ordreTopo.push(id);
    for (const suivant of BIOMES[id].unlocks || []) file.push(suivant);
  }
  for (const id of Object.keys(BIOMES)) if (!vus.has(id)) ordreTopo.push(id);

  /* Rapport median entre bande mesuree et bande ecrite, sur les biomes
   * mesurables au-dela du niveau 35 — la ou les deux courbes divergent. */
  const rapports = [];
  for (const l of lignes) {
    const a = BIOME_GUIDE[l.biomeId]?.recommendedLevel;
    if (!a || !l.survie || !l.confort || a[0] < 35) continue;
    rapports.push(l.survie / a[0]);
  }
  rapports.sort((x, y) => x - y);
  const RATIO_EXTRAPOLE = rapports.length
    ? rapports[Math.floor(rapports.length / 2)]
    : 1;
  console.log(NL + "  rapport median mesure/ecrit (biomes > 35) : x" +
    RATIO_EXTRAPOLE.toFixed(2) + "  sur " + rapports.length + " biomes");

  const parId = new Map(lignes.map((l) => [l.biomeId, l]));
  const nouvelles = new Map();
  const extrapoles = new Set();

  for (const id of ordreTopo) {
    const l = parId.get(id);
    const ancienne = BIOME_GUIDE[id]?.recommendedLevel;
    if (!l || !ancienne) continue;

    let bas;
    let haut;
    let extrapole = false;
    if (l.survie && l.confort) {
      bas = l.survie;
      haut = Math.min(MAX_BANDE, l.confort);
    } else {
      /*
       * Non mesurable : on prolonge par le rapport OBSERVE sur les biomes qui,
       * eux, le sont. Ce n'est pas une mesure et c'est ecrit comme tel dans le
       * rapport ("extrapolation").
       *
       * Deux rattrapages ont ete essayes puis abandonnes. Le decalage cumulatif
       * ecrasait les dix derniers biomes a 220. La simple non-regression donnait
       * quatorze biomes a "160-200" : une bande identique partout n'informe
       * personne. Ne rien ecrire du tout laissait pire — Nokron a 120-156 suivi
       * d'Ainsel a 68-80, un decrochage de 88 niveaux dans les etiquettes.
       *
       * Le rapport median mesure vaut ~1.9 sur la seconde moitie mesurable. On
       * l'applique, puis le plafond tranche. Les biomes qui butent sur 220 le
       * disent : la derniere partie du jeu demande le plafond de niveau.
       */
      bas = ancienne[0] * RATIO_EXTRAPOLE;
      haut = ancienne[1] * RATIO_EXTRAPOLE;
      extrapole = true;
    }

    /* Le plafond doit s'appliquer EN DERNIER. Une version precedente ecrivait
     * "220-226" parce que le plancher `bas + 6` etait evalue apres lui. */
    bas = Math.max(1, Math.min(MAX_BANDE, Math.round(bas)));
    haut = Math.min(MAX_BANDE, Math.max(bas + 6, Math.round(haut)));
    if (haut <= bas) bas = Math.max(1, haut - 6);
    nouvelles.set(id, [bas, haut]);
    if (extrapole) extrapoles.add(id);
  }

  const chemin = new URL("../world-map.js", import.meta.url);
  let src = readFileSync(chemin, "utf8");
  let modifiees = 0;
  const journal = [];

  for (const [id, [bas, haut]] of nouvelles) {
    const debutBloc = src.indexOf(id + ":");
    if (debutBloc === -1) continue;
    const ancre = src.indexOf("recommendedLevel: [", debutBloc);
    if (ancre === -1 || ancre > debutBloc + 400) continue;
    const fin = src.indexOf("]", ancre);
    const debutValeurs = ancre + "recommendedLevel: [".length;
    const avant = src.slice(debutValeurs, fin).split(",").map((n) => Number(n.trim()));
    if (avant[0] === bas && avant[1] === haut) continue;
    src = src.slice(0, debutValeurs) + bas + ", " + haut + src.slice(fin);
    modifiees += 1;
    journal.push({ id, avant, apres: [bas, haut], mesure: !extrapoles.has(id) });
  }

  writeFileSync(chemin, src);
  journal.sort((a, b) => a.apres[0] - b.apres[0]);
  console.log(NL + "BANDES RECALEES");
  console.log("biome                        avant        apres        source");
  for (const j of journal) {
    console.log(
      j.id.padEnd(29) +
        (j.avant[0] + "-" + j.avant[1]).padEnd(13) +
        (j.apres[0] + "-" + j.apres[1]).padEnd(13) +
        (j.mesure ? "mesure" : "extrapolation x" + RATIO_EXTRAPOLE.toFixed(2)),
    );
  }
  console.log(NL + "  bandes modifiees : " + modifiees + " / " + nouvelles.size);
}
