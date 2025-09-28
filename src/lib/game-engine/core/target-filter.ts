/**
 * シンプル化されたターゲットフィルターシステム
 * 
 * 設計方針:
 * - 過度な抽象化を排除し、直接的で理解しやすい実装
 * - Card[]とFieldCard[]の両方に対応
 * - ジェネリクスを最小限に抑え、可読性を重視
 */

import type { FieldCard, Card, Keyword, FilterRule } from "@/types/game";
import { hasBrandedStatus } from "../brand-utils";

// === Strategy Pattern: ルールタイプ別評価関数群（複雑度削減）===

/**
 * 烙印ルール評価（複雑度: 4）
 */
function evaluateBrandRule(target: Card | FieldCard, rule: FilterRule): boolean {
  // FieldCardの場合のみ烙印チェック可能
  if ('statusEffects' in target && Array.isArray(target.statusEffects)) {
    const hasBrand = hasBrandedStatus(target as FieldCard);
    return rule.operator === 'has' ? hasBrand : !hasBrand;
  }
  // Card（デッキ・手札）には烙印概念なし
  return rule.operator === 'not_has';
}

/**
 * プロパティルール評価（複雑度: 3）
 */
function evaluatePropertyRule(target: Card | FieldCard, rule: FilterRule): boolean {
  if (typeof rule.value !== 'object' || rule.value === null || !('property' in rule.value)) {
    return true;
  }
  const propertyRule = rule.value as { property: string; expectedValue: unknown };
  const actualValue = (target as unknown as Record<string, unknown>)[propertyRule.property];
  return actualValue === propertyRule.expectedValue;
}

/**
 * コストルール評価（複雑度: 4）
 */
function evaluateCostRule(target: Card | FieldCard, rule: FilterRule): boolean {
  if (rule.operator === 'range') {
    const minOk = rule.minValue === undefined || target.cost >= rule.minValue;
    const maxOk = rule.maxValue === undefined || target.cost <= rule.maxValue;
    return minOk && maxOk;
  }
  return rule.operator === 'eq' ? target.cost === rule.value : target.cost !== rule.value;
}

/**
 * キーワードルール評価（複雑度: 2）
 */
function evaluateKeywordRule(target: Card | FieldCard, rule: FilterRule): boolean {
  const hasKeyword = target.keywords.includes(rule.value as Keyword);
  return rule.operator === 'has' ? hasKeyword : !hasKeyword;
}

/**
 * 体力ルール評価（複雑度: 5）
 */
function evaluateHealthRule(target: Card | FieldCard, rule: FilterRule): boolean {
  // FieldCardの場合のみ体力チェック可能
  if ('currentHealth' in target && typeof target.currentHealth === 'number') {
    if (rule.operator === 'range') {
      const minOk = rule.minValue === undefined || target.currentHealth >= rule.minValue;
      const maxOk = rule.maxValue === undefined || target.currentHealth <= rule.maxValue;
      return minOk && maxOk;
    }
    return rule.operator === 'eq' ? target.currentHealth === rule.value : target.currentHealth !== rule.value;
  }
  // Card（デッキ・手札）には現在体力なし
  return true;
}

/**
 * 自己除外ルール評価（複雑度: 1）
 */
function evaluateExcludeSelfRule(target: Card | FieldCard, rule: FilterRule, sourceCardId?: string): boolean {
  return sourceCardId ? target.templateId !== sourceCardId : true;
}

/**
 * カード種別ルール評価（複雑度: 1）
 */
function evaluateCardTypeRule(target: Card | FieldCard, rule: FilterRule): boolean {
  return target.type === rule.value;
}

/**
 * 勢力ルール評価（複雑度: 1）
 */
function evaluateFactionRule(target: Card | FieldCard, rule: FilterRule): boolean {
  return target.faction === rule.value;
}

// Factory Pattern: ルールタイプ→評価関数マッピング
const ruleEvaluators: Record<FilterRule['type'], (target: Card | FieldCard, rule: FilterRule, sourceCardId?: string) => boolean> = {
  brand: evaluateBrandRule,
  property: evaluatePropertyRule,
  cost: evaluateCostRule,
  keyword: evaluateKeywordRule,
  health: evaluateHealthRule,
  exclude_self: evaluateExcludeSelfRule,
  card_type: evaluateCardTypeRule,
  faction: evaluateFactionRule,
};

/**
 * 単一のフィルタールールを評価（複雑度: 4）
 */
function evaluateFilterRule(
  target: Card | FieldCard,
  rule: FilterRule,
  sourceCardId?: string
): boolean {
  try {
    const evaluator = ruleEvaluators[rule.type];
    if (!evaluator) {
      console.warn(`Unknown filter rule type: ${rule.type}`);
      return true;
    }
    return evaluator(target, rule, sourceCardId);
  } catch (error) {
    console.error(`Error evaluating filter rule:`, error);
    return true;
  }
}

/**
 * フィルタールールを適用してターゲットをフィルタリング
 */
export function filterTargets<T extends Card | FieldCard>(
  targets: T[],
  rules: FilterRule[],
  sourceCardId?: string
): T[] {
  return targets.filter(target =>
    rules.every(rule => evaluateFilterRule(target, rule, sourceCardId))
  );
}

/**
 * 後方互換性のためのエイリアス（段階的移行用）
 * @deprecated filterTargets を使用してください
 */
export class UniversalFilterEngine {
  static applyRules<T extends Card | FieldCard>(
    targets: T[],
    rules: FilterRule[],
    sourceCardId?: string
  ): T[] {
    return filterTargets(targets, rules, sourceCardId);
  }
}

/**
 * 後方互換性のためのエイリアス（段階的移行用）
 * @deprecated filterTargets を使用してください
 */
export class TargetFilterEngine {
  static applyRules(
    targets: FieldCard[],
    rules: FilterRule[],
    sourceCardId?: string
  ): FieldCard[] {
    return filterTargets(targets, rules, sourceCardId) as FieldCard[];
  }
}
