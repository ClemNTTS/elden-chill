/*
 * Comportements de seconde phase des boss.
 *
 * CE QUI EXISTAIT, ET POURQUOI CE N'ETAIT PAS SUFFISANT
 *
 * Une seconde phase se resumait a trois champs poses sur la fiche du monstre :
 * `dmgMultPhase2`, `dodgePhase2`, `effectsPhase2`. Le boss ne changeait pas de
 * comportement, il changeait de NOMBRES — il tapait plus fort, et c'est tout.
 * Franchir le seuil ne se voyait que sur la barre de vie du joueur.
 *
 * Le controle lui-meme etait ecrit DEUX FOIS dans performAttack, avec deux
 * implementations divergentes : la seconde ignorait l'esquive et le changement
 * d'affliction. Elle ne s'executait jamais — la premiere posait le drapeau —
 * mais elle etait la, prete a etre modifiee seule.
 *
 * LA CONTRAINTE QUI GOUVERNE CE MODULE
 *
 * Le coeur du jeu est de tourner seul : le joueur lance une expedition et la
 * laisse boucler. Un comportement de boss ne doit donc JAMAIS demander une
 * reaction — il n'y a personne devant l'ecran pour la donner.
 *
 * Chaque comportement ci-dessous se repond par un BUILD, jamais par un
 * reflexe : la carapace se perce a la Force, la regeneration se bat aux
 * degats, la malediction se bloque aux resistances, l'invocation se balaie
 * aux degats de zone. Un joueur absent perd parce que sa preparation etait
 * mauvaise, pas parce qu'il n'a pas clique.
 *
 * CE MODULE NE TOUCHE A RIEN
 *
 * Il ne connait ni le DOM, ni le journal de combat, ni l'etat global. Il decrit
 * des comportements et renvoie ce qu'il faudrait faire ; combat.js l'applique.
 * C'est ce qui le rend entierement testable.
 */

/*
 * Registre des comportements.
 *
 *   surEntree(ennemi)          au franchissement du seuil, une seule fois
 *   surTour(ennemi, joueur)    a chaque tour de l'ennemi
 *   surDegatsSubis(e, degats)  quand l'ennemi encaisse
 *
 * Chacun renvoie une action, jamais un effet de bord sur le monde :
 *   { msg, healAmount, effets, drain, invocations, renvoi }
 */
