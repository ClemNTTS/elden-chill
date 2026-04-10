import { BIOMES } from "./biome.js";
import { ITEMS } from "./item.js";
import { gameState, getEffectiveStats, runtimeState } from "./state.js";
import { BIOME_GUIDE } from "./world-map.js";

export const ITEM_RARITIES = {
  COMMON: "commun",
  RARE: "rare",
  LEGENDARY: "legendaire",
  RELIC: "relique",
};

export const HAZARD_LABELS = {
  poison: "Poison",
  gel: "Gel",
  folie: "Folie",
  putrefaction: "Putréfaction",
};

const registerRunBuff = (buff) => {
  if (!gameState.preparation.activeRunBuffs) {
    gameState.preparation.activeRunBuffs = [];
  }

  const existing = gameState.preparation.activeRunBuffs.find(
    (entry) => entry.id === buff.id,
  );

  if (existing) {
    Object.assign(existing, buff);
    return existing;
  }

  gameState.preparation.activeRunBuffs.push(buff);
  return buff;
};

const buildJournalEntry = (kind, title, text, biomeId = gameState.world.currentBiome) => ({
  id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  runId: runtimeState.currentCombatSession,
  biomeId,
  kind,
  title,
  text,
  timestamp: Date.now(),
});

export const addJournalEntry = (kind, title, text, biomeId = gameState.world.currentBiome) => {
  if (!gameState.journal) {
    gameState.journal = { filter: "all", biomeFilter: "all", entries: [] };
  }

  const entry = buildJournalEntry(kind, title, text, biomeId);
  gameState.journal.entries.unshift(entry);
  gameState.journal.entries = gameState.journal.entries.slice(0, 120);
  return entry;
};

export const clearRunJournal = () => {
  if (!gameState.journal) return;
  gameState.journal.entries = gameState.journal.entries.filter(
    (entry) => entry.runId !== runtimeState.currentCombatSession,
  );
};

export const markCodexMonsterSeen = (monsterId, biomeId = gameState.world.currentBiome) => {
  if (!monsterId) return;
  if (!gameState.codex) return;
  gameState.codex.monstersSeen[monsterId] = {
    biomeId,
    seenAt: Date.now(),
  };
};

export const markCodexBossSeen = (monsterId, biomeId = gameState.world.currentBiome) => {
  if (!monsterId) return;
  if (!gameState.codex) return;
  gameState.codex.bossesSeen[monsterId] = {
    biomeId,
    seenAt: Date.now(),
  };
};

export const markCodexSetSeen = (setId) => {
  if (!setId || !gameState.codex) return;
  gameState.codex.setsSeen[setId] = {
    seenAt: Date.now(),
  };
};

export const markCodexBiomeCleared = (biomeId) => {
  if (!biomeId || !gameState.codex) return;
  gameState.codex.biomesCleared[biomeId] = {
    clearedAt: Date.now(),
  };
};

export const markCodexEventSeen = (eventId, biomeId = gameState.world.currentBiome) => {
  if (!eventId || !gameState.codex) return;
  gameState.codex.eventsSeen[eventId] = {
    biomeId,
    seenAt: Date.now(),
  };
};

export const BLESSINGS = {
  grace_of_mire: {
    id: "grace_of_mire",
    name: "Bénédiction des Marais",
    description: "Réduit le poison et la putréfaction du biome. Idéal pour les terres corrompues.",
    detailedDescription:
      "+3 Résistance Poison, +4 Résistance Putréfaction, +20 Armure effective pendant l'expédition.",
    applyToStats: (stats) => {
      stats.resistances.poison += 3;
      stats.resistances.putrefaction += 4;
      stats.armor += 20;
    },
  },
  grace_of_frost: {
    id: "grace_of_frost",
    name: "Bénédiction du Givre",
    description: "Stabilise le souffle et limite les proc de gel.",
    detailedDescription:
      "+5 Résistance Gel et +4 Vigueur effective pendant l'expédition.",
    applyToStats: (stats) => {
      stats.resistances.gel += 5;
      stats.vigor += 4;
    },
  },
  grace_of_runes: {
    id: "grace_of_runes",
    name: "Bénédiction des Runes",
    description: "Transforme chaque expédition en récolte plus rentable.",
    detailedDescription:
      "+18% gain de runes et +3 Intelligence effective pendant l'expédition.",
    applyToStats: (stats) => {
      stats.runeGainMult += 0.18;
      stats.intelligence += 3;
    },
  },
  grace_of_focus: {
    id: "grace_of_focus",
    name: "Bénédiction de l'Esprit noir",
    description: "Renforce la tenue mentale face à la folie et à la pression.",
    detailedDescription:
      "+5 Résistance Folie et +4% Chance de critique effective pendant l'expédition.",
    applyToStats: (stats) => {
      stats.resistances.folie += 5;
      stats.critChance += 0.04;
    },
  },
};

