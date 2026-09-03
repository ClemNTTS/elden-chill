/*
 * Ramene les boss aberrants sur la courbe generale.
 *
 * PREMIERE APPROCHE, ABANDONNEE : plafonner le bond entre un boss et celui du
 * biome qui le debloque. Faux, parce que le parent du GRAPHE n'est pas le
 * predecesseur en DIFFICULTE — Caelid s'ouvre depuis Necrolimbe Est mais se
 * joue trente niveaux plus tard. La correction cascadait et amputait Ekzykes
 * de 79%.
 *
 * APPROCHE RETENUE : la puissance d'un boss suit une exponentielle de son
 * niveau recommande. Mesure sur les 46 boss :
 *
 *   log(PV)     = 5.81 + 0.0245 x niveau    R2 = 0.93
 *   log(degats) = 3.34 + 0.0146 x niveau    R2 = 0.82
 *
 * Un R2 de 0.93 dit que la courbe existe et que les murs en sont des ecarts,
 * pas des paliers. On ramene donc chaque boss a l'interieur d'une tolerance
 * autour de la courbe — et on ne fait que REDUIRE : la ou la courbe est douce,
 * elle n'a pas besoin de nous.
 *
 * L'ajustement se fait en trois passes : les aberrants tirent la droite vers
 * eux, donc on refait la regression apres chaque correction.
 *
 * A N'APPLIQUER QU'UNE FOIS.
 *
 * L'outil reduit vers une droite qu'il recalcule ensuite sur les valeurs
 * reduites : la droite descend donc a chaque application. La premiere passe
 * corrige de vraies aberrations (Ainsel a x4.4 de degats, la Souche a x4.5) ;
 * une seconde ne rabote plus que 5 a 15% sans corriger quoi que ce soit, et
 * une troisieme entamerait une spirale. Verifier avec un essai a blanc que ce
 * qui remonte vaut la peine avant de reecrire.
 *
 *   node tools/lisse-boss.mjs                     (essai a blanc)
 *   node tools/lisse-boss.mjs --tolerance=1.6 --ecrire
 */
import { readFileSync, writeFileSync } from "fs";
import { BIOMES } from "../biome.js";
import { MONSTERS } from "../monster.js";
import { BIOME_GUIDE } from "../world-map.js";

const NL = String.fromCharCode(10);
const TOLERANCE = Number(
  process.argv.find((x) => x.startsWith("--tolerance="))?.split("=")[1] || 1.6,
);
const ecrire = process.argv.includes("--ecrire");

const attaques = (b) => b.specificStats?.attacksPerTurn || 1;

/* Un boss peut servir dans plusieurs biomes : on retient le niveau le plus bas
 * ou le joueur peut le rencontrer, c'est celui qui doit rester surmontable. */
const points = new Map();
for (const [id, biome] of Object.entries(BIOMES)) {
  const boss = MONSTERS[biome.boss];
  const guide = BIOME_GUIDE[id];
  if (!boss || !guide?.recommendedLevel || biome.isTrial) continue;
  const niveau = guide.recommendedLevel[0];
  const dejaVu = points.get(biome.boss);
  if (dejaVu && dejaVu.niveau <= niveau) continue;
  points.set(biome.boss, {
    bossId: biome.boss,
    nom: boss.name,
    biome: biome.name,
    niveau,
    hp: boss.hp || 0,
    deg: (boss.atk || 0) * attaques(boss),
    hpInit: boss.hp || 0,
    degInit: (boss.atk || 0) * attaques(boss),
  });
}

const liste = [...points.values()];

/** Regression log-lineaire sur une cle. */
const regression = (cle) => {
  const n = liste.length;
  const sx = liste.reduce((s, p) => s + p.niveau, 0);
  const sy = liste.reduce((s, p) => s + Math.log(Math.max(1, p[cle])), 0);
  const sxx = liste.reduce((s, p) => s + p.niveau * p.niveau, 0);
  const sxy = liste.reduce((s, p) => s + p.niveau * Math.log(Math.max(1, p[cle])), 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  return (niveau) => Math.exp(a + b * niveau);
};

for (let passe = 0; passe < 3; passe += 1) {
  const attenduPv = regression("hp");
  const attenduDeg = regression("deg");
  for (const p of liste) {
    p.hp = Math.min(p.hp, Math.round(attenduPv(p.niveau) * TOLERANCE));
    p.deg = Math.min(p.deg, Math.round(attenduDeg(p.niveau) * TOLERANCE));
  }
}

const changes = liste.filter((p) => p.hp !== p.hpInit || p.deg !== p.degInit);
changes.sort((a, b) => a.niveau - b.niveau);

console.log("tolerance : x" + TOLERANCE + " autour de la courbe" + NL);
console.log("BOSS                          NIV   PV                    DEGATS/TOUR");
for (const p of changes) {
  const boss = MONSTERS[p.bossId];
  const atkAvant = boss.atk;
  const atkApres = Math.max(1, Math.floor(p.deg / attaques(boss)));
  console.log(
    p.nom.slice(0, 28).padEnd(30) +
      String(p.niveau).padStart(4) +
      "  " +
      (p.hpInit === p.hp ? "=" : p.hpInit + " -> " + p.hp).padEnd(22) +
      (atkAvant === atkApres ? "=" : "atk " + atkAvant + " -> " + atkApres),
  );
}
console.log(NL + "boss ramenes sur la courbe : " + changes.length + " / " + liste.length);

if (!ecrire) {
  console.log("(essai a blanc — relancer avec --ecrire)");
} else {
  const fichiers = ["../monster.js", "../monsters/lands.js", "../monsters/endgame.js", "../monsters/v21.js"];
  let ecrits = 0;
  for (const rel of fichiers) {
    const url = new URL(rel, import.meta.url);
    let src = readFileSync(url, "utf8");
    let touche = false;
    for (const p of changes) {
      const debut = src.indexOf(NL + "  " + p.bossId + ": {");
      if (debut === -1) continue;
      const fin = src.indexOf(NL + "  },", debut);
      const boss = MONSTERS[p.bossId];
      const atkApres = Math.max(1, Math.floor(p.deg / attaques(boss)));
      let bloc = src.slice(debut, fin);
      const avant = bloc;
      bloc = bloc.replace(/hp:\s*\d+/, "hp: " + p.hp);
      bloc = bloc.replace(/atk:\s*\d+/, "atk: " + atkApres);
      if (bloc !== avant) {
        src = src.slice(0, debut) + bloc + src.slice(fin);
        touche = true;
        ecrits += 1;
      }
    }
    if (touche) writeFileSync(url, src);
  }
  console.log("blocs reecrits : " + ecrits + " / " + changes.length);
}
