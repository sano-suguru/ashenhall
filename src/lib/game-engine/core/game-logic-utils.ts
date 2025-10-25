/**
 * ゲームロジックユーティリティ - 統合版
 * 
 * 設計方針:
 * - 効果発動条件の判定ロジック
 * - 効果の対象選択ロジック
 * - ゲーム状態を変更しない（純粋関数）
 * - 決定論的な処理（同条件なら同結果）
 * 
 * 統合内容:
 * - condition-checker.ts: checkEffectCondition, checkAllConditions
 * - target-selector.ts: selectTargets
 */

import type { 
  GameState, 
  PlayerId, 
  EffectCondition,
  FieldCard,
  EffectTarget
} from "@/types/game";
import { SeededRandom } from "../seeded-random";
import { 
  getBrandedCreatureCount,
  hasAnyBrandedEnemy 
} from "../brand-utils";

// =============================================================================
// CONDITION CHECKING (from condition-checker.ts)
// =============================================================================

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
    
    case "enemyCreatureCount":
      return opponent.field.length;
    
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

// =============================================================================
// TARGET SELECTION (from target-selector.ts)
// =============================================================================

/**
 * 効果の対象を選択する
 * @param state ゲーム状態
 * @param sourcePlayerId 効果の発動者
 * @param targetType 対象タイプ
 * @param random 決定論的乱数生成器
 * @returns 選択された対象のリスト
 */
export function selectTargets(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetType: EffectTarget,
  random: SeededRandom
): FieldCard[] {
  const sourcePlayer = state.players[sourcePlayerId];
  const opponentId: PlayerId =
    sourcePlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];

  switch (targetType) {
    case "self":
      // 効果発動者自身は特別処理が必要（場にいない可能性）
      return [];

    case "ally_all":
      return [...sourcePlayer.field].filter((card) => card.currentHealth > 0);

    case "enemy_all":
      return [...opponent.field].filter(
        (card) => card.currentHealth > 0 && !card.keywords.includes('untargetable')
      );

    case "ally_random":
      const allyTargets = sourcePlayer.field.filter(
        (card) => card.currentHealth > 0
      );
      const randomAlly = random.choice(allyTargets);
      return randomAlly ? [randomAlly] : [];

    case "enemy_random":
      const enemyTargets = opponent.field.filter(
        (card) => card.currentHealth > 0 && !card.keywords.includes('untargetable')
      );
      const randomEnemy = random.choice(enemyTargets);
      return randomEnemy ? [randomEnemy] : [];

    case "player":
      // プレイヤー対象は別処理
      return [];

    default:
      return [];
  }
}
