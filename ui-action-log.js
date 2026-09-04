/*
 * Journal de combat : mise en page en deux colonnes et ecriture des entrees.
 *
 * Extrait de ui.js pour une raison mecanique, pas esthetique. item.js n'avait
 * besoin que de `ActionLog`, mais l'importait depuis ui.js — qui importe
 * game.js. Les modules de donnees tiraient donc tout le moteur d'affichage
 * derriere eux et ne s'importaient pas hors navigateur.
 *
 * Ce module ne depend que du DOM : rien du reste du jeu.
 */

export const ensureBattleLogLayout = () => {
  const root = document.getElementById("action-log");
  if (!root) return null;
  let enemyColumn = document.getElementById("action-log-enemy");
  let playerColumn = document.getElementById("action-log-player");
  if (enemyColumn && playerColumn) {
    return { root, enemyColumn, playerColumn };
  }

  root.innerHTML = `
    <div class="log-column player-column">
      <div class="log-column-title">Actions du Sans-eclat</div>
      <div class="log-column-body" id="action-log-player"></div>
    </div>
    <div class="log-column enemy-column">
      <div class="log-column-title">Pression ennemie</div>
      <div class="log-column-body" id="action-log-enemy"></div>
    </div>
  `;
  enemyColumn = document.getElementById("action-log-enemy");
  playerColumn = document.getElementById("action-log-player");
  return { root, enemyColumn, playerColumn };
};

const getLogSide = (message, className = "") => {
  const playerClasses = [
    "log-self",
    "log-heal",
    "log-runes",
    "log-ash-activation",
  ];
  if (playerClasses.includes(className)) return "player";

  if (
    message.startsWith("Vous") ||
    message.startsWith("Votre heros") ||
    message.startsWith("Vous etes") ||
    message.startsWith("Vous subissez") ||
    message.startsWith("Vous brulez") ||
    message.startsWith("Vous vous blessez") ||
    message.startsWith("CENDRE") ||
    message.startsWith("BOSS VAINCU") ||
    message.startsWith("OBJET UNIQUE") ||
    message.startsWith("Copie de") ||
    message.startsWith("Site de grace") ||
    message.startsWith("De retour") ||
    message.startsWith("ESQUIVE ! Vous")
  ) {
    return "player";
  }

  return "enemy";
};

const getLogKind = (message = "", className = "") => {
  if (className === "log-runes") return "runes";
  if (className === "log-heal") return "heal";
  if (className === "log-event") return "event";
  if (className === "log-ash-activation" || message.startsWith("CENDRE"))
    return "ash";
  if (className === "log-crit" || message.startsWith("BOSS VAINCU"))
    return "boss";
  if (message.includes("esquive") || message.includes("ESQUIVE"))
    return "status";
  if (message.includes("Objet") || message.includes("OBJET")) return "loot";
  return "system";
};

export const refreshConversationHighlights = (layout) => {
  if (!layout) return;
  [layout.enemyColumn, layout.playerColumn].forEach((column) => {
    const entries = column.querySelectorAll(".log-entry");
    entries.forEach((entry, index) => {
      entry.classList.toggle("log-entry-latest", index === 0);
    });
  });
};

export const ActionLog = (message, className = "") => {
  const layout = ensureBattleLogLayout();
  if (!layout) return;
  const side = getLogSide(message, className);
  const kind = getLogKind(message, className);
  const targetColumn =
    side === "player" ? layout.playerColumn : layout.enemyColumn;
  const latest = targetColumn.querySelector(".log-entry");
  if (latest && latest.dataset.rawMessage === message) {
    const nextCount = Number(latest.dataset.repeatCount || "1") + 1;
    latest.dataset.repeatCount = String(nextCount);
    let badge = latest.querySelector(".log-repeat-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "log-repeat-badge";
      latest.appendChild(badge);
    }
    badge.innerText = `x${nextCount}`;
  } else {
    const entry = document.createElement("p");
    entry.innerText = `> ${message}`;
    entry.classList.add("log-entry", "log-system");
    entry.dataset.rawMessage = message;
    entry.dataset.repeatCount = "1";
    entry.dataset.kind = kind;
    if (className) {
      entry.classList.add(className);
    }
    entry.classList.add(side === "player" ? "player-side" : "enemy-side");
    entry.classList.add(`log-kind-${kind}`);
    targetColumn.prepend(entry);
  }
  refreshConversationHighlights(layout);
};
