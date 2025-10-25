import { createInitialGameState } from '@/lib/game-engine/core';
import type { FieldCard, GameState, GameAction } from '@/types/game';
import { CompletionAwareProcessor } from '@/lib/game-engine/completion-aware-processor';

function makeFieldCard(templateId: string, atk: number, hp: number, owner: 'player1' | 'player2'): FieldCard {
  return {
    templateId,
    instanceId: templateId, // テスト用にtemplateIdをinstanceIdとして使用
    name: templateId,
    faction: 'mage',
    cost: 1,
    keywords: [],
    effects: [],
    type: 'creature',
    attack: atk,
    health: hp,
    owner,
    currentHealth: hp,
    attackModifier: 0,
    healthModifier: 0,
    passiveAttackModifier: 0,
    passiveHealthModifier: 0,
    summonTurn: 0,
    position: 0,
    hasAttacked: false,
    isStealthed: false,
    isSilenced: false,
    statusEffects: [],
    readiedThisTurn: false,
  };
}

describe('BattleIterator basic emission', () => {
  test('emits expected attack + death sequence (lethal)', () => {
    const gs: GameState = createInitialGameState(
      'g1',
      [],
      [],
      'mage',
      'knight',
      'seed'
    );
    gs.phase = 'battle_attack';
    gs.currentPlayer = 'player1';
    gs.turnNumber = 2;

    const attacker = makeFieldCard('A', 5, 5, 'player1');
    const defender = makeFieldCard('D', 2, 2, 'player2');
    // placeCreatureOnFieldを使わず直接追加（instanceIdを保持するため）
    gs.players.player1.field.push(attacker);
    gs.players.player2.field.push(defender);

    const processor = new CompletionAwareProcessor();
    processor.updateAutonomousConfig({
      gameState: gs,
      isPlaying: true,
      currentTurn: -1,
      gameSpeed: 1,
      onStateChange: (s) => { Object.assign(gs, s); },
      onAnimationStateChange: () => {},
    });

    for (let i = 0; i < 4; i++) {
      (processor as unknown as { executeAutonomousStep: () => void }).executeAutonomousStep();
    }

    const attackActions = gs.actionLog.filter((a): a is Extract<GameAction, { type: 'card_attack' }> => a.type === 'card_attack');
    expect(attackActions.length).toBeGreaterThanOrEqual(1);
    expect(attackActions.some(a => a.data.attackerCardId === 'A')).toBe(true);
    const destroy = gs.actionLog.find(a => a.type === 'creature_destroyed' && a.data.destroyedCardId === 'D');
    expect(destroy).toBeTruthy();
  });
});
