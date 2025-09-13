import type { ConditionAnalysis, TurnContext, SignificanceRules } from '../types/analysis-types';

/**
 * 特殊条件分析を行う（複雑度: 5）
 * @param context ターンコンテキスト
 * @param rules 判定基準ルール
 * @returns 条件分析結果
 */
export function analyzeConditions(context: TurnContext, rules: SignificanceRules): ConditionAnalysis {
  const hasPlayerAttack = context.actions.some(action => 
    action.type === 'card_attack' && 
    (action.data.targetId === 'player1' || action.data.targetId === 'player2')
  );
  
  const isEarlyGame = context.turnNumber <= rules.turnThresholds.earlyGame;
  const isEndgamePhase = context.turnNumber >= rules.turnThresholds.endGame;
  
  const hasCriticalLife = 
    context.player1LifeAfter <= rules.lifeThresholds.critical ||
    context.player2LifeAfter <= rules.lifeThresholds.critical;

  return {
    hasPlayerAttack,
    isEarlyGame,
    hasCriticalLife,
    isEndgamePhase,
  };
}
