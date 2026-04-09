import { ITEMS } from "./item.js";
import { DEFAULT_GAME_STATE, gameState, setGameState } from "./state.js";
import { setAudioListener, updateUI } from "./ui.js";

export const SAVE_NAME = "eldenChillSave";
export const SAVE_BACKUP_NAME = "eldenChillSaveBackup";
export const SAVE_META_NAME = "eldenChillSaveMeta";

const getVersionLine = (version) => {
  if (!version) return "";
  return String(version).split(".").slice(0, 2).join(".");
};

const isCompatibleSaveVersion = (version) =>
  getVersionLine(version) === getVersionLine(DEFAULT_GAME_STATE.save.version);

const createProfileId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const encodeSave = (data) => {
  const jsonString = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  return base64.split("").reverse().join("");
};

const decodeSave = (encodedData) => {
  try {
    const reversed = encodedData.split("").reverse().join("");
    const jsonString = decodeURIComponent(escape(atob(reversed)));
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("Erreur de décodage de la sauvegarde :", err);
    return null;
  }
};

const getSaveMeta = () => {
  try {
    const raw = localStorage.getItem(SAVE_META_NAME);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Impossible de lire les métadonnées de sauvegarde :", err);
    return null;
  }
};

const setSaveMeta = (meta) => {
  localStorage.setItem(SAVE_META_NAME, JSON.stringify(meta));
};

const ensureSaveIdentity = (data, fallbackProfileId = null) => {
  if (!data.save) data.save = {};
  if (!data.save.profileId) {
    data.save.profileId = fallbackProfileId || createProfileId();
  }
  if (!Number.isFinite(data.save.saveSequence)) {
    data.save.saveSequence = 0;
  }
  return data;
};

const updateProtectionMetaFromSave = (data) => {
  const profileId = data.save?.profileId;
  const saveSequence = Number(data.save?.saveSequence || 0);
  if (!profileId) return;

  const current = getSaveMeta() || {};
  const nextMeta =
    current.profileId === profileId
      ? {
          profileId,
          highestSequence: Math.max(current.highestSequence || 0, saveSequence),
          updatedAt: Date.now(),
        }
      : {
          profileId,
          highestSequence: saveSequence,
          updatedAt: Date.now(),
        };

  setSaveMeta(nextMeta);
};

const validateSaveLineage = (data, { isImport = false } = {}) => {
  const meta = getSaveMeta();
  if (!meta?.profileId) {
    return { ok: true };
  }

  const importedProfileId = data.save?.profileId || null;
  const importedSequence = Number(data.save?.saveSequence || 0);

  if (!importedProfileId) {
    return {
      ok: false,
      message: isImport
        ? "❌ IMPORT IMPOSSIBLE : cette sauvegarde est trop ancienne pour être réimportée dans une lignée protégée."
        : "Sauvegarde locale rejetée : métadonnées de lignée absentes.",
    };
  }

  if (importedProfileId !== meta.profileId) {
    return {
      ok: false,
      message: isImport
        ? "❌ IMPORT IMPOSSIBLE : cette sauvegarde appartient à une autre lignée. Réinitialisez votre sauvegarde locale avant d'importer une nouvelle lignée."
        : "Sauvegarde locale rejetée : lignée de sauvegarde incohérente.",
    };
  }

  if (importedSequence < (meta.highestSequence || 0)) {
    return {
      ok: false,
      message: isImport
        ? "❌ IMPORT IMPOSSIBLE : cette sauvegarde est plus ancienne qu'une version déjà utilisée sur ce navigateur."
        : "Sauvegarde locale rejetée : tentative de rollback détectée.",
    };
  }

  return { ok: true };
};

const restoreBackupSave = () => {
  const backup = localStorage.getItem(SAVE_BACKUP_NAME);
  if (!backup) return false;
  localStorage.setItem(SAVE_NAME, backup);
  return true;
};

export const saveGame = () => {
  try {
    if (!gameState.save) gameState.save = {};
    ensureSaveIdentity(gameState, getSaveMeta()?.profileId || null);
    gameState.save.saveSequence = Number(gameState.save.saveSequence || 0) + 1;
    gameState.save.lastSavedAt = Date.now();
    gameState.save.version = DEFAULT_GAME_STATE.save.version;

    const secretString = encodeSave(gameState);
    localStorage.setItem(SAVE_NAME, secretString);
    localStorage.setItem(SAVE_BACKUP_NAME, secretString);
    updateProtectionMetaFromSave(gameState);
    console.log("Sauvegarde cryptée effectuée !");
  } catch (err) {
    console.error("⚠️ Sauvegarde corrompue ou modifiée illégalement :", err);
  }
};

