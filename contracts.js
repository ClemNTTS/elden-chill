/*
 * Contrats de zone : un objectif a la fois, renouvele des qu'il est honore.
 *
 * POURQUOI
 *
 * Le jeu compte 46 biomes, mais la progression est un front qui avance : une
 * zone depassee ne sert plus a rien. Le contenu est construit, paye, puis
 * abandonne derriere le joueur.
 *
 * Un contrat donne une raison d'y retourner. Il ne cree pas de contenu : il
 * rentabilise celui qui existe deja.
 *
 * TROIS RARETES
 *
 *   commune     - quelques minutes, un peu de runes. Le bruit de fond.
 *   rare        - un detour reel, des runes et un objet.
 *   legendaire  - un effort qu'aucune boucle de farm ne remplace, paye en
 *                 objet exclusif et en niveau.
 *
 * La regle qui gouverne les recompenses : un contrat legendaire doit payer en
 * quelque chose que le farm ne donne PAS. Sinon il n'est qu'un raccourci, et
 * le joueur optimal l'ignore pour retourner farmer.
 *
 * CE MODULE NE TOUCHE A RIEN
 *
 * Il ne connait ni le DOM, ni la sauvegarde, ni la boucle de combat : il
 * decrit des contrats, en genere, et calcule des avancements. Le branchement
 * vit dans core.js et actions.js. C'est ce qui le rend entierement testable.
 */

export const RARETES = {
  COMMUNE: "commune",
  RARE: "rare",
  LEGENDAIRE: "legendaire",
};

/*
 * Poids de tirage.
 *
 * Le legendaire est rare sans etre anecdotique : a 8%, un joueur regulier en
 * voit un toutes les deux ou trois sessions, ce qui suffit a en faire un
 * horizon sans en faire une routine.
 */
export const POIDS_RARETE = {
  [RARETES.COMMUNE]: 62,
  [RARETES.RARE]: 30,
  [RARETES.LEGENDAIRE]: 8,
};

/** Reglages par rarete : ampleur de l'objectif et de la recompense. */
export const REGLAGES_RARETE = {
  [RARETES.COMMUNE]: {
    libelle: "Commune",
    facteurObjectif: 1,
    runesParNiveauJoueur: 60,
    donneObjet: false,
    donneNiveau: false,
  },
  [RARETES.RARE]: {
    libelle: "Rare",
    facteurObjectif: 2.5,
    runesParNiveauJoueur: 220,
    donneObjet: true,
    donneNiveau: false,
  },
  [RARETES.LEGENDAIRE]: {
    libelle: "Legendaire",
    facteurObjectif: 5,
    runesParNiveauJoueur: 600,
    donneObjet: true,
    donneNiveau: true,
  },
};

/*
 * Modeles d'objectif.
 *
 * `base` est la quantite demandee pour une rarete commune ; elle est
 * multipliee par le facteur de rarete. `evenement` designe ce que core.js
 * signale : c'est le seul couplage entre ce module et la boucle de jeu.
 *
 * `minRarete` ecarte les objectifs longs des contrats communs : demander cinq
 * boss pour un contrat annonce comme rapide trahirait la promesse de sa
 * rarete.
 */
export const MODELES = [
  {
    id: "chasse",
    evenement: "monstre",
    base: 12,
    minRarete: RARETES.COMMUNE,
    titre: (n, zone) => `Eclaircir ${zone}`,
    texte: (n, zone) => `Abattez ${n} creatures dans ${zone}.`,
  },
  {
    id: "traque_rare",
    evenement: "rare",
    base: 2,
    minRarete: RARETES.COMMUNE,
    titre: (n, zone) => `Traque dans ${zone}`,
    texte: (n, zone) => `Abattez ${n} creatures d'elite dans ${zone}.`,
  },
  {
    id: "cycles",
    evenement: "cycle",
    base: 2,
    minRarete: RARETES.COMMUNE,
    titre: (n, zone) => `Ronde de ${zone}`,
    texte: (n, zone) => `Bouclez ${n} cycles complets dans ${zone}.`,
  },
  {
    id: "boss",
    evenement: "boss",
    base: 1,
    minRarete: RARETES.RARE,
    titre: (n, zone) => `Tete mise a prix : ${zone}`,
    texte: (n, zone) =>
      n > 1
        ? `Abattez ${n} fois le seigneur de ${zone}.`
        : `Abattez le seigneur de ${zone}.`,
  },
  {
    id: "ferveur",
    evenement: "ferveur",
    base: 3,
    minRarete: RARETES.RARE,
    titre: (n, zone) => `Ferveur tenue a ${zone}`,
    texte: (n, zone) =>
      `Atteignez le rang de Ferveur ${n} sans quitter ${zone}.`,
  },
];

