/**
 * エフェクト共通ユーティリティ
 *
 * 設計方針:
 * - 複数のエフェクト実行モジュールで共有される汎用ヘルパー関数
 * - DRY原則に基づき、重複コードを一元管理
 * - 型安全性を保ちつつシンプルなAPI
 */

import type { GameState, PlayerId, ValueChange, EffectAction } from '@/types/game';
import { addEffectTriggerAction as addEffectTriggerActionFromLogger } from './action-logger';

/**
 * 効果ログを追加のヘルパー関数
 * 全Effect Executorで共通使用
 *
 * @param state ゲーム状態
 * @param sourceCardId 効果の発生源カードID
 * @param effectType 効果タイプ
 * @param effectValue 効果の値（ダメージ量、回復量など）
 * @param targets 対象とその変化量の記録
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
 *
 * @param playerId 現在のプレイヤーID
 * @returns 相手プレイヤーのID
 */
export function getOpponentId(playerId: PlayerId): PlayerId {
  return playerId === 'player1' ? 'player2' : 'player1';
}

/**
 * 値変化記録のヘルパー
 * ログ記録用の before/after 構造を生成
 *
 * @param before 変化前の値
 * @param after 変化後の値
 * @returns ValueChange構造の一部
 */
export function createValueChange(
  before: number,
  after: number
): { before: number; after: number } {
  return { before, after };
}
