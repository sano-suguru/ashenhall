/**
 * コア効果 Executor - 統合版
 * 
 * 設計方針:
 * - 基本効果（ダメージ・回復）
 * - 修正効果（バフ・デバフ）
 * - 特殊効果（デッキ・手札操作、全体効果等）
 * - 決定論的な効果処理
 * 
 * 統合内容:
 * - base-effects.ts: executeDamageEffect, executeHealEffect
 * - modifier-effects.ts: executeBuffAttackEffect, executeBuffHealthEffect, executeDebuffAttackEffect, executeDebuffHealthEffect
 * - special-effects.ts: executeDestroyDeckTopEffect, executeSwapAttackHealthEffect, executeHandDiscardEffect, executeDestroyAllCreaturesEffect, executeBanishEffect
 */

import type {
  GameState,
  FieldCard,
  PlayerId,
  ValueChange,
  CardEffect,
  EffectAction,
} from "@/types/game";
import type { FilterRule } from "@/types/cards";
import { SeededRandom } from "../seeded-random";
import { applyDamage as applyCardDamage } from '../health-utils';
import { handleCreatureDeath } from '../card-effects';
import {
  addEffectTriggerAction as addEffectTriggerActionFromLogger,
} from "../action-logger";
import { UniversalFilterEngine } from "../core/target-filter";

// =============================================================================
// SHARED UTILITIES
// =============================================================================

/**
 * 効果ログを追加のヘルパー関数
 * 全Effect Executorで共通使用
 */
function addEffectTriggerAction(
  state: GameState,
  sourceCardId: string,
  effectType: EffectAction,
  effectValue: number,  
  targets: Record<string, ValueChange>
): void {
  addEffectTriggerActionFromLogger(state, state.currentPlayer, {
    sourceCardId,
    effectType,
    effectValue,
    targets,
  });
}

/**
 * プレイヤーID変換ユーティリティ
 */
export function getOpponentId(playerId: PlayerId): PlayerId {
  return playerId === "player1" ? "player2" : "player1";
}

/**
 * 値変化記録のヘルパー
 */
function createValueChange(before: number, after: number): { before: number; after: number } {
  return { before, after };
}

// =============================================================================
// BASE EFFECTS (from base-effects.ts)
// =============================================================================

/**
 * ダメージ効果の処理
 */
export function executeDamageEffect(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  damage: number,
  sourceCardId: string
): void {
  applyDamage(state, targets, targetPlayerId, damage, sourceCardId);
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
    applyCardDamage(target, damage);
    const after = target.currentHealth;
    valueChanges[target.templateId] = { health: createValueChange(before, after) };
    // 即時破壊: 直接ダメージで 0 以下になった場合はここで破壊処理。
    // これにより Lifesteal や on_death 連鎖が元のテスト前提どおり同期的に発火する。
    if (after <= 0) {
      handleCreatureDeath(state, target, 'effect', sourceCardId);
    }
  });

  if (targetPlayerId) {
    const player = state.players[targetPlayerId];
    const before = player.life;
    player.life = Math.max(0, player.life - damage);
    const after = player.life;
    valueChanges[targetPlayerId] = { life: createValueChange(before, after) };
  }

  addEffectTriggerAction(state, sourceCardId, "damage", damage, valueChanges);

  // 直接死亡は上で即時処理済み。連鎖的/間接的に 0HP へ落ちたカードは後続の trigger / passive / system sweep で回収される。
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
    valueChanges[target.templateId] = { health: createValueChange(before, after) };
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

// =============================================================================
// MODIFIER EFFECTS (from modifier-effects.ts)
// =============================================================================

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
      valueChanges[target.templateId] = { attack: createValueChange(before, after) };
    } else {
      const before = target.currentHealth;
      target.healthModifier += value;
      target.currentHealth += value;
      const after = target.currentHealth;
      valueChanges[target.templateId] = { health: createValueChange(before, after) };
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
      valueChanges[target.templateId] = { attack: createValueChange(before, after) };
    } else {
      const before = target.currentHealth;
      target.healthModifier -= value;
      const maxHealth =
        target.health + target.healthModifier + target.passiveHealthModifier;
      if (target.currentHealth > maxHealth) {
        target.currentHealth = maxHealth;
      }
      const after = target.currentHealth;
      valueChanges[target.templateId] = { health: createValueChange(before, after) };
    }
  });

  const effectType =
    debuffType === "attack" ? "debuff_attack" : "debuff_health";
  addEffectTriggerAction(state, sourceCardId, effectType, value, valueChanges);

  // 体力デバフ適用後に死亡判定を行う
  if (debuffType === "health") {
    targets.forEach((target) => {
      if (target.currentHealth <= 0) {
        handleCreatureDeath(state, target, "effect", sourceCardId);
      }
    });
  }
}

// =============================================================================
// SPECIAL EFFECTS (from special-effects.ts)
// =============================================================================

/**
 * デッキトップ破壊効果の処理
 */
