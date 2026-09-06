// ui.js
const wikiBtn = document.getElementById("btn-wiki");

if (wikiBtn) {
  wikiBtn.addEventListener("click", () => {
    // Ouvre ton wiki dans un nouvel onglet pour ne pas couper la session de jeu
    window.open("https://clemntts.github.io/wiki-elden-chill/", "_blank");
  });
}

// Audio management
const campSongs = [
  "./assets/music/camp_song_1.mp3",
  "./assets/music/camp_song_2.mp3",
  "./assets/music/camp_song_3.mp3",
  "./assets/music/camp_song_4.mp3",
  "./assets/music/camp_song_5.mp3",
  "./assets/music/camp_song_6.mp3",
  "./assets/music/camp_song_7.mp3",
];
const dungeonSongs = [
  "./assets/music/dungeon_song_1.mp3",
  "./assets/music/dungeon_song_2.mp3",
  "./assets/music/dungeon_song_3.mp3",
  "./assets/music/dungeon_song_4.mp3",
  "./assets/music/dungeon_song_5.mp3",
  "./assets/music/dungeon_song_6.mp3",
  "./assets/music/dungeon_song_7.mp3",
];

const NARRATOR_TRACK = "./assets/music/narrator-song.mp3";

/*
 * Gain par piste, pour egaliser le volume percu.
 *
 * Les morceaux generes sortent a des niveaux qui varient de 5 dB : passer de
 * dungeon_song_4 a camp_song_7 faisait un bond audible, le curseur appliquant
 * la meme valeur aux deux elements Audio.
 *
 * Mesure au Web Audio sur les 90 premieres secondes de chaque piste (voir
 * tools/mesure-volume.js), cible -16 dBFS RMS.
 *
 * La valeur est BORNEE A 1 : HTMLMediaElement.volume refuse tout ce qui
 * depasse, on ne peut donc qu'attenuer. Les pistes deja plus basses que la
 * cible gardent 1 et restent au plus 2 dB en dessous, ce qui ne s'entend
 * pas. L'alternative — aligner tout sur la piste la plus faible — corrigeait
 * l'ecart en entier mais coutait 5 dB de marge sur l'ensemble du jeu.
 *
 * Une piste absente de la table joue a plein gain : ajouter un morceau sans
 * le mesurer reste sans risque.
 */
const TRACK_GAIN = {
  "camp_song_1.mp3": 1,
  "camp_song_2.mp3": 0.89,
  "camp_song_3.mp3": 0.94,
  "camp_song_4.mp3": 1,
  "camp_song_5.mp3": 0.85,
  "camp_song_6.mp3": 0.9,
  "camp_song_7.mp3": 0.7,
  "dungeon_song_1.mp3": 1,
  "dungeon_song_2.mp3": 1,
  "dungeon_song_3.mp3": 1,
  "dungeon_song_4.mp3": 1,
  "dungeon_song_5.mp3": 0.87,
  "dungeon_song_6.mp3": 1,
  "dungeon_song_7.mp3": 0.93,
  "narrator-song.mp3": 1,
};

/*
 * Le volume est relu dans gameState a chaque fois, plutot que garde dans une
 * variable de module : playCampMusic() part au chargement, avant que le
 * curseur des options ne soit initialise, et deux sources de verite finissent
 * toujours par se desynchroniser.
 */
const getMusicVolume = () => gameState.save?.audioVolume ?? 0.3;

/** Applique volume maitre x gain de la piste chargee dans l'element. */
const applyTrackVolume = (audio) => {
  const file = (audio.src || "").split("/").pop();
  audio.volume = Math.min(1, getMusicVolume() * (TRACK_GAIN[file] ?? 1));
};

/*
 * Sac melange, plutot qu'un tirage independant a chaque fois.
 *
 * Un tirage pur rejoue souvent le meme morceau et en oublie d'autres pendant
 * longtemps. Le sac garantit que TOUS les morceaux passent avant qu'un seul
 * revienne. On evite seulement que le dernier joue ne ressorte en tete du sac
 * suivant, ce qui donnerait deux fois le meme d'affilee.
 *
 * Pour ajouter un morceau : deposer le fichier dans assets/ et ajouter une
 * ligne dans campSongs ou dungeonSongs. Rien d'autre a toucher.
 */
const makePlaylist = (files) => {
  let bag = [];
  let last = null;
  const refill = () => {
    bag = files.slice();
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag.length > 1 && bag[0] === last) bag.push(bag.shift());
  };
  return () => {
    if (!bag.length) refill();
    last = bag.shift();
    return last;
  };
};

const nextCampSong = makePlaylist(campSongs);
const nextDungeonSong = makePlaylist(dungeonSongs);

const campAudio = new Audio();
const dungeonAudio = new Audio();

/*
 * Section en cours, "camp" ou "dungeon".
 *
 * L'ancien code ne changeait de morceau que sur l'evenement `ended`. Comme une
 * expedition dure bien moins longtemps qu'un morceau, `ended` ne se declenchait
 * pratiquement jamais : on reentendait indefiniment le meme. Et l'index du
 * donjon partait de 0 en dur, donc toute exploration commencait sur
 * dungeon_song_1.
 *
 * On tire desormais un nouveau morceau a chaque ENTREE dans une section. Pas a
 * chaque appel : playCampMusic() est rappelee a chaque changement d'onglet, et
 * relancer la musique a ce moment-la la couperait sans arret.
 */
let currentSection = null;

function playNextCampSong() {
  campAudio.src = nextCampSong();
  applyTrackVolume(campAudio);
  campAudio.play().catch(() => {});
}

function playNextDungeonSong() {
  dungeonAudio.src = nextDungeonSong();
  applyTrackVolume(dungeonAudio);
  dungeonAudio.play().catch(() => {});
}

campAudio.addEventListener("ended", playNextCampSong);
dungeonAudio.addEventListener("ended", playNextDungeonSong);

export function playCampMusic() {
  dungeonAudio.pause();
  if (currentSection !== "camp" || !campAudio.src) {
    currentSection = "camp";
    campAudio.src = nextCampSong();
  }
  applyTrackVolume(campAudio);
  // Le narrateur a la priorite : on ne lui passe pas la musique par-dessus.
  if (narratorPlaying) return;
  // La lecture automatique est refusee tant que le joueur n'a rien clique :
  // le morceau reste choisi et partira au premier appel autorise.
  campAudio.play().catch(() => {});
}

/*
 * La chanson du narrateur, declenchee depuis les options.
 *
 * Trois choses a tenir :
 *   - lecture unique. Sans le drapeau, chaque clic empilait un narrateur de
 *     plus et ils se parlaient dessus ;
 *   - la musique de fond se met en pause et REPREND a la fin, dans la section
 *     ou le joueur se trouve — pas forcement celle du depart, il a pu partir
 *     en expedition entre-temps ;
 *   - un second clic interrompt. Le morceau fait pres de deux minutes : rester
 *     coince dessus serait penible.
 */
const narratorAudio = new Audio();
let narratorPlaying = false;

const refreshNarratorButton = () => {
  const btn = document.getElementById("btn-narrator");
  if (!btn) return;
  btn.innerText = narratorPlaying
    ? "Faire taire le narrateur"
    : "Ecouter le narrateur";
  btn.classList.toggle("is-active", narratorPlaying);
};

/** Rend la main a la musique de fond. */
const endNarrator = () => {
  narratorPlaying = false;
  if (currentSection === "dungeon") dungeonAudio.play().catch(() => {});
  else playCampMusic();
  refreshNarratorButton();
};

export const toggleNarrator = () => {
  if (narratorPlaying) {
    narratorAudio.pause();
    endNarrator();
    return;
  }
  narratorPlaying = true;
  campAudio.pause();
  dungeonAudio.pause();
  if (!narratorAudio.src) narratorAudio.src = NARRATOR_TRACK;
  applyTrackVolume(narratorAudio);
  narratorAudio.currentTime = 0;
  narratorAudio.onended = endNarrator;
  // Fichier absent ou lecture refusee : on ne laisse pas le jeu muet.
  narratorAudio.onerror = endNarrator;
  narratorAudio.play().catch(endNarrator);
  refreshNarratorButton();
};

function playDungeonMusic() {
  campAudio.pause();
  if (currentSection !== "dungeon" || !dungeonAudio.src) {
    currentSection = "dungeon";
    dungeonAudio.src = nextDungeonSong();
  }
  applyTrackVolume(dungeonAudio);
  if (narratorPlaying) return;
  dungeonAudio.play().catch(() => {});
}

import { ASHES_OF_WAR } from "./ashes.js";
import { getBiomeTrait } from "./biome-traits.js";
import {
  LEVEL_PER_MAIN_BOSS,
  POINTS_PER_REBIRTH,
  REBIRTH_LEVEL_BONUS,
  REBIRTH_NODES,
  REBIRTH_RUNE_BONUS,
  TRIALS,
  canRebirth,
  getMaxLevel,
  getNextMainBoss,
  getNodeRank,
  getRebirthCount,
  getRebirthPointsAvailable,
  getRebirthPointsSpent,
  getRebirthPointsTotal,
  getRebirthRuneBonus,
  isTrialCleared,
} from "./rebirth.js";
import { playSfx, primeSfx, setSfxVolume } from "./sfx.js";

import {
  abandonnerContrat,
  chargerPanoplie,
  contratsDebloques,
  effacerPanoplie,
  enregistrerPanoplie,
  equipItem,
  getContratActif,
  getMultiUpgradeCost,
  getPanoplies,
  getUpgradeCost,
  proposerContrat,
  reclamerContrat,
  renommerPanoplie,
  selectBlessing,
  selectPreparationConsumable,
  upgradeStat,
} from "./actions.js";
import { BIOMES, LOOT_TABLES } from "./biome.js";
import { encaisserFerveur, startExploration } from "./core.js";
import {
  CRIT_PER_RANK,
  LEVELS_PER_CRIT_POINT,
  SUPER_CRIT_MULTIPLIER,
  getCritDamageMultiplier,
  getCritPointsAvailable,
  getCritPointsSpent,
  getCritPointsTotal,
  getCritRanks,
  getSuperCritChance,
} from "./crit.js";
import { MONSTERS } from "./monster.js";
import { saveGame } from "./save.js";
import {
  gameState,
  getEffectiveStats,
  getHealth,
  runtimeState,
} from "./state.js";
import { CONTRACTS_MIN_LEVEL } from "./constants.js";
import { REGLAGES_RARETE, progressionContrat } from "./contracts.js";
import {
  FERVEUR_PRIME_PAR_RANG,
  FERVEUR_RANG_BUTIN,
  FERVEUR_RANG_MAX,
  FERVEUR_RANG_RARETE,
  getFerveurMultDanger,
  getFerveurMultRunes,
  getFerveurRang,
} from "./escalation.js";
import { panoplieEstActive } from "./loadouts.js";
import { STATUS_EFFECTS } from "./status.js";
import {
  attachInfoTooltip,
  attachTooltipEvents,
  detachTooltipEvents,
  echapperHtml,
  hideTooltip,
  moveTooltip,
  showAshTooltip,
  showItemComparisonTooltip,
  showStatTooltip,
  showTooltip,
} from "./ui-tooltip.js";
import { checkForUpdate } from "./version-check.js";

/*
 * Reexport : tout le panneau de description vit desormais dans ui-tooltip.js.
 *
 * Il etait dissemine ici sur quatre cents lignes, et cinq endroits cablaient
 * le meme panneau de cinq facons differentes — c'est ce qui avait produit le
 * panneau bloque en affiche sur mobile : quatre de ces cinq cablages n'avaient
 * aucun chemin de fermeture au toucher, et personne ne pouvait le voir.
 */
export {
  attachTooltipEvents,
  detachTooltipEvents,
  echapperHtml,
  hideTooltip,
  moveTooltip,
  showAshTooltip,
  showStatTooltip,
  showTooltip,
};
import {
  ActionLog,
  ensureBattleLogLayout,
  refreshConversationHighlights,
} from "./ui-action-log.js";

/*
 * Reexport : le journal de combat a demenage dans ui-action-log.js. Il etait
 * la seule raison pour laquelle item.js importait ui.js — et donc, de proche
 * en proche, game.js et tout l'affichage. Les appelants historiques continuent
 * de lire ActionLog ici.
 */
export { ActionLog };
import { ITEM_SETS } from "./constants.js";
import {
  getAshIcon,
  getEmblemIcon,
  getItemIcon,
  getMiscIcon,
  getStatIcon,
  getStatusIcon,
  iconMarkup,
} from "./icons.js";
import { ITEMS } from "./item.js";
import { TINTS, getMonsterVisual } from "./monster-visuals.js";
import { CAMP_SCREEN_IDS } from "./shared/player-profile.js";
import {
  ARCHETYPES,
  HERO_SHEETS,
  STAT_META,
  SpriteAnimator,
  getAshElement,
  getDominantStat,
  getHeroIdForStats,
  mountMonster,
  playEffectOnce,
  playMonsterAnimation,
} from "./sprites.js";
import {
  BLESSINGS,
  EVENT_DEFS,
  HAZARD_LABELS,
  PREP_CONSUMABLES,
  applyPreparationStats,
  buildEnemyIntent,
  clearRunBuffs,
  describeHazards,
  getCodexBiomeInfo,
  getItemRarity,
  getKnownCodexBiomes,
  getRunModifier,
  syncCodexFromInventory,
} from "./systems.js";
import {
  BIOME_GUIDE,
  BIOME_ORDER,
  getBiomeDangerClass,
  getBiomeGraphDepth,
  getBiomePowerBand,
} from "./world-map.js";

const CAMP_SCREENS = CAMP_SCREEN_IDS;

const ensureUiState = () => {
  if (!gameState.ui) {
    gameState.ui = {
      currentScreen: "hub",
      selectedBiomeId: "limgrave_west",
    };
  }
  return gameState.ui;
};

/**
 * Pose l'icone de chaque ligne de stat de l'ecran Build, une fois pour toutes.
 *
 * Le HTML porte data-stat, le JS fournit les coordonnees d'atlas : les deux
 * n'ont pas a connaitre les memes choses. Les stats sans icone (crit) sont
 * ignorees plutot que de recevoir un cadre vide.
 */
const decorateStatLines = () => {
  document.querySelectorAll("[data-stat]").forEach((el) => {
    if (el.dataset.iconDone) return;
    const icon = getStatIcon(el.dataset.stat);
    if (!icon) {
      el.dataset.iconDone = "skipped";
      return;
    }
    el.insertAdjacentHTML(
      "afterbegin",
      iconMarkup(icon, { scale: 2, className: "stat-line-icon" }),
    );
    el.dataset.iconDone = "true";
  });

  const runeSlot = document.getElementById("rune-icon-slot");
  if (runeSlot && !runeSlot.dataset.iconDone) {
    runeSlot.innerHTML = iconMarkup(getMiscIcon("rune"), {
      scale: 1,
      className: "rune-icon",
      label: "Runes",
    });
    runeSlot.dataset.iconDone = "true";
  }
};

const updateNavState = () => {
  const ui = ensureUiState();
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const target = btn.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
    btn.classList.toggle("is-active", target === ui.currentScreen);
    btn.disabled = gameState.world.isExploring;
  });
};

const updateScreenState = () => {
  const ui = ensureUiState();
  CAMP_SCREENS.forEach((screenId) => {
    const el = document.getElementById(`screen-${screenId}`);
    if (!el) return;
    el.classList.toggle("is-active", ui.currentScreen === screenId);
  });
};

