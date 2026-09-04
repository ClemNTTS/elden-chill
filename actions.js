import { gameState, runtimeState } from "./state.js";
import {
  clearSaveStorage,
  saveGame,
  suspendreSauvegarde,
} from "./save.js";
import { updateUI } from "./ui.js";
import { ITEMS } from "./item.js";
import { ActionLog } from "./ui-action-log.js";
import {
  NOM_PANOPLIE_MAX,
  capturerPanoplie,
  normaliserPanoplies,
  panoplieVide,
  resoudrePanoplie,
} from "./loadouts.js";
import { BIOMES } from "./biome.js";
import { CONTRACT_ITEM_IDS } from "./constants.js";
import { SETS_PAR_ARCHETYPE, piecesDuSet } from "./items/contracts.js";
import {
  avancerContrat,
  genererContrat,
  normaliserContrat,
} from "./contracts.js";
import { addJournalEntry } from "./systems.js";
import { startExploration } from "./core.js";
import {
  REBIRTH_LEVEL_BONUS,
  REBIRTH_RUNE_BONUS,
  TRIALS,
  canRebirth,
  LEVEL_PER_MAIN_BOSS,
  getMaxLevel,
  getNextMainBoss,
  getRebirthCount,
  investRebirthPoint,
  performRebirth,
  resetRebirthTree,
} from "./rebirth.js";
import {
  getCritPointsAvailable,
  resetCritRanks,
  spendCritPoint,

} from "./crit.js";

/*
 * Le critique n'est plus achetable avec des runes et ne consomme plus de
 * niveau du budget global : il a sa propre monnaie, un point tous les
 * 10 niveaux, geree par crit.js. Seules les quatre stats principales restent
 * ici.
 */
const upgradeCosts = {
  vigor: 1,
  strength: 1,
  dexterity: 1,
  intelligence: 1,
};

const MAIN_STATS = new Set(Object.keys(upgradeCosts));

/** Depense un point de competence critique. Expose a l'interface. */
export const investCritPoint = (track, count = 1) => {
  if (!spendCritPoint(track, count)) return;
  saveGame("invest_crit_point");
  updateUI();
};

/** Rend tous les points critiques. Gratuit : ils viennent du niveau. */
export const respecCritPoints = () => {
  // Le texte de confirmation de la renaissance avait ete copie ici par
  // erreur : il lisait un `next` qui n'existe pas dans cette portee, et
  // l'exception levee empechait toute reinitialisation.
  if (
    !confirm(
      "Reinitialiser vos points de critique ? Tous les points vous seront rendus.",
    )
  ) {
    return;
  }
  resetCritRanks();
  saveGame("respec_crit_points");
  updateUI();
};

export { getCritPointsAvailable };

/* ------------------------------------------------------------------ */
/* Fin de partie                                                      */
/* ------------------------------------------------------------------ */

/** Investit un point de renaissance dans un noeud de l'arbre. */
export const investRebirthNode = (nodeId) => {
  if (!investRebirthPoint(nodeId)) return;
  gameState.save.maxLevel = getMaxLevel();
  saveGame("invest_rebirth_node");
  updateUI();
};

/** Rend tous les points de l'arbre. Gratuit : ils viennent des renaissances. */
export const respecRebirthTree = () => {
  if (!confirm("Reinitialiser l'arbre de renaissance ? Tous les points vous seront rendus.")) {
    return;
  }
  resetRebirthTree();
  gameState.save.maxLevel = getMaxLevel();
  if (gameState.stats.level > gameState.save.maxLevel) {
    alert(
      "Votre niveau depasse le nouveau plafond : il ne baissera pas, mais vous ne pourrez plus monter tant que vous n'aurez pas reinvesti dans Volonte.",
    );
  }
  saveGame("respec_rebirth_tree");
  updateUI();
};

/** Lance une epreuve. Ce sont des biomes hors graphe, jamais debloques. */
export const startTrial = (trialId) => {
  const trial = TRIALS.find((t) => t.id === trialId);
  if (!trial || !canRebirth()) return;
  if (gameState.world.isExploring) {
    alert("Terminez ou quittez votre expedition en cours avant d'affronter une epreuve.");
    return;
  }
  startExploration(trial.biomeId);
};

/**
 * Renaissance. Double confirmation : c'est la seule action du jeu qui detruit
 * volontairement une partie entiere, et elle n'est pas annulable.
 */
