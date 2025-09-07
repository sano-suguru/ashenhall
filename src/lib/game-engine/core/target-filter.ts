/**
 * 統合ターゲットフィルターエンジン
 * 
 * 設計方針:
 * - 個別フィルター関数を統一インターフェースで統合
 * - 新しいフィルター追加時の拡張性を確保  
 * - 既存コードとの後方互換性を維持
 */

import type { FieldCard, TargetFilter, Keyword } from "@/types/game";
import { hasBrandedStatus } from "../brand-utils";

/**
 * フィルタールールの種類
 */
type FilterRuleType = 
  | 'brand'      // 烙印状態
  | 'property'   // カードプロパティ  
  | 'cost'       // コスト範囲
  | 'keyword'    // キーワード所持
  | 'health'     // 体力範囲
  | 'exclude_self'; // 自分自身除外

/**
 * フィルタールール評価インターフェース
 */
interface FilterRule {
  type: FilterRuleType;
  operator: 'eq' | 'gte' | 'lte' | 'has' | 'not_has' | 'range';
  value?: string | number | boolean | Keyword | { property: string; expectedValue: unknown };
  minValue?: number;
  maxValue?: number;
}

/**
 * 統合ターゲットフィルターエンジン
 */
export class TargetFilterEngine {
  /**
   * TargetFilterから統一フィルタールールに変換
   */
  private static convertLegacyFilter(filter: TargetFilter): FilterRule[] {
    const rules: FilterRule[] = [];

    // 烙印フィルター
    if (filter.hasBrand !== undefined) {
      rules.push({
        type: 'brand',
        operator: filter.hasBrand ? 'has' : 'not_has'
      });
    }

    // プロパティフィルター  
    if (filter.property && filter.value !== undefined) {
      rules.push({
        type: 'property',
        operator: 'eq',
        value: { property: filter.property, expectedValue: filter.value }
      });
    }

    // コストフィルター
    if (filter.min_cost !== undefined || filter.max_cost !== undefined) {
      rules.push({
        type: 'cost',
        operator: 'range',
        minValue: filter.min_cost,
        maxValue: filter.max_cost
      });
    }

    // キーワードフィルター
    if (filter.has_keyword) {
      rules.push({
        type: 'keyword',
        operator: 'has',
        value: filter.has_keyword
      });
    }

    // 体力フィルター
    if (filter.min_health !== undefined || filter.max_health !== undefined) {
      rules.push({
        type: 'health',
        operator: 'range',
        minValue: filter.min_health,
        maxValue: filter.max_health
      });
    }

    // 自分自身除外フィルター
    if (filter.exclude_self) {
      rules.push({
        type: 'exclude_self',
        operator: 'eq',
        value: true
      });
    }

    return rules;
  }

  /**
   * 範囲チェック共通ロジック（cost/health共通）
   */
  private static evaluateRangeRule(value: number, rule: FilterRule): boolean {
    if (rule.operator === 'range') {
      const minOk = rule.minValue === undefined || value >= rule.minValue;
      const maxOk = rule.maxValue === undefined || value <= rule.maxValue;
      return minOk && maxOk;
    }
    return rule.operator === 'eq' ? value === rule.value : value !== rule.value;
  }

  /**
   * 烙印フィルター評価
   */
  private static evaluateBrandRule(target: FieldCard, rule: FilterRule): boolean {
    const hasBrand = hasBrandedStatus(target);
    return rule.operator === 'has' ? hasBrand : !hasBrand;
  }

  /**
   * プロパティフィルター評価
   */
  private static evaluatePropertyRule(target: FieldCard, rule: FilterRule): boolean {
    if (typeof rule.value !== 'object' || rule.value === null || !('property' in rule.value)) {
      return true;
    }
    const propertyRule = rule.value as { property: string; expectedValue: unknown };
    const actualValue = target[propertyRule.property as keyof FieldCard];
    return actualValue === propertyRule.expectedValue;
  }

