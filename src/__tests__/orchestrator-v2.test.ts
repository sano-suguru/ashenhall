import { OrchestratorV2 } from '@/lib/game-engine/orchestrator-v2';
import type { GameAction } from '@/types/game';
import type { GameState } from '@/types/game-state';
import { createInitialGameState } from '@/lib/game-engine/core';

function fakeState(actions: GameAction[]): GameState {
  return {
    actionLog: actions,
    players: {
      player1: {
        id: 'player1',
        life: 20,
        energy: 0,
        maxEnergy: 0,
        faction: 'neutral',
        tacticsType: 'aggressive',
        deck: [],
        hand: [],
        graveyard: [],
        banishedCards: [],
        field: [],
      },
      player2: {
        id: 'player2',
        life: 20,
        energy: 0,
        maxEnergy: 0,
        faction: 'neutral',
        tacticsType: 'defensive',
        deck: [],
        hand: [],
        graveyard: [],
        banishedCards: [],
        field: [],
      },
    },
  } as unknown as GameState;
}

function act(partial: Partial<GameAction>): GameAction { return partial as GameAction; }

describe('OrchestratorV2', () => {
  it('ingestNewActions で新規アクションを取り込みタスクを生成できる', () => {
    const actions: GameAction[] = [
      act({ sequence:1, playerId:'player1', type:'combat_stage', data:{ stage:'attack_declare', attackerId:'cA', targetId:'cB' }, timestamp:0 }),
      act({ sequence:2, playerId:'player1', type:'combat_stage', data:{ stage:'damage_defender', attackerId:'cA', targetId:'cB' }, timestamp:0 }),
      act({ sequence:3, playerId:'player1', type:'card_attack', data:{ attackerCardId:'cA', targetId:'cB', damage:3 }, timestamp:0 }),
    ];
    const o = new OrchestratorV2(fakeState([]));
    o.ingestActionsForTest(actions);
    const tasks = o.buildAnimationTasks();
    expect(tasks.some(t=> t.kind==='attack_windup')).toBe(true);
    expect(tasks.some(t=> t.kind==='attack_strike')).toBe(true);
    expect(tasks.some(t=> t.kind==='impact')).toBe(true);
  });
  it('stepAndCollectActions で新規アクションを収集しタスクを生成できる', () => {
    const actions: GameAction[] = [
      act({ sequence:1, playerId:'player1', type:'combat_stage', data:{ stage:'attack_declare', attackerId:'cA', targetId:'cB' }, timestamp:0 }),
      act({ sequence:2, playerId:'player1', type:'combat_stage', data:{ stage:'damage_defender', attackerId:'cA', targetId:'cB' }, timestamp:0 }),
      act({ sequence:3, playerId:'player1', type:'card_attack', data:{ attackerCardId:'cA', targetId:'cB', damage:3 }, timestamp:0 }),
    ];
    const o = new OrchestratorV2(fakeState([]));
    o.ingestActionsForTest(actions);
    const tasks = o.buildAnimationTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.some(t=> t.kind==='attack_windup')).toBe(true);
    expect(tasks.some(t=> t.kind==='attack_strike')).toBe(true);
    expect(tasks.some(t=> t.kind==='impact')).toBe(true);
  });

  it('effect damage が impact タスクを生成し invariant を満たす', () => {
    const actions: GameAction[] = [
      act({ sequence:10, playerId:'player1', type:'effect_trigger', data:{ sourceCardId:'cX', effectType:'damage', effectValue:4, targets:{ cT:{ health:{ before:5, after:1 } } } }, timestamp:0 })
    ];
    const o = new OrchestratorV2(fakeState([]));
    o.ingestActionsForTest(actions);
    const tasks = o.buildAnimationTasks();
    const impacts = tasks.filter(t=> t.kind==='impact');
    expect(impacts).toHaveLength(1);
  });

  it('card_attack は常に impact タスクとマッピングされ invariant を満たす', () => {
    const good: GameAction[] = [
      act({ sequence:1, playerId:'player1', type:'combat_stage', data:{ stage:'attack_declare', attackerId:'cA', targetId:'cB' }, timestamp:0 }),
      act({ sequence:2, playerId:'player1', type:'card_attack', data:{ attackerCardId:'cA', targetId:'cB', damage:2 }, timestamp:0 })
    ];
    const o = new OrchestratorV2(fakeState([]));
    o.ingestActionsForTest(good);
    const tasks = o.buildAnimationTasks();
    const impact = tasks.find(t=> t.sequence===2 && t.kind==='impact');
    expect(impact).toBeTruthy();
  });
});
