export const PLAYER_PROFILE_VERSION = "2.5.0";
/*
 * Plafond de niveau.
 *
 * Il suit le nombre de biomes : 150 couvrait les 32 biomes d'origine, 220
 * couvre les 46 de la version complete, au meme rythme d'environ 4,8 niveaux
 * par biome. Le relever sans ajouter de contenu aurait casse la courbe de
 * cout, qui croit en carre du niveau.
 */
export const MAX_LEVEL = 220;
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
    activeTraits: [],
    lastEventProgress: -1,
    /*
     * Biomes dont le boss est tombe. Sert de cle au plafond de niveau : sans
     * lui, on pouvait laisser tourner le jeu dans la premiere zone et arriver
     * au niveau 220 sans jamais avoir reflechi a un build.
     */
    defeatedBosses: [],
    // Zero pour une partie neuve : seules les sauvegardes d'avant le plafond
    // en heritent une valeur, pour ne pas afficher un niveau au-dessus du cap.
    legacyLevelFloor: 0,
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
    /*
     * Aucune benediction au depart.
     *
     * La Benediction des Runes etait donnee d'emblee, alors que ses +18% de
     * gains sont le plus gros bonus economique du jeu. La premiere se gagne
     * maintenant au Lac de Limgrave, et celle des Runes au Palais de Mohgwyn.
     */
    selectedBlessingId: null,
    selectedConsumableId: "rare_tracker",
    activeRunBuffs: [],
    unlockedBlessings: [],
    unlockedConsumables: ["rare_tracker"],
  },
  journal: {
    filter: "all",
    biomeFilter: "all",
    entries: [],
  },
  // Automatisation d'expedition. Purement du confort : rien ici ne change les
  // regles, seulement qui appuie sur le bouton.
  automation: {
    autoRestart: false,
    stopAfterCycle: 0,
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
    sfxVolume: 0.5,
    profileId: null,
    saveSequence: 0,
  },
  order: [],
};

export const LOCAL_PREFS_KEY = "eldenChillClientPrefs";
const clone = (value) => JSON.parse(JSON.stringify(value));

const toObject = (value, fallback = {}) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value
    : fallback;

const toArray = (value, fallback = []) =>
  Array.isArray(value) ? value : fallback;

/*
 * Assainissement des donnees de sauvegarde.
 *
 * Une sauvegarde n'est PAS une entree de confiance. Le sceau HMAC de
 * save-crypto.js empeche l'edition triviale, mais sa clef est livree avec le
 * bundle — le README le dit lui-meme — et le code de transfert est fait pour
 * circuler entre joueurs. Quelqu'un peut donc forger un code valide.
 *
 * Le risque etait concret : `item.name` sortait d'ici tel quel et finissait
 * dans `innerHTML` (renderSlotContent et les cartes d'inventaire). Un nom
 * valant `<img src=x onerror=...>` s'executait a l'ouverture de l'inventaire,
 * chez qui collait le code.
 *
 * On borne donc ce qui vient de la sauvegarde, plutot que de compter sur
 * l'echappement de chaque point d'affichage : il y a quarante-quatre
 * `innerHTML` dans ui.js, et il suffit d'en oublier un.
 */

/** Identifiants : lettres, chiffres, tiret bas et tiret. Rien d'autre. */
const ID_VALIDE = /^[A-Za-z0-9_-]{1,64}$/;

const idPropre = (valeur, repli = null) =>
  typeof valeur === "string" && ID_VALIDE.test(valeur) ? valeur : repli;

/*
 * Texte libre : on retire tout ce qui pourrait ouvrir une balise ou une
 * entite, et on borne la longueur. Un nom d'objet legitime n'a besoin ni de
 * chevrons, ni d'esperluette, ni de guillemets.
 */
