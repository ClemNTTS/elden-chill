import { ASHES_OF_WAR } from "./ashes.js";
import { STATUS_EFFECTS } from "./status.js";
import { ITEMS } from "./item.js";
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
  playAshEffect,
  playEnemyAttack,
  playEnemyDeath,
  playEnemyHurt,
  playHeroCombatAttack,
  playHeroCombatHurt,
  triggerShake,
  updateHealthBars,
  updateUI,
} from "./ui.js";
import { adjustStatusApplication, buildEnemyIntent } from "./systems.js";

// Helper to use offline-time bank to speed up timeouts when enabled.
function delayedSetTimeout(fn, ms) {
  let delay = ms;
  try {
    const save = gameState.save || {};
    const use = save.useOfflineTime && (save.offlineTimeBank || 0) > 0 && gameState.world.isExploring;
    const M = runtimeState.offlineSpeedMultiplier || 3;
    if (use && M > 1 && ms > 0) {
      const fullSavedMs = Math.max(0, ms - Math.floor(ms / M));
      const bankMs = (save.offlineTimeBank || 0) * 1000;
      if (bankMs >= fullSavedMs) {
        delay = Math.max(0, Math.floor(ms / M));
        save.offlineTimeBank = Math.max(0, (save.offlineTimeBank || 0) - fullSavedMs / 1000);
      } else if (bankMs > 0) {
        delay = Math.max(0, Math.floor(ms - bankMs));
        save.offlineTimeBank = 0;
      }
      // reflect UI changes immediately
      try {
        updateUI();
      } catch (e) {}
    }
  } catch (e) {
    console.warn("delayedSetTimeout error:", e);
  }

  return setTimeout(fn, delay);
}

/* ================= HELPERS ================= */

function getEntityHp(entity) {
  if ("currentHp" in entity) return entity.currentHp;
  if ("hp" in entity) return entity.hp;
  return 0;
}

function setEntityHp(entity, value) {
  if ("currentHp" in entity) entity.currentHp = value;
  else if ("hp" in entity) entity.hp = value;
}

function getMonsterArmor(monster) {
  if (monster && typeof monster.armor === "number") return monster.armor;
  return 100;
}

function clamp(v, min = 0) {
  return Math.max(min, v);
}

/* ================= STATUS EFFECTS ================= */

export const applyEffect = (targetEffects, effectId, value) => {
  if (!targetEffects.__owner) {
    targetEffects.__owner = true;
  }
  // value can be duration or stacks
  const existing = targetEffects.find((e) => e.id === effectId);
  const adjustedValue = adjustStatusApplication(effectId, value || 1, targetEffects);
  if (effectId === "BLEED" || effectId === "FROSTBITE") {
    if (existing) {
      existing.stacks = (existing.stacks || 0) + adjustedValue;
    } else {
      targetEffects.push({ id: effectId, stacks: adjustedValue });
    }
  } else {
    if (existing) {
      existing.duration = Math.max(existing.duration, adjustedValue);
    } else {
      targetEffects.push({ id: effectId, duration: adjustedValue });
    }
  }
};

const processTurnEffects = (entity, effectsArray) => {
  let logMessages = [];
  let skipTurn = false;

  if (effectsArray.length === 0) return { logMessages, skipTurn };

  for (let i = effectsArray.length - 1; i >= 0; i--) {
    const effectRef = effectsArray[i];
    const effectData = STATUS_EFFECTS[effectRef.id];

    if (effectData.onTurnStart) {
      const result = effectData.onTurnStart(entity);
      if (result?.message) logMessages.push(result.message);
      if (result?.skipTurn) skipTurn = true;
    }

    if (effectRef.id !== "BLEED" && effectRef.id !== "FROSTBITE") {
      effectRef.duration--;
      if (effectRef.duration <= 0) {
        effectsArray.splice(i, 1);
      }
    }
  }

  return { logMessages, skipTurn };
};

/* ================= GENERIC ATTACK ================= */

