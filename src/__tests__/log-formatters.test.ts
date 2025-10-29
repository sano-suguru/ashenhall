import { describe, it, expect, jest } from '@jest/globals';
import type { GameAction, GameState } from '@/types/game';

// Formatters (統合後)
import { logFormatters } from '@/lib/game-state-utils';

// Mocks
jest.mock('@/data/cards/base-cards', () => ({
  getCardById: (id: string) => {
    // スペルとクリーチャーを区別するモック
    if (id === 'spell_card' || id === 'inq_judgment') {
      return { name: id, type: 'spell' };
    }
    return { name: id, type: 'creature' };
  },
}));

jest.mock('@/lib/game-state-utils', () => {
  const originalModule =
    jest.requireActual<typeof import('@/lib/game-state-utils')>('@/lib/game-state-utils');
  return {
    ...originalModule,
    getTurnNumberForAction: () => 5, // Mock turn number for simplicity
  };
});

describe('Log Formatters', () => {
  const mockGameState = {} as GameState;
  const mockPlayerName = 'あなた';

  describe('logFormatters.energy_update', () => {
    it('should format energy update message', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'energy_update',
        data: { maxEnergyBefore: 1, maxEnergyAfter: 2 },
      };
      const result = logFormatters.energy_update(action, mockPlayerName, mockGameState);
      expect(result.message).toBe('最大エネルギーが1から2に変化');
    });
  });

  describe('logFormatters.phase_change', () => {
    it('should format draw phase transition as turn start', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'phase_change',
        data: { fromPhase: 'end', toPhase: 'draw' },
      };
      const result = logFormatters.phase_change(action, mockPlayerName, mockGameState);
      expect(result.message).toBe('━━ ターン開始 ━━');
      expect(result.iconName).toBe('Flag');
    });

    it('should format other phase messages concisely', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'phase_change',
        data: { fromPhase: 'deploy', toPhase: 'battle' },
      };
      const result = logFormatters.phase_change(action, mockPlayerName, mockGameState);
      expect(result.message).toBe('展開→戦闘');
      expect(result.iconName).toBe('ArrowRight');
    });
  });

  describe('logFormatters (統合確認)', () => {
    it('should format keyword trigger', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'keyword_trigger',
        data: {
          keyword: 'poison',
          sourceCardId: 'source_card',
          targetId: 'target_card',
          value: 1,
        },
      };
      const result = logFormatters.keyword_trigger(action, mockPlayerName, mockGameState);
      expect(result.message).toContain('poison');
    });

    it('should format card play', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'card_play',
        data: { cardId: 'test_card', position: 0 },
      };
      const result = logFormatters.card_play(action, mockPlayerName, mockGameState);
      expect(result.message).toContain('test_card');
      expect(result.message).toContain('召喚');
    });

    it('should format card attack', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'card_attack',
        data: {
          attackerCardId: 'attacker',
          targetId: 'target',
          damage: 3,
          targetHealth: { before: 5, after: 2 },
        },
      };
      const result = logFormatters.card_attack(action, mockPlayerName, mockGameState);
      expect(result.message).toContain('attacker');
    });

    it('should format creature destroyed', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'creature_destroyed',
        data: { destroyedCardId: 'destroyed_card', source: 'combat' },
      };
      const result = logFormatters.creature_destroyed(action, mockPlayerName, mockGameState);
      expect(result.message).toContain('destroyed_card');
    });

    it('should format effect trigger', () => {
      const action: GameAction = {
        sequence: 1,
        playerId: 'player1',
        timestamp: 0,
        type: 'effect_trigger',
        data: {
          sourceCardId: 'source_card',
          effectType: 'damage',
          effectValue: 3,
          targets: { target_card: { health: { before: 5, after: 2 } } },
        },
      };
      const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
      expect(result.message).toContain('source_card');
    });
  });

  describe('Recent Improvements (2025-10-29)', () => {
    describe('card_play: spell vs creature', () => {
      it("should use '召喚' for creature cards", () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'card_play',
          data: { cardId: 'creature_card', position: 0 },
        };
        const result = logFormatters.card_play(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('召喚');
        expect(result.message).not.toContain('使用');
      });

      it("should use '使用' for spell cards", () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'card_play',
          data: { cardId: 'spell_card', position: 0 },
        };
        const result = logFormatters.card_play(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('使用');
        expect(result.message).not.toContain('召喚');
      });
    });

    describe('effect_trigger: player target expressions', () => {
      it("should show '自身' when effect targets source player", () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'damage',
            effectValue: 1,
            targets: { player1: { life: { before: 10, after: 9 } } },
          },
        };
        const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('自身');
      });

      it("should show 'あなた' when player1 is targeted by player2", () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player2',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'damage',
            effectValue: 2,
            targets: { player1: { life: { before: 10, after: 8 } } },
          },
        };
        const result = logFormatters.effect_trigger(action, '相手', mockGameState);
        expect(result.message).toContain('あなた');
      });

      it("should show '相手' when player2 is targeted by player1", () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'damage',
            effectValue: 3,
            targets: { player2: { life: { before: 10, after: 7 } } },
          },
        };
        const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('相手');
      });
    });

    describe('effect_trigger: debuff value formatting', () => {
      it('should show negative sign for debuff_attack', () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'debuff_attack',
            effectValue: 1,
            targets: { target_card: { attack: { before: 3, after: 2 } } },
          },
        };
        const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('(-1)');
      });

      it('should show negative sign for debuff_health', () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'debuff_health',
            effectValue: 2,
            targets: { target_card: { health: { before: 5, after: 3 } } },
          },
        };
        const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('(-2)');
      });

      it('should NOT show negative sign for buff_attack', () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'buff_attack',
            effectValue: 2,
            targets: { target_card: { attack: { before: 2, after: 4 } } },
          },
        };
        const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('(2)');
        expect(result.message).not.toContain('(-2)');
      });
    });

    describe('effect_trigger: specific card target', () => {
      it('should show specific card name when targeting single card', () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'damage',
            effectValue: 3,
            targets: { target_creature: { health: { before: 5, after: 2 } } },
          },
        };
        const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('《target_creature》');
      });

      it('should show count when targeting multiple cards', () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'source_card',
            effectType: 'damage',
            effectValue: 1,
            targets: {
              target1: { health: { before: 3, after: 2 } },
              target2: { health: { before: 4, after: 3 } },
              target3: { health: { before: 2, after: 1 } },
            },
          },
        };
        const result = logFormatters.effect_trigger(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('3体');
      });
    });

    describe('creature_destroyed: self-destruction detection', () => {
      it("should show '戦闘によって' when sourceCardId matches destroyedCardId", () => {
        const action: GameAction = {
          sequence: 1,
          playerId: 'player1',
          timestamp: 0,
          type: 'creature_destroyed',
          data: {
            destroyedCardId: 'test_creature',
            source: 'combat',
            sourceCardId: 'test_creature',
          },
        };
        const result = logFormatters.creature_destroyed(action, mockPlayerName, mockGameState);
        expect(result.message).toContain('戦闘によって');
        expect(result.message).not.toContain('《test_creature》によって');
      });
    });
  });
});