export const COMPORTEMENTS = {
  /*
   * Se soigne chaque tour. Transforme le combat en course : soit vos degats
   * depassent sa regeneration, soit vous n'y arriverez jamais, quel que soit
   * le temps passe. C'est le comportement qui punit le plus franchement un
   * build sous-dimensionne — et il le dit tout de suite.
   */
  regeneration: {
    libelle: "Regeneration",
    description: "Recouvre une part de ses points de vie a chaque tour.",
    surTour: (ennemi) => {
      const part = ennemi.phaseRegen ?? 0.04;
      const soin = Math.floor((ennemi.maxHp || 0) * part);
      if (soin <= 0) return null;
      return { healAmount: soin, msg: ennemi.name + " referme ses plaies." };
    },
  },

  /*
   * Double son armure. Se perce a la Force, seule statistique a donner de la
   * penetration — c'est precisement le levier que rien d'autre ne touche, et
   * ce comportement lui donne enfin un moment ou il est indispensable.
   */
  carapace: {
    libelle: "Carapace",
    description: "Son armure double : seule la penetration la traverse.",
    surEntree: (ennemi) => {
      ennemi.armor = Math.floor((ennemi.armor || 100) * 2);
      return { msg: ennemi.name + " se cuirasse." };
    },
  },

  /*
   * Attaque une fois de plus par tour. Se repond en vigueur et en armure : ce
   * n'est pas le coup qui grossit, c'est leur nombre.
   */
  frenesie: {
    libelle: "Frenesie",
    description: "Frappe une fois de plus a chaque tour.",
    surEntree: (ennemi) => {
      if (!ennemi.specificStats) ennemi.specificStats = {};
      ennemi.specificStats.attacksPerTurn =
        (ennemi.specificStats.attacksPerTurn || 1) + 1;
      return { msg: ennemi.name + " accelere, et ne s'arrete plus." };
    },
  },

  /*
   * Se soigne d'une part des degats qu'il inflige. Se repond a l'esquive et a
   * l'armure : ce qui ne passe pas ne le nourrit pas.
   */
  drain: {
    libelle: "Drain",
    description: "Se nourrit d'une part des degats qu'il inflige.",
    surTour: (ennemi) => ({
      drain: ennemi.phaseDrain ?? 0.35,
      msg: ennemi.name + " cherche a boire votre vie.",
    }),
  },

  /*
   * Impose un statut chaque tour. Se repond aux resistances — les quatre
   * existent deja sur les objets et personne n'a de raison de les monter.
   * En voici une.
   */
  malediction: {
    libelle: "Malediction",
    description: "Impose une affliction a chaque tour.",
    surTour: (ennemi) => {
      const effet = ennemi.phaseMalediction;
      if (!effet?.id) return null;
      return {
        effets: [{ id: effet.id, duree: effet.duration ?? 2 }],
        msg: ennemi.name + " vous marque.",
      };
    },
  },

  /*
   * Renvoie une part des degats subis, PLAFONNEE et jamais mortelle.
   *
   * Le plafond n'est pas une precaution timide : sans lui, un build critique
   * se tuerait sur son propre coup le plus fort, ce qui punirait exactement
   * l'investissement que le jeu recompense partout ailleurs. Ce comportement
   * doit faire reflechir a la cadence, pas interdire les gros coups.
   */
  riposte: {
    libelle: "Riposte",
    description: "Renvoie une part des degats recus.",
    surDegatsSubis: (ennemi, degats) => {
      const part = ennemi.phaseRiposte ?? 0.15;
      const plafond = Math.floor((ennemi.maxHp || 0) * 0.02);
      const renvoi = Math.min(Math.floor(degats * part), plafond);
      if (renvoi <= 0) return null;
      return {
        renvoi,
        msg: "Les epines de " + ennemi.name + " vous entaillent.",
      };
    },
  },

  /*
   * Se dedouble en echos affaiblis.
   *
   * Les echos sont des copies degradees du boss lui-meme, pas des creatures
   * tirees d'ailleurs : aucune table a maintenir, aucune surprise
   * d'equilibrage, et l'ecran reste lisible. Se balaie aux degats de zone, qui
   * n'ont jamais eu de moment ou ils sont indispensables.
   */
  invocation: {
    libelle: "Invocation",
    description: "Se dedouble en echos affaiblis.",
    surEntree: (ennemi) => {
      const nombre = ennemi.phaseInvocations ?? 2;
      const part = ennemi.phasePuissanceEcho ?? 0.25;
      const echos = [];

      for (let i = 0; i < nombre; i += 1) {
        const pv = Math.max(1, Math.floor((ennemi.maxHp || 1) * part));
        echos.push({
          ...ennemi,
          name: "Echo de " + ennemi.name,
          hp: pv,
          maxHp: pv,
          atk: Math.max(1, Math.floor((ennemi.atk || 1) * part)),
          runes: Math.floor((ennemi.runes || 0) * part),
          /*
           * Un echo n'est ni un boss ni une elite : il ne doit pas faire
           * avancer un contrat de boss, ni declencher sa propre seconde phase,
           * ni laisser tomber le butin du boss. Sans ces quatre lignes, un
           * boss qui se dedouble multiplierait ses drops par trois.
           */
          isBoss: false,
          isRare: false,
          hasSecondPhase: false,
          phase2: null,
          isInSecondPhase: true,
          drops: [],
          comportementsActifs: [],
        });
      }

      return { invocations: echos, msg: ennemi.name + " se dedouble !" };
    },
  },

  /*
   * Change d'affliction. Une resistance unique et bien choisie cesse de
   * suffire : il faut en couvrir deux.
   */
  mue: {
    libelle: "Mue",
    description: "Change l'affliction qu'il inflige au contact.",
    surEntree: (ennemi) => {
      const suivante = ennemi.phaseMue;
      if (!suivante?.id) return null;
      ennemi.onHitEffect = suivante;
      return { msg: ennemi.name + " mue, et son venin change de nature." };
    },
  },
};

/*
 * Descripteur de seconde phase, normalise.
 *
 * Deux ecritures coexistent et coexisteront : les boss deja en place declarent
 * `hasSecondPhase` + `thresholdForPhase2` + les champs `*Phase2`, les nouveaux
 * declarent un objet `phase2`. Plutot que de reecrire vingt-cinq fiches — une
 * migration qui ne rapporte rien et peut tout casser — on lit les deux ici, une
 * fois, et le reste du code ne connait que la forme normalisee.
 */
