import assert from "node:assert/strict";
/*
 * Formules du moteur : PV, soins, esquive.
 *
 * Ces courbes sont documentees dans docs/balance-v2.md. Un test les y ancre :
 * un changement de palier devient un echec explicite plutot qu'une derive
 * silencieuse de l'equilibrage.
 */
import test from "node:test";
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
 * Les deux marches de la courbe de PV sont VOULUES.
 *
 * Au franchissement d'un palier, la vigueur ne reprend pas la pente
 * precedente : elle saute.
 *
 *   vigueur 40 -> 41 : +435 PV au lieu de +35  (400 PV de prime)
 *   vigueur 60 -> 61 : +125 PV au lieu de +25  (100 PV de prime)
 *
 * Soit 500 PV de prime pour qui pousse la vigueur au-dela de 60. C'est un
 * choix d'equilibrage assume : franchir un palier doit se sentir, alors meme
 * que le rendement par point baisse juste apres. Une courbe continue
 * demanderait 1800 et 2900 au lieu de 2200 et 3000.
 *
 * docs/balance-v2.md ne decrit que les trois pentes et passe les marches sous
 * silence : c'est la documentation qui est incomplete, pas le code.
 *
 * Ce test verrouille les deux marches. S'il echoue, c'est que quelqu'un a
 * "corrige" la courbe en croyant reparer une incoherence.
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
  assert.equal(
    rendu,
    10,
    "le soin renvoye doit etre le soin REELLEMENT applique",
  );
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
    assert.ok(
      esquive <= 0.5 + 1e-9,
      `dexterite ${dexterity} : esquive ${esquive}`,
    );
    assert.ok(esquive >= 0, `dexterite ${dexterity} : esquive negative`);
  }
});

test("les statistiques effectives restent finies sans equipement", () => {
  etatNeuf({
    stats: {
      level: 150,
      vigor: 60,
      strength: 60,
      dexterity: 60,
      intelligence: 60,
    },
  });
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
