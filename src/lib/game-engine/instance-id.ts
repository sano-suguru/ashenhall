/**
 * FieldCardインスタンス一意ID生成システム
 * 
 * 設計方針:
 * - 決定論的ID生成（同条件なら常に同結果）
 * - マスターカードIDとの互換性維持
 * - シード乱数に依存しない一意性確保
 */

import type { PlayerId } from '@/types/game';

/**
 * FieldCard用の一意インスタンスIDを生成
 * 
 * フォーマット: {masterCardId}@{playerId}:T{turnNumber}:P{position}
 * 例: "necro_skeleton@player1:T3:P1"
 * 
 * @param masterCardId - マスターカードのID（元のcard.id）
 * @param playerId - カードの所有者
 * @param turnNumber - 召喚されたターン番号
 * @param position - 場での配置位置
 * @returns 一意のインスタンスID
 */
export function generateFieldCardInstanceId(
  masterCardId: string,
  playerId: PlayerId,
  turnNumber: number,
  position: number
): string {
  return `${masterCardId}@${playerId}:T${turnNumber}:P${position}`;
}

/**
 * インスタンスIDからマスターカードIDを抽出
 * 
 * @param instanceId - インスタンスID
 * @returns マスターカードID、または不正なフォーマットの場合はinstanceIdをそのまま返す
 */
export function extractMasterCardId(instanceId: string): string {
  const atIndex = instanceId.indexOf('@');
  if (atIndex === -1) {
    // 旧フォーマット（マスターカードIDそのまま）
    return instanceId;
  }
  return instanceId.substring(0, atIndex);
}

/**
 * IDがインスタンスIDかどうかを判定
 * 
 * @param id - 判定対象のID
 * @returns インスタンスIDの場合true
 */
export function isInstanceId(id: string): boolean {
  return id.includes('@') && id.includes(':T') && id.includes(':P');
}

/**
 * インスタンスIDの情報を分解
 * 
 * @param instanceId - インスタンスID
 * @returns 分解された情報、または不正なフォーマットの場合はnull
 */
export function parseInstanceId(instanceId: string): {
  masterCardId: string;
  playerId: PlayerId;
  turnNumber: number;
  position: number;
} | null {
  if (!isInstanceId(instanceId)) {
    return null;
  }

  try {
    const [masterCardId, rest] = instanceId.split('@');
    const [playerPart, turnPart, positionPart] = rest.split(':');
    
    const playerId = playerPart as PlayerId;
    const turnNumber = parseInt(turnPart.substring(1)); // 'T'を除去
    const position = parseInt(positionPart.substring(1)); // 'P'を除去

    if (isNaN(turnNumber) || isNaN(position)) {
      return null;
    }

    return {
      masterCardId,
      playerId,
      turnNumber,
      position,
    };
  } catch {
    return null;
  }
}
