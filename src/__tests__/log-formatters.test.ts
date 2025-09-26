import { describe, it, expect, jest } from "@jest/globals";
import type { GameAction, GameState } from "@/types/game";

// Formatters (統合後)
import { logFormatters } from "@/lib/log-formatters";

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

  describe("logFormatters.energy_update", () => {
    it("should format energy update message", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "energy_update",
        data: { maxEnergyBefore: 1, maxEnergyAfter: 2 },
      };
      const result = logFormatters.energy_update(action, mockPlayerName, mockGameState);
      expect(result.message).toBe("最大エネルギーが1から2に変化");
    });
  });

  describe("logFormatters.phase_change", () => {
    it("should format draw phase message", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "phase_change",
        data: { fromPhase: "end", toPhase: "draw" },
      };
      const result = logFormatters.phase_change(action, mockPlayerName, mockGameState);
      expect(result.message).toBe("終了フェーズ → ドローフェーズ");
    });

    it("should format other phase messages", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "phase_change",
        data: { fromPhase: "deploy", toPhase: "battle" },
      };
      const result = logFormatters.phase_change(action, mockPlayerName, mockGameState);
      expect(result.message).toBe("展開フェーズ → 戦闘フェーズ");
    });
  });

  describe("logFormatters (統合確認)", () => {
    it("should format keyword trigger", () => {
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
      const result = logFormatters.keyword_trigger(action, mockPlayerName, mockGameState);
      expect(result.message).toContain("poison");
    });

    it("should format card play", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "card_play",
        data: { cardId: "test_card", position: 0 },
      };
      const result = logFormatters.card_play(action, mockPlayerName, mockGameState);
      expect(result.message).toContain("test_card");
    });

    it("should format card attack", () => {
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
      const result = logFormatters.card_attack(action, mockPlayerName, mockGameState);
      expect(result.message).toContain("attacker");
    });

    it("should format creature destroyed", () => {
      const action: GameAction = {
        sequence: 1,
        playerId: "player1",
        timestamp: 0,
        type: "creature_destroyed",
        data: { destroyedCardId: "destroyed_card", source: "combat" },
      };
      const result = logFormatters.creature_destroyed(action, mockPlayerName, mockGameState);
      expect(result.message).toContain("destroyed_card");
    });

    it("should format effect trigger", () => {
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
      const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
      expect(result.message).toContain("source_card");
    });
  });
});
