import { buildEventBatches } from '@/lib/animation/event-batch-builder';
import { buildAnimationTasksFromBatches } from '@/lib/animation/animation-tasks';
import type { GameAction } from '@/types/game';
import type { PlayerId, GamePhase } from '@/types/core';

const P1: PlayerId = 'player1';
const P2: PlayerId = 'player2';
const PH_BATTLE: GamePhase = 'battle';
const PH_BATTLE_ATTACK: GamePhase = 'battle_attack';

function makeAction(partial: Partial<GameAction>): GameAction { return partial as GameAction; }

describe('buildEventBatches', () => {
  it('attack サブステージを1バッチへまとめる', () => {
    const actions: GameAction[] = [
  makeAction({ sequence: 1, playerId: P1, type: 'combat_stage', data: { stage: 'attack_declare', attackerId: 'cA', targetId: 'cB' }, timestamp: 0 }),
  makeAction({ sequence: 2, playerId: P1, type: 'combat_stage', data: { stage: 'damage_defender', attackerId: 'cA', targetId: 'cB' }, timestamp: 0 }),
  makeAction({ sequence: 3, playerId: P1, type: 'card_attack', data: { attackerCardId: 'cA', targetId: 'cB', damage: 3 }, timestamp: 0 }),
  makeAction({ sequence: 4, playerId: P1, type: 'creature_destroyed', data: { destroyedCardId: 'cB', source: 'combat', cardSnapshot: { id:'cB', owner:P2, name:'X', attackTotal:1, healthTotal:1, currentHealth:0, baseAttack:1, baseHealth:1, keywords:[] } }, timestamp: 0 }),
    ];
    const batches = buildEventBatches(actions);
    expect(batches).toHaveLength(1);
    expect(batches[0].kind).toBe('attack');
    expect(batches[0].actions.map(a=>a.sequence)).toEqual([1,2,3,4]);
    // バッチからタスクを生成し batchId / origin を確認
    const tasks = buildAnimationTasksFromBatches(batches);
    expect(tasks.every(t => t.batchId === batches[0].id)).toBe(true);
    expect(tasks.every(t => t.origin === 'attack' || t.kind === 'destroy' || t.kind === 'impact')).toBe(true);
  });

  it('effect damage を個別バッチ化', () => {
    const actions: GameAction[] = [
  makeAction({ sequence: 10, playerId: P1, type: 'effect_trigger', data: { sourceCardId:'cX', effectType:'damage', effectValue:2, targets:{ cT:{ health:{ before:5, after:3 } } } }, timestamp:0 }),
    ];
    const batches = buildEventBatches(actions);
    expect(batches).toHaveLength(1);
    expect(batches[0].kind).toBe('effect_damage');
    expect(batches[0].targetIds).toEqual(['cT']);
    const tasks = buildAnimationTasksFromBatches(batches);
    expect(tasks.every(t => t.origin === 'effect')).toBe(true);
  });

  it('混在列で attack/effect/other を分離', () => {
    const actions: GameAction[] = [
  makeAction({ sequence: 1, playerId:P1, type:'phase_change', data:{ fromPhase:PH_BATTLE, toPhase:PH_BATTLE_ATTACK }, timestamp:0 }),
  makeAction({ sequence: 2, playerId:P1, type:'combat_stage', data:{ stage:'attack_declare', attackerId:'cA', targetId:'cB' }, timestamp:0 }),
  makeAction({ sequence: 3, playerId:P1, type:'combat_stage', data:{ stage:'damage_defender', attackerId:'cA', targetId:'cB' }, timestamp:0 }),
  makeAction({ sequence: 4, playerId:P1, type:'effect_trigger', data:{ sourceCardId:'cS', effectType:'damage', effectValue:4, targets:{ cZ:{ health:{ before:6, after:2 } } } }, timestamp:0 }),
    ];
    const batches = buildEventBatches(actions);
    expect(batches.map(b=>b.kind)).toEqual(['other','attack','effect_damage']);
  });
});
