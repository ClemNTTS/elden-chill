/*
 * Cadence de l'expedition, et depense du temps hors ligne.
 *
 * DEUX COPIES, UN SEUL COMPTEUR
 *
 * `delayedSetTimeout` existait a l'identique dans core.js et dans combat.js.
 * La boucle d'expedition alterne entre les deux, donc deux compteurs de retard
 * separes n'auraient jamais vu passer plus d'une etape sur deux : le
 * rattrapage ci-dessous n'a de sens que partage.
 *
 * LE TEMPS HORS LIGNE
 *
 * La banque accelere le jeu d'un facteur M : pour une seconde de temps reel on
 * avance de M secondes de jeu et on paie les M-1 secondes gagnees. A M = 3,
 * une heure de banque tient donc trente minutes de temps REEL, pendant
 * lesquelles le jeu avance d'une heure trente. Le compteur seul se lisant
 * comme une duree de jeu, l'interface annonce les deux chiffres.
 *
 * LE RATTRAPAGE
 *
 * L'acceleration raccourcissait simplement les minuteurs : 800 ms devenaient
 * 266 ms. Or un navigateur PLAFONNE les minuteurs a une seconde dans un onglet
 * d'arriere-plan. Dans le cas meme ou le temps hors ligne sert le plus — on
 * lance une expedition et on va faire autre chose — les 266 ms devenaient
 * 1000 ms : le jeu tournait quatre fois moins vite que prevu, et la banque
 * semblait fondre sans rien produire.
 *
 * On mesure donc le RETARD reel de chaque reveil. Quand il depasse le seuil de
 * bruit, il est mis de cote, et les etapes suivantes s'executent sans repasser
 * par un minuteur tant que cette dette n'est pas epongee — plusieurs etapes par
 * reveil, ce qui est la seule facon de rattraper quand le navigateur refuse de
 * nous reveiller plus souvent qu'une fois par seconde.
 */
import { gameState, runtimeState } from "./state.js";

/*
 * En dessous de ce retard, on ne compte rien.
 *
 * Un minuteur normal se reveille avec quelques millisecondes de retard. Les
 * accumuler ferait gagner des etapes gratuites a un joueur dont l'onglet est
 * au premier plan, c'est-a-dire accelererait le jeu au-dela du facteur annonce.
 * Cinquante millisecondes laissent passer la gigue ordinaire et retiennent le
 * plafonnement d'arriere-plan, qui se compte en centaines.
 */
const SEUIL_RETARD_MS = 50;

/*
 * Dette maximale, et nombre d'etapes enchainees sans minuteur.
 *
 * Un onglet laisse en arriere-plan pendant dix minutes accumulerait sinon dix
 * minutes de dette, et les rejouerait d'un bloc au retour : le jeu se figerait
 * le temps de tout derouler. On rattrape vite, pas indefiniment.
 */
const DETTE_MAX_MS = 5000;
const ETAPES_ENCHAINEES_MAX = 40;

let detteMs = 0;
let etapesEnchainees = 0;

/*
 * Rafraichissement de l'interface, injecte.
 *
 * Ce module ne peut pas importer ui.js : ui.js importe core.js, qui importe
 * ce module. La dependance est donc posee au demarrage, dans game.js.
 */
let rafraichir = () => {};

/** Branche le rafraichissement de l'interface apres une depense. */
export const setRafraichissementTempo = (fn) => {
  rafraichir = typeof fn === "function" ? fn : () => {};
};

/** Remet le rattrapage a zero. A appeler quand une expedition demarre. */
export const reinitialiserRattrapage = () => {
  detteMs = 0;
  etapesEnchainees = 0;
};

/** Pour les tests et le diagnostic. */
export const etatDuRattrapage = () => ({ detteMs, etapesEnchainees });

/**
 * Delai a appliquer, et depense de la banque correspondante.
 *
 * Sortie separee de l'ordonnancement pour rester testable hors navigateur :
 * c'est ici que vit la regle, `delayedSetTimeout` ne fait que la poser sur un
 * minuteur.
 */
export const calculerDelai = (ms) => {
  const save = gameState.save || {};
  const actif =
    save.useOfflineTime &&
    (save.offlineTimeBank || 0) > 0 &&
    gameState.world?.isExploring;
  const M = runtimeState.offlineSpeedMultiplier || 3;

  if (!actif || M <= 1 || ms <= 0) return { delai: ms, depense: 0 };

  const gainMs = Math.max(0, ms - Math.floor(ms / M));
  const banqueMs = (save.offlineTimeBank || 0) * 1000;

  if (banqueMs >= gainMs) {
    save.offlineTimeBank = Math.max(
      0,
      (save.offlineTimeBank || 0) - gainMs / 1000,
    );
    return { delai: Math.max(0, Math.floor(ms / M)), depense: gainMs };
  }

  // Il ne reste pas de quoi payer l'acceleration entiere : on prend ce qui
  // reste et la banque tombe a zero.
  save.offlineTimeBank = 0;
  return { delai: Math.max(0, Math.floor(ms - banqueMs)), depense: banqueMs };
};

/**
 * Minuteur de la boucle d'expedition.
 *
 * Renvoie l'identifiant du minuteur, ou 0 quand l'etape a ete enchainee sans
 * minuteur au titre du rattrapage.
 */
export const delayedSetTimeout = (fn, ms) => {
  let delai = ms;
  try {
    const { delai: calcule, depense } = calculerDelai(ms);
    delai = calcule;
    if (depense > 0) {
      try {
        rafraichir();
      } catch {}
    }
  } catch (e) {
    console.warn("delayedSetTimeout error:", e);
  }

  /*
   * Rattrapage : le navigateur nous a deja fait attendre plus que prevu, on
   * ne repasse pas par un minuteur qu'il plafonnerait a nouveau.
   */
  if (detteMs >= delai && etapesEnchainees < ETAPES_ENCHAINEES_MAX) {
    detteMs -= delai;
    etapesEnchainees += 1;
    queueMicrotask(fn);
    return 0;
  }

  etapesEnchainees = 0;
  const demandeA = Date.now();
  return setTimeout(() => {
    const retard = Date.now() - demandeA - delai;
    if (retard > SEUIL_RETARD_MS) {
      detteMs = Math.min(DETTE_MAX_MS, detteMs + retard);
    }
    fn();
  }, delai);
};
