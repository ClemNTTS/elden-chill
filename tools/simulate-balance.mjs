// Simulateur d'equilibrage : joue le jeu sans interface et dit ou la courbe
// casse.
//
// Pourquoi il existe : chaque mecanique a ete verifiee isolement, mais
// personne n'a joue une partie complete sur 46 biomes et 220 niveaux. Les
// ruptures de rythme ne se voient pas en lisant le code — elles se voient en
// comparant, biome par biome, la vitesse a laquelle on tue et celle a laquelle
// on meurt.
//
//   node tools/simulate-balance.mjs
//   node tools/simulate-balance.mjs --build=dex --verbose
//
// FIDELITE — a lire avant de faire confiance aux chiffres.
//
// Le simulateur importe le VRAI getEffectiveStats() : objets, panoplies,
// traits de biome, renaissance, conversions de stats, tout passe par le code
// du jeu. C'est la que vit la complexite, et c'est la qu'une reimplementation
// aurait diverge.
//
// En revanche la boucle de combat est reecrite ici, parce que la vraie est
// asynchrone et couplee a l'affichage. Elle reproduit combat.js dans l'ordre
// exact : degats = force, multiplicateur critique, division par l'armure
// penetree, puis ajout des degats magiques qui eux ignorent l'armure. Cette
// reimplementation a ete verifiee contre le jeu reel : a 150 d'intelligence
// contre 200 d'armure, le jeu affiche 138 degats par coup, le modele en
// predit 138.
//
// Ce que le simulateur NE modele PAS, et qui rend ses chiffres pessimistes :
// les cendres de guerre, les benedictions, les effets a l'impact des objets,
// les afflictions et les phases de boss. Un biome qu'il declare jouable l'est
// donc surement ; un biome qu'il declare mur merite d'etre regarde.

import { mountDomStub } from "./headless-stub.mjs";

mountDomStub();

// game.js est le point d'entree reel : l'importer en premier reproduit l'ordre
// d'evaluation du navigateur et evite les zones mortes des cycles d'import.
await import("../game.js");

const { gameState, getEffectiveStats, getHealth, getMagicDamage } = await import("../state.js");
const { BIOMES, LOOT_TABLES } = await import("../biome.js");
const { ITEMS } = await import("../item.js");
const { MONSTERS } = await import("../monster.js");
const { getUpgradeCost } = await import("../actions.js");
const { syncCritStats, getCritPointsTotal, CRIT_MAX_RANK, CRIT_PER_RANK, CRIT_BASE } =
  await import("../crit.js");
const { getBiomeTrait } = await import("../biome-traits.js");

/* ------------------------------------------------------------------ */
/* Ordre de progression                                               */
/* ------------------------------------------------------------------ */

/** Parcours en largeur depuis le premier biome : l'ordre ou un joueur les
 *  rencontre reellement, y compris les embranchements. */
const progressionOrder = () => {
  const seen = new Set(["limgrave_west"]);
  const order = ["limgrave_west"];
  const queue = ["limgrave_west"];
  while (queue.length) {
    const current = queue.shift();
    for (const next of BIOMES[current]?.unlocks || []) {
      if (!BIOMES[next] || seen.has(next)) continue;
      seen.add(next);
      order.push(next);
      queue.push(next);
    }
  }
  return order;
};

/* ------------------------------------------------------------------ */
/* Builds testes                                                      */
/* ------------------------------------------------------------------ */

/**
 * Comparaison a investissement EGAL : 70% offensif et 30% en vigueur pour
 * tous, sauf le build vigueur qui inverse. Sans cette normalisation on compare
 * des repartitions differentes, et on attribue a une statistique un avantage
 * qui venait en realite d'une part defensive plus faible. C'est exactement
 * l'erreur qui masquait l'ampleur du desequilibre de la dexterite.
 *
 * Chaque build est une politique de depense : comment repartir un niveau
 * gagne. On teste les voies que le jeu pretend offrir — si l'une d'elles
 * s'effondre, c'est une promesse non tenue.
 */
