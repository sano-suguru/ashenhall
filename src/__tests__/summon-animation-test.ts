/**
 * 召喚演出テスト
 * card_play アクション → summon AnimationTask の変換を検証
 */

import { buildAnimationTasksFromActions } from '@/lib/animation/animation-tasks';
import type { GameAction } from '@/types/game';

describe('Summon Animation Task Generation', () => {
  test('card_play action should generate summon animation task', () => {
    // テスト用のcard_playアクション
    const testActions: GameAction[] = [{
      sequence: 0,
      playerId: 'player1',
      type: 'card_play',
      data: {
        cardId: 'test_creature_123',
        position: 0,
        initialStats: { attack: 2, health: 3 },
        playerEnergy: { before: 3, after: 1 }
      },
      timestamp: Date.now()
    }];

    // AnimationTask変換実行
    const tasks = buildAnimationTasksFromActions(testActions);

    // 検証
    console.log('Generated tasks:', JSON.stringify(tasks, null, 2));
    
    expect(tasks).toHaveLength(1);
    expect(tasks[0].kind).toBe('summon');
    expect(tasks[0].targetId).toBe('test_creature_123');
    expect(tasks[0].duration).toBe(800);
    expect(tasks[0].origin).toBe('other');
  });

  test('multiple card_play actions should generate multiple summon tasks', () => {
    const testActions: GameAction[] = [
      {
        sequence: 0,
        playerId: 'player1',
        type: 'card_play',
        data: {
          cardId: 'creature_1',
          position: 0,
          initialStats: { attack: 2, health: 3 },
          playerEnergy: { before: 3, after: 1 }
        },
        timestamp: Date.now()
      },
      {
        sequence: 1,
        playerId: 'player1',
        type: 'card_play',
        data: {
          cardId: 'creature_2',
          position: 1,
          initialStats: { attack: 1, health: 2 },
          playerEnergy: { before: 1, after: 0 }
        },
        timestamp: Date.now() + 1000
      }
    ];

    const tasks = buildAnimationTasksFromActions(testActions);

    console.log('Multiple tasks:', JSON.stringify(tasks, null, 2));
    
    expect(tasks).toHaveLength(2);
    expect(tasks[0].kind).toBe('summon');
    expect(tasks[0].targetId).toBe('creature_1');
    expect(tasks[1].kind).toBe('summon');
    expect(tasks[1].targetId).toBe('creature_2');
  });
});
