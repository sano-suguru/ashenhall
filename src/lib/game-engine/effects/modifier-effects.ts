/**
 * 修正効果 Executor
 * 
 * 設計方針:
 * - バフ・デバフ効果の処理
 * - パッシブ効果の特殊処理を含む
 * - 決定論的な修正値計算
 */

import type {
  GameState,
  Card,
  FieldCard,
  PlayerId,
  ValueChange,
  CardEffect,
} from "@/types/game";
import {
  addEffectTriggerAction,
  createValueChange,
} from "./effect-types";

/**
 * 攻撃力バフ効果の処理
 */
export function executeBuffAttackEffect(
  state: GameState,
  targets: FieldCard[],
  value: number,
  sourceCardId: string,
  effect: CardEffect
): void {
  if (effect.trigger === "passive") {
    // パッシブ効果：直接修正子を適用、ログは記録しない
    targets.forEach((target) => {
      target.passiveAttackModifier += value;
    });
  } else {
    // 通常のバフ効果
    applyBuff(state, targets, "attack", value, sourceCardId);
  }
}

/**
 * 体力バフ効果の処理
 */
export function executeBuffHealthEffect(
  state: GameState,
  targets: FieldCard[],
  value: number,
  sourceCardId: string,
  effect: CardEffect
): void {
  if (effect.trigger === "passive") {
    // パッシブ効果：直接修正子を適用、ログは記録しない
    targets.forEach((target) => {
      target.passiveHealthModifier += value;
      target.currentHealth += value;
    });
  } else {
    // 通常のバフ効果
    applyBuff(state, targets, "health", value, sourceCardId);
  }
}

/**
 * 攻撃力デバフ効果の処理
 */
export function executeDebuffAttackEffect(
  state: GameState,
  targets: FieldCard[],
  value: number,
  sourceCardId: string
): void {
  applyDebuff(state, targets, "attack", value, sourceCardId);
}

/**
 * 体力デバフ効果の処理
 */
export function executeDebuffHealthEffect(
  state: GameState,
  targets: FieldCard[],
  value: number,
  sourceCardId: string
): void {
  applyDebuff(state, targets, "health", value, sourceCardId);
}

/**
 * バフ効果の処理（内部実装）
 */
function applyBuff(
  state: GameState,
  targets: FieldCard[],
  buffType: "attack" | "health",
  value: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    if (buffType === "attack") {
      const before =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      target.attackModifier += value;
      const after =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      valueChanges[target.id] = { attack: createValueChange(before, after) };
    } else {
      const before = target.currentHealth;
      target.healthModifier += value;
      target.currentHealth += value;
      const after = target.currentHealth;
      valueChanges[target.id] = { health: createValueChange(before, after) };
    }
  });

  const effectType = buffType === "attack" ? "buff_attack" : "buff_health";
  addEffectTriggerAction(state, sourceCardId, effectType, value, valueChanges);
}

/**
 * デバフ効果の処理（内部実装）
 */
function applyDebuff(
  state: GameState,
  targets: FieldCard[],
  debuffType: "attack" | "health",
  value: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    if (debuffType === "attack") {
      const before =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      target.attackModifier = Math.max(
        -target.attack,
        target.attackModifier - value
      );
      const after =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      valueChanges[target.id] = { attack: createValueChange(before, after) };
    } else {
      const before = target.currentHealth;
      target.healthModifier -= value;
      const maxHealth =
        target.health + target.healthModifier + target.passiveHealthModifier;
      if (target.currentHealth > maxHealth) {
        target.currentHealth = maxHealth;
      }
      const after = target.currentHealth;
      valueChanges[target.id] = { health: createValueChange(before, after) };
    }
  });

  const effectType =
    debuffType === "attack" ? "debuff_attack" : "debuff_health";
  addEffectTriggerAction(state, sourceCardId, effectType, value, valueChanges);
}
