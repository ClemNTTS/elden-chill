import { DEFAULT_GAME_STATE, gameState, setGameState } from "./state.js";
import { CRIT_BASE, syncCritStats } from "./crit.js";
import {
  CAMP_SCREEN_IDS,
  LOCAL_PREFS_KEY,
  applyOfflineTimeProgress,
  ensureSaveIdentity,
  isCompatibleSaveVersion,
  normalizePlayerProfile,
} from "./shared/player-profile.js";
import { decodeLegacySave, openSave, sealSave } from "./save-crypto.js";

export const SAVE_NAME = "eldenChillSave";
export const SAVE_BACKUP_NAME = "eldenChillSaveBackup";
export const SAVE_META_NAME = "eldenChillSaveMeta";
export const SAVE_QUARANTINE_NAME = "eldenChillSaveRejected";

// Preferences qui restent propres au navigateur et ne voyagent pas avec le
// profil : elles sont stockees en clair, elles n'ont aucun impact sur le jeu.
const CLIENT_PREF_KEYS = ["ui", "save.audioVolume", "save.useOfflineTime"];

/**
 * Resultat du dernier loadGame(), pour que l'UI puisse prevenir le joueur
 * quand une sauvegarde a ete refusee ou restauree depuis la copie de secours.
 * status : "fresh" | "loaded" | "restored-backup" | "migrated-legacy" | "rejected"
 */
export const lastLoadReport = {
  status: "fresh",
  reason: null,
  usedBackup: false,
};

const getByPath = (source, path) =>
  path
    .split(".")
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), source);

const setByPath = (target, path, value) => {
  const parts = path.split(".");
  let cursor = target;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
};

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`Impossible de lire ${key} :`, err);
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Impossible d'ecrire ${key} :`, err);
  }
};

export const getSaveMeta = () => readJson(SAVE_META_NAME);
export const setSaveMeta = (meta) => writeJson(SAVE_META_NAME, meta);

/* ------------------------------------------------------------------ */
/* Preferences locales                                                */
/* ------------------------------------------------------------------ */

export const getLocalPreferences = () => readJson(LOCAL_PREFS_KEY) || {};

export const saveLocalPreferences = () => {
  const prefs = {};
  CLIENT_PREF_KEYS.forEach((path) => {
    const value = getByPath(gameState, path);
    if (value !== undefined) {
      setByPath(prefs, path, value);
    }
  });
  writeJson(LOCAL_PREFS_KEY, prefs);
};

const applyLocalPreferences = () => {
  const prefs = getLocalPreferences();

  if (prefs.ui) {
    gameState.ui = {
      ...DEFAULT_GAME_STATE.ui,
      ...(gameState.ui || {}),
      ...(prefs.ui || {}),
    };
  }

  if (!gameState.save) gameState.save = {};

  if (prefs.save?.audioVolume != null) {
    gameState.save.audioVolume = prefs.save.audioVolume;
  }

  if (prefs.save?.useOfflineTime != null) {
    gameState.save.useOfflineTime = !!prefs.save.useOfflineTime;
  }
};

/* ------------------------------------------------------------------ */
/* Lecture                                                            */
/* ------------------------------------------------------------------ */

/**
 * Tente de lire une enveloppe scellee a une cle donnee.
 * @returns {{ profile: object } | { error: string } | null}
 */
const readSealedSlot = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  const opened = openSave(raw);
  if (!opened.ok) return { error: opened.reason };

  if (!isCompatibleSaveVersion(opened.data?.save?.version)) {
    return { error: "INCOMPATIBLE_VERSION" };
  }

  return { profile: normalizePlayerProfile(opened.data) };
};

/** Ancienne sauvegarde en base64 inverse, d'avant l'enveloppe scellee. */
const readLegacySlot = () => {
  const raw = localStorage.getItem(SAVE_NAME);
  if (!raw) return null;

  const decoded = decodeLegacySave(raw);
  if (!decoded) return null;
  if (!isCompatibleSaveVersion(decoded?.save?.version)) return null;

  return { profile: normalizePlayerProfile(decoded) };
};

/**
 * Charge la sauvegarde locale dans gameState.
 * Ordre d'essai : enveloppe principale, copie de secours, format legacy,
 * puis etat neuf. Une sauvegarde refusee est mise de cote plutot qu'ecrasee,
 * pour qu'une progression ne disparaisse jamais silencieusement.
 */
