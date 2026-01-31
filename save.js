import { ITEMS } from "./item.js";
import { DEFAULT_GAME_STATE, gameState, setGameState } from "./state.js";
import { setAudioListener, updateUI } from "./ui.js";

export const SAVE_NAME = "eldenChillSave";

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

export const saveGame = () => {
  try {
    const secretString = encodeSave(gameState);
    localStorage.setItem(SAVE_NAME, secretString);
    console.log("Sauvegarde cryptée effectuée !");
  } catch (err) {
    console.error("⚠️ Sauvegarde corrompue ou modifiée illégalement : ", err);
  }
};

export const loadGame = () => {
  const savedData = localStorage.getItem(SAVE_NAME);
  if (savedData) {
    const decrypted = decodeSave(savedData);
    if (decrypted) {
      decrypted.world = decrypted.world || { unlockedBiomes: ["necrolimbe"] };
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

      if (decrypted.inventory) {
        decrypted.inventory = decrypted.inventory.filter(
          (item) => ITEMS[item.id],
        );
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

const sanitizeData = (schema, data) => {
  const result = Array.isArray(schema) ? [] : {};

  Object.keys(schema).forEach((key) => {
    if (data[key] === undefined) {
      result[key] = schema[key];
    } else if (
      typeof schema[key] === "object" &&
      schema[key] !== null &&
      !Array.isArray(schema[key])
    ) {
      result[key] = sanitizeData(schema[key], data[key]);
    } else {
      result[key] = data[key];
    }
  });

  return result;
};
export const exportSave = () => {
  gameState.save.version = DEFAULT_GAME_STATE.save.version;
  saveGame();
  const saveData = localStorage.getItem(SAVE_NAME);

  if (saveData) {
    navigator.clipboard.writeText(saveData).then(() => {
      alert("Sauvegarde copiée dans le presse-papier !");
    });
    return;
  } else {
    alert("Aucune sauvegarde trouvée.");
  }
};

// save.js
export const importSave = () => {
  const base64Data = prompt("Collez votre code de sauvegarde ici :");
  if (!base64Data) return;

  try {
    const reversed = base64Data.split("").reverse().join("");
    const jsonString = decodeURIComponent(escape(atob(reversed)));
    const importedData = JSON.parse(jsonString);

    const importedVersion = importedData.save?.version;
    const currentVersion = DEFAULT_GAME_STATE.save.version;

    if (importedVersion !== currentVersion) {
      alert(
        `❌ IMPORT IMPOSSIBLE : Cette sauvegarde (v${importedVersion || "inconnue"}) est incompatible avec la version actuelle (v${currentVersion}).`,
      );
      return;
    }

    localStorage.setItem(SAVE_NAME, base64Data);
    location.reload();
  } catch (err) {
    console.error(err);
    alert("❌ Code de sauvegarde invalide ou corrompu.");
  }
};
