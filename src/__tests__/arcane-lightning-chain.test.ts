/**
 * 秘術の連雷 - 連鎖ダメージシステム テスト
 * 
 * 設計検証:
 * - 第一の雷で敵を倒した場合の連鎖発動
 * - 第一の雷で敵を倒せなかった場合の連鎖不発
 * - エッジケース（敵1体のみ、対象なし等）
 * - 決定論性の保証
 * - アクションログの正確性
 */

import { describe, test, expect } from '@jest/globals';
import { executeCardEffect } from '@/lib/game-engine/card-effects';
import { createInitialGameState } from '@/lib/game-engine/core';
import { mageCards } from '@/data/cards/base-cards';
import type { FieldCard, GameState } from '@/types/game';

interface TestCreatureData {
  templateId: string;
  name: string;
  type: 'creature';
  faction: 'berserker' | 'knight' | 'mage' | 'necromancer' | 'inquisitor';
  cost: number;
  attack: number;
  health: number;
  keywords: [];
  effects: [];
}

describe('秘術の連雷 - 連鎖ダメージシステム', () => {
  const createTestGameState = (): GameState => {
    const testDeck = mageCards.slice(0, 6).map((card, i) => ({ ...card, instanceId: `deck-${i}` }));
    return createInitialGameState(
      'test-chain',
      testDeck,
      testDeck,
      'mage',
      'mage',
      'balanced',
      'balanced',
      'fixed-seed-arcane-123'
    );
  };

  const createTestFieldCard = (cardData: TestCreatureData, owner: 'player1' | 'player2' = 'player1'): FieldCard => ({
    ...cardData,
    instanceId: `test-instance-${Date.now()}-${Math.random()}`,
    owner,
    currentHealth: cardData.health,
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
  });

  test('第一の雷で敵を倒した場合、別の敵へ第二の雷が発動する', () => {
    const state = createTestGameState();
    
    // 敵を2体配置（両方HP3で確実に倒せる）
    const enemy1 = createTestFieldCard({
      templateId: 'enemy1_weak',
      name: '弱敵1',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    const enemy2 = createTestFieldCard({
      templateId: 'enemy2_weak',
      name: '弱敵2',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    state.players.player2.field.push(enemy1, enemy2);
    
    const arcaneLightningTemplate = mageCards.find(c => c.templateId === 'mag_arcane_lightning')!;
    const arcaneLightning = { ...arcaneLightningTemplate, instanceId: 'test-arcane-1' };
    executeCardEffect(state, arcaneLightning.effects[0], arcaneLightning, 'player1');
    
    // 検証: 第一の雷で1体死亡、第二の雷で残り1体に2ダメージ
    const totalDead = state.players.player2.graveyard.length;
    const totalAlive = state.players.player2.field.filter(c => c.currentHealth > 0).length;
    
    expect(totalDead).toBe(1); // 第一の雷で1体死亡
    expect(totalAlive).toBe(1); // 残り1体は生存（HP3 - 2 = HP1）
    
    // 生存者は2ダメージ受けてHP1になっているはず
    const survivor = state.players.player2.field[0];
    expect(survivor.currentHealth).toBe(1); // HP3 - 2 = HP1
  });

  test('第一の雷で敵を倒せなかった場合、第二の雷は発動しない', () => {
    const state = createTestGameState();
    
    // HP5の敵（3ダメージでは倒せない）
    const tankEnemy = createTestFieldCard({
      templateId: 'tank_enemy',
      name: 'タンク敵',
      type: 'creature',
      faction: 'knight',
      cost: 2,
      attack: 1,
      health: 5,
      keywords: [],
      effects: [],
    }, 'player2');
    
    state.players.player2.field.push(tankEnemy);
    
    const arcaneLightningTemplate = mageCards.find(c => c.templateId === 'mag_arcane_lightning')!;
    const arcaneLightning = { ...arcaneLightningTemplate, instanceId: 'test-arcane-2' };
    executeCardEffect(state, arcaneLightning.effects[0], arcaneLightning, 'player1');
    
    // 3ダメージのみ、連鎖なし
    expect(tankEnemy.currentHealth).toBe(2); // 5 - 3 = 2
    expect(state.players.player2.graveyard.length).toBe(0);
  });

  test('敵が1体のみの場合、第二の雷の対象がいない', () => {
    const state = createTestGameState();
    
    const singleEnemy = createTestFieldCard({
      templateId: 'single_enemy',
      name: '単独の敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    state.players.player2.field.push(singleEnemy);
    
    const arcaneLightningTemplate = mageCards.find(c => c.templateId === 'mag_arcane_lightning')!;
    const arcaneLightning = { ...arcaneLightningTemplate, instanceId: 'test-arcane-3' };
    executeCardEffect(state, arcaneLightning.effects[0], arcaneLightning, 'player1');
    
    // 1体死亡、連鎖対象なしでエラーなし
    expect(state.players.player2.field.length).toBe(0);
    expect(state.players.player2.graveyard.length).toBe(1);
  });

  test('敵がいない場合、何も起こらない', () => {
    const state = createTestGameState();
    
    // 敵を配置しない
    
    const arcaneLightningTemplate = mageCards.find(c => c.templateId === 'mag_arcane_lightning')!;
    const arcaneLightning = { ...arcaneLightningTemplate, instanceId: 'test-arcane-4' };
    executeCardEffect(state, arcaneLightning.effects[0], arcaneLightning, 'player1');
    
    // 何も変化なし
    expect(state.players.player2.field.length).toBe(0);
    expect(state.players.player2.graveyard.length).toBe(0);
  });

  test('アクションログに2回のダメージが記録される', () => {
    const state = createTestGameState();
    
    const enemy1 = createTestFieldCard({
      templateId: 'enemy1',
      name: '敵1',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    const enemy2 = createTestFieldCard({
      templateId: 'enemy2',
      name: '敵2',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    state.players.player2.field.push(enemy1, enemy2);
    
    const arcaneLightningTemplate = mageCards.find(c => c.templateId === 'mag_arcane_lightning')!;
    const arcaneLightning = { ...arcaneLightningTemplate, instanceId: 'test-arcane-5' };
    executeCardEffect(state, arcaneLightning.effects[0], arcaneLightning, 'player1');
    
    // ダメージアクションが2回記録されている
    const damageActions = state.actionLog.filter(
      action => action.type === 'effect_trigger'
    );
    
    const effectTriggerActions = damageActions.filter(a => 
      a.data && 'effectType' in a.data && a.data.effectType === 'damage'
    );
    
    expect(effectTriggerActions.length).toBe(2); // 第一の雷 + 第二の雷
  });

  test('決定論性：同じシードで同じ結果', () => {
    const seed = 'deterministic-chain-test';
    
    const createTestWithSeed = () => {
      const testDeck = mageCards.slice(0, 6).map((card, i) => ({ ...card, instanceId: `det-deck-${i}` }));
      const state = createInitialGameState(
        'test-det', 
        testDeck, 
        testDeck,
        'mage', 
        'mage', 
        'balanced', 
        'balanced', 
        seed
      );
      
      const e1 = createTestFieldCard({
        templateId: 'det_enemy1',
        name: '決定論敵1',
        type: 'creature',
        faction: 'berserker',
        cost: 1,
        attack: 1,
        health: 3,
        keywords: [],
        effects: [],
      }, 'player2');
      
      const e2 = createTestFieldCard({
        templateId: 'det_enemy2',
        name: '決定論敵2',
        type: 'creature',
        faction: 'berserker',
        cost: 1,
        attack: 1,
        health: 3,
        keywords: [],
        effects: [],
      }, 'player2');
      
      state.players.player2.field.push(e1, e2);
      
      const arcaneLightningTemplate = mageCards.find(c => c.templateId === 'mag_arcane_lightning')!;
      const arcaneLightning = { ...arcaneLightningTemplate, instanceId: 'test-arcane-det' };
      executeCardEffect(state, arcaneLightning.effects[0], arcaneLightning, 'player1');
      
      return state.players.player2.field.map(c => c.currentHealth);
    };
    
    const result1 = createTestWithSeed();
    const result2 = createTestWithSeed();
    
    // 完全に同じ結果
    expect(result1).toEqual(result2);
  });

  test('複数の敵がいる場合、instanceIdで正しく区別される', () => {
    const state = createTestGameState();
    
    // 同じtemplateIdの敵を3体配置（instanceIdは異なる）
    const enemy1 = createTestFieldCard({
      templateId: 'same_template',
      name: '同種敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    const enemy2 = createTestFieldCard({
      templateId: 'same_template',
      name: '同種敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    const enemy3 = createTestFieldCard({
      templateId: 'same_template',
      name: '同種敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 3,
      keywords: [],
      effects: [],
    }, 'player2');
    
    state.players.player2.field.push(enemy1, enemy2, enemy3);
    
    const arcaneLightningTemplate = mageCards.find(c => c.templateId === 'mag_arcane_lightning')!;
    const arcaneLightning = { ...arcaneLightningTemplate, instanceId: 'test-arcane-6' };
    executeCardEffect(state, arcaneLightning.effects[0], arcaneLightning, 'player1');
    
    // 1体死亡、残り2体のうち1体が2ダメージ、1体が無傷
    expect(state.players.player2.graveyard.length).toBe(1);
    expect(state.players.player2.field.length).toBe(2);
    
    const damagedCount = state.players.player2.field.filter(
      c => c.currentHealth < c.health
    ).length;
    
    // 第二の雷の対象は1体のみ
    expect(damagedCount).toBe(1);
  });
});
