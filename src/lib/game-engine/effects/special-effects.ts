/**
 * 特殊効果 Executor
 * 
 * 設計方針:
 * - 複雑な特殊効果の処理
 * - デッキ・手札操作系の効果
 * - 全体効果の処理
 */

import type {
  GameState,
  FieldCard,
  PlayerId,
  ValueChange,
} from "@/types/game";
import type { FilterRule } from "@/types/cards";
import { SeededRandom } from "../seeded-random";
import {
  addEffectTriggerAction,
  getOpponentId,
  createValueChange,
} from "./effect-types";
import { UniversalFilterEngine } from "../core/target-filter";

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

    valueChanges[target.id] = {
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
      player.hand = player.hand.filter((c) => c.id !== cardToDiscard.id);
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
    valueChanges[target.id] = { health: createValueChange(before, 0) };
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
    const cardIndex = player.field.findIndex(c => c.id === target.id);
    if (cardIndex !== -1) {
      const [removedCard] = player.field.splice(cardIndex, 1);
      // 墓地でなく消滅領域へ送る
      player.banishedCards.push(removedCard);
      valueChanges[target.id] = { health: createValueChange(target.currentHealth, 0) };
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
