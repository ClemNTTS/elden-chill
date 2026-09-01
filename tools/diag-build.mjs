// Diagnostic : que devient reellement chaque build a niveau egal, equipement
// optimal compris ? Sert a savoir OU se cree un ecart, avant de toucher a un
// nombre au hasard.
import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");
const { gameState, getEffectiveStats, getHealth, getMagicDamage } = await import("../state.js");
const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { ITEMS } = await import("../item.js");
const { MONSTERS } = await import("../monster.js");
const { syncCritStats, getCritPointsTotal, CRIT_MAX_RANK } = await import("../crit.js");

const LEVEL = 220, ARMOR = 265;
const BUILDS = {
  force: { strength: 0.7, vigor: 0.3 },
  dex: { dexterity: 0.7, vigor: 0.3 },
  int: { intelligence: 0.7, vigor: 0.3 },
};
const pool = Object.keys(ITEMS).filter((id) => ITEMS[id].type);

const dpt = (eff) => {
  const a = Math.max(1, ARMOR * (1 - (eff.percentDamagePenetration || 0)) - (eff.flatDamagePenetration || 0));
  const c = Math.max(0, eff.critChance || 0), hit = Math.min(1, c), sup = Math.min(1, Math.max(0, c - 1));
  const d = eff.critDamage || 1.5, crit = 1 - hit + (hit - sup) * d + sup * d * 2;
  const attacks = (eff.attacksPerTurn || 1) + (eff.extraAttackChance || 0);
  // Magie une fois par tour, physique par attaque : meme regle que combat.js.
  return attacks * Math.floor(eff.strength * crit * (100 / a)) +
    Math.floor(getMagicDamage(eff.intelligence) * crit);
};

for (const [name, w] of Object.entries(BUILDS)) {
  const s = gameState.stats;
  s.vigor = s.strength = s.dexterity = s.intelligence = 0;
  for (const [k, v] of Object.entries(w)) s[k] = Math.floor(LEVEL * v);
  s.level = LEVEL;
  const pts = getCritPointsTotal();
  s.critRanks = { chance: Math.min(CRIT_MAX_RANK.chance, Math.floor(pts * 0.6)),
                  damage: Math.min(CRIT_MAX_RANK.damage, pts - Math.floor(pts * 0.6)) };
  syncCritStats();
  gameState.inventory = pool.map((id) => ({ id, name: id, level: 8, count: 0 }));
  gameState.equipped = { weapon: null, armor: null, accessory: null };
  for (let pass = 0; pass < 2; pass++)
    for (const [slot, t] of Object.entries({ weapon: "Arme", armor: "Armure", accessory: "Accessoire" })) {
      let best = gameState.equipped[slot], bs = -1;
      for (const id of [null, ...pool]) {
        if (id && ITEMS[id].type !== t) continue;
        gameState.equipped[slot] = id;
        let e; try { e = getEffectiveStats(); } catch { continue; }
        const sc = dpt(e) * Math.sqrt(Math.max(1, getHealth(e.vigor)));
        if (sc > bs) { bs = sc; best = id; }
      }
      gameState.equipped[slot] = best;
    }
  const e = getEffectiveStats();
  console.log(
    name.padEnd(7) +
    ` base FOR${s.strength} DEX${s.dexterity} INT${s.intelligence} VIG${s.vigor}` +
    ` -> eff FOR ${Math.round(e.strength)} atk ${((e.attacksPerTurn || 1) + (e.extraAttackChance || 0)).toFixed(2)}` +
    ` arm ${Math.round(e.armor)} PV ${Math.round(getHealth(e.vigor))}` +
    ` | dgt/tour ${Math.round(dpt(e))}`);
  console.log("        equipe :", Object.values(gameState.equipped).map((i) => i && ITEMS[i].name).join(" + "));
}
