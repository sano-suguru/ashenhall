/**
 * 条件チェッカーのテスト
 */

import { checkEffectCondition, checkAllConditions } from '../lib/game-engine/core/game-logic-utils';
import { createInitialGameState } from '../lib/game-engine/core';
import { getCardById } from '../data/cards/base-cards';
import type { GameState, CreatureCard } from '../types/game';

describe('条件チェッカー', () => {
  let gameState: GameState;

  beforeEach(() => {
    const deck = Array.from({ length: 20 }, (_, i) => ({
      ...getCardById('mag_apprentice')!,
      id: `card_${i}`,
    }));

    gameState = createInitialGameState('test-game', deck, deck, 'mage', 'mage', 'test-seed');
  });

  describe('enemyCreatureCount条件', () => {
    it('敵がいない場合、enemyCreatureCount >= 1 が false を返すこと', () => {
      gameState.players.player2.field = [];

      const condition = {
        subject: 'enemyCreatureCount' as const,
        operator: 'gte' as const,
        value: 1,
      };

      const result = checkEffectCondition(gameState, 'player1', condition);
      expect(result).toBe(false);
    });

    it('敵が1体いる場合、enemyCreatureCount >= 1 が true を返すこと', () => {
      const skeleton = getCardById('necro_skeleton') as CreatureCard;
      gameState.players.player2.field = [
        {
          ...skeleton,
          owner: 'player2',
          currentHealth: skeleton.health,
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
        },
      ];

      const condition = {
        subject: 'enemyCreatureCount' as const,
        operator: 'gte' as const,
        value: 1,
      };

      const result = checkEffectCondition(gameState, 'player1', condition);
      expect(result).toBe(true);
    });
  });

  describe('checkAllConditions', () => {
    it('単一条件が false の場合、false を返すこと', () => {
      gameState.players.player2.field = [];

      const conditions = [
        {
          subject: 'enemyCreatureCount' as const,
          operator: 'gte' as const,
          value: 1,
        },
      ];

      const result = checkAllConditions(gameState, 'player1', conditions);
      expect(result).toBe(false);
    });

    it('単一条件が true の場合、true を返すこと', () => {
      const skeleton = getCardById('necro_skeleton') as CreatureCard;
      gameState.players.player2.field = [
        {
          ...skeleton,
          owner: 'player2',
          currentHealth: skeleton.health,
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
        },
      ];

      const conditions = [
        {
          subject: 'enemyCreatureCount' as const,
          operator: 'gte' as const,
          value: 1,
        },
      ];

      const result = checkAllConditions(gameState, 'player1', conditions);
      expect(result).toBe(true);
    });
  });
});
