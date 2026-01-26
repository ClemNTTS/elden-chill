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
      if (result?.message) {
        logMessages.push(result.message);
      }
      if (result?.skipTurn) {
        skipTurn = true;
      }
    }

    effectRef.duration--;
    if (effectRef.duration <= 0) {
      effectsArray.splice(i, 1);
    }
  }
  return { logMessages, skipTurn };
};

export const combatLoop = (sessionId) => {
  if (!gameState.world.isExploring) return;
  if (sessionId !== runtimeState.currentCombatSession) return;

  const playerObj = {
    name: "Vôtre héros",
    currentHp: runtimeState.playerCurrentHp,
    maxHp: getEffectiveStats().vigor * 10,
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
      let splashDmg = stats.splashDamage;


      //ash of war
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
        let damage = stats.strength;
        if (ashEffect && ashEffect.damageMult) {
          damage *= ashEffect.damageMult;
        }

        const isCrit = Math.random() < stats.critChance;
        if (isCrit) damage *= stats.critDamage;

        // main target
        runtimeState.currentEnemyGroup[0].hp -= Math.floor(damage);
        updateHealthBars();

        ActionLog(
          `Vous infligez ${formatNumber(Math.floor(damage))} dégâts ${isCrit ? "CRITIQUES !" : "."}`,
          isCrit ? "log-crit" : ""
        );

        // splash damage
        if (splashDmg > 0 && runtimeState.currentEnemyGroup.length > 1) {
          for (let j = 1; j < runtimeState.currentEnemyGroup.length; j++) {
            runtimeState.currentEnemyGroup[j].hp -= splashDmg;
          }

          ActionLog(
            `Vous infligez ${formatNumber(splashDmg)} dégâts de zone au reste du groupe de ${runtimeState.currentEnemyGroup[0].name}.`
          );
        }

        // enemy reactive effects
        if (ashEffect && ashEffect.status) {
          applyEffect(
            gameState.ennemyEffects,
            ashEffect.status.id,
            ashEffect.status.duration,
          );
        }
        gameState.ennemyEffects.forEach((eff) => {
          const effectData = STATUS_EFFECTS[eff.id];
          if (effectData.onBeingHit) {
            const result = effectData.onBeingHit(
              { name: "player" },
              runtimeState.currentEnemyGroup[0],
              damage,
            );
            if (result?.message) {
              ActionLog(result.message, "log-warning");
            }
            if (runtimeState.playerCurrentHp <= 0) {
              handleDeath();
              return;
            }
          }
        });

        // item on-hit effects
        Object.values(gameState.equipped).forEach((itemId) => {
          const item = ITEMS[itemId];
          if (item?.onHitEffect) {
            const { id, duration, chance } = item.onHitEffect;
            if (Math.random() < chance) {
              applyEffect(gameState.ennemyEffects, id, duration);
              ActionLog(
                `Vous appliquez ${duration} ${STATUS_EFFECTS[id].name} à l'ennemi !`,
                "log-warning"
              );
            }
          }
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
    
    if (defeatedEnemies.length > 0) {
      let eff = getEffectiveStats();
      let intBonus = 1 + eff.intelligence / 100;

      defeatedEnemies.forEach((enemy) => {
        let runesAwarded = Math.floor(enemy.runes * intBonus);
        gameState.runes.carried += runesAwarded;
        ActionLog(
          `${enemy.name} a été vaincu ! (+${formatNumber(runesAwarded)} runes)`,
          "log-runes"
        );
      });
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

    ActionLog(`Un ${front.name} reste !${groupSizeText}`);

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

      const enemyStatus = processTurnEffects(
        runtimeState.currentEnemyGroup[0],
        gameState.ennemyEffects
      );

      if (enemyStatus.logMessages.length > 0) {
        enemyStatus.logMessages.forEach((msg) =>
          ActionLog(msg, "log-status")
        );
      }

      if (!enemyStatus.skipTurn) {
        const eff = getEffectiveStats();
        const dodgeChance = Math.min(0.5, eff.dexterity / 500);

        if (Math.random() < dodgeChance) {
          ActionLog("ESQUIVE ! Vous évitez le coup.", "log-dodge");
          setTimeout(() => combatLoop(sessionId), 500);
          return;
        }

        runtimeState.currentEnemyGroup.forEach((enemy) => {
          runtimeState.playerCurrentHp -= enemy.atk;
          updateHealthBars();

          if (enemy.atk > getHealth(eff.vigor) * 0.15) triggerShake();

          ActionLog(`${enemy.name} frappe ! -${formatNumber(enemy.atk)} PV`);

          gameState.playerEffects.forEach((eff) => {
            const effectData = STATUS_EFFECTS[eff.id];
            if (effectData.onBeingHit) {
              const result = effectData.onBeingHit(
                enemy,
                { name: "player" },
                enemy.atk,
              );

              if (result?.message) {
                ActionLog(result.message, "log-status");
              }
            }
          });

          if (enemy.onHitEffect) {
            const { id, duration, chance } = enemy.onHitEffect;
            if (Math.random() < chance) {
              applyEffect(gameState.playerEffects, id, duration);
              ActionLog(
                `L'attaque vous a appliqué ${duration} ${STATUS_EFFECTS[id].name} !`,
                "log-warning"
              );
            }
          }
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