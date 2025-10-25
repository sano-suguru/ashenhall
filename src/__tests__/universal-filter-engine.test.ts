/**
 * filterTargets ユーティリティ テスト
 * 
 * Card[]とFieldCard[]両対応の汎用フィルターエンジンをテスト
 * ESLint複雑度削減修正の安全性を保証
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { filterTargets } from "@/lib/game-engine/core/target-filter";
import type { Card, FieldCard, FilterRule, Keyword } from "@/types/game";

describe("filterTargets - Card[]とFieldCard[]両対応テスト", () => {
  let mockCard: Card;
  let mockFieldCard: FieldCard;
  let consoleSpy: {
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };
  
  beforeEach(() => {
    // コンソール出力をモック（クリーンなテスト出力のため）
    consoleSpy = {
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
    // テスト用Card (デッキ・手札用)
    mockCard = {
      templateId: "test-card-deck",
      instanceId: "test-card-deck-instance",
      name: "テストカード",
      faction: "mage",
      type: "creature",
      cost: 3,
      attack: 2,
      health: 4,
      keywords: ["guard", "lifesteal"] as Keyword[],
      effects: [],
    };

    // テスト用FieldCard (場用)
    mockFieldCard = {
      templateId: "test-card-field",
      instanceId: "test-card-field-instance",
      name: "テストフィールドカード",
      faction: "knight",
      type: "creature",
      cost: 2,
      attack: 3,
      health: 3,
      currentHealth: 3,
      keywords: ["rush"] as Keyword[],
      effects: [],
      owner: "player1",
      attackModifier: 0,
      healthModifier: 0,
      passiveAttackModifier: 0,
      passiveHealthModifier: 0,
      summonTurn: 1,
      position: 0,
      hasAttacked: false,
      isStealthed: false,
      isSilenced: false,
      statusEffects: [],
      readiedThisTurn: false,
    };
  });

  afterEach(() => {
    // コンソールモックの復元
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("Card[]フィルタリング (デッキ・手札用)", () => {
    it("コストフィルターがCard[]で正しく動作する", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [{ type: 'cost', operator: 'range', minValue: 2, maxValue: 4 }];

      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1);
      expect(result[0].templateId).toBe("test-card-deck");
    });

    it("勢力フィルターがCard[]で正しく動作する", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'mage' }];

      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'berserker' }];
      const result2 = filterTargets(cards, rules2);
      expect(result2).toHaveLength(0);
    });

    it("カード種別フィルターがCard[]で正しく動作する", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [{ type: 'card_type', operator: 'eq', value: 'creature' }];

      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'card_type', operator: 'eq', value: 'spell' }];
      const result2 = filterTargets(cards, rules2);
      expect(result2).toHaveLength(0);
    });

    it("キーワードフィルターがCard[]で正しく動作する", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [{ type: 'keyword', operator: 'has', value: 'guard' }];

      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'keyword', operator: 'has', value: 'rush' }];
      const result2 = filterTargets(cards, rules2);
      expect(result2).toHaveLength(0);
    });

    it("自分除外フィルターがCard[]で正しく動作する", () => {
      const card2 = { ...mockCard, templateId: "other-card" };
      const cards = [mockCard, card2];
      const rules: FilterRule[] = [{ type: 'exclude_self', operator: 'eq', value: true }];

      const result = filterTargets(cards, rules, "test-card-deck");
      expect(result).toHaveLength(1);
      expect(result[0].templateId).toBe("other-card");
    });

    it("複数フィルターの組み合わせがCard[]で正しく動作する", () => {
      const card2 = {
        ...mockCard,
        templateId: "expensive-spell",
        type: "spell" as const,
        cost: 5,
        keywords: ["rush"] as Keyword[],
      };
      const cards = [mockCard, card2];

      const rules: FilterRule[] = [
        { type: 'card_type', operator: 'eq', value: 'creature' },
        { type: 'cost', operator: 'range', minValue: 2, maxValue: 4 },
        { type: 'keyword', operator: 'has', value: 'guard' },
      ];

      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1);
      expect(result[0].templateId).toBe("test-card-deck");
    });
  });

  describe("FieldCard[]フィルタリング (場用)", () => {
    it("体力フィルターがFieldCard[]で正しく動作する", () => {
      const fieldCards = [mockFieldCard];
      const rules: FilterRule[] = [{ type: 'health', operator: 'range', minValue: 2, maxValue: 4 }];

      const result = filterTargets(fieldCards, rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'health', operator: 'range', minValue: 5, maxValue: 7 }];
      const result2 = filterTargets(fieldCards, rules2);
      expect(result2).toHaveLength(0);
    });

    it("烙印フィルターがFieldCard[]で正しく動作する", () => {
      const fieldCards = [mockFieldCard];

      // 烙印なしの状態
      const rules: FilterRule[] = [{ type: 'brand', operator: 'not_has' }];
      let result = filterTargets(fieldCards, rules);
      expect(result).toHaveLength(1);

      // 烙印ありの状態
      mockFieldCard.statusEffects = [{ type: 'branded' }];
      const rules2: FilterRule[] = [{ type: 'brand', operator: 'has' }];
      result = filterTargets(fieldCards, rules2);
      expect(result).toHaveLength(1);
    });

    it("プロパティフィルターがFieldCard[]で正しく動作する", () => {
      const fieldCards = [mockFieldCard];
      const rules: FilterRule[] = [{
        type: 'property',
        operator: 'eq',
        value: { property: 'owner', expectedValue: 'player1' },
      }];

      const result = filterTargets(fieldCards, rules);
      expect(result).toHaveLength(1);
    });
  });

  describe("型安全性とエラーハンドリング", () => {
    it("Card[]で体力フィルターを使用してもエラーにならない", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [{ type: 'health', operator: 'range', minValue: 1, maxValue: 5 }];

      // Card[]には現在体力がないが、エラーにならず適切に処理される
      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1); // 体力フィルターは無視されてtrueになる
    });

    it("Card[]で烙印フィルターを使用してもエラーにならない", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [{ type: 'brand', operator: 'not_has' }];

      // Card[]には烙印概念がないが、エラーにならず適切に処理される
      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1); // 烙印なしとして扱われる
    });

    it("無効なFilterRuleタイプを無視する", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [
        { type: 'cost', operator: 'eq', value: 3 },
        { type: 'invalid_type' as 'cost', operator: 'eq', value: 'test' }
      ];

      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1); // 無効なルールは無視されて正常処理

      // 警告が正しく呼び出されたかを検証（ターミナルには出力されない）
      expect(consoleSpy.warn).toHaveBeenCalledWith('Unknown filter rule type: invalid_type');
    });

    it("空のFilterRuleで全要素を返す", () => {
      const cards = [mockCard];
      const rules: FilterRule[] = [];

      const result = filterTargets(cards, rules);
      expect(result).toHaveLength(1);
    });
  });

  describe("型推論と戻り値の検証", () => {
    it("Card[]入力でCard[]を返す", () => {
      const cards: Card[] = [mockCard];
      const rules: FilterRule[] = [{ type: 'cost', operator: 'eq', value: 3 }];

      const result = filterTargets(cards, rules);

      // 型推論でCard[]が返されることを確認
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('templateId');
      expect(result[0]).toHaveProperty('cost');
      expect(result[0]).not.toHaveProperty('currentHealth'); // FieldCard特有のプロパティなし
    });

    it("FieldCard[]入力でFieldCard[]を返す", () => {
      const fieldCards: FieldCard[] = [mockFieldCard];
      const rules: FilterRule[] = [{ type: 'cost', operator: 'eq', value: 2 }];

      const result = filterTargets(fieldCards, rules);

      // 型推論でFieldCard[]が返されることを確認
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('templateId');
      expect(result[0]).toHaveProperty('cost');
      expect(result[0]).toHaveProperty('currentHealth'); // FieldCard特有のプロパティあり
      expect(result[0]).toHaveProperty('owner');
    });
  });
});
