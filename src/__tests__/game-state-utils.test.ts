import { describe, it, expect } from "@jest/globals";
import type { GameState, GameAction } from "@/types/game";
import { formatActionAsText, findDecisiveAction, getTurnNumberForAction, getCardName } from "@/lib/game-state-utils";

// Mock getCardById to avoid dependency on actual card data
jest.mock("@/data/cards/base-cards", () => ({
  getCardById: (id: string) => {
    if (id === "mag_arcane_lightning") return { name: "秘術の連雷" };
    if (id === "necro_skeleton") return { name: "骸骨剣士" };
    if (id === "necro_soul_offering") return { name: "魂の供物" };
    return { name: id };
  },
}));

describe("getCardName (extractTemplateId integration)", () => {
  it("should extract template ID from deterministic instance ID", () => {
    expect(getCardName("ber_fury-inst-1-6-player2-field-0")).toBe("ber_fury");
  });

  it("should extract template ID from deck instance ID", () => {
    expect(getCardName("necro_skeleton-deck-0-5")).toBe("骸骨剣士");
  });

  it("should extract template ID from non-deterministic ID (timestamp-random)", () => {
    expect(getCardName("necro_soul_offering-1761752317510-jw9a4jdno")).toBe("魂の供物");
  });

  it("should handle plain template ID", () => {
    expect(getCardName("mag_arcane_lightning")).toBe("秘術の連雷");
  });

  it("should extract template ID and return it when card not found", () => {
    // カードが見つからない場合、extractされたtemplateIdを返す
    expect(getCardName("unknown_card-1234567890123-abc123xyz")).toBe("unknown_card");
  });
});


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
    expect(result).toContain("《骸骨剣士》にダメージ(3)");
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
    expect(result).toContain("《骸骨剣士》に攻撃力強化(2)");
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
    expect(result).toContain("自身にドロー(1)");
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
    expect(result).toContain("《attacker_card》のon_damage_takenトリガー");
    expect(result).toContain("《defender_card》");
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
    expect(result).toContain("《destroyed_card》が戦闘によって破壊された");
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
    expect(result).toContain("《some_creature》が《poison_effect》によって破壊された");
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
    expect(result).toContain("《deck_empty》の効果で自身にダメージ(1)");
  });
});

// 型ガード関数とヘルパー関数のテストを追加
describe("Type Guard Functions", () => {
  describe("isCardAttackToPlayer", () => {
    it("should identify player-targeted card attacks", () => {
      const playerAttack: GameAction = {
        type: "card_attack",
        playerId: "player1",
        sequence: 1,
        data: { 
          attackerCardId: "C001", 
          targetId: "player2", 
          damage: 2,
        },
        timestamp: 0,
      };
      
      // 型ガード関数は内部関数なので、findDecisiveActionを通じてテスト
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [playerAttack],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toEqual(playerAttack);
    });

    it("should reject creature-targeted attacks", () => {
      const creatureAttack: GameAction = {
        type: "card_attack",
        playerId: "player1",
        sequence: 1,
        data: { 
          attackerCardId: "C001", 
          targetId: "C002", // クリーチャー対象
          damage: 2,
        },
        timestamp: 0,
      };
      
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [creatureAttack],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toBeNull(); // プレイヤー対象でないため除外される
    });

    it("should reject non-attack actions", () => {
      const nonAttackAction: GameAction = {
        type: "card_play",
        playerId: "player1",
        sequence: 1,
        data: { cardId: "C001", position: 0 },
        timestamp: 0,
      };
      
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [nonAttackAction],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toBeNull(); // 攻撃アクションでないため除外される
    });
  });

  describe("isLifeDamageEffect", () => {
    it("should identify life-damaging effects", () => {
      const lifeDamageEffect: GameAction = {
        type: "effect_trigger",
        playerId: "player1",
        sequence: 1,
        data: {
          sourceCardId: "C001",
          effectType: "damage",
          effectValue: 5,
          targets: { player2: { life: { before: 10, after: 5 } } },
        },
        timestamp: 0,
      };
      
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [lifeDamageEffect],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toEqual(lifeDamageEffect);
    });

    it("should reject non-damage effects", () => {
      const nonDamageEffect: GameAction = {
        type: "effect_trigger",
        playerId: "player1",
        sequence: 1,
        data: {
          sourceCardId: "C001",
          effectType: "draw_card",
          effectValue: 1,
          targets: { player1: {} },
        },
        timestamp: 0,
      };
      
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [nonDamageEffect],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toBeNull(); // ダメージ効果でないため除外される
    });

    it("should reject non-life-targeting damage", () => {
      const creatureDamageEffect: GameAction = {
        type: "effect_trigger",
        playerId: "player1",
        sequence: 1,
        data: {
          sourceCardId: "C001",
          effectType: "damage",
          effectValue: 3,
          targets: { C002: { health: { before: 5, after: 2 } } }, // ライフでなくヘルス
        },
        timestamp: 0,
      };
      
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [creatureDamageEffect],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toBeNull(); // ライフダメージでないため除外される
    });
  });

  describe("hasDamage helper function", () => {
    it("should identify attacks with damage > 0", () => {
      const damageAttack: GameAction = {
        type: "card_attack",
        playerId: "player1",
        sequence: 1,
        data: { 
          attackerCardId: "C001", 
          targetId: "player2", 
          damage: 3, // ダメージあり
        },
        timestamp: 0,
      };
      
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [damageAttack],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toEqual(damageAttack);
    });

    it("should reject attacks with damage = 0", () => {
      const noDamageAttack: GameAction = {
        type: "card_attack",
        playerId: "player1",
        sequence: 1,
        data: { 
          attackerCardId: "C001", 
          targetId: "player2", 
          damage: 0, // ダメージなし
        },
        timestamp: 0,
      };
      
      const gameState = {
        result: { winner: "player1", reason: "life_zero" },
        actionLog: [noDamageAttack],
      } as unknown as GameState;
      
      const result = findDecisiveAction(gameState);
      expect(result).toBeNull(); // ダメージ0のため除外される
    });
  });
});