export const loadGame = () => {
  const savedData = localStorage.getItem(SAVE_NAME);
  if (savedData) {
    const decrypted = decodeSave(savedData);
    if (decrypted) {
      const meta = getSaveMeta();
      ensureSaveIdentity(decrypted, meta?.profileId || null);
      const validation = validateSaveLineage(decrypted);

      if (!validation.ok) {
        console.warn(validation.message);
        const restored = restoreBackupSave();
        if (restored) {
          alert(
            "Une sauvegarde plus ancienne a été détectée et rejetée. La dernière sauvegarde valide a été restaurée.",
          );
          return loadGame();
        }

        alert(
          "Une sauvegarde plus ancienne a été détectée et rejetée. Aucune sauvegarde de secours n'a été trouvée.",
        );
        localStorage.removeItem(SAVE_NAME);
        setAudioListener();
        updateUI();
        return;
      }

      try {
        const last = decrypted.save?.lastSavedAt || 0;
        const now = Date.now();
        if (last && now > last) {
          const gapSec = Math.floor((now - parseInt(last, 10)) / 1000);
          if (gapSec > 5) {
            decrypted.save.offlineTimeBank = Math.min(
              (decrypted.save.offlineTimeBank || 0) + gapSec,
              3600,
            );
            console.log(
              `Offline time added: ${gapSec}s (bank now ${decrypted.save.offlineTimeBank}s)`,
            );
          }
        }
      } catch (e) {
        console.warn("Error computing offline gap:", e);
      }

      decrypted.world = decrypted.world || { unlockedBiomes: ["limgrave_west"] };
      decrypted.runes = decrypted.runes || { banked: 0, carried: 0 };
      decrypted.inventory = decrypted.inventory || [];
      decrypted.order = decrypted.order || [];

      if (decrypted.equipped && Array.isArray(decrypted.equipped)) {
        console.warn(
          "Ancienne structure détectée, réinitialisation de l'équipement.",
        );
        decrypted.equipped = { weapon: null, armor: null, accessory: null };
        decrypted.order = [null, null, null];
      }

      decrypted.world.isExploring = false;
      decrypted.playerEffects = [];
      decrypted.ennemyEffects = [];
      decrypted.runes.carried = 0;
      decrypted.ui = {
        ...DEFAULT_GAME_STATE.ui,
        ...(decrypted.ui || {}),
      };
      decrypted.preparation = {
        ...DEFAULT_GAME_STATE.preparation,
        ...(decrypted.preparation || {}),
      };
      decrypted.preparation.unlockedBlessings =
        decrypted.preparation.unlockedBlessings?.length
          ? decrypted.preparation.unlockedBlessings
          : [...DEFAULT_GAME_STATE.preparation.unlockedBlessings];
      decrypted.preparation.unlockedConsumables =
        decrypted.preparation.unlockedConsumables?.length
          ? decrypted.preparation.unlockedConsumables
          : [...DEFAULT_GAME_STATE.preparation.unlockedConsumables];
      decrypted.journal = {
        ...DEFAULT_GAME_STATE.journal,
        ...(decrypted.journal || {}),
      };
      decrypted.codex = {
        ...DEFAULT_GAME_STATE.codex,
        ...(decrypted.codex || {}),
      };
      decrypted.world = {
        ...DEFAULT_GAME_STATE.world,
        ...(decrypted.world || {}),
      };
      if (decrypted.ui.currentScreen === "combat") {
        decrypted.ui.currentScreen = "hub";
      }

      decrypted.save = {
        ...DEFAULT_GAME_STATE.save,
        ...(decrypted.save || {}),
      };
      decrypted.save.maxLevel = DEFAULT_GAME_STATE.save.maxLevel;
      decrypted.save.version = DEFAULT_GAME_STATE.save.version;
      ensureSaveIdentity(decrypted, meta?.profileId || null);

      if (decrypted.inventory) {
        decrypted.inventory = decrypted.inventory.filter((item) => ITEMS[item.id]);
      }

      setGameState(decrypted);
      saveGame();
    }
  }

  setAudioListener();
  updateUI();
};

export const resetGameState = () => {
  setGameState(DEFAULT_GAME_STATE);
  saveGame();
};

export const clearSaveStorage = () => {
  localStorage.removeItem(SAVE_NAME);
  localStorage.removeItem(SAVE_BACKUP_NAME);
  localStorage.removeItem(SAVE_META_NAME);
};
