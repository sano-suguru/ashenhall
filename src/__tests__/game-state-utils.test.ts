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

  it("should format trigger_event log concisely", () => {
    const action: GameAction = {
      sequence: 7,
      playerId: "player2",
      type: "trigger_event",
      data: {
        triggerType: "on_damage_taken",
        sourceCardId: "attacker_card",
        targetCardId: "defender_card",
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《defender_card》の効果が発動");
    expect(result).toContain("(ダメージを受けた時)");
    expect(result).not.toContain("のアクションにより");
  });

  it("should format creature_destroyed log concisely", () => {
    const action: GameAction = {
      sequence: 8,
      playerId: "player1",
      type: "creature_destroyed",
      data: {
        destroyedCardId: "destroyed_card",
        source: "combat",
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《destroyed_card》破壊");
    expect(result).toContain("(戦闘により)");
  });

  it("should NOT include trigger text in effect_trigger logs to avoid redundancy", () => {
    const triggerAction: GameAction = {
      sequence: 8,
      playerId: "player1",
      type: "trigger_event",
      data: { triggerType: "on_play", targetCardId: "some_card" },
      timestamp: 0,
    };
    const effectAction: GameAction = {
      sequence: 9,
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
    
    const gameStateWithContext = {
      actionLog: [triggerAction, effectAction],
    } as unknown as GameState;

    const result = formatActionAsText(effectAction, gameStateWithContext);
    
    // 「(プレイされた時)」というテキストが含まれないことを確認
    expect(result).not.toContain("(プレイされた時)");
  });

  it("should correctly display non-card source names like poison", () => {
    const action: GameAction = {
      sequence: 10,
      playerId: "player2",
      type: "creature_destroyed",
      data: {
        destroyedCardId: "some_creature",
        source: "effect",
        sourceCardId: "poison_effect",
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("《some_creature》破壊");
    expect(result).toContain("(毒の効果により)");
    expect(result).not.toContain("《poison_effect》");
  });

  it("should correctly display non-card source names like deck_empty", () => {
    const action: GameAction = {
      sequence: 11,
      playerId: "player1",
      type: "effect_trigger",
      data: {
        sourceCardId: "deck_empty",
        effectType: "damage",
        effectValue: 1,
        targets: { player1: { life: { before: 10, after: 9 } } },
      },
      timestamp: 0,
    };
    const result = formatActionAsText(action, mockGameState);
    expect(result).toContain("デッキ切れの効果");
    expect(result).toContain("あなた ライフ 10→9 (-1)");
    expect(result).not.toContain("《deck_empty》");
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