describe("findDecisiveAction (Legacy Compatibility)", () => {
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
      data: { 
        attackerCardId: "C001", 
        targetId: "player2", 
        damage: 2,
      },
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
          data: { 
            attackerCardId: "C002", 
            targetId: "player2", 
            damage: 0,
          },
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
          data: { 
            attackerCardId: "C002", 
            targetId: "player2", 
            damage: 0,
          },
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
          data: { 
            attackerCardId: "C001", 
            targetId: "player2", 
            damage: 0,
          },
          timestamp: 0,
        },
      ],
    } as unknown as GameState;
    expect(findDecisiveAction(gameState)).toBeNull();
  });
});

describe("getTurnNumberForAction", () => {
  // ターン毎のアクション数が不規則な模擬ログデータ
  const mockActions: GameAction[] = [
    // Turn 1 (3 actions)
    { sequence: 0, type: "phase_change", data: { toPhase: "draw" } } as GameAction,
    { sequence: 1, type: "card_play", data: {} } as GameAction,
    { sequence: 2, type: "card_attack", data: {} } as GameAction,
    // Turn 2 (7 actions)
    { sequence: 3, type: "phase_change", data: { toPhase: "draw" } } as GameAction,
    { sequence: 4, type: "card_play", data: {} } as GameAction,
    { sequence: 5, type: "effect_trigger", data: {} } as GameAction,
    { sequence: 6, type: "effect_trigger", data: {} } as GameAction,
    { sequence: 7, type: "card_attack", data: {} } as GameAction,
    { sequence: 8, type: "creature_destroyed", data: {} } as GameAction,
    { sequence: 9, type: "phase_change", data: { toPhase: "end" } } as GameAction,
    // Turn 3 (5 actions)
    { sequence: 10, type: "phase_change", data: { toPhase: "draw" } } as GameAction,
    { sequence: 11, type: "card_play", data: {} } as GameAction,
    { sequence: 12, type: "card_attack", data: {} } as GameAction,
    { sequence: 13, type: "card_attack", data: {} } as GameAction,
    { sequence: 14, type: "phase_change", data: { toPhase: "end" } } as GameAction,
  ];

  const mockGameState = {
    actionLog: mockActions,
  } as unknown as GameState;

  it("should return turn 1 for actions in the first turn", () => {
    expect(getTurnNumberForAction(mockActions[0], mockGameState)).toBe(1);
    expect(getTurnNumberForAction(mockActions[2], mockGameState)).toBe(1);
  });

  it("should return turn 2 for actions in the second turn", () => {
    expect(getTurnNumberForAction(mockActions[3], mockGameState)).toBe(2); // Turn start
    expect(getTurnNumberForAction(mockActions[6], mockGameState)).toBe(2); // Middle of turn
    expect(getTurnNumberForAction(mockActions[9], mockGameState)).toBe(2); // End of turn
  });

  it("should return turn 3 for actions in the third turn", () => {
    expect(getTurnNumberForAction(mockActions[10], mockGameState)).toBe(3);
    expect(getTurnNumberForAction(mockActions[14], mockGameState)).toBe(3);
  });

  it("should handle the very first action (sequence 0) correctly", () => {
    expect(getTurnNumberForAction(mockActions[0], mockGameState)).toBe(1);
  });
});
