import { createInitialGameState } from '@/lib/game-engine/core';
import type { Card, GameState, FieldCard } from '@/types/game';
import { evaluatePendingDeaths } from '@/lib/game-engine/death-sweeper';

// テスト補助: 簡易フィールド配置
function setupState(partial?: Partial<GameState>): GameState {
  const deckStub: Card[] = [];
  const state = createInitialGameState('g', deckStub, deckStub, 'knight', 'knight', 'seed');
  // デッキ空で問題ない（フィールド直接差し込み）
  Object.assign(state, partial);
  return state;
}

function pushCreature(state: GameState, owner: 'player1' | 'player2', card: Partial<FieldCard> & { templateId: string; name: string }): FieldCard {
  const base: FieldCard = {
    templateId: card.templateId,
    instanceId: `test-${card.templateId}-${Date.now()}-${Math.random()}`,
    name: card.name,
    type: 'creature',
    owner,
    position: 0,
    health: 1,
    attack: 1,
    currentHealth: 1,
    attackModifier: 0,
    healthModifier: 0,
    passiveAttackModifier: 0,
    passiveHealthModifier: 0,
    keywords: [],
    effects: [],
    statusEffects: [],
    summonTurn: 0,
    hasAttacked: false,
    isSilenced: false,
    isStealthed: false,
    readiedThisTurn: false,
    faction: 'knight',
    cost: 0,
  };
  const inst: FieldCard = { ...base, ...card } as FieldCard;
  const field = state.players[owner].field;
  inst.position = field.length;
  field.push(inst);
  return inst;
}

describe('Death Sweep Edge Cases', () => {
  test('simultaneous multi death is fully swept', () => {
    const state = setupState();
  pushCreature(state, 'player1', { templateId: 'cA', name: 'A', currentHealth: 0 });
  pushCreature(state, 'player1', { templateId: 'cB', name: 'B', currentHealth: 0 });
    expect(state.players.player1.field.length).toBe(2);
    // 直接 sweep 実行
    evaluatePendingDeaths(state, 'system');
    expect(state.players.player1.field.length).toBe(0);
    expect(state.players.player1.graveyard.map(c => c.templateId).sort()).toEqual(['cA','cB']);
  });

  test('passive recalculation induced death is swept', () => {
    const state = setupState();
    // 高い passiveHealthModifier を仮で与え、後で 0 に戻す過程を模擬
    const card = pushCreature(state, 'player1', { templateId: 'cP', name: 'P', currentHealth: 3, health: 1, passiveHealthModifier: 2 });
    // パッシブリセット相当: passiveHealthModifier を 0 にし currentHealth 減算を手動で再現
    card.currentHealth -= card.passiveHealthModifier;
    card.passiveHealthModifier = 0;
    // これで currentHealth=1 → さらに直接 1 ダメージ相当で 0 に
    card.currentHealth = 0;
    evaluatePendingDeaths(state, 'passive');
    expect(state.players.player1.field.find(c => c.templateId === 'cP')).toBeUndefined();
    expect(state.players.player1.graveyard.find(c => c.templateId === 'cP')).toBeDefined();
  });

  test('trigger chain third-party death is swept', () => {
    const state = setupState();
    // A (攻撃者), B (防御), X (第三者) を配置
  const attacker = pushCreature(state, 'player1', { templateId: 'atk', name: 'Attacker', attack: 2 });
  pushCreature(state, 'player2', { templateId: 'def', name: 'Defender', health: 1, currentHealth: 1 });
    const third = pushCreature(state, 'player2', { templateId: 'thr', name: 'Third', health: 1, currentHealth: 1 });
    // 疑似的に第三者へダメージ: currentHealth を 0 に落とす (チェーン結果想定)
    third.currentHealth = 0;
    // 次ステップ進行（battle フェーズへ遷移 -> attack 処理などで sweep 発火端点が動くが、直接 sweep 呼び出しで保証）
    evaluatePendingDeaths(state, 'trigger', attacker.templateId);
    expect(state.players.player2.field.find(c => c.templateId === 'thr')).toBeUndefined();
    expect(state.players.player2.graveyard.find(c => c.templateId === 'thr')).toBeDefined();
  });
});
