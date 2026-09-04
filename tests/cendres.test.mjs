/*
 * Cendres de guerre.
 *
 * Le premier cas de ce fichier est la regression qui a motive la suite :
 * `bloody_slash` passait son 0.05 A getHealth() au lieu de l'appliquer a son
 * resultat. Comme getHealth part d'un plancher de 300 PV, le cout devenait un
 * forfait — 100% des PV a vigueur 0, encore 12% a vigueur 99.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ashes, etatNeuf, pvMax, state } from "./aide.mjs";

const { ASHES_OF_WAR } = ashes;

test("Entaille Sanglante coute 5% des PV ACTUELS, a toute vigueur", () => {
  for (const vigor of [0, 10, 25, 40, 60, 99]) {
    etatNeuf({ stats: { vigor } });
    const avant = state.runtimeState.playerCurrentHp;
    ASHES_OF_WAR.bloody_slash.effect(state.getEffectiveStats(), null);
    const cout = avant - state.runtimeState.playerCurrentHp;

    assert.equal(
      cout,
      Math.floor(avant * 0.05),
      `vigueur ${vigor} : cout attendu 5% de ${avant}`,
    );
    // Le garde-fou qui aurait fait echouer l'ancienne version d'emblee.
    assert.ok(
      cout <= avant * 0.05 + 1,
      `vigueur ${vigor} : ${cout} PV ponctionnes sur ${avant}, bien au-dela de 5%`,
    );
  }
});

test("Entaille Sanglante ne peut jamais achever son porteur", () => {
  etatNeuf({ stats: { vigor: 30 } });
  state.runtimeState.playerCurrentHp = 1;
  for (let i = 0; i < 50; i++) {
    ASHES_OF_WAR.bloody_slash.effect(state.getEffectiveStats(), null);
  }
  assert.ok(
    state.runtimeState.playerCurrentHp >= 1,
    "les PV sont tombes a zero ou en dessous",
  );
});

test("Entaille Sanglante conserve son multiplicateur et son saignement", () => {
  etatNeuf({ stats: { vigor: 20 } });
  const r = ASHES_OF_WAR.bloody_slash.effect(state.getEffectiveStats(), null);
  assert.equal(r.damageMult, 2.5);
  assert.equal(r.status.id, "BLEED");
  assert.equal(r.status.duration, 3);
});

test("le soin du Sans-Eclat rend 5 PV par niveau, plafonne a 250", () => {
  for (const [level, attendu] of [[1, 5], [10, 50], [50, 250], [200, 250]]) {
    etatNeuf({ stats: { level, vigor: 40 } });
    state.runtimeState.playerCurrentHp = 10;
    ASHES_OF_WAR.beginer_tarnished_heal.effect(state.getEffectiveStats(), null);
    assert.equal(
      state.runtimeState.playerCurrentHp - 10,
      attendu,
      `niveau ${level}`,
    );
  }
});

test("aucun soin de cendre ne depasse les PV maximum", () => {
  for (const id of ["beginer_tarnished_heal", "rootward_vow"]) {
    etatNeuf({ stats: { level: 200, vigor: 40 } });
    const max = pvMax();
    state.runtimeState.playerCurrentHp = max;
    ASHES_OF_WAR[id].effect(state.getEffectiveStats(), null);
    assert.ok(
      state.runtimeState.playerCurrentHp <= max,
      `${id} a depasse les PV maximum`,
    );
  }
});

test("la Riposte de la Ronce reste dans ses bornes annoncees", () => {
  // Le ratio est cense rester entre 1.2 et 4 quelle que soit la force.
  for (const strength of [1, 5, 50, 500, 5000]) {
    etatNeuf({ stats: { strength } });
    const stats = state.getEffectiveStats();
    const r = ASHES_OF_WAR.briar_riposte.effect(stats, null);
    assert.ok(
      r.damageMult >= 1.2 && r.damageMult <= 4,
      `force ${strength} : ratio ${r.damageMult} hors bornes`,
    );
  }
});

test("toute cendre est complete et son effet ne jette pas", () => {
  for (const [id, data] of Object.entries(ASHES_OF_WAR)) {
    assert.equal(typeof data.name, "string", `${id} : nom manquant`);
    assert.ok(data.name.length > 0, `${id} : nom vide`);
    assert.equal(
      typeof data.description,
      "string",
      `${id} : description manquante`,
    );
    assert.equal(typeof data.effect, "function", `${id} : effet manquant`);
    assert.ok(
      Number.isFinite(data.maxUses) && data.maxUses > 0,
      `${id} : maxUses invalide (${data.maxUses})`,
    );

    etatNeuf({ stats: { level: 100, vigor: 40, strength: 100 } });
    const stats = state.getEffectiveStats();
    let sortie;
    assert.doesNotThrow(() => {
      sortie = data.effect(stats, null);
    }, `${id} : l'effet a jete`);

    if (sortie?.damageMult !== undefined) {
      assert.ok(
        Number.isFinite(sortie.damageMult) && sortie.damageMult > 0,
        `${id} : damageMult invalide (${sortie.damageMult})`,
      );
    }
  }
});

test("aucune cendre ne laisse les PV du joueur negatifs", () => {
  for (const [id, data] of Object.entries(ASHES_OF_WAR)) {
    etatNeuf({ stats: { level: 100, vigor: 40 } });
    state.runtimeState.playerCurrentHp = 5;
    data.effect(state.getEffectiveStats(), null);
    assert.ok(
      state.runtimeState.playerCurrentHp > 0,
      `${id} a mis les PV a ${state.runtimeState.playerCurrentHp}`,
    );
  }
});