export const requestRebirth = () => {
  if (!canRebirth()) return;
  if (gameState.world.isExploring) {
    alert("Terminez ou quittez votre expedition en cours avant de renaitre.");
    return;
  }
  const next = getRebirthCount() + 1;
  const resume = [
    `Renaitre pour la ${next}e fois ?`,
    "",
    "Vous perdez : niveau, statistiques, points critiques, runes,",
    "inventaire, equipement et biomes debloques.",
    "Vous gardez : codex, cendres de guerre, benedictions et atouts.",
    "",
    `Gain permanent : +${Math.round(REBIRTH_RUNE_BONUS * 100)}% de gain de runes`,
    `et +${REBIRTH_LEVEL_BONUS} au niveau maximum.`,
  ].join(String.fromCharCode(10));
  if (!confirm(resume)) {
    return;
  }
  const count = performRebirth();
  gameState.save.maxLevel = getMaxLevel();
  syncCritStats();
  saveGame("rebirth");
  updateUI();
  alert(`Renaissance ${count}. Les Terres Intermediaires vous ont oublie.`);
};

export const equipAsh = (ashId) => {
  gameState.equippedAsh = gameState.equippedAsh === ashId ? null : ashId;
  saveGame("equip_ash");
  updateUI();
};

export const selectBlessing = (blessingId) => {
  if (blessingId == null) {
    gameState.preparation.selectedBlessingId = null;
    saveGame("select_blessing");
    updateUI();
    return;
  }
  if (!gameState.preparation.unlockedBlessings?.includes(blessingId)) return;
  gameState.preparation.selectedBlessingId = blessingId;
  saveGame("select_blessing");
  updateUI();
};

export const selectPreparationConsumable = (consumableId) => {
  if (consumableId == null) {
    gameState.preparation.selectedConsumableId = null;
    saveGame("select_consumable");
    updateUI();
    return;
  }
  if (!gameState.preparation.unlockedConsumables?.includes(consumableId)) return;
  gameState.preparation.selectedConsumableId = consumableId;
  saveGame("select_consumable");
  updateUI();
};

export const getUpgradeCost = (statName) => {
  const baseCost = upgradeCosts[statName] || 10;
  let count = gameState.stats.level;
  let x = Math.max((count - 11) * 0.02, 0);
  return Math.floor(baseCost * ((x + 0.1) * Math.pow(count + 81, 2) + 1));
};

export const getMultiUpgradeCost = (statName, count) => {
  let totalCost = 0;
  for (let i = 0; i < count; i += 1) {
    const baseCost = upgradeCosts[statName] || 10;
    let level = gameState.stats.level + i;
    let x = Math.max((level - 11) * 0.02, 0);
    totalCost += Math.floor(baseCost * ((x + 0.1) * Math.pow(level + 81, 2) + 1));
  }
  return totalCost;
};

