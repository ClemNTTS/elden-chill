/*
 * La courbe des boss, sans modele de combat.
 *
 * Les deux simulateurs s'accordent sur une falaise apres Nokron, mais tous deux
 * ignorent cendres, benedictions, afflictions et phases. Leur accord peut donc
 * n'etre qu'un biais commun.
 *
 * Ce tableau ne simule rien : il lit les statistiques ecrites des boss, dans
 * l'ordre de progression. Une rupture visible ici est dans les donnees, pas
 * dans un modele — c'est le seul constat qu'aucune omission ne peut fausser.
 *
 *   node tools/courbe-boss.mjs
 */
import { BIOMES } from "../biome.js";
import { MONSTERS } from "../monster.js";
import { BIOME_GUIDE } from "../world-map.js";

const NL = String.fromCharCode(10);

/* Ordre de progression par parcours du graphe de deblocage. */
const ordre = [];
const vus = new Set();
const file = ["limgrave_west"];
while (file.length) {
  const id = file.shift();
  if (vus.has(id) || !BIOMES[id]) continue;
  vus.add(id);
  ordre.push(id);
  for (const suivant of BIOMES[id].unlocks || []) file.push(suivant);
}
for (const id of Object.keys(BIOMES)) if (!vus.has(id)) ordre.push(id);

const lignes = [];
for (const id of ordre) {
  const biome = BIOMES[id];
  const boss = MONSTERS[biome.boss];
  if (!boss || biome.isTrial) continue;
  const atk = boss.atk || 0;
  const attaques = boss.specificStats?.attacksPerTurn || 1;
  lignes.push({
    id,
    nom: biome.name,
    boss: boss.name,
    pv: boss.hp || 0,
    atk,
    /*
     * Ce que le boss inflige par tour, avant toute defense.
     *
     * splashDamage est EXCLU, et ce n'est pas un oubli : quand l'ennemi
     * attaque, combat.js passe `targetGroup: null`, et le splash n'est
     * applique que `if (targetGroup?.length > 1)`. La statistique ne fait donc
     * rien, sur aucun des 42 monstres qui la declarent. La compter gonflait
     * Radahn de 100 degats par tour qu'il n'infligera jamais.
     */
    brut: atk * attaques,
    armure: boss.armor || 100,
    bande: BIOME_GUIDE[id]?.recommendedLevel ?? null,
  });
}

console.log(
  "BIOME                        PV      DEGATS/TOUR  ARMURE   xPV    xDEGATS  BANDE",
);
/*
 * On compare chaque biome a son PARENT dans le graphe de deblocage, pas au
 * precedent d'une liste. Un parcours en largeur entrelace les branches : la
 * premiere version comparait les Cimes des Geants a Jarburg, deux zones sans
 * aucun lien, et annonçait une marche x14 qui n'existait pas.
 */
const parents = new Map();
for (const [id, biome] of Object.entries(BIOMES)) {
  for (const suivant of biome.unlocks || []) {
    if (!parents.has(suivant)) parents.set(suivant, []);
    parents.get(suivant).push(id);
  }
}

const parNom = new Map(lignes.map((l) => [l.id, l]));
const ruptures = [];
for (const l of lignes) {
  /* Le joueur arrive par la route la plus avancee qu'il ait ouverte : on
   * retient le parent au boss le plus costaud, cas le plus favorable au jeu. */
  const candidats = (parents.get(l.id) || [])
    .map((p) => parNom.get(p))
    .filter(Boolean);
  if (!candidats.length) continue;
  const parent = candidats.reduce((a, b) => (a.pv >= b.pv ? a : b));
  const xPv = l.pv / Math.max(1, parent.pv);
  const xDeg = l.brut / Math.max(1, parent.brut);
  l.parent = parent;
  l.xPv = xPv;
  l.xDeg = xDeg;
  if (xPv >= 2 || xDeg >= 2) ruptures.push(l);
}

for (const l of lignes) {
  const marche = l.xPv !== undefined && (l.xPv >= 2 || l.xDeg >= 2);
  console.log(
    l.nom.slice(0, 27).padEnd(29) +
      String(l.pv).padStart(6) +
      String(l.brut).padStart(13) +
      String(l.armure).padStart(8) +
      (l.xPv === undefined ? "  — " : l.xPv.toFixed(2)).padStart(7) +
      (l.xDeg === undefined ? "  — " : l.xDeg.toFixed(2)).padStart(9) +
      "  " +
      (l.bande ? l.bande[0] + "-" + l.bande[1] : "—") +
      (marche ? "  <<<" : ""),
  );
}

ruptures.sort((a, b) => Math.max(b.xPv, b.xDeg) - Math.max(a.xPv, a.xDeg));
console.log(NL + "MARCHES REELLES (facteur >= 2 depuis le biome qui y mene)");
if (!ruptures.length) console.log("  aucune");
for (const r of ruptures) {
  console.log(
    "  " +
      r.nom.slice(0, 27).padEnd(29) +
      "depuis " +
      r.parent.nom.slice(0, 24).padEnd(26) +
      "PV x" +
      r.xPv.toFixed(1).padStart(4) +
      "   degats x" +
      r.xDeg.toFixed(1),
  );
}
console.log(NL + "boss mesures : " + lignes.length);