export const navigateTo = (screenId) => {
  const ui = ensureUiState();
  if (!CAMP_SCREENS.includes(screenId)) return;
  ui.currentScreen = screenId;
  updateScreenState();
  updateNavState();
  if (screenId === "map") {
    requestAnimationFrame(() => {
      updateBiomeDisplay();
    });
  }
  if (!gameState.world.isExploring) {
    saveGame();
  }
};

window.navigateTo = navigateTo;
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

/*
 * Contrat en cours.
 *
 * Une seule carte, qui doit repondre a trois questions en un coup d'oeil : ou
 * aller, combien il reste, et ce que ca paie. Le bouton change de nature selon
 * l'etat — reclamer quand c'est fini, abandonner sinon — plutot que d'afficher
 * en permanence deux actions dont une seule est jamais pertinente.
 */
const updateContractDisplay = () => {
  const corps = document.getElementById("contract-body");
  if (!corps) return;

  /*
   * Tant que les contrats sont verrouilles, le panneau entier disparait du
   * Hub. Un panneau grise qui annonce "revenez au niveau 100" occuperait la
   * place la plus visible du camp pendant les cent premiers niveaux pour ne
   * rien dire d'actionnable ; le systeme se decouvre le jour ou il sert.
   */
  const panneau = corps.closest(".contract-panel");
  if (!contratsDebloques()) {
    if (panneau) panneau.hidden = true;
    corps.innerHTML = "";
    return;
  }
  if (panneau) panneau.hidden = false;

  const contrat = getContratActif();

  if (!contrat) {
    corps.innerHTML = `
      <p class="contract-empty">Aucun contrat en cours.</p>
      <button type="button" id="contract-new">Demander un contrat</button>
    `;
    const btn = document.getElementById("contract-new");
    if (btn) btn.onclick = () => proposerContrat();
    return;
  }

  const part = Math.round(progressionContrat(contrat) * 100);

  /*
   * Marqueurs de tete : etape de chaine et echeance.
   *
   * Ils vont a cote de la rarete parce que ce sont les deux seules
   * informations qui changent la DECISION du joueur — continuer ou repartir
   * ailleurs — et qu'elles doivent se lire avant le texte, pas apres.
   */
  const marqueurs = [];
  if (contrat.chaine) {
    marqueurs.push(
      `<span class="contract__chain">Chaine ${contrat.chaine.rang}/${contrat.chaine.sur}</span>`,
    );
  }
  if (contrat.echeance > 0) {
    const urgent = contrat.cyclesRestants <= 3;
    marqueurs.push(
      `<span class="contract__deadline${urgent ? " is-urgent" : ""}">${
        contrat.expire
          ? "Expire"
          : `${contrat.cyclesRestants} cycle${contrat.cyclesRestants > 1 ? "s" : ""} restant${contrat.cyclesRestants > 1 ? "s" : ""}`
      }</span>`,
    );
  }

  const recompenses = [];
  if (contrat.recompense.runes > 0) {
    recompenses.push(`${formatNumber(contrat.recompense.runes)} runes`);
  }
  if (contrat.recompense.objet) {
    const nom =
      ITEMS[contrat.recompense.objet]?.name || contrat.recompense.objet;
    recompenses.push(`${nom} (exclusif)`);
  }
  if (contrat.recompense.niveau > 0) {
    recompenses.push(`${contrat.recompense.niveau} niveau`);
  }

  const etats = [
    contrat.honore ? "is-done" : "",
    contrat.expire ? "is-expired" : "",
  ]
    .filter(Boolean)
    .join(" ");

  corps.innerHTML = `
    <article class="contract contract--${contrat.rarete}${etats ? ` ${etats}` : ""}">
      <header class="contract__head">
        <span class="contract__rarity">${REGLAGES_RARETE[contrat.rarete]?.libelle || contrat.rarete}</span>
        ${marqueurs.join("")}
        <strong class="contract__title">${echapperHtml(contrat.titre)}</strong>
      </header>
      <p class="contract__text">${echapperHtml(contrat.texte)}</p>
      <div class="contract__progress" role="progressbar"
           aria-valuenow="${contrat.avancement}" aria-valuemin="0" aria-valuemax="${contrat.objectif}">
        <div class="contract__progress-fill" style="width:${part}%"></div>
        <span class="contract__progress-text">${contrat.avancement} / ${contrat.objectif}</span>
      </div>
      ${
        contrat.expire
          ? '<p class="contract__expired-note">Le delai est passe. La recompense est perdue : demandez-en un autre.</p>'
          : `<p class="contract__reward">Recompense : ${echapperHtml(recompenses.join(" · ") || "aucune")}</p>`
      }
      <div class="contract__actions">
        ${
          contrat.honore
            ? '<button type="button" id="contract-claim" class="contract__claim">Reclamer</button>'
            : `<button type="button" id="contract-abandon" class="contract__abandon">${contrat.expire ? "Demander un autre contrat" : "Abandonner"}</button>`
        }
      </div>
    </article>
  `;

  const claim = document.getElementById("contract-claim");
  if (claim) claim.onclick = () => reclamerContrat();
  const abandon = document.getElementById("contract-abandon");
  if (abandon) abandon.onclick = () => abandonnerContrat();
};

/*
 * Panoplies enregistrees.
 *
 * Trois cartes. Une panoplie remplie montre son nom, ses pieces et deux
 * actions ; un emplacement vide ne montre qu'un bouton d'enregistrement, pour
 * qu'un joueur qui n'utilise pas la fonction ne paie pas trois cartes de
 * hauteur — la contrainte vient du telephone, ou l'ecran de build est deja
 * long.
 */
const updateLoadoutsDisplay = () => {
  const liste = document.getElementById("loadouts-list");
  if (!liste) return;

  const panoplies = getPanoplies();
  liste.innerHTML = "";

  panoplies.forEach((panoplie, index) => {
    const carte = document.createElement("div");
    carte.className = "loadout";
    const active = panoplieEstActive(panoplie, gameState);
    if (panoplie.vide) carte.classList.add("is-empty");
    if (active) carte.classList.add("is-active");

    if (panoplie.vide) {
      carte.innerHTML = `
        <button type="button" class="loadout__save-empty" data-index="${index}">
          + Enregistrer le build actuel
        </button>
      `;
    } else {
      const pieces = ["weapon", "armor", "accessory"]
        .map((cle) => panoplie[cle])
        .filter(Boolean)
        .map((id) => ITEMS[id]?.name || id);
      if (panoplie.ash) {
        pieces.push(ASHES_OF_WAR[panoplie.ash]?.name || panoplie.ash);
      }

      carte.innerHTML = `
        <div class="loadout__head">
          <strong class="loadout__name">${echapperHtml(panoplie.nom)}</strong>
          ${active ? '<span class="loadout__badge">Equipee</span>' : ""}
        </div>
        <p class="loadout__pieces">${
          pieces.length
            ? echapperHtml(pieces.join(" · "))
            : "<em>Aucune piece</em>"
        }</p>
        <div class="loadout__actions">
          <button type="button" class="loadout__load" data-index="${index}" ${
            active ? "disabled" : ""
          }>Equiper</button>
          <button type="button" class="loadout__save" data-index="${index}" title="Remplacer par l'equipement actuel">Ecraser</button>
          <button type="button" class="loadout__rename" data-index="${index}" title="Renommer">Renommer</button>
          <button type="button" class="loadout__clear" data-index="${index}" title="Effacer">Effacer</button>
        </div>
      `;
    }

    liste.appendChild(carte);
  });

  // Delegation : les cartes sont reconstruites a chaque rendu, un ecouteur par
  // bouton fuirait a chaque passage.
  liste.onclick = (e) => {
    const btn = e.target.closest("button[data-index]");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (btn.classList.contains("loadout__load")) chargerPanoplie(index);
    else if (btn.classList.contains("loadout__rename")) renommerPanoplie(index);
    else if (btn.classList.contains("loadout__clear")) effacerPanoplie(index);
    else enregistrerPanoplie(index);
  };
};

export const updateCycleDisplay = () => {
  const el = document.getElementById("cycle-count");
  if (!el) return;
  if (runtimeState.currentLoopCount > 0) {
    el.innerText = `+${runtimeState.currentLoopCount}`;
    el.style.color = "var(--hover-btn)";
  } else {
    el.innerText = "";
  }
  updateFerveurDisplay();
};

/*
 * Banniere d'avis, en haut de page, au-dessus de tout.
 *
 * Elle vivait dans game.js sous le nom showBootNotice, pour les messages de
 * chargement. Elle sert aussi aux annonces en cours de partie — un deblocage,
 * par exemple — et actions.js ne peut pas importer game.js, qui est le point
 * d'entree et cable `window` a l'import.
 *
 * On n'utilise pas ActionLog pour ca : le journal de combat n'existe pas au
 * chargement, et il n'est pas visible depuis le camp.
 *
 * @param {string} text
 * @param {"warn"|"danger"|"unlock"} tone
 */
export const afficherAvis = (text, tone = "warn") => {
  const banner = document.createElement("div");
  banner.className = `boot-notice boot-notice--${tone}`;

  const message = document.createElement("p");
  message.innerText = text;

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "boot-notice__close";
  dismiss.setAttribute("aria-label", "Fermer l'avertissement");
  dismiss.innerText = "Compris";
  dismiss.addEventListener("click", () => banner.remove());

  banner.append(message, dismiss);
  document.body.prepend(banner);
};

/*
 * Bandeau de Ferveur.
 *
 * Il affiche la seule chose que le joueur doit peser pour decider de se
 * replier : combien est en jeu, et ce qu'il en coute de continuer. Le rang
 * seul ne suffirait pas — c'est le montant de la reserve qui rend la decision
 * concrete.
 */
export const updateFerveurDisplay = () => {
  const banner = document.getElementById("ferveur-banner");
  if (!banner) return;

  const cycles = runtimeState.currentLoopCount || 0;
  const rang = getFerveurRang(cycles);
  const reserve = Math.floor(runtimeState.ferveurBank || 0);

  if (rang <= 0 && reserve <= 0) {
    banner.classList.add("is-hidden");
    return;
  }
  banner.classList.remove("is-hidden");

  const prime = Math.round((getFerveurMultRunes(cycles) - 1) * 100);
  const danger = Math.round((getFerveurMultDanger(cycles) - 1) * 100);

  const rankEl = document.getElementById("ferveur-rank");
  if (rankEl) {
    rankEl.innerText = `Ferveur ${rang} · +${prime}% prime · +${danger}% menace`;
  }
  const bankEl = document.getElementById("ferveur-bank");
  if (bankEl) bankEl.innerText = formatNumber(reserve);

  // Au-dela du plafond de prime, seule la menace continue de monter : il faut
  // que cela se voie sans lire les chiffres.
  banner.classList.toggle("is-overheated", rang >= FERVEUR_RANG_MAX);

  /*
   * Le bandeau montre trois nombres ; il n'expliquait pas ce qu'ils engagent.
   * Or c'est la seule mecanique du jeu ou la mauvaise lecture coute une
   * reserve entiere : un joueur qui croit ses runes en sécurité continue un
   * cycle de trop. Le panneau dit ce qui est en jeu, ce qui le sauve, et ce
   * que le rang suivant apporte.
   *
   * Recable a chaque rendu, avec les nombres du moment : le contenu est une
   * fonction, donc relu a l'ouverture, mais le rang change entre deux cycles.
   */
  attachInfoTooltip(banner, () => explicationFerveur());
};

/** Contenu du panneau de Ferveur, calcule au moment de l'ouverture. */
const explicationFerveur = () => {
  const cycles = runtimeState.currentLoopCount || 0;
  const rang = getFerveurRang(cycles);
  const reserve = Math.floor(runtimeState.ferveurBank || 0);
  const auPlafond = rang >= FERVEUR_RANG_MAX;

  const lignes = [
    "Chaque cycle boucle sans repli fait monter la Ferveur d'un rang.",
    `<br><strong>${formatNumber(reserve)} runes sont en jeu.</strong> La prime ne va pas au coffre : elle s'accumule a part, <strong>versee au repli volontaire</strong> et <strong>entierement perdue a la mort</strong>.`,
    "<br><small>Les runes de base, elles, restent securisees a chaque cycle : la Ferveur n'enleve rien, elle ajoute une mise.</small>",
  ];

  if (auPlafond) {
    lignes.push(
      `<br><strong style="color:var(--danger)">Rang ${FERVEUR_RANG_MAX}, le maximum.</strong> La prime ne monte plus, la menace continue. Chaque cycle de plus ne fait qu'augmenter ce que vous risquez.`,
    );
  } else {
    const gain = Math.round(FERVEUR_PRIME_PAR_RANG * 100);
    lignes.push(
      `<br>Rang suivant : <strong>+${gain}% de prime</strong> contre <strong>+${Math.round((getFerveurMultDanger(cycles + 1) - getFerveurMultDanger(cycles)) * 100)}% de menace</strong>.`,
    );
  }

  const paliers = [];
  if (rang < FERVEUR_RANG_BUTIN) {
    paliers.push(`rang ${FERVEUR_RANG_BUTIN} : un tirage de butin en plus`);
  }
  if (rang < FERVEUR_RANG_RARETE) {
    paliers.push(`rang ${FERVEUR_RANG_RARETE} : butin plus rare`);
  }
  if (paliers.length) {
    lignes.push(`<br><small>A venir — ${paliers.join(", ")}.</small>`);
  }

  return { title: `Ferveur ${rang}`, text: lignes.join("") };
};

const updateRuneDisplay = () => {
  document.getElementById("banked-runes").innerText = formatNumber(
    gameState.runes.banked,
  );
  document.getElementById("carried-runes").innerText = formatNumber(
    gameState.runes.carried,
  );
};

const formatSeconds = (s) => {
  const total = Math.floor(Number(s) || 0);
  if (total <= 0) return "0s";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if ((!h && !m) || sec) parts.push(`${sec}s`);
  return parts.join(" ");
};

export const updateOfflineDisplay = () => {
  const ids = ["offline-bank", "offline-bank-b"];
  const btnIds = ["btn-use-offline", "btn-use-offline-b"];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = formatSeconds(gameState.save?.offlineTimeBank || 0);
  });

  btnIds.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const enabled = !!gameState.save?.useOfflineTime;
    btn.innerText = enabled ? "Utiliser : ON" : "Utiliser : OFF";
    btn.classList.toggle("active-offline", enabled);
  });
};

/*
 * Automatisation d'expedition. Le champ de cycles accepte 0, qui vaut
 * "ne jamais se replier tout seul" — c'est le comportement d'origine.
 */
window.toggleAutoRestart = () => {
  if (!gameState.automation) gameState.automation = {};
  gameState.automation.autoRestart = !gameState.automation.autoRestart;
  runtimeState.autoRestartDeaths = 0;
  updateAutomationDisplay();
  saveGame();
};

window.setStopAfterCycle = (value) => {
  if (!gameState.automation) gameState.automation = {};
  const n = Math.max(0, Math.min(999, Math.floor(Number(value) || 0)));
  gameState.automation.stopAfterCycle = n;
  updateAutomationDisplay();
  saveGame();
};

/*
 * Les deux boutons du pas. On repart de l'etat, pas de la valeur affichee dans
 * le champ : le joueur peut avoir tape quelque chose sans valider, et un pas
 * doit rester previsible.
 */
window.nudgeStopCycle = (delta) => {
  const courant = gameState.automation?.stopAfterCycle || 0;
  window.setStopAfterCycle(courant + delta);
};

const updateAutomationDisplay = () => {
  const auto = gameState.automation || {};
  const btn = document.getElementById("btn-auto-restart");
  if (btn) {
    btn.innerText = `Relance auto : ${auto.autoRestart ? "ON" : "OFF"}`;
    btn.classList.toggle("is-active", !!auto.autoRestart);
  }
  const input = document.getElementById("input-stop-cycle");
  if (input && document.activeElement !== input) {
    input.value = auto.stopAfterCycle || 0;
  }
};

