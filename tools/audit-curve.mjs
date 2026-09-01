// Audit de la courbe de difficulte, sans aucun modele de combat.
//
// Ne mesure que des rapports internes aux donnees : boss/standard, rare/standard,
// et le saut de puissance d'un biome au suivant. Ces chiffres ne dependent
// d'aucune hypothese sur le combat — une anomalie ici est une anomalie reelle.
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
  const rare = (b.rareMonsters || []).map((m) => MONSTERS[m]).filter(Boolean);
  const boss = MONSTERS[b.boss];
  if (!std.length || !boss) continue;
  const avg = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
  const sHp = avg(std, (m) => m.hp), sAtk = avg(std, (m) => m.atk);
  rows.push({
    id, nom: b.name, sHp, sAtk,
    rHp: rare.length ? avg(rare, (m) => m.hp) : null,
    bHp: boss.hp, bAtk: boss.atk,
    ratioBoss: boss.hp / sHp,
    ratioRare: rare.length ? avg(rare, (m) => m.hp) / sHp : null,
    ratioAtk: boss.atk / sAtk,
  });
}

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const medBoss = med(rows.map((r) => r.ratioBoss));
const medRare = med(rows.filter((r) => r.ratioRare).map((r) => r.ratioRare));
const medAtk = med(rows.map((r) => r.ratioAtk));

console.log(`Reference (mediane sur ${rows.length} biomes) : boss/std x${medBoss.toFixed(1)}  rare/std x${medRare.toFixed(2)}  atkBoss/atkStd x${medAtk.toFixed(2)}\n`);
console.log("biome".padEnd(30) + "std".padStart(8) + "boss".padStart(9) + "boss/std".padStart(10) + "rare/std".padStart(10) + "atk b/s".padStart(9) + "  saut");
let prev = null;
const anomalies = [];
for (const r of rows) {
  const saut = prev ? r.sHp / prev : null;
  const flags = [];
  if (r.ratioBoss > medBoss * 2.2) flags.push("BOSS SURDIMENSIONNE");
  if (r.ratioBoss < medBoss / 2.2) flags.push("boss sous-dimensionne");
  if (saut && saut > 2.2) flags.push("SAUT BRUTAL");
  if (saut && saut < 0.55) flags.push("recul");
  if (flags.length) anomalies.push([r.nom, flags.join(" + ")]);
  console.log(
    r.nom.slice(0, 29).padEnd(30) +
    Math.round(r.sHp).toString().padStart(8) +
    r.bHp.toString().padStart(9) +
    ("x" + r.ratioBoss.toFixed(1)).padStart(10) +
    (r.ratioRare ? "x" + r.ratioRare.toFixed(2) : "-").padStart(10) +
    ("x" + r.ratioAtk.toFixed(2)).padStart(9) +
    (saut ? "  x" + saut.toFixed(2) : "") +
    (flags.length ? "   <<< " + flags.join(" + ") : ""));
  prev = r.sHp;
}
console.log(`\n${anomalies.length} anomalie(s) :`);
anomalies.forEach(([n, f]) => console.log(`  ${n.padEnd(32)} ${f}`));
