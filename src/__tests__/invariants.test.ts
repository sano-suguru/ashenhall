import { createInitialGameState } from '@/lib/game-engine/core';
import type { GameState, Card } from '@/types/game';
import { assertNoLingeringDeadCreatures } from '@/lib/game-engine/invariants';

// シンプルなダミーカード（Knight / Necromancer 等既存派閥へ依存しない最小）
const dummyCard: Card = {
  templateId: 'test_card',
  instanceId: 'test_card-test',
  name: 'Test Card',
  type: 'creature',
  faction: 'knight',
  cost: 1,
  attack: 1,
  health: 1,
  keywords: [],
  effects: [],
  flavor: ''
};

function baseState(): GameState {
  const st = createInitialGameState('g1', [dummyCard], [dummyCard], 'knight', 'knight', 'balanced', 'balanced', 'seed');
  return st;
}

describe('invariants.assertNoLingeringDeadCreatures', () => {
  test('正常: 生存カードのみなら例外なし', () => {
    const st = baseState();
    // 手札からフィールドへ1枚移す
    const c = st.players.player1.hand.pop()!;
    st.players.player1.field.push({
      ...(c as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      owner: 'player1',
      currentHealth: 1,
      attackModifier: 0,
      healthModifier: 0,
      passiveAttackModifier: 0,
      passiveHealthModifier: 0,
      summonTurn: st.turnNumber,
      position: 0,
      hasAttacked: false,
      isStealthed: false,
      isSilenced: false,
      statusEffects: [],
      readiedThisTurn: false,
    });
    expect(() => assertNoLingeringDeadCreatures(st)).not.toThrow();
  });

  test('異常: HP<=0 で破壊ログが無いカードが残存すると例外', () => {
    const st = baseState();
    const c = st.players.player1.hand.pop()!;
    st.players.player1.field.push({
      ...(c as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      owner: 'player1',
      currentHealth: 0, // 破壊されているべき
      attackModifier: 0,
      healthModifier: 0,
      passiveAttackModifier: 0,
      passiveHealthModifier: 0,
      summonTurn: st.turnNumber,
      position: 0,
      hasAttacked: false,
      isStealthed: false,
      isSilenced: false,
      statusEffects: [],
      readiedThisTurn: false,
    });
    expect(() => assertNoLingeringDeadCreatures(st)).toThrow(/lingering dead creature/);
  });
});
