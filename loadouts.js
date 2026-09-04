/*
 * Panoplies enregistrees : trois emplacements de build, rechargeables d'un clic.
 *
 * POURQUOI
 *
 * Le jeu n'a que trois emplacements d'equipement, mais une trentaine de
 * panoplies et une specialisation par zone qu'il recompense explicitement.
 * Repasser d'un build de statuts a un build tank demandait de traverser
 * l'inventaire et de cliquer objet par objet, a chaque changement de zone.
 *
 * La friction ne rendait pas le choix plus interessant : elle decourageait
 * simplement d'en changer, ce qui va contre ce que le jeu cherche a encourager.
 *
 * CE QUI EST ENREGISTRE
 *
 * L'arme, l'armure, l'accessoire ET la cendre de guerre : c'est le "build" au
 * sens ou le joueur l'entend. La bénédiction et les consommables restent hors
 * du lot, ce sont des choix de depart lies a la destination, pas au build.
 *
 * CE QUI N'EST PAS ENREGISTRE
 *
 * Aucune statistique, aucun niveau. Une panoplie est un raccourci de mise en
 * place, jamais une source de puissance : la recharger doit produire
 * exactement l'etat qu'un joueur patient aurait atteint a la main.
 */

/** Nombre d'emplacements. Trois : au-dela, la liste devient un inventaire bis. */
export const NB_PANOPLIES = 3;

/** Longueur maximale d'un nom, pour que l'affichage tienne sur telephone. */
export const NOM_PANOPLIE_MAX = 18;

const EMPLACEMENTS = ["weapon", "armor", "accessory"];

/** Gabarit d'une panoplie vide. */
export const panoplieVide = (index = 0) => ({
  nom: `Panoplie ${index + 1}`,
  weapon: null,
  armor: null,
  accessory: null,
  ash: null,
  vide: true,
});

/**
 * Normalise la liste des panoplies d'une sauvegarde.
 * Toujours exactement NB_PANOPLIES entrees, meme sur un profil ancien.
 */
export const normaliserPanoplies = (source) => {
  const brut = Array.isArray(source) ? source : [];
  const sortie = [];

  for (let i = 0; i < NB_PANOPLIES; i++) {
    const entree = brut[i];
    if (!entree || typeof entree !== "object") {
      sortie.push(panoplieVide(i));
      continue;
    }

    const propre = panoplieVide(i);
    if (typeof entree.nom === "string" && entree.nom.trim()) {
      propre.nom = entree.nom.trim().slice(0, NOM_PANOPLIE_MAX);
    }
    for (const cle of [...EMPLACEMENTS, "ash"]) {
      const valeur = entree[cle];
      // Meme regle d'identifiant que pour l'inventaire : une sauvegarde n'est
      // pas une entree de confiance.
      propre[cle] =
        typeof valeur === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(valeur)
          ? valeur
          : null;
    }
    propre.vide =
      !propre.weapon && !propre.armor && !propre.accessory && !propre.ash;
    sortie.push(propre);
  }

  return sortie;
};

/** Capture l'equipement courant sous forme de panoplie. */
export const capturerPanoplie = (etat, nom) => ({
  nom: (nom || "").trim().slice(0, NOM_PANOPLIE_MAX) || "Panoplie",
  weapon: etat.equipped?.weapon ?? null,
  armor: etat.equipped?.armor ?? null,
  accessory: etat.equipped?.accessory ?? null,
  ash: etat.equippedAsh ?? null,
  vide: false,
});

/**
 * Ce qu'une panoplie donnerait si on la rechargeait maintenant.
 *
 * Une piece peut avoir ete perdue depuis l'enregistrement — vendue, ou jamais
 * possedee sur une nouvelle partie apres renaissance. On ne recharge que ce
 * qui est reellement disponible, et on dit ce qui manque plutot que d'equiper
 * un identifiant fantome.
 *
 * @param {object} panoplie
 * @param {(id: string) => boolean} possedeObjet
 * @param {(id: string) => boolean} possedeCendre
 */
export const resoudrePanoplie = (panoplie, possedeObjet, possedeCendre) => {
  const applicable = { weapon: null, armor: null, accessory: null, ash: null };
  const manquants = [];

  for (const cle of EMPLACEMENTS) {
    const id = panoplie?.[cle] ?? null;
    if (!id) continue;
    if (possedeObjet(id)) applicable[cle] = id;
    else manquants.push(id);
  }

  const ash = panoplie?.ash ?? null;
  if (ash) {
    if (possedeCendre(ash)) applicable.ash = ash;
    else manquants.push(ash);
  }

  return { applicable, manquants };
};

/** Vrai si la panoplie decrit exactement l'equipement courant. */
export const panoplieEstActive = (panoplie, etat) => {
  if (!panoplie || panoplie.vide) return false;
  return (
    (panoplie.weapon ?? null) === (etat.equipped?.weapon ?? null) &&
    (panoplie.armor ?? null) === (etat.equipped?.armor ?? null) &&
    (panoplie.accessory ?? null) === (etat.equipped?.accessory ?? null) &&
    (panoplie.ash ?? null) === (etat.equippedAsh ?? null)
  );
};
