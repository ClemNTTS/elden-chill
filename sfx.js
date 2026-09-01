// Bruitages.
//
// Volontairement peu nombreux. Un jeu ou chaque coup claque devient
// insupportable au bout de dix minutes, et le combat tire jusqu'a six attaques
// par tour : sans limitation, un build dexterite produirait un mitraillage.
//
// Trois garde-fous :
//
//   - un ETRANGLEMENT par son (`minGap`), pour qu'un meme bruitage ne se
//     repete pas plus vite qu'un intervalle donne ;
//   - un POOL de balises Audio par son, pour que deux occurrences proches se
//     superposent au lieu de se couper ;
//   - un volume PROPRE, separe de celui de la musique. Beaucoup de joueurs
//     coupent la musique et gardent les effets, ou l'inverse.
//
// Les fichiers viennent du pack itch.io deja present dans assets/itch-assets.

import { gameState } from "./state.js";

const ROOT = "assets/itch-assets/";

/**
 * `minGap` est en millisecondes. Il est court pour les sons de frappe, qui
 * doivent suivre la cadence, et long pour les jingles, qui n'ont aucune raison
 * de se declencher deux fois de suite.
 */
const SOUNDS = {
  hit: { file: "Weapons/sword_slice.wav", volume: 0.5, minGap: 90 },
  crit: { file: "Weapons/sword_clash.wav", volume: 0.75, minGap: 160 },
  hurt: { file: "Retro/hurt.wav", volume: 0.5, minGap: 220 },
  kill: { file: "Combat and Gore/bone_snap.wav", volume: 0.5, minGap: 200 },
  ash: { file: "Musical Effects/8_bit_chime_quick.wav", volume: 0.6, minGap: 300 },
  loot: { file: "Items/item_equip.wav", volume: 0.65, minGap: 400 },
  runes: { file: "Items/coins_gather_quick.wav", volume: 0.55, minGap: 500 },
  bossDown: { file: "Musical Effects/brass_chime_positive.wav", volume: 0.8, minGap: 1500 },
  death: { file: "Musical Effects/8_bit_defeated.wav", volume: 0.7, minGap: 1500 },
};

const POOL_SIZE = 3;
const pools = new Map();
const lastPlayed = new Map();

const getVolume = () => gameState.save?.sfxVolume ?? 0.5;

/** Cree les balises a la demande : rien n'est charge tant qu'un son ne sert pas. */
const getPool = (key) => {
  if (pools.has(key)) return pools.get(key);
  const def = SOUNDS[key];
  if (!def) return null;
  const pool = Array.from({ length: POOL_SIZE }, () => {
    const audio = new Audio(ROOT + def.file);
    audio.preload = "auto";
    return audio;
  });
  pools.set(key, pool);
  return pool;
};

/**
 * Joue un bruitage. Silencieux si le volume est a zero, si l'etranglement
 * n'est pas ecoule, ou si le navigateur refuse la lecture — un bruitage ne
 * doit jamais interrompre une partie.
 */
export const playSfx = (key) => {
  const def = SOUNDS[key];
  if (!def) return;

  const master = getVolume();
  if (master <= 0) return;

  const now = Date.now();
  if (now - (lastPlayed.get(key) || 0) < def.minGap) return;
  lastPlayed.set(key, now);

  const pool = getPool(key);
  if (!pool) return;

  // La premiere balise libre, sinon la plus ancienne : on ne coupe jamais un
  // son en cours si on peut l'eviter.
  const audio = pool.find((a) => a.paused || a.ended) || pool[0];
  audio.volume = Math.min(1, def.volume * master);
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

/** Precharge les bruitages les plus frequents, pour eviter un blanc au premier coup. */
export const primeSfx = () => {
  ["hit", "crit", "hurt", "kill"].forEach(getPool);
};

export const setSfxVolume = (volume) => {
  if (!gameState.save) gameState.save = {};
  gameState.save.sfxVolume = Math.max(0, Math.min(1, volume));
};