export const PREP_CONSUMABLES = {
  rare_tracker: {
    id: "rare_tracker",
    name: "Fiole du pisteur",
    description: "Les rencontres rares deviennent plus probables dans le prochain biome.",
    detailedDescription:
      "Multiplie par 1.8 les chances de rencontrer une élite rare pendant la prochaine expédition.",
    onRunStart: () =>
      registerRunBuff({
        id: "rare_tracker",
        label: "Traque rare",
        kind: "utility",
        rareChanceMult: 1.8,
      }),
  },
  boss_ward: {
    id: "boss_ward",
    name: "Résine de sentinelle",
    description: "Diminue les pics de dégâts des boss pendant l'expédition.",
    detailedDescription:
      "Réduit de 12% les dégâts reçus des boss pendant la prochaine expédition.",
    onRunStart: () =>
      registerRunBuff({
        id: "boss_ward",
        label: "Ward du boss",
        kind: "defense",
        bossMitigation: 0.12,
      }),
  },
  relic_lens: {
    id: "relic_lens",
    name: "Lentille de relique",
    description: "Augmente les chances de butin rare, légendaire et relique.",
    detailedDescription:
      "Ajoute +30% de pondération aux raretés supérieures dans les tirages de butin de la prochaine expédition.",
    onRunStart: () =>
      registerRunBuff({
        id: "relic_lens",
        label: "Lecture de relique",
        kind: "loot",
        lootRarityBoost: 0.3,
      }),
  },
};

export const PREPARATION_UNLOCKS = {
  limgrave_lake: { blessingId: "grace_of_frost" },
  caelid_south: { blessingId: "grace_of_mire" },
  nokron: { consumableId: "boss_ward" },
  altus_plateau: { consumableId: "relic_lens" },
  deeproot_depths: { blessingId: "grace_of_focus" },
};

const unlockPreparationEntry = (collectionKey, entryId) => {
  if (!entryId) return false;
  const collection = gameState.preparation?.[collectionKey];
  if (!collection) return false;
  if (collection.includes(entryId)) return false;
  collection.push(entryId);
  return true;
};

export const unlockBlessing = (blessingId, sourceBiomeId = gameState.world.currentBiome) => {
  const didUnlock = unlockPreparationEntry("unlockedBlessings", blessingId);
  if (!didUnlock) return false;
  addJournalEntry(
    "unlock",
    "Nouvelle bénédiction",
    `${BLESSINGS[blessingId].name} est désormais disponible dans la préparation.`,
    sourceBiomeId,
  );
  return true;
};

export const unlockConsumable = (
  consumableId,
  sourceBiomeId = gameState.world.currentBiome,
) => {
  const didUnlock = unlockPreparationEntry("unlockedConsumables", consumableId);
  if (!didUnlock) return false;
  addJournalEntry(
    "unlock",
    "Nouvel atout",
    `${PREP_CONSUMABLES[consumableId].name} rejoint votre préparation d'expédition.`,
    sourceBiomeId,
  );
  return true;
};

const getLockedPreparationIds = (type) => {
  const defs = type === "blessing" ? BLESSINGS : PREP_CONSUMABLES;
  const key =
    type === "blessing" ? "unlockedBlessings" : "unlockedConsumables";
  const unlocked = new Set(gameState.preparation?.[key] || []);
  return Object.keys(defs).filter((id) => !unlocked.has(id));
};

