import {
  equipAsh,
  equipItem,
  investCritPoint,
  investRebirthNode,
  refundRunes,
  requestRebirth,
  resetGame,
  respecCritPoints,
  respecRebirthTree,
  startTrial,
  upgradeStat,
  upgradeStatMultiple,
} from "./actions.js";
import { BIOMES } from "./biome.js";
import { startExploration } from "./core.js";
import { ITEMS } from "./item.js";
import {
  exportSaveString,
  importSaveString,
  loadGame,
  saveGame,
} from "./save.js";
import { enqueueDevSpawn } from "./spawn.js";
import { DEFAULT_GAME_STATE, gameState, runtimeState } from "./state.js";
import {
  createFireParticles,
  hideTooltip,
  initCampParallax,
  moveTooltip,
  playCampMusic,
  setAudioListener,
  showStatTooltip,
  toggleNarrator,
  toggleOptions,
  toggleRealTimeStats,
  toggleView,
  updateUI,
} from "./ui.js";
// Main entry point for the game
import {
  CHECK_REFRESH_KEY,
  CURRENT_VERSION,
  FORCE_VERSION_KEY,
  IS_LOCAL_HOST,
  checkForUpdate,
} from "./version-check.js";

// Dev tools
const dev = {
  giveRunes: (amount) => {
    gameState.runes.banked += amount;
    console.log(`🔧 DEV : +${amount} runes ajoutées au coffre.`);
    updateUI();
    saveGame();
  },
  giveItem: (itemId) => {
    if (ITEMS[itemId]) {
      // Re-implementing dropItem logic for dev purposes to avoid circular deps
      const itemTemplate = ITEMS[itemId];
      const inventoryItem = gameState.inventory.find(
        (item) => item.id === itemId,
      );
      if (!inventoryItem) {
        gameState.inventory.push({
          id: itemId,
          name: itemTemplate.name,
          level: 1,
          count: 0,
        });
      } else {
        inventoryItem.count++;
        if (
          inventoryItem.count >= inventoryItem.level &&
          inventoryItem.level < 10
        ) {
          inventoryItem.level++;
          inventoryItem.count = 0;
        }
      }
      console.log(`🔧 DEV : Objet ${itemId} obtenu.`);
      updateUI();
    } else {
      console.error("ID d'objet inconnu.");
    }
  },
  giveAsh: (ashId) => {
    if (!gameState.ashesOfWarOwned.includes(ashId)) {
      gameState.ashesOfWarOwned.push(ashId);
      console.log(`🔧 DEV : Cendre de guerre ${ashId}`);
      updateUI();
      saveGame();
    }
  },
  unlockAll: () => {
    Object.keys(BIOMES).forEach((id) => {
      if (!gameState.world.unlockedBiomes.includes(id)) {
        gameState.world.unlockedBiomes.push(id);
      }
    });
    console.log("🔧 DEV : Tous les biomes sont débloqués.");
    updateUI();
    saveGame();
  },
  forceResetToCamp: () => {
    console.log("🔧 DEV : Forcing reset to camp view...");
    // Invalidate any active combat loops
    runtimeState.currentCombatSession++;
    // Reset exploration state
    gameState.world.isExploring = false;
    gameState.runes.carried = 0;
    // Switch view and save
    toggleView("camp");
    console.log("Reset complete. You are back at the camp.");
  },
  giveAllItems: () => {
    Object.keys(ITEMS).forEach((itemId) => {
      const itemTemplate = ITEMS[itemId];

      const inventoryItem = gameState.inventory.find(
        (item) => item.id === itemId,
      );

      if (!inventoryItem) {
        gameState.inventory.push({
          id: itemId,
          name: itemTemplate.name,
          level: 1,
          count: 0,
        });
      }
    });

    console.log("🔧 DEV : Tous les objets ont été ajoutés à l'inventaire.");
    updateUI();
    saveGame();
  },
  maxAllItems: () => {
    gameState.inventory.forEach((item) => {
      item.level = 10;
      item.count = 0;
    });

    console.log("🔧 DEV : Tous les objets ont été montés niveau 10.");
    updateUI();
    saveGame();
  },

  spawnEnemy: (monsterId, amount) => {
    if (!amount) amount = 1;
    for (let i = 0; i < amount; i++) {
      if (enqueueDevSpawn(monsterId)) {
        console.log(`🔧 DEV : ${monsterId} ajouté à la file de spawn.`);
      }
    }
  },
  addOfflineTime: (seconds) => {
    if (!gameState.save) gameState.save = {};
    seconds = Math.max(0, Math.floor(seconds || 0));
    gameState.save.offlineTimeBank =
      (gameState.save.offlineTimeBank || 0) + seconds;
    console.log(
      `🔧 DEV : Ajout de ${seconds}s au bank offline (now ${gameState.save.offlineTimeBank}s)`,
    );
    updateUI();
    saveGame();
  },
  removeOfflineTime: (seconds) => {
    if (!gameState.save) gameState.save = {};
    seconds = Math.max(0, Math.floor(seconds || 0));
    gameState.save.offlineTimeBank = Math.max(
      0,
      (gameState.save.offlineTimeBank || 0) - seconds,
    );
    console.log(
      `🔧 DEV : Retrait de ${seconds}s du bank offline (now ${gameState.save.offlineTimeBank}s)`,
    );
    updateUI();
    saveGame();
  },
  setOfflineSpeed: (mult) => {
    runtimeState.offlineSpeedMultiplier = Math.max(1, Number(mult) || 1);
    console.log(
      `🔧 DEV : offline speed multiplier set to ${runtimeState.offlineSpeedMultiplier}`,
    );
  },
  toggleCombat: () => {
    runtimeState.combatFrozen = !runtimeState.combatFrozen;
    console.log(
      `🔧 DEV : Combat ${runtimeState.combatFrozen ? "gelé" : "dégelé"} !`,
    );
  },
  //reset biome unlocks
  resetBiomes: () => {
    gameState.world.unlockedBiomes = ["limgrave_west"];
    console.log("🔧 DEV : Biomes débloqués réinitialisés.");
    updateUI();
    saveGame();
  },

  unlockBiome: (biomeId) => {
    if (!gameState.world.unlockedBiomes.includes(biomeId)) {
      gameState.world.unlockedBiomes.push(biomeId);
      console.log(`🔧 DEV : Biome ${biomeId} débloqué.`);
      updateUI();
      saveGame();
    }
  },
};

