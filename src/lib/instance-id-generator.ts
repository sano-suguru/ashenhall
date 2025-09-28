/**
 * インスタンスID生成システム
 * 
 * 設計方針:
 * - 同一カード複数枚の個別識別
 * - 決定論的生成（テスト・デバッグ用）
 * - templateIdとinstanceIdの役割分離
 */

import type { GameState, PlayerId } from '@/types/game';

/**
 * インスタンスIDを生成（完全決定論的）
 * 
 * @param templateId カードテンプレートID（例：'necro_skeleton'）
 * @param state ゲーム状態（決定論的生成用）
 * @param sourceId 生成元識別子（デバッグ用、オプション）
 * @returns 一意のインスタンスID
 */
export function generateInstanceId(
  templateId: string,
  state: GameState,
  sourceId?: string
): string {
  // 完全決定論的要素のみを使用
  const turn = state.turnNumber;
  const sequence = state.actionLog.length;
  
  if (sourceId) {
    return `${templateId}-inst-${turn}-${sequence}-${sourceId}`;
  }
  
  return `${templateId}-inst-${turn}-${sequence}`;
}

/**
 * ゲーム開始時の決定論的ID生成（デッキ専用）
 */
export function generateDeckInstanceId(
  templateId: string,
  deckIndex: number,
  cardCount: number
): string {
  return `${templateId}-deck-${deckIndex}-${cardCount}`;
}

/**
 * 特定プレイヤーのフィールドでの次のインスタンスIDを生成
 */
export function generateFieldInstanceId(
  templateId: string,
  state: GameState,
  playerId: PlayerId
): string {
  const player = state.players[playerId];
  const existingCount = player.field.filter(c => c.templateId === templateId).length;
  
  return generateInstanceId(templateId, state, `${playerId}-field-${existingCount}`);
}

/**
 * トークン専用のインスタンスID生成
 */
export function generateTokenInstanceId(
  state: GameState,
  playerId: PlayerId,
  tokenName?: string
): string {
  const tokenId = tokenName || 'token';
  return generateInstanceId(tokenId, state, `${playerId}-token`);
}