export const EVENT_DEFS = {
  caravane_perdue: {
    id: "caravane_perdue",
    title: "Caravane perdue",
    kind: "caravane",
    weight: 4,
    resolve: (biomeId) => {
      const runeGain = Math.max(60, Math.floor(gameState.stats.level * 38 + 120));
      const lockedConsumables = getLockedPreparationIds("consumable");
      gameState.runes.carried += runeGain;
      registerRunBuff({
        id: "caravan_supplies",
        label: "Réserves retrouvées",
        kind: "loot",
        lootRarityBoost: 0.2,
      });
      const text = `Vous fouillez une caravane abandonnée et sécurisez ${runeGain} runes ainsi que des réserves pour la suite.`;
      addJournalEntry("event", "Caravane perdue", text, biomeId);
      let unlockText = "";
      if (lockedConsumables.length) {
        const rewardId =
          lockedConsumables[Math.floor(Math.random() * lockedConsumables.length)];
        if (unlockConsumable(rewardId, biomeId)) {
          unlockText = ` Vous mettez aussi la main sur ${PREP_CONSUMABLES[rewardId].name}.`;
        }
      }
      return {
        log: `Une caravane perdue vous offre ${runeGain} runes et des provisions précieuses.${unlockText}`,
      };
    },
  },
  patrouille_rare: {
    id: "patrouille_rare",
    title: "Patrouille rare",
    kind: "ambush",
    weight: 3,
    resolve: (biomeId) => {
      addJournalEntry(
        "event",
        "Patrouille rare",
        "Une force d'élite verrouille le passage. Le prochain combat sera renforcé.",
        biomeId,
      );
      return {
        forceRare: true,
        log: "Une patrouille rare bloque la route. Préparez-vous à une rencontre d'élite.",
      };
    },
  },
  autel: {
    id: "autel",
    title: "Autel oublié",
    kind: "altar",
    weight: 3,
    resolve: (biomeId) => {
      const lockedBlessings = getLockedPreparationIds("blessing");
      gameState.playerEffects = [];
      registerRunBuff({
        id: `altar_${biomeId}`,
        label: "Grâce d'autel",
        kind: "blessing",
        armorBonus: 28,
        runeGainMult: 0.08,
      });
      addJournalEntry(
        "event",
        "Autel oublié",
        "Un autel de fortune dissipe vos maux et laisse une grâce protectrice active pour cette sortie.",
        biomeId,
      );
      let unlockText = "";
      if (lockedBlessings.length) {
        const rewardId =
          lockedBlessings[Math.floor(Math.random() * lockedBlessings.length)];
        if (unlockBlessing(rewardId, biomeId)) {
          unlockText = ` ${BLESSINGS[rewardId].name} rejoint désormais votre préparation.`;
        }
      }
      return {
        log: `Un autel oublié dissipe vos maux et bénit votre route.${unlockText}`,
      };
    },
  },
  piege: {
    id: "piege",
    title: "Piège de terrain",
    kind: "trap",
    weight: 4,
    resolve: (biomeId) => {
      const hazards = getBiomeHazards(biomeId);
      const dominant = hazards[0] || "poison";
      const damage = Math.max(12, Math.floor(getEffectiveStats().vigor * 0.6) + 18);
      runtimeState.playerCurrentHp = Math.max(1, runtimeState.playerCurrentHp - damage);
      addJournalEntry(
        "event",
        "Piège de terrain",
        `Le terrain se referme sur vous et propage ${HAZARD_LABELS[dominant] || dominant}.`,
        biomeId,
      );
      return {
        applyHazard: dominant,
        hazardValue: dominant === "gel" ? 5 : 2,
        log: `Un piège du biome vous entaille et diffuse ${HAZARD_LABELS[dominant] || dominant}. (-${damage} PV)`,
      };
    },
  },
  choix_route: {
    id: "choix_route",
    title: "Choix de route",
    kind: "route",
    weight: 5,
    resolve: (biomeId) => {
      const routeModes = [
        {
          id: "greed_route",
          label: "Route d'avidité",
          log: "Vous choisissez une route plus risquée, mais plus riche.",
          lootRarityBoost: 0.2,
          rareChanceMult: 1.35,
          extraHazardPressure: 1,
        },
        {
          id: "safe_route",
          label: "Route de prudence",
          log: "Vous ralentissez le rythme et contournez les pires menaces.",
          armorBonus: 20,
          resistBonus: 2,
        },
      ];
      const picked = routeModes[Math.floor(Math.random() * routeModes.length)];
      registerRunBuff({
        id: picked.id,
        label: picked.label,
        kind: "route",
        lootRarityBoost: picked.lootRarityBoost || 0,
        rareChanceMult: picked.rareChanceMult || 1,
        armorBonus: picked.armorBonus || 0,
        resistBonus: picked.resistBonus || 0,
        extraHazardPressure: picked.extraHazardPressure || 0,
      });
      addJournalEntry(
        "route",
        "Choix de route",
        `${picked.label} : ${picked.log}`,
        biomeId,
      );
      return {
        log: picked.log,
      };
    },
  },
};

