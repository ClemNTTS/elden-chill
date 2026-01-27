import { ASHES_OF_WAR } from "./ashes.js";
import { BIOMES, LOOT_TABLES } from "./biome.js";
import { MONSTERS } from "./monster.js";
import { ITEMS } from "./item.js";
import { STATUS_EFFECTS } from "./status.js";
import { handleDeath, handleVictory } from "./core.js";
import {
  gameState,
  getEffectiveStats,
  runtimeState,
  getHealth,
} from "./state.js";
import {
  ActionLog, 
  formatNumber,
  triggerShake,
  updateHealthBars,
  updateUI,
} from "./ui.js";

/* ================= STATUS EFFECTS ================= */

export const applyEffect = (targetEffects, effectId, duration) => {
  const existing = targetEffects.find((e) => e.id === effectId);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
  } else {
    targetEffects.push({ id: effectId, duration });
  }
};

const processTurnEffects = (entity, effectsArray) => {
  let logMessages = [];
  let skipTurn = false;

  for (let i = effectsArray.length - 1; i >= 0; i--) {
    const effectRef = effectsArray[i];
    const effectData = STATUS_EFFECTS[effectRef.id];

    if (effectData.onTurnStart) {
      const result = effectData.onTurnStart(entity);
      if (result?.message) logMessages.push(result.message);
      if (result?.skipTurn) skipTurn = true;
    }

    effectRef.duration--;
    if (effectRef.duration <= 0) {
      effectsArray.splice(i, 1);
    }
  }
  return { logMessages, skipTurn };
};

/* ================= ENTITY HP ACCESSORS ================= */

function getEntityHp(entity) {
  if ("hp" in entity) return entity.hp;
  if ("currentHp" in entity) return entity.currentHp;
  return 0;
}

function setEntityHp(entity, value) {
  if ("hp" in entity) entity.hp = value;
  else if ("currentHp" in entity) entity.currentHp = value;
}

function getEntityMaxHp(entity) {
  if ("maxHp" in entity) return entity.maxHp;
  if ("currentHp" in entity) {
    const stats = getEffectiveStats();
    return stats.vigor * 10;
  }
  return 0;
}

/* ================= GENERIC ATTACK SYSTEM ================= */

export function performAttack({
  attackers,
  target,
  targetGroup,
  attackerEffects,
  targetEffects,
  stats,
  logPrefix,
  isPlayer = false,
  ashEffect = null
}) {
  attackers.forEach((attacker) => {
    let damage = attacker.atk ?? stats?.strength ?? 0;

    if (ashEffect?.damageMult) {
      damage *= ashEffect.damageMult;
    }

    let isCrit = false;
    if (stats?.critChance && Math.random() < stats.critChance) {
      isCrit = true;
      damage *= stats.critDamage;
    }

    // -------------------- APPLY REDUCTIONS/PENETRATIONS --------------------
    const flatReduction = target.flatDamageReduction ?? 0;
    const percentReduction = target.percentDamageReduction ?? 0;

    const flatPenetration = attacker.flatDamagePenetration ?? 0;
    const percentPenetration = attacker.percentDamagePenetration ?? 0;

    let effectiveFlat = Math.max(0, flatReduction - flatPenetration);
    let effectivePercent = Math.max(0, percentReduction - percentPenetration);

    damage = damage - effectiveFlat;
    damage = damage * (1 - effectivePercent);

    damage = Math.max(0, Math.floor(damage)); // no negative damage
    // ------------------------------------------------------------------------

    /* ===== MAIN TARGET ===== */
    setEntityHp(target, getEntityHp(target) - damage);
    updateHealthBars();

    ActionLog(
      `${logPrefix} ${isPlayer ? "infligez" : "frappe"} ${formatNumber(damage)} dégâts ${isCrit ? "CRITIQUES !" : "."}`,
      isCrit ? "log-crit" : ""
    );

    /* ===== SPLASH ===== */
    const splash = stats?.splashDamage ?? attacker.splashDamage ?? 0;
    if (splash > 0 && targetGroup?.length > 1) {
      for (let i = 1; i < targetGroup.length; i++) {
        setEntityHp(targetGroup[i], getEntityHp(targetGroup[i]) - splash);
      }

      ActionLog(
        `${logPrefix} ${isPlayer ? "infligez" : "inflige"} ${formatNumber(splash)} dégâts de zone au reste du groupe de ${targetGroup[0].name}.`
      );
    }

    /* ===== TARGET REACTIVE EFFECTS ===== */
    targetEffects.forEach((eff) => {
      const effectData = STATUS_EFFECTS[eff.id];
      if (effectData.onBeingHit) {
        const result = effectData.onBeingHit(attacker, target, damage);
        if (result?.message) {
          ActionLog(result.message, "log-warning");
        }
      }
    });

    /* ===== ATTACKER ON-HIT EFFECT ===== */
    if (attacker.onHitEffect) {
      const { id, duration, chance } = attacker.onHitEffect;
      if (Math.random() < chance) {
        applyEffect(targetEffects, id, duration);
        ActionLog(
          `${isPlayer ? "Vous appliquez" : "L'attaque applique"} ${duration} ${STATUS_EFFECTS[id].name} !`,
          "log-warning"
        );
      }
    }

    /* ===== PLAYER ITEMS ===== */
    if (isPlayer) {
      Object.values(gameState.equipped).forEach((itemId) => {
        const item = ITEMS[itemId];
        if (item?.onHitEffect) {
          const { id, duration, chance } = item.onHitEffect;
          if (Math.random() < chance) {
            applyEffect(targetEffects, id, duration);
            ActionLog(
              `Vous appliquez ${duration} ${STATUS_EFFECTS[id].name} à l'ennemi !`,
              "log-warning"
            );
          }
        }
      });
    }

    // -------------------- PHASE CHECK --------------------
    if (target.hasSecondPhase && !target.isInSecondPhase) {
        const hpFraction = getEntityHp(target) / (target.maxHp ?? target.hp ?? 1);
        if (hpFraction <= target.thresholdForPhase2) {
            target.isInSecondPhase = true;
            // Multiply damage if defined
            if (target.dmgMultPhase2) {
                if ("atk" in target) target.atk *= target.dmgMultPhase2;
            }
            // Display flavor text in combat log with a bright color
            if (target.flavorTextPhase2) {
                ActionLog(target.flavorTextPhase2, "log-flavor-orange"); // You can define this CSS class
            }
        }
    }
  });
}