window.toggleUseOfflineTime = () => {
  if (!gameState.save) gameState.save = {};
  gameState.save.useOfflineTime = !gameState.save.useOfflineTime;
  updateOfflineDisplay();
  updateUI();
  saveGame();
};

const updateStatDisplay = () => {
  const eff = getEffectiveStats();
  const base = gameState.stats;
  const maxLevel = getMaxLevel();
  const currentLevel = gameState.stats.level;
  const remainingLevels = Math.max(0, maxLevel - currentLevel);
  const levelCapBanner = document.getElementById("build-cap-status");

  if (levelCapBanner) {
    levelCapBanner.classList.add("is-visible");
    levelCapBanner.classList.toggle("is-maxed", remainingLevels === 0);
    /*
     * Le plafond doit dire D'OU il vient et COMMENT le lever.
     *
     * Il depend maintenant des boss de la trame abattus. Un joueur bloque sans
     * explication conclurait a un bug, ou pire, farmerait pour rien : c'est
     * exactement le genre de regle invisible qu'on a deja corrigee ailleurs.
     */
    const prochain = getNextMainBoss();
    const nomProchain = prochain ? BIOMES[prochain]?.name || prochain : null;
    const commentLever = nomProchain
      ? ` Abattez le boss de ${nomProchain} pour gagner ${LEVEL_PER_MAIN_BOSS} niveaux.`
      : " Montez une Renaissance ou investissez dans Volonte pour aller plus loin.";

    levelCapBanner.innerText =
      remainingLevels === 0
        ? `Niveau maximum atteint (${currentLevel}/${maxLevel}).${commentLever}`
        : `Niveau ${currentLevel}/${maxLevel} · ${remainingLevels} amelioration(s) restante(s) avant le cap.`;
  }

  const statsList = ["vigor", "strength", "dexterity", "intelligence"];
  statsList.forEach((s) => {
    const baseVal = base[s];
    document.getElementById(`base-${s}`).innerText = baseVal;

    const bonus = eff[s] - baseVal;
    const bonusEl = document.getElementById(`bonus-${s}`);
    if (bonus !== 0) {
      bonusEl.innerText =
        bonus > 0
          ? `Equip. +${bonus.toFixed(1)}`
          : `Equip. ${bonus.toFixed(1)}`;
      bonusEl.classList.toggle("has-positive", bonus > 0);
      bonusEl.classList.toggle("has-negative", bonus < 0);
    } else {
      bonusEl.innerText = "";
      bonusEl.classList.remove("has-positive", "has-negative");
    }

    // Update +1 button
    const cost = getUpgradeCost(s);
    document.getElementById(`cost-${s}`).innerText =
      currentLevel >= maxLevel ? "CAP" : formatNumber(cost);
    const btn = document.getElementById(`btn-${s}-1`);
    if (btn) {
      btn.disabled = gameState.runes.banked < cost || currentLevel >= maxLevel;
      btn.innerText = currentLevel >= maxLevel ? "MAX" : "+";
      btn.classList.toggle("is-maxed", currentLevel >= maxLevel);
      btn.title =
        currentLevel >= maxLevel
          ? "Niveau maximum atteint"
          : "Ameliorer cette statistique";
    }

    // Update +5 button
    const cost5 = getMultiUpgradeCost(s, 5);
    document.getElementById(`cost-${s}-5`).innerText =
      currentLevel >= maxLevel ? "CAP" : formatNumber(cost5);
    const btn5 = document.getElementById(`btn-${s}-5`);
    if (btn5) {
      btn5.disabled =
        gameState.runes.banked < cost5 || currentLevel + 5 > maxLevel;
      btn5.innerText = currentLevel >= maxLevel ? "MAX" : "+";
      btn5.classList.toggle("is-maxed", currentLevel >= maxLevel);
      btn5.title =
        currentLevel >= maxLevel
          ? "Niveau maximum atteint"
          : "Ameliorer cette statistique";
    }

    // Update +10 button
    const cost10 = getMultiUpgradeCost(s, 10);
    document.getElementById(`cost-${s}-10`).innerText =
      currentLevel >= maxLevel ? "CAP" : formatNumber(cost10);
    const btn10 = document.getElementById(`btn-${s}-10`);
    if (btn10) {
      btn10.disabled =
        gameState.runes.banked < cost10 || currentLevel + 10 > maxLevel;
      btn10.innerText = currentLevel >= maxLevel ? "MAX" : "+";
      btn10.classList.toggle("is-maxed", currentLevel >= maxLevel);
      btn10.title =
        currentLevel >= maxLevel
          ? "Niveau maximum atteint"
          : "Ameliorer cette statistique";
    }
  });

  /*
   * Le critique se pilote avec des points de competence, pas avec des runes :
   * un point tous les 10 niveaux, a repartir entre chance et degats. Les
   * boutons ne dependent donc plus du solde de runes ni du budget de niveaux.
   */
  const updateCrit = (id, statName, track, isPercent) => {
    const val = eff[statName];
    const baseVal = base[statName];
    const bonus = val - baseVal;

    document.getElementById(`eff-${id}`).innerText = isPercent
      ? `${(val * 100).toFixed(1)}%`
      : `${val.toFixed(1)}x`;

    const bonusEl = document.getElementById(`bonus-${id}`);
    if (bonusEl) {
      if (Math.abs(bonus) > 1e-9) {
        bonusEl.innerText = isPercent
          ? `Equip. ${bonus > 0 ? "+" : ""}${(bonus * 100).toFixed(1)}%`
          : `Equip. ${bonus > 0 ? "+" : ""}${bonus.toFixed(1)}x`;
        bonusEl.classList.toggle("has-positive", bonus > 0);
        bonusEl.classList.toggle("has-negative", bonus < 0);
      } else {
        bonusEl.innerText = "";
        bonusEl.classList.remove("has-positive", "has-negative");
      }
    }

    const ranks = getCritRanks();
    const rankEl = document.getElementById(`rank-${id}`);
    if (rankEl) {
      rankEl.innerText = `${ranks[track]} rg`;
      rankEl.title = isPercent
        ? `Chaque rang ajoute ${(CRIT_PER_RANK.chance * 100).toFixed(0)} points de pourcentage`
        : `Chaque rang ajoute ${CRIT_PER_RANK.damage.toFixed(2)}x`;
    }

    const btn = document.getElementById(`btn-${id}-1`);
    if (btn) {
      const canSpend = available > 0;
      btn.disabled = !canSpend;
      btn.innerText = "+";
      btn.classList.toggle("is-maxed", !canSpend);
      btn.title = canSpend
        ? "Investir un point de competence"
        : "Aucun point disponible : montez de niveau";
    }
  };

  const available = getCritPointsAvailable();
  const total = getCritPointsTotal();
  const spent = getCritPointsSpent();

  const availableEl = document.getElementById("crit-points-available");
  if (availableEl) availableEl.innerText = `${available} / ${total}`;

  const hintEl = document.getElementById("crit-points-hint");
  if (hintEl) {
    const nextAt =
      (Math.floor(currentLevel / LEVELS_PER_CRIT_POINT) + 1) *
      LEVELS_PER_CRIT_POINT;
    hintEl.innerText =
      nextAt > maxLevel
        ? "Tous les points sont acquis"
        : `Prochain point au niveau ${nextAt}`;
  }

  const respecBtn = document.getElementById("btn-crit-respec");
  if (respecBtn) respecBtn.disabled = spent === 0;

  updateCrit("critChance", "critChance", "chance", true);
  updateCrit("critDamage", "critDamage", "damage", false);

  /*
   * Au-dela de 100% de chance effective, le surplus devient du super critique.
   * On l'affiche explicitement, sinon le joueur n'a aucun moyen de savoir que
   * ses points de chance au-dela du plafond servent encore a quelque chose.
   */
  const superEl = document.getElementById("crit-super-line");
  if (superEl) {
    const superChance = getSuperCritChance(eff);
    const mult = getCritDamageMultiplier(eff);
    superEl.innerText =
      superChance > 0
        ? `Super critique ${(superChance * 100).toFixed(1)}% des coups (x${(eff.critDamage * SUPER_CRIT_MULTIPLIER).toFixed(1)}) - degats moyens x${mult.toFixed(2)}`
        : `Degats moyens x${mult.toFixed(2)}. Au-dela de 100% de chance, le surplus devient du super critique.`;
    superEl.classList.toggle("is-active", superChance > 0);
  }
};

const updateEquipmentDisplay = () => {
  const renderSlotContent = (
    slot,
    title,
    meta = "",
    empty = false,
    icon = null,
  ) => {
    slot.innerHTML = `
      ${iconMarkup(icon, { scale: 3, frame: "slot-icon", label: empty ? "" : title })}
      <span class="slot-text">
        <strong class="slot-item-name">${echapperHtml(title)}</strong>
        <span class="slot-item-meta">${echapperHtml(meta)}</span>
      </span>
    `;
    slot.classList.toggle("slot-empty", empty);
  };

  Object.keys(gameState.equipped).forEach((slotType) => {
    const itemId = gameState.equipped[slotType];
    const slot = document.getElementById(`slot-${slotType}`);
    if (!slot) return;
    if (itemId) {
      const itemInInv = gameState.inventory.find((i) => i.id === itemId);
      if (itemInInv) {
        renderSlotContent(
          slot,
          itemInInv.name,
          `Niveau ${itemInInv.level} · Equipe`,
          false,
          getItemIcon(itemId, itemInInv.level),
        );
        attachTooltipEvents(slot, itemInInv);
        return;
      }
    }
    renderSlotContent(slot, "Emplacement vide", "Aucun objet equipe", true);
    detachTooltipEvents(slot);
  });

  const ashSlot = document.getElementById("slot-ash");
  const equippedAshId = gameState.equippedAsh;
  if (equippedAshId) {
    const ashData = ASHES_OF_WAR[equippedAshId];
    renderSlotContent(
      ashSlot,
      ashData.name,
      `${runtimeState.ashUsesLeft}/${ashData.maxUses} charges disponibles`,
      false,
      getAshIcon(equippedAshId),
    );
    attachTooltipEvents(ashSlot, equippedAshId, true);
  } else {
    renderSlotContent(
      ashSlot,
      "Aucune cendre equipee",
      "Selectionnez une ouverture",
      true,
    );
    detachTooltipEvents(ashSlot);
  }
};

const updateInventoryEquippedDisplay = () => {
  const container = document.getElementById("inventory-equipped-grid");
  if (!container) return;

  const equippedEntries = [
    { key: "weapon", label: "Arme", emptyLabel: "Aucune arme equipee" },
    { key: "armor", label: "Armure", emptyLabel: "Aucune armure equipee" },
    {
      key: "accessory",
      label: "Accessoire",
      emptyLabel: "Aucun accessoire equipe",
    },
    { key: "ash", label: "Cendre", emptyLabel: "Aucune cendre equipee" },
  ];

  container.innerHTML = "";

  equippedEntries.forEach(({ key, label, emptyLabel }) => {
    const card = document.createElement("div");
    card.className = `inventory-equipped-card item-type-${key}`;

    if (key === "ash") {
      const equippedAshId = gameState.equippedAsh;
      if (equippedAshId) {
        const ashData = ASHES_OF_WAR[equippedAshId];
        card.innerHTML = `
          ${iconMarkup(getAshIcon(equippedAshId), { scale: 3, frame: "item-icon", label: ashData.name })}
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${ashData.name}</strong>
          <span class="inventory-equipped-meta">${runtimeState.ashUsesLeft}/${ashData.maxUses} charges</span>
        `;
        attachTooltipEvents(card, equippedAshId, true);
      } else {
        card.classList.add("inventory-equipped-empty");
        card.innerHTML = `
          ${iconMarkup(null, { scale: 3, frame: "item-icon" })}
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${emptyLabel}</strong>
          <span class="inventory-equipped-meta">A choisir ci-dessous</span>
        `;
      }
    } else {
      const itemId = gameState.equipped[key];
      const itemInInv = itemId
        ? gameState.inventory.find((item) => item.id === itemId)
        : null;

      if (itemInInv) {
        card.innerHTML = `
          ${iconMarkup(getItemIcon(itemId, itemInInv.level), { scale: 3, frame: "item-icon", label: itemInInv.name })}
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${echapperHtml(itemInInv.name)}</strong>
          <span class="inventory-equipped-meta">Niv.${itemInInv.level} · Equipe</span>
        `;
        attachTooltipEvents(card, itemInInv);
      } else {
        card.classList.add("inventory-equipped-empty");
        card.innerHTML = `
          ${iconMarkup(null, { scale: 3, frame: "item-icon" })}
          <span class="inventory-equipped-label">${label}</span>
          <strong class="inventory-equipped-name">${emptyLabel}</strong>
          <span class="inventory-equipped-meta">A equiper depuis l'inventaire</span>
        `;
      }
    }

    container.appendChild(card);
  });
};

let selectedBiomeId = ensureUiState().selectedBiomeId || "limgrave_west";
let worldMapGraph = null;

const getKnownBiomeIds = () => {
  const unlocked = new Set(gameState.world.unlockedBiomes || []);
  const reachable = new Set();

  unlocked.forEach((biomeId) => {
    (BIOMES[biomeId]?.unlocks || []).forEach((nextId) => reachable.add(nextId));
  });

  return BIOME_ORDER.filter(
    (biomeId) => unlocked.has(biomeId) || reachable.has(biomeId),
  );
};

const getSuggestedBiomeId = () => {
  const playerLevel = gameState.stats.level || 1;
  const unlocked = BIOME_ORDER.filter((biomeId) =>
    gameState.world.unlockedBiomes.includes(biomeId),
  );

  return (
    unlocked.find((biomeId) => {
      const band = BIOME_GUIDE[biomeId]?.recommendedLevel;
      return band && playerLevel >= band[0] && playerLevel <= band[1];
    }) ||
    unlocked[unlocked.length - 1] ||
    "limgrave_west"
  );
};

/**
 * Portrait du heros. On garde l'animateur d'un rendu a l'autre : le recreer a
 * chaque updateUI relancerait la boucle d'animation et ferait clignoter le
 * sprite. On ne recharge la planche que si l'apparence change vraiment.
 */
let heroAnimator = null;
let heroAnimatorId = null;

const renderHeroPortrait = () => {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return null;

  // Stats effectives : l'equipement compte dans la silhouette.
  const heroId = getHeroIdForStats(getEffectiveStats());
  const sheet = HERO_SHEETS[heroId];

  if (heroAnimatorId !== heroId) {
    if (!heroAnimator) {
      heroAnimator = new SpriteAnimator(canvas, { scale: 5, fps: sheet.fps });
    }
    heroAnimator.play(sheet.file, sheet.rows.idle, { fps: sheet.fps });
    heroAnimatorId = heroId;
  }

  return heroId;
};

/* ------------------------------------------------------------------ */
/* Combattants animes                                                 */
/* ------------------------------------------------------------------ */

let combatHeroAnimator = null;
let combatHeroId = null;
let enemyAnimator = null;
let enemyVisualKey = null;
let enemyMountToken = 0;

/** Le heros de la lane de gauche, en attente. */
const mountCombatHero = () => {
  const canvas = document.getElementById("player-sprite");
  if (!canvas) return;

  const heroId = getHeroIdForStats(getEffectiveStats());
  if (combatHeroId === heroId && combatHeroAnimator) return;

  const sheet = HERO_SHEETS[heroId];
  if (!combatHeroAnimator) {
    // Echelle 4 contre 1.6 pour les monstres : les heros n'occupent qu'environ
    // 20 des 32px de leur cellule, les monstres 56 des 64. A echelle egale, le
    // monstre ecrasait le heros.
    combatHeroAnimator = new SpriteAnimator(canvas, {
      scale: 4,
      fps: sheet.fps,
    });
  }
  combatHeroAnimator.play(sheet.file, sheet.rows.idle, { fps: sheet.fps });
  combatHeroId = heroId;
};