const BUILDS = {
  force: { label: "Force pure", weights: { strength: 0.7, vigor: 0.3 } },
  dex: { label: "Dexterite", weights: { dexterity: 0.7, vigor: 0.3 } },
  int: { label: "Intelligence", weights: { intelligence: 0.7, vigor: 0.3 } },
  hybride: {
    label: "Trihybride",
    weights: { strength: 0.24, dexterity: 0.23, intelligence: 0.23, vigor: 0.3 },
  },
  tank: { label: "Vigueur", weights: { strength: 0.3, vigor: 0.7 } },
};

/* ------------------------------------------------------------------ */
/* Combat, calque sur combat.js                                       */
/* ------------------------------------------------------------------ */

const clamp1 = (n) => (n < 1 ? 1 : n);

/**
 * Taille de groupe moyenne d'un monstre, d'apres ses groupCombinations.
 * Sert a peser les degats de zone, qui ne touchent que les cibles autres que
 * la principale.
 */
const avgGroupSize = (monster) => {
  const combos = monster?.groupCombinations;
  if (!combos?.length) return 1;
  const total = combos.reduce((s, c) => s + (c.chance || 0), 0) || 1;
  return combos.reduce((s, c) => s + (c.size || 1) * ((c.chance || 0) / total), 0);
};

/**
 * Degats moyens infliges par tour a une cible d'armure donnee.
 *
 * `groupSize` fait entrer les degats de zone dans le calcul. Sans eux le
 * modele sous-estimait l'intelligence, qui dispose de huit objets convertissant
 * l'intelligence en degats de zone — le plus gros paquet de conversions du jeu.
 * Comme le splash s'applique par attaque dans combat.js, il remultiplie aussi
 * la dexterite : c'est un canal de couplage a part entiere.
 */
const playerDamagePerTurn = (eff, targetArmor, groupSize = 1) => {
  // Meme plancher que combat.js : la penetration ne peut pas descendre
  // l'armure sous 25% de sa valeur d'origine.
  const armor = clamp1(
    Math.max(
      targetArmor * (1 - (eff.percentDamagePenetration || 0)) -
        (eff.flatDamagePenetration || 0),
      targetArmor * 0.25,
    ),
  );
  // Esperance du multiplicateur critique, super critique inclus.
  const chance = Math.max(0, eff.critChance || 0);
  const hit = Math.min(1, chance);
  const sup = Math.min(1, Math.max(0, chance - 1));
  const dmg = eff.critDamage || 1.5;
  const critMean = 1 - hit + (hit - sup) * dmg + sup * dmg * 2;

  const physical = Math.floor(eff.strength * critMean * (100 / armor));
  // Les degats magiques ne se lancent qu'une fois par tour, pas par attaque.
  const magic = Math.floor(getMagicDamage(eff.intelligence) * critMean);
  const attacks = (eff.attacksPerTurn || 1) + (eff.extraAttackChance || 0);
  // Le splash ignore l'armure et frappe les membres du groupe autres que la
  // cible principale. Ramene par monstre pour rester comparable a un ttk.
  const splash = Math.max(0, groupSize - 1) * Math.floor((eff.splashDamage || 0) * critMean);
  return attacks * (physical + splash) + magic;
};

/** Degats moyens recus par tour de la part d'un monstre. */
const enemyDamagePerTurn = (eff, monster, armorMult = 1) => {
  const armor = clamp1((eff.armor ?? 100) * armorMult);
  let perHit = Math.floor(monster.atk * (100 / armor));
  // Mitigation des boss, comme combat.js : plafonnee a 45%.
  if (monster.isBoss) {
    perHit = Math.floor(perHit * (1 - Math.min(0.45, eff.bossMitigation || 0)));
  }
  const attacks = monster.specificStats?.attacksPerTurn || 1;
  const dodge = Math.min(0.5, (gameState.stats.dexterity || 0) / 400);
  return perHit * attacks * (1 - dodge);
};

