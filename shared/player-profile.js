export const PLAYER_PROFILE_VERSION = "2.5.0";
export const PLAYER_SCHEMA_VERSION = 1;
export const MAX_LEVEL = 150;
export const MAX_OFFLINE_TIME_BANK = 3600;

export const DEFAULT_PLAYER_PROFILE = {
  runes: {
    banked: 0,
    carried: 0,
  },
  stats: {
    level: 0,
    runesSpent: 0,
    vigor: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    critChance: 0.05,
    critDamage: 1.5,
    splashDamage: 0,
    armor: 100,
    flatDamagePenetration: 0,
    percentDamagePenetration: 0,
  },
  equipped: {
    weapon: "fists",
    armor: null,
    accessory: null,
  },
  inventory: [{ id: "fists", name: "poings", level: 10, count: 0 }],
  world: {
    currentBiome: "limgrave_west",
    unlockedBiomes: ["limgrave_west"],
    progress: 0,
    isExploring: false,
    checkpointReached: false,
    rareSpawnsCount: 0,
    activeBiomeHazards: [],
    lastEventProgress: -1,
  },
  playerEffects: [],
  ennemyEffects: [],
  ashesOfWaruses: {},
  ashesOfWarOwned: [],
  equippedAsh: null,
  ui: {
    currentScreen: "hub",
    theme: "light",
    selectedBiomeId: "limgrave_west",
  },
  preparation: {
    selectedBlessingId: "grace_of_runes",
    selectedConsumableId: "rare_tracker",
    activeRunBuffs: [],
    unlockedBlessings: ["grace_of_runes"],
    unlockedConsumables: ["rare_tracker"],
  },
  journal: {
    filter: "all",
    biomeFilter: "all",
    entries: [],
  },
  codex: {
    monstersSeen: {},
    bossesSeen: {},
    setsSeen: {},
    biomesCleared: {},
    eventsSeen: {},
  },
  save: {
    version: PLAYER_PROFILE_VERSION,
    maxLevel: MAX_LEVEL,
    offlineTimeBank: 0,
    useOfflineTime: false,
    lastSavedAt: 0,
    profileId: null,
    saveSequence: 0,
  },
  order: [],
};

export const CLOUD_PROFILE_KEYS = [
  "runes",
  "stats",
  "equipped",
  "inventory",
  "world",
  "playerEffects",
  "ennemyEffects",
  "ashesOfWaruses",
  "ashesOfWarOwned",
  "equippedAsh",
  "ui",
  "preparation",
  "journal",
  "codex",
  "save",
  "order",
];

export const LOCAL_PREFS_KEY = "eldenChillClientPrefs";
export const LOCAL_IMPORT_CONSUMED_KEY = "eldenChillLegacyImportConsumed";

const clone = (value) => JSON.parse(JSON.stringify(value));

const toObject = (value, fallback = {}) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : fallback;

const toArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);

export const createProfileId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getVersionLine = (version) => {
  if (!version) return "";
  return String(version).split(".").slice(0, 2).join(".");
};

export const isCompatibleSaveVersion = (version) =>
  getVersionLine(version) === getVersionLine(PLAYER_PROFILE_VERSION);

export const ensureSaveIdentity = (data, fallbackProfileId = null) => {
  if (!data.save) data.save = {};
  if (!data.save.profileId) {
    data.save.profileId = fallbackProfileId || createProfileId();
  }
  if (!Number.isFinite(data.save.saveSequence)) {
    data.save.saveSequence = 0;
  }
  return data;
};

