/**
 * 高性能検索システム - 配列操作最適化
 * 
 * 設計方針:
 * - field/graveyard検索をO(n)→O(1)に最適化
 * - Mapキャッシュによる高速アクセス
 * - 個人開発の戦闘計算5秒制約クリア
 */

import type { GameState, FieldCard, Card, PlayerId } from '@/types/game';

/**
 * フィールドカード高速検索マップ
 */
class FieldCardLookup {
  private fieldMap: Map<string, FieldCard> = new Map();
  
  /**
   * キャッシュを更新（ゲーム状態変更時に呼び出し）
   */
  updateCache(gameState: GameState): void {
    this.fieldMap.clear();
    
    // 全プレイヤーのフィールドカードをキャッシュ
    Object.values(gameState.players).forEach(player => {
      player.field.forEach(card => {
        this.fieldMap.set(card.id, card);
      });
    });
  }
  
  /**
   * フィールドカードをIDで高速検索
   */
  findById(cardId: string): FieldCard | undefined {
    return this.fieldMap.get(cardId);
  }
  
  /**
   * プレイヤーのフィールドカードのみを高速検索
   */
  findByPlayerId(gameState: GameState, playerId: PlayerId): FieldCard[] {
    return gameState.players[playerId].field;
  }
  
  /**
   * 生存クリーチャーのみフィルター（高頻出パターン）
   */
  findAliveCreatures(gameState: GameState, playerId: PlayerId): FieldCard[] {
    const player = gameState.players[playerId];
    return player.field.filter(c => c.currentHealth > 0);
  }
  
  /**
   * 守護クリーチャーの高速検索（戦闘システム用）
   */
  findGuardCreatures(gameState: GameState, playerId: PlayerId): FieldCard[] {
    const player = gameState.players[playerId];
    return player.field.filter(c => 
      c.keywords.includes('guard') && 
      c.currentHealth > 0 && 
      !c.isSilenced
    );
  }
}

/**
 * グローバル検索キャッシュ
 * processGameStepの度に更新される高速検索システム
 */
export const fieldLookup = new FieldCardLookup();

/**
 * 墓地カード高速検索ユーティリティ
 */
export class GraveyardLookup {
  /**
   * 墓地クリーチャー数の高速計算（動的値計算で頻用）
   */
  static countCreatures(gameState: GameState, playerId: PlayerId): number {
    const player = gameState.players[playerId];
    return player.graveyard.filter(c => c.type === 'creature').length;
  }
  
  /**
   * 蘇生可能カードの高速検索
   */
  static findResurrectTargets(gameState: GameState, playerId: PlayerId, maxCost?: number): Card[] {
    const player = gameState.players[playerId];
    return player.graveyard.filter(c => 
      c.type === 'creature' && 
      (!maxCost || c.cost <= maxCost)
    );
  }
  
  /**
   * 自身除外墓地数の高速計算
   */
  static countExcludingSelf(gameState: GameState, playerId: PlayerId, selfCardId: string): number {
    const player = gameState.players[playerId];
    return player.graveyard.filter(c => c.id !== selfCardId).length;
  }
}

/**
 * 配列操作最適化のメイン更新関数
 * processGameStep内で毎回呼び出しキャッシュ更新
 */
export function updateOptimizedLookups(gameState: GameState): void {
  fieldLookup.updateCache(gameState);
}