/* ================= REMAINING ENEMY MESSAGE HELPERS ================= */

const countEnemyTypes = (enemies) => {
  const counts = {};
  enemies.forEach((e) => {
    counts[e.name] = (counts[e.name] || 0) + 1;
  });
  return counts;
};

const generateRemainingEnemiesMessage = (enemies) => {
  if (enemies.length === 0) return "";

  const counts = countEnemyTypes(enemies);
  const parts = Object.entries(counts).map(([name, count]) => `${count} ${name}`);

  if (parts.length === 1) return `Il reste encore ${parts[0]} !`;
  if (parts.length === 2) return `Il reste encore ${parts[0]} et ${parts[1]} !`;

  const last = parts.pop();
  return `Il reste encore ${parts.join(", ")}, et ${last} !`;
};

/* ================= COMBAT LOOP ================= */

export const combatLoop = (sessionId) => {
  if (runtimeState.combatFrozen) return;
  if (!gameState.world.isExploring) return;
  if (sessionId !== runtimeState.currentCombatSession) return;

  const playerObj = {
    name: "Vôtre héro",
    currentHp: runtimeState.playerCurrentHp,
    maxHp: getHealth(gameState.stats.vigor),
  };

  setTimeout(() => {
    const playerStatus = processTurnEffects(playerObj, gameState.playerEffects);
    runtimeState.playerCurrentHp = playerObj.currentHp;

    if (playerStatus.logMessages.length > 0) {
      playerStatus.logMessages.forEach((msg) => ActionLog(msg, "log-warning"));
    }

    if (runtimeState.playerCurrentHp <= 0) {
      handleDeath();
      return;
    }

    /* ================= PLAYER TURN ================= */
    if (!playerStatus.skipTurn) {
      const stats = getEffectiveStats();

      // ash of war
      let ashEffect = null;
      if (runtimeState.ashIsPrimed && runtimeState.ashUsesLeft > 0) {
        const ash = ASHES_OF_WAR[gameState.equippedAsh];
        ashEffect = ash.effect(stats, runtimeState.currentEnemyGroup[0]);
        runtimeState.ashUsesLeft--;
        runtimeState.ashIsPrimed = false;
        ActionLog(`CENDRE : ${ash.name} activée !`, "log-ash-activation");
        if (ashEffect.msg) ActionLog(ashEffect.msg, "log-status");
      }

      for (let i = 0; i < stats.attacksPerTurn; i++) {
        performAttack({
          attackers: [{ atk: stats.strength }],
          target: runtimeState.currentEnemyGroup[0],
          targetGroup: runtimeState.currentEnemyGroup,
          attackerEffects: gameState.playerEffects,
          targetEffects: gameState.ennemyEffects,
          stats,
          logPrefix: "Vous",
          isPlayer: true,
          ashEffect
        });
      }
    }

    /* ================= KILL CHECK ================= */
    let defeatedEnemies = [];

    for (let i = runtimeState.currentEnemyGroup.length - 1; i >= 0; i--) {
      const enemy = runtimeState.currentEnemyGroup[i];
      if (enemy.hp <= 0) {
        defeatedEnemies.push(enemy);
        runtimeState.currentEnemyGroup.splice(i, 1);
      }
    }

    // Reward runes
    if (defeatedEnemies.length > 0) {
      const eff = getEffectiveStats();
      const intBonus = 1 + eff.intelligence / 100;

      defeatedEnemies.forEach((enemy) => {
        const runesAwarded = Math.floor(enemy.runes * intBonus);
        gameState.runes.carried += runesAwarded;
        ActionLog(`${enemy.name} a été vaincu ! (+${formatNumber(runesAwarded)} runes)`, "log-runes");
      });

      // Show remaining enemies message only if there are enemies left
      if (runtimeState.currentEnemyGroup.length > 0) {
        const msg = generateRemainingEnemiesMessage(runtimeState.currentEnemyGroup);
        if (msg) ActionLog(msg);
      }
    }

    /* ================= VICTORY CHECK ================= */
    if (runtimeState.currentEnemyGroup.length === 0) {
      runtimeState.lastDefeatedEnemy =
        defeatedEnemies[defeatedEnemies.length - 1] || null;
      setTimeout(() => handleVictory(sessionId), 500);
      return;
    }

    /* ================= UI UPDATE ================= */
    const front = runtimeState.currentEnemyGroup[0];
    const groupSizeText =
      runtimeState.currentEnemyGroup.length > 1
        ? ` (x${runtimeState.currentEnemyGroup.length})`
        : "";

    document.getElementById("enemy-name").innerText =
      runtimeState.currentLoopCount > 0
        ? `${front.name}${groupSizeText} +${runtimeState.currentLoopCount}`
        : `${front.name}${groupSizeText}`;

    updateHealthBars();
    updateUI();

    /* ================= ENEMY TURN ================= */
    setTimeout(() => {
      if (
        sessionId !== runtimeState.currentCombatSession ||
        !gameState.world.isExploring
      ) return;

      const enemyStatus = processTurnEffects(runtimeState.currentEnemyGroup[0], gameState.ennemyEffects);

      if (enemyStatus.logMessages.length > 0) {
        enemyStatus.logMessages.forEach((msg) => ActionLog(msg, "log-status"));
      }

      if (!enemyStatus.skipTurn) {
        const eff = getEffectiveStats();
        const dodgeChance = Math.min(0.5, eff.dexterity / 500);

        if (Math.random() < dodgeChance) {
          ActionLog("ESQUIVE ! Vous évitez le coup.", "log-dodge");
          setTimeout(() => combatLoop(sessionId), 500);
          return;
        }

        // Enemy attacks the player
        playerObj.currentHp = runtimeState.playerCurrentHp; // sync before attack
        performAttack({
          attackers: runtimeState.currentEnemyGroup,
          target: playerObj,
          targetGroup: null,
          attackerEffects: gameState.ennemyEffects,
          targetEffects: gameState.playerEffects,
          stats: null,
          logPrefix: runtimeState.currentEnemyGroup[0].name,
          isPlayer: false
        });
        runtimeState.playerCurrentHp = playerObj.currentHp; // sync back

        // Shake effect for heavy hits
        runtimeState.currentEnemyGroup.forEach(enemy => {
          if (enemy.atk > getHealth(eff.vigor) * 0.15) triggerShake();
        });

        updateHealthBars();
        updateUI();
      }

      if (runtimeState.playerCurrentHp <= 0) {
        handleDeath();
      } else {
        setTimeout(() => combatLoop(sessionId), 500);
      }
    }, 800);

  }, 800);
};
