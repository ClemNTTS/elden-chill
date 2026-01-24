import { gameState } from "./stats.js";

const SAVE_NAME = "eldenChillSave";

export const saveGame = () => {
  try {
    const secretString = encodeSave(gameState);
    localStorage.setItem(SAVE_NAME, secretString);
    console.log("Sauvegarde cryptée effectuée !");
  } catch (err) {
    console.error("⚠️ Sauvegarde corrompue ou modifiée illégalement : ", err);
  }
};

export const loadGame = async () => {
  // Import these here to avoid circular dependencies
  const { updateUI } = await import("./ui.js");
  const { updateStepper } = await import("./exploration.js");
  
  const savedData = localStorage.getItem(SAVE_NAME);
  if (savedData) {
    const decrypted = decodeSave(savedData);
    if (decrypted) {
      Object.assign(gameState, decrypted);
    } else {
      alert("Erreur de chargement : sauvegarde corrompue ou format obsolète.");
    }
  }
  updateStepper();
  updateUI();
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

const resetGame = () => {
  if (
    confirm(
      "Êtes-vous sûr de vouloir tout effacer ? Votre progression sera perdue à jamais.",
    )
  ) {
    localStorage.removeItem(SAVE_NAME);
    location.reload();
  }
};

export { SAVE_NAME, resetGame };
