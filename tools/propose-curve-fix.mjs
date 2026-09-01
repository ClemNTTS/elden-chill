// Propose (sans appliquer) le lissage des anomalies de courbe.
//
// Regle : le rapport boss/standard doit tenir dans une bande autour de la
// mediane. Au-dela, on ajuste le BOSS et pas le trash — baisser le trash
// casserait l'economie de runes, et le monter ferait grimper tout le biome.
import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");
const { BIOMES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");

const order = (() => {
  const seen = new Set(["limgrave_west"]), out = ["limgrave_west"], q = ["limgrave_west"];
  while (q.length) for (const n of BIOMES[q.shift()]?.unlocks || [])
    if (BIOMES[n] && !seen.has(n)) { seen.add(n); out.push(n); q.push(n); }
  return out;
})();

const rows = [];
for (const id of order) {
  const b = BIOMES[id];
  if (b.isTrial) continue;
  const std = (b.monsters || []).map((m) => MONSTERS[m]).filter(Boolean);
  const boss = MONSTERS[b.boss];
  if (!std.length || !boss) continue;
  const sHp = std.reduce((s, m) => s + m.hp, 0) / std.length;
  const sAtk = std.reduce((s, m) => s + m.atk, 0) / std.length;
  rows.push({ id, nom: b.name, bossId: b.boss, sHp, sAtk, bHp: boss.hp, bAtk: boss.atk });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const MED_HP = med(rows.map((r) => r.bHp / r.sHp));
const MED_ATK = med(rows.map((r) => r.bAtk / r.sAtk));
// Bande large : un boss d'histoire a le droit d'etre deux fois au-dessus de la
// mediane. Au-dela, ce n'est plus un pic, c'est un mur.
const MAX_HP = MED_HP * 2.0, MIN_HP = MED_HP / 2.0;
const MAX_ATK = MED_ATK * 1.8;

console.log(`mediane boss/std : pv x${MED_HP.toFixed(1)}  atk x${MED_ATK.toFixed(2)}`);
console.log(`bande retenue    : pv [x${MIN_HP.toFixed(1)} , x${MAX_HP.toFixed(1)}]  atk max x${MAX_ATK.toFixed(2)}\n`);

/*
 * Correction repartie, pas unilaterale.
 *
 * Baisser un boss d'histoire de 70% le rend insignifiant ; monter seulement le
 * trash fait exploser l'economie de runes du biome. On monte donc le standard
 * vers la mediane de ses VOISINS immediats (au plus +60%), et on ne rabote le
 * boss que pour le reste de l'ecart.
 */
const fixes = [];
rows.forEach((r, i) => {
  const ratio = r.bHp / r.sHp;
  const ratioAtk = r.bAtk / r.sAtk;
  if (ratio <= MAX_HP && ratioAtk <= MAX_ATK) return;

  const voisins = [rows[i - 1], rows[i + 1]].filter(Boolean).map((v) => v.sHp);
  const cibleStd = voisins.length ? med(voisins) : r.sHp;
  const nouveauStd = Math.min(cibleStd, r.sHp * 1.6);
  const stdFinal = nouveauStd > r.sHp ? Math.round(nouveauStd / 5) * 5 : r.sHp;

  let hp = null;
  if (r.bHp / stdFinal > MAX_HP) hp = Math.round((stdFinal * MAX_HP) / 100) * 100;
  const atk = ratioAtk > MAX_ATK ? Math.round(r.sAtk * MAX_ATK) : null;
  if (hp || atk || stdFinal !== r.sHp) {
    fixes.push({ ...r, ratio, ratioAtk, hp, atk, stdFinal });
  }
});

console.log(`${fixes.length} boss a ajuster :\n`);
console.log("boss".padEnd(34) + "pv".padStart(9) + " ->" + "pv".padStart(9) + "   ratio" + "     atk -> atk");
for (const f of fixes) {
  console.log(
    (MONSTERS[f.bossId].name || f.bossId).slice(0, 33).padEnd(34) +
    String(f.bHp).padStart(9) + " ->" + String(f.hp ?? f.bHp).padStart(9) +
    ("  x" + f.ratio.toFixed(1) + " -> x" + ((f.hp ?? f.bHp) / f.stdFinal).toFixed(1)).padEnd(20) +
    (f.stdFinal !== f.sHp ? ` [std ${Math.round(f.sHp)}->${f.stdFinal}]` : "") +
    (f.atk ? `  ${f.bAtk} -> ${f.atk}` : ""));
}
console.log("\nJSON :");
console.log(JSON.stringify(fixes.map((f) => ({ id: f.bossId, hp: f.hp, atk: f.atk })), null, 0));
