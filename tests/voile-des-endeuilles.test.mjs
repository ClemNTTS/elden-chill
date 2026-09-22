/*
 * Voile des Endeuilles (MOURNER) : deux bugs muets corriges au passage.
 *
 * 1. `stats.maxHp` n'existe pas dans getEffectiveStats() — les PV max se
 *    lisent via getHealth(stats.vigor). L'objet lisait toujours 0 et son
 *    garde-fou sortait avant meme de regarder les PV actuels : il ne
 *    soignait jamais personne.
 * 2. `runtimeState.voileUtilise` n'etait jamais remis a false : meme le
 *    premier bug corrige, l'objet ne se serait declenche qu'une fois par
 *    PARTIE, jamais par combat comme l'annonce sa description.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { ITEMS } = await import("../item.js");
const { spawnMonster } = await import("../spawn.js");
const voile = ITEMS.mourners_veil;

test("soigne sous 30% des PV, une fois", () => {
  etatNeuf({ stats: { vigor: 100 } });
  const eff = state.getEffectiveStats();
  const maxHp = state.getHealth(eff.vigor);
  const avant = Math.floor(maxHp * 0.2);
  state.runtimeState.playerCurrentHp = avant;
  state.runtimeState.voileUtilise = false;

  voile.funcOnBeingHit(eff);

  // Le Voile SOIGNE de 29% des PV max, il ne remonte pas a une valeur fixe.
  assert.equal(
    state.runtimeState.playerCurrentHp,
    avant + Math.floor(maxHp * 0.29),
  );
  assert.equal(state.runtimeState.voileUtilise, true);
});

test("ne se declenche pas au-dessus de 30% des PV", () => {
  etatNeuf({ stats: { vigor: 100 } });
  const eff = state.getEffectiveStats();
  const maxHp = state.getHealth(eff.vigor);
  state.runtimeState.playerCurrentHp = Math.floor(maxHp * 0.8);
  state.runtimeState.voileUtilise = false;

  voile.funcOnBeingHit(eff);

  assert.equal(state.runtimeState.playerCurrentHp, Math.floor(maxHp * 0.8));
  assert.equal(state.runtimeState.voileUtilise, false);
});

test("un nouveau combat la remet a disposition", () => {
  etatNeuf();
  state.runtimeState.voileUtilise = true;
  state.runtimeState.currentCombatSession = 1;

  spawnMonster("white_wolf", 1);

  assert.equal(state.runtimeState.voileUtilise, false);
});