export const BIOME_EVENTS = {
  limgrave_west: ["caravane_perdue", "choix_route"],
  limgrave_east: ["patrouille_rare", "choix_route"],
  stormhill: ["patrouille_rare", "autel"],
  caelid_swamp: ["piege", "autel", "choix_route"],
  nokron: ["autel", "patrouille_rare"],
  ainsel_river: ["choix_route", "caravane_perdue"],
  deeproot_depths: ["autel", "piege"],
  rotlake: ["piege", "caravane_perdue"],
  altus_plateau: ["caravane_perdue", "patrouille_rare", "choix_route"],
  mount_gelmir: ["piege", "patrouille_rare", "autel"],
  mountaintops: ["choix_route", "piege", "autel"],
  crumbling_farum_azula: ["patrouille_rare", "autel", "choix_route"],
};

export const getBiomeHazards = (biomeId) =>
  BIOME_GUIDE[biomeId]?.hazards?.slice() || [];

export const getHazardForStatus = (effectId) => {
  const map = {
    POISON: "poison",
    FROSTBITE: "gel",
    STUN: "folie",
    SCARLET_ROT: "putrefaction",
  };
  return map[effectId] || null;
};

export const getResistanceForEffect = (effectId) => {
  const hazardKey = getHazardForStatus(effectId);
  const stats = getEffectiveStats();
  return hazardKey ? stats.resistances?.[hazardKey] || 0 : 0;
};

export const adjustStatusApplication = (effectId, baseValue, targetEffects) => {
  const isPlayer = targetEffects === gameState.playerEffects;
  if (!isPlayer) return baseValue;

  const resistance = getResistanceForEffect(effectId);
  if (!resistance) return baseValue;

  if (effectId === "BLEED" || effectId === "FROSTBITE") {
    return Math.max(1, baseValue - Math.floor(resistance / 2));
  }

  return Math.max(1, baseValue - resistance);
};

export const getRunModifier = (key, defaultValue = 0) => {
  const buffs = gameState.preparation?.activeRunBuffs || [];
  if (defaultValue === 1) {
    return buffs.reduce(
      (value, buff) => value * (buff[key] || 1),
      1,
    );
  }

  return buffs.reduce((value, buff) => value + (buff[key] || 0), defaultValue);
};

export const clearRunBuffs = () => {
  if (!gameState.preparation) return;
  gameState.preparation.activeRunBuffs = [];
};

export const grantPreparationRewardForBiome = (biomeId) => {
  const reward = PREPARATION_UNLOCKS[biomeId];
  if (!reward) return [];

  const unlocked = [];
  if (reward.blessingId && unlockBlessing(reward.blessingId, biomeId)) {
    unlocked.push(BLESSINGS[reward.blessingId].name);
  }
  if (reward.consumableId && unlockConsumable(reward.consumableId, biomeId)) {
    unlocked.push(PREP_CONSUMABLES[reward.consumableId].name);
  }
  return unlocked;
};

export const applyPreparationLoadout = () => {
  clearRunBuffs();

  const blessing = BLESSINGS[gameState.preparation?.selectedBlessingId];
  const consumable = PREP_CONSUMABLES[gameState.preparation?.selectedConsumableId];

  if (blessing) {
    registerRunBuff({
      id: blessing.id,
      label: blessing.name,
      kind: "blessing",
    });
    addJournalEntry(
      "preparation",
      "Bénédiction active",
      `${blessing.name} accompagne cette expédition.`,
      gameState.world.currentBiome,
    );
  }

  if (consumable) {
    consumable.onRunStart?.();
    addJournalEntry(
      "preparation",
      "Préparation",
      `${consumable.name} est consommé avant le départ.`,
      gameState.world.currentBiome,
    );
  }
};

export const applyPreparationStats = (stats) => {
  const blessing = BLESSINGS[gameState.preparation?.selectedBlessingId];
  blessing?.applyToStats?.(stats);

  (gameState.preparation?.activeRunBuffs || []).forEach((buff) => {
    stats.armor += buff.armorBonus || 0;
    stats.runeGainMult += buff.runeGainMult || 0;
    if (buff.resistBonus) {
      stats.resistances.poison += buff.resistBonus;
      stats.resistances.gel += buff.resistBonus;
      stats.resistances.folie += buff.resistBonus;
      stats.resistances.putrefaction += buff.resistBonus;
    }
  });
};

