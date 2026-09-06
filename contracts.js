import { FERVEUR_RANG_MAX } from "./escalation.js";

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

/*
 * Filtres.
 *
 * Un filtre restreint ce qui fait avancer un contrat. Il n'ajoute AUCUN
 * evenement : core.js signale ce qu'il signalait deja, en y joignant des
 * etiquettes, et avancerContrat n'accepte l'evenement que si l'etiquette
 * demandee est presente.
 *
 * C'est ce qui permet a quatre nouveaux modeles de tenir sans quatre nouveaux
 * branchements dans la boucle de jeu — le couplage avec core.js reste une
 * poignee de chaines de caracteres.
 */
export const FILTRES = {
  // Butin, par rarete de l'objet tombe.
  RARE: "rare",
  LEGENDAIRE: "legendaire",
  // Archetypes d'ennemis.
  AFFLICTION: "affliction",
  MEUTE: "meute",
  RAPIDE: "rapide",
  // Maniere de boucler un cycle.
  SANS_CENDRE: "sans_cendre",
};

/*
 * Correction d'ampleur par filtre.
 *
 * Tous les filtres ne se valent pas en frequence. Un objet legendaire ne tombe
 * pas au meme rythme qu'un objet rare : sans correction, le contrat
 * « depeceur » legendaire demandait 15 objets legendaires, ce qui n'est pas un
 * objectif mais une retraite.
 *
 * Le facteur multiplie l'objectif APRES la rarete du contrat, et le plancher
 * de 1 s'applique ensuite : un contrat ne demande jamais zero.
 */
export const FACTEUR_FILTRE = {
  legendaire: 0.25,
};

/** Libelle lisible d'un filtre, pour le texte du contrat. */
export const LIBELLE_FILTRE = {
  [FILTRES.RARE]: "rares",
  [FILTRES.LEGENDAIRE]: "legendaires",
  [FILTRES.AFFLICTION]: "porteuses d'affliction",
  [FILTRES.MEUTE]: "en meute",
  [FILTRES.RAPIDE]: "a attaques multiples",
  [FILTRES.SANS_CENDRE]: "sans cendre",
};

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
    base: 2,
    minRarete: RARETES.RARE,
    /*
     * Un objectif de Ferveur ne peut pas depasser le rang maximum.
     *
     * Sans ce plafond, le contrat legendaire demandait 3 x 5 = 15 alors que
     * getFerveurRang() borne le rang a FERVEUR_RANG_MAX (10) : l'objectif etait
     * litteralement impossible a honorer, et le contrat le plus rare du jeu
     * etait le seul a ne jamais pouvoir tomber. Rien ne le signalait, puisque
     * la barre montait normalement jusqu'a 10 avant de se figer.
     *
     * La base descend de 3 a 2 pour que le plafond ne vienne pas ecraser la
     * difference entre rare et legendaire : 5 contre 10, au lieu de 8 contre 10.
     */
    plafond: FERVEUR_RANG_MAX,
    titre: (n, zone) => `Ferveur tenue a ${zone}`,
    texte: (n, zone) =>
      `Atteignez le rang de Ferveur ${n} sans quitter ${zone}.`,
  },

  /* ---------------------------------------------------------------- *
   * Modeles qui demandent de jouer AUTREMENT, et pas plus longtemps.  *
   *                                                                  *
   * Les cinq modeles ci-dessus sont des compteurs : tuez N, bouclez   *
   * N. Le joueur ne fait rien de different, il fait la meme chose en  *
   * regardant une barre. Ceux qui suivent posent une contrainte sur   *
   * la maniere, ce qui est la seule chose qu'une boucle de farm ne    *
   * sait pas produire toute seule.                                    *
   * ---------------------------------------------------------------- */

  {
    /*
     * Le pari de la Ferveur, applique au contrat lui-meme : une seule mort
     * remet le compteur a zero. `annuleSur` est lu par avancerContrat.
     */
    id: "sans_mort",
    evenement: "cycle",
    annuleSur: "mort",
    base: 3,
    minRarete: RARETES.RARE,
    titre: (n, zone) => `Sans y laisser de plumes : ${zone}`,
    texte: (n, zone) =>
      `Bouclez ${n} cycles d'affilee dans ${zone} sans mourir. Une seule mort remet le compte a zero.`,
  },
  {
    /*
     * Prive le joueur de son outil de confort. Aucun evenement neuf : core.js
     * etiquette le cycle « sans_cendre » quand aucune cendre n'a ete activee.
     */
    id: "sans_cendre",
    evenement: "cycle",
    filtre: FILTRES.SANS_CENDRE,
    base: 2,
    minRarete: RARETES.COMMUNE,
    titre: (n, zone) => `Discipline a ${zone}`,
    texte: (n, zone) =>
      `Bouclez ${n} cycles dans ${zone} sans activer une seule cendre de guerre.`,
  },
  {
    id: "depeceur",
    evenement: "butin",
    filtres: [FILTRES.RARE, FILTRES.LEGENDAIRE],
    base: 3,
    minRarete: RARETES.COMMUNE,
    titre: (n, zone) => `Depecage a ${zone}`,
    texte: (n, zone, filtre) =>
      `Faites tomber ${n} objets ${LIBELLE_FILTRE[filtre]} dans ${zone}.`,
  },
  {
    id: "purge",
    evenement: "monstre",
    filtres: [FILTRES.AFFLICTION, FILTRES.MEUTE, FILTRES.RAPIDE],
    base: 8,
    minRarete: RARETES.COMMUNE,
    titre: (n, zone) => `Purge de ${zone}`,
    texte: (n, zone, filtre) =>
      `Abattez ${n} creatures ${LIBELLE_FILTRE[filtre]} dans ${zone}.`,
  },
];