export const normalizePlayerProfile = (source = {}, options = {}) => {
  const base = clone(DEFAULT_PLAYER_PROFILE);
  const data = toObject(source);

  base.runes = { ...base.runes, ...toObject(data.runes) };
  base.stats = { ...base.stats, ...toObject(data.stats) };
  base.equipped = { ...base.equipped, ...toObject(data.equipped) };
  base.inventory = toArray(data.inventory, base.inventory);
  base.world = { ...base.world, ...toObject(data.world) };
  base.playerEffects = toArray(data.playerEffects, []);
  base.ennemyEffects = toArray(data.ennemyEffects, []);
  base.ashesOfWaruses = {
    ...base.ashesOfWaruses,
    ...toObject(data.ashesOfWaruses),
  };
  base.ashesOfWarOwned = toArray(data.ashesOfWarOwned, []);
  base.equippedAsh = data.equippedAsh ?? null;
  base.ui = { ...base.ui, ...toObject(data.ui) };
  base.preparation = { ...base.preparation, ...toObject(data.preparation) };
  base.preparation.activeRunBuffs = toArray(
    base.preparation.activeRunBuffs,
    [],
  );
  base.preparation.unlockedBlessings = toArray(
    base.preparation.unlockedBlessings,
    clone(DEFAULT_PLAYER_PROFILE.preparation.unlockedBlessings),
  );
  base.preparation.unlockedConsumables = toArray(
    base.preparation.unlockedConsumables,
    clone(DEFAULT_PLAYER_PROFILE.preparation.unlockedConsumables),
  );
  base.journal = { ...base.journal, ...toObject(data.journal) };
  base.journal.entries = toArray(base.journal.entries, []);
  base.codex = { ...base.codex, ...toObject(data.codex) };
  base.save = { ...base.save, ...toObject(data.save) };
  base.order = toArray(data.order, []);

  base.world.unlockedBiomes = toArray(
    base.world.unlockedBiomes,
    clone(DEFAULT_PLAYER_PROFILE.world.unlockedBiomes),
  );
  if (!base.world.unlockedBiomes.length) {
    base.world.unlockedBiomes = clone(DEFAULT_PLAYER_PROFILE.world.unlockedBiomes);
  }

  base.runes.banked = Math.max(0, Math.floor(Number(base.runes.banked) || 0));
  base.runes.carried = Math.max(0, Math.floor(Number(base.runes.carried) || 0));
  base.stats.level = Math.max(0, Math.floor(Number(base.stats.level) || 0));
  base.stats.runesSpent = Math.max(
    0,
    Math.floor(Number(base.stats.runesSpent) || 0),
  );
  base.save.maxLevel = MAX_LEVEL;
  base.save.version = PLAYER_PROFILE_VERSION;
  base.save.offlineTimeBank = Math.max(
    0,
    Math.min(MAX_OFFLINE_TIME_BANK, Math.floor(Number(base.save.offlineTimeBank) || 0)),
  );
  base.save.useOfflineTime = !!base.save.useOfflineTime;
  base.save.lastSavedAt = Math.max(0, Number(base.save.lastSavedAt) || 0);

  ensureSaveIdentity(base, options.fallbackProfileId || null);

  return base;
};

export const sanitizeCloudPayload = (source = {}) => {
  const normalized = normalizePlayerProfile(source);
  const payload = {};
  CLOUD_PROFILE_KEYS.forEach((key) => {
    payload[key] = clone(normalized[key]);
  });
  return payload;
};

export const createSaveMeta = (save = {}, extras = {}) => ({
  profileId: save.profileId || createProfileId(),
  saveSequence: Math.max(0, Math.floor(Number(save.saveSequence) || 0)),
  lastSavedAt: Math.max(0, Number(save.lastSavedAt) || 0),
  lastServerSyncAt: Math.max(0, Number(extras.lastServerSyncAt) || 0),
  importedFromLocal: !!extras.importedFromLocal,
  schemaVersion: PLAYER_SCHEMA_VERSION,
});

export const createEmptyProfileRecord = () => {
  const payload = sanitizeCloudPayload(DEFAULT_PLAYER_PROFILE);
  return {
    version: PLAYER_PROFILE_VERSION,
    stats: payload.stats,
    runes: payload.runes,
    inventory: payload.inventory,
    equipped: payload.equipped,
    world: payload.world,
    preparation: payload.preparation,
    journal: payload.journal,
    codex: payload.codex,
    save_meta: createSaveMeta(payload.save),
    extra_state: {
      playerEffects: payload.playerEffects,
      ennemyEffects: payload.ennemyEffects,
      ashesOfWaruses: payload.ashesOfWaruses,
      ashesOfWarOwned: payload.ashesOfWarOwned,
      equippedAsh: payload.equippedAsh,
      ui: payload.ui,
      order: payload.order,
    },
  };
};

export const inflateProfileRecord = (record = {}) =>
  normalizePlayerProfile({
    runes: record.runes,
    stats: record.stats,
    inventory: record.inventory,
    equipped: record.equipped,
    world: record.world,
    preparation: record.preparation,
    journal: record.journal,
    codex: record.codex,
    save: {
      ...(record.save_meta || {}),
      version: record.version || PLAYER_PROFILE_VERSION,
      maxLevel: MAX_LEVEL,
      useOfflineTime: record.save_meta?.useOfflineTime ?? false,
      offlineTimeBank: record.save_meta?.offlineTimeBank ?? 0,
    },
    ...(record.extra_state || {}),
  });

export const buildProfileRecordFromState = (source, currentSaveMeta = {}) => {
  const payload = sanitizeCloudPayload(source);
  return {
    version: PLAYER_PROFILE_VERSION,
    stats: payload.stats,
    runes: payload.runes,
    inventory: payload.inventory,
    equipped: payload.equipped,
    world: payload.world,
    preparation: payload.preparation,
    journal: payload.journal,
    codex: payload.codex,
    save_meta: {
      ...createSaveMeta(payload.save),
      importedFromLocal: !!currentSaveMeta.importedFromLocal,
      lastServerSyncAt: Date.now(),
      offlineTimeBank: payload.save.offlineTimeBank,
      useOfflineTime: !!payload.save.useOfflineTime,
    },
    extra_state: {
      playerEffects: payload.playerEffects,
      ennemyEffects: payload.ennemyEffects,
      ashesOfWaruses: payload.ashesOfWaruses,
      ashesOfWarOwned: payload.ashesOfWarOwned,
      equippedAsh: payload.equippedAsh,
      ui: payload.ui,
      order: payload.order,
    },
  };
};

