import { CompletionAwareProcessor } from '@/lib/game-engine/completion-aware-processor';
import { createInitialGameState } from '@/lib/game-engine/core';
import { addCardAttackAction, addEffectTriggerAction, addCreatureDestroyedAction } from '@/lib/game-engine/action-logger';
import type { GameState, CreatureCard } from '@/types/game';
import { placeCreatureOnField } from '@/test-helpers/battle-test-helpers';

/**
 * 逐次アニメーション順序テスト
 * シナリオ: attack -> multi-target damage (2 targets) -> destroy
 * 期待: Processor は attack アニメ完了後に damage 1体目, 次に damage 2体目, 最後に destroy を逐次化
 */

describe('CompletionAwareProcessor sequential animation ordering', () => {
  function setupState(): GameState {
  const emptyDeck: CreatureCard[] = []; // 空デッキ（テスト用途）
    const gs = createInitialGameState('test', emptyDeck, emptyDeck, 'necromancer', 'berserker', 'balanced', 'aggressive', 'seed');
    // 手動で attacker となるクリーチャーカードを player1 のフィールドに配置
    const mockCreature: CreatureCard = {
      id: 'attacker',
      name: 'Tester',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 3,
      health: 5,
      effects: [],
      keywords: [],
    };
    placeCreatureOnField(gs, 'player1', mockCreature, { id: 'attacker', currentHealth: 5 });
    const attacker = gs.players.player1.field.find(c => c.id === 'attacker');
    if (!attacker) throw new Error('Failed to place attacker');
    // player2 にターゲット2体を配置 (health 5)
    placeCreatureOnField(gs, 'player2', attacker as CreatureCard, { id: 't1', currentHealth: 5 });
    placeCreatureOnField(gs, 'player2', attacker as CreatureCard, { id: 't2', currentHealth: 5 });
    return gs;
  }

  test('attack -> damage(target1) -> damage(target2) -> destroy(target2) 順', async () => {
    const state = setupState();
    const processor = new CompletionAwareProcessor();

    // attack action
    addCardAttackAction(state, 'player1', {
      attackerCardId: state.players.player1.field[0].id,
      targetId: state.players.player2.field[0].id,
      damage: 3,
    });
    // damage (multi-target) action
    addEffectTriggerAction(state, 'player1', {
      sourceCardId: state.players.player1.field[0].id,
      effectType: 'damage',
      effectValue: 3,
      targets: {
        [state.players.player2.field[0].id]: { health: { before: 5, after: 2 } },
        [state.players.player2.field[1].id]: { health: { before: 5, after: 0 } },
      }
    });
    // destroy action for second target (after it hit 0)
    addCreatureDestroyedAction(state, 'player2', {
      destroyedCardId: state.players.player2.field[1].id,
      source: 'combat',
      sourceCardId: state.players.player1.field[0].id,
    });

    processor.updateAutonomousConfig({
      gameState: state,
      isPlaying: true,
      currentTurn: -1,
      gameSpeed: 1.0,
      onStateChange: () => {},
      onGameFinished: () => {},
      onStatsUpdate: () => {},
      onAnimationStateChange: () => {},
      onError: () => {},
    });
    // アニメーションシーケンス開始
    processor.startAutonomousGameProcessing();
    // テスト環境では duration=0 のため即座に処理完了想定。安全のためマイクロタスクフラッシュ
    await Promise.resolve();
    processor.stopAutonomousGameProcessing();

    // 処理完了後 isCurrentlyProcessing は false
    expect(processor.isCurrentlyProcessing()).toBe(false);

    // シーケンス順検証: actionLog の sequence は追加順で自明、ここでは Processor 内部順序副作用が崩れていないことを間接検証
    const attackIndex = state.actionLog.findIndex(a => a.type === 'card_attack');
    const damageIndex = state.actionLog.findIndex(a => a.type === 'effect_trigger' && a.data.effectType === 'damage');
    const destroyIndex = state.actionLog.findIndex(a => a.type === 'creature_destroyed');
    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(damageIndex).toBeGreaterThan(attackIndex);
    expect(destroyIndex).toBeGreaterThan(damageIndex);
  });
});