/*
 * Echeance.
 *
 * Un contrat a echeance doit etre honore en un nombre de cycles donne — tous
 * biomes confondus, sinon il suffirait de ne plus jamais mettre les pieds dans
 * la zone pour figer le compte. C'est la seule tension du systeme : sans elle,
 * un contrat attend indefiniment et ne coute jamais rien de l'ignorer.
 *
 * Reserve aux raretes qui paient assez pour qu'un echec se sente, et paye plus
 * cher : on demande au joueur de changer ses plans, pas de subir un minuteur.
 */
export const CHANCE_ECHEANCE = 0.35;
export const CYCLES_ECHEANCE = { [RARETES.RARE]: 12, [RARETES.LEGENDAIRE]: 20 };
export const PRIME_ECHEANCE = 1.5;

/*
 * Chaine.
 *
 * Trois contrats lies, dans trois zones differentes, et une prime versee au
 * bout. C'est ce qui donne enfin au legendaire une raison d'etre LONG plutot
 * que gros : un contrat qui demande simplement cinq fois plus de la meme chose
 * n'est pas un objectif, c'est le meme objectif avec un zero de plus.
 *
 * Techniquement ce n'est pas un systeme a part : c'est un champ porte par le
 * contrat actif. Chaque etape honoree en genere une autre au lieu de liberer
 * l'emplacement.
 */
export const CHANCE_CHAINE = 0.5;
export const ETAPES_CHAINE = 3;
export const PRIME_CHAINE = 3;

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
  chaineHeritee = null,
  random = Math.random,
} = {}) => {
  if (!biomeId) return null;

  // Une etape de chaine reste legendaire de bout en bout : retirer la rarete
  // en cours de route reviendrait a degrader la promesse apres coup.
  const rarete = chaineHeritee ? RARETES.LEGENDAIRE : tirerRarete(random);
  const candidats = modelesPour(rarete);
  const modele =
    candidats[Math.floor(random() * candidats.length)] || MODELES[0];
  const reglages = REGLAGES_RARETE[rarete];

  const zone = nomBiome || biomeId;

  /*
   * Filtre : fixe sur le modele (sans_cendre) ou tire parmi une liste
   * (depeceur, purge). Le tirage est fige ICI et non relu a chaque
   * progression : sinon un contrat changerait de cible en cours de route.
   */
  const filtre =
    modele.filtre ??
    (modele.filtres?.length
      ? modele.filtres[Math.floor(random() * modele.filtres.length)]
      : null);

  const objectif = Math.min(
    modele.plafond ?? Number.POSITIVE_INFINITY,
    Math.max(
      1,
      Math.round(
        modele.base * reglages.facteurObjectif * (FACTEUR_FILTRE[filtre] ?? 1),
      ),
    ),
  );

  /*
   * Le contrat rare puise dans le meme pool exclusif que le legendaire, mais
   * le legendaire y ajoute un niveau : la difference se joue sur le cumul, pas
   * sur deux listes d'objets a maintenir en parallele.
   */
  const objet =
    reglages.donneObjet && objetsExclusifs.length > 0
      ? objetsExclusifs[Math.floor(random() * objetsExclusifs.length)]
      : null;

  const aEcheance =
    CYCLES_ECHEANCE[rarete] !== undefined && random() < CHANCE_ECHEANCE;
  const echeance = aEcheance ? CYCLES_ECHEANCE[rarete] : 0;

  /*
   * Une chaine ne demarre que sur un legendaire, et jamais par-dessus une
   * chaine deja en cours : `chaineHeritee` porte l'etape suivante quand
   * etapeSuivanteChaine() nous rappelle.
   */
  const chaine =
    chaineHeritee ||
    (rarete === RARETES.LEGENDAIRE && random() < CHANCE_CHAINE
      ? { rang: 1, sur: ETAPES_CHAINE }
      : null);

  const recompense = calculerRecompense(rarete, niveauJoueur, objet);
  if (echeance > 0) {
    recompense.runes = Math.floor(recompense.runes * PRIME_ECHEANCE);
  }

  return {
    id: `contrat_${Date.now()}_${Math.floor(random() * 1e6)}`,
    modele: modele.id,
    evenement: modele.evenement,
    filtre,
    annuleSur: modele.annuleSur || null,
    rarete,
    biomeId,
    nomBiome: zone,
    titre: modele.titre(objectif, zone, filtre),
    texte: modele.texte(objectif, zone, filtre),
    objectif,
    avancement: 0,
    echeance,
    cyclesRestants: echeance,
    expire: false,
    chaine,
    recompense,
    honore: false,
  };
};