export function performAttack({
  attackers,
  target,
  targetGroup,
  stats,
  targetEffects,
  logPrefix,
  isPlayer = false,
  ashEffect = null,
}) {
  attackers.forEach((attacker) => {
    let damage = attacker.atk ?? stats?.strength ?? 0;

    /* ================= ENEMY DODGE (PLAYER ATTACK ONLY) ================= */
    if (isPlayer && target) {
      const isStunned = targetEffects?.some((e) => e.id === "STUN");
      const dodgeChance = target.dodgeChance ?? 0;

      if (!isStunned && dodgeChance > 0 && Math.random() < dodgeChance) {
        ActionLog(`ESQUIVE ! ${target.name} évite l'attaque.`, "log-dodge");
        return; // cancel this hit completely
      }
    } else {
      logPrefix = attacker.name;
    }
    // --- NEW BLEED LOGIC ---
    const bleedEffect = targetEffects.find((eff) => eff.id === "BLEED");
    if (bleedEffect && bleedEffect.stacks > 0) {
      const procChance = bleedEffect.stacks * 0.1;
      if (Math.random() < procChance) {
        const bleedDamage = Math.floor(damage * (0.2 * bleedEffect.stacks));
        damage += bleedDamage;

        ActionLog(
          `HÉMORRAGIE ! Le saignement inflige ${formatNumber(bleedDamage)} dégâts supplémentaires !`,
          "log-crit",
        );

        // Consume stacks
        const bleedIndex = targetEffects.findIndex((eff) => eff.id === "BLEED");
        if (bleedIndex > -1) {
          targetEffects.splice(bleedIndex, 1);
        }
      }
    }
    // --- END NEW BLEED LOGIC ---
    // --- FROSTBITE LOGIC ---

    let frostEffect = targetEffects.find((eff) => eff.id === "FROSTBITE");
    if (frostEffect && frostEffect.stacks >= 10) {
      let frostDamage = Math.floor(target.maxHp * 0.1) + 30;
      if (target.isBoss) {
        frostDamage = Math.floor(frostDamage * 0.7);
      }
      damage += frostDamage;
      if (!isPlayer) {
        runtimeState.playerArmorDebuff += 20;
      } else {
        if (typeof target.armor === "number") {
          target.armor -= 20;
        } else {
          target.armor = 80;
        }
      }
      ActionLog(
        `❄️ GELURE ! ${target.name} subit ${frostDamage} dégâts, perd 20 d'armure et est brisé par le froid !`,
        "log-dodge",
      );
      frostEffect.stacks -= 10;
      if (frostEffect.stacks <= 0) {
        const idx = targetEffects.findIndex((e) => e.id === "FROSTBITE");
        if (idx > -1) targetEffects.splice(idx, 1);
      }
    }
    if (ashEffect?.damageMult) {
      damage *= ashEffect.damageMult;
    }

    if (ashEffect?.status) {
      applyEffect(
        targetEffects,
        ashEffect.status.id,
        ashEffect.status.duration,
      );
    }

    if (isPlayer && runtimeState.nextAtkMultBonus !== 1) {
      damage *= runtimeState.nextAtkMultBonus;
      runtimeState.nextAtkMultBonus = 1;
    }

    let isCrit = false;
    const critChance = stats?.critChance ?? 0;
    const critDamage = stats?.critDamage ?? 1.5;
    if (critChance && Math.random() < critChance) {
      isCrit = true;
      damage *= critDamage;
    }

    damage = Math.max(0, damage);

    /* ================= ARMOR SYSTEM ================= */

    let armor;
    const eff = getEffectiveStats();
    if (isPlayer) {
      /* PLAYER ATTACKING MONSTER */
      const monsterArmor = getMonsterArmor(target);
      const playerPercentPen = eff.percentDamagePenetration ?? 0;
      const playerFlatPen = eff.flatDamagePenetration ?? 0;

      armor = monsterArmor;
      armor *= 1 - playerPercentPen;
      armor -= playerFlatPen;
    } else {
      /* MONSTER ATTACKING PLAYER */
      armor = (eff.armor ?? 100) - runtimeState.playerArmorDebuff;
      const monsterPercentPen = attacker.percentDamagePenetration ?? 0;
      const monsterFlatPen = attacker.flatDamagePenetration ?? 0;
      armor *= 1 - monsterPercentPen;
      armor -= monsterFlatPen;
    }

    armor = clamp(armor, 1); // avoid division by 0

    const damageMultiplier = 100 / armor;

    let finalDamage = Math.floor(damage * damageMultiplier);
    if (!isPlayer && attacker?.isBoss) {
      finalDamage = Math.floor(finalDamage * (1 - Math.min(0.45, eff.bossMitigation || 0)));
    }
    if (isPlayer && targetEffects.__executionBonus) {
      finalDamage += targetEffects.__executionBonus;
      delete targetEffects.__executionBonus;
    }
    finalDamage = Math.max(0, finalDamage);

    /* ===== APPLY DAMAGE ===== */
    setEntityHp(target, getEntityHp(target) - finalDamage);

    // Animations : l'attaquant frappe, la cible encaisse. Si le coup est
    // mortel, la cible joue sa mort plutot que son encaissement.
    if (isPlayer) {
      playHeroCombatAttack();
      if (getEntityHp(target) <= 0) playEnemyDeath();
      else playEnemyHurt();
    } else {
      playEnemyAttack();
      playHeroCombatHurt();
    }

    updateHealthBars();

    ActionLog(
      `${logPrefix} ${isPlayer ? "infligez" : "frappe"} ${formatNumber(finalDamage)} dégâts ${isCrit ? "CRITIQUES !" : "."}`,
      isCrit ? "log-crit" : "",
    );

    if (!isPlayer) {
      // Monster is attacking player, check for on-being-hit item effects
      Object.values(gameState.equipped).forEach((itemId) => {
        const itemLevel = gameState.inventory.find(
          (i) => i.id === itemId,
        )?.level;
        const item = ITEMS[itemId];
        if (item && typeof item.funcOnBeingHit === "function") {
          item.funcOnBeingHit(eff, attackers[0], finalDamage, itemLevel);
          updateHealthBars();
          updateUI();
        }
      });
    }

    /* ================= PHASE CHECK ================= */
    if (target?.hasSecondPhase && !target.isInSecondPhase) {
      const maxHp = target.maxHp ?? target.hp;
      const hpRatio = getEntityHp(target) / maxHp;

      if (hpRatio <= target.thresholdForPhase2) {
        target.isInSecondPhase = true;

        if (target.dmgMultPhase2 && target.atk) {
          target.atk *= target.dmgMultPhase2;
        }

        if (target.dodgePhase2) {
          target.dodgeChance = target.dodgePhase2;
        }

        if (target.effectsPhase2) {
          target.onHitEffect = target.effectsPhase2;
        }

        if (target.flavorTextPhase2) {
          ActionLog(target.flavorTextPhase2, "log-flavor-orange");
        }
      }
    }

    /* ===== SPLASH ===== */
    let splash = stats?.splashDamage ?? 0;
    if (isCrit) {
      splash *= critDamage;
    }

    splash = Math.round(splash);
    if (splash > 0 && targetGroup?.length > 1) {
      for (let i = 1; i < targetGroup.length; i++) {
        targetGroup[i].hp -= splash;
      }

      ActionLog(
        `${logPrefix} ${isPlayer ? "infligez" : "inflige"} ${formatNumber(splash)} dégâts de zone au reste du groupe de ${targetGroup[0].name}.`,
      );
    }

    /* ===== TARGET EFFECT REACTIONS ===== */
    targetEffects.forEach((eff) => {
      const effectData = STATUS_EFFECTS[eff.id];
      if (effectData.onBeingHit) {
        target.__effects = targetEffects;
        const result = effectData.onBeingHit(attacker, target, finalDamage);

        if (result?.message) ActionLog(result.message, "log-warning");
      }
    });

    const attackerHp =
      "currentHp" in attacker ? attacker.currentHp : attacker.hp;
    if (attackerHp <= 0) {
      return; // On arrête l'attaque immédiatement
    }

    /* ===== ATTACKER ON-HIT EFFECT ===== */
    if (attacker.onHitEffect) {
      const { id, duration, chance } = attacker.onHitEffect;
      if (Math.random() < chance) {
        applyEffect(targetEffects, id, duration);
        if (id === "BLEED") {
          ActionLog(
            `Saignement appliqué ! (+${duration} stack(s))`,
            "log-status",
          );
        } else {
          ActionLog(
            `${isPlayer ? "Vous appliquez" : "L'attaque applique"} ${duration} ${STATUS_EFFECTS[id].name} !`,
            "log-warning",
          );
        }
      }
    }

    /* ===== PLAYER ITEMS ===== */
    if (isPlayer) {
      Object.values(gameState.equipped).forEach((itemId) => {
        //level de l'item
        const itemLevel = gameState.inventory.find(
          (i) => i.id === itemId,
        )?.level;
        const item = ITEMS[itemId];
        if (!item) return;

        if (typeof item.funcOnHit === "function") {
          item.funcOnHit(eff, targetEffects, itemLevel);
          updateHealthBars();
          updateUI();
        }

        if (item?.onHitEffect) {
          const { id, duration, chance } = item.onHitEffect;
          if (Math.random() < chance) {
            applyEffect(targetEffects, id, duration);
            if (id === "BLEED") {
              ActionLog(
                `Saignement appliqué ! (+${duration} stack(s))`,
                "log-status",
              );
            } else {
              ActionLog(
                `Vous appliquez ${duration} ${STATUS_EFFECTS[id].name} à l'ennemi !`,
                "log-warning",
              );
            }
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
  const parts = Object.entries(counts).map(
    ([name, count]) => `${count} ${name}`,
  );

  if (parts.length === 1) return `Il reste encore ${parts[0]} !`;
  if (parts.length === 2) return `Il reste encore ${parts[0]} et ${parts[1]} !`;

  const last = parts.pop();
  return `Il reste encore ${parts.join(", ")}, et ${last} !`;
};

/* ================= COMBAT LOOP ================= */

export const combatLoop = (sessionId) => {
  buildEnemyIntent(runtimeState.currentEnemyGroup[0]);
  if (!gameState.world.isExploring || runtimeState.combatFrozen) return;
  if (sessionId !== runtimeState.currentCombatSession) return;

  const playerObj = {
    name: "Vôtre héro",
    currentHp: runtimeState.playerCurrentHp,
    maxHp: getHealth(gameState.stats.vigor),
  };

  delayedSetTimeout(() => {
    let reductionHappened = false;
    //Applique la réduction de status si le joueur possède des items adéquats
    Object.values(gameState.equipped).forEach((itemId) => {
      const item = ITEMS[itemId];
      if (item?.passiveStatusReduction) {
        const effectsBefore = JSON.stringify(gameState.playerEffects);
        gameState.playerEffects = item.passiveStatusReduction(
          gameState.playerEffects,
          item.level,
        );
        if (effectsBefore !== JSON.stringify(gameState.playerEffects)) {
          reductionHappened = true;
        }
      }
    });
    updateHealthBars();
    updateUI();

    let delay = reductionHappened ? 500 : 0;
    delayedSetTimeout(() => {
      const playerStatus = processTurnEffects(
        playerObj,
        gameState.playerEffects,
      );
      runtimeState.playerCurrentHp = playerObj.currentHp;

      if (playerStatus.logMessages.length)
        playerStatus.logMessages.forEach((msg) =>
          ActionLog(msg, "log-warning"),
        );

      // --- STYPTIC BOLUSES LOGIC ---
      let hasStypticBoluses = false;
      for (const itemId of Object.values(gameState.equipped)) {
        if (ITEMS[itemId]?.passiveEffect === "HALVE_BLEED") {
          hasStypticBoluses = true;
          break;
        }
      }

      if (hasStypticBoluses) {
        const bleedEffect = gameState.playerEffects.find(
          (e) => e.id === "BLEED",
        );
        if (bleedEffect && bleedEffect.stacks > 0) {
          const stacksBefore = bleedEffect.stacks;
          bleedEffect.stacks = Math.floor(bleedEffect.stacks / 2);
          const stacksRemoved = stacksBefore - bleedEffect.stacks;
          if (stacksRemoved > 0) {
            ActionLog(
              `Vos Boluses Styptiques réduisent le saignement de ${stacksRemoved} charges.`,
              "log-heal", // Using a heal-like color for positive feedback
            );
          }
        }
      }

      // --- END STYPTIC BOLUSES LOGIC ---

      if (runtimeState.playerCurrentHp <= 0) {
        handleDeath();
        return;
      }

      /* ================= PLAYER TURN ================= */

      if (!playerStatus.skipTurn) {
        const stats = getEffectiveStats();

        let ashEffect = null;
        if (runtimeState.ashIsPrimed && runtimeState.ashUsesLeft > 0) {
          const ash = ASHES_OF_WAR[gameState.equippedAsh];
          ashEffect = ash.effect(stats, runtimeState.currentEnemyGroup[0]);
          runtimeState.ashUsesLeft--;
          runtimeState.ashIsPrimed = false;
          playAshEffect(gameState.equippedAsh);
          ActionLog(`CENDRE : ${ash.name} activée !`, "log-ash-activation");
          if (ashEffect.msg) ActionLog(ashEffect.msg, "log-status");
        }

        for (
          let i = 0;
          i < stats.attacksPerTurn + runtimeState.nextNbAtkBonus;
          i++
        ) {
          // Find first alive enemy
          const currentTarget = runtimeState.currentEnemyGroup.find(
            (e) => e.hp > 0,
          );

          // No alive enemies left
          if (!currentTarget) break;

          performAttack({
            attackers: [{ atk: stats.strength }],
            target: currentTarget,
            targetGroup: runtimeState.currentEnemyGroup,
            stats,
            targetEffects: gameState.ennemyEffects,
            logPrefix: "Vous",
            isPlayer: true,
            ashEffect,
          });
        }
      }
      runtimeState.nextNbAtkBonus = 0; // reset extra attacks after use

      const enemyIsDefeated =
        runtimeState.currentEnemyGroup.length > 0 &&
        runtimeState.currentEnemyGroup[0].hp <= 0;

      const continueCombat = () => {
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
            runtimeState.defeatedEnemies.push(enemy);
            /*const runesAwarded = Math.floor(enemy.runes * intBonus);
          gameState.runes.carried += Math.floor(runesAwarded);
          ActionLog(
            `${enemy.name} a été vaincu ! (+${formatNumber(runesAwarded)} runes)`,
            "log-runes",
          );*/
          });

          // Show remaining enemies message only if there are enemies left
          if (runtimeState.currentEnemyGroup.length > 0) {
            const msg = generateRemainingEnemiesMessage(
              runtimeState.currentEnemyGroup,
            );
            if (msg) ActionLog(msg);
          }
        }

        /* ================= VICTORY CHECK ================= */
          if (runtimeState.currentEnemyGroup.length === 0) {
          runtimeState.lastDefeatedEnemy =
            defeatedEnemies[defeatedEnemies.length - 1] || null;
          delayedSetTimeout(() => handleVictory(sessionId), 500);
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
        delayedSetTimeout(() => {
          if (
            sessionId !== runtimeState.currentCombatSession ||
            !gameState.world.isExploring
          )
            return;

          const enemyStatus = processTurnEffects(
            runtimeState.currentEnemyGroup[0],
            gameState.ennemyEffects,
          );

                if (runtimeState.currentEnemyGroup[0].hp <= 0) {
            ActionLog(
              `${runtimeState.currentEnemyGroup[0].name} succombe à ses blessures !`,
            );
            updateHealthBars();
            delayedSetTimeout(continueCombat, 500);
            return;
          }

          if (enemyStatus.logMessages.length > 0) {
            enemyStatus.logMessages.forEach((msg) =>
              ActionLog(msg, "log-status"),
            );
          }

          if (!enemyStatus.skipTurn) {
            const eff = getEffectiveStats();
            const dodgeChance = Math.min(0.5, gameState.stats.dexterity / 400);

            const playerIsStunned = gameState.playerEffects.some(
              (e) => e.id === "STUN",
            );

            if (Math.random() < dodgeChance && !playerIsStunned) {
              ActionLog("ESQUIVE ! Vous évitez le coup.", "log-dodge");
              delayedSetTimeout(() => combatLoop(sessionId), 500);
              return;
            }

            const loop =
              runtimeState.currentEnemyGroup[0].specificStats &&
              runtimeState.currentEnemyGroup[0].specificStats.attacksPerTurn
                ? runtimeState.currentEnemyGroup[0].specificStats.attacksPerTurn
                : 1;

            const enemy = runtimeState.currentEnemyGroup[0];
            let enemyDmgMult = 1;
            if (enemy.onTurnAction) {
              const action = enemy.onTurnAction(enemy, playerObj);
              if (action.msg) ActionLog(action.msg, "log-flavor-orange");

              if (action.skipAttack) {
                delayedSetTimeout(() => combatLoop(sessionId), 800);
                return;
              }

              if (action.dmgMult) enemyDmgMult = action.dmgMult;

              if (action.healAmount) {
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + action.healAmount);
                updateHealthBars();
              }
            }

            // Enemy attacks the player
            for (let i = 0; i < loop; i++) {
              playerObj.currentHp = runtimeState.playerCurrentHp; // sync before attack
              performAttack({
                attackers: runtimeState.currentEnemyGroup,
                target: playerObj,
                targetGroup: null,
                attackerEffects: gameState.ennemyEffects,
                targetEffects: gameState.playerEffects,
                stats: runtimeState.currentEnemyGroup[0].specificStats
                  ? runtimeState.currentEnemyGroup[0].specificStats
                  : null,
                logPrefix: runtimeState.currentEnemyGroup[0].name,
                isPlayer: false,
                ashEffect: { damageMult: enemyDmgMult },
              });
              runtimeState.playerCurrentHp = playerObj.currentHp; // sync back

              // Shake effect for heavy hits
              runtimeState.currentEnemyGroup.forEach((enemy) => {
                if (enemy.atk > getHealth(eff.vigor) * 0.15) triggerShake();
              });
            }
          }

          updateHealthBars();
          updateUI();

            if (runtimeState.playerCurrentHp <= 0) {
            handleDeath();
          } else if (runtimeState.currentEnemyGroup[0].hp <= 0) {
            delayedSetTimeout(continueCombat, 500);
          } else {
            delayedSetTimeout(() => combatLoop(sessionId), 500);
          }
        }, 800);
      };

      if (enemyIsDefeated) {
        delayedSetTimeout(continueCombat, 400); // Delay for animation
      } else {
        continueCombat();
      }
    }, delay);
  }, 800);
};