/* ------------------------------------------------------------------ */
/* Progression                                                        */
/* ------------------------------------------------------------------ */

const applyBuild = (build, level) => {
  const s = gameState.stats;
  s.vigor = s.strength = s.dexterity = s.intelligence = 0;
  for (const [stat, share] of Object.entries(build.weights)) {
    s[stat] = Math.floor(level * share);
  }
  s.level = level;
  // Les points critiques suivent le niveau : on les depense a l'equilibre,
  // qui est la repartition optimale mesuree.
  const pts = getCritPointsTotal();
  const chance = Math.min(CRIT_MAX_RANK.chance, Math.floor(pts * 0.6));
  const damage = Math.min(CRIT_MAX_RANK.damage, pts - chance);
  s.critRanks = { chance, damage };
  syncCritStats();
};

/** Cout cumule pour atteindre un niveau depuis 0. */
const cumulativeCost = (() => {
  const cache = [0];
  return (level) => {
    while (cache.length <= level) {
      const l = cache.length - 1;
      const x = Math.max((l - 11) * 0.02, 0);
      cache.push(cache[l] + Math.floor((x + 0.1) * Math.pow(l + 81, 2) + 1));
    }
    return cache[level];
  };
})();

const MAX_LEVEL = 220;

/*
 * Plafond de progression : le niveau se merite en abattant les boss de la
 * trame. Sans lui, le simulateur farme jusqu'a 220 des la premiere zone —
 * exactement ce que le plafond existe pour empecher, et exactement ce qui
 * rendait ses verdicts optimistes sur le debut de partie.
 *
 * On relit les constantes du jeu plutot que de les recopier : une valeur
 * dupliquee finit toujours par diverger.
 */
const { MAIN_BOSS_BIOMES, LEVEL_CAP_BASE, LEVEL_PER_MAIN_BOSS } =
  await import("../rebirth.js");
const capPour = (clears) => {
  const vaincus = new Set(clears);
  const n = MAIN_BOSS_BIOMES.filter((id) => vaincus.has(id)).length;
  return Math.min(MAX_LEVEL, LEVEL_CAP_BASE + LEVEL_PER_MAIN_BOSS * n);
};

/* ------------------------------------------------------------------ */
/* Rapport                                                            */
/* ------------------------------------------------------------------ */

const fmt = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(Math.round(n));

/* ------------------------------------------------------------------ */
/* Equipement                                                         */
/* ------------------------------------------------------------------ */

/** Objets qu'un joueur a pu ramasser dans les biomes deja nettoyes. */
const lootPoolFor = (cleared) => {
  const pool = new Set();
  for (const id of cleared) {
    for (const entry of LOOT_TABLES[id] || []) if (entry.id) pool.add(entry.id);
    for (const key of ["monsters", "rareMonsters"]) {
      for (const m of BIOMES[id][key] || []) {
        for (const d of MONSTERS[m]?.drops || []) if (d.id) pool.add(d.id);
      }
    }
  }
  return [...pool].filter((id) => ITEMS[id]);
};

/**
 * Choisit les trois pieces par essais successifs, en notant chaque candidat
 * sur les degats par tour REELS calcules par getEffectiveStats.
 *
 * Plus lent qu'une heuristique, mais c'est le seul moyen de capturer les
 * bonus de panoplie et les conversions entre statistiques : aucune formule
 * approchee ne les aurait vus. Deux passes, pour laisser un set se declarer
 * une fois sa premiere piece portee.
 */
/*
 * L'equipement est choisi pour le biome ENTIER, pas pour un seul type de
 * rencontre.
 *
 * L'ancienne version scorait contre l'armure du boss mais AVEC le
 * multiplicateur de groupe, alors que ttkBoss l'ignore a juste titre : un boss
 * est seul, les degats de zone n'ont personne d'autre a frapper. L'optimiseur
 * surevaluait donc le splash et equipait des pieces de nettoyage de groupe
 * juste avant le combat qui bloque la progression. Rendre son scaling a la
 * Robe du Sage de Caelid a suffi a declencher ce piege et a faire passer le
 * build intelligence de 891 a 942 cycles — une regression du modele, pas du
 * jeu.
 *
 * Le score combine desormais les deux rencontres par moyenne geometrique :
 * une piece doit servir aux groupes ET au boss.
 */
