import type { TurnContext, SignificanceRules } from '../types/analysis-types';
import { analyzeDamage } from '../analyzers/damage-analyzer';
import { analyzeConditions } from '../analyzers/condition-analyzer';
import { getCurrentRules } from '../config/significance-rules';

/**
 * ターンの重要性を統合的に判定する（複雑度: 6）
 * @param context ターンコンテキスト
 * @param rules 判定基準ルール（省略時は現在のルールを使用）
 * @returns 重要性メッセージ、または null（重要でない場合）
 */
export function determineTurnSignificance(
  context: TurnContext,
  rules: SignificanceRules = getCurrentRules()
): string | null {
  const damageAnalysis = analyzeDamage(
    context.player1Damage, 
    context.player2Damage, 
    rules
  );
  
  const conditionAnalysis = analyzeConditions(context, rules);

  // 優先度順で判定
  if (damageAnalysis.damageCategory === 'heavy') {
    return '大ダメージターン';
  }
  
  if (damageAnalysis.damageCategory === 'medium') {
    return '中ダメージターン';
  }
  
  if (conditionAnalysis.hasPlayerAttack && conditionAnalysis.isEarlyGame) {
    return '初回プレイヤー攻撃';
  }
  
  if (conditionAnalysis.hasCriticalLife) {
    return '危険ライフ';
  }
  
  if (conditionAnalysis.isEndgamePhase && damageAnalysis.damageCategory === 'light') {
    return '攻勢転換点';
  }

  return null;
}
