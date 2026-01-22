let player = {
  runes: 0,
  level: 1,
  vigor: 10,
  strength: 10,
  inventory: [],
};

const saveGame = () => {
  localStorage.setItem("eldenChillSave", JSON.stringify(player));
  console.log("Sauvegarde effectuée !");
};

const loadGame = () => {
  const savedData = localStorage.getItem("eldenChillSave");
  if (savedData) {
    player = JSON.parse(savedData);
    updateUI();
  }
};

const collectRunes = () => {
  player.runes += player.strength;
  updateUI();
};

const updateUI = () => {
  document.getElementById("rune-count").innerText = player.runes;
  document.getElementById("level").innerText = player.level;
  document.getElementById("strength").innerText = player.strength;
};

setInterval(saveGame, 30000);

window.onload = loadGame;
