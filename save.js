import {
  DEFAULT_GAME_STATE,
  gameState,
  setGameState,
} from "./state.js";
import {
  LOCAL_IMPORT_CONSUMED_KEY,
  LOCAL_PREFS_KEY,
  isCompatibleSaveVersion,
  normalizePlayerProfile,
  sanitizeCloudPayload,
  ensureSaveIdentity,
} from "./shared/player-profile.js";

export const SAVE_NAME = "eldenChillSave";
export const SAVE_BACKUP_NAME = "eldenChillSaveBackup";
export const SAVE_META_NAME = "eldenChillSaveMeta";

const CLIENT_PREF_KEYS = [
  "ui",
  "save.audioVolume",
  "save.useOfflineTime",
];

const getByPath = (source, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), source);

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

export const encodeSave = (data) => {
  const jsonString = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  return base64.split("").reverse().join("");
};

export const decodeSave = (encodedData) => {
  try {
    const reversed = encodedData.split("").reverse().join("");
    const jsonString = decodeURIComponent(escape(atob(reversed)));
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("Erreur de decodage de la sauvegarde :", err);
    return null;
  }
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
  localStorage.setItem(key, JSON.stringify(value));
};

export const getSaveMeta = () => readJson(SAVE_META_NAME);
export const setSaveMeta = (meta) => writeJson(SAVE_META_NAME, meta);

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

  if (prefs.save?.audioVolume != null) {
    if (!gameState.save) gameState.save = {};
    gameState.save.audioVolume = prefs.save.audioVolume;
  }

  if (prefs.save?.useOfflineTime != null) {
    if (!gameState.save) gameState.save = {};
    gameState.save.useOfflineTime = !!prefs.save.useOfflineTime;
  }
};

export const loadGame = () => {
  applyLocalPreferences();
};

export const hydrateProfileState = (profile) => {
  const normalized = normalizePlayerProfile(profile);
  setGameState(normalized);
  applyLocalPreferences();
};

export const buildCloudProfilePayload = () => sanitizeCloudPayload(gameState);

export const saveGame = (reason = "autosave") => {
  try {
    if (!gameState.save) gameState.save = {};
    ensureSaveIdentity(gameState);
    gameState.save.saveSequence = Number(gameState.save.saveSequence || 0) + 1;
    gameState.save.lastSavedAt = Date.now();
    saveLocalPreferences();

    if (typeof window !== "undefined" && typeof window.__eldenChillScheduleSync === "function") {
      window.__eldenChillScheduleSync(reason);
    }
  } catch (err) {
    console.error("Impossible d'enregistrer l'etat local :", err);
  }
};

export const resetGameState = () => {
  setGameState(DEFAULT_GAME_STATE);
  saveLocalPreferences();
};

export const clearSaveStorage = () => {
  localStorage.removeItem(LOCAL_PREFS_KEY);
  localStorage.removeItem(SAVE_NAME);
  localStorage.removeItem(SAVE_BACKUP_NAME);
  localStorage.removeItem(SAVE_META_NAME);
  localStorage.removeItem(LOCAL_IMPORT_CONSUMED_KEY);
};

export const getLegacyEncodedSave = () => localStorage.getItem(SAVE_NAME);

export const getLegacySaveCandidate = () => {
  const encoded = getLegacyEncodedSave();
  if (!encoded) return null;

  const decoded = decodeSave(encoded);
  if (!decoded || !isCompatibleSaveVersion(decoded.save?.version)) {
    return null;
  }

  const normalized = normalizePlayerProfile(decoded);
  return {
    encoded,
    decoded: normalized,
  };
};

export const hasLegacyImportBeenConsumed = () =>
  localStorage.getItem(LOCAL_IMPORT_CONSUMED_KEY) === "true";

export const markLegacyImportConsumed = () => {
  localStorage.setItem(LOCAL_IMPORT_CONSUMED_KEY, "true");
};
