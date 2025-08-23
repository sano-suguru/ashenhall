/**
 * 基本効果 Executor
 * 
 * 設計方針:
 * - ダメージ・回復効果の処理
 * - 特殊カード処理を含む（mag_arcane_lightning等）
 * - 決定論的な効果処理
 */

import type {
  GameState,
  Card,
  FieldCard,
  PlayerId,
  ValueChange,
} from "@/types/game";
import { SeededRandom } from "../seeded-random";
import { handleCreatureDeath } from "../card-effects";
import {
  addEffectTriggerAction,
  getOpponentId,
  createValueChange,
} from "./effect-types";

/**
 * ダメージ効果の処理
 */
export function executeDamageEffect(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  damage: number,
  sourceCardId: string,
  sourceCard: Card,
  random: SeededRandom
): void {
  // 特殊効果: 秘術の連雷
  if (sourceCard.id === "mag_arcane_lightning") {
    const opponentId = getOpponentId(state.currentPlayer);
    const initialTarget = random.choice(
      state.players[opponentId].field.filter((c) => c.currentHealth > 0)
    );
    if (initialTarget) {
      const initialHealth = initialTarget.currentHealth;
      applyDamage(state, [initialTarget], null, damage, sourceCard.id);
      if (initialTarget.currentHealth <= 0 && initialHealth > 0) {
        // 死亡した場合
        const secondaryTarget = random.choice(
          state.players[opponentId].field.filter(
            (c) => c.currentHealth > 0 && c.id !== initialTarget.id
          )
        );
        if (secondaryTarget) {
          applyDamage(state, [secondaryTarget], null, 2, sourceCard.id);
        }
      }
    }
  } else {
    applyDamage(state, targets, targetPlayerId, damage, sourceCardId);
  }
}

/**
 * 回復効果の処理
 */
export function executeHealEffect(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  healing: number,
  sourceCardId: string
): void {
  applyHeal(state, targets, targetPlayerId, healing, sourceCardId);
}

/**
 * ダメージ効果の処理（内部実装）
 */
function applyDamage(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  damage: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    const before = target.currentHealth;
    target.currentHealth = Math.max(0, target.currentHealth - damage);
    const after = target.currentHealth;
    valueChanges[target.id] = { health: createValueChange(before, after) };
  });

  if (targetPlayerId) {
    const player = state.players[targetPlayerId];
    const before = player.life;
    player.life = Math.max(0, player.life - damage);
    const after = player.life;
    valueChanges[targetPlayerId] = { life: createValueChange(before, after) };
  }

  addEffectTriggerAction(state, sourceCardId, "damage", damage, valueChanges);

  // ダメージ適用後に死亡判定
  targets.forEach((target) => {
    if (target.currentHealth <= 0) {
      handleCreatureDeath(state, target, 'effect', sourceCardId);
    }
  });
}

/**
 * 回復効果の処理（内部実装）
 */
function applyHeal(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  healing: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    const maxHealth =
      target.health + target.healthModifier + target.passiveHealthModifier;
    const before = target.currentHealth;
    target.currentHealth = Math.min(maxHealth, target.currentHealth + healing);
    const after = target.currentHealth;
    valueChanges[target.id] = { health: createValueChange(before, after) };
  });

  if (targetPlayerId) {
    const player = state.players[targetPlayerId];
    const before = player.life;
    player.life += healing;
    const after = player.life;
    valueChanges[targetPlayerId] = { life: createValueChange(before, after) };
  }

  addEffectTriggerAction(state, sourceCardId, "heal", healing, valueChanges);
}
