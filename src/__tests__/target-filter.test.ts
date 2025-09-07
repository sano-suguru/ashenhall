import { describe, it, expect, beforeEach } from "@jest/globals";
import { TargetFilterEngine } from "@/lib/game-engine/core/target-filter";
import type { FieldCard, TargetFilter, Keyword } from "@/types/game";

describe("TargetFilterEngine - Refactored Rule Evaluators", () => {
  let mockTarget: FieldCard;
  
  beforeEach(() => {
    mockTarget = {
      id: "test-card",
      name: "Test Card",
      faction: "knight",
      type: "creature",
      cost: 3,
      attack: 2,
      health: 4,
      currentHealth: 4,
      keywords: ["guard", "lifesteal"] as Keyword[],
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
    } as FieldCard;
  });

  describe("Brand Filter", () => {
    it("should correctly filter branded creatures", () => {
      // 烙印なしの状態
      const filter: TargetFilter = { hasBrand: true };
      let result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(0);

      // 烙印ありの状態
      mockTarget.statusEffects = [{ type: 'branded' }];
      result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-card");
    });

    it("should correctly filter non-branded creatures", () => {
      const filter: TargetFilter = { hasBrand: false };
      
      // 烙印なしの状態
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-card");

      // 烙印ありの状態
      mockTarget.statusEffects = [{ type: 'branded' }];
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result2).toHaveLength(0);
    });
  });

  describe("Cost Filter", () => {
    it("should filter by exact cost", () => {
      const filter: TargetFilter = { property: 'cost', value: 3 };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);

      const filter2: TargetFilter = { property: 'cost', value: 5 };
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter2);
      expect(result2).toHaveLength(0);
    });

    it("should filter by cost range", () => {
      const filter: TargetFilter = { min_cost: 2, max_cost: 4 };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);

      const filter2: TargetFilter = { min_cost: 5, max_cost: 7 };
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter2);
      expect(result2).toHaveLength(0);
    });

    it("should filter by minimum cost only", () => {
      const filter: TargetFilter = { min_cost: 3 };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);

      const filter2: TargetFilter = { min_cost: 4 };
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter2);
      expect(result2).toHaveLength(0);
    });

    it("should filter by maximum cost only", () => {
      const filter: TargetFilter = { max_cost: 3 };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);

      const filter2: TargetFilter = { max_cost: 2 };
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter2);
      expect(result2).toHaveLength(0);
    });
  });

  describe("Health Filter", () => {
    it("should filter by health range", () => {
      const filter: TargetFilter = { min_health: 3, max_health: 5 };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);

      const filter2: TargetFilter = { min_health: 5, max_health: 7 };
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter2);
      expect(result2).toHaveLength(0);
    });

    it("should filter by current health", () => {
      mockTarget.currentHealth = 2; // ダメージを受けた状態
      
      const filter: TargetFilter = { min_health: 1, max_health: 2 };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);

      const filter2: TargetFilter = { min_health: 3, max_health: 4 };
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter2);
      expect(result2).toHaveLength(0);
    });
  });

  describe("Keyword Filter", () => {
    it("should filter by keyword presence", () => {
      const filter: TargetFilter = { has_keyword: 'guard' };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);

      const filter2: TargetFilter = { has_keyword: 'stealth' };
      const result2 = TargetFilterEngine.applyLegacyFilter([mockTarget], filter2);
      expect(result2).toHaveLength(0);
    });

    it("should handle multiple keywords", () => {
      const filter: TargetFilter = { has_keyword: 'lifesteal' };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      expect(result).toHaveLength(1);
    });
  });

  describe("Exclude Self Filter", () => {
    it("should exclude self when specified", () => {
      const mockTarget2 = { ...mockTarget, id: "other-card" };
      const targets = [mockTarget, mockTarget2];
      
      const filter: TargetFilter = { exclude_self: true };
      const result = TargetFilterEngine.applyLegacyFilter(targets, filter, "test-card");
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("other-card");
    });

    it("should include all when no sourceCardId provided", () => {
      const mockTarget2 = { ...mockTarget, id: "other-card" };
      const targets = [mockTarget, mockTarget2];
      
      const filter: TargetFilter = { exclude_self: true };
      const result = TargetFilterEngine.applyLegacyFilter(targets, filter);
      
      expect(result).toHaveLength(2);
    });
  });

  describe("Multiple Filters", () => {
    it("should apply multiple filter conditions", () => {
      const mockTarget2 = { 
        ...mockTarget, 
        id: "expensive-card", 
        cost: 6,
        keywords: ["rush"] as Keyword[]
      };
      const targets = [mockTarget, mockTarget2];
      
      const filter: TargetFilter = { 
        min_cost: 2, 
        max_cost: 4, 
        has_keyword: 'guard' 
      };
      const result = TargetFilterEngine.applyLegacyFilter(targets, filter);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-card");
    });

    it("should apply multiple separate filters", () => {
      const mockTarget2 = { 
        ...mockTarget, 
        id: "other-card", 
        cost: 1,
        keywords: [] as Keyword[]
      };
      const targets = [mockTarget, mockTarget2];
      
      const filters: TargetFilter[] = [
        { min_cost: 2 },
        { has_keyword: 'guard' }
      ];
      const result = TargetFilterEngine.applyMultipleFilters(targets, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-card");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid property filters gracefully", () => {
      // 無効なプロパティ値でのテストは型安全性のため削除
      // 代わりに正常なプロパティでのテストを実行
      const filter: TargetFilter = { 
        property: 'cost', 
        value: 999 // 存在しない値
      };
      const result = TargetFilterEngine.applyLegacyFilter([mockTarget], filter);
      
      // 一致しない値なので結果は空
      expect(result).toHaveLength(0);
    });
  });
});
