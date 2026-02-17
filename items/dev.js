import { ITEM_TYPES } from "../constants.js";

export const DEV = {
	/*===========================
            TIER -1 Testing
  ============================*/
  stun_stick: {
    name: "🌀 Bâtonnet d'Étourdissement",
    type: ITEM_TYPES.WEAPON,
    description: "Attaque avec 100% de chance d'étourdir l'ennemi pendant 2 tour.",
    onHitEffect: { id: "STUN", duration: 2, chance: 1 },
  },
  frost_stick: {
    name: "❄️ Bâtonnet de Gel",
    type: ITEM_TYPES.WEAPON,
    description: "Attaque avec 100% de chance d'infliger 4 Gelures.",
    onHitEffect: { id: "FROSTBITE", duration: 4, chance: 1 },
  },
  bleed_stick: {
    name: "🩸 Bâtonnet de Saignement",
    type: ITEM_TYPES.WEAPON,
    description: "Attaque avec 100% de chance d'infliger 4 Saignements.",
    onHitEffect: { id: "BLEED", duration: 4, chance: 1 },
  },
  burn_stick: {
    name: "🔥 Bâtonnet de Brûlure",
    type: ITEM_TYPES.WEAPON,
    description: "Attaque avec 100% de chance d'infliger 4 Brûlures.",
    onHitEffect: { id: "BURN", duration: 4, chance: 1 },
  },
  thorns_stick: {
    name: "🌵 Bâtonnet d'Épines",
    type: ITEM_TYPES.WEAPON,
    description: "Attaque avec 100% de chance d'appliquer Épines pendant 2 tours.",
    onHitEffect: { id: "THORNS", duration: 2, chance: 1 },
  },
  rot_stick: {
    name: "🪰 Bâtonnet de Pourriture",
    type: ITEM_TYPES.WEAPON,
    description: "Attaque avec 100% de chance d'infliger 4 Pourritures.",
    onHitEffect: { id: "ROT", duration: 4, chance: 1 },
  },
  poison_stick: {
    name: "☠️ Bâtonnet de Poison",
    type: ITEM_TYPES.WEAPON,
    description: "Attaque avec 100% de chance d'infliger 4 Poison.",
    onHitEffect: { id: "POISON", duration: 4, chance: 1 },
  },
};