const joinDiscord = () => {
  const invitLink = "https://discord.gg/rdnythxSXd";
  window.open(invitLink, "_blank");
};

// --- Global Function Assignments ---
// Assign all functions that are called from the HTML (onclick) to the window object
window.upgradeStat = upgradeStat;
window.upgradeStatMultiple = upgradeStatMultiple;
window.investCritPoint = investCritPoint;
window.respecCritPoints = respecCritPoints;
window.startTrial = startTrial;
window.requestRebirth = requestRebirth;
window.investRebirthNode = investRebirthNode;
window.respecRebirthTree = respecRebirthTree;
window.toggleView = toggleView;
window.startExploration = startExploration;
window.equipItem = equipItem;
window.resetGame = resetGame;
window.refundRunes = refundRunes;
window.toggleOptions = toggleOptions;
window.showStatTooltip = showStatTooltip;
window.moveTooltip = moveTooltip;
window.hideTooltip = hideTooltip;
//window.dev = dev;
window.equipAsh = equipAsh;
window.toggleRealTimeStats = toggleRealTimeStats;
window.joinDiscord = joinDiscord;
window.toggleNarrator = toggleNarrator;

// --- Game Initialization ---

/* Version et detection de mise a jour : voir version-check.js. Reexport pour
 * les appelants historiques. */
export {
  CHECK_REFRESH_KEY,
  CURRENT_VERSION,
  FORCE_VERSION_KEY,
  IS_LOCAL_HOST,
  checkForUpdate,
};

const handleAutoRefresh = () => {
  if (IS_LOCAL_HOST) {
    return false;
  }

  const now = Date.now();
  const lastRefresh = localStorage.getItem(CHECK_REFRESH_KEY);
  const lastVersion = localStorage.getItem(FORCE_VERSION_KEY);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Condition 1 : Est-ce que la version a changé ? (Force le déploiement de tes fixes)
  // Condition 2 : Est-ce que ça fait plus de 24h ?
  if (
    lastVersion !== CURRENT_VERSION ||
    !lastRefresh ||
    now - Number.parseInt(lastRefresh) > ONE_DAY_MS
  ) {
    localStorage.setItem(CHECK_REFRESH_KEY, now.toString());
    localStorage.setItem(FORCE_VERSION_KEY, CURRENT_VERSION);

    console.log(
      "🔄 Nouvelle version ou délai dépassé. Hard refresh en cours...",
    );

    // Le true est techniquement déprécié mais aide encore certains navigateurs
    // à ignorer le cache. Une alternative est de changer l'URL.
    window.location.reload(true);
    return true; // On indique qu'un reload est demandé
  }
  return false;
};

/* ------------------------------------------------------------------ */
/* Demarrage                                                          */
/* ------------------------------------------------------------------ */

const SAVE_WARNING_MESSAGES = {
  TAMPERED:
    "Votre sauvegarde a ete refusee : son sceau ne correspond pas. Elle a ete mise de cote.",
  MALFORMED: "Votre sauvegarde etait illisible et a ete mise de cote.",
  CORRUPT_PAYLOAD: "Votre sauvegarde etait corrompue et a ete mise de cote.",
  INCOMPATIBLE_VERSION:
    "Votre sauvegarde provient d'une version incompatible du jeu.",
  UNSUPPORTED_VERSION:
    "Votre sauvegarde provient d'une version incompatible du jeu.",
};

/**
 * Banniere de demarrage. On n'utilise pas ActionLog ici : le journal de combat
 * n'existe pas encore au chargement, le message serait perdu.
 */
