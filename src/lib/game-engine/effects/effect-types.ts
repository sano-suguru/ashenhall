/**
 * Effect Executor 共通型定義
 * 
 * 設計方針:
 * - Effect Executor間で共有する型・インターフェース
 * - ログ機能の統一的な提供
 * - 決定論的な処理のためのユーティリティ
 */

import type {
  GameState,
  Card,
  FieldCard,
  PlayerId,
  EffectAction,
  ValueChange,
} from "@/types/game";
import { SeededRandom } from "../seeded-random";
import {
  addEffectTriggerAction as addEffectTriggerActionFromLogger,
} from "../action-logger";

/**
 * Effect Executor基底インターフェース
 */
export interface EffectExecutorContext {
  state: GameState;
  sourceCard: Card;
  sourcePlayerId: PlayerId;
  random: SeededRandom;
  targets: FieldCard[];
  value: number;
}

/**
 * 効果ログを追加のヘルパー関数
 * 全Effect Executorで共通使用
 */
export function addEffectTriggerAction(
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
export function createValueChange(before: number, after: number): { before: number; after: number } {
  return { before, after };
}
