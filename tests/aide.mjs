/*
 * Socle commun aux tests : monte le bouchon DOM, puis charge le moteur.
 *
 * Les modules du jeu partagent un `gameState` unique, en module. Un test qui
 * le modifie contamine le suivant s'il ne le rend pas : `etatNeuf()` remet le
 * profil par defaut avant chaque cas.
 */
import { mountDomStub } from "../tools/headless-stub.mjs";

mountDomStub();

export const state = await import("../state.js");
export const crit = await import("../crit.js");
export const ashes = await import("../ashes.js");
export const profil = await import("../shared/player-profile.js");

/** Remet le profil par defaut et des PV pleins. */
export const etatNeuf = (patch = {}) => {
  const neuf = profil.normalizePlayerProfile({});
  Object.assign(neuf.stats, patch.stats || {});
  state.setGameState(neuf);
  state.runtimeState.playerCurrentHp = state.getHealth(
    state.getEffectiveStats().vigor,
  );
  return state.gameState;
};

/** PV maximum courants, formule du jeu comprise. */
export const pvMax = () => state.getHealth(state.getEffectiveStats().vigor);