const equipBest = (pool, refArmor, groupe = 1.3, bossArmor = refArmor) => {
  const slots = { weapon: "Arme", armor: "Armure", accessory: "Accessoire" };
  gameState.equipped = { weapon: null, armor: null, accessory: null };
  gameState.inventory = pool.map((id) => ({ id, name: id, level: 8, count: 0 }));

  for (let pass = 0; pass < 2; pass++) {
    for (const [slot, typeLabel] of Object.entries(slots)) {
      let best = gameState.equipped[slot];
      let bestScore = -1;
      for (const id of [null, ...pool]) {
        if (id && ITEMS[id].type !== typeLabel) continue;
        gameState.equipped[slot] = id;
        let eff;
        try { eff = getEffectiveStats(); } catch { continue; }
        const contreGroupes = playerDamagePerTurn(eff, refArmor, groupe);
        const contreBoss = playerDamagePerTurn(eff, bossArmor);
        const score =
          Math.sqrt(Math.max(0, contreGroupes) * Math.max(0, contreBoss)) *
          Math.sqrt(Math.max(1, getHealth(eff.vigor)));
        if (score > bestScore) { bestScore = score; best = id; }
      }
      gameState.equipped[slot] = best;
    }
  }
  return { ...gameState.equipped };
};

/*
 * Un joueur ne se presente pas devant un boss au niveau ou il arrive : il
 * refait le biome jusqu'a pouvoir le battre. C'est ce que compte la colonne
 * "cycles". Un biome qui en demande trente est un mur, meme s'il finit par
 * tomber.
 */
const MARGE_JOUABLE = 2.0;
const CYCLES_MAX = 60;

const run = (buildKey) => {
  const build = BUILDS[buildKey];
  const order = progressionOrder().filter((id) => !BIOMES[id].isTrial);

  let runes = 0;
  let level = 0;
  const cleared = [];
  const rows = [];

  for (const id of order) {
    const biome = BIOMES[id];
    const std = (biome.monsters || []).map((m) => MONSTERS[m]).filter(Boolean);
    const boss = MONSTERS[biome.boss];
    if (!std.length || !boss) continue;

    const traits = (biome.traits || []).map(getBiomeTrait).filter(Boolean);
    const armorMult = traits.reduce((m, t) => m * (t.runBuff?.armorMult ?? 1), 1);
    const runeMult = traits.reduce((m, t) => m + (t.runBuff?.runeGainMult ?? 0), 0);
    const sealed = traits.some((t) => t.runBuff?.noHeal);

    const avg = (f) => std.reduce((sum, m) => sum + f(m), 0) / std.length;
    const stdArmor = avg((m) => m.armor || 100);
    const stdHp = avg((m) => m.hp);
    const stdRunes = avg((m) => m.runes);
    const groupe = avg(avgGroupSize);

    const pool = lootPoolFor(cleared);
    const niveauEntree = level;
    let cycles = 0;
    let margeBoss = 0;
    let margeStd = 0;
    let eff = null;
    let maxHp = 0;
    let ttkStd = 0;
    let ttkBoss = 0;

    // On farme jusqu'a pouvoir battre le boss, ou jusqu'a declarer le mur.
    while (cycles < CYCLES_MAX) {
      const plafond = capPour(cleared);
      while (level < plafond && cumulativeCost(level + 1) <= runes) level += 1;
      applyBuild(build, level);
      if (pool.length) equipBest(pool, stdArmor, groupe, boss.armor || 100);
      eff = getEffectiveStats();
      maxHp = getHealth(eff.vigor);

      ttkStd = stdHp / Math.max(1, playerDamagePerTurn(eff, stdArmor, groupe));
      ttkBoss = boss.hp / Math.max(1, playerDamagePerTurn(eff, boss.armor || 100));
      margeStd = maxHp / Math.max(1, avg((m) => enemyDamagePerTurn(eff, m, armorMult))) / ttkStd;
      margeBoss = maxHp / Math.max(1, enemyDamagePerTurn(eff, boss, armorMult)) / ttkBoss;

      if (margeBoss >= MARGE_JOUABLE && margeStd >= 1) break;
      // Plafond atteint : farmer davantage ne rapporte plus un seul niveau.
      if (level >= plafond && cycles > 3) break;

      // Un cycle de farm : les paliers standard, sans le boss.
      runes += Math.floor((biome.length - 1) * stdRunes * (1 + (eff.runeGainMult || 0) + runeMult));
      cycles += 1;
    }

    // Victoire sur le boss.
    runes += Math.floor(boss.runes * (1 + (eff.runeGainMult || 0) + runeMult));
    cleared.push(id);

    rows.push({
      nom: biome.name,
      niveauEntree,
      level,
      maxHp,
      cycles,
      ttkStd,
      ttkBoss,
      margeStd,
      margeBoss,
      sealed,
      equipe: Object.values(gameState.equipped).filter(Boolean).length,
    });
  }

  return { build, rows };
};