const textePropre = (valeur, repli = "") => {
  if (typeof valeur !== "string") return repli;
  const nettoye = valeur
    .replace(/[<>&"'`\\]/g, "")
    .trim()
    .slice(0, 80);
  return nettoye || repli;
};

const entierBorne = (
  valeur,
  repli = 0,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
) => {
  const n = Math.floor(Number(valeur));
  if (!Number.isFinite(n)) return repli;
  return Math.min(max, Math.max(min, n));
};

/**
 * Normalise une entree d'inventaire venue d'une sauvegarde.
 * Renvoie null si l'entree n'a pas d'identifiant exploitable : mieux vaut
 * perdre une ligne douteuse que la laisser atteindre l'affichage.
 */
const entreeInventairePropre = (brut) => {
  const source = toObject(brut, null);
  if (!source) return null;

  const id = idPropre(source.id);
  if (!id) return null;

  return {
    ...source,
    id,
    name: textePropre(source.name, id),
    level: entierBorne(source.level, 1, 0, 1000),
    count: entierBorne(source.count, 0, 0, 1e9),
  };
};

/** Applique l'assainissement a toute une liste d'inventaire. */
export const assainirInventaire = (liste) =>
  toArray(liste, []).map(entreeInventairePropre).filter(Boolean);

/** Identifiant d'objet equipe, ou null s'il est illisible. */
export const assainirIdEquipe = (valeur) =>
  valeur === null || valeur === undefined ? null : idPropre(valeur, null);

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
  for (const emplacement of Object.keys(base.equipped)) {
    base.equipped[emplacement] = assainirIdEquipe(base.equipped[emplacement]);
  }
  base.inventory = assainirInventaire(data.inventory);
  if (!base.inventory.length) {
    base.inventory = clone(DEFAULT_PLAYER_PROFILE.inventory);
  }
  base.world = { ...base.world, ...toObject(data.world) };
  base.playerEffects = toArray(data.playerEffects, []);
  base.ennemyEffects = toArray(data.ennemyEffects, []);
  base.ashesOfWaruses = {
    ...base.ashesOfWaruses,
    ...toObject(data.ashesOfWaruses),
  };
  base.ashesOfWarOwned = toArray(data.ashesOfWarOwned, [])
    .map((id) => assainirIdEquipe(id))
    .filter(Boolean);
  base.equippedAsh = assainirIdEquipe(data.equippedAsh);
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
    base.world.unlockedBiomes = clone(
      DEFAULT_PLAYER_PROFILE.world.unlockedBiomes,
    );
  }

  base.runes.banked = Math.max(0, Math.floor(Number(base.runes.banked) || 0));
  base.runes.carried = Math.max(0, Math.floor(Number(base.runes.carried) || 0));
  base.stats.level = Math.max(0, Math.floor(Number(base.stats.level) || 0));
  base.stats.runesSpent = Math.max(
    0,
    Math.floor(Number(base.stats.runesSpent) || 0),
  );
  /*
   * Le plafond de niveau n'est PAS calcule ici.
   *
   * Il depend du compteur de renaissances *et* du noeud Volonte de l'arbre, que
   * ce module ne peut pas connaitre sans importer rebirth.js — qui importe
   * MAX_LEVEL d'ici, donc cycle. La valeur ci-dessous n'est qu'un repli
   * coherent ; hydrate() la remplace par getMaxLevel() au chargement, et c'est
   * getMaxLevel() que lisent les consommateurs.
   *
   * Avoir laisse les deux formules diverger avait un cout concret : apres un
   * rechargement, les 25 niveaux du noeud Volonte disparaissaient du plafond.
   */
  base.automation = {
    ...DEFAULT_PLAYER_PROFILE.automation,
    ...toObject(data.automation),
  };
  base.automation.autoRestart = !!base.automation.autoRestart;
  base.automation.stopAfterCycle = Math.max(
    0,
    Math.min(999, Math.floor(Number(base.automation.stopAfterCycle) || 0)),
  );
  base.rebirth = {
    ...DEFAULT_PLAYER_PROFILE.rebirth,
    ...toObject(data.rebirth),
  };
  base.rebirth.count = Math.max(0, Math.floor(Number(base.rebirth.count) || 0));
  base.rebirth.finalCleared = !!base.rebirth.finalCleared;
  base.rebirth.trialsCleared = toObject(base.rebirth.trialsCleared);
  base.save.maxLevel = MAX_LEVEL + 10 * base.rebirth.count;
  base.save.version = PLAYER_PROFILE_VERSION;
  base.save.offlineTimeBank = Math.max(
    0,
    Math.min(
      MAX_OFFLINE_TIME_BANK,
      Math.floor(Number(base.save.offlineTimeBank) || 0),
    ),
  );
  base.save.useOfflineTime = !!base.save.useOfflineTime;
  base.save.sfxVolume = Math.max(
    0,
    Math.min(1, Number(base.save.sfxVolume ?? 0.5) || 0),
  );
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
