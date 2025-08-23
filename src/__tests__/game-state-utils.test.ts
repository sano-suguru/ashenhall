import { describe, it, expect } from "@jest/globals";
import type { GameState, GameAction } from "@/types/game";
import { formatActionAsText, findDecisiveAction } from "@/lib/game-state-utils";
import { getCardById } from "@/data/cards/base-cards";

// Mock getCardById to avoid dependency on actual card data
jest.mock("@/data/cards/base-cards", () => ({
  getCardById: (id: string) => {
    if (id === "mag_arcane_lightning") return { name: "秘術の連雷" };
    if (id === "necro_skeleton") return { name: "骸骨剣士" };
    return { name: id };
  },
}));

describe("formatActionAsText", () => {
  const mockGameState = {
    actionLog: [],
  } as unknown as GameState;

  it("should format health change correctly with before/after values", () => {
    const action: GameAction = {
      sequence: 1,
      playerId: "player1",
      type: "effect_trigger",
      data: {
        sourceCardId: "mag_arcane_lightning",
        effectType: "damage",
        effectValue: 3,
        targets: { necro_skeleton: { health: { before: 5, after: 2 } } },
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《秘術の連雷》の効果");
    expect(result).toContain("《骸骨剣士》 体力 5→2 (-3)");
  });

  it("should format attack change correctly with before/after values", () => {
    const action: GameAction = {
      sequence: 2,
      playerId: "player1",
      type: "effect_trigger",
      data: {
        sourceCardId: "mag_arcane_lightning",
        effectType: "buff_attack",
        effectValue: 2,
        targets: { necro_skeleton: { attack: { before: 1, after: 3 } } },
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《秘術の連雷》の効果");
    expect(result).toContain("《骸骨剣士》 攻撃力 1→3 (+2)");
  });

  it("should format log without value changes gracefully", () => {
    const action: GameAction = {
      sequence: 3,
      playerId: "player1",
      type: "effect_trigger",
      data: {
        sourceCardId: "mag_arcane_lightning",
        effectType: "draw_card",
        effectValue: 1,
        targets: { player1: {} },
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《秘術の連雷》の効果");
    expect(result).toContain("あなたにドロー(1)");
  });

  it("should format effect log gracefully when there is no target", () => {
    const action: GameAction = {
      sequence: 4,
      playerId: "player1",
      type: "effect_trigger",
      data: {
        sourceCardId: "some_card",
        effectType: "damage",
        effectValue: 1,
        targets: {},
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《some_card》の効果");
    expect(result).not.toContain(":");
  });

  it("should format card_attack on creature with before/after values", () => {
    const action: GameAction = {
      sequence: 5,
      playerId: "player1",
      type: "card_attack",
      data: {
        attackerCardId: "some_attacker",
        targetId: "some_target",
        damage: 3,
        targetHealth: { before: 5, after: 2 },
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《some_attacker》 → 《some_target》");
    expect(result).toContain("(3ダメージ) 体力 5→2");
  });

  it("should format card_attack on player with before/after values", () => {
    const action: GameAction = {
      sequence: 6,
      playerId: "player1",
      type: "card_attack",
      data: {
        attackerCardId: "some_attacker",
        targetId: "player2",
        damage: 2,
        targetPlayerLife: { before: 15, after: 13 },
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《some_attacker》 → 相手");
    expect(result).toContain("(2ダメージ) ライフ 15→13");
  });
});

describe("findDecisiveAction", () => {
  it("should return null if game result is not life_zero", () => {
    const gameState = {
      result: { winner: "player1", reason: "deck_empty" },
      actionLog: [],
    } as unknown as GameState;
    expect(findDecisiveAction(gameState)).toBeNull();
  });

  it("should return the last action with damage > 0 as the decisive action", () => {
    const decisiveAction: GameAction = {
      type: "card_attack",
      playerId: "player1",
      sequence: 2,
      data: { attackerCardId: "C001", targetId: "player2", damage: 2 },
      timestamp: 0,
    };
    const gameState = {
      result: { winner: "player1", reason: "life_zero" },
      actionLog: [
        { type: "card_play", data: {}, sequence: 0, playerId: 'player1', timestamp: 0 },
        decisiveAction,
        {
          type: "card_attack",
          playerId: 'player1',
          sequence: 3,
          data: { attackerCardId: "C002", targetId: "player2", damage: 0 },
          timestamp: 0,
        },
      ],
    } as unknown as GameState;
    const result = findDecisiveAction(gameState);
    expect(result).toEqual(decisiveAction);
  });

  it("should return the last effect with value > 0 as the decisive action", () => {
    const decisiveAction: GameAction = {
      type: "effect_trigger",
      playerId: "player1",
      sequence: 1,
      data: {
        sourceCardId: "C001",
        effectType: "damage",
        effectValue: 5,
        targets: { player2: { life: { before: 5, after: 0 } } },
      },
      timestamp: 0,
    };
    const gameState = {
      result: { winner: "player1", reason: "life_zero" },
      actionLog: [
        decisiveAction,
        {
          type: "card_attack",
          playerId: 'player1',
          sequence: 2,
          data: { attackerCardId: "C002", targetId: "player2", damage: 0 },
          timestamp: 0,
        },
      ],
    } as unknown as GameState;
    const result = findDecisiveAction(gameState);
    expect(result).toEqual(decisiveAction);
  });

  it("should return null if no action caused damage", () => {
    const gameState = {
      result: { winner: "player1", reason: "life_zero" },
      actionLog: [
        {
          type: "card_attack",
          playerId: 'player1',
          sequence: 1,
          data: { attackerCardId: "C001", targetId: "player2", damage: 0 },
          timestamp: 0,
        },
      ],
    } as unknown as GameState;
    expect(findDecisiveAction(gameState)).toBeNull();
  });
});