const upgradeCosts = {
  vigor: 1,
  strength: 1,
  dexterity: 1,
  intelligence: 1,
  critChance: 2,
  critDamage: 2.5,
};

export const getUpgradeCost = (stats, statName) => {
  const baseCost = upgradeCosts[statName] || 10;
  const level = Math.max(0, Math.floor(Number(stats?.level) || 0));
  const x = Math.max((level - 11) * 0.02, 0);
  return Math.floor(baseCost * ((x + 0.1) * Math.pow(level + 81, 2) + 1));
};

export const getMultiUpgradeCost = (stats, statName, count) => {
  const totalCount = Math.max(0, Math.floor(Number(count) || 0));
  let totalCost = 0;

  for (let i = 0; i < totalCount; i += 1) {
    const baseCost = upgradeCosts[statName] || 10;
    const level = Math.max(0, Math.floor(Number(stats?.level) || 0)) + i;
    const x = Math.max((level - 11) * 0.02, 0);
    totalCost += Math.floor(baseCost * ((x + 0.1) * Math.pow(level + 81, 2) + 1));
  }

  return totalCost;
};

export const applyStatUpgrade = (source, statName, count = 1) => {
  const profile = normalizePlayerProfile(source);
  const totalCount = Math.max(1, Math.floor(Number(count) || 1));
  const totalCost = getMultiUpgradeCost(profile.stats, statName, totalCount);

  if (profile.stats.level + totalCount > MAX_LEVEL) {
    throw new Error("LEVEL_CAP_REACHED");
  }

  if (statName === "critChance" && profile.stats.critChance >= 1) {
    throw new Error("CRIT_CHANCE_MAXED");
  }

  if (profile.runes.banked < totalCost) {
    throw new Error("NOT_ENOUGH_RUNES");
  }

  profile.runes.banked -= totalCost;

  for (let i = 0; i < totalCount; i += 1) {
    if (statName === "critChance") {
      profile.stats.critChance = Math.min(1, profile.stats.critChance + 0.01);
    } else if (statName === "critDamage") {
      profile.stats.critDamage += 0.1;
    } else {
      profile.stats[statName] = Number(profile.stats[statName] || 0) + 1;
    }
    profile.stats.level += 1;
  }

  profile.stats.runesSpent = Math.floor(profile.stats.runesSpent + totalCost);
  profile.save.saveSequence += 1;
  profile.save.lastSavedAt = Date.now();

  return profile;
};

export const applyRuneRefund = (source) => {
  const profile = normalizePlayerProfile(source);
  profile.runes.banked = Math.floor(
    profile.runes.banked + profile.stats.runesSpent * 0.8,
  );
  profile.stats.runesSpent = 0;
  profile.stats.level = 0;
  profile.stats.vigor = 0;
  profile.stats.strength = 0;
  profile.stats.dexterity = 0;
  profile.stats.intelligence = 0;
  profile.stats.critChance = 0.05;
  profile.stats.critDamage = 1.5;
  profile.stats.splashDamage = 0;
  profile.stats.armor = 100;
  profile.equipped = { weapon: null, armor: null, accessory: null };
  profile.order = [null, null, null];
  profile.save.saveSequence += 1;
  profile.save.lastSavedAt = Date.now();
  return profile;
};

export const toggleEquipment = (source, slotKey, itemId) => {
  const profile = normalizePlayerProfile(source);
  profile.equipped[slotKey] = profile.equipped[slotKey] === itemId ? null : itemId;
  profile.save.saveSequence += 1;
  profile.save.lastSavedAt = Date.now();
  return profile;
};

export const toggleEquippedAsh = (source, ashId) => {
  const profile = normalizePlayerProfile(source);
  profile.equippedAsh = profile.equippedAsh === ashId ? null : ashId;
  profile.save.saveSequence += 1;
  profile.save.lastSavedAt = Date.now();
  return profile;
};

export const updatePreparationSelection = (
  source,
  { blessingId, consumableId } = {},
) => {
  const profile = normalizePlayerProfile(source);

  if (blessingId !== undefined) {
    profile.preparation.selectedBlessingId = blessingId;
  }

  if (consumableId !== undefined) {
    profile.preparation.selectedConsumableId = consumableId;
  }

  profile.save.saveSequence += 1;
  profile.save.lastSavedAt = Date.now();
  return profile;
};

export const applyOfflineTimeProgress = (source, now = Date.now()) => {
  const profile = normalizePlayerProfile(source);
  const last = profile.save.lastSavedAt || 0;

  if (last && now > last) {
    const gapSec = Math.floor((now - last) / 1000);
    if (gapSec > 5) {
      profile.save.offlineTimeBank = Math.min(
        MAX_OFFLINE_TIME_BANK,
        (profile.save.offlineTimeBank || 0) + gapSec,
      );
    }
  }

  profile.save.lastSavedAt = now;
  return profile;
};