/**
 * Monte le monstre courant dans la lane de droite.
 *
 * Le montage est asynchrone (chargement puis teinture de la planche) : un
 * jeton d'appel evite qu'un montage lent ecrase un montage plus recent quand
 * les ennemis s'enchainent vite.
 */
const mountCombatEnemy = async () => {
  const canvas = document.getElementById("enemy-sprite");
  if (!canvas) return;

  /*
   * On ne monte que sur un ennemi VIVANT.
   *
   * L'ancien code retombait sur currentEnemyGroup[0] quand plus personne
   * n'avait de points de vie. Juste apres la mort d'un boss, ce repli
   * remontait le boss mort — puis la creature suivante arrivait et supplantait
   * ce montage en cours. Comme la planche d'un boss fait 96px et n'est teintee
   * qu'a sa premiere apparition, c'est le montage le plus lent du jeu : la
   * fenetre de course s'ouvrait la, et nulle part ailleurs.
   *
   * Quand tout le groupe est a terre on garde simplement l'animateur en place,
   * qui joue deja son animation de mort. Rien a remonter.
   */
  const enemy = runtimeState.currentEnemyGroup?.find((e) => e.hp > 0);
  if (!enemy?.id) {
    // Aucun animateur encore monte : on prend la premiere creature du groupe
    // pour ne pas laisser le cadre vide au tout premier affichage.
    const fallback = enemyAnimator ? null : runtimeState.currentEnemyGroup?.[0];
    if (!fallback?.id) return;
    return mountCombatEnemyFor(canvas, fallback);
  }
  return mountCombatEnemyFor(canvas, enemy);
};