export const loadGame = () => {
  lastLoadReport.status = "fresh";
  lastLoadReport.reason = null;
  lastLoadReport.usedBackup = false;

  const primary = readSealedSlot(SAVE_NAME);

  if (primary?.profile) {
    hydrate(primary.profile);
    lastLoadReport.status = "loaded";
    return lastLoadReport;
  }

  // L'enveloppe principale est illisible : on regarde la copie de secours
  // avant de conclure quoi que ce soit.
  const backup = readSealedSlot(SAVE_BACKUP_NAME);

  if (backup?.profile) {
    quarantine(primary?.error || "MISSING");
    hydrate(backup.profile);
    // On rescelle immediatement, sinon la mauvaise enveloppe resterait en
    // place et on repasserait par la restauration a chaque chargement.
    saveGame("restauration-backup");
    lastLoadReport.status = "restored-backup";
    lastLoadReport.reason = primary?.error || null;
    lastLoadReport.usedBackup = true;
    console.warn(
      "[save] enveloppe principale refusee, restauration depuis la copie de secours",
      primary?.error,
    );
    return lastLoadReport;
  }

  // Ni l'une ni l'autre : peut-etre une sauvegarde de l'ancien format.
  const legacy = readLegacySlot();

  if (legacy?.profile) {
    hydrate(legacy.profile);
    saveGame("migration-legacy");
    lastLoadReport.status = "migrated-legacy";
    console.info("[save] sauvegarde legacy migree vers l'enveloppe scellee");
    return lastLoadReport;
  }

  if (primary?.error) {
    quarantine(primary.error);
    lastLoadReport.status = "rejected";
    lastLoadReport.reason = primary.error;
    console.warn("[save] sauvegarde refusee et mise de cote :", primary.error);
  }

  // Etat neuf.
  hydrate(normalizePlayerProfile({}));
  return lastLoadReport;
};

/*
 * Migration des sauvegardes anterieures au systeme de points critiques.
 *
 * Avant, chaque amelioration de critique consommait un niveau du budget global
 * et coutait des runes. Ces niveaux ne servent plus a rien : on les rend, avec
 * la part correspondante des runes depensees, et le critique repart de sa base
 * — le joueur le reconstruit avec ses points, gratuits.
 *
 * Le remboursement en runes est proportionnel : le cout exact d'un niveau
 * donne depend de l'ordre d'achat, que la sauvegarde ne conserve pas. Une part
 * au prorata ne peut jamais s'ecarter beaucoup du vrai montant, et elle a le
 * merite d'etre neutre plutot que systematiquement genereuse ou avare.
 */
const migrateCritToSkillPoints = (profile) => {
  const stats = profile?.stats;
  if (!stats || stats.critRanks) return profile;

  const chanceLevels = Math.max(
    0,
    Math.round(((stats.critChance ?? CRIT_BASE.chance) - CRIT_BASE.chance) / 0.01),
  );
  const damageLevels = Math.max(
    0,
    Math.round(((stats.critDamage ?? CRIT_BASE.damage) - CRIT_BASE.damage) / 0.1),
  );
  const spent = chanceLevels + damageLevels;

  stats.critRanks = { chance: 0, damage: 0 };
  stats.critChance = CRIT_BASE.chance;
  stats.critDamage = CRIT_BASE.damage;
  if (spent <= 0) return profile;

  const level = stats.level || 0;
  if (level > 0 && stats.runesSpent > 0) {
    const share = Math.min(1, spent / level);
    const refund = Math.floor(stats.runesSpent * share);
    profile.runes = profile.runes || { banked: 0, carried: 0 };
    profile.runes.banked = Math.floor((profile.runes.banked || 0) + refund);
    stats.runesSpent = Math.max(0, Math.floor(stats.runesSpent - refund));
  }
  stats.level = Math.max(0, level - spent);

  console.info(
    `[save] migration critique : ${spent} niveau(x) rendu(s), critique remis a sa base`,
  );
  return profile;
};

