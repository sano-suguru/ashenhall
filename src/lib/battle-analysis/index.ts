/**
 * Battle Analysis Module - 戦闘分析システム
 * 
 * 複雑度を抑制し、保守性を重視した設計
 * 各分析機能は独立してテスト・調整可能
 */

// 型定義
export type {
  DamageAnalysis,
  ConditionAnalysis,
  TurnContext,
  SignificanceRules,
} from './types/analysis-types';

// 設定
export {
  DEFAULT_SIGNIFICANCE_RULES,
  getCurrentRules,
} from './config/significance-rules';

// 分析器
export { analyzeDamage } from './analyzers/damage-analyzer';
export { analyzeConditions } from './analyzers/condition-analyzer';

// コア機能
export { determineTurnSignificance } from './core/significance-detector';
