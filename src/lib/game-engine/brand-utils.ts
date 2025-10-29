/**
 * 烙印システム ユーティリティ関数
 *
 * 設計方針:
 * - 烙印状態の判定・カウント機能を提供
 * - 他のシステムから再利用可能な関数として実装
 * - 型安全性を保ちつつシンプルなAPI
 */

import type { FieldCard, GameState, PlayerId } from '@/types/game';

/**
 * クリーチャーが烙印を持っているかチェック
 */
export function hasBrandedStatus(creature: FieldCard): boolean {
  return creature.statusEffects.some((effect) => effect.type === 'branded');
}

/**
 * 指定されたクリーチャー配列の中で烙印を持つ数をカウント
 */
export function getBrandedCreatureCount(creatures: FieldCard[]): number {
  return creatures.filter(hasBrandedStatus).length;
}

/**
 * 烙印を持つ敵クリーチャーの配列を取得
 */
function getBrandedEnemies(state: GameState, playerId: PlayerId): FieldCard[] {
  const opponentId: PlayerId = playerId === 'player1' ? 'player2' : 'player1';
  const opponent = state.players[opponentId];
  return opponent.field.filter(hasBrandedStatus);
}

/**
 * 指定プレイヤーの敵に烙印を持つクリーチャーが存在するかチェック
 */
export function hasAnyBrandedEnemy(state: GameState, playerId: PlayerId): boolean {
  return getBrandedCreatureCount(getBrandedEnemies(state, playerId)) > 0;
}
