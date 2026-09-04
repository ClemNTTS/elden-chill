/*
 * Ferveur : la prime d'escalade des cycles enchaines.
 *
 * POURQUOI CE SYSTEME EXISTE
 *
 * Le jeu annonce comme coeur de sa boucle : "choisir le bon moment pour se
 * replier, au risque de tout perdre". Cette decision avait disparu.
 *
 * Trois mecanismes l'avaient videe de sa substance :
 *   - les runes portees sont encaissees a CHAQUE cycle nettoye, donc on ne
 *     risque jamais que le cycle en cours ;
 *   - `stopAfterCycle` remplace la decision par un nombre tape une fois ;
 *   - `autoRestart` relance seul.
 *
 * Le joueur ne decidait plus quand se replier : il avait regle un curseur deux
 * heures plus tot. Retirer l'automatisation serait une regression de confort.
 * On rend donc le REGLAGE non trivial : il ne doit exister aucune valeur de
 * `stopAfterCycle` qui soit optimale en toutes circonstances.
 *
 * COMMENT
 *
 * Chaque cycle boucle sans repli fait monter la Ferveur d'un rang. Le rang
 * donne une PRIME de runes et de butin, mais durcit les ennemis d'autant.
 *
 * Le point qui fait tout tenir : la prime n'est PAS encaissee cycle par cycle.
 * Elle s'accumule dans une reserve a part, versee au coffre uniquement lors
 * d'un repli VOLONTAIRE, et perdue entierement a la mort. Les runes de base
 * continuent d'etre securisees a chaque cycle : on n'enleve rien au joueur, on
 * ajoute une mise qu'il choisit de laisser sur la table ou d'emporter.
 *
 * Un rang de plus vaut-il le risque ? La reponse depend du build, de la zone
 * et de ce qui est deja en reserve. C'est exactement la question que la boucle
 * avait cesse de poser.
 */

/** Rang maximal. Au-dela, la prime cesse de monter mais pas le danger. */
export const FERVEUR_RANG_MAX = 10;

/** Prime de runes par rang, en plus du gain normal. */
export const FERVEUR_PRIME_PAR_RANG = 0.25;

/*
 * Durcissement des ennemis par rang.
 *
 * Volontairement inferieur a la prime (0.12 contre 0.25) : a rang egal, le
 * joueur gagne plus vite qu'il ne souffre. Sans cela personne ne monterait, et
 * le systeme serait un piege plutot qu'un pari. Le vrai cout n'est pas la
 * difficulte du tour, c'est la reserve qui grossit et qu'on peut perdre.
 */
export const FERVEUR_DANGER_PAR_RANG = 0.12;

/** Rang a partir duquel un tirage de butin supplementaire est garanti. */
export const FERVEUR_RANG_BUTIN = 3;

/** Rang a partir duquel la rarete du butin est poussee. */
export const FERVEUR_RANG_RARETE = 6;

/** Poussee de rarete accordee au-dela de FERVEUR_RANG_RARETE. */
export const FERVEUR_BOOST_RARETE = 0.15;

/**
 * Rang courant, borne. `cycles` est le nombre de cycles bouclés dans la
 * session en cours (runtimeState.currentLoopCount).
 */
export const getFerveurRang = (cycles = 0) =>
  Math.max(0, Math.min(FERVEUR_RANG_MAX, Math.floor(cycles) || 0));

/** Multiplicateur applique a la prime de runes. 1 au rang 0. */
export const getFerveurMultRunes = (cycles = 0) =>
  1 + getFerveurRang(cycles) * FERVEUR_PRIME_PAR_RANG;

/**
 * Multiplicateur de dangerosite des ennemis.
 *
 * Non borne par FERVEUR_RANG_MAX : passe le plafond de prime, le danger
 * continue de monter. Enchainer indefiniment doit finir par couter.
 */
export const getFerveurMultDanger = (cycles = 0) =>
  1 + Math.max(0, Math.floor(cycles) || 0) * FERVEUR_DANGER_PAR_RANG;

/** Tirages de butin supplementaires accordes par la Ferveur. */
export const getFerveurTiragesButin = (cycles = 0) =>
  getFerveurRang(cycles) >= FERVEUR_RANG_BUTIN ? 1 : 0;

/** Poussee de rarete accordee par la Ferveur. */
export const getFerveurBoostRarete = (cycles = 0) =>
  getFerveurRang(cycles) >= FERVEUR_RANG_RARETE ? FERVEUR_BOOST_RARETE : 0;

/**
 * Part de la recompense d'un ennemi qui va dans la reserve fragile.
 *
 * Le gain de base reste securise a chaque cycle : seule la PRIME est en jeu.
 * A rang 4, un ennemi qui donne 100 runes en verse 100 au flux normal et 100
 * de plus dans la reserve.
 */
export const getPrimeFerveur = (runesDeBase, cycles = 0) => {
  const rang = getFerveurRang(cycles);
  if (rang <= 0) return 0;
  return Math.floor(runesDeBase * rang * FERVEUR_PRIME_PAR_RANG);
};

/** Libelle court pour l'interface. */
export const getFerveurLibelle = (cycles = 0) => {
  const rang = getFerveurRang(cycles);
  if (rang <= 0) return "Ferveur : aucune";
  const prime = Math.round((getFerveurMultRunes(cycles) - 1) * 100);
  const danger = Math.round((getFerveurMultDanger(cycles) - 1) * 100);
  return `Ferveur ${rang} · +${prime}% de prime · +${danger}% de menace`;
};