const verdict = (m) => {
  if (!isFinite(m)) return "IMPOSSIBLE";
  if (m < 1) return "MUR";
  if (m < 2) return "tres dur";
  if (m < 4) return "tendu";
  if (m < 15) return "ok";
  if (m < 40) return "facile";
  return "TRIVIAL";
};

const NL = String.fromCharCode(10);
const args = process.argv.slice(2);
const only = args.find((x) => x.startsWith("--build="))?.split("=")[1];
const keys = only ? [only] : Object.keys(BUILDS);

for (const key of keys) {
  const { build, rows } = run(key);
  console.log(NL + "=".repeat(100));
  console.log(build.label.toUpperCase());
  console.log("=".repeat(100));
  console.log(
    "biome".padEnd(30) +
      "niv".padStart(5) +
      "PV".padStart(8) +
      "cycles".padStart(8) +
      "t/std".padStart(8) +
      "t/boss".padStart(9) +
      "marge".padStart(8) +
      "  verdict",
  );
  for (const r of rows) {
    const m = Math.min(r.margeStd, r.margeBoss);
    console.log(
      r.nom.slice(0, 29).padEnd(30) +
        String(r.level).padStart(5) +
        fmt(r.maxHp).padStart(8) +
        String(r.cycles).padStart(8) +
        r.ttkStd.toFixed(1).padStart(8) +
        r.ttkBoss.toFixed(1).padStart(9) +
        m.toFixed(1).padStart(8) +
        "  " + verdict(m) +
        (r.sealed ? " [sans soin]" : ""),
    );
  }
  const murs = rows.filter((r) => Math.min(r.margeStd, r.margeBoss) < 1);
  const grind = rows.filter((r) => r.cycles >= 10);
  const triviaux = rows.filter((r) => Math.min(r.margeStd, r.margeBoss) >= 40);
  const total = rows.reduce((n, r) => n + r.cycles, 0);
  console.log(`${NL}  cycles de farm cumules : ${total}  (moyenne ${(total / rows.length).toFixed(1)} par biome)`);
  console.log(`  murs        : ${murs.length}${murs.length ? " -> " + murs.map((x) => x.nom).join(", ") : ""}`);
  console.log(`  grind >= 10 : ${grind.length}${grind.length ? " -> " + grind.map((x) => x.nom + "(" + x.cycles + ")").join(", ") : ""}`);
  console.log(`  triviaux    : ${triviaux.length}`);
  console.log(`  niveau final : ${rows[rows.length - 1]?.level} / ${MAX_LEVEL}`);
}