export const upgradeStat = (statName) => {
  if (!MAIN_STATS.has(statName)) return;
  let cost = getUpgradeCost(statName);

  if (gameState.stats.level >= getMaxLevel()) {
    alert(
      (() => {
        // Meme message que la banniere du build : le joueur doit savoir quel
        // boss lever, pas seulement qu'il est bloque.
        const prochain = getNextMainBoss();
        return prochain
          ? `Niveau maximum atteint (${getMaxLevel()}). Abattez le boss de ${BIOMES[prochain]?.name || prochain} pour gagner ${LEVEL_PER_MAIN_BOSS} niveaux.`
          : `Niveau maximum atteint (${getMaxLevel()}). Montez une Renaissance ou investissez dans Volonte pour aller plus loin.`;
      })(),
    );
    return;
  }

  if (gameState.runes.banked >= cost) {
    gameState.runes.banked -= cost;

    gameState.stats[statName] += 1;
    gameState.stats.level++;
    gameState.stats.runesSpent = Math.floor(gameState.stats.runesSpent + cost);
    saveGame("upgrade_stat");
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const upgradeStatMultiple = (statName, count) => {
  if (!MAIN_STATS.has(statName)) return;
  let totalCost = getMultiUpgradeCost(statName, count);

  if (gameState.stats.level + count > getMaxLevel()) {
    alert(
      `Vous atteindriez le niveau maximum. Vous ne pouvez ajouter que ${getMaxLevel() - gameState.stats.level} niveaux.`,
    );
    return;
  }

  if (gameState.runes.banked >= totalCost) {
    gameState.runes.banked -= totalCost;

    for (let i = 0; i < count; i += 1) {
      gameState.stats[statName] += 1;
      gameState.stats.level++;
    }
    // On comptabilise le cout reellement debite. L'ancienne version rappelait
    // getUpgradeCost() APRES le level++ : elle facturait donc les niveaux
    // L+1..L+n au lieu de L..L+n-1, gonflait runesSpent, et le remboursement
    // rendait plus de runes qu'il n'en avait ete depense.
    gameState.stats.runesSpent = Math.floor(
      gameState.stats.runesSpent + totalCost,
    );
    saveGame("upgrade_stat_multiple");
    updateUI();
  } else {
    alert("Pas assez de runes pour renforcer votre lien avec la Grace !");
  }
};

export const refundRunes = () => {
  if (
    !confirm(
      "Etes-vous sur de vouloir recuperer vos runes ? Vous en perdrez 20%.",
    )
  ) {
    return;
  }

  gameState.runes.banked = Math.floor(
    gameState.runes.banked + gameState.stats.runesSpent * 0.8,
  );
  gameState.stats.runesSpent = 0;
  gameState.stats.level = 0;
  gameState.stats.vigor = 0;
  gameState.stats.strength = 0;
  gameState.stats.dexterity = 0;
  gameState.stats.intelligence = 0;
  resetCritRanks();
  gameState.stats.splashDamage = 0;
  gameState.stats.armor = 100;
  gameState.equipped = { weapon: null, armor: null, accessory: null };
  gameState.order = [null, null, null];
  saveGame("refund_runes");
  updateUI();
};

export const equipItem = (itemId) => {
  const itemData = ITEMS[itemId];
  if (!itemData) return;

  if (!itemData.type) {
    console.error("Type d'objet inconnu");
    return;
  }

  const typeSlot = {
    Arme: "weapon",
    Armure: "armor",
    Accessoire: "accessory",
  };

  const slotKey = typeSlot[itemData.type];

  const currentlyEquipped = gameState.equipped[slotKey];

  if (currentlyEquipped === itemId) {
    gameState.equipped[slotKey] = null;
  } else {
    gameState.equipped[slotKey] = itemId;
  }

  runtimeState.filterChanged = true;
  saveGame("equip_item");
  updateUI();
};

/* ------------------------------------------------------------------ */
/* Contrats de zone                                                   */
/* ------------------------------------------------------------------ */

/** Etat des contrats, cree a la volee pour les sauvegardes anterieures. */
export const getEtatContrats = () => {
  if (!gameState.contracts || typeof gameState.contracts !== "object") {
    gameState.contracts = { actif: null, completed: 0, total: 0 };
  }
  if (gameState.contracts.actif) {
    gameState.contracts.actif = normaliserContrat(gameState.contracts.actif);
  }
  return gameState.contracts;
};

/** Le contrat en cours, ou null. */
export const getContratActif = () => getEtatContrats().actif;

/*
 * Zones eligibles : celles que le joueur a debloquees.
 *
 * Un contrat ne doit jamais viser une zone inaccessible — ce serait une
 * impasse silencieuse. Les zones anciennes restent dans le tirage : les y
 * ramener est tout l'objet du systeme.
 */
const zonesEligibles = () =>
  (gameState.world.unlockedBiomes || []).filter((id) => BIOMES[id]);

/*
 * Archetype dominant du joueur, d'apres ses statistiques investies.
 *
 * Les afflictions ne sont pas une statistique : on les detecte a l'equipement,
 * quand le joueur porte deja des pieces qui posent des statuts. C'est le seul
 * archetype qui se lit dans le build plutot que dans la feuille de stats.
 */
const archetypeDominant = () => {
  const s = gameState.stats;
  const portePieceStatut = Object.values(gameState.equipped).some((id) => {
    const objet = ITEMS[id];
    return objet?.funcOnHit && /Saignement|Putrefaction|Folie|Fleau/i.test(objet.description || "");
  });
  if (portePieceStatut) return "afflictions";

  const candidats = [
    ["strength", s.strength || 0],
    ["dexterity", s.dexterity || 0],
    ["intelligence", s.intelligence || 0],
    ["vigor", s.vigor || 0],
  ];
  candidats.sort((a, b) => b[1] - a[1]);
  return candidats[0][1] > 0 ? candidats[0][0] : "strength";
};

/*
 * Pool de recompense d'un contrat.
 *
 * Le tirage est DIRIGE, et c'est indispensable : completer une panoplie de
 * trois pieces tirees au hasard parmi quinze demanderait des dizaines de
 * contrats rares ou legendaires. La recompense serait annoncee et jamais
 * atteinte.
 *
 * On vise donc le set de l'archetype du joueur, et en priorite les pieces
 * qu'il ne possede pas encore. Un set devient completable en trois contrats,
 * ce qui en fait un objectif plutot qu'une loterie.
 *
 * Quand le set est complet, le pool s'ouvre aux autres : le joueur qui a fini
 * sa panoplie peut en viser une seconde, ou monter le niveau des pieces
 * acquises grace aux copies.
 */
const poolRecompense = () => {
  const setVise = SETS_PAR_ARCHETYPE[archetypeDominant()];
  const pieces = piecesDuSet(setVise);
  const manquantes = pieces.filter(
    (id) => !gameState.inventory.some((entree) => entree.id === id),
  );

  if (manquantes.length > 0) return manquantes;
  if (pieces.length > 0) return pieces;
  return CONTRACT_ITEM_IDS;
};

/**
 * Propose un nouveau contrat.
 *
 * @param {string|null} zonePreferee force la zone (sinon tirage parmi les
 *   zones debloquees)
 */
export const proposerContrat = (zonePreferee = null) => {
  const etat = getEtatContrats();
  const zones = zonesEligibles();
  if (zones.length === 0) return null;

  const biomeId =
    zonePreferee && zones.includes(zonePreferee)
      ? zonePreferee
      : zones[Math.floor(Math.random() * zones.length)];

  const contrat = genererContrat({
    biomeId,
    nomBiome: BIOMES[biomeId]?.name || biomeId,
    niveauJoueur: gameState.stats.level || 1,
    objetsExclusifs: poolRecompense(),
  });

  etat.actif = contrat;
  saveGame("new_contract");
  updateUI();
  return contrat;
};

/** Abandonne le contrat en cours et en tire un autre. */
export const abandonnerContrat = () => {
  const etat = getEtatContrats();
  if (!etat.actif) return;
  if (!confirm(`Abandonner "${etat.actif.titre}" ? Un autre contrat sera propose.`)) {
    return;
  }
  etat.actif = null;
  proposerContrat();
};

/**
 * Verse la recompense d'un contrat honore et en propose un nouveau.
 *
 * Le niveau offert respecte le plafond de progression : un contrat ne doit pas
 * etre un moyen de le contourner, sans quoi il deviendrait la voie optimale et
 * viderait la trame principale de son role.
 */
export const reclamerContrat = () => {
  const etat = getEtatContrats();
  const contrat = etat.actif;
  if (!contrat || !contrat.honore) return;

  const { runes, objet, niveau } = contrat.recompense;

  if (runes > 0) {
    gameState.runes.banked += runes;
    ActionLog(`Contrat honore : +${runes} runes.`, "log-runes");
  }

  if (objet && ITEMS[objet]) {
    const existant = gameState.inventory.find((entree) => entree.id === objet);
    if (existant) {
      // Deja possede : une copie fait monter le niveau, comme tout le reste.
      existant.count = (existant.count || 0) + 1;
      ActionLog(`Contrat honore : copie de ${ITEMS[objet].name}.`, "log-crit");
    } else {
      gameState.inventory.push({
        id: objet,
        name: ITEMS[objet].name,
        level: ITEMS[objet].isAlwaysMax ? 10 : 1,
        count: 0,
      });
      ActionLog(`OBJET UNIQUE OBTENU : ${ITEMS[objet].name} !`, "log-crit");
    }
  }

  if (niveau > 0) {
    if (gameState.stats.level < getMaxLevel()) {
      gameState.stats.level += niveau;
      // Le niveau offert va en Vigueur : c'est la statistique la moins
      // susceptible de casser un build, et la seule dont personne ne regrette
      // un point.
      gameState.stats.vigor += niveau;
      ActionLog(`Contrat legendaire : niveau ${gameState.stats.level} atteint.`, "log-crit");
    } else {
      ActionLog(
        "Contrat legendaire : niveau maximum deja atteint, le niveau offert est perdu.",
        "log-event",
      );
    }
  }

  etat.completed = (etat.completed || 0) + 1;
  etat.total = (etat.total || 0) + 1;
  etat.actif = null;

  addJournalEntry(
    "checkpoint",
    "Contrat honore",
    `${contrat.titre} (${contrat.rarete}).`,
    contrat.biomeId,
  );

  // Renouvellement immediat : le joueur ne doit jamais se retrouver sans
  // contrat, c'est ce qui fait de ce systeme une boucle et non une liste.
  proposerContrat();
};

/**
 * Signale un evenement de jeu aux contrats. Appele par core.js.
 *
 * Le contrat n'avance QUE dans sa zone : `biomeId` est verifie par
 * avancerContrat. Quand l'objectif tombe, on ne verse rien tout de suite —
 * le joueur reclame lui-meme, pour que la recompense soit un moment et non
 * une ligne de journal noyee dans un combat.
 */
export const signalerContrat = (evenement, quantite = 1, biomeId = null) => {
  const etat = getEtatContrats();
  if (!etat.actif || etat.actif.honore) return;

  const avant = etat.actif.avancement;
  etat.actif = avancerContrat(etat.actif, evenement, quantite, biomeId);

  if (etat.actif.honore && avant < etat.actif.objectif) {
    ActionLog(
      `CONTRAT ACCOMPLI : ${etat.actif.titre} — reclamez votre du au camp.`,
      "log-crit",
    );
  }
};

/* ------------------------------------------------------------------ */
/* Panoplies enregistrees                                             */
/* ------------------------------------------------------------------ */

/** Liste normalisee, toujours de NB_PANOPLIES entrees. */
export const getPanoplies = () => {
  gameState.loadouts = normaliserPanoplies(gameState.loadouts);
  return gameState.loadouts;
};

const possedeObjet = (id) =>
  id === "fists" || gameState.inventory.some((entree) => entree.id === id);

const possedeCendre = (id) => (gameState.ashesOfWarOwned || []).includes(id);

/** Enregistre l'equipement courant dans l'emplacement donne. */
export const enregistrerPanoplie = (index) => {
  const panoplies = getPanoplies();
  if (!panoplies[index]) return;

  const ancien = panoplies[index];
  if (
    !ancien.vide &&
    !confirm(`Remplacer "${ancien.nom}" par votre equipement actuel ?`)
  ) {
    return;
  }

  // Le nom choisi survit a l'ecrasement : on remplace le contenu, pas
  // l'etiquette que le joueur a posee dessus.
  panoplies[index] = capturerPanoplie(gameState, ancien.nom);
  saveGame("save_loadout");
  updateUI();
};

/**
 * Recharge une panoplie.
 *
 * Les pieces manquantes sont ignorees et signalees : une panoplie enregistree
 * avant une renaissance reference des objets que le joueur n'a plus.
 */
export const chargerPanoplie = (index) => {
  const panoplie = getPanoplies()[index];
  if (!panoplie || panoplie.vide) return;

  const { applicable, manquants } = resoudrePanoplie(
    panoplie,
    possedeObjet,
    possedeCendre,
  );

  gameState.equipped.weapon = applicable.weapon;
  gameState.equipped.armor = applicable.armor;
  gameState.equipped.accessory = applicable.accessory;
  gameState.equippedAsh = applicable.ash;

  runtimeState.filterChanged = true;
  saveGame("load_loadout");
  updateUI();

  if (manquants.length > 0) {
    ActionLog(
      `${panoplie.nom} : ${manquants.length} piece(s) introuvable(s), emplacement laisse vide.`,
      "log-event",
    );
  }
};

/** Renomme un emplacement. */
export const renommerPanoplie = (index) => {
  const panoplies = getPanoplies();
  const panoplie = panoplies[index];
  if (!panoplie) return;

  const saisi = prompt(
    `Nom de la panoplie (${NOM_PANOPLIE_MAX} signes maximum) :`,
    panoplie.nom,
  );
  if (saisi === null) return;

  const propre = saisi.trim().slice(0, NOM_PANOPLIE_MAX);
  panoplie.nom = propre || `Panoplie ${index + 1}`;
  saveGame("rename_loadout");
  updateUI();
};

/** Vide un emplacement. */
export const effacerPanoplie = (index) => {
  const panoplies = getPanoplies();
  const panoplie = panoplies[index];
  if (!panoplie || panoplie.vide) return;
  if (!confirm(`Effacer la panoplie "${panoplie.nom}" ?`)) return;

  panoplies[index] = panoplieVide(index);
  saveGame("clear_loadout");
  updateUI();
};

export const resetGame = () => {
  if (
    confirm(
      "Etes-vous sur de vouloir tout effacer ? Votre progression sera perdue a jamais.",
    )
  ) {
    /*
     * L'ordre compte, et le verrou est indispensable.
     *
     * location.reload() declenche beforeunload, qui appelle saveGame() et
     * reecrivait l'etat encore en memoire juste apres l'effacement. La
     * progression revenait intacte — le bouton ne servait a rien.
     */
    suspendreSauvegarde();
    clearSaveStorage();
    location.reload();
  }
};