const ORDRE_RARETE = [RARETES.COMMUNE, RARETES.RARE, RARETES.LEGENDAIRE];

const rareteSuffisante = (rarete, minimum) =>
  ORDRE_RARETE.indexOf(rarete) >= ORDRE_RARETE.indexOf(minimum);

/** Tirage pondere d'une rarete. `random` est injectable pour les tests. */
export const tirerRarete = (random = Math.random) => {
  const total = Object.values(POIDS_RARETE).reduce((a, b) => a + b, 0);
  let seuil = random() * total;
  for (const [rarete, poids] of Object.entries(POIDS_RARETE)) {
    seuil -= poids;
    if (seuil < 0) return rarete;
  }
  return RARETES.COMMUNE;
};

/** Modeles compatibles avec une rarete donnee. */
export const modelesPour = (rarete) =>
  MODELES.filter((m) => rareteSuffisante(rarete, m.minRarete));

/**
 * Recompense d'un contrat.
 *
 * Les runes suivent le NIVEAU du joueur et non la zone : un contrat honore a
 * bas niveau dans une zone tardive ne doit pas court-circuiter la progression,
 * et un contrat honore a haut niveau dans une zone de depart ne doit pas etre
 * ridicule. C'est precisement ce qui permet aux zones anciennes de rester
 * pertinentes, ce que le systeme cherche a obtenir.
 */
export const calculerRecompense = (
  rarete,
  niveauJoueur = 1,
  objetExclusif = null,
) => {
  const reglages = REGLAGES_RARETE[rarete] || REGLAGES_RARETE[RARETES.COMMUNE];
  const niveau = Math.max(1, Math.floor(niveauJoueur) || 1);
  const objet = reglages.donneObjet ? objetExclusif : null;

  /*
   * Compensation quand aucun objet n'est disponible.
   *
   * Les pieces de contrat sont `isAlwaysMax` : une copie n'apporte rien, donc
   * le tirage ne propose jamais une piece deja possedee. Un joueur qui a tout
   * ramasse verrait alors ses contrats rares et legendaires payer exactement
   * comme des communs — la rarete deviendrait un mot vide.
   *
   * Sa part d'objet est donc rendue en runes, au double du gain de base : ce
   * n'est pas equivalent a une piece exclusive, mais ce n'est pas rien.
   */
  const compense = reglages.donneObjet && !objet;

  return {
    runes: Math.floor(
      reglages.runesParNiveauJoueur * niveau * (compense ? 3 : 1),
    ),
    objet,
    niveau: reglages.donneNiveau ? 1 : 0,
  };
};

/**
 * Genere un contrat.
 *
 * @param {object} options
 * @param {string} options.biomeId            zone visee
 * @param {string} options.nomBiome           son nom lisible
 * @param {number} options.niveauJoueur
 * @param {string[]} options.objetsExclusifs  pool des recompenses d'objet
 * @param {() => number} [options.random]
 */
export const genererContrat = ({
  biomeId,
  nomBiome,
  niveauJoueur = 1,
  objetsExclusifs = [],
  random = Math.random,
} = {}) => {
  if (!biomeId) return null;

  const rarete = tirerRarete(random);
  const candidats = modelesPour(rarete);
  const modele =
    candidats[Math.floor(random() * candidats.length)] || MODELES[0];
  const reglages = REGLAGES_RARETE[rarete];

  const objectif = Math.max(
    1,
    Math.round(modele.base * reglages.facteurObjectif),
  );
  const zone = nomBiome || biomeId;

  /*
   * Le contrat rare puise dans le meme pool exclusif que le legendaire, mais
   * le legendaire y ajoute un niveau : la difference se joue sur le cumul, pas
   * sur deux listes d'objets a maintenir en parallele.
   */
  const objet =
    reglages.donneObjet && objetsExclusifs.length > 0
      ? objetsExclusifs[Math.floor(random() * objetsExclusifs.length)]
      : null;

  return {
    id: `contrat_${Date.now()}_${Math.floor(random() * 1e6)}`,
    modele: modele.id,
    evenement: modele.evenement,
    rarete,
    biomeId,
    nomBiome: zone,
    titre: modele.titre(objectif, zone),
    texte: modele.texte(objectif, zone),
    objectif,
    avancement: 0,
    recompense: calculerRecompense(rarete, niveauJoueur, objet),
    honore: false,
  };
};

