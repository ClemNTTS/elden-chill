// Traits de biome : ce qui distingue une zone d'une autre au-dela de ses
// statistiques.
//
// Sans eux, deux biomes ne different que par les points de vie de leurs
// monstres. Un trait est une regle locale, active pendant toute l'expedition,
// que le joueur doit lire avant de partir et contre laquelle il prepare son
// build.
//
// Trois points d'accroche, volontairement peu nombreux pour que le combat
// reste lisible :
//
//   runBuff        objet de modificateurs, verse dans activeRunBuffs au depart.
//                  Couvre tout ce que getRunModifier() sait deja lire.
//   enemyModifier  applique a chaque ennemi cree (spawn.js).
//   onTurn         appele une fois par tour de joueur (combat.js). Renvoie un
//                  tableau de messages a journaliser.

import { gameState, runtimeState } from "./state.js";
import { applyEffect } from "./status-apply.js";

/**
 * Chaque trait declare `name` et `detail` : ce sont eux que la fiche de biome
 * affiche. Un trait sans description serait une regle cachee, donc une
 * mauvaise surprise.
 */
export const BIOME_TRAITS = {
  festival: {
    name: "Festival sanglant",
    detail:
      "Les habitants s'excitent : chaque ennemi gagne 8% d'attaque a chaque tour, sans plafond. Les combats longs deviennent mortels.",
    onTurn: ({ enemies }) => {
      let escalated = false;
      enemies.forEach((enemy) => {
        if (enemy.hp <= 0) return;
        enemy._festival = (enemy._festival || 0) + 1;
        enemy.atk = Math.floor(enemy.atk * 1.08);
        escalated = true;
      });
      return escalated && enemies[0]?._festival % 3 === 0
        ? ["Les tambours accelerent. La foule hurle plus fort."]
        : [];
    },
  },

  toxic_mist: {
    name: "Brume toxique",
    detail:
      "L'air lui-meme est empoisonne : 2 cumuls de Poison par tour, attenues par la resistance au poison.",
    onTurn: () => {
      applyEffect(gameState.playerEffects, "POISON", 2);
      return [];
    },
  },

  blood_contract: {
    name: "Contrat de sang",
    detail:
      "Le Manoir paie ses tueurs : +80% de runes. En echange, aucun soin n'est possible tant que vous etes dedans.",
    runBuff: { runeGainMult: 0.8, noHeal: 1 },
  },

  serpent_blood: {
    name: "Sang du serpent",
    detail:
      "Tout ce qui vit ici se recompose : les ennemis regagnent 3% de leur vie maximale par tour. Il faut frapper plus vite que ca.",
    onTurn: ({ enemies }) => {
      const msgs = [];
      enemies.forEach((enemy) => {
        if (enemy.hp <= 0 || enemy.hp >= enemy.maxHp) return;
        const heal = Math.max(1, Math.floor(enemy.maxHp * 0.03));
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        msgs.push(`${enemy.name} se recompose (+${heal} PV).`);
      });
      return msgs.slice(0, 1);
    },
  },

  sealed_grace: {
    name: "Grace scellee",
    detail:
      "La Tour coupe le lien : aucun soin, d'aucune source. Votre barre de vie ne remontera pas avant la sortie.",
    runBuff: { noHeal: 1 },
  },

  eternal_night: {
    name: "Nuit eternelle",
    detail:
      "On ne voit pas venir les coups : votre chance d'esquive est divisee par deux.",
    runBuff: { dodgeMult: 0.5 },
  },

  ember_field: {
    name: "Braises anciennes",
    detail: "Le sol couve encore : 2 tours de Brulure appliques a chaque tour.",
    onTurn: () => {
      applyEffect(gameState.playerEffects, "BURN", 2);
      return [];
    },
  },

  scarlet_bloom: {
    name: "Floraison ecarlate",
    detail:
      "Les spores tombent en continu : 2 tours de Putrefaction par tour. La resistance a la putrefaction n'est plus optionnelle.",
    onTurn: () => {
      applyEffect(gameState.playerEffects, "SCARLET_ROT", 2);
      return [];
    },
  },

  tempest: {
    name: "Tempete perpetuelle",
    detail:
      "La foudre frappe au hasard : 1,5% de vos points de vie maximum par tour, et ca ignore l'armure.",
    onTurn: ({ playerMaxHp }) => {
      const damage = Math.max(1, Math.floor(playerMaxHp * 0.015));
      runtimeState.playerCurrentHp -= damage;
      return [`La tempete vous cingle (-${damage} PV).`];
    },
  },

  ashen_veil: {
    name: "Voile de cendre",
    detail:
      "La cendre ronge les plaques : votre armure effective est reduite de 20%.",
    runBuff: { armorMult: 0.8 },
  },

  no_retreat: {
    name: "Nulle part ou fuir",
    detail:
      "Au pied du Trone, il n'y a plus de route derriere. Le repli est impossible, et le Fleau mortel s'accumule d'un cumul par tour.",
    runBuff: { noRetreat: 1 },
    onTurn: () => {
      applyEffect(gameState.playerEffects, "DEATH_BLIGHT", 1);
      return [];
    },
  },

  beast_offering: {
    name: "Offrande bestiale",
    detail:
      "Gurranq ne recoit pas d'elites, mais il paie : aucune rencontre rare, et +120% de chance de butin.",
    runBuff: { rareChanceMult: 0, lootChanceMult: 2.2 },
  },

  jar_luck: {
    name: "Chance des jarres",
    detail:
      "Les jarres sont creuses et pleines de runes : les ennemis n'ont que 40% de leurs points de vie, mais rapportent quatre fois plus.",
    runBuff: { runeGainMult: 3 },
    enemyModifier: (enemy) => {
      enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 0.4));
      enemy.hp = Math.min(enemy.hp, enemy.maxHp);
    },
  },

  gauntlet: {
    name: "Gantelet des champions",
    detail:
      "Quatre champions s'enchainent sans repos : aucun soin entre les combats, et chaque palier est un boss.",
    runBuff: { noHeal: 1 },
  },
};

