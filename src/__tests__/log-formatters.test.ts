import { describe, it, expect, jest } from "@jest/globals";
import type { GameAction, GameState } from "@/types/game";

// Formatters
import { formatEnergyUpdateLog } from "@/lib/log-formatters/format-energy-update";
import { formatCardPlayLog } from "@/lib/log-formatters/format-card-play";
import { formatCardAttackLog } from "@/lib/log-formatters/format-card-attack";
import { formatCreatureDestroyedLog } from "@/lib/log-formatters/format-creature-destroyed";
import { formatEffectTriggerLog } from "@/lib/log-formatters/format-effect-trigger";
import { formatPhaseChangeLog } from "@/lib/log-formatters/format-phase-change";
import { formatTriggerEventLog } from "@/lib/log-formatters/format-trigger-event";
import { formatKeywordTriggerLog } from "@/lib/log-formatters/format-keyword-trigger";

// Mocks
jest.mock("@/data/cards/base-cards", () => ({
  getCardById: (id: string) => ({ name: id }),
}));

jest.mock("@/lib/game-state-utils", () => {
  const originalModule = jest.requireActual<typeof import("@/lib/game-state-utils")>("@/lib/game-state-utils");
  return {
    ...originalModule,
    getTurnNumberForAction: () => 5, // Mock turn number for simplicity
  };
});

describe("Log Formatters", () => {
  const mockGameState = {} as GameState;
  const mockPlayerName = "あなた";

  describe("formatEnergyUpdateLog", () => {
    it("should format energy update message", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "energy_update",
        data: { maxEnergyBefore: 1, maxEnergyAfter: 2 },
      };
      const result = formatEnergyUpdateLog(action, mockPlayerName);
      expect(result.message).toBe("最大エネルギー +1");
      expect(result.details).toBe("(1 → 2)、全回復");
    });
  });

  describe("formatPhaseChangeLog", () => {
    it("should format draw phase message with turn number", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "phase_change",
        data: { fromPhase: "end", toPhase: "draw" },
      };
      const result = formatPhaseChangeLog(action, mockPlayerName, mockGameState);
      expect(result.message).toBe(`ターン5開始 - ${mockPlayerName}のターン`);
    });

    it("should format other phase messages", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "phase_change",
        data: { fromPhase: "deploy", toPhase: "battle" },
      };
      const result = formatPhaseChangeLog(action, mockPlayerName, mockGameState);
      expect(result.message).toBe("戦闘フェーズ");
    });
  });

  describe("formatKeywordTriggerLog", () => {
    it("should format keyword trigger message", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "keyword_trigger",
        data: {
          keyword: "poison",
          sourceCardId: "source_card",
          targetId: "target_card",
          value: 1,
        },
      };
      const result = formatKeywordTriggerLog(action, mockPlayerName);
      expect(result.message).toBe("《source_card》の毒効果 → 《target_card》");
      expect(result.details).toBe("(1追加ダメージ)");
    });
  });

  describe("formatCardPlayLog", () => {
    it("should format card play message", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "card_play",
        data: { cardId: "test_card", position: 0 },
      };
      const result = formatCardPlayLog(action, mockPlayerName);
      expect(result.message).toBe("《test_card》を配置");
      expect(result.details).toContain("コスト");
    });
  });

  describe("formatCardAttackLog", () => {
    it("should format attack on creature", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "card_attack",
        data: {
          attackerCardId: "attacker",
          targetId: "target",
          damage: 3,
          targetHealth: { before: 5, after: 2 },
        },
      };
      const result = formatCardAttackLog(action, mockPlayerName);
      expect(result.message).toBe("《attacker》 → 《target》");
      expect(result.details).toBe("(3ダメージ) 体力 5→2");
    });

    it("should format attack on player", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "card_attack",
        data: {
          attackerCardId: "attacker",
          targetId: "player2",
          damage: 2,
          targetPlayerLife: { before: 15, after: 13 },
        },
      };
      const result = formatCardAttackLog(action, mockPlayerName);
      expect(result.message).toBe("《attacker》 → 相手");
      expect(result.details).toBe("(2ダメージ) ライフ 15→13");
    });
  });

  describe("formatCreatureDestroyedLog", () => {
    it("should format destruction by combat", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "creature_destroyed",
        data: { destroyedCardId: "destroyed_card", source: "combat" },
      };
      const result = formatCreatureDestroyedLog(action, mockPlayerName);
      expect(result.message).toBe("《destroyed_card》破壊");
      expect(result.details).toBe("(戦闘により)");
    });

    it("should format destruction by effect", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "creature_destroyed",
        data: {
          destroyedCardId: "destroyed_card",
          source: "effect",
          sourceCardId: "source_card",
        },
      };
      const result = formatCreatureDestroyedLog(action, mockPlayerName);
      expect(result.message).toBe("《destroyed_card》破壊");
      expect(result.details).toBe("(《source_card》の効果により)");
    });
  });

  describe("formatEffectTriggerLog", () => {
    it("should format damage effect with value change", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "effect_trigger",
        data: {
          sourceCardId: "source_card",
          effectType: "damage",
          effectValue: 3,
          targets: { target_card: { health: { before: 5, after: 2 } } },
        },
      };
      const result = formatEffectTriggerLog(action, mockPlayerName);
      expect(result.message).toBe("《source_card》の効果");
      expect(result.details).toBe("《target_card》 体力 5→2 (-3)");
    });

    it("should format buff effect with multiple changes", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "effect_trigger",
        data: {
          sourceCardId: "source_card",
          effectType: "buff_attack",
          effectValue: 1,
          targets: {
            target_card: {
              attack: { before: 1, after: 2 },
              health: { before: 2, after: 3 },
            },
          },
        },
      };
      const result = formatEffectTriggerLog(action, mockPlayerName);
      expect(result.details).toBe("《target_card》 攻撃力 1→2 (+1), 体力 2→3 (+1)");
    });

    it("should format effect with no value change", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "effect_trigger",
        data: {
          sourceCardId: "source_card",
          effectType: "draw_card",
          effectValue: 1,
          targets: { player1: {} },
        },
      };
      const result = formatEffectTriggerLog(action, mockPlayerName);
      expect(result.details).toBe("あなたにドロー(1)");
    });
  });

  describe("formatTriggerEventLog", () => {
    it("should format trigger event message", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "trigger_event",
        data: {
          triggerType: "on_play",
          sourceCardId: "source_card",
          targetCardId: "target_card",
        },
      };
      const result = formatTriggerEventLog(action, mockPlayerName);
      expect(result.message).toBe("《target_card》の効果が発動");
      expect(result.triggerText).toBe("プレイされた時");
    });
  });
});
