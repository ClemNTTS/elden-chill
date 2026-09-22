import assert from "node:assert/strict";
/*
 * Depense du temps hors ligne.
 *
 * La regle : a l'acceleration M, une seconde de temps reel fait avancer le jeu
 * de M secondes et coute M-1 secondes de banque. Une heure de banque tient
 * donc trente minutes reelles a M = 3, et non une heure — d'ou l'impression
 * qu'elle "fond" quand on ne connait pas le taux.
 */
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { calculerDelai } = await import("../tempo.js");

const enExpedition = (banque, { actif = true, M = 3 } = {}) => {
  const partie = etatNeuf();
  partie.world.isExploring = true;
  partie.save.useOfflineTime = actif;
  partie.save.offlineTimeBank = banque;
  state.runtimeState.offlineSpeedMultiplier = M;
  return partie;
};

test("sans temps hors ligne, le delai n'est pas touche", () => {
  enExpedition(3600, { actif: false });
  assert.deepEqual(calculerDelai(900), { delai: 900, depense: 0 });
});

test("hors expedition, la banque ne se depense pas", () => {
  const partie = enExpedition(3600);
  partie.world.isExploring = false;
  assert.deepEqual(calculerDelai(900), { delai: 900, depense: 0 });
  assert.equal(partie.save.offlineTimeBank, 3600);
});

test("l'acceleration divise le delai et facture le temps gagne", () => {
  const partie = enExpedition(3600);
  const { delai, depense } = calculerDelai(900);
  assert.equal(delai, 300);
  assert.equal(depense, 600);
  assert.equal(partie.save.offlineTimeBank, 3600 - 0.6);
});

test("une heure de banque tient une demi-heure de temps reel", () => {
  /*
   * C'est LE chiffre que l'interface doit annoncer : le compteur se lit comme
   * une duree de jeu alors qu'il paie l'ecart entre jeu et temps reel.
   */
  const partie = enExpedition(3600);
  let reelMs = 0;
  // On deroule des etapes de 900 ms de jeu jusqu'a epuisement.
  while (partie.save.offlineTimeBank > 0 && reelMs < 4 * 3600 * 1000) {
    reelMs += calculerDelai(900).delai;
  }
  const reelMinutes = reelMs / 60000;
  assert.ok(
    reelMinutes > 29 && reelMinutes < 31,
    `la banque a tenu ${reelMinutes.toFixed(1)} minutes reelles`,
  );
});

test("le dernier reliquat de banque est consomme sans jamais passer sous zero", () => {
  const partie = enExpedition(0.1);
  const { delai, depense } = calculerDelai(900);
  assert.equal(partie.save.offlineTimeBank, 0);
  assert.equal(depense, 100);
  // Le delai n'est raccourci que de ce que la banque pouvait payer.
  assert.equal(delai, 800);
});

test("une banque vide laisse le jeu a sa vitesse normale", () => {
  enExpedition(0);
  assert.deepEqual(calculerDelai(900), { delai: 900, depense: 0 });
});

test("un multiplicateur a 1 ne facture rien", () => {
  const partie = enExpedition(3600, { M: 1 });
  assert.deepEqual(calculerDelai(900), { delai: 900, depense: 0 });
  assert.equal(partie.save.offlineTimeBank, 3600);
});

/*
 * Rattrapage du plafonnement d'arriere-plan.
 *
 * L'acceleration se contentait de raccourcir les minuteurs : 800 ms devenaient
 * 266 ms. Or un navigateur plafonne les minuteurs a une seconde dans un onglet
 * d'arriere-plan — c'est-a-dire exactement dans le cas ou le temps hors ligne
 * sert le plus. Les 266 ms devenaient 1000 ms, le jeu tournait quatre fois
 * moins vite que promis, et la banque semblait fondre pour rien.
 *
 * Ces cas rejouent un navigateur qui ne reveille jamais avant une seconde.
 */
test("un reveil en retard fait enchainer les etapes suivantes sans minuteur", async () => {
  const { delayedSetTimeout, reinitialiserRattrapage } = await import(
    "../tempo.js"
  );
  enExpedition(3600);
  reinitialiserRattrapage();

  const vraiSetTimeout = globalThis.setTimeout;
  const vraiDateNow = Date.now;
  let horloge = 1_000_000;
  let poses = 0;
  // Navigateur d'arriere-plan : tout minuteur attend une seconde pleine.
  globalThis.setTimeout = (fn) => {
    poses += 1;
    horloge += 1000;
    vraiSetTimeout(fn, 0);
    return poses;
  };
  Date.now = () => horloge;

  try {
    let etapes = 0;
    await new Promise((resolve) => {
      const etape = () => {
        etapes += 1;
        if (etapes >= 12) return resolve();
        delayedSetTimeout(etape, 800);
      };
      delayedSetTimeout(etape, 800);
    });

    /*
     * Douze etapes de 800 ms, accelerees a 266 ms, tiennent dans environ trois
     * secondes de temps reel. Sans rattrapage il aurait fallu douze minuteurs,
     * donc douze secondes : le jeu aurait avance quatre fois moins vite que
     * la banque ne le facturait.
     */
    assert.ok(poses < 6, `${poses} minuteurs poses pour 12 etapes`);
  } finally {
    globalThis.setTimeout = vraiSetTimeout;
    Date.now = vraiDateNow;
    reinitialiserRattrapage();
  }
});

test("un reveil a l'heure n'offre aucune etape gratuite", async () => {
  const { delayedSetTimeout, reinitialiserRattrapage, etatDuRattrapage } =
    await import("../tempo.js");
  enExpedition(3600);
  reinitialiserRattrapage();

  const vraiSetTimeout = globalThis.setTimeout;
  const vraiDateNow = Date.now;
  let horloge = 1_000_000;
  let poses = 0;
  // Premier plan : le minuteur se reveille avec quelques millisecondes de
  // gigue, sous le seuil de bruit.
  globalThis.setTimeout = (fn, ms) => {
    poses += 1;
    horloge += ms + 3;
    vraiSetTimeout(fn, 0);
    return poses;
  };
  Date.now = () => horloge;

  try {
    let etapes = 0;
    await new Promise((resolve) => {
      const etape = () => {
        etapes += 1;
        if (etapes >= 12) return resolve();
        delayedSetTimeout(etape, 800);
      };
      delayedSetTimeout(etape, 800);
    });

    // Une etape, un minuteur : la gigue ordinaire ne doit pas accelerer le jeu
    // au-dela du facteur annonce.
    assert.equal(poses, 12);
    assert.equal(etatDuRattrapage().detteMs, 0);
  } finally {
    globalThis.setTimeout = vraiSetTimeout;
    Date.now = vraiDateNow;
    reinitialiserRattrapage();
  }
});
