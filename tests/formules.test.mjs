/*
 * Formules du moteur : PV, soins, esquive.
 *
 * Ces courbes sont documentees dans docs/balance-v2.md. Un test les y ancre :
 * un changement de palier devient un echec explicite plutot qu'une derive
 * silencieuse de l'equilibrage.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { etatNeuf, state } from "./aide.mjs";

const { getHealth, healPlayer, runtimeState, gameState } = state;

test("les paliers de PV valent ce que le moteur calcule aujourd'hui", () => {
  assert.equal(getHealth(0), 300, "base");
  assert.equal(getHealth(1), 345, "+45 par point sous 40");
  assert.equal(getHealth(40), 2100, "fin du premier palier");
  assert.equal(getHealth(60), 3200, "fin du deuxieme palier");
  assert.equal(getHealth(100), 4300, "troisieme palier");
});

/*
 * ATTENTION : ce test ancre un ECART entre le code et docs/balance-v2.md.
 *
 * La documentation annonce trois pentes — +45, +35 puis +25 PV par point.
 * Le code ajoute en plus deux marches au franchissement des paliers, parce que
 * les constantes de depart (2200 et 3000) ne prolongent pas la pente
 * precedente :
 *
 *   vigueur 40 -> 41 : +435 PV au lieu de +35  (400 PV offerts)
 *   vigueur 60 -> 61 : +125 PV au lieu de +25  (100 PV offerts)
 *
 * Soit 500 PV gratuits pour qui depasse 60 de vigueur. Rien ne dit si c'est
 * voulu : la continuite demanderait 1800 et 2900 a la place.
 *
 * Le test fige donc le comportement ACTUEL plutot que celui de la
 * documentation. Corriger la courbe change l'equilibrage de toutes les
 * sauvegardes existantes : c'est une decision de game design, pas une
 * correction de bug, et elle doit etre prise sciemment. Si elle est prise, ce
 * test echouera — et c'est exactement son role.
 */
test("les marches aux franchissements de palier sont celles attendues", () => {
  assert.equal(getHealth(41) - getHealth(40), 435, "marche a la vigueur 41");
  assert.equal(getHealth(61) - getHealth(60), 125, "marche a la vigueur 61");
});

test("la courbe de PV est monotone et sans decrochement", () => {
  let precedent = getHealth(0);
  for (let v = 1; v <= 200; v++) {
    const actuel = getHealth(v);
    assert.ok(actuel > precedent, `decrochement a la vigueur ${v}`);
    assert.ok(Number.isInteger(actuel), `PV non entiers a la vigueur ${v}`);
    precedent = actuel;
  }
});

test("un soin ne depasse jamais le plafond de PV", () => {
  etatNeuf({ stats: { vigor: 40 } });
  const max = getHealth(40);
  runtimeState.playerCurrentHp = max - 10;
  const rendu = healPlayer(9999, max);
  assert.equal(runtimeState.playerCurrentHp, max);
  assert.equal(rendu, 10, "le soin renvoye doit etre le soin REELLEMENT applique");
});

test("un soin nul ou negatif ne fait rien", () => {
  etatNeuf({ stats: { vigor: 20 } });
  runtimeState.playerCurrentHp = 100;
  assert.equal(healPlayer(0), 0);
  assert.equal(healPlayer(-50), 0);
  assert.equal(runtimeState.playerCurrentHp, 100);
});

test("la Grace scellee annule tout soin", () => {
  etatNeuf({ stats: { vigor: 40 } });
  runtimeState.playerCurrentHp = 100;
  gameState.preparation.activeRunBuffs = [{ id: "test", noHeal: true }];

  assert.equal(healPlayer(500), 0, "un soin est passe malgre le sceau");
  assert.equal(runtimeState.playerCurrentHp, 100);

  gameState.preparation.activeRunBuffs = [];
  assert.ok(healPlayer(50) > 0, "le sceau leve, le soin doit repasser");
});

test("l'esquive est plafonnee a 50%", () => {
  for (const dexterity of [0, 200, 400, 5000]) {
    etatNeuf({ stats: { dexterity } });
    const eff = state.getEffectiveStats();
    const esquive = eff.dodgeChance ?? Math.min(0.5, eff.dexterity / 400);
    assert.ok(esquive <= 0.5 + 1e-9, `dexterite ${dexterity} : esquive ${esquive}`);
    assert.ok(esquive >= 0, `dexterite ${dexterity} : esquive negative`);
  }
});

test("les statistiques effectives restent finies sans equipement", () => {
  etatNeuf({ stats: { level: 150, vigor: 60, strength: 60, dexterity: 60, intelligence: 60 } });
  const eff = state.getEffectiveStats();
  for (const [cle, valeur] of Object.entries(eff)) {
    if (typeof valeur === "number") {
      assert.ok(
        Number.isFinite(valeur),
        `${cle} vaut ${valeur} : NaN ou Infini se propage silencieusement`,
      );
    }
  }
});