  /**
   * コストフィルター評価
   */
  private static evaluateCostRule(target: FieldCard, rule: FilterRule): boolean {
    return this.evaluateRangeRule(target.cost, rule);
  }

  /**
   * キーワードフィルター評価
   */
  private static evaluateKeywordRule(target: FieldCard, rule: FilterRule): boolean {
    const hasKeyword = target.keywords.includes(rule.value as Keyword);
    return rule.operator === 'has' ? hasKeyword : !hasKeyword;
  }

  /**
   * 体力フィルター評価
   */
  private static evaluateHealthRule(target: FieldCard, rule: FilterRule): boolean {
    return this.evaluateRangeRule(target.currentHealth, rule);
  }

  /**
   * 自分自身除外フィルター評価
   */
  private static evaluateExcludeSelfRule(target: FieldCard, rule: FilterRule, sourceCardId?: string): boolean {
    return sourceCardId ? target.id !== sourceCardId : true;
  }

  /**
   * 評価戦略マップ（型安全なStrategy Pattern）
   */
  private static readonly ruleEvaluators = {
    brand: (target: FieldCard, rule: FilterRule) => 
      TargetFilterEngine.evaluateBrandRule(target, rule),
    property: (target: FieldCard, rule: FilterRule) => 
      TargetFilterEngine.evaluatePropertyRule(target, rule),
    cost: (target: FieldCard, rule: FilterRule) => 
      TargetFilterEngine.evaluateCostRule(target, rule),
    keyword: (target: FieldCard, rule: FilterRule) => 
      TargetFilterEngine.evaluateKeywordRule(target, rule),
    health: (target: FieldCard, rule: FilterRule) => 
      TargetFilterEngine.evaluateHealthRule(target, rule),
    exclude_self: (target: FieldCard, rule: FilterRule, sourceCardId?: string) => 
      TargetFilterEngine.evaluateExcludeSelfRule(target, rule, sourceCardId),
  } as const;

  /**
   * 単一ルールの評価（Strategy Pattern適用済み）
   */
  private static evaluateRule(
    target: FieldCard,
    rule: FilterRule,
    sourceCardId?: string
  ): boolean {
    try {
      // exclude_selfの場合は直接呼び出し（型安全）
      if (rule.type === 'exclude_self') {
        return this.ruleEvaluators.exclude_self(target, rule, sourceCardId);
      }
      
      // その他のevaluatorは2パラメータで呼び出し
      const evaluator = this.ruleEvaluators[rule.type];
      if (!evaluator) {
        console.warn(`Unknown filter rule type: ${rule.type}`);
        return true;
      }
      
      return evaluator(target, rule);
    } catch (error) {
      console.error(`Error evaluating filter rule:`, error);
      return true;
    }
  }

  /**
   * 統合フィルター適用（新しいインターフェース）
   */
  static applyRules(
    targets: FieldCard[],
    rules: FilterRule[],
    sourceCardId?: string
  ): FieldCard[] {
    return targets.filter(target =>
      rules.every(rule => this.evaluateRule(target, rule, sourceCardId))
    );
  }

  /**
   * レガシーTargetFilter適用（後方互換性）
   */
  static applyLegacyFilter(
    targets: FieldCard[],
    filter: TargetFilter,
    sourceCardId?: string
  ): FieldCard[] {
    const rules = this.convertLegacyFilter(filter);
    return this.applyRules(targets, rules, sourceCardId);
  }

  /**
   * 複数フィルター条件の統合適用
   */
  static applyMultipleFilters(
    targets: FieldCard[],
    filters: TargetFilter[],
    sourceCardId?: string
  ): FieldCard[] {
    return filters.reduce((filteredTargets, filter) => {
      return this.applyLegacyFilter(filteredTargets, filter, sourceCardId);
    }, targets);
  }
}

/**
 * 既存コードとの互換性を保つヘルパー関数
 */
export function applyCardTargetFilter(
  targets: FieldCard[],
  filter: TargetFilter,
  sourceCardId?: string
): FieldCard[] {
  return TargetFilterEngine.applyLegacyFilter(targets, filter, sourceCardId);
}