const mountCombatEnemyFor = async (canvas, enemy) => {
  const visual = getMonsterVisual(enemy.id);
  const key = `${enemy.id}:${visual.archetype}:${visual.tint}:${visual.scale}`;

  // La cle est posee AVANT l'attente, pas apres. updateHealthBars() est
  // appelee plusieurs fois par seconde pendant un combat : si on ne marquait
  // le montage qu'une fois termine, chaque appel relançait un montage et
  // invalidait le precedent par le jeton — aucun n'aboutissait jamais et le
  // sprite restait bloque sur l'ennemi precedent.
  if (key === enemyVisualKey) return;
  enemyVisualKey = key;

  /*
   * Le cadre s'adapte au gabarit de la creature.
   *
   * Il etait fige a 104px alors qu'un rare en fait 118 et un boss jusqu'a 148
   * — un boss sur trois reutilise une planche commune de 64px, ou l'echelle
   * cumulee monte a 2.32. Trois quarts du bestiaire debordaient par le haut.
   * La classe est posee sur la zone de combat et non sur une seule lane : les
   * deux camps doivent garder la meme ligne de sol.
   */
  const zone = document.getElementById("combat-zone");
  if (zone) {
    zone.classList.toggle("is-tier-boss", !!enemy.isBoss);
    zone.classList.toggle("is-tier-rare", !enemy.isBoss && !!enemy.isRare);
  }

  // On arrete l'ancien AVANT de monter le nouveau. Les deux animateurs
  // partagent le meme canvas : tant que l'ancien tournait pendant le
  // chargement du nouveau, chacun y dessinait sa frame a tour de role et les
  // deux creatures alternaient en scintillant.
  if (enemyAnimator) {
    enemyAnimator.destroy();
    enemyAnimator = null;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const token = ++enemyMountToken;
  let animator = null;
  try {
    // L'echelle vient desormais du gabarit de la planche, pas de l'appelant :
    // les boss ont des planches de 96px, les archetypes communs de 64px.
    animator = await mountMonster(canvas, visual, TINTS[visual.tint]);
  } catch (error) {
    console.warn("[combat] montage du monstre impossible :", error);
  }

  /*
   * Un montage plus recent a pris la main pendant l'attente.
   *
   * Il faut DETRUIRE l'animateur qu'on vient de creer, pas seulement sortir :
   * mountMonster l'a deja demarre, et plus personne ne detient sa reference.
   * Sans ce destroy il continue de peindre #enemy-sprite indefiniment, et
   * chaque montage supplante en laisse un de plus. Deux animateurs sur le meme
   * canvas se relaient d'une frame a l'autre : c'est exactement le
   * scintillement entre deux creatures.
   *
   * Les boss declenchent le probleme parce qu'ils enchainent deux changements
   * de cle rapproches — le boss mort, puis la creature suivante — et que leur
   * planche de 96px met plus longtemps a se teinter, ce qui elargit la fenetre
   * de course.
   */
  /*
   * Un montage plus recent a pris la main pendant l'attente.
   *
   * Il faut DETRUIRE l'animateur qu'on vient de creer, pas seulement sortir :
   * mountMonster l'a deja demarre et plus personne ne detient sa reference.
   * Sans ce destroy il peint #enemy-sprite indefiniment, et deux animateurs
   * sur le meme canvas se relaient d'une frame a l'autre — c'est exactement le
   * scintillement entre deux creatures.
   */
  if (token !== enemyMountToken) {
    animator?.destroy();
    return;
  }

  if (!animator) {
    // On libere la cle pour que le prochain rafraichissement retente.
    enemyVisualKey = null;
    return;
  }

  enemyAnimator = animator;
  renderEnemyEmblem(visual.emblem);
};

/**
 * Marque de faction a cote du monstre. Elle vit dans son propre element, hors
 * du canvas : la lane ennemie est retournee horizontalement pour que le
 * monstre fasse face au joueur, et un embleme dessine dans le canvas serait
 * retourne avec lui.
 */
const renderEnemyEmblem = (emblem) => {
  const host = document.getElementById("enemy-emblem");
  if (!host) return;
  host.innerHTML = emblem
    ? iconMarkup(getEmblemIcon(emblem), { scale: 2, label: "" })
    : "";
};

/**
 * Publie la hauteur reelle de la zone de combat dans une variable CSS.
 * Le bouton de cendre s'y cale : sa position etait une valeur en dur, que
 * l'ajout des sprites a rendue fausse.
 */
let combatZoneObserver = null;

/*
 * DEUX elements sont epingles en bas de l'ecran de combat : la barre
 * d'actions, qui fait plancher, et la zone de combat juste au-dessus. Cette
 * derniere a besoin de la hauteur de la premiere, mesuree ici plutot que fixee
 * en dur — le repli sur petite largeur la fait varier.
 *
 * Il y en avait trois : le bouton de cendre formait un etage supplementaire,
 * cale sur --combat-zone-height. Chaque etage dependant du precedent, un
 * changement de gabarit d'ennemi decalait toute la pile et le bouton retombait
 * sur les combattants. La cendre est passee dans la barre d'actions, et
 * --combat-zone-height n'a plus de lecteur.
 */
const STICKY_HEIGHTS = [["combat-actions", "--combat-actions-height"]];

const watchCombatZoneHeight = () => {
  if (combatZoneObserver) return;

  const nodes = STICKY_HEIGHTS.map(([id, prop]) => [
    document.getElementById(id),
    prop,
  ]).filter(([node]) => node);
  if (!nodes.length) return;

  const publish = () => {
    nodes.forEach(([node, prop]) => {
      document.documentElement.style.setProperty(
        prop,
        `${Math.round(node.getBoundingClientRect().height)}px`,
      );
    });
  };

  if (typeof ResizeObserver === "function") {
    combatZoneObserver = new ResizeObserver(publish);
    nodes.forEach(([node]) => combatZoneObserver.observe(node));
  }
  publish();
};

/*
 * Banniere d'evenement.
 *
 * Les evenements ne produisaient qu'une ligne de journal, perdue dans le flot
 * des coups : le joueur ne les remarquait pas. La banniere reste cinq secondes
 * au-dessus de la zone de combat, avec une barre de teinte qui dit tout de
 * suite s'il s'agit d'une aubaine ou d'une tuile.
 *
 * Elle n'attend aucun clic et n'en capte aucun : l'expedition automatique doit
 * pouvoir tourner sans personne devant l'ecran.
 */
const TON_PAR_GENRE = {
  caravane: "gain",
  loot: "gain",
  marchand: "gain",
  runes: "gain",
  altar: "grace",
  blessing: "grace",
  heal: "grace",
  trap: "danger",
  // Le genre de la patrouille rare est "ambush" et non "rare" : sans cette
  // ligne elle tombait dans le repli bleu, alors que c'est une menace.
  ambush: "danger",
  hazard: "danger",
  route: "route",
  brume: "route",
};

let masqueBanniereId = null;

export const showEventBanner = ({ title, kind, text }) => {
  const banniere = document.getElementById("event-banner");
  if (!banniere) return;

  document.getElementById("event-banner-title").innerText =
    title || "Evenement";
  document.getElementById("event-banner-text").innerText = text || "";
  banniere.dataset.tone = TON_PAR_GENRE[kind] || "route";

  // On repart de zero : un evenement qui en chasse un autre doit rejouer
  // l'apparition, pas heriter du minuteur precedent.
  clearTimeout(masqueBanniereId);
  banniere.hidden = false;
  /*
   * Un reflow force, et surtout PAS requestAnimationFrame.
   *
   * La transition a besoin que le navigateur ait calcule l'etat de depart
   * avant qu'on ajoute la classe, sinon elle ne se declenche pas. La premiere
   * version passait par rAF — qui est SUSPENDU quand l'onglet est en arriere-
   * plan. La banniere etait alors preparee, jamais revelee, puis masquee cinq
   * secondes plus tard : un joueur revenant sur l'onglet n'avait rien vu.
   *
   * Lire offsetWidth force le calcul immediatement, quel que soit l'etat de
   * l'onglet.
   */
  void banniere.offsetWidth;
  banniere.classList.add("is-visible");
  playSfx("event");

  masqueBanniereId = setTimeout(() => {
    banniere.classList.remove("is-visible");
    setTimeout(() => {
      banniere.hidden = true;
    }, 300);
  }, 5000);
};

/** Efface la banniere sans attendre, au retour au camp. */
export const clearEventBanner = () => {
  const banniere = document.getElementById("event-banner");
  if (!banniere) return;
  clearTimeout(masqueBanniereId);
  banniere.classList.remove("is-visible");
  banniere.hidden = true;
};

/** Appele a chaque rafraichissement des barres de vie. */
export const syncCombatSprites = () => {
  watchCombatZoneHeight();
  mountCombatHero();
  mountCombatEnemy();
};

/** L'ennemi encaisse un coup. */
export const playEnemyHurt = () => playMonsterAnimation(enemyAnimator, "hurt");

/** L'ennemi frappe. */
export const playEnemyAttack = () =>
  playMonsterAnimation(enemyAnimator, "attack");

/** L'ennemi meurt : il reste au sol, on ne revient pas a l'attente. */
export const playEnemyDeath = () =>
  playMonsterAnimation(enemyAnimator, "death");

/** Le heros frappe, dans la lane de combat. */
export const playHeroCombatAttack = () => {
  if (!combatHeroAnimator || !combatHeroId) return;
  const sheet = HERO_SHEETS[combatHeroId];
  combatHeroAnimator.play(sheet.file, sheet.rows.attack1, {
    fps: sheet.fps * 1.6,
    loop: false,
    onEnd: () =>
      combatHeroAnimator.play(sheet.file, sheet.rows.idle, { fps: sheet.fps }),
  });
};

/** Le heros encaisse. */
export const playHeroCombatHurt = () => {
  if (!combatHeroAnimator || !combatHeroId) return;
  const sheet = HERO_SHEETS[combatHeroId];
  combatHeroAnimator.play(sheet.file, sheet.rows.hurt, {
    fps: sheet.fps,
    loop: false,
    onEnd: () =>
      combatHeroAnimator.play(sheet.file, sheet.rows.idle, { fps: sheet.fps }),
  });
};

/**
 * Joue l'effet elementaire d'une cendre de guerre par-dessus la zone de combat,
 * et l'attaque correspondante sur le portrait du heros.
 *
 * Appele depuis combat.js au moment ou la cendre part. Purement cosmetique :
 * on n'attend pas la fin de l'animation pour resoudre le tour, sinon le rythme
 * du combat dependrait du nombre de frames de la planche.
 */
export const playAshEffect = (ashId) => {
  const canvas = document.getElementById("ash-effect-canvas");
  if (canvas) {
    canvas.classList.add("is-active");
    playEffectOnce(canvas, getAshElement(ashId), { scale: 3 }).finally(() => {
      canvas.classList.remove("is-active");
    });
  }
  playHeroAnimation("attack2");
};

/** Joue une animation ponctuelle puis revient a l'attente. */
export const playHeroAnimation = (name) => {
  if (!heroAnimator || !heroAnimatorId) return;
  const sheet = HERO_SHEETS[heroAnimatorId];
  const row = sheet.rows[name];
  if (!row) return;

  heroAnimator.play(sheet.file, row, {
    fps: sheet.fps,
    loop: false,
    onEnd: () =>
      heroAnimator.play(sheet.file, sheet.rows.idle, { fps: sheet.fps }),
  });
};

/* ------------------------------------------------------------------ */
/* Panneau de fin de partie : renaissance et epreuves                 */
/* ------------------------------------------------------------------ */

/**
 * Reste masque tant que le boss final n'est pas tombe au moins une fois.
 * Une fois visible, il ne disparait plus : le compteur de renaissances et les
 * epreuves accomplies restent consultables entre deux cycles.
 */
const renderEndgamePanel = () => {
  const root = document.getElementById("endgame-panel");
  if (!root) return;

  const count = getRebirthCount();
  const ready = canRebirth();
  if (!ready && count === 0) {
    root.classList.add("is-hidden");
    root.innerHTML = "";
    return;
  }
  root.classList.remove("is-hidden");

  const trials = TRIALS.map((trial) => {
    const done = isTrialCleared(trial.id);
    const locked = !ready;
    return `
      <div class="trial-card${done ? " is-cleared" : ""}">
        <div class="trial-card__head">
          <strong>${trial.name}</strong>
          <span class="trial-card__badge">${
            done ? "Accompli" : `Renaissance ${trial.suggestedRebirth}+`
          }</span>
        </div>
        <p class="trial-card__lore">${trial.lore}</p>
        <button
          type="button"
          onclick="startTrial('${trial.id}')"
          ${locked ? "disabled" : ""}
          title="${locked ? "Terminez le biome final de ce cycle pour y acceder" : "Aucun butin, aucune rune : l'exploit seul"}"
        >${done ? "Recommencer" : "Affronter"}</button>
      </div>
    `;
  }).join("");

  const cleared = TRIALS.filter((t) => isTrialCleared(t.id)).length;

  const spare = getRebirthPointsAvailable();
  const nodes = REBIRTH_NODES.map((node) => {
    const rank = getNodeRank(node.id);
    const full = rank >= node.maxRank;
    return `
      <div class="tree-node${full ? " is-full" : ""}">
        <div class="tree-node__head">
          <strong>${node.name}</strong>
          <span class="tree-node__rank">${rank} / ${node.maxRank}</span>
        </div>
        <p class="tree-node__detail">${node.detail}</p>
        <button
          type="button"
          onclick="investRebirthNode('${node.id}')"
          ${full || spare <= 0 ? "disabled" : ""}
          title="${full ? "Rang maximum" : spare <= 0 ? "Aucun point disponible" : "Investir un point"}"
        >${full ? "Max" : "+"}</button>
      </div>
    `;
  }).join("");

  root.innerHTML = `
    <div class="section-head">
      <div>
        <h3>Fin de partie</h3>
        <p>Renaitre pour recommencer plus vite, ou rester pour les epreuves.</p>
      </div>
    </div>

    <div class="endgame-stats">
      <div><span>Renaissances</span><b>${count}</b></div>
      <div><span>Gain de runes</span><b>+${Math.round(getRebirthRuneBonus() * 100)}%</b></div>
      <div><span>Niveau maximum</span><b>${getMaxLevel()}</b></div>
      <div><span>Epreuves</span><b>${cleared} / ${TRIALS.length}</b></div>
    </div>

    <div class="endgame-rebirth">
      <p class="panel-copy">
        ${
          ready
            ? `Renaitre remet le niveau, les statistiques, l'inventaire et les biomes a zero. Vous conservez le codex, les cendres de guerre et les deblocages de preparation. En echange : <strong>+${Math.round(REBIRTH_RUNE_BONUS * 100)}% de gain de runes</strong> et <strong>+${REBIRTH_LEVEL_BONUS} au niveau maximum</strong>, de facon permanente.`
            : "Terminez le dernier biome de ce cycle pour rouvrir la Renaissance."
        }
      </p>
      <button
        type="button"
        class="endgame-rebirth__btn"
        onclick="requestRebirth()"
        ${ready ? "" : "disabled"}
      >Renaitre${ready ? ` (${count + 1})` : ""}</button>
    </div>

    ${
      count > 0
        ? `
    <div class="section-head section-head-tight">
      <div>
        <h4>Arbre de renaissance</h4>
        <p>${getRebirthPointsAvailable()} / ${getRebirthPointsTotal()} point(s) disponible(s). ${POINTS_PER_REBIRTH} par renaissance.</p>
      </div>
      <button
        type="button"
        class="crit-points__reset"
        onclick="respecRebirthTree()"
        ${getRebirthPointsSpent() === 0 ? "disabled" : ""}
      >Reinitialiser</button>
    </div>
    <div class="rebirth-tree">${nodes}</div>`
        : ""
    }

    <div class="section-head section-head-tight">
      <div>
        <h4>Epreuves</h4>
        <p>Des boss hors progression. Aucun butin, aucune rune : seulement l'exploit.</p>
      </div>
    </div>
    <div class="trial-grid">${trials}</div>
  `;
};

const renderHeroPanel = () => {
  const heroId = renderHeroPortrait();
  if (!heroId) return;

  const archetype = ARCHETYPES[heroId] || ARCHETYPES.water;
  const titleEl = document.getElementById("hero-archetype");
  const noteEl = document.getElementById("hero-archetype-note");
  if (titleEl) titleEl.innerText = archetype.title;
  if (noteEl) noteEl.innerText = archetype.note;

  const statsRoot = document.getElementById("hero-stats");
  if (!statsRoot) return;

  const eff = getEffectiveStats();
  const keys = Object.keys(STAT_META);
  const invested = keys.map((key) => Number(gameState.stats[key]) || 0);
  const totals = keys.map((key) => Math.round(Number(eff[key]) || 0));
  // La barre se lit sur le total, comme le chiffre affiche a cote. Elle etait
  // tracee sur les points investis : une arme qui donnait +15 de force
  // n'allongeait pas la barre de force.
  const highest = Math.max(1, ...totals);
  const dominant = getDominantStat(eff);

  const rows = keys
    .map((key, index) => {
      const meta = STAT_META[key];
      const base = invested[index];
      const total = totals[index];
      const bonus = total - base;
      const isDominant = key === dominant;

      return `
        <div class="hero-stat${isDominant ? " is-dominant" : ""}">
          <span class="hero-stat__label">
            ${iconMarkup(getStatIcon(key), { scale: 1, className: "hero-stat__icon" })}
            ${meta.label}
          </span>
          <div class="hero-stat__track">
            <div class="hero-stat__fill" style="width:${Math.round((total / highest) * 100)}%;background:${meta.accent}"></div>
          </div>
          <span class="hero-stat__value">
            ${total}${bonus > 0 ? `<small>+${bonus}</small>` : ""}
          </span>
        </div>
      `;
    })
    .join("");

  statsRoot.innerHTML = `
    <div class="hero-stats__head">
      <div>
        <span class="detail-label">Niveau</span>
        <strong>${gameState.stats.level || 0}</strong>
      </div>
      <div>
        <span class="detail-label">Armure</span>
        <strong>${Math.round(eff.armor)}</strong>
      </div>
      <div>
        <span class="detail-label">Zones reperees</span>
        <strong>${gameState.world.unlockedBiomes.length}</strong>
      </div>
    </div>
    ${rows}
  `;
};

const renderHubFocus = () => {
  const card = document.getElementById("hub-focus-card");
  if (!card) return;

  const suggestedId = getSuggestedBiomeId();
  const biomeId = selectedBiomeId || suggestedId;
  const biome = BIOMES[biomeId];
  const guide = BIOME_GUIDE[biomeId];
  const isUnlocked = gameState.world.unlockedBiomes.includes(biomeId);
  const nextRoute = (biome?.unlocks || [])
    .map((id) => BIOMES[id]?.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  card.innerHTML = `
    <div class="panel-topline">
      <span class="panel-kicker">Biome recommande</span>
      <span class="panel-note">${guide?.chapter || "Campagne"} · ${guide?.region || "Inconnu"}</span>
    </div>
    <div>
      <h3 class="hub-focus-card__title">${biome?.name || "Biome inconnu"}</h3>
      <p class="screen-copy">${guide?.focus || "Aucune recommandation disponible."}</p>
    </div>
    <div class="hub-focus-card__stats">
      <div class="hub-focus-card__stat">
        <span class="detail-label">Puissance</span>
        <strong>${getBiomePowerBand(biomeId)}</strong>
      </div>
      <div class="hub-focus-card__stat">
        <span class="detail-label">Danger</span>
        <strong>${guide?.danger || "Inconnu"}</strong>
      </div>
      <div class="hub-focus-card__stat">
        <span class="detail-label">Role</span>
        <strong>${guide?.pathRole || "Biome actif"}</strong>
      </div>
      <div class="hub-focus-card__stat">
        <span class="detail-label">Apres victoire</span>
        <strong>${nextRoute || "Cycle rentable"}</strong>
      </div>
    </div>
    <div class="biome-detail-actions">
      <button id="start-suggested-biome" ${!isUnlocked || gameState.world.isExploring ? "disabled" : ""}>
        ${isUnlocked ? "Explorer ce biome" : "Explorer la carte"}
      </button>
      <button type="button" onclick="navigateTo('map')">Voir la carte detaillee</button>
    </div>
  `;

  const startBtn = document.getElementById("start-suggested-biome");
  if (startBtn) {
    startBtn.onclick = () => {
      if (isUnlocked) {
        startExploration(biomeId);
      } else {
        navigateTo("map");
      }
    };
  }
};

/**
 * Cable les boutons de la carte, une seule fois.
 *
 * Ils agissent sur worldMapGraph, qui est recree a chaque rendu : on lit donc
 * la reference au moment du clic, jamais au moment du cablage.
 */
let mapControlsBound = false;

const bindMapControls = () => {
  if (mapControlsBound) return;

  const withGraph = (fn) => () => {
    const graph = worldMapGraph;
    if (!graph || graph.destroyed?.() || !graph._private?.renderer) return;
    try {
      fn(graph);
    } catch (error) {
      console.warn("Commande de carte ignoree :", error);
    }
  };

  const wire = (id, handler) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", handler);
  };

  wire(
    "map-zoom-in",
    withGraph((g) =>
      g.zoom({ level: g.zoom() * 1.3, renderedPosition: centerOfMap() }),
    ),
  );
  wire(
    "map-zoom-out",
    withGraph((g) =>
      g.zoom({ level: g.zoom() / 1.3, renderedPosition: centerOfMap() }),
    ),
  );
  wire("map-fit", withGraph(frameMap));
  wire(
    "map-locate",
    withGraph((g) => {
      const node = g.getElementById(selectedBiomeId);
      if (!node || !node.length) return;
      g.animate({ center: { eles: node }, zoom: 1.6 }, { duration: 260 });
    }),
  );

  mapControlsBound = true;
};

/**
 * Cadre le graphe sur son conteneur.
 *
 * `fit` seul ne suffit pas : dans une colonne etroite, faire tenir 34 noeuds
 * donne un zoom de 0.11 ou plus rien n'est cliquable. En dessous d'un plancher,
 * on renonce a la vue d'ensemble et on centre sur la zone selectionnee — le
 * navigateur par chapitres prend alors le relais pour se deplacer.
 */
const MIN_OVERVIEW_ZOOM = 0.28;

const frameMap = (graph) => {
  if (!graph || graph.destroyed?.() || !graph._private?.renderer) return;
  try {
    graph.resize();
    graph.fit(undefined, 48);
    if (graph.zoom() >= MIN_OVERVIEW_ZOOM) return;

    graph.zoom(MIN_OVERVIEW_ZOOM);
    const focus =
      graph.getElementById(selectedBiomeId) ||
      graph.getElementById(gameState.world.currentBiome);
    if (focus?.length) graph.center(focus);
  } catch (error) {
    console.warn("Cadrage de la carte ignore :", error);
  }
};

/**
 * Recadre la carte des que son conteneur change de taille.
 *
 * L'ecran de la carte passe de display:none a block a la navigation : au
 * premier rendu, Cytoscape s'initialise sur un conteneur encore sans
 * dimensions et dessine dans le vide. Un simple requestAnimationFrame ne
 * suffit pas, la taille peut arriver plus tard. L'observateur couvre aussi le
 * redimensionnement de la fenetre et les changements de mise en page.
 */
let mapResizeObserver = null;

const watchMapSize = () => {
  const map = document.getElementById("world-map");
  if (!map || mapResizeObserver || typeof ResizeObserver !== "function") return;

  let lastWidth = 0;
  let lastHeight = 0;

  mapResizeObserver = new ResizeObserver(() => {
    const graph = worldMapGraph;
    if (!graph || graph.destroyed?.() || !graph._private?.renderer) return;

    const { clientWidth: w, clientHeight: h } = map;
    if (!w || !h) return;
    if (w === lastWidth && h === lastHeight) return;
    lastWidth = w;
    lastHeight = h;

    frameMap(graph);
  });

  mapResizeObserver.observe(map);
};

const centerOfMap = () => {
  const map = document.getElementById("world-map");
  return {
    x: (map?.clientWidth || 0) / 2,
    y: (map?.clientHeight || 0) / 2,
  };
};

/**
 * Navigateur par chapitres.
 *
 * Remplace la liste plate de "departs rapides", qui melangeait 34 biomes sans
 * hierarchie. Les chapitres existaient deja dans les donnees mais n'etaient
 * qu'un libelle decoratif : ils servent maintenant de structure.
 *
 * Un chapitre est replie par defaut sauf s'il contient la zone selectionnee ou
 * la zone courante — on ouvre sur ce qui concerne le joueur, pas sur tout.
 */
// Etat explicite : ne contient QUE les chapitres que le joueur a lui-meme
// ouverts ou replies. Un clic doit toujours gagner contre l'heuristique
// d'ouverture automatique, sinon le chapitre contenant la zone selectionnee
// devient impossible a replier.
const chapterState = new Map();

const renderBiomeShortcuts = (visibleIds) => {
  const list = document.getElementById("biome-list");
  if (!list) return;

  const visible = new Set(visibleIds);

  // On suit l'ordre de BIOME_ORDER : c'est celui de la progression.
  const chapters = [];
  const byChapter = new Map();
  BIOME_ORDER.forEach((biomeId) => {
    if (!visible.has(biomeId)) return;
    const chapter = BIOME_GUIDE[biomeId]?.chapter || "Hors chapitre";
    if (!byChapter.has(chapter)) {
      byChapter.set(chapter, []);
      chapters.push(chapter);
    }
    byChapter.get(chapter).push(biomeId);
  });

  list.innerHTML = "";

  chapters.forEach((chapter) => {
    const biomes = byChapter.get(chapter);
    const unlockedCount = biomes.filter((id) =>
      gameState.world.unlockedBiomes.includes(id),
    ).length;
    const holdsFocus = biomes.some(
      (id) => id === selectedBiomeId || id === gameState.world.currentBiome,
    );
    // Par defaut on n'ouvre que le chapitre concerne : avec dix chapitres et
    // 34 zones, tout deplier oblige a defiler pour rien.
    const collapsed = chapterState.has(chapter)
      ? chapterState.get(chapter)
      : !holdsFocus;

    const section = document.createElement("section");
    section.className = `chapter-group${collapsed ? " is-collapsed" : ""}`;

    const head = document.createElement("button");
    head.type = "button";
    head.className = "chapter-group__head";
    head.setAttribute("aria-expanded", String(!collapsed));
    head.innerHTML = `
      <span class="chapter-group__name">${chapter}</span>
      <span class="chapter-group__count">${unlockedCount}/${biomes.length}</span>
      <span class="chapter-group__chevron" aria-hidden="true"></span>
    `;
    head.onclick = () => {
      chapterState.set(chapter, !collapsed);
      renderBiomeShortcuts(visibleIds);
    };
    section.appendChild(head);

    const body = document.createElement("div");
    body.className = "chapter-group__body";

    biomes.forEach((biomeId) => {
      const guide = BIOME_GUIDE[biomeId];
      const unlocked = gameState.world.unlockedBiomes.includes(biomeId);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = [
        "biome-shortcut",
        biomeId === selectedBiomeId ? "active-shortcut" : "",
        unlocked ? "" : "is-locked",
        biomeId === gameState.world.currentBiome ? "is-current" : "",
        guide?.wip ? "is-wip" : "",
      ]
        .filter(Boolean)
        .join(" ");

      btn.innerHTML = `
        <span class="biome-shortcut__title">${BIOMES[biomeId]?.name || biomeId}</span>
        <span class="biome-shortcut__meta">
          ${getBiomePowerBand(biomeId)} · ${guide?.danger || "?"}
        </span>
      `;

      // Les zones verrouillees restent cliquables : on peut lire leur fiche
      // pour preparer la suite, on ne peut simplement pas s'y deployer.
      btn.onclick = () => {
        selectedBiomeId = biomeId;
        ensureUiState().selectedBiomeId = biomeId;
        saveGame();
        updateBiomeDisplay();
      };

      body.appendChild(btn);
    });

    section.appendChild(body);
    list.appendChild(section);
  });
};

const renderWorldMap = (visibleIds) => {
  const map = document.getElementById("world-map");
  const paths = document.getElementById("world-map-paths");
  if (!map || !paths) return;

  bindMapControls();
  watchMapSize();

  const visibleSet = new Set(visibleIds);
  paths.innerHTML = "";

  if (typeof window.cytoscape === "function") {
    const css = getComputedStyle(document.body);
    const textColor = css.getPropertyValue("--text").trim() || "#2f2418";
    const surfaceStrong =
      css.getPropertyValue("--surface-strong").trim() || "#fffaf1";
    const borderStrong =
      css.getPropertyValue("--border-strong").trim() || "#6f5d3d";
    const success = css.getPropertyValue("--success").trim() || "#607a45";
    const info = css.getPropertyValue("--info").trim() || "#5f7f9f";
    const accent = css.getPropertyValue("--accent").trim() || "#867142";
    const danger = css.getPropertyValue("--danger").trim() || "#b75b3b";
    const bg = css.getPropertyValue("--surface-subtle").trim() || "#191510";
    const elements = [];
    const depthMemo = new Map();
    const groupedByDepth = new Map();

    visibleIds.forEach((biomeId) => {
      const depth = getBiomeGraphDepth(biomeId, depthMemo);
      if (!groupedByDepth.has(depth)) groupedByDepth.set(depth, []);
      groupedByDepth.get(depth).push(biomeId);
    });

    visibleIds.forEach((biomeId) => {
      const guide = BIOME_GUIDE[biomeId];
      const isUnlocked = gameState.world.unlockedBiomes.includes(biomeId);
      const depth = getBiomeGraphDepth(biomeId, depthMemo);
      const siblings = groupedByDepth.get(depth) || [biomeId];
      const siblingIndex = siblings.indexOf(biomeId);
      const hasManualPosition =
        Number.isFinite(guide?.x) && Number.isFinite(guide?.y);
      const centeredOffset = siblingIndex - (siblings.length - 1) / 2;
      const autoX = depth * 240 + 140;
      const autoY = 420 + centeredOffset * 170;
      elements.push({
        data: {
          id: biomeId,
          label: BIOMES[biomeId]?.name || biomeId,
          band: getBiomePowerBand(biomeId),
          state: isUnlocked ? "unlocked" : "reachable",
        },
        position: {
          x: hasManualPosition ? guide.x * 18 : autoX,
          y: hasManualPosition ? guide.y * 18 : autoY,
        },
        classes: [
          isUnlocked ? "unlocked-node" : "reachable-node",
          biomeId === selectedBiomeId ? "selected-node" : "",
          biomeId === gameState.world.currentBiome ? "current-node" : "",
          guide?.wip ? "wip-node" : "",
        ]
          .filter(Boolean)
          .join(" "),
      });

      (BIOMES[biomeId]?.unlocks || []).forEach((nextId) => {
        if (!visibleSet.has(nextId) || !BIOME_GUIDE[nextId]) return;
        elements.push({
          data: {
            id: `${biomeId}->${nextId}`,
            source: biomeId,
            target: nextId,
          },
        });
      });
    });

    if (worldMapGraph) {
      worldMapGraph.destroy();
      worldMapGraph = null;
    }

    const currentGraph = window.cytoscape({
      container: map,
      elements,
      layout: {
        name: "preset",
        fit: false,
        padding: 80,
        animate: false,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: true,
      wheelSensitivity: 0.16,
      style: [
        {
          selector: "node",
          style: {
            width: 22,
            height: 22,
            label: "data(label)",
            "font-family": "Spectral",
            "font-size": 10,
            color: textColor,
            "text-wrap": "wrap",
            "text-max-width": 110,
            "text-valign": "bottom",
            "text-margin-y": 8,
            "background-color": surfaceStrong,
            "border-width": 2,
            "border-color": borderStrong,
            "overlay-opacity": 0,
            // Fond derriere le texte : sur une carte dense les libelles
            // passaient par-dessus les aretes et devenaient illisibles.
            "text-background-color": bg,
            "text-background-opacity": 0.78,
            "text-background-padding": 3,
            "text-background-shape": "roundrectangle",
            // En vue d'ensemble, 34 libelles se chevauchent et rendent la
            // carte illisible. Cytoscape les masque en dessous de cette taille
            // rendue : ils reapparaissent au zoom, ou l'on a la place.
            "min-zoomed-font-size": 11,
          },
        },
        {
          // Contenu en chantier : present mais visiblement en retrait.
          selector: ".wip-node",
          style: {
            opacity: 0.4,
            "border-style": "dashed",
          },
        },
        {
          // La zone courante et la zone selectionnee gardent leur libelle en
          // vue d'ensemble : leur police est assez grande pour passer le seuil.
          selector: ".current-node",
          style: {
            // Zone courante : anneau d'accent, nettement plus grosse. En vue
            // d'ensemble le texte est illisible quel que soit le seuil (a 0.36
            // de zoom, une police de 12 rend 4px) : ce sont la taille et la
            // couleur qui portent l'information, pas le libelle.
            width: 30,
            height: 30,
            // "border-color" et "border-width" etaient declares deux fois dans
            // cet objet. Les premieres valeurs etaient mortes : en JavaScript
            // la derniere occurrence gagne, l'anneau faisait donc bien 5 et non
            // 4. Le rendu est inchange, seules les lignes sans effet partent.
            "border-color": accent,
            "border-width": 5,
            "font-size": 12,
            color: accent,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-style": "dashed",
            "line-dash-pattern": [8, 5],
            "line-color": borderStrong,
            "target-arrow-shape": "none",
            "curve-style": "bezier",
            opacity: 0.9,
          },
        },
        {
          selector: ".unlocked-node",
          style: {
            "border-color": success,
            "background-color": surfaceStrong,
          },
        },
        {
          selector: ".reachable-node",
          style: {
            "border-color": info,
            "background-color": surfaceStrong,
          },
        },
        {
          selector: ".selected-node",
          style: {
            width: 34,
            height: 34,
            "border-color": danger,
            "border-width": 4,
            "background-color": surfaceStrong,
            "z-index": 999,
          },
        },
        {
          selector: ".selected-node[label]",
          style: {
            "font-size": 13,
            color: danger,
          },
        },
      ],
    });
    worldMapGraph = currentGraph;
    // Poignee de debogage : sans elle, impossible d'inspecter les styles
    // appliques depuis la console.
    window.__eldenChillMap = currentGraph;

    currentGraph.off("tap");
    currentGraph.on("tap", "node", (event) => {
      const biomeId = event.target.id();
      selectedBiomeId = biomeId;
      ensureUiState().selectedBiomeId = biomeId;
      saveGame();
      updateBiomeDisplay();
    });

    // Vue d'ensemble par defaut. L'ancienne version centrait sur la zone
    // selectionnee avec un zoom fixe : sur 34 biomes, on ne voyait que deux ou
    // trois noeuds et la carte paraissait vide.
    requestAnimationFrame(() => {
      if (!currentGraph || currentGraph !== worldMapGraph) return;
      frameMap(currentGraph);
    });

    return;
  }

  map.innerHTML = "";
};

/*
 * Les traits sont affiches ici, et c'est indispensable : un trait modifie les
 * regles pendant toute l'expedition (soins coupes, esquive annulee, ennemis qui
 * s'emballent). Une regle qu'on subit sans pouvoir la lire avant de partir est
 * une mauvaise surprise, pas une mecanique.
 */
const renderBiomeDetail = (biomeId) => {
  const card = document.getElementById("biome-detail-card");
  if (!card || !biomeId) return;

  const biome = BIOMES[biomeId];
  const guide = BIOME_GUIDE[biomeId];
  const isUnlocked = gameState.world.unlockedBiomes.includes(biomeId);
  const traits = (BIOMES[biomeId]?.traits || [])
    .map(getBiomeTrait)
    .filter(Boolean);
  const lootPreview = (LOOT_TABLES[biomeId] || [])
    .map((loot) => ITEMS[loot.id]?.name)
    .filter(Boolean)
    .slice(0, 3);
  const nextBiomes = (biome.unlocks || [])
    .map((nextId) => BIOMES[nextId]?.name)
    .filter(Boolean);
  const monsters = (biome.monsters || [])
    .map((monsterId) => MONSTERS[monsterId]?.name)
    .filter(Boolean)
    .slice(0, 3);
  const rares = (biome.rareMonsters || [])
    .map((monsterId) => MONSTERS[monsterId]?.name)
    .filter(Boolean)
    .slice(0, 2);
  const bossName = MONSTERS[biome.boss]?.name || "Inconnu";

  card.innerHTML = `
    <div class="biome-detail-header">
      <div>
        <p class="detail-kicker">${guide?.chapter || "Zone"} · ${guide?.region || "Inconnu"}</p>
        <h4>${biome.name}</h4>
      </div>
      <span class="danger-badge ${getBiomeDangerClass(biomeId)}">${guide?.danger || "Inconnu"}</span>
    </div>
    <p class="biome-focus">${guide?.focus || "Aucune recommandation disponible."}</p>
    <div class="biome-detail-grid">
      <div class="detail-block">
        <span class="detail-label">Puissance attendue</span>
        <strong>${getBiomePowerBand(biomeId)}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Boss</span>
        <strong>${bossName}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Menaces</span>
        <strong>${monsters.join(", ") || "???"}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Rares</span>
        <strong>${rares.join(", ") || "Aucun repere"}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Recompenses</span>
        <strong>${lootPreview.join(", ") || "Butin special inconnu"}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Afflictions</span>
        <strong>${describeHazards(biomeId)}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Apres la victoire</span>
        <strong>${nextBiomes.join(", ") || "Cul-de-sac rentable"}</strong>
      </div>
    </div>
    ${traits
      .map(
        (t) => `
      <div class="biome-trait">
        <span class="biome-trait__label">Regle de la zone</span>
        <strong>${t.name}</strong>
        <p>${t.detail}</p>
      </div>`,
      )
      .join("")}
    <div class="biome-detail-actions">
      <button id="start-selected-biome" ${!isUnlocked || gameState.world.isExploring ? "disabled" : ""}>
        ${isUnlocked ? "Explorer cette zone" : "Zone pas encore debloquee"}
      </button>
      <span class="detail-path-role">${guide?.pathRole || ""}</span>
    </div>
  `;

  const startButton = document.getElementById("start-selected-biome");
  if (startButton && isUnlocked) {
    startButton.onclick = () => startExploration(biomeId);
  }
};

const updateBiomeDisplay = () => {
  selectedBiomeId = ensureUiState().selectedBiomeId || selectedBiomeId;
  const visibleIds = getKnownBiomeIds();
  if (!selectedBiomeId || !visibleIds.includes(selectedBiomeId)) {
    selectedBiomeId = getSuggestedBiomeId();
    ensureUiState().selectedBiomeId = selectedBiomeId;
  }

  renderHeroPanel();
  renderWorldMap(visibleIds);
  renderBiomeDetail(selectedBiomeId);
  renderBiomeShortcuts(visibleIds);
  renderHubFocus();
  renderEndgamePanel();
  updateAutomationDisplay();
};

const renderPreparationDisplay = () => {
  const blessingsRoot = document.getElementById("blessings-list");
  const consumablesRoot = document.getElementById("consumables-list");
  if (!blessingsRoot || !consumablesRoot) return;

  blessingsRoot.innerHTML = "";
  consumablesRoot.innerHTML = "";

  const createEmptyPrepOption = ({
    title,
    description,
    details,
    active,
    onClick,
  }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "prep-option prep-option-empty";
    btn.classList.toggle("is-active", active);
    btn.innerHTML = `
      <strong>${title}</strong>
      <span>${description}</span>
      <small>${details}</small>
    `;
    btn.onclick = onClick;
    return btn;
  };

  blessingsRoot.appendChild(
    createEmptyPrepOption({
      title: "Aucune bénédiction",
      description:
        "Partir sans grâce active et compter uniquement sur le build.",
      details: "Aucun bonus temporaire n'est appliqué pour cette expédition.",
      active: !gameState.preparation?.selectedBlessingId,
      onClick: () => selectBlessing(null),
    }),
  );

  consumablesRoot.appendChild(
    createEmptyPrepOption({
      title: "Aucun atout",
      description: "Conserver ses outils et partir sans atout d'expedition.",
      details: "Aucun modificateur de run n'est applique au depart.",
      active: !gameState.preparation?.selectedConsumableId,
      onClick: () => selectPreparationConsumable(null),
    }),
  );

  const unlockedBlessings = new Set(
    gameState.preparation?.unlockedBlessings || [],
  );
  const unlockedConsumables = new Set(
    gameState.preparation?.unlockedConsumables || [],
  );

  Object.values(BLESSINGS)
    .filter((blessing) => unlockedBlessings.has(blessing.id))
    .forEach((blessing) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prep-option";
      btn.classList.toggle(
        "is-active",
        gameState.preparation?.selectedBlessingId === blessing.id,
      );
      btn.innerHTML = `
      <strong>${blessing.name}</strong>
      <span>${blessing.description}</span>
      <small>${blessing.detailedDescription || ""}</small>
    `;
      btn.onclick = () => selectBlessing(blessing.id);
      blessingsRoot.appendChild(btn);
    });

  Object.values(PREP_CONSUMABLES)
    .filter((consumable) => unlockedConsumables.has(consumable.id))
    .forEach((consumable) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prep-option";
      btn.classList.toggle(
        "is-active",
        gameState.preparation?.selectedConsumableId === consumable.id,
      );
      btn.innerHTML = `
      <strong>${consumable.name}</strong>
      <span>${consumable.description}</span>
      <small>${consumable.detailedDescription || ""}</small>
    `;
      btn.onclick = () => selectPreparationConsumable(consumable.id);
      consumablesRoot.appendChild(btn);
    });
};

window.setJournalFilter = (value) => {
  if (!gameState.journal) return;
  gameState.journal.filter = value;
  updateJournalDisplay();
  saveGame();
};

const updateJournalDisplay = () => {
  const root = document.getElementById("journal-entries");
  const filterEl = document.getElementById("journal-filter-kind");
  if (!root) return;
  const filterValue = gameState.journal?.filter || "all";
  if (filterEl) filterEl.value = filterValue;
  const entries = (gameState.journal?.entries || [])
    .filter((entry) => entry.runId === runtimeState.currentCombatSession)
    .filter((entry) => filterValue === "all" || entry.kind === filterValue);

  root.innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <article class="journal-entry">
              <div class="journal-entry-head">
                <strong>${entry.title}</strong>
                <span>${BIOMES[entry.biomeId]?.name || "Monde"}</span>
              </div>
              <p>${entry.text}</p>
            </article>
          `,
        )
        .join("")
    : `<p class="journal-empty">Le journal s'ecrira au fil de la prochaine expedition.</p>`;
};