export const lirePhase2 = (ennemi) => {
  if (!ennemi) return null;

  const moderne = ennemi.phase2;
  if (moderne && typeof moderne === "object") {
    return {
      seuil: Number(moderne.seuil ?? 0.5),
      texte: moderne.texte || null,
      multDegats: Number(moderne.multDegats ?? 0) || 0,
      esquive: moderne.esquive ?? null,
      affliction: moderne.affliction ?? null,
      comportements: Array.isArray(moderne.comportements)
        ? moderne.comportements.filter((id) => COMPORTEMENTS[id])
        : [],
    };
  }

  if (!ennemi.hasSecondPhase) return null;

  return {
    seuil: Number(ennemi.thresholdForPhase2 ?? 0.5),
    texte: ennemi.flavorTextPhase2 || null,
    multDegats: Number(ennemi.dmgMultPhase2 ?? 0) || 0,
    esquive: ennemi.dodgePhase2 ?? null,
    affliction: ennemi.effectsPhase2 ?? null,
    /*
     * Un boss a l'ancienne gagne des comportements avec une seule ligne de
     * plus sur sa fiche. C'est ce qui evite la migration : les vingt-cinq
     * boss existants gardent leurs champs et se voient enrichis un par un,
     * sans reecriture et sans journee de reglage a refaire.
     */
    comportements: Array.isArray(ennemi.comportementsPhase2)
      ? ennemi.comportementsPhase2.filter((id) => COMPORTEMENTS[id])
      : [],
  };
};

/**
 * Franchit la seconde phase si le seuil est atteint.
 *
 * @returns {{messages: string[], invocations: object[]} | null} null tant que
 *   le seuil n'est pas franchi, ou si la phase est deja passee.
 */
export const declencherPhase2 = (ennemi, pvCourants) => {
  const phase = lirePhase2(ennemi);
  if (!phase || ennemi.isInSecondPhase) return null;

  const pvMax = ennemi.maxHp ?? ennemi.hp ?? 1;
  if (pvMax <= 0) return null;
  if (pvCourants / pvMax > phase.seuil) return null;

  ennemi.isInSecondPhase = true;

  // Les anciens champs restent le socle ; les comportements s'y ajoutent.
  if (phase.multDegats && ennemi.atk) ennemi.atk *= phase.multDegats;
  if (phase.esquive !== null) ennemi.dodgeChance = phase.esquive;
  if (phase.affliction) ennemi.onHitEffect = phase.affliction;

  const messages = [];
  if (phase.texte) messages.push(phase.texte);

  const invocations = [];
  ennemi.comportementsActifs = phase.comportements;

  for (const id of phase.comportements) {
    const action = COMPORTEMENTS[id]?.surEntree?.(ennemi);
    if (!action) continue;
    if (action.msg) messages.push(action.msg);
    if (action.invocations) invocations.push(...action.invocations);
  }

  return { messages, invocations };
};

/** Comportements actuellement actifs sur un ennemi. */
const actifs = (ennemi) =>
  (ennemi?.comportementsActifs || [])
    .map((id) => COMPORTEMENTS[id])
    .filter(Boolean);

/**
 * Action de phase pour le tour de l'ennemi.
 *
 * Cumule ce que les comportements actifs demandent. Rien n'est applique ici :
 * un boss peut donc porter a la fois un `onTurnAction` ecrit a la main et des
 * comportements de phase sans que l'un ecrase l'autre.
 */
export const actionDePhase = (ennemi, joueur = null) => {
  const cumul = { messages: [], healAmount: 0, effets: [], drain: 0 };

  for (const comportement of actifs(ennemi)) {
    const action = comportement.surTour?.(ennemi, joueur);
    if (!action) continue;
    if (action.msg) cumul.messages.push(action.msg);
    if (action.healAmount) cumul.healAmount += action.healAmount;
    if (action.effets) cumul.effets.push(...action.effets);
    if (action.drain) cumul.drain = Math.max(cumul.drain, action.drain);
  }

  return cumul;
};

/**
 * Degats renvoyes a l'attaquant, tous comportements confondus.
 * @returns {{renvoi: number, messages: string[]}}
 */
export const riposteDePhase = (ennemi, degats) => {
  const cumul = { renvoi: 0, messages: [] };
  if (!(degats > 0)) return cumul;

  for (const comportement of actifs(ennemi)) {
    const action = comportement.surDegatsSubis?.(ennemi, degats);
    if (!action) continue;
    cumul.renvoi += action.renvoi || 0;
    if (action.msg) cumul.messages.push(action.msg);
  }

  return cumul;
};

/** Libelles des comportements d'un ennemi, pour l'interface. */
export const libellesDePhase = (ennemi) => actifs(ennemi).map((c) => c.libelle);