export const getBiomeTrait = (traitId) => BIOME_TRAITS[traitId] || null;

/** Traits actifs de l'expedition en cours. */
export const getActiveTraits = () =>
  (gameState.world.activeTraits || [])
    .map((id) => BIOME_TRAITS[id])
    .filter(Boolean);

/** Applique le trait a un ennemi qui vient d'etre cree. */
export const applyTraitsToEnemy = (enemy) => {
  getActiveTraits().forEach((trait) => trait.enemyModifier?.(enemy));
  return enemy;
};

/**
 * Tick de debut de tour. Renvoie les messages a journaliser.
 * Ne fait rien hors expedition, ce qui evite d'empoisonner le joueur au camp.
 */
/** Affliction correspondant a chaque danger declare par un biome. */
const AFFLICTION_DU_DANGER = {
  poison: "POISON",
  putrefaction: "SCARLET_ROT",
  gel: "FROSTBITE",
  folie: "MADNESS",
  saignement: "BLEED",
};

export const tickBiomeTraits = (playerMaxHp) => {
  if (!gameState.world.isExploring) return [];
  const enemies = runtimeState.currentEnemyGroup || [];
  const messages = getActiveTraits().flatMap(
    (trait) => trait.onTurn?.({ enemies, playerMaxHp }) || [],
  );

  /*
   * extraHazardPressure : le risque promis par la Route d'avidite.
   *
   * L'evenement posait cette cle et annonçait "plus risquee, mais plus riche".
   * Rien ne la lisait : la route n'avait que des avantages. Elle ajoute
   * desormais, chaque tour, une chance d'encaisser un cumul du danger dominant
   * du biome. Sans danger declare, la route est simplement sans risque
   * supplementaire — ce qui est coherent avec une zone qui n'en a pas.
   */
  const pression = (gameState.preparation?.activeRunBuffs || []).reduce(
    (total, buff) => total + (buff.extraHazardPressure || 0),
    0,
  );
  if (pression > 0) {
    const danger = (gameState.world.activeBiomeHazards || [])[0];
    const affliction = AFFLICTION_DU_DANGER[danger];
    if (affliction && Math.random() < Math.min(0.3, pression * 0.08)) {
      applyEffect(gameState.playerEffects, affliction, 1);
      messages.push("La route d'avidite vous expose : le danger vous gagne.");
    }
  }

  return messages;
};

/** Modificateurs a verser dans activeRunBuffs au depart de l'expedition. */
export const getTraitRunBuffs = (traitIds = []) =>
  traitIds
    .map((id) => [id, BIOME_TRAITS[id]])
    .filter(([, trait]) => trait?.runBuff)
    .map(([id, trait]) => ({
      id: `trait_${id}`,
      label: trait.name,
      kind: "biome",
      ...trait.runBuff,
    }));