/*
 * Etape suivante d'une chaine.
 *
 * Appelee a la reclamation d'une etape qui n'est pas la derniere. La zone
 * change : une chaine qui se deroulerait sur place ne serait qu'un contrat
 * decoupe en trois.
 */
export const etapeSuivanteChaine = (contrat, options = {}) => {
  const chaine = contrat?.chaine;
  if (!chaine || chaine.rang >= chaine.sur) return null;

  return genererContrat({
    ...options,
    chaineHeritee: { rang: chaine.rang + 1, sur: chaine.sur },
  });
};

/** Prime versee a l'achevement de la derniere etape d'une chaine. */
export const primeDeChaine = (contrat) => {
  const chaine = contrat?.chaine;
  if (!chaine || chaine.rang < chaine.sur) return 0;
  return Math.floor((contrat.recompense?.runes || 0) * PRIME_CHAINE);
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
  etiquettes = [],
) => {
  if (!contrat || contrat.honore || contrat.expire) return contrat;

  /*
   * Annulation avant tout le reste, et sans condition de zone : mourir annule
   * un contrat « sans mourir », y compris si la mort survient ailleurs. C'est
   * le sens meme de la promesse.
   */
  if (contrat.annuleSur && contrat.annuleSur === evenement) {
    return { ...contrat, avancement: 0 };
  }

  if (contrat.evenement !== evenement) return contrat;
  // Un contrat est ancre a sa zone : progresser ailleurs n'aurait pas de sens.
  if (biomeId && contrat.biomeId !== biomeId) return contrat;
  // Filtre : seul un evenement portant la bonne etiquette compte.
  if (contrat.filtre && !etiquettes.includes(contrat.filtre)) return contrat;

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
/*
 * Un cycle de plus s'est ecoule : on decompte l'echeance.
 *
 * Appele pour TOUT cycle, quelle que soit la zone. Ancrer le decompte a la
 * zone du contrat viderait la mecanique de son sens : il suffirait d'aller
 * farmer ailleurs pour suspendre le minuteur.
 *
 * Un contrat deja honore ne peut plus expirer : le joueur a tenu, la
 * recompense l'attend au camp aussi longtemps qu'il le faut.
 */
export const ecoulerEcheance = (contrat) => {
  if (!contrat || !contrat.echeance || contrat.honore || contrat.expire) {
    return contrat;
  }

  const restants = Math.max(0, (contrat.cyclesRestants ?? 0) - 1);
  return { ...contrat, cyclesRestants: restants, expire: restants === 0 };
};

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

  // Echeance et chaine, bornees : une sauvegarde forgee ne doit pas pouvoir
  // s'offrir une chaine de mille etapes ni un minuteur infini.
  const echeance = Math.min(
    999,
    Math.max(0, Math.floor(Number(brut.echeance) || 0)),
  );
  const cyclesRestants = Math.floor(
    Number(brut.cyclesRestants ?? echeance) || 0,
  );
  const chaineBrute = brut.chaine;
  const chaine =
    chaineBrute && typeof chaineBrute === "object"
      ? (() => {
          const sur = Math.min(
            10,
            Math.max(1, Math.floor(Number(chaineBrute.sur) || ETAPES_CHAINE)),
          );
          return {
            rang: Math.min(
              sur,
              Math.max(1, Math.floor(Number(chaineBrute.rang) || 1)),
            ),
            sur,
          };
        })()
      : null;
  return {
    id:
      typeof brut.id === "string"
        ? brut.id.slice(0, 64)
        : `contrat_${Date.now()}`,
    modele: MODELES.some((m) => m.id === brut.modele)
      ? brut.modele
      : MODELES[0].id,
    evenement: typeof brut.evenement === "string" ? brut.evenement : "monstre",
    // Les champs de filtrage viennent d'une sauvegarde : on n'accepte que des
    // valeurs du catalogue, jamais une chaine libre.
    filtre: Object.values(FILTRES).includes(brut.filtre) ? brut.filtre : null,
    annuleSur: typeof brut.annuleSur === "string" ? brut.annuleSur : null,
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
    echeance,
    cyclesRestants: Math.min(echeance, Math.max(0, cyclesRestants)),
    expire: echeance > 0 && cyclesRestants <= 0 && avancement < objectif,
    chaine,
    honore: avancement >= objectif,
  };
};
