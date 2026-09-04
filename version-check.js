import { saveGame } from "./save.js";
/*
 * Detection de mise a jour deployee.
 *
 * Extrait de game.js pour rompre le dernier cycle d'imports du projet :
 * ui.js importait `checkForUpdate` depuis game.js, qui importe actions.js et
 * ui.js. Tout module touchant a l'interface tirait donc game.js — et game.js
 * cable `window` a l'import, ce qui le rend inutilisable hors navigateur.
 *
 * Consequence concrete : actions.js etait intestable, et c'est precisement
 * dans actions.js que respecCritPoints() jetait silencieusement.
 */
import { DEFAULT_GAME_STATE } from "./state.js";

export const CHECK_REFRESH_KEY = "last_hard_refresh_timestamp";
export const FORCE_VERSION_KEY = "app_version_code";
export const CURRENT_VERSION = DEFAULT_GAME_STATE.save.version;

export const IS_LOCAL_HOST =
  globalThis.location?.hostname === "localhost" ||
  globalThis.location?.hostname === "127.0.0.1";

export async function checkForUpdate() {
  if (IS_LOCAL_HOST) {
    return;
  }

  try {
    const response = await fetch(`./version.json?t=${Date.now()}`);
    const data = await response.json();

    if (data.version !== CURRENT_VERSION) {
      console.log("MAJ detectee, rechargement en cours...");
      saveGame();
      window.location.reload(true);
    }
  } catch (err) {
    console.error("Impossible de verifier les mises a jour", err);
  }
}
