export const PLAYER_PROFILE_VERSION = "2.5.0";
export const MAX_LEVEL = 150;
export const MAX_OFFLINE_TIME_BANK = 3600;

/** Ecrans du camp, dans l'ordre de la navigation. Source unique : la
 *  sauvegarde doit pouvoir valider ui.currentScreen sans dependre de ui.js. */
export const CAMP_SCREEN_IDS = [
  "hub",
  "map",
  "build",
  "inventory",
  "codex",
  "options",
];

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
    // Points de competence critiques, un tous les 10 niveaux. Voir crit.js.
    critRanks: { chance: 0, damage: 0 },
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
  // Progression au-dessus de la partie : survit a chaque renaissance.
  rebirth: {
    count: 0,
    finalCleared: false,
    trialsCleared: {},
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

export const LOCAL_PREFS_KEY = "eldenChillClientPrefs";
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
  // Le plafond de niveau monte de 10 par renaissance : on ne peut donc pas le
  // forcer a MAX_LEVEL ici, ce qui annulerait le gain a chaque chargement.
  base.rebirth = { ...DEFAULT_PLAYER_PROFILE.rebirth, ...toObject(data.rebirth) };
  base.rebirth.count = Math.max(0, Math.floor(Number(base.rebirth.count) || 0));
  base.rebirth.finalCleared = !!base.rebirth.finalCleared;
  base.rebirth.trialsCleared = toObject(base.rebirth.trialsCleared);
  base.save.maxLevel = MAX_LEVEL + 10 * base.rebirth.count;
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
