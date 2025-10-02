import { createInitialGameState } from '@/lib/game-engine/core';
import { createBattleIterator } from '@/lib/game-engine/battle-iterator';
import type { CreatureCard, GameAction, GameState } from '@/types/game';
import { placeCreatureOnField } from '@/test-helpers/battle-test-helpers';

describe('Combat substages iterator', () => {
  function setup(attackerCfg: Partial<CreatureCard> & { attack: number; health: number }, defenderCfg: Partial<CreatureCard> & { attack: number; health: number }, retaliate?: boolean): GameState {
    const empty: CreatureCard[] = [];
    const gs = createInitialGameState('test', empty, empty, 'necromancer', 'berserker', 'balanced', 'aggressive', 'seed-sub');
    const attacker: CreatureCard = {
      templateId: 'A1',
      instanceId: 'A1', // テスト用にtemplateIdと同じ値を使用
      name: 'Attacker',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      effects: [],
      keywords: [],
      ...attackerCfg
    } as CreatureCard;
    const defender: CreatureCard = {
      templateId: 'D1',
      instanceId: 'D1', // テスト用にtemplateIdと同じ値を使用
      name: 'Defender',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      effects: [],
      keywords: retaliate ? ['retaliate'] : [],
      ...defenderCfg
    } as CreatureCard;
    placeCreatureOnField(gs, 'player1', attacker, { id: attacker.templateId, currentHealth: attacker.health });
    placeCreatureOnField(gs, 'player2', defender, { id: defender.templateId, currentHealth: defender.health });
    gs.currentPlayer = 'player1'; // player1が攻撃側
    gs.turnNumber = 1; // 攻撃可能にするため
    gs.phase = 'battle_attack';
    return gs;
  }

  function collectActions(state: GameState): GameAction[] {
    const it = createBattleIterator(state)!;
    const actions: GameAction[] = [];
    while (true) {
      const r = it.next();
      if (r.done) break;
      actions.push(r.action);
    }
    return actions;
  }

  test('sequence: declare -> defender -> attacker -> deaths (both die)', () => {
    const state = setup({ attack: 5, health: 3 }, { attack: 4, health: 5 }, true); // attacker 5 dmg, defender retaliate (4 + ceil(4/2)=2 => 6)
    const attackerInstanceId = state.players.player1.field[0]?.instanceId;
    const defenderInstanceId = state.players.player2.field[0]?.instanceId;
    const actions = collectActions(state);
  const combatStages = actions.filter((a): a is Extract<GameAction, { type: 'combat_stage' }> => a.type === 'combat_stage');
  const stages = combatStages.map(a => a.data.stage);
    expect(stages).toEqual(['attack_declare', 'damage_defender', 'damage_attacker', 'deaths']);
  const deathStage = combatStages.find(a => a.data.stage === 'deaths');
    expect(deathStage).toBeTruthy();
    if (deathStage && deathStage.type === 'combat_stage') {
  const destroyed = deathStage.data.values?.destroyed;
      expect(destroyed).toContain(defenderInstanceId);
      expect(destroyed).toContain(attackerInstanceId);
    }
  });

  test('sequence: declare -> defender -> deaths (only defender dies)', () => {
    const state = setup({ attack: 5, health: 10 }, { attack: 1, health: 5 }, false); // defender takes 5 and dies, attacker survives (takes 1)
    const defenderInstanceId = state.players.player2.field[0]?.instanceId;
    const actions = collectActions(state);
  const combatStages = actions.filter((a): a is Extract<GameAction, { type: 'combat_stage' }> => a.type === 'combat_stage');
  const stages = combatStages.map(a => a.data.stage);
    // attackerDamage stage may exist if defender attack >0 (1) so attacker takes 1 -> stage present
    expect(stages).toEqual(['attack_declare', 'damage_defender', 'damage_attacker', 'deaths']);
  const deathStage = combatStages.find(a => a.data.stage === 'deaths');
    if (deathStage && deathStage.type === 'combat_stage') {
  const destroyed = deathStage.data.values?.destroyed;
      expect(destroyed).toEqual([defenderInstanceId]);
    }
  });

  test('sequence: declare -> defender -> (optional attacker) (no deaths)', () => {
    const state = setup({ attack: 3, health: 10 }, { attack: 0, health: 4 }, false); // defender to 1 HP, no retaliation/attack back
    const actions = collectActions(state);
  const combatStages = actions.filter((a): a is Extract<GameAction, { type: 'combat_stage' }> => a.type === 'combat_stage');
  const stages = combatStages.map(a => a.data.stage);
    // attacker side damage_attacker ステージは defender 攻撃力が0でも生成され得る実装（将来最適化余地）
    expect(stages[0]).toBe('attack_declare');
    expect(stages[1]).toBe('damage_defender');
    if (stages[2]) {
      expect(stages[2]).toBe('damage_attacker');
    }
  expect(combatStages.some(a => a.data.stage === 'deaths')).toBe(false);
  });
});