const updateCodexDisplay = () => {
  syncCodexFromInventory();
  const bossRoot = document.getElementById("codex-bosses");
  const monsterRoot = document.getElementById("codex-monsters");
  const setsRoot = document.getElementById("codex-sets");
  const biomeRoot = document.getElementById("codex-biomes");
  const eventsRoot = document.getElementById("codex-events");
  if (!bossRoot || !monsterRoot || !setsRoot || !biomeRoot || !eventsRoot) {
    return;
  }

  const renderList = (root, rows, emptyLabel) => {
    root.innerHTML = rows.length
      ? rows
          .map(
            (row) => `
              <article class="codex-entry">
                <strong>${row.title}</strong>
                <span>${row.meta || ""}</span>
                ${row.copy ? `<p>${row.copy}</p>` : ""}
              </article>
            `,
          )
          .join("")
      : `<p class="codex-empty">${emptyLabel}</p>`;
  };

  renderList(
    bossRoot,
    Object.keys(gameState.codex?.bossesSeen || {}).map((monsterId) => ({
      title: MONSTERS[monsterId]?.name || monsterId,
      meta:
        BIOMES[gameState.codex.bossesSeen[monsterId].biomeId]?.name ||
        "Biome inconnu",
      copy: "Boss reference de votre route et mur de progression memorise.",
    })),
    "Aucun boss note pour le moment.",
  );

  renderList(
    monsterRoot,
    Object.keys(gameState.codex?.monstersSeen || {}).map((monsterId) => ({
      title: MONSTERS[monsterId]?.name || monsterId,
      meta:
        BIOMES[gameState.codex.monstersSeen[monsterId].biomeId]?.name ||
        "Biome inconnu",
      copy: MONSTERS[monsterId]?.isRare
        ? "Elite rencontre"
        : "Menace repertoriee",
    })),
    "Aucun monstre consigne pour le moment.",
  );

  renderList(
    setsRoot,
    Object.keys(gameState.codex?.setsSeen || {}).map((setId) => ({
      title: ITEM_SETS[setId]?.name || setId,
      meta: "Set decouvert",
      copy: Object.values(ITEMS)
        .filter((item) => item.set === setId)
        .map((item) => item.name)
        .slice(0, 3)
        .join(" · "),
    })),
    "Aucun set identifie pour le moment.",
  );

  renderList(
    biomeRoot,
    getKnownCodexBiomes().map((biomeId) => {
      const info = getCodexBiomeInfo(biomeId);
      return {
        title: info.biome?.name || biomeId,
        meta: info.guide
          ? `Niv. ${info.guide.recommendedLevel[0]}-${info.guide.recommendedLevel[1]}`
          : "",
        copy: info.guide ? describeHazards(biomeId) : "Biome nettoye",
      };
    }),
    "Aucun biome entierement nettoye pour le moment.",
  );

  renderList(
    eventsRoot,
    Object.keys(gameState.codex?.eventsSeen || {}).map((eventId) => ({
      title: EVENT_DEFS[eventId]?.title || eventId,
      meta:
        BIOMES[gameState.codex.eventsSeen[eventId].biomeId]?.name || "Campagne",
      copy: EVENT_DEFS[eventId]?.kind || "Evenement",
    })),
    "Aucun evenement note pour le moment.",
  );
};