export const getWeightedBiomeEvent = (biomeId) => {
  const eventIds = BIOME_EVENTS[biomeId] || [];
  const weighted = eventIds
    .map((id) => EVENT_DEFS[id])
    .filter(Boolean);

  if (!weighted.length) return null;

  const total = weighted.reduce((sum, eventDef) => sum + (eventDef.weight || 1), 0);
  let roll = Math.random() * total;

  for (const eventDef of weighted) {
    roll -= eventDef.weight || 1;
    if (roll <= 0) return eventDef;
  }

  return weighted[0];
};

export const resolveBiomeEvent = (eventDef, biomeId) => {
  if (!eventDef) return null;
  markCodexEventSeen(eventDef.id, biomeId);
  return eventDef.resolve?.(biomeId) || null;
};

export const syncCodexFromInventory = () => {
  if (!gameState.codex) return;
  gameState.inventory.forEach((item) => {
    const data = ITEMS[item.id];
    if (data?.set) {
      markCodexSetSeen(data.set);
    }
  });
};

export const describeHazards = (biomeId) => {
  const hazards = getBiomeHazards(biomeId);
  if (!hazards.length) return "Aucune affliction dominante.";
  return hazards.map((hazard) => HAZARD_LABELS[hazard] || hazard).join(" · ");
};

export const getItemRarity = (itemId) =>
  ITEMS[itemId]?.rarity || ITEM_RARITIES.COMMON;

export const getItemRarityWeight = (rarity) => {
  switch (rarity) {
    case ITEM_RARITIES.RELIC:
      return 4;
    case ITEM_RARITIES.LEGENDARY:
      return 3;
    case ITEM_RARITIES.RARE:
      return 2;
    default:
      return 1;
  }
};

export const buildEnemyIntent = (enemy) => {
  if (!enemy) {
    runtimeState.enemyIntent = null;
    return null;
  }

  const attacksPerTurn =
    enemy.specificStats?.attacksPerTurn || enemy.attacksPerTurn || 1;
  const onHitEffect = enemy.onHitEffect?.id;
  const severity =
    enemy.isBoss
      ? "boss"
      : enemy.isRare
        ? "elite"
        : attacksPerTurn >= 3 || (enemy.atk || 0) >= 180
          ? "heavy"
          : "normal";

  let kind = "attaque";
  let label = attacksPerTurn > 1 ? "Rafale ennemie" : "Attaque directe";

  if (enemy.hasSecondPhase && !enemy.isInSecondPhase && enemy.hp / enemy.maxHp <= 0.55) {
    kind = "phase";
    label = "Phase imminente";
  } else if (enemy.companion || enemy.groupCombinations) {
    kind = "renfort";
    label = "Pression de groupe";
  } else if (onHitEffect) {
    kind = "status";
    label = `Proc ${HAZARD_LABELS[getHazardForStatus(onHitEffect)] || STATUS_LABELS[onHitEffect] || onHitEffect}`;
  } else if (attacksPerTurn >= 3) {
    kind = "multiple";
    label = "Attaque multiple";
  } else if ((enemy.atk || 0) >= 180) {
    kind = "heavy";
    label = "Attaque lourde";
  } else if ((enemy.armor || 100) >= 220) {
    kind = "defense";
    label = "Posture blindée";
  }

  runtimeState.enemyIntent = {
    kind,
    label,
    severity,
    hazard: getHazardForStatus(onHitEffect),
    targetHint: enemy.isBoss ? "Boss" : enemy.isRare ? "Elite" : "Escarmouche",
  };

  return runtimeState.enemyIntent;
};

const STATUS_LABELS = {
  STUN: "Étourdi",
  FROSTBITE: "Gelure",
  POISON: "Poison",
  SCARLET_ROT: "Putréfaction",
  BLEED: "Saignement",
};

export const getKnownCodexBiomes = () =>
  Object.keys(gameState.codex?.biomesCleared || {});

export const getCodexBiomeInfo = (biomeId) => ({
  biomeId,
  biome: BIOMES[biomeId],
  guide: BIOME_GUIDE[biomeId],
});
