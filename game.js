import {
  equipAsh,
  equipItem,
  investCritPoint,
  investRebirthNode,
  refundRunes,
  requestRebirth,
  resetGame,
  respecCritPoints,
  startTrial,
  upgradeStat,
  upgradeStatMultiple,
  verifierDeblocageContrats,
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
import { setRafraichissementTempo } from "./tempo.js";
import {
  afficherAvis,
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

/*
 * La banniere elle-meme vit dans ui.js : elle sert aussi aux annonces en cours
 * de partie, et actions.js ne peut pas importer game.js.
 */
const showBootNotice = afficherAvis;

const reportSaveLoad = (report) => {
  if (report.status === "loaded" || report.status === "fresh") return;

  if (report.status === "migrated-legacy") {
    console.info("[save] ancienne sauvegarde reprise et rescellee.");
    return;
  }

  if (report.status === "recovered-quarantine") {
    showBootNotice(
      "Votre progression avait ete mise de cote a tort par une precedente mise a jour du jeu. Elle vient d'etre rendue : verifiez votre niveau et votre inventaire.",
    );
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

  // tempo.js ne peut pas importer ui.js : ui.js importe core.js, qui importe
  // tempo.js. La dependance est donc posee ici.
  setRafraichissementTempo(updateUI);

  const report = loadGame();

  createFireParticles();
  initCampParallax();
  setAudioListener();
  updateUI();
  reportSaveLoad(report);
  // Un joueur deja au-dela du seuil quand cette version arrive doit apprendre
  // que les contrats existent : le controle n'est pas seulement fait a la
  // montee de niveau.
  verifierDeblocageContrats();

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
 * Export et import par FICHIER.
 *
 * La premiere version passait par un champ de texte et le presse-papiers. La
 * chaine scellee depasse ce que certains presse-papiers acceptent, sur
 * telephone comme sur PC : le code arrivait tronque et l'import echouait sur
 * le sceau. Un fichier .txt n'a pas de limite de ce genre, et reste lisible
 * et deplacable par le joueur. Le format est inchange : le fichier contient
 * exactement la chaine de exportSaveString().
 */

/** Un fichier de sauvegarde fait quelques dizaines de Ko : au-dela, ce n'en
 *  est pas un, et on evite de charger en memoire n'importe quoi. */
const TAILLE_MAX_FICHIER = 5 * 1024 * 1024;

const nomDuFichier = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `elden-chill-sauvegarde-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.txt`;
};

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
  EMPTY: "Ce fichier est vide.",
  TOO_BIG: "Ce fichier est bien trop gros pour etre une sauvegarde du jeu.",
  UNREADABLE: "Impossible de lire ce fichier.",
  MALFORMED:
    "Ce fichier ne contient pas une sauvegarde valide. Choisissez le .txt exporte par le jeu.",
  UNSUPPORTED_VERSION:
    "Ce code vient d'une version du jeu trop ancienne pour etre relue.",
  TAMPERED: "Le sceau ne correspond pas : le fichier a ete modifie ou abime.",
  CORRUPT_PAYLOAD: "Le contenu du fichier est illisible.",
  INCOMPATIBLE_VERSION:
    "Cette sauvegarde vient d'une version incompatible du jeu.",
};

const exportSave = () => {
  const code = exportSaveString();
  const url = URL.createObjectURL(
    new Blob([code], { type: "text/plain;charset=utf-8" }),
  );
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomDuFichier();
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // Laisse au navigateur le temps de lancer le telechargement.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  direTransfert(
    `Sauvegarde exportee dans ${lien.download}. Gardez ce fichier en lieu sur.`,
    true,
  );
};

/** Ouvre le selecteur de fichier ; la suite se joue dans importSaveFile. */
const importSave = () => {
  const entree = document.getElementById("save-file-input");
  if (!entree) return;
  // Vide la valeur : choisir deux fois le meme fichier doit relancer l'import.
  entree.value = "";
  entree.click();
};

const importSaveFile = async (entree) => {
  const fichier = entree?.files?.[0];
  if (!fichier) return;
  if (fichier.size > TAILLE_MAX_FICHIER) {
    direTransfert(RAISONS_IMPORT.TOO_BIG, false);
    return;
  }

  let code;
  try {
    code = (await fichier.text()).trim();
  } catch {
    direTransfert(RAISONS_IMPORT.UNREADABLE, false);
    return;
  }
  if (!code) {
    direTransfert(RAISONS_IMPORT.EMPTY, false);
    return;
  }

  // Un import ecrase la partie en cours : on demande confirmation, comme la
  // reinitialisation.
  if (
    !confirm(
      `Importer ${fichier.name} remplacera definitivement votre partie en cours. Continuer ?`,
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
window.importSaveFile = importSaveFile;

window.addEventListener("beforeunload", () => {
  saveGame("beforeunload");
});

setInterval(() => saveGame("interval"), 30000);