const showBootNotice = (text, tone = "warn") => {
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

const reportSaveLoad = (report) => {
  if (report.status === "loaded" || report.status === "fresh") return;

  if (report.status === "migrated-legacy") {
    console.info("[save] ancienne sauvegarde reprise et rescellee.");
    return;
  }

  const detail = SAVE_WARNING_MESSAGES[report.reason] || "";

  if (report.status === "restored-backup") {
    showBootNotice(
      `Sauvegarde principale illisible. Votre progression a ete restauree depuis la copie de secours. ${detail}`,
    );
    return;
  }

  if (report.status === "rejected") {
    showBootNotice(
      `${detail} Une nouvelle partie a ete demarree. L'ancienne sauvegarde reste inspectable dans le stockage local sous la cle "eldenChillSaveRejected".`,
      "danger",
    );
  }
};

window.onload = () => {
  if (handleAutoRefresh()) return;

  const report = loadGame();

  createFireParticles();
  initCampParallax();
  setAudioListener();
  updateUI();
  reportSaveLoad(report);

  const startAudioOnInteraction = () => {
    playCampMusic();
    window.removeEventListener("click", startAudioOnInteraction);
  };
  window.addEventListener("click", startAudioOnInteraction);
};

/* ------------------------------------------------------------------ */
/* Transfert manuel de sauvegarde                                     */
/* ------------------------------------------------------------------ */

/*
 * exportSaveString() et importSaveString() existaient dans save.js depuis
 * longtemps, testees et fonctionnelles — mais AUCUN bouton ne les appelait.
 * La fonctionnalite etait ecrite a cent pour cent et joignable a zero.
 */

const champTransfert = () => document.getElementById("save-transfer");

/** Affiche un retour lisible sous les deux boutons. */
const direTransfert = (message, ok) => {
  const ligne = document.getElementById("save-transfer-status");
  if (!ligne) return;
  ligne.innerText = message;
  ligne.classList.toggle("is-ok", ok === true);
  ligne.classList.toggle("is-error", ok === false);
};

/*
 * Chaque cause d'echec de openSave() a sa phrase.
 *
 * Un code de raison brut n'aide personne : "TAMPERED" ne dit pas au joueur que
 * son code a ete tronque au copier-coller, ce qui est de loin le cas le plus
 * frequent.
 */
const RAISONS_IMPORT = {
  EMPTY: "Le champ est vide : collez d'abord un code de sauvegarde.",
  MALFORMED:
    "Ce n'est pas un code de sauvegarde valide. Verifiez qu'il a ete copie en entier.",
  UNSUPPORTED_VERSION:
    "Ce code vient d'une version du jeu trop ancienne pour etre relue.",
  TAMPERED:
    "Le sceau ne correspond pas. Le code a probablement ete tronque ou modifie.",
  CORRUPT_PAYLOAD: "Le contenu du code est illisible.",
  INCOMPATIBLE_VERSION:
    "Cette sauvegarde vient d'une version incompatible du jeu.",
};

const exportSave = () => {
  const champ = champTransfert();
  if (!champ) return;
  const code = exportSaveString();
  champ.value = code;
  champ.select();

  // Le presse-papiers peut etre refuse (contexte non securise, permission) :
  // le code reste selectionne dans le champ, donc copiable a la main.
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(code)
      .then(() =>
        direTransfert(
          `Sauvegarde exportee (${code.length} signes) et copiee dans le presse-papiers.`,
          true,
        ),
      )
      .catch(() =>
        direTransfert(
          `Sauvegarde exportee (${code.length} signes). Le code est selectionne : copiez-le.`,
          true,
        ),
      );
    return;
  }
  direTransfert(
    `Sauvegarde exportee (${code.length} signes). Le code est selectionne : copiez-le.`,
    true,
  );
};

const importSave = () => {
  const champ = champTransfert();
  if (!champ) return;
  const code = champ.value.trim();
  if (!code) {
    direTransfert(RAISONS_IMPORT.EMPTY, false);
    return;
  }

  // Un import ecrase la partie en cours : on demande confirmation, comme la
  // reinitialisation.
  if (
    !confirm(
      "Importer cette sauvegarde remplacera definitivement votre partie en cours. Continuer ?",
    )
  ) {
    return;
  }

  const resultat = importSaveString(code);
  if (!resultat.ok) {
    direTransfert(
      RAISONS_IMPORT[resultat.reason] ||
        `Import impossible (${resultat.reason}).`,
      false,
    );
    return;
  }

  /*
   * On recharge apres un import reussi.
   *
   * hydrate() remplace bien l'etat, mais plusieurs vues ne sont construites
   * qu'au chargement : sans rechargement, l'ecran continuerait d'afficher
   * l'ancienne partie par endroits. Meme raisonnement que pour la langue.
   *
   * importSaveString a deja ecrit la nouvelle sauvegarde, donc le
   * beforeunload qui suit reecrit le meme etat : rien a suspendre ici.
   */
  direTransfert("Sauvegarde importee. Rechargement...", true);
  window.setTimeout(() => window.location.reload(), 600);
};

window.exportSave = exportSave;
window.importSave = importSave;

window.addEventListener("beforeunload", () => {
  saveGame("beforeunload");
});

setInterval(() => saveGame("interval"), 30000);
