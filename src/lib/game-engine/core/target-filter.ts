/**
 * 統合ターゲットフィルターエンジン
 * 
 * 設計方針:
 * - FilterRule[]による統一フィルタリングシステム
 * - Card[]とFieldCard[]の両方に対応した汎用設計
 * - 新しいフィルター追加時の拡張性を確保
 * - 型安全性とパフォーマンスの両立
 */

import type { FieldCard, Card, Keyword, FilterRule, CardType, Faction } from "@/types/game";
import { hasBrandedStatus } from "../brand-utils";

/**
 * フィルタリング可能なカード属性の共通インターフェース
 */
interface FilterableCard {
  id: string;
  type: CardType;
  faction: Faction;
  cost: number;
  keywords: Keyword[];
  // オプションプロパティでFieldCard特有のプロパティも含める
  currentHealth?: number;
  statusEffects?: Array<{ type: string; [key: string]: unknown }>;
}

/**
 * 統合フィルターエンジン (Card[]とFieldCard[]両対応)
 */
export class UniversalFilterEngine {

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
   * 烙印フィルター評価（FieldCard限定）
   */
  private static evaluateBrandRule<T extends FilterableCard>(target: T, rule: FilterRule): boolean {
    // FieldCardの場合のみ烙印チェック可能
    if ('statusEffects' in target && Array.isArray(target.statusEffects)) {
      const hasBrand = hasBrandedStatus(target as unknown as FieldCard);
      return rule.operator === 'has' ? hasBrand : !hasBrand;
    }
    // Card（デッキ・手札）には烙印概念なし
    return rule.operator === 'not_has';
  }

  /**
   * プロパティフィルター評価（汎用）
   */
  private static evaluatePropertyRule<T extends FilterableCard>(target: T, rule: FilterRule): boolean {
    if (typeof rule.value !== 'object' || rule.value === null || !('property' in rule.value)) {
      return true;
    }
    const propertyRule = rule.value as { property: string; expectedValue: unknown };
    const actualValue = (target as Record<string, unknown>)[propertyRule.property];
    return actualValue === propertyRule.expectedValue;
  }

  /**
   * コストフィルター評価（汎用）
   */
  private static evaluateCostRule<T extends FilterableCard>(target: T, rule: FilterRule): boolean {
    return this.evaluateRangeRule(target.cost, rule);
  }

  /**
   * キーワードフィルター評価（汎用）
   */
  private static evaluateKeywordRule<T extends FilterableCard>(target: T, rule: FilterRule): boolean {
    const hasKeyword = target.keywords.includes(rule.value as Keyword);
    return rule.operator === 'has' ? hasKeyword : !hasKeyword;
  }

  /**
   * 体力フィルター評価（FieldCard限定）
   */
  private static evaluateHealthRule<T extends FilterableCard>(target: T, rule: FilterRule): boolean {
    if ('currentHealth' in target && typeof target.currentHealth === 'number') {
      return this.evaluateRangeRule(target.currentHealth, rule);
    }
    // Card（デッキ・手札）には現在体力なし
    return true;
  }

  /**
   * 自分自身除外フィルター評価（汎用）
   */
  private static evaluateExcludeSelfRule<T extends FilterableCard>(target: T, rule: FilterRule, sourceCardId?: string): boolean {
    return sourceCardId ? target.id !== sourceCardId : true;
  }

  /**
   * カード種別フィルター評価（汎用）
   */
  private static evaluateCardTypeRule<T extends FilterableCard>(target: T, rule: FilterRule): boolean {
    return target.type === rule.value;
  }

  /**
   * 勢力フィルター評価（汎用）
   */
  private static evaluateFactionRule<T extends FilterableCard>(target: T, rule: FilterRule): boolean {
    return target.faction === rule.value;
  }

  /**
   * 評価戦略マップ（汎用型安全なStrategy Pattern）
   */
  private static readonly ruleEvaluators = {
    brand: <T extends FilterableCard>(target: T, rule: FilterRule) => 
      UniversalFilterEngine.evaluateBrandRule(target, rule),
    property: <T extends FilterableCard>(target: T, rule: FilterRule) => 
      UniversalFilterEngine.evaluatePropertyRule(target, rule),
    cost: <T extends FilterableCard>(target: T, rule: FilterRule) => 
      UniversalFilterEngine.evaluateCostRule(target, rule),
    keyword: <T extends FilterableCard>(target: T, rule: FilterRule) => 
      UniversalFilterEngine.evaluateKeywordRule(target, rule),
    health: <T extends FilterableCard>(target: T, rule: FilterRule) => 
      UniversalFilterEngine.evaluateHealthRule(target, rule),
    exclude_self: <T extends FilterableCard>(target: T, rule: FilterRule, sourceCardId?: string) => 
      UniversalFilterEngine.evaluateExcludeSelfRule(target, rule, sourceCardId),
    card_type: <T extends FilterableCard>(target: T, rule: FilterRule) => 
      UniversalFilterEngine.evaluateCardTypeRule(target, rule),
    faction: <T extends FilterableCard>(target: T, rule: FilterRule) => 
      UniversalFilterEngine.evaluateFactionRule(target, rule),
  } as const;

  /**
   * 単一ルールの評価（汎用Strategy Pattern適用済み）
   */
  private static evaluateRule<T extends FilterableCard>(
    target: T,
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
   * 汎用フィルタールール適用（Card[]とFieldCard[]両対応）
   */
  static applyRules<T extends Card | FieldCard>(
    targets: T[],
    rules: FilterRule[],
    sourceCardId?: string
  ): T[] {
    return targets.filter(target =>
      rules.every(rule => this.evaluateRule(target as FilterableCard, rule, sourceCardId))
    );
  }
}

/**
 * 後方互換性のためのエイリアス（段階的移行用）
 */
export class TargetFilterEngine {
  /**
   * @deprecated UniversalFilterEngine.applyRules を使用してください
   */
  static applyRules(
    targets: FieldCard[],
    rules: FilterRule[],
    sourceCardId?: string
  ): FieldCard[] {
    return UniversalFilterEngine.applyRules(targets, rules, sourceCardId) as FieldCard[];
  }
}
