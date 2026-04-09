// Main entry point for the game
import { BIOMES } from "./biome.js";
import { ITEMS } from "./item.js";
import { DEFAULT_GAME_STATE, gameState, runtimeState } from "./state.js";
import { loadGame, saveGame } from "./save.js";
import {
  equipAsh,
  equipItem,
  resetGame,
  upgradeStat,
  upgradeStatMultiple,
  refundRunes,
} from "./actions.js";
import { startExploration } from "./core.js";
import {
  createFireParticles,
  hideTooltip,
  moveTooltip,
  showStatTooltip,
  toggleOptions,
  toggleView,
  updateUI,
  playCampMusic,
  setAudioListener,
  toggleRealTimeStats,
} from "./ui.js";
import { enqueueDevSpawn } from "./spawn.js";
import {
  applyServerOfflineProgress,
  flushPendingProfileSync,
  initAuth,
  isCloudConfigured,
  loadAuthoritativeProfile,
  onAuthStateChange,
  signInWithGoogle,
  signInWithMagicLink,
  signOut,
} from "./backend.js";

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
      let inventoryItem = gameState.inventory.find(
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

      let inventoryItem = gameState.inventory.find(
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

// --- Game Initialization ---

const CHECK_REFRESH_KEY = "last_hard_refresh_timestamp";
export const FORCE_VERSION_KEY = "app_version_code";
export const CURRENT_VERSION = DEFAULT_GAME_STATE.save.version;
const IS_LOCAL_HOST =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const checkScheduledReset = () => {
  const FINAL_WIPE_FLAG = "wipe_v250_cloud_auth";
  if (!localStorage.getItem(FINAL_WIPE_FLAG)) {
    localStorage.setItem(FINAL_WIPE_FLAG, "true");
  }
  return;
};

export async function checkForUpdate() {
  if (IS_LOCAL_HOST) {
    return;
  }

  try {
    const response = await fetch(`./version.json?t=${Date.now()}`);
    const data = await response.json();

    if (data.version !== CURRENT_VERSION) {
      console.log("🛠️ Mise à jour détectée ! Refresh en cours...");
      saveGame();
      window.location.reload(true);
    }
  } catch (err) {
    console.error("Impossible de vérifier les mises à jour", err);
  }
}

const handleAutoRefresh = () => {
  if (IS_LOCAL_HOST) {
    return false;
  }

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const isAuthCallback =
    hash.includes("access_token=") ||
    hash.includes("refresh_token=") ||
    search.includes("code=") ||
    search.includes("token=");

  if (isAuthCallback) {
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
    now - parseInt(lastRefresh) > ONE_DAY_MS
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

const authLog = (...args) => {
  console.info("[auth-overlay]", ...args);
};

const setAuthOverlayState = ({
  title,
  copy,
  busy = false,
  showLogin = true,
  status = "",
}) => {
  const overlay = document.getElementById("auth-overlay");
  const titleEl = document.getElementById("auth-title");
  const copyEl = document.getElementById("auth-copy");
  const actionsEl = document.getElementById("auth-actions");
  const statusEl = document.getElementById("auth-status-line");

  if (!overlay || !titleEl || !copyEl || !actionsEl || !statusEl) return;

  authLog("show", { title, busy, showLogin, status });
  overlay.classList.remove("is-hidden");
  overlay.style.display = "grid";
  titleEl.innerText = title;
  copyEl.innerText = copy;
  actionsEl.style.display = showLogin ? "grid" : "none";
  statusEl.innerText = status || (busy ? "Connexion en cours..." : "");
};

let profileLoadInFlight = null;
let loadedUserId = null;
let bootstrappedUserId = null;
let authBootstrapInitialized = false;

const hideAuthOverlay = () => {
  const overlay = document.getElementById("auth-overlay");
  if (!overlay) return;
  authLog("hide");
  overlay.classList.add("is-hidden");
  overlay.style.display = "none";
};

const updateAccountPanel = (user) => {
  const emailEl = document.getElementById("account-email");
  const signOutBtn = document.getElementById("btn-signout");
  if (emailEl) {
    emailEl.innerText = user?.email || "Non connecte";
  }
  if (signOutBtn) {
    signOutBtn.disabled = !user;
  }
};

const bindAuthUi = () => {
  const signInBtn = document.getElementById("btn-auth-signin");
  const googleBtn = document.getElementById("btn-auth-google");
  const signOutBtn = document.getElementById("btn-signout");
  const emailInput = document.getElementById("auth-email");

  if (signInBtn && emailInput) {
    signInBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      if (!email) {
        alert("Entrez une adresse email pour recevoir le magic link.");
        return;
      }

      setAuthOverlayState({
        title: "Lien magique en route",
        copy: "Verifiez votre boite mail puis revenez ici pour charger votre progression cloud.",
        busy: true,
      });

      try {
        await signInWithMagicLink(email);
        setAuthOverlayState({
          title: "Email envoye",
          copy: "Cliquez sur le lien recu par email, puis revenez sur cette page.",
          showLogin: true,
        });
      } catch (error) {
        console.error("Impossible d'envoyer le lien magique :", error);
        setAuthOverlayState({
          title: "Connexion indisponible",
          copy: "Le service d'authentification est indisponible pour le moment.",
          showLogin: true,
        });
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      setAuthOverlayState({
        title: "Connexion Google",
        copy: "Redirection vers Google en cours...",
        busy: true,
      });

      try {
        await signInWithGoogle();
      } catch (error) {
        console.error("Impossible de lancer la connexion Google :", error);
        setAuthOverlayState({
          title: "Connexion indisponible",
          copy: "Le provider Google n'est pas disponible pour le moment.",
          showLogin: true,
        });
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await signOut();
      updateAccountPanel(null);
      setAuthOverlayState({
        title: "Connexion requise",
        copy: "Connectez-vous pour charger votre profil autoritaire et vos sauvegardes cloud.",
      });
    });
  }
};

const loadPlayerAfterAuth = async () => {
  if (profileLoadInFlight) {
    authLog("loadPlayerAfterAuth reuse in-flight promise");
    return profileLoadInFlight;
  }

  profileLoadInFlight = (async () => {
    try {
      authLog("loadPlayerAfterAuth start");
      setAuthOverlayState({
        title: "Chargement du profil",
        copy: "Connexion et hydratation du personnage en cours...",
        showLogin: false,
        busy: true,
        status: "Lecture du profil cloud...",
      });
      await loadAuthoritativeProfile();
      authLog("loadAuthoritativeProfile done");
      setAuthOverlayState({
        title: "Chargement du profil",
        copy: "Connexion et hydratation du personnage en cours...",
        showLogin: false,
        busy: true,
        status: "Application de la progression hors ligne...",
      });
      await applyServerOfflineProgress();
      authLog("applyServerOfflineProgress done");
      updateUI();
      setAudioListener();
      hideAuthOverlay();
    } catch (error) {
      authLog("loadPlayerAfterAuth failed", error);
      console.error("Chargement cloud degrade :", error);
      updateUI();
      setAuthOverlayState({
        title: "Profil indisponible",
        copy: "Le profil cloud n'a pas pu etre charge.",
        showLogin: true,
        status: error?.message || String(error),
      });
      throw error;
    }
  })();

  try {
    await profileLoadInFlight;
  } finally {
    profileLoadInFlight = null;
  }
};

const ensureAuthenticatedBootstrap = async (user, source) => {
  authLog("ensureAuthenticatedBootstrap", source, user?.id || "no-user");

  if (!user) {
    loadedUserId = null;
    bootstrappedUserId = null;
    setAuthOverlayState({
      title: "Connexion requise",
      copy: "Connectez-vous pour charger votre profil autoritaire et vos sauvegardes cloud.",
      showLogin: true,
    });
    return;
  }

  updateAccountPanel(user);
  if (bootstrappedUserId === user.id && !profileLoadInFlight) {
    authLog("bootstrap already complete", user.id);
    hideAuthOverlay();
    return;
  }

  await loadPlayerAfterAuth();
  loadedUserId = user.id;
  bootstrappedUserId = user.id;
  authLog("bootstrap complete", source, user.id);
};

// Set the onload handler
window.onload = async () => {
  authLog("window.onload start");
  if (handleAutoRefresh()) return;

  checkScheduledReset();
  loadGame();
  createFireParticles();
  bindAuthUi();
  setAudioListener();

  const startAudioOnInteraction = () => {
    playCampMusic();
    window.removeEventListener("click", startAudioOnInteraction);
  };
  window.addEventListener("click", startAudioOnInteraction);

  if (!isCloudConfigured()) {
    setAuthOverlayState({
      title: "Supabase non configure",
      copy: "Ajoutez SUPABASE_URL et SUPABASE_ANON_KEY dans window.__ELDEN_CHILL_CONFIG__ pour activer le mode cloud autoritaire.",
      showLogin: false,
    });
    updateUI();
    return;
  }

  onAuthStateChange(async ({ user }) => {
    authLog("onAuthStateChange handler", user?.id || "no-user");
    if (!authBootstrapInitialized) {
      authLog("onAuthStateChange ignored until initAuth completes");
      return;
    }

    try {
      await ensureAuthenticatedBootstrap(user, "auth-state-change");
    } catch (error) {
      console.error("Chargement du profil impossible :", error);
      updateUI();
      setAuthOverlayState({
        title: "Profil indisponible",
        copy: "Le profil serveur n'a pas pu etre charge. Rechargez la page dans un instant.",
        showLogin: true,
        status: error?.message || String(error),
      });
    }
  });

  const authState = await initAuth();
  authBootstrapInitialized = true;
  authLog("initAuth completed", authState.user?.id || "no-user");
  updateAccountPanel(authState.user);

  try {
    await ensureAuthenticatedBootstrap(authState.user, "initAuth");
  } catch (error) {
    console.error("Bootstrap du profil impossible :", error);
    updateUI();
    setAuthOverlayState({
      title: "Profil indisponible",
      copy: "Le profil serveur n'a pas pu etre charge. Rechargez la page dans un instant.",
      showLogin: true,
      status: error?.message || String(error),
    });
  }

  updateUI();
};

window.addEventListener("beforeunload", () => {
  if (isCloudConfigured()) {
    flushPendingProfileSync("beforeunload").catch(() => null);
  }
});

setInterval(() => saveGame("interval"), 30000);