/**
 * Fait avancer un contrat sur un evenement.
 *
 * Renvoie un NOUVEL objet plutot que de muter : un contrat deja honore ne doit
 * pas pouvoir l'etre une seconde fois si le meme evenement est notifie deux
 * fois.
 *
 * `quantite` sert aussi aux objectifs qui se mesurent en palier atteint plutot
 * qu'en cumul : la Ferveur notifie son rang courant, pas un increment.
 */
export const avancerContrat = (
  contrat,
  evenement,
  quantite = 1,
  biomeId = null,
) => {
  if (!contrat || contrat.honore) return contrat;
  if (contrat.evenement !== evenement) return contrat;
  // Un contrat est ancre a sa zone : progresser ailleurs n'aurait pas de sens.
  if (biomeId && contrat.biomeId !== biomeId) return contrat;

  const cumul =
    evenement === "ferveur"
      ? Math.max(contrat.avancement, quantite)
      : contrat.avancement + quantite;

  const avancement = Math.min(contrat.objectif, Math.max(0, cumul));
  return {
    ...contrat,
    avancement,
    honore: avancement >= contrat.objectif,
  };
};

/** Part accomplie, entre 0 et 1. */
export const progressionContrat = (contrat) => {
  if (!contrat || !contrat.objectif) return 0;
  return Math.min(1, contrat.avancement / contrat.objectif);
};

/** Normalise un contrat venu d'une sauvegarde, ou null s'il est illisible. */
export const normaliserContrat = (brut) => {
  if (!brut || typeof brut !== "object") return null;
  if (
    typeof brut.biomeId !== "string" ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(brut.biomeId)
  ) {
    return null;
  }

  const objectif = Math.max(1, Math.floor(Number(brut.objectif) || 1));
  const avancement = Math.min(
    objectif,
    Math.max(0, Math.floor(Number(brut.avancement) || 0)),
  );
  const rarete = Object.values(RARETES).includes(brut.rarete)
    ? brut.rarete
    : RARETES.COMMUNE;

  const recompenseBrute = brut.recompense || {};
  return {
    id:
      typeof brut.id === "string"
        ? brut.id.slice(0, 64)
        : `contrat_${Date.now()}`,
    modele: MODELES.some((m) => m.id === brut.modele)
      ? brut.modele
      : MODELES[0].id,
    evenement: typeof brut.evenement === "string" ? brut.evenement : "monstre",
    rarete,
    biomeId: brut.biomeId,
    nomBiome:
      typeof brut.nomBiome === "string"
        ? brut.nomBiome.slice(0, 60)
        : brut.biomeId,
    titre: typeof brut.titre === "string" ? brut.titre.slice(0, 80) : "Contrat",
    texte: typeof brut.texte === "string" ? brut.texte.slice(0, 200) : "",
    objectif,
    avancement,
    recompense: {
      /*
       * Recompenses bornees. Une sauvegarde forgee ne doit pas pouvoir se
       * crediter un milliard de runes ou vingt niveaux : le contrat est le
       * seul endroit du jeu ou un objet de sauvegarde porte directement une
       * quantite a verser.
       */
      runes: Math.min(
        1e9,
        Math.max(0, Math.floor(Number(recompenseBrute.runes) || 0)),
      ),
      objet:
        typeof recompenseBrute.objet === "string" &&
        /^[A-Za-z0-9_-]{1,64}$/.test(recompenseBrute.objet)
          ? recompenseBrute.objet
          : null,
      niveau: Math.min(
        1,
        Math.max(0, Math.floor(Number(recompenseBrute.niveau) || 0)),
      ),
    },
    honore: avancement >= objectif,
  };
};