const ensureBattleIntelStrip = () => {
  let strip = document.getElementById("battle-intel-strip");
  if (strip) return strip;

  // Ancre sur la barre de progression : le HUD sur lequel ce bandeau se posait
  // a ete fusionne dans le bloc de combat.
  const ancre = document.getElementById("dungeon-stepper-container");
  if (!ancre) return null;

  strip = document.createElement("div");
  strip.id = "battle-intel-strip";
  strip.className = "battle-intel-strip";
  ancre.insertAdjacentElement("afterend", strip);
  return strip;
};

const updateCombatPresentation = () => {
  const playerName = document.getElementById("player-lane-name");
  const playerMeta = document.getElementById("player-lane-meta");
  const enemyName = document.getElementById("enemy-name");
  const enemyMeta = document.getElementById("enemy-lane-meta");
  const battleMeta = document.getElementById("battle-meta");
  const battleHint = document.getElementById("battle-hint");
  if (!playerName || !enemyName || !battleMeta || !battleHint) return;

  const eff = getEffectiveStats();
  const currentBiome = BIOMES[gameState.world.currentBiome];
  /*
   * Le premier ennemi VIVANT, comme le sprite et la barre de vie.
   *
   * En lisant currentEnemyGroup[0] la carte annonçait le nom d'une creature
   * deja morte pendant que le sprite montrait la suivante.
   */
  const groupe = runtimeState.currentEnemyGroup || [];
  const currentEnemy = groupe.find((e) => e.hp > 0) || groupe[0];
  const intelStrip = ensureBattleIntelStrip();
  const progress = gameState.world.progress || 0;
  const total = currentBiome?.length || 0;

  playerName.innerText = "Sans-eclat";
  if (playerMeta) {
    playerMeta.innerText = `FOR ${eff.strength} · VIG ${eff.vigor} · ARM ${eff.armor}`;
  }

  if (!currentEnemy) {
    enemyName.innerText = "Aucune menace";
    if (enemyMeta) enemyMeta.innerText = "Le champ de bataille se calme.";
    battleMeta.innerText = currentBiome?.name || "Camp";
    battleHint.innerText =
      "Le prochain affrontement commencera a la rencontre suivante.";
    if (intelStrip) {
      intelStrip.innerHTML = `
        <div class="battle-intel-chip">
          <span>Biome</span>
          <strong>${currentBiome?.name || "Camp"}</strong>
        </div>
        <div class="battle-intel-chip">
          <span>Rythme</span>
          <strong>Accalmie</strong>
        </div>
        <div class="battle-intel-chip">
          <span>Cendre</span>
          <strong>${gameState.equippedAsh ? ASHES_OF_WAR[gameState.equippedAsh].name : "Aucune equipee"}</strong>
        </div>
      `;
    }
    return;
  }

  const enemyCount = groupe.length;
  const prefix = currentEnemy.isBoss
    ? "Boss"
    : currentEnemy.isRare
      ? "Rare"
      : enemyCount > 1
        ? `Groupe x${enemyCount}`
        : "Standard";

  enemyName.innerText = currentEnemy.name;
  if (enemyMeta) {
    enemyMeta.innerText = `${prefix} · ATK ${currentEnemy.atk}${currentEnemy.armor ? ` · ARM ${currentEnemy.armor}` : ""}`;
  }
  battleMeta.innerText = `${currentBiome?.name || "Expedition"} · ${runtimeState.currentLoopCount > 0 ? `Cycle ${runtimeState.currentLoopCount + 1}` : "Premier passage"}`;

  if (currentEnemy.isBoss) {
    battleHint.innerText =
      "Boss en vue: cadence, mitigation et statuts doivent deja etre prets.";
  } else if (currentEnemy.isRare) {
    battleHint.innerText =
      "Elite reperee: gros rendement, mais pression nettement superieure au pack standard.";
  } else {
    battleHint.innerText =
      "Pack en cours: lisez les statuts et preparez le prochain palier avant le boss.";
  }

  if (intelStrip) {
    intelStrip.innerHTML = `
      <div class="battle-intel-chip">
        <span>Biome</span>
        <strong>${currentBiome?.name || "Expedition"}</strong>
      </div>
      <div class="battle-intel-chip">
        <span>Progression</span>
        <strong>${progress} / ${total || "?"} · ${prefix}</strong>
      </div>
      <div class="battle-intel-chip">
        <span>Cendre</span>
        <strong>${gameState.equippedAsh ? `${ASHES_OF_WAR[gameState.equippedAsh].name} · ${runtimeState.ashUsesLeft} charge(s)` : "Aucune equipee"}</strong>
      </div>
    `;
  }
};

