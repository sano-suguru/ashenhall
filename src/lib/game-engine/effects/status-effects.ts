/**
 * 状態効果 Executor
 * 
 * 設計方針:
 * - 状態変更効果の処理（silence, stun, ready, draw_card）
 * - 手札・デッキ操作を含む
 * - 決定論的な状態変更
 */

import type {
  GameState,
  FieldCard,
  PlayerId,
  ValueChange,
} from "@/types/game";
import {
  addEffectTriggerAction,
} from "./effect-types";

/**
 * 沈黙効果の処理
 */
export function executeSilenceEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    target.isSilenced = true;
    valueChanges[target.id] = {};
  });
  addEffectTriggerAction(state, sourceCardId, "silence", 1, valueChanges);
}

/**
 * 再攻撃準備効果の処理
 */
export function executeReadyEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    if (!target.readiedThisTurn) {
      target.hasAttacked = false;
      target.readiedThisTurn = true;
      valueChanges[target.id] = {}; // Just log that the effect happened
    }
  });

  if (Object.keys(valueChanges).length > 0) {
    addEffectTriggerAction(state, sourceCardId, "ready", 1, valueChanges);
  }
}

/**
 * スタン効果の処理
 */
export function executeStunEffect(
  state: GameState,
  targets: FieldCard[],
  duration: number,
  sourceCardId: string
): void {
  targets.forEach((target) => {
    const existingStun = target.statusEffects.find((e) => e.type === "stun");
    if (existingStun) {
      existingStun.duration = Math.max(existingStun.duration, duration);
    } else {
      target.statusEffects.push({ type: "stun", duration });
    }
  });
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    valueChanges[target.id] = {};
  });
  addEffectTriggerAction(state, sourceCardId, "stun", duration, valueChanges);
}

/**
 * カードドロー効果の処理
 */
export function executeDrawCardEffect(
  state: GameState,
  targetPlayerId: PlayerId,
  drawCount: number,
  sourceCardId: string
): void {
  const player = state.players[targetPlayerId];

  for (let i = 0; i < drawCount; i++) {
    // 手札上限チェック
    if (player.hand.length >= 7) {
      break;
    }

    // デッキからドロー
    if (player.deck.length > 0) {
      const drawnCard = player.deck.pop()!;
      player.hand.push(drawnCard);
    } else {
      // デッキ切れダメージ
      player.life = Math.max(0, player.life - 1);
    }
  }

  addEffectTriggerAction(state, sourceCardId, "draw_card", drawCount, {
    [targetPlayerId]: {},
  });
}

/**
 * 烙印付与効果の処理
 */
export function executeApplyBrandEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  
  targets.forEach((target) => {
    // 既に烙印を持っている場合は何もしない
    const hasExistingBrand = target.statusEffects.some(e => e.type === 'branded');
    if (!hasExistingBrand) {
      target.statusEffects.push({ type: 'branded' });
      valueChanges[target.id] = {}; // ログ用
    }
  });

  if (Object.keys(valueChanges).length > 0) {
    addEffectTriggerAction(state, sourceCardId, "apply_brand", 1, valueChanges);
  }
}

/**
 * デッキサーチ効果の処理（汎用）
 */
export function executeDeckSearchEffect(
  state: GameState,
  targetPlayerId: PlayerId,
  sourceCardId: string,
  filter?: import("@/types/game").TargetFilter,
  random?: { choice: <T>(array: T[]) => T | undefined }
): void {
  const player = state.players[targetPlayerId];
  
  // 手札上限チェック
  if (player.hand.length >= 7) {
    return;
  }
  
  // デッキからフィルタリング
  let searchTargets = player.deck;
  
  if (filter) {
    searchTargets = player.deck.filter(card => {
      // 新フォーマット対応
      if (filter.card_type && card.type !== filter.card_type) return false;
      if (filter.has_faction && card.faction !== filter.has_faction) return false;
      if (filter.max_cost !== undefined && card.cost > filter.max_cost) return false;
      if (filter.min_cost !== undefined && card.cost < filter.min_cost) return false;
      
      // 既存フォーマット対応（後方互換性）
      if (filter.property && filter.value !== undefined) {
        // @ts-expect-error: filter.property is a dynamic key, but it's safe because CardProperty type ensures it exists on Card.
        if (card[filter.property] !== filter.value) return false;
      }
      
      return true;
    });
  }
  
  if (searchTargets.length === 0) {
    return;
  }
  
  // ランダム選択
  const chosenCard = random ? 
    random.choice(searchTargets) : 
    searchTargets[Math.floor(Math.random() * searchTargets.length)];
    
  if (chosenCard) {
    // デッキから除去
    player.deck = player.deck.filter(c => c.id !== chosenCard.id);
    // 手札に追加
    player.hand.push(chosenCard);
    
    addEffectTriggerAction(state, sourceCardId, "deck_search", 1, {
      [targetPlayerId]: {},
    });
  }
}