export function executeDestroyDeckTopEffect(
  state: GameState,
  sourcePlayerId: PlayerId,
  costThreshold: number,
  sourceCardId: string
): void {
  const opponentId = getOpponentId(sourcePlayerId);
  const opponent = state.players[opponentId];

  if (opponent.deck.length > 0) {
    const topCard = opponent.deck[opponent.deck.length - 1];
    if (topCard.cost >= costThreshold) {
      const destroyedCard = opponent.deck.pop()!;
      opponent.graveyard.push(destroyedCard);
      addEffectTriggerAction(
        state,
        sourceCardId,
        "destroy_deck_top",
        destroyedCard.cost,
        { [opponentId]: {} }
      );
    }
  }
}

/**
 * 攻撃力と体力を入れ替える効果の処理
 */
export function executeSwapAttackHealthEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    const oldAttack =
      target.attack + target.attackModifier + target.passiveAttackModifier;
    const oldHealth =
      target.health + target.healthModifier + target.passiveHealthModifier;
    const oldCurrentHealth = target.currentHealth;

    // Swap base stats
    const tempBaseAttack = target.attack;
    target.attack = target.health;
    target.health = tempBaseAttack;

    // Reset modifiers and apply new ones to match the swapped values
    target.attackModifier = 0;
    target.healthModifier = 0;
    target.passiveAttackModifier = 0;
    target.passiveHealthModifier = 0;

    const newBaseAttack = target.attack;
    const newBaseHealth = target.health;

    target.attackModifier = oldHealth - newBaseAttack;
    target.healthModifier = oldAttack - newBaseHealth;

    // Adjust current health proportionally
    const healthRatio = oldHealth > 0 ? oldCurrentHealth / oldHealth : 0;
    target.currentHealth = Math.ceil(
      (newBaseHealth + target.healthModifier) * healthRatio
    );

    const newAttack =
      target.attack + target.attackModifier + target.passiveAttackModifier;
    const newCurrentHealth = target.currentHealth;

    valueChanges[target.templateId] = {
      attack: createValueChange(oldAttack, newAttack),
      health: createValueChange(oldCurrentHealth, newCurrentHealth),
    };
  });
  addEffectTriggerAction(
    state,
    sourceCardId,
    "swap_attack_health",
    1,
    valueChanges
  );
}

/**
 * 手札破壊効果の処理
 */
export function executeHandDiscardEffect(
  state: GameState,
  targetPlayerId: PlayerId,
  count: number,
  sourceCardId: string,
  random: SeededRandom,
  filter?: FilterRule[]
): void {
  const player = state.players[targetPlayerId];
  if (player.hand.length === 0) return;

  for (let i = 0; i < count; i++) {
    let potentialTargets = player.hand;

    // UniversalFilterEngineを使用して手札フィルタリング（実装完成）
    if (filter && Array.isArray(filter)) {
      potentialTargets = UniversalFilterEngine.applyRules(player.hand, filter, sourceCardId);
    }

    if (potentialTargets.length === 0) return;

    const cardToDiscard = random.choice(potentialTargets);
    if (cardToDiscard) {
      player.hand = player.hand.filter((c) => c.templateId !== cardToDiscard.templateId);
      player.graveyard.push(cardToDiscard);
      addEffectTriggerAction(state, sourceCardId, "hand_discard", 1, {
        [targetPlayerId]: {},
      });
    }
  }
}

/**
 * 全クリーチャー破壊効果の処理
 */
export function executeDestroyAllCreaturesEffect(
  state: GameState,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  const targets: FieldCard[] = [];
  state.players.player1.field.forEach((c) => targets.push(c));
  state.players.player2.field.forEach((c) => targets.push(c));

  targets.forEach((target) => {
    const before = target.currentHealth;
    target.currentHealth = 0;
    valueChanges[target.templateId] = { health: createValueChange(before, 0) };
  });

  addEffectTriggerAction(
    state,
    sourceCardId,
    "destroy_all_creatures",
    1,
    valueChanges
  );
}

/**
 * 消滅効果の処理（墓地を経由しない除去）
 */
export function executeBanishEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  
  targets.forEach((target) => {
    const ownerId = target.owner;
    const player = state.players[ownerId];
    
    // 場から除去（handleCreatureDeathは使わない - 死亡時効果を発動させない）
    const cardIndex = player.field.findIndex(c => c.instanceId === target.instanceId);
    if (cardIndex !== -1) {
      const [removedCard] = player.field.splice(cardIndex, 1);
      // 墓地でなく消滅領域へ送る
      player.banishedCards.push(removedCard);
      valueChanges[target.templateId] = { health: createValueChange(target.currentHealth, 0) };
    }
  });

  // 場の位置を再インデックス
  state.players.player1.field.forEach((c, i) => (c.position = i));
  state.players.player2.field.forEach((c, i) => (c.position = i));

  addEffectTriggerAction(
    state,
    sourceCardId,
    "banish",
    1,
    valueChanges
  );
}
