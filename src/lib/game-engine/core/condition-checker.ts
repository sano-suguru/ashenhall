/**
 * 効果発動条件の判定ロジック
 * 
 * 設計方針:
 * - 条件判定の責任のみを持つ
 * - ゲーム状態を変更しない（純粋関数）
 * - 各種条件を明確に分離して判定
 */

import type { 
  GameState, 
  PlayerId, 
  EffectCondition 
} from "@/types/game";
import { 
  getBrandedCreatureCount,
  hasAnyBrandedEnemy 
} from "../brand-utils";

/**
 * 効果の発動条件を判定する
 * @param state ゲーム状態
 * @param sourcePlayerId 効果の発動者
 * @param condition 発動条件（undefinedの場合は常にtrue）
 * @returns 条件を満たしているかどうか
 */
export function checkEffectCondition(
  state: GameState,
  sourcePlayerId: PlayerId,
  condition: EffectCondition | undefined
): boolean {
  if (!condition) {
    return true; // 条件がなければ常にtrue
  }

  const subjectValue = getSubjectValue(state, sourcePlayerId, condition.subject);
  const compareValue = getCompareValue(state, sourcePlayerId, condition.value);
  
  return evaluateCondition(subjectValue, condition.operator, compareValue);
}

/**
 * 条件の主体となる値を取得する
 */
function getSubjectValue(
  state: GameState,
  sourcePlayerId: PlayerId,
  subject: EffectCondition['subject']
): number {
  const player = state.players[sourcePlayerId];
  const opponent = state.players[sourcePlayerId === "player1" ? "player2" : "player1"];

  switch (subject) {
    case "graveyard":
      return player.graveyard.length;
    
    case "allyCount":
      return player.field.length;
    
    case "playerLife":
      return player.life;
    
    case "opponentLife":
      return opponent.life;
    
    case "brandedEnemyCount":
      return getBrandedCreatureCount(opponent.field);
    
    case "hasBrandedEnemy":
      return hasAnyBrandedEnemy(state, sourcePlayerId) ? 1 : 0;
    
    default:
      console.warn(`Unknown condition subject: ${subject}`);
      return 0;
  }
}

/**
 * 比較対象の値を取得する
 */
function getCompareValue(
  state: GameState,
  sourcePlayerId: PlayerId,
  value: EffectCondition['value']
): number {
  if (value === "opponentLife") {
    const opponent = state.players[sourcePlayerId === "player1" ? "player2" : "player1"];
    return opponent.life;
  }
  
  return value as number;
}

/**
 * 条件演算子に基づいて値を比較する
 */
function evaluateCondition(
  subjectValue: number,
  operator: EffectCondition['operator'],
  compareValue: number
): boolean {
  switch (operator) {
    case "gte":
      return subjectValue >= compareValue;
    
    case "lte":
      return subjectValue <= compareValue;
    
    case "lt":
      return subjectValue < compareValue;
    
    case "gt":
      return subjectValue > compareValue;
    
    case "eq":
      return subjectValue === compareValue;
    
    default:
      console.warn(`Unknown condition operator: ${operator}`);
      return true; // 不明な operator は true
  }
}

/**
 * 複数の条件をすべて満たすかどうかを判定する
 * @param state ゲーム状態
 * @param sourcePlayerId 効果の発動者
 * @param conditions 条件のリスト
 * @returns すべての条件を満たしているかどうか
 */
export function checkAllConditions(
  state: GameState,
  sourcePlayerId: PlayerId,
  conditions: (EffectCondition | undefined)[]
): boolean {
  return conditions.every(condition => 
    checkEffectCondition(state, sourcePlayerId, condition)
  );
}

/**
 * 複数の条件のうち少なくとも一つを満たすかどうかを判定する
 * @param state ゲーム状態
 * @param sourcePlayerId 効果の発動者
 * @param conditions 条件のリスト
 * @returns 少なくとも一つの条件を満たしているかどうか
 */
export function checkAnyCondition(
  state: GameState,
  sourcePlayerId: PlayerId,
  conditions: (EffectCondition | undefined)[]
): boolean {
  return conditions.some(condition => 
    checkEffectCondition(state, sourcePlayerId, condition)
  );
}
