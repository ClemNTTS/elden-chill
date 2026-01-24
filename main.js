import { gameState, upgradeCosts } from "./stats.js";
import { updateUI, toggleView } from "./ui.js";
import { startExploration, updateStepper, toggleOptions } from "./exploration.js";
import { upgradeStat } from "./upgrade.js";
import { equipItem, } from "./stats.js";
import { dev } from "./dev.js";
import { saveGame, loadGame, resetGame } from "./save.js";

setInterval(saveGame, 30000);
window.onload = loadGame;
window.gameState = gameState;
window.upgradeStat = upgradeStat;
window.toggleView = toggleView;
window.startExploration = startExploration;
window.equipItem = equipItem;
window.resetGame = resetGame;
window.toggleOptions = toggleOptions;
window.dev = dev;