const hydrate = (profile) => {
  const withOfflineTime = applyOfflineTimeProgress(migrateCritToSkillPoints(profile));
  ensureSaveIdentity(withOfflineTime);

  // Une sauvegarde prise en pleine expedition restaure isExploring a true,
  // mais la boucle de combat n'est pas relancee au chargement : le joueur
  // arrivait sur un ecran de combat vide et bloque. On le ramene au camp.
  //
  // Les runes portees ne sont ni encaissees ni perdues : les encaisser ferait
  // du rechargement un moyen de securiser un butin, les perdre punirait un
  // simple plantage. Elles restent portees, donc toujours en jeu.
  if (withOfflineTime.world?.isExploring) {
    withOfflineTime.world.isExploring = false;
    withOfflineTime.playerEffects = [];
    withOfflineTime.ennemyEffects = [];
    withOfflineTime.ashesOfWaruses = {};
    console.info("[save] expedition interrompue par un rechargement, retour au camp");
  }

  setGameState(withOfflineTime);
  // Les rangs font foi : ils reconstruisent critChance et critDamage, y compris
  // si la sauvegarde portait des valeurs incoherentes.
  syncCritStats();
  applyLocalPreferences();

  // Meme probleme cote interface : ui.currentScreen peut valoir "combat", qui
  // n'a pas de section au camp, et l'ecran restaure restait vide.
  //
  // La verification vient apres applyLocalPreferences, pas avant : les
  // preferences locales reecrivent gameState.ui en entier et remettraient la
  // valeur invalide en place.
  if (!CAMP_SCREEN_IDS.includes(gameState.ui?.currentScreen)) {
    if (!gameState.ui) gameState.ui = {};
    gameState.ui.currentScreen = "hub";
  }
};

/**
 * Deplace une sauvegarde refusee vers une cle de quarantaine, brute, pour
 * qu'elle reste inspectable au lieu d'etre perdue.
 */
const quarantine = (reason) => {
  const raw = localStorage.getItem(SAVE_NAME);
  if (!raw) return;

  try {
    localStorage.setItem(
      SAVE_QUARANTINE_NAME,
      JSON.stringify({ reason, at: Date.now(), payload: raw }),
    );
  } catch (err) {
    console.warn("Impossible de mettre la sauvegarde en quarantaine :", err);
  }
};

export const getQuarantinedSave = () => readJson(SAVE_QUARANTINE_NAME);
export const clearQuarantinedSave = () =>
  localStorage.removeItem(SAVE_QUARANTINE_NAME);

/* ------------------------------------------------------------------ */
/* Ecriture                                                           */
/* ------------------------------------------------------------------ */

export const saveGame = (reason = "autosave") => {
  try {
    if (!gameState.save) gameState.save = {};
    ensureSaveIdentity(gameState);
    gameState.save.saveSequence = Number(gameState.save.saveSequence || 0) + 1;
    gameState.save.lastSavedAt = Date.now();

    const sealed = sealSave(gameState);

    // Rotation : l'enveloppe courante devient la copie de secours seulement
    // apres qu'on a produit la nouvelle, jamais avant.
    const previous = localStorage.getItem(SAVE_NAME);
    localStorage.setItem(SAVE_NAME, sealed);
    if (previous) localStorage.setItem(SAVE_BACKUP_NAME, previous);

    setSaveMeta({
      reason,
      at: gameState.save.lastSavedAt,
      sequence: gameState.save.saveSequence,
      version: gameState.save.version,
      profileId: gameState.save.profileId,
    });

    saveLocalPreferences();
    return true;
  } catch (err) {
    console.error("Impossible d'enregistrer la sauvegarde locale :", err);
    return false;
  }
};

/* ------------------------------------------------------------------ */
/* Import / export manuel                                            */
/* ------------------------------------------------------------------ */

/** Chaine scellee que le joueur peut copier ailleurs (backup manuel). */
export const exportSaveString = () => sealSave(gameState);

/**
 * Reinjecte une chaine scellee produite par exportSaveString().
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export const importSaveString = (encoded) => {
  const opened = openSave(String(encoded || "").trim());
  if (!opened.ok) return { ok: false, reason: opened.reason };

  if (!isCompatibleSaveVersion(opened.data?.save?.version)) {
    return { ok: false, reason: "INCOMPATIBLE_VERSION" };
  }

  hydrate(normalizePlayerProfile(opened.data));
  saveGame("import");
  return { ok: true };
};

/* ------------------------------------------------------------------ */
/* Remise a zero                                                      */
/* ------------------------------------------------------------------ */

export const resetGameState = () => {
  setGameState(normalizePlayerProfile({}));
  saveLocalPreferences();
};

export const clearSaveStorage = () => {
  [
    SAVE_NAME,
    SAVE_BACKUP_NAME,
    SAVE_META_NAME,
    SAVE_QUARANTINE_NAME,
    LOCAL_PREFS_KEY,
  ].forEach((key) => localStorage.removeItem(key));
};
