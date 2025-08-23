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
