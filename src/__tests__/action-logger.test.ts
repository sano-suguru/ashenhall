/**
 * Action Logger システム テスト
 * 
 * リファクタリング後の統合アクションログ機能のテスト
 */

import { describe, test, expect } from '@jest/globals';
import {
  addAction,
  addCardPlayAction,
  addCardAttackAction,
  addEffectTriggerAction,
} from '@/lib/game-engine/action-logger';
import type { GameState } from '@/types/game';

describe('Action Logger システム', () => {
  // テスト用の基本ゲーム状態
  const createMockGameState = (): GameState => ({
    gameId: 'test-game',
    turnNumber: 1,
    currentPlayer: 'player1',
    phase: 'battle',
    players: {
      player1: {
        id: 'player1',
        life: 15,
        energy: 3,
        maxEnergy: 3,
        faction: 'necromancer',
        tacticsType: 'balanced',
        deck: [],
        hand: [],
        field: [],
        graveyard: [],
        banishedCards: [],
      },
      player2: {
        id: 'player2',
        life: 15,
        energy: 3,
        maxEnergy: 3,
        faction: 'berserker',
        tacticsType: 'aggressive',
        deck: [],
        hand: [],
        field: [],
        graveyard: [],
        banishedCards: [],
      },
    },
    actionLog: [],
    randomSeed: 'test-seed',
    startTime: Date.now(),
  });

  describe('統合addAction関数', () => {
    test('型安全なアクション追加', () => {
      const gameState = createMockGameState();
      
      addAction(gameState, 'player1', 'card_play', {
        cardId: 'test-card',
        position: 0,
        initialStats: { attack: 2, health: 3 },
        playerEnergy: { before: 5, after: 3 },
      });

      expect(gameState.actionLog).toHaveLength(1);
      const action = gameState.actionLog[0];
      
      expect(action.sequence).toBe(0);
      expect(action.playerId).toBe('player1');
      expect(action.type).toBe('card_play');
      if (action.type === 'card_play') {
        expect(action.data.cardId).toBe('test-card');
        expect(action.data.position).toBe(0);
      }
      expect(action.timestamp).toBeGreaterThan(0);
    });

    test('シーケンス番号の自動インクリメント', () => {
      const gameState = createMockGameState();
      
      addAction(gameState, 'player1', 'card_play', {
        cardId: 'card-1',
        position: 0,
        playerEnergy: { before: 5, after: 3 },
      });
      
      addAction(gameState, 'player2', 'card_attack', {
        attackerCardId: 'attacker',
        targetId: 'target',
        damage: 3,
        targetHealth: { before: 5, after: 2 },
      });

      expect(gameState.actionLog).toHaveLength(2);
      expect(gameState.actionLog[0].sequence).toBe(0);
      expect(gameState.actionLog[1].sequence).toBe(1);
    });
  });

  describe('ヘルパー関数の互換性', () => {
    test('addCardPlayAction', () => {
      const gameState = createMockGameState();
      
      addCardPlayAction(gameState, 'player1', {
        cardId: 'necro_skeleton',
        position: 1,
        initialStats: { attack: 1, health: 2 },
        playerEnergy: { before: 3, after: 1 },
      });

      expect(gameState.actionLog).toHaveLength(1);
      const action = gameState.actionLog[0];
      expect(action.type).toBe('card_play');
      expect(action.playerId).toBe('player1');
    });

    test('addCardAttackAction', () => {
      const gameState = createMockGameState();
      
      addCardAttackAction(gameState, 'player2', {
        attackerCardId: 'ber_warrior',
        targetId: 'necro_skeleton',
        damage: 2,
        targetHealth: { before: 2, after: 0 },
      });

      expect(gameState.actionLog).toHaveLength(1);
      const action = gameState.actionLog[0];
      expect(action.type).toBe('card_attack');
      expect(action.playerId).toBe('player2');
    });

    test('addEffectTriggerAction', () => {
      const gameState = createMockGameState();
      
      addEffectTriggerAction(gameState, 'player1', {
        sourceCardId: 'necro_wraith',
        effectType: 'damage',
        effectValue: 1,
        targets: {
          'player2': {
            life: { before: 15, after: 14 },
          },
        },
      });

      expect(gameState.actionLog).toHaveLength(1);
      const action = gameState.actionLog[0];
      expect(action.type).toBe('effect_trigger');
      expect(action.playerId).toBe('player1');
    });
  });

  describe('アクションログの整合性', () => {
    test('複数アクションの正しい順序付け', () => {
      const gameState = createMockGameState();
      
      // 複数のアクションを連続で追加
      addCardPlayAction(gameState, 'player1', {
        cardId: 'card-1',
        position: 0,
        playerEnergy: { before: 5, after: 3 },
      });
      
      addEffectTriggerAction(gameState, 'player1', {
        sourceCardId: 'card-1',
        effectType: 'buff_attack',
        effectValue: 1,
        targets: { 'ally-1': { attack: { before: 2, after: 3 } } },
      });
      
      addCardAttackAction(gameState, 'player1', {
        attackerCardId: 'card-1',
        targetId: 'enemy-1',
        damage: 3,
        targetHealth: { before: 4, after: 1 },
      });

      expect(gameState.actionLog).toHaveLength(3);
      expect(gameState.actionLog[0].sequence).toBe(0);
      expect(gameState.actionLog[1].sequence).toBe(1);
      expect(gameState.actionLog[2].sequence).toBe(2);
      
      // 各アクションが正しい順序で記録されている
      expect(gameState.actionLog[0].type).toBe('card_play');
      expect(gameState.actionLog[1].type).toBe('effect_trigger');
      expect(gameState.actionLog[2].type).toBe('card_attack');
    });

    test('タイムスタンプの単調増加', () => {
      const gameState = createMockGameState();
      
      addAction(gameState, 'player1', 'card_play', {
        cardId: 'card-1',
        position: 0,
        playerEnergy: { before: 3, after: 1 },
      });
      
      // 少し待つ
      const startTime = gameState.actionLog[0].timestamp;
      
      addAction(gameState, 'player2', 'card_attack', {
        attackerCardId: 'card-2',
        targetId: 'card-1',
        damage: 2,
        targetHealth: { before: 3, after: 1 },
      });
      
      const endTime = gameState.actionLog[1].timestamp;
      expect(endTime).toBeGreaterThanOrEqual(startTime);
    });
  });

  describe('エラーハンドリング', () => {
    test('空のアクションログへの追加', () => {
      const gameState = createMockGameState();
      expect(gameState.actionLog).toHaveLength(0);
      
      addAction(gameState, 'player1', 'phase_change', {
        fromPhase: 'draw',
        toPhase: 'energy',
      });
      
      expect(gameState.actionLog).toHaveLength(1);
      expect(gameState.actionLog[0].sequence).toBe(0);
    });

    test('既存ログありの状態での追加', () => {
      const gameState = createMockGameState();
      // 既存のアクションを直接追加（初期状態をシミュレート）
      gameState.actionLog.push({
        sequence: 0,
        playerId: 'player1',
        type: 'phase_change',
        data: { fromPhase: 'draw', toPhase: 'energy' },
        timestamp: Date.now() - 1000,
      });
      
      addAction(gameState, 'player2', 'card_play', {
        cardId: 'new-card',
        position: 0,
        playerEnergy: { before: 2, after: 0 },
      });
      
      expect(gameState.actionLog).toHaveLength(2);
      expect(gameState.actionLog[1].sequence).toBe(1);
    });
  });
});