const updateEnemyIntentDisplay = () => {
  const label = document.getElementById("enemy-intent-label");
  if (!label) return;
  // La severite se pose desormais sur la lane de l'ennemi : le panneau dedie
  // a ete fusionne dedans.
  const panel = label.closest(".combat-lane") || label;

  const groupe = runtimeState.currentEnemyGroup || [];
  const enemy = groupe.find((e) => e.hp > 0) || groupe[0];

  /*
   * Plus personne en face : on efface la ligne.
   *
   * Elle gardait sinon la derniere intention affichee, et la lane annonçait
   * "Aucune menace" tout en promettant une "Attaque directe · Elite".
   */
  if (!enemy || enemy.hp <= 0) {
    panel.classList.remove(
      "intent-boss",
      "intent-elite",
      "intent-heavy",
      "intent-normal",
    );
    label.innerText = "";
    return;
  }

  const intent = runtimeState.enemyIntent || buildEnemyIntent(enemy);
  panel.classList.remove(
    "intent-boss",
    "intent-elite",
    "intent-heavy",
    "intent-normal",
  );

  if (!intent) {
    panel.classList.add("intent-normal");
    label.innerText = "Analyse en cours";
    return;
  }

  panel.classList.add(`intent-${intent.severity || "normal"}`);
  /*
   * Intitule et precisions sur UNE ligne.
   *
   * Ils occupaient deux lignes, ce qui donnait cinq rangees a la lane de
   * l'ennemi contre trois au joueur : les barres de vie ne s'alignaient plus.
   */
  label.innerText = [
    intent.label,
    intent.targetHint,
    intent.hazard ? HAZARD_LABELS[intent.hazard] : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

let currentInventoryFilter = "Tous";
let lastInventorySnapshot = "";
const updateInventoryDisplay = () => {
  const currentSnapshot = JSON.stringify(
    gameState.inventory.map((i) => ({ id: i.id, lv: i.level })),
  );
  if (gameState.world.isExploring) return;
  if (
    currentSnapshot === lastInventorySnapshot &&
    !runtimeState.filterChanged
  ) {
    console.log("MEMORED INVENTORY UPDATE");
    return;
  }
  lastInventorySnapshot = currentSnapshot;
  runtimeState.filterChanged = false;

  const invGrid = document.getElementById("inventory-grid");
  invGrid.innerHTML = "";

  if (gameState.inventory.length === 0) {
    invGrid.innerHTML =
      '<div style="color: grey; margin-bottom: 10px;">Inventaire vide</div>';
    return;
  }

  const filteredInventory = gameState.inventory.filter((item) => {
    if (currentInventoryFilter === "Tous") return true;
    return ITEMS[item.id].type === currentInventoryFilter;
  });

  // 2. Trier une copie de l'inventaire
  const sortedInventory = filteredInventory.sort((a, b) => b.level - a.level);

  if (sortedInventory.length === 0) {
    invGrid.innerHTML =
      '<div style="color: grey; padding: 10px;">Aucun objet de ce type</div>';
    return;
  }

  const typeToSlotKey = {
    Arme: "weapon",
    Armure: "armor",
    Accessoire: "accessory",
  };

  // 3. On utilise sortedInventory au lieu de gameState.inventory pour l'affichage
  sortedInventory.forEach((item) => {
    const itemData = ITEMS[item.id];
    /*
     * Une entree dont l'identifiant n'existe plus dans ITEMS faisait planter
     * tout l'affichage de l'inventaire sur `itemData.type`, et avec lui le
     * reste de updateUI().
     *
     * Le cas se produit sans tricherie : un objet retire du jeu entre deux
     * versions reste dans les sauvegardes existantes. La normalisation de
     * shared/player-profile.js valide la FORME des identifiants, pas leur
     * existence — elle ne peut pas importer item.js sans cycle. On ignore donc
     * l'entree ici plutot que d'emporter l'ecran avec elle.
     */
    if (!itemData) return;

    const itemDiv = document.createElement("div");
    itemDiv.className = "inventory-item";

    const slotKey = typeToSlotKey[itemData.type];

    if (slotKey) {
      itemDiv.classList.add(`item-type-${slotKey}`);
    }
    itemDiv.classList.add(`rarity-${getItemRarity(item.id)}`);

    const currentlyEquippedId = gameState.equipped[slotKey];
    if (currentlyEquippedId && currentlyEquippedId === item.id) {
      itemDiv.classList.add("equipped-highlight"); // Ajoute un style pour l'objet Ã©quipÃ©
    }

    const progressText =
      item.level >= 10 ? "MAX" : `(${item.count}/${item.level})`;
    itemDiv.innerHTML = `
      ${iconMarkup(getItemIcon(item.id, item.level), { scale: 4, frame: "item-icon", label: item.name })}
      <span class="inventory-item-rarity">${getItemRarity(item.id)}</span>
      <strong class="inventory-item-name">${echapperHtml(item.name)}</strong>
      <div class="inventory-item-footer">
        <span class="inventory-item-meta">Niv.${item.level}</span>
        <span class="inventory-item-progress">${progressText}</span>
      </div>
    `;
    attachTooltipEvents(itemDiv, item);

    itemDiv.onclick = () => equipItem(item.id);
    invGrid.appendChild(itemDiv);
  });
};

window.setInventoryFilter = (type) => {
  currentInventoryFilter = type;
  runtimeState.filterChanged = true;
  updateInventoryDisplay();
};

window.toggleInventoryCollapse = () => {
  const grid = document.getElementById("inventory-section");
  const btn = document.getElementById("btn-collapse");
  const filters = document.getElementById("filter-buttons");

  if (!grid || !btn || !filters) return;

  if (grid.style.display === "none") {
    grid.style.display = "block";
    filters.style.display = "flex";
    btn.innerText = "Reduire l'inventaire";
  } else {
    grid.style.display = "none";
    filters.style.display = "none";
    btn.innerText = "Afficher l'inventaire";
  }
};

export const updateStatusIcons = () => {
  const pContainer = document.getElementById("player-status-container");
  const eContainer = document.getElementById("enemy-status-container");

  const renderStatus = (eff) => {
    const data = STATUS_EFFECTS[eff.id];
    if (!data) return "";
    if (eff.id !== "BLEED" && eff.id !== "FROSTBITE" && eff.duration <= 0)
      return "";
    if ((eff.id === "BLEED" || eff.id === "FROSTBITE") && eff.stacks <= 0)
      return "";

    let text = "";
    if (eff.id === "BLEED" || eff.id === "FROSTBITE") {
      text = ` (${eff.stacks})`;
    } else {
      // Si la durÃ©e est >= 50, on considÃ¨re que c'est un passif et on n'affiche pas de chiffre
      text = eff.duration >= 50 ? "" : ` (${eff.duration})`;
    }

    // Icone + compteur, plutot que le nom de l'effet en pastille coloree :
    // en combat la place est comptee et huit noms ecrits saturaient la ligne.
    // Le nom reste accessible en title et en aria-label.
    const label = `${data.name}${text}`;
    return `<div class="status-icon status-icon--${eff.id.toLowerCase()}" title="${label}">
              ${iconMarkup(getStatusIcon(eff.id), { scale: 2, label: data.name })}
              ${text ? `<span class="status-icon__count">${text.trim().replace(/[()]/g, "")}</span>` : ""}
            </div>`;
  };

  if (pContainer) {
    pContainer.innerHTML = gameState.playerEffects.map(renderStatus).join("");
  }

  if (eContainer) {
    eContainer.innerHTML = gameState.ennemyEffects.map(renderStatus).join("");
  }
};

window.primeAsh = () => {
  if (runtimeState.ashUsesLeft > 0 && !runtimeState.ashIsPrimed) {
    runtimeState.ashIsPrimed = true;
    ActionLog("Posture de combat !", "log-self");
    document.getElementById("ash-button").classList.add("ash-primed");
  }
};

export const updateAshButton = () => {
  // Le bouton vit dans la barre d'actions : on masque le bouton lui-meme, il
  // n'a plus de conteneur dedie.
  const ashBtn = document.getElementById("ash-button");
  const ash = ASHES_OF_WAR[gameState.equippedAsh];
  if (!ashBtn) return;

  if (ash && gameState.world.isExploring) {
    ashBtn.classList.remove("is-hidden");
    document.getElementById("ash-name").innerText = ash.name;
    document.getElementById("ash-uses").innerText = runtimeState.ashUsesLeft;
    ashBtn.disabled = runtimeState.ashUsesLeft <= 0 || runtimeState.ashIsPrimed;

    if (runtimeState.ashIsPrimed) {
      ashBtn.classList.add("ash-primed");
    } else {
      ashBtn.classList.remove("ash-primed");
    }
    return;
  }

  ashBtn.classList.add("is-hidden");
  ashBtn.classList.remove("ash-primed");
};

/*
 * Une seule liste de cendres, rendue a deux endroits.
 *
 * La liste ne vivait que dans l'onglet Build. L'inventaire affichait une carte
 * morte de la cendre equipee, portant la mention "A selectionner dans Build" :
 * arme, armure et accessoire s'equipent depuis l'inventaire, la cendre etait
 * le seul emplacement a ne pas repondre au clic.
 *
 * Le rendu est partage plutot que duplique : deux copies auraient diverge des
 * la premiere evolution du bouton.
 */
const CONTENEURS_CENDRES = ["ashes-list", "inventory-ashes-list"];

const peindreCendres = (container) => {
  /*
   * L'ancienne version sortait avant de vider le conteneur quand le joueur ne
   * possedait aucune cendre. Le texte d'attente restait donc affiche — correct
   * par accident au premier rendu, faux des qu'une cendre etait perdue.
   */
  if (gameState.ashesOfWarOwned.length === 0) {
    container.textContent = "Aucune cendre de guerre possedee";
    return;
  }

  container.innerHTML = "";

  gameState.ashesOfWarOwned.forEach((ashId) => {
    const data = ASHES_OF_WAR[ashId];
    const isEquipped = gameState.equippedAsh === ashId;

    const btn = document.createElement("button");
    btn.className = `ash-item ${isEquipped ? "active-ash" : ""}`;
    btn.setAttribute("aria-pressed", isEquipped ? "true" : "false");
    btn.innerHTML = `
      <strong>${data.name}</strong><br>
      <small>${data.maxUses} utilisations</small>
    `;

    btn.onclick = () => equipAsh(ashId);
    attachTooltipEvents(btn, ashId, true);
    container.appendChild(btn);
  });
};

const updateAshesDisplay = () => {
  for (const id of CONTENEURS_CENDRES) {
    const container = document.getElementById(id);
    if (container) peindreCendres(container);
  }
};

let showRealTime = false;

export const toggleRealTimeStats = () => {
  showRealTime = !showRealTime;
  const panel = document.getElementById("real-time-stats-panel");
  panel.style.display = showRealTime ? "block" : "none";
  updateRealTimeStatsDisplay();
};

export const updateRealTimeStatsDisplay = () => {
  if (!showRealTime) return;

  const eff = getEffectiveStats();
  const container = document.getElementById("real-time-content");

  // Calcul des stats spÃ©cifiques
  // Meme formule que combat.js, objets compris.
  const dodgeChance = Math.floor(
    Math.min(0.5, gameState.stats.dexterity / 400 + (eff.dodgeChance || 0)) *
      100,
  );
  const flatPen = eff.flatDamagePenetration || 0;
  const percentPen = (eff.percentDamagePenetration || 0) * 100;
  const maxHp = Math.floor(getHealth(eff.vigor));
  const resistances = eff.resistances || {};

  container.innerHTML = `
    <div class="rt-stat"><span>Niveau:</span> <b>${eff.level || 0}</b></div>
    <div class="rt-stat"><span>Runes depensees:</span> <b>${gameState.stats.runesSpent || 0}</b></div>
    <hr>
    <div class="rt-stat"><span>Force Totale:</span> <b>${eff.strength.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Vigueur Totale:</span> <b>${eff.vigor.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Points de Vie Max:</span> <b>${maxHp}</b></div> <hr>
    <div class="rt-stat"><span>Dexterite totale:</span> <b>${eff.dexterity.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Int Totale:</span> <b>${eff.intelligence.toFixed(1)}</b></div>
    <hr>
    <div class="rt-stat"><span>Taux d'Esquive:</span> <b>${dodgeChance.toFixed(1)}%</b></div>
    <div class="rt-stat"><span>Penetration (fixe):</span> <b>${flatPen.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Penetration (%):</span> <b>${percentPen.toFixed(1)}%</b></div>
    <hr>
    <div class="rt-stat"><span>Armure:</span> <b>${eff.armor.toFixed(1)}</b></div>
    <div class="rt-stat"><span>Attaques / Tour:</span> <b>${eff.attacksPerTurn}${eff.extraAttackChance > 0.005 ? ` <small>+${Math.round(eff.extraAttackChance * 100)}% d'une ${eff.attacksPerTurn + 1}e</small>` : ""}</b></div>
    <div class="rt-stat"><span>Degats de zone (Splash):</span> <b>${(eff.splashDamage || 0).toFixed(1)}</b></div>
    <div class="rt-stat"><span>Deg. min. Epines:</span> <b>${Math.floor(eff.vigor / 2) || 0}</b></div>
    <div class="rt-stat"><span>Mitig. Boss:</span> <b>${((eff.bossMitigation || 0) * 100).toFixed(1)}%</b></div>
    <div class="rt-stat"><span>Gain de Runes:</span> <b>${((eff.runeGainMult || 0) * 100).toFixed(1)}%</b></div>
    <hr>
    <div class="rt-stat"><span>Res. Poison:</span> <b>${resistances.poison || 0}</b></div>
    <div class="rt-stat"><span>Res. Gel:</span> <b>${resistances.gel || 0}</b></div>
    <div class="rt-stat"><span>Res. Folie:</span> <b>${resistances.folie || 0}</b></div>
    <div class="rt-stat"><span>Res. Putrefaction:</span> <b>${resistances.putrefaction || 0}</b></div>
  `;
};

export const updateUI = () => {
  decorateStatLines();
  updateScreenState();
  updateNavState();
  updateRuneDisplay();
  updateLoadoutsDisplay();
  updateContractDisplay();
  updateStatDisplay();
  updateEquipmentDisplay();
  updateInventoryEquippedDisplay();
  updateBiomeDisplay();
  renderPreparationDisplay();
  updateCombatPresentation();
  updateEnemyIntentDisplay();
  updateJournalDisplay();
  updateInventoryDisplay();
  updateCodexDisplay();
  updateCycleDisplay();
  updateStatusIcons();
  updateAshButton();
  updateAshesDisplay();
  updateRealTimeStatsDisplay();
  updateOfflineDisplay();
};

export const toggleView = (view) => {
  /*
   * "Nulle part ou fuir" bloque enfin le repli.
   *
   * Le trait posait runBuff: { noRetreat: 1 } et l'affichait sur la fiche de
   * biome, mais aucune ligne ne lisait cette cle : le joueur pouvait se replier
   * d'une zone qui lui annonçait le contraire.
   */
  if (
    view !== "biome" &&
    gameState.world.isExploring &&
    getRunModifier("noRetreat", 0) > 0
  ) {
    ActionLog(
      "Il n'y a plus de route derriere vous. Le repli est impossible ici.",
      "log-event",
    );
    return;
  }

  const camp = document.getElementById("camp-view");
  const biome = document.getElementById("biome-view");
  const particles = document.getElementById("fire-particles");
  const scene = document.getElementById("camp-scene");
  const nav = document.getElementById("primary-nav");

  if (view === "biome") {
    camp.style.display = "none";
    biome.style.display = "block";
    gameState.world.isExploring = true;
    ensureUiState().currentScreen = "combat";
    if (nav) nav.style.display = "none";
    if (particles) particles.classList.add("hidden");
    if (scene) scene.classList.add("hidden");
    playDungeonMusic();
  } else {
    clearEventBanner();
    clearRunBuffs();
    runtimeState.enemyIntent = null;
    /*
     * Repli VOLONTAIRE : c'est le seul moment ou la reserve de Ferveur est
     * mise a l'abri. Le versement precede l'encaissement des runes portees
     * pour que le journal se lise dans l'ordre du geste. Voir escalation.js.
     */
    if (gameState.world.isExploring) {
      encaisserFerveur("Repli au camp");
    }
    gameState.runes.banked += gameState.runes.carried;
    gameState.runes.carried = 0;
    const layout = ensureBattleLogLayout();
    if (layout) {
      layout.enemyColumn.innerHTML = "";
      layout.playerColumn.innerHTML = "";
      const entry = document.createElement("p");
      entry.className = "log-entry player-side";
      entry.innerText = "> De retour au repos...";
      layout.playerColumn.prepend(entry);
      refreshConversationHighlights(layout);
    }
    camp.style.display = "block";
    biome.style.display = "none";
    gameState.world.isExploring = false;
    if (nav) nav.style.display = "flex";
    navigateTo("hub");
    if (particles) particles.classList.remove("hidden");
    if (scene) scene.classList.remove("hidden");
    playCampMusic();
    checkForUpdate();
    saveGame();
  }
  updateUI();
};

export const updateHealthBars = () => {
  syncCombatSprites();
  const stats = getEffectiveStats();
  const playerMaxHp = getHealth(stats.vigor);
  const playerPercent = (runtimeState.playerCurrentHp / playerMaxHp) * 100;
  document.getElementById("player-hp-fill").style.width = `${Math.max(
    0,
    playerPercent,
  )}%`;
  document.getElementById("player-hp-text").innerText = `${formatNumber(
    Math.max(0, Math.floor(runtimeState.playerCurrentHp)),
  )} / ${formatNumber(playerMaxHp)}`;

  const enemyBar = document.getElementById("enemy-hp-fill");
  const enemyText = document.getElementById("enemy-hp-text");
  const groupe = runtimeState.currentEnemyGroup || [];
  /*
   * La barre suit le meme ennemi que le sprite : le premier VIVANT.
   *
   * Elle lisait currentEnemyGroup[0] alors que mountCombatEnemy monte le
   * premier ennemi encore debout. Des la premiere mort d'un groupe, l'image et
   * la barre parlaient donc de deux creatures differentes — le sprite montrait
   * le loup suivant, la barre affichait le precedent a zero.
   */
  const cible = groupe.find((e) => e.hp > 0) || groupe[0];
  if (cible) {
    const enemyPercent = (cible.hp / cible.maxHp) * 100;
    enemyBar.style.width = `${Math.max(0, enemyPercent)}%`;
    // Les points de vie sont bornes a zero A L'AFFICHAGE.
    //
    // La largeur de barre etait deja clampee, pas le texte : un coup a 7399
    // sur un ennemi a 10 points affichait "-7389 / 10" le temps d'une frame.
    // Avec une arme un peu forte, chaque mise a mort passe par la.
    enemyText.innerText = `${formatNumber(
      Math.max(0, Math.floor(cible.hp)),
    )} / ${formatNumber(cible.maxHp)}`;
  } else {
    enemyBar.style.width = "0%";
    enemyText.innerText = "0 / 0";
  }
};

export const triggerShake = () => {
  const container = document.getElementById("game-container");
  container.classList.add("shake-effect");
  // Respect offline bank speedups for the visual shake timeout
  const delayed = (fn, ms) => {
    let delay = ms;
    try {
      const save = gameState.save || {};
      const use =
        save.useOfflineTime &&
        (save.offlineTimeBank || 0) > 0 &&
        gameState.world.isExploring;
      const M = runtimeState.offlineSpeedMultiplier || 3;
      if (use && M > 1 && ms > 0) {
        const fullSavedMs = Math.max(0, ms - Math.floor(ms / M));
        const bankMs = (save.offlineTimeBank || 0) * 1000;
        if (bankMs >= fullSavedMs) {
          delay = Math.max(0, Math.floor(ms / M));
          save.offlineTimeBank = Math.max(
            0,
            (save.offlineTimeBank || 0) - fullSavedMs / 1000,
          );
        } else if (bankMs > 0) {
          delay = Math.max(0, Math.floor(ms - bankMs));
          save.offlineTimeBank = 0;
        }
        try {
          updateUI();
        } catch (e) {}
      }
    } catch (e) {}
    return setTimeout(fn, delay);
  };

  delayed(() => {
    container.classList.remove("shake-effect");
  }, 400);
};

export const updateStepper = () => {
  const biome = BIOMES[gameState.world.currentBiome];
  const progress = gameState.world.progress;
  const total = biome.length;
  const percent = (progress / total) * 100;
  document.getElementById("stepper-fill").style.width = `${Math.min(
    100,
    percent,
  )}%`;
  document.getElementById("stepper-text").innerText =
    `Ennemis vaincus : ${progress} / ${total}`;
  const markersContainer = document.getElementById("stepper-markers");
  if (progress === 0) {
    markersContainer.innerHTML = "";
    const midPoint = Math.floor(total / 2);
    const graceMarker = document.createElement("div");
    graceMarker.className = "marker marker-grace";
    graceMarker.style.left = `${(midPoint / total) * 100}%`;
    graceMarker.title = "Site de Grace";
    markersContainer.appendChild(graceMarker);
    const bossMarker = document.createElement("div");
    bossMarker.className = "marker marker-boss";
    bossMarker.style.left = "100%";
    bossMarker.title = "Boss de zone";
    markersContainer.appendChild(bossMarker);
  }
};

export const toggleOptions = (show) => {
  navigateTo(show ? "options" : "hub");
};

/**
 * Braises qui montent au-dessus du camp.
 *
 * Chaque braise recoit sa taille, sa derive horizontale, sa teinte et son
 * opacite de pointe : sans ce tirage elles montaient toutes a la verticale, de
 * la meme couleur, et l'ensemble lisait comme une pluie reguliere plutot que
 * comme des cendres.
 */
const EMBER_COLORS = ["#ec984c", "#c6ac74", "#e8c06a", "#b8683c"];

export const createFireParticles = () => {
  const container = document.getElementById("fire-particles");
  if (!container) return;
  if (container.childElementCount) return; // deja peuplé

  const count = 46;
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("div");
    particle.className = "particle";

    // Tailles entieres : une braise de 3.7px se retrouve anti-aliasee et
    // perd le rendu pixel.
    const size = 2 + Math.floor(Math.random() * 4);
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 12}s`;
    particle.style.animationDuration = `${8 + Math.random() * 9}s`;
    particle.style.setProperty(
      "--drift-x",
      `${Math.round((Math.random() - 0.35) * 90)}px`,
    );
    particle.style.setProperty(
      "--ember-color",
      EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
    );
    particle.style.setProperty(
      "--ember-peak",
      (0.25 + Math.random() * 0.45).toFixed(2),
    );

    container.appendChild(particle);
  }
};

/**
 * Parallaxe du decor du camp : les trois calques se decalent au defilement a
 * des rythmes differents, ce qui donne de la profondeur a une image plate.
 *
 * Le ciel bouge le moins, le premier plan le plus. Les valeurs sont volontairement
 * faibles : au-dela, l'horizon se decolle visiblement des montagnes.
 */
const PARALLAX_FACTORS = [
  [".camp-scene__sky", 0.02],
  [".camp-scene__mid", 0.055],
  [".camp-scene__near", 0.1],
];

export const initCampParallax = () => {
  const scene = document.getElementById("camp-scene");
  if (!scene) return;

  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const layers = PARALLAX_FACTORS.map(([selector, factor]) => [
    scene.querySelector(selector),
    factor,
  ]).filter(([el]) => el);

  let pending = false;
  const apply = () => {
    pending = false;
    const y = window.scrollY;
    layers.forEach(([el, factor]) => {
      el.style.setProperty("--parallax", `${Math.round(y * factor)}px`);
    });
  };

  // On passe par requestAnimationFrame : l'evenement de defilement peut se
  // declencher bien plus souvent qu'une image, et ecrire un style a chaque
  // fois provoquerait des recalculs inutiles.
  window.addEventListener(
    "scroll",
    () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(apply);
    },
    { passive: true },
  );

  apply();
};

export const setAudioListener = () => {
  /*
   * Deux curseurs separes. Beaucoup de joueurs coupent la musique et gardent
   * les effets, ou l'inverse : un reglage unique force a choisir entre les
   * deux.
   */
  const sfxSlider = document.getElementById("sfx-volume");
  if (sfxSlider) {
    sfxSlider.value = gameState.save?.sfxVolume ?? 0.5;
    sfxSlider.oninput = (e) => {
      setSfxVolume(Number.parseFloat(e.target.value));
      // Un retour immediat : sans lui, on regle a l'aveugle.
      playSfx("hit");
      saveGame();
    };
  }

  // Precharge les bruitages de combat : sans ca le premier coup est muet, le
  // temps que le navigateur telecharge le fichier.
  primeSfx();

  refreshNarratorButton();

  const volumeSlider = document.getElementById("music-volume");

  if (volumeSlider) {
    const currentVolume = gameState.save?.audioVolume ?? 0.3;
    volumeSlider.value = currentVolume;

    // Le gain de la piste s'applique par-dessus le volume maitre : on passe
    // par applyTrackVolume plutot que d'ecrire .volume directement.
    [campAudio, dungeonAudio, narratorAudio].forEach(applyTrackVolume);

    volumeSlider.oninput = (e) => {
      const volume = Number.parseFloat(e.target.value);

      if (!gameState.save) gameState.save = {};
      gameState.save.audioVolume = volume;
      [campAudio, dungeonAudio, narratorAudio].forEach(applyTrackVolume);

      saveGame();
    };
  }
};

// ui.js
