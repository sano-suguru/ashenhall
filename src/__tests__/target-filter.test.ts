import { describe, it, expect, beforeEach } from "@jest/globals";
import { filterTargets } from "@/lib/game-engine/core/target-filter";
import type { FieldCard, FilterRule, Keyword } from "@/types/game";

describe("filterTargets - FilterRule System", () => {
  let mockTarget: FieldCard;
  
  beforeEach(() => {
    mockTarget = {
      templateId: "test-card",
      instanceId: "test-card-instance",
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
    };
  });

  describe("Brand Filter", () => {
    it("should filter branded creatures", () => {
      const rules: FilterRule[] = [{ type: 'brand', operator: 'has' }];

      // 烙印なしの状態
      let result = filterTargets([mockTarget], rules);
      expect(result).toHaveLength(0);

      // 烙印ありの状態
      mockTarget.statusEffects = [{ type: 'branded' }];
      result = filterTargets([mockTarget], rules);
      expect(result).toHaveLength(1);
    });

    it("should filter non-branded creatures", () => {
      const rules: FilterRule[] = [{ type: 'brand', operator: 'not_has' }];

      // 烙印なしの状態
      const result = filterTargets([mockTarget], rules);
      expect(result).toHaveLength(1);

      // 烙印ありの状態
      mockTarget.statusEffects = [{ type: 'branded' }];
      const result2 = filterTargets([mockTarget], rules);
      expect(result2).toHaveLength(0);
    });
  });

  describe("Cost Filter", () => {
    it("should filter by cost range", () => {
      const rules: FilterRule[] = [{ type: 'cost', operator: 'range', minValue: 2, maxValue: 4 }];
      const result = filterTargets([mockTarget], rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'cost', operator: 'range', minValue: 5, maxValue: 7 }];
      const result2 = filterTargets([mockTarget], rules2);
      expect(result2).toHaveLength(0);
    });
  });

  describe("Keyword Filter", () => {
    it("should filter by keyword presence", () => {
      const rules: FilterRule[] = [{ type: 'keyword', operator: 'has', value: 'guard' }];
      const result = filterTargets([mockTarget], rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'keyword', operator: 'has', value: 'stealth' }];
      const result2 = filterTargets([mockTarget], rules2);
      expect(result2).toHaveLength(0);
    });
  });

  describe("Exclude Self Filter", () => {
    it("should exclude self when specified", () => {
      const mockTarget2 = { ...mockTarget, templateId: "other-card" };
      const targets = [mockTarget, mockTarget2];

      const rules: FilterRule[] = [{ type: 'exclude_self', operator: 'eq', value: true }];
      const result = filterTargets(targets, rules, "test-card");

      expect(result).toHaveLength(1);
      expect(result[0].templateId).toBe("other-card");
    });
  });

  describe("Multiple Rules", () => {
    it("should apply multiple filter conditions", () => {
      const mockTarget2 = {
        ...mockTarget,
        id: "expensive-card",
        cost: 6,
        keywords: ["rush"] as Keyword[],
      };
      const targets = [mockTarget, mockTarget2];

      const rules: FilterRule[] = [
        { type: 'cost', operator: 'range', minValue: 2, maxValue: 4 },
        { type: 'keyword', operator: 'has', value: 'guard' },
      ];
      const result = filterTargets(targets, rules);

      expect(result).toHaveLength(1);
      expect(result[0].templateId).toBe("test-card");
    });
  });

  describe("New Filter Types", () => {
    it("should filter by card type", () => {
      const rules: FilterRule[] = [{ type: 'card_type', operator: 'eq', value: 'creature' }];
      const result = filterTargets([mockTarget], rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'card_type', operator: 'eq', value: 'spell' }];
      const result2 = filterTargets([mockTarget], rules2);
      expect(result2).toHaveLength(0);
    });

    it("should filter by faction", () => {
      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'knight' }];
      const result = filterTargets([mockTarget], rules);
      expect(result).toHaveLength(1);

      const rules2: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'mage' }];
      const result2 = filterTargets([mockTarget], rules2);
      expect(result2).toHaveLength(0);
    });
  });
});
