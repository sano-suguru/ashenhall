/**
 * カード効果システム テスト
 * 
 * 各勢力の特色ある効果が正しく動作することを検証
 */

import { describe, test, expect } from '@jest/globals';
import { executeCardEffect, processEffectTrigger, applyPassiveEffects, handleCreatureDeath } from '@/lib/game-engine/card-effects';
import { createInitialGameState } from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards, mageCards, knightCards, inquisitorCards } from '@/data/cards/base-cards';
import { hasBrandedStatus, getBrandedCreatureCount, hasAnyBrandedEnemy } from '@/lib/game-engine/brand-utils';
import type { GameState, FieldCard, Card, CardEffect, CreatureCard } from '@/types/game';
import type { Keyword } from '@/types/effects';

describe('カード効果システム', () => {
  // テスト用のゲーム状態を作成
  const createTestGameState = (): GameState => {
    const testDeck = necromancerCards.slice(0, 6);
    return createInitialGameState(
      'test-effects',
      testDeck,
      testDeck,
      'necromancer',
      'necromancer',
      'balanced',
      'balanced',
      'test-seed-effects'
    );
  };

  // テスト用のフィールドカードを作成
  const createTestFieldCard = (cardData: CreatureCard, owner: 'player1' | 'player2' = 'player1'): FieldCard => ({
    ...cardData,
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

  describe('基本的な効果処理', () => {
    test('ダメージ効果が正しく適用される', () => {
      const gameState = createTestGameState();
      
      // テスト用ダメージ効果カード
      const sourceCard = createTestFieldCard({
        id: 'damage_test',
        name: 'ダメージテスト',
        type: 'creature',
        faction: 'mage',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'enemy_all',
          action: 'damage',
          value: 2,
        }],
      });

      // 敵カードを配置
      const enemyCard = createTestFieldCard({
        id: 'enemy_test',
        name: '敵テスト',
        type: 'creature',
        faction: 'berserker',
        cost: 1,
        attack: 2,
        health: 3,
        keywords: [],
        effects: [],
      });
      gameState.players.player2.field.push(enemyCard);

      // ダメージ効果実行
      executeCardEffect(gameState, sourceCard.effects[0], sourceCard, 'player1');

      // 敵カードの体力が2減少していることを確認
      expect(gameState.players.player2.field[0].currentHealth).toBe(1);
    });

    test('回復効果が正しく適用される', () => {
      const gameState = createTestGameState();
      
      // 味方カードを配置（ダメージを受けた状態）
      const allyCard = createTestFieldCard({
        id: 'ally_test',
        name: '味方テスト',
        type: 'creature',
        faction: 'knight',
        cost: 2,
        attack: 2,
        health: 4,
        keywords: [],
        effects: [],
      });
      allyCard.currentHealth = 2; // ダメージを受けている状態
      gameState.players.player1.field.push(allyCard);

      // 回復効果カード
      const healerCard = createTestFieldCard({
        id: 'healer_test',
        name: 'ヒーラーテスト',
        type: 'creature',
        faction: 'knight',
        cost: 2,
        attack: 1,
        health: 3,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'ally_all',
          action: 'heal',
          value: 2,
        }],
      });

      // 回復効果実行
      executeCardEffect(gameState, healerCard.effects[0], healerCard, 'player1');

      // 味方カードの体力が回復していることを確認
      expect(gameState.players.player1.field[0].currentHealth).toBe(4);
    });

    test('攻撃力バフが正しく適用される', () => {
      const gameState = createTestGameState();
      
      // 味方カードを配置
      const allyCard = createTestFieldCard({
        id: 'ally_test',
        name: '味方テスト',
        type: 'creature',
        faction: 'berserker',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [],
      });
      gameState.players.player1.field.push(allyCard);

      // バフ効果カード
      const bufferCard = createTestFieldCard({
        id: 'buffer_test',
        name: 'バッファーテスト',
        type: 'creature',
        faction: 'berserker',
        cost: 2,
        attack: 1,
        health: 2,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'ally_all',
          action: 'buff_attack',
          value: 2,
        }],
      });

      // バフ効果実行
      executeCardEffect(gameState, bufferCard.effects[0], bufferCard, 'player1');

      // 味方カードの攻撃力が+2されていることを確認
      expect(gameState.players.player1.field[0].attackModifier).toBe(2);
    });

    test('体力デバフが正しく適用される', () => {
      const gameState = createTestGameState();
      
      // 敵カードを配置
      const enemyCard = createTestFieldCard({
        id: 'enemy_test',
        name: '敵テスト',
        type: 'creature',
        faction: 'knight',
        cost: 2,
        attack: 2,
        health: 4,
        keywords: [],
        effects: [],
      });
      gameState.players.player2.field.push(enemyCard);

      // デバフ効果カード
      const debufferCard = createTestFieldCard({
        id: 'debuffer_test',
        name: 'デバッファーテスト',
        type: 'creature',
        faction: 'inquisitor',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'enemy_all',
          action: 'debuff_health',
          value: 1,
        }],
      });

      // デバフ効果実行
      executeCardEffect(gameState, debufferCard.effects[0], debufferCard, 'player1');

      // 敵カードの体力が-1されていることを確認
      expect(gameState.players.player2.field[0].healthModifier).toBe(-1);
      expect(gameState.players.player2.field[0].currentHealth).toBe(3); // 最大体力減少により調整
    });

    test('トークン召喚が正しく動作する', () => {
      const gameState = createTestGameState();
      
      // 召喚効果カード
      const summonerCard = createTestFieldCard({
        id: 'summoner_test',
        name: 'サモナーテスト',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 1,
        health: 3,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'self',
          action: 'summon',
          value: 1,
        }],
      });

      const initialFieldSize = gameState.players.player1.field.length;

      // 召喚効果実行
      executeCardEffect(gameState, summonerCard.effects[0], summonerCard, 'player1');

      // 場にトークンが追加されていることを確認
      expect(gameState.players.player1.field.length).toBe(initialFieldSize + 1);
      
      const token = gameState.players.player1.field[gameState.players.player1.field.length - 1];
      expect(token.name).toBe('トークン');
      expect(token.attack).toBe(1);
      expect(token.health).toBe(1);
    });

    test('カードドロー効果が正しく動作する', () => {
      const gameState = createTestGameState();
      
      // ドロー効果カード
      const drawerCard = createTestFieldCard({
        id: 'drawer_test',
        name: 'ドローテスト',
        type: 'creature',
        faction: 'mage',
        cost: 1,
        attack: 1,
        health: 1,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'self',
          action: 'draw_card',
          value: 1,
        }],
      });

      const initialHandSize = gameState.players.player1.hand.length;
      const initialDeckSize = gameState.players.player1.deck.length;

      // ドロー効果実行
      executeCardEffect(gameState, drawerCard.effects[0], drawerCard, 'player1');

      // 手札が1枚増加していることを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
      expect(gameState.players.player1.deck.length).toBe(initialDeckSize - 1);
  });
});

describe('Brand System', () => {
  test('apply_brand effect adds branded status to target', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場にクリーチャーを配置
    const enemyCreature = createTestFieldCard({
      id: 'necro_skeleton',
      name: '骸骨剣士',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 2,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemyCreature);
    
    // 《罪の重圧》カードの烙印効果をテスト
    const brandEffect: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'apply_brand',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_sin_burden',
      name: '罪の重圧',
      type: 'spell' as const,
      faction: 'inquisitor' as const,
      cost: 1,
      keywords: [],
      effects: [brandEffect],
    };
    
    // 烙印効果を実行
    executeCardEffect(gameState, brandEffect, sourceCard, 'player1');
    
    // 敵クリーチャーに烙印が付与されたことを確認
    expect(enemyCreature.statusEffects).toEqual([{ type: 'branded' }]);
    
    // アクションログに記録されていることを確認
    const brandAction = gameState.actionLog.find(action => 
      action.type === 'effect_trigger' && 
      action.data.effectType === 'apply_brand'
    );
    expect(brandAction).toBeDefined();
  });

  test('duplicate brand application has no effect', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場にクリーチャーを配置
    const enemyCreature = createTestFieldCard({
      id: 'necro_skeleton',
      name: '骸骨剣士',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 2,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemyCreature);
    
    const brandEffect: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'apply_brand',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_sin_burden',
      name: '罪の重圧',
      type: 'spell' as const,
      faction: 'inquisitor' as const,
      cost: 1,
      keywords: [],
      effects: [brandEffect],
    };
    
    // 最初の烙印付与
    executeCardEffect(gameState, brandEffect, sourceCard, 'player1');
    
    // 烙印が付与されたことを確認
    expect(enemyCreature.statusEffects).toEqual([{ type: 'branded' }]);
    
    // 2回目の烙印付与試行
    executeCardEffect(gameState, brandEffect, sourceCard, 'player1');
    
    // 烙印が重複していないことを確認（まだ1つだけ）
    expect(enemyCreature.statusEffects).toEqual([{ type: 'branded' }]);
  });

  test('branded status persists across turns', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場にクリーチャーを配置
    const enemyCreature = createTestFieldCard({
      id: 'necro_skeleton',
      name: '骸骨剣士',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 2,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemyCreature);
    
    const brandEffect: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'apply_brand',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_sin_burden',
      name: '罪の重圧',
      type: 'spell' as const,
      faction: 'inquisitor' as const,
      cost: 1,
      keywords: [],
      effects: [brandEffect],
    };
    
    // 烙印を付与
    executeCardEffect(gameState, brandEffect, sourceCard, 'player1');
    
    // 烙印が付与されたことを確認
    expect(enemyCreature.statusEffects).toEqual([{ type: 'branded' }]);
    
    // ターンを進める（毒やスタンとは異なり、烙印は持続ターン数が減らない）
    gameState.turnNumber += 1;
    
    // 烙印がまだ残っていることを確認
    expect(enemyCreature.statusEffects).toEqual([{ type: 'branded' }]);
  });
});

describe('Brand Condition System', () => {
  test('《集団懺悔》 dynamic healing based on branded enemy count', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に複数クリーチャーを配置
    const enemy1 = createTestFieldCard({
      id: 'enemy1',
      name: 'エネミー1',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    const enemy2 = createTestFieldCard({
      id: 'enemy2',
      name: 'エネミー2', 
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemy1, enemy2);
    
    // 敵2体に烙印を付与
    enemy1.statusEffects.push({ type: 'branded' });
    enemy2.statusEffects.push({ type: 'branded' });
    
    // プレイヤー1のライフを減らしておく
    gameState.players.player1.life = 10;
    
    // 《集団懺悔》の効果をテスト
    const healEffect: CardEffect = {
      trigger: 'on_play',
      target: 'player',
      action: 'heal',
      value: 2, // 動的に解決される
    };
    
    const sourceCard = {
      id: 'inq_collective_confession',
      name: '集団懺悔',
      type: 'spell' as const,
      faction: 'inquisitor' as const,
      cost: 2,
      keywords: [],
      effects: [healEffect],
    };
    
    // 効果を実行
    executeCardEffect(gameState, healEffect, sourceCard, 'player1');
    
    // 基本回復2 + 烙印敵2体 = 4回復されていることを確認
    expect(gameState.players.player1.life).toBe(14); // 10 + 4 = 14
  });

  test('《信仰の鎖》 conditional draw based on branded enemy', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場にクリーチャーを配置
    const enemyCreature = createTestFieldCard({
      id: 'necro_skeleton',
      name: '骸骨剣士',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemyCreature);
    
    // 敵に烙印を付与
    enemyCreature.statusEffects.push({ type: 'branded' });
    
    const initialHandSize = gameState.players.player1.hand.length;
    
    // 《信仰の鎖》の条件付きドロー効果をテスト
    const drawEffect: CardEffect = {
      trigger: 'on_play',
      target: 'self',
      action: 'draw_card',
      value: 1,
      condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 1 },
    };
    
    const sourceCard = {
      id: 'inq_chain_of_faith',
      name: '信仰の鎖',
      type: 'spell' as const,
      faction: 'inquisitor' as const,
      cost: 2,
      keywords: [],
      effects: [drawEffect],
    };
    
    // 効果を実行
    executeCardEffect(gameState, drawEffect, sourceCard, 'player1');
    
    // 烙印を持つ敵がいるので、ドローが発動し手札が1枚増加
    expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
  });

  test('《信仰の鎖》 no draw when no branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場にクリーチャーを配置（烙印なし）
    const enemyCreature = createTestFieldCard({
      id: 'necro_skeleton',
      name: '骸骨剣士',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemyCreature);
    
    const initialHandSize = gameState.players.player1.hand.length;
    
    // 《信仰の鎖》の条件付きドロー効果をテスト
    const drawEffect: CardEffect = {
      trigger: 'on_play',
      target: 'self',
      action: 'draw_card',
      value: 1,
      condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 1 },
    };
    
    const sourceCard = {
      id: 'inq_chain_of_faith',
      name: '信仰の鎖',
      type: 'spell' as const,
      faction: 'inquisitor' as const,
      cost: 2,
      keywords: [],
      effects: [drawEffect],
    };
    
    // 効果を実行
    executeCardEffect(gameState, drawEffect, sourceCard, 'player1');
    
    // 烙印を持つ敵がいないので、ドローが発動せず手札は変化なし
    expect(gameState.players.player1.hand.length).toBe(initialHandSize);
  });
});

describe('Brand Condition System', () => {
  test('brand utility functions work correctly', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に複数クリーチャーを配置
    const enemy1 = createTestFieldCard({
      id: 'enemy1',
      name: 'エネミー1',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    const enemy2 = createTestFieldCard({
      id: 'enemy2', 
      name: 'エネミー2',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemy1, enemy2);
    
    // 1体だけに烙印を付与
    enemy1.statusEffects.push({ type: 'branded' });
    
    // 個別判定テスト
    expect(hasBrandedStatus(enemy1)).toBe(true);
    expect(hasBrandedStatus(enemy2)).toBe(false);
    
    // カウント機能テスト  
    expect(getBrandedCreatureCount(gameState.players.player2.field)).toBe(1);
    
    // 存在確認テスト
    expect(hasAnyBrandedEnemy(gameState, 'player1')).toBe(true);
  });
});

describe('Banish System', () => {
  test('《神罰の執行者》 banishes branded enemy without triggering death effects', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に烙印を持つクリーチャーを配置
    const brandedEnemy = createTestFieldCard({
      id: 'branded_target',
      name: '烙印付きクリーチャー',
      type: 'creature',
      faction: 'necromancer',
      cost: 2,
      attack: 2,
      health: 2,
      keywords: [],
      effects: [
        {
          trigger: 'on_death',
          target: 'ally_all',
          action: 'buff_attack',
          value: 2, // 死亡時効果
        },
      ],
    }, 'player2');
    brandedEnemy.statusEffects.push({ type: 'branded' });
    gameState.players.player2.field.push(brandedEnemy);
    
    // 他の敵クリーチャーも配置（死亡時効果の確認用）
    const otherEnemy = createTestFieldCard({
      id: 'other_enemy',
      name: '他の敵',
      type: 'creature',
      faction: 'necromancer',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(otherEnemy);
    
    const initialFieldSize = gameState.players.player2.field.length;
    const initialGraveyardSize = gameState.players.player2.graveyard.length;
    const initialBanishedSize = gameState.players.player2.banishedCards.length;
    
    // 《神罰の執行者》の消滅効果をテスト
    const banishEffect: CardEffect = {
      trigger: 'on_play',
      target: 'self',
      action: 'banish',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_divine_punisher',
      name: '神罰の執行者',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 3,
      attack: 3,
      health: 3,
      keywords: [],
      effects: [banishEffect],
    };
    
    // 消滅効果を実行
    executeCardEffect(gameState, banishEffect, sourceCard, 'player1');
    
    // 烙印を持つ敵が場から消えたことを確認
    expect(gameState.players.player2.field.length).toBe(initialFieldSize - 1);
    
    // 墓地に送られていないことを確認
    expect(gameState.players.player2.graveyard.length).toBe(initialGraveyardSize);
    
    // 消滅領域に送られたことを確認
    expect(gameState.players.player2.banishedCards.length).toBe(initialBanishedSize + 1);
    expect(gameState.players.player2.banishedCards[0].id).toBe('branded_target');
    
    // 他の敵クリーチャーの攻撃力が増加していないことを確認（死亡時効果が発動していない）
    expect(otherEnemy.attackModifier).toBe(0);
  });

  test('banish effect logs properly', () => {
    const gameState = createTestGameState();
    
    // 烙印を持つ敵クリーチャーを配置
    const brandedEnemy = createTestFieldCard({
      id: 'test_branded',
      name: 'テスト烙印',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    brandedEnemy.statusEffects.push({ type: 'branded' });
    gameState.players.player2.field.push(brandedEnemy);
    
    const banishEffect: CardEffect = {
      trigger: 'on_play',
      target: 'self',
      action: 'banish',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_divine_punisher',
      name: '神罰の執行者',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 3,
      attack: 3,
      health: 3,
      keywords: [],
      effects: [banishEffect],
    };
    
    // 消滅効果を実行
    executeCardEffect(gameState, banishEffect, sourceCard, 'player1');
    
    // アクションログに消滅効果が記録されていることを確認
    const banishAction = gameState.actionLog.find(action => 
      action.type === 'effect_trigger' && 
      action.data.effectType === 'banish'
    );
    expect(banishAction).toBeDefined();
  });

  test('banish effect does nothing when no branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // 烙印を持たない敵クリーチャーを配置
    const normalEnemy = createTestFieldCard({
      id: 'normal_enemy',
      name: '通常の敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(normalEnemy);
    
    const initialFieldSize = gameState.players.player2.field.length;
    const initialBanishedSize = gameState.players.player2.banishedCards.length;
    
    const banishEffect: CardEffect = {
      trigger: 'on_play',
      target: 'self',
      action: 'banish',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_divine_punisher',
      name: '神罰の執行者',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 3,
      attack: 3,
      health: 3,
      keywords: [],
      effects: [banishEffect],
    };
    
    // 消滅効果を実行
    executeCardEffect(gameState, banishEffect, sourceCard, 'player1');
    
    // 烙印を持たない敵は消滅しないため、場の状態は変化なし
    expect(gameState.players.player2.field.length).toBe(initialFieldSize);
    expect(gameState.players.player2.banishedCards.length).toBe(initialBanishedSize);
  });
});

describe('Sanctuary Guard', () => {
  test('《聖域の見張り》 applies brand on summoning', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に敵クリーチャーを配置
    const enemyCreature = createTestFieldCard({
      id: 'target_enemy',
      name: 'ターゲット敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemyCreature);
    
    // 《聖域の見張り》の烙印付与効果をテスト
    const brandEffect: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'apply_brand',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_sanctuary_guard',
      name: '聖域の見張り',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 3,
      attack: 2,
      health: 5,
      keywords: ['guard'] as Keyword[],
      effects: [brandEffect],
    };
    
    // 烙印付与効果を実行
    executeCardEffect(gameState, brandEffect, sourceCard, 'player1');
    
    // 敵クリーチャーに烙印が付与されたことを確認
    expect(enemyCreature.statusEffects).toEqual([{ type: 'branded' }]);
  });

  test('《聖域の見張り》 self-damage when no branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // プレイヤー1の場に《聖域の見張り》を配置
    const sanctuaryGuard = createTestFieldCard({
      id: 'inq_sanctuary_guard',
      name: '聖域の見張り',
      type: 'creature',
      faction: 'inquisitor',
      cost: 3,
      attack: 2,
      health: 5,
      keywords: ['guard'] as Keyword[],
      effects: [
        {
          trigger: 'turn_end',
          target: 'self',
          action: 'damage',
          value: 2,
          condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
        },
      ],
    }, 'player1');
    gameState.players.player1.field.push(sanctuaryGuard);
    
    // プレイヤー2の場に烙印を持たない敵を配置
    const normalEnemy = createTestFieldCard({
      id: 'normal_enemy',
      name: '通常の敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(normalEnemy);
    
    const initialHealth = sanctuaryGuard.currentHealth;
    
    // ターン終了時効果を発動（player1のターンとして）
    gameState.currentPlayer = 'player1';
    const selfDamageEffect: CardEffect = {
      trigger: 'turn_end',
      target: 'self',
      action: 'damage',
      value: 2,
      condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
    };
    
    executeCardEffect(gameState, selfDamageEffect, sanctuaryGuard, 'player1');
    
    // 自傷ダメージが発動し、体力が2減少していることを確認
    expect(sanctuaryGuard.currentHealth).toBe(initialHealth - 2); // 5 - 2 = 3
  });

  test('《聖域の見張り》 no self-damage when branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // プレイヤー1の場に《聖域の見張り》を配置
    const sanctuaryGuard = createTestFieldCard({
      id: 'inq_sanctuary_guard',
      name: '聖域の見張り',
      type: 'creature',
      faction: 'inquisitor',
      cost: 3,
      attack: 2,
      health: 5,
      keywords: ['guard'] as Keyword[],
      effects: [
        {
          trigger: 'turn_end',
          target: 'self',
          action: 'damage',
          value: 2,
          condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
        },
      ],
    }, 'player1');
    gameState.players.player1.field.push(sanctuaryGuard);
    
    // プレイヤー2の場に烙印を持つ敵を配置
    const brandedEnemy = createTestFieldCard({
      id: 'branded_enemy',
      name: '烙印付き敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    brandedEnemy.statusEffects.push({ type: 'branded' });
    gameState.players.player2.field.push(brandedEnemy);
    
    const initialHealth = sanctuaryGuard.currentHealth;
    
    // ターン終了時効果を発動（player1のターンとして）
    gameState.currentPlayer = 'player1';
    const selfDamageEffect: CardEffect = {
      trigger: 'turn_end',
      target: 'self',
      action: 'damage',
      value: 2,
      condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
    };
    
    executeCardEffect(gameState, selfDamageEffect, sanctuaryGuard, 'player1');
    
    // 烙印を持つ敵がいるため、条件を満たさず自傷ダメージは発動しない
    expect(sanctuaryGuard.currentHealth).toBe(initialHealth); // 体力変化なし
  });
});

describe('Sanctuary Guard System', () => {
  test('《聖域の見張り》 applies brand on summoning', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に敵クリーチャーを配置
    const enemyCreature = createTestFieldCard({
      id: 'target_enemy',
      name: 'ターゲット敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemyCreature);
    
    // 《聖域の見張り》の烙印付与効果をテスト
    const brandEffect: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'apply_brand',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_sanctuary_guard',
      name: '聖域の見張り',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 3,
      attack: 2,
      health: 5,
      keywords: ['guard'] as Keyword[],
      effects: [brandEffect],
    };
    
    // 烙印付与効果を実行
    executeCardEffect(gameState, brandEffect, sourceCard, 'player1');
    
    // 敵クリーチャーに烙印が付与されたことを確認
    expect(enemyCreature.statusEffects).toEqual([{ type: 'branded' }]);
  });

  test('《聖域の見張り》 self-damage when no branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // プレイヤー1の場に《聖域の見張り》を配置
    const sanctuaryGuard = createTestFieldCard({
      id: 'inq_sanctuary_guard',
      name: '聖域の見張り',
      type: 'creature',
      faction: 'inquisitor',
      cost: 3,
      attack: 2,
      health: 5,
      keywords: ['guard'] as Keyword[],
      effects: [
        {
          trigger: 'turn_end',
          target: 'self',
          action: 'damage',
          value: 2,
          condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
        },
      ],
    }, 'player1');
    gameState.players.player1.field.push(sanctuaryGuard);
    
    // プレイヤー2の場に烙印を持たない敵を配置
    const normalEnemy = createTestFieldCard({
      id: 'normal_enemy',
      name: '通常の敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(normalEnemy);
    
    const initialHealth = sanctuaryGuard.currentHealth;
    
    // ターン終了時効果を発動（player1のターンとして）
    gameState.currentPlayer = 'player1';
    const selfDamageEffect: CardEffect = {
      trigger: 'turn_end',
      target: 'self',
      action: 'damage',
      value: 2,
      condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
    };
    
    executeCardEffect(gameState, selfDamageEffect, sanctuaryGuard, 'player1');
    
    // 自傷ダメージが発動し、体力が2減少していることを確認
    expect(sanctuaryGuard.currentHealth).toBe(initialHealth - 2); // 5 - 2 = 3
  });

  test('《聖域の見張り》 no self-damage when branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // プレイヤー1の場に《聖域の見張り》を配置
    const sanctuaryGuard = createTestFieldCard({
      id: 'inq_sanctuary_guard',
      name: '聖域の見張り',
      type: 'creature',
      faction: 'inquisitor',
      cost: 3,
      attack: 2,
      health: 5,
      keywords: ['guard'] as Keyword[],
      effects: [
        {
          trigger: 'turn_end',
          target: 'self',
          action: 'damage',
          value: 2,
          condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
        },
      ],
    }, 'player1');
    gameState.players.player1.field.push(sanctuaryGuard);
    
    // プレイヤー2の場に烙印を持つ敵を配置
    const brandedEnemy = createTestFieldCard({
      id: 'branded_enemy',
      name: '烙印付き敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    brandedEnemy.statusEffects.push({ type: 'branded' });
    gameState.players.player2.field.push(brandedEnemy);
    
    const initialHealth = sanctuaryGuard.currentHealth;
    
    // ターン終了時効果を発動（player1のターンとして）
    gameState.currentPlayer = 'player1';
    const selfDamageEffect: CardEffect = {
      trigger: 'turn_end',
      target: 'self',
      action: 'damage',
      value: 2,
      condition: { subject: 'hasBrandedEnemy', operator: 'eq', value: 0 },
    };
    
    executeCardEffect(gameState, selfDamageEffect, sanctuaryGuard, 'player1');
    
    // 烙印を持つ敵がいるため、条件を満たさず自傷ダメージは発動しない
    expect(sanctuaryGuard.currentHealth).toBe(initialHealth); // 体力変化なし
  });
});

describe('Repentant Succubus System', () => {
  test('《懺悔するサキュバス》 ally destruction and enemy branding', () => {
    const gameState = createTestGameState();
    
    // プレイヤー1の場に味方クリーチャーを配置（破壊対象）
    const allyTarget = createTestFieldCard({
      id: 'ally_to_destroy',
      name: '破壊される味方',
      type: 'creature',
      faction: 'inquisitor',
      cost: 2,
      attack: 2,
      health: 2,
      keywords: [],
      effects: [],
    }, 'player1');
    gameState.players.player1.field.push(allyTarget);
    
    // プレイヤー2の場に複数敵クリーチャーを配置（烙印対象）
    const enemy1 = createTestFieldCard({
      id: 'enemy1',
      name: 'エネミー1',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    const enemy2 = createTestFieldCard({
      id: 'enemy2',
      name: 'エネミー2',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemy1, enemy2);
    
    const initialAllyFieldSize = gameState.players.player1.field.length;
    const initialGraveyardSize = gameState.players.player1.graveyard.length;
    
    // 《懺悔するサキュバス》の味方破壊効果をテスト
    const allyDamageEffect: CardEffect = {
      trigger: 'on_play',
      target: 'ally_random',
      action: 'damage',
      value: 99,
    };
    
    const sourceCard = {
      id: 'inq_repentant_succubus',
      name: '懺悔するサキュバス',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 1,
      attack: 2,
      health: 1,
      keywords: [],
      effects: [allyDamageEffect],
    };
    
    // 味方破壊効果を実行
    executeCardEffect(gameState, allyDamageEffect, sourceCard, 'player1');
    
    // 味方が場から取り除かれ、墓地に送られたことを確認
    expect(gameState.players.player1.field.length).toBe(initialAllyFieldSize - 1);
    expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize + 1);
    expect(gameState.players.player1.graveyard[0].id).toBe('ally_to_destroy');
  });

  test('《懺悔するサキュバス》 enemy branding effects', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に複数敵クリーチャーを配置
    const enemy1 = createTestFieldCard({
      id: 'brand_target1',
      name: 'ブランド対象1',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    const enemy2 = createTestFieldCard({
      id: 'brand_target2',
      name: 'ブランド対象2',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemy1, enemy2);
    
    const sourceCard = {
      id: 'inq_repentant_succubus',
      name: '懺悔するサキュバス',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 1,
      attack: 2,
      health: 1,
      keywords: [],
      effects: [],
    };
    
    // 烙印効果を2回実行（敵2体への烙印）
    const brandEffect1: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'apply_brand',
      value: 1,
    };
    
    executeCardEffect(gameState, brandEffect1, sourceCard, 'player1');
    executeCardEffect(gameState, brandEffect1, sourceCard, 'player1');
    
    // 敵クリーチャーのうち少なくとも1体に烙印が付与されていることを確認
    const brandedCount = getBrandedCreatureCount(gameState.players.player2.field);
    expect(brandedCount).toBeGreaterThanOrEqual(1);
    
    // 最大で2体に烙印が付与されていることを確認
    expect(brandedCount).toBeLessThanOrEqual(2);
  });

  test('《懺悔するサキュバス》 no ally destruction when no allies exist', () => {
    const gameState = createTestGameState();
    
    // 味方クリーチャーを配置しない（自身のみ）
    // プレイヤー2の場に敵クリーチャーを配置
    const enemy = createTestFieldCard({
      id: 'target_enemy',
      name: 'ターゲット敵',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    gameState.players.player2.field.push(enemy);
    
    const initialGraveyardSize = gameState.players.player1.graveyard.length;
    
    const allyDamageEffect: CardEffect = {
      trigger: 'on_play',
      target: 'ally_random',
      action: 'damage',
      value: 99,
    };
    
    const sourceCard = {
      id: 'inq_repentant_succubus',
      name: '懺悔するサキュバス',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 1,
      attack: 2,
      health: 1,
      keywords: [],
      effects: [allyDamageEffect],
    };
    
    // 味方破壊効果を実行（対象なし）
    executeCardEffect(gameState, allyDamageEffect, sourceCard, 'player1');
    
    // 墓地に変化がないことを確認
    expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize);
  });

  test('《懺悔するサキュバス》 no branding when no enemies exist', () => {
    const gameState = createTestGameState();
    
    // 味方クリーチャーを配置
    const ally = createTestFieldCard({
      id: 'existing_ally',
      name: '既存味方',
      type: 'creature',
      faction: 'inquisitor',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player1');
    gameState.players.player1.field.push(ally);
    
    // 敵クリーチャーは配置しない
    
    const brandEffect: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'apply_brand',
      value: 1,
    };
    
    const sourceCard = {
      id: 'inq_repentant_succubus',
      name: '懺悔するサキュバス',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 1,
      attack: 2,
      health: 1,
      keywords: [],
      effects: [brandEffect],
    };
    
    // 烙印効果を実行（対象なし）
    executeCardEffect(gameState, brandEffect, sourceCard, 'player1');
    
    // 敵がいないので烙印は付与されない（エラーも発生しない）
    expect(gameState.players.player2.field.length).toBe(0);
  });
});

describe('Judgment Angel System', () => {
  test('《審判の天使》 destroys branded enemy and another enemy when branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に複数敵クリーチャーを配置
    const brandedEnemy = createTestFieldCard({
      id: 'branded_target',
      name: '烙印対象',
      type: 'creature',
      faction: 'berserker',
      cost: 2,
      attack: 2,
      health: 2,
      keywords: [],
      effects: [],
    }, 'player2');
    brandedEnemy.statusEffects.push({ type: 'branded' });
    
    const normalEnemy1 = createTestFieldCard({
      id: 'normal_enemy1',
      name: '通常敵1',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    
    const normalEnemy2 = createTestFieldCard({
      id: 'normal_enemy2',
      name: '通常敵2',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    
    gameState.players.player2.field.push(brandedEnemy, normalEnemy1, normalEnemy2);
    
    const initialEnemyCount = gameState.players.player2.field.length;
    const initialGraveyard = gameState.players.player2.graveyard.length;
    
    // 《審判の天使》の効果1（条件付き破壊）をテスト
    const conditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
      condition: { subject: 'brandedEnemyCount', operator: 'gte', value: 1 },
    };
    
    // 《審判の天使》の効果2（無条件破壊）をテスト
    const unconditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
    };
    
    const sourceCard = {
      id: 'inq_judgment_angel',
      name: '審判の天使',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 5,
      attack: 4,
      health: 5,
      keywords: [],
      effects: [conditionalDamage, unconditionalDamage],
    };
    
    // 第1効果実行（烙印敵破壊）
    executeCardEffect(gameState, conditionalDamage, sourceCard, 'player1');
    
    // 第2効果実行（追加破壊）
    executeCardEffect(gameState, unconditionalDamage, sourceCard, 'player1');
    
    // 合計2体が破壊され、場から取り除かれたことを確認
    expect(gameState.players.player2.field.length).toBe(initialEnemyCount - 2);
    expect(gameState.players.player2.graveyard.length).toBe(initialGraveyard + 2);
  });

  test('《審判の天使》 destroys only one enemy when no branded enemies exist', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に烙印なし敵クリーチャーを配置
    const normalEnemy1 = createTestFieldCard({
      id: 'normal_target1',
      name: '通常対象1',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    
    const normalEnemy2 = createTestFieldCard({
      id: 'normal_target2',
      name: '通常対象2',
      type: 'creature',
      faction: 'berserker',
      cost: 1,
      attack: 1,
      health: 1,
      keywords: [],
      effects: [],
    }, 'player2');
    
    gameState.players.player2.field.push(normalEnemy1, normalEnemy2);
    
    const initialEnemyCount = gameState.players.player2.field.length;
    const initialGraveyard = gameState.players.player2.graveyard.length;
    
    // 《審判の天使》の効果1（条件付き破壊）をテスト
    const conditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
      condition: { subject: 'brandedEnemyCount', operator: 'gte', value: 1 },
    };
    
    // 《審判の天使》の効果2（無条件破壊）をテスト
    const unconditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
    };
    
    const sourceCard = {
      id: 'inq_judgment_angel',
      name: '審判の天使',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 5,
      attack: 4,
      health: 5,
      keywords: [],
      effects: [conditionalDamage, unconditionalDamage],
    };
    
    // 第1効果実行（条件を満たさないため発動しない）
    executeCardEffect(gameState, conditionalDamage, sourceCard, 'player1');
    
    // 第2効果実行（無条件破壊）
    executeCardEffect(gameState, unconditionalDamage, sourceCard, 'player1');
    
    // 1体のみが破壊され、場から取り除かれたことを確認
    expect(gameState.players.player2.field.length).toBe(initialEnemyCount - 1);
    expect(gameState.players.player2.graveyard.length).toBe(initialGraveyard + 1);
  });

  test('《審判の天使》 handles edge case with single enemy', () => {
    const gameState = createTestGameState();
    
    // プレイヤー2の場に烙印つき敵1体のみ配置
    const singleBrandedEnemy = createTestFieldCard({
      id: 'single_branded',
      name: '単独烙印敵',
      type: 'creature',
      faction: 'berserker',
      cost: 2,
      attack: 2,
      health: 2,
      keywords: [],
      effects: [],
    }, 'player2');
    singleBrandedEnemy.statusEffects.push({ type: 'branded' });
    gameState.players.player2.field.push(singleBrandedEnemy);
    
    const initialEnemyCount = gameState.players.player2.field.length;
    const initialGraveyard = gameState.players.player2.graveyard.length;
    
    const conditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
      condition: { subject: 'brandedEnemyCount', operator: 'gte', value: 1 },
    };
    
    const unconditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
    };
    
    const sourceCard = {
      id: 'inq_judgment_angel',
      name: '審判の天使',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 5,
      attack: 4,
      health: 5,
      keywords: [],
      effects: [conditionalDamage, unconditionalDamage],
    };
    
    // 第1効果実行（烙印敵破壊）
    executeCardEffect(gameState, conditionalDamage, sourceCard, 'player1');
    
    // 第2効果実行（敵がいない場合は何もしない）
    executeCardEffect(gameState, unconditionalDamage, sourceCard, 'player1');
    
    // 1体が破壊され、2回目は対象なしで正常処理
    expect(gameState.players.player2.field.length).toBe(0);
    expect(gameState.players.player2.graveyard.length).toBe(initialGraveyard + 1);
  });

  test('《審判の天使》 does nothing when no enemies exist', () => {
    const gameState = createTestGameState();
    
    // 敵クリーチャーを配置しない
    
    const initialEnemyCount = gameState.players.player2.field.length;
    const initialGraveyard = gameState.players.player2.graveyard.length;
    
    const conditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
      condition: { subject: 'brandedEnemyCount', operator: 'gte', value: 1 },
    };
    
    const unconditionalDamage: CardEffect = {
      trigger: 'on_play',
      target: 'enemy_random',
      action: 'damage',
      value: 99,
    };
    
    const sourceCard = {
      id: 'inq_judgment_angel',
      name: '審判の天使',
      type: 'creature' as const,
      faction: 'inquisitor' as const,
      cost: 5,
      attack: 4,
      health: 5,
      keywords: [],
      effects: [conditionalDamage, unconditionalDamage],
    };
    
    // 両効果実行（どちらも対象なしで正常処理）
    executeCardEffect(gameState, conditionalDamage, sourceCard, 'player1');
    executeCardEffect(gameState, unconditionalDamage, sourceCard, 'player1');
    
    // 変化なしで正常処理
    expect(gameState.players.player2.field.length).toBe(0);
    expect(gameState.players.player2.graveyard.length).toBe(initialGraveyard);
  });
});

  describe('効果発動タイミング', () => {
    test('on_play効果が配置時に発動する', () => {
      const gameState = createTestGameState();
      
      // on_play効果を持つカード
      const testCard = createTestFieldCard({
        id: 'on_play_test',
        name: 'プレイ時効果',
        type: 'creature',
        faction: 'knight',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'player',
          action: 'heal',
          value: 3,
        }],
      });

      const initialLife = gameState.players.player1.life;

      // on_play効果発動
      processEffectTrigger(gameState, 'on_play', testCard, 'player1');

      // プレイヤーのライフが回復していることを確認
      expect(gameState.players.player1.life).toBe(initialLife + 3);
    });

    test('on_death効果が死亡時に発動する', () => {
      const gameState = createTestGameState();
      
      // on_death効果を持つカード
      const testCard = createTestFieldCard({
        id: 'on_death_test',
        name: '死亡時効果',
        type: 'creature',
        faction: 'berserker',
        cost: 2,
        attack: 2,
        health: 1,
        keywords: [],
        effects: [{
          trigger: 'on_death',
          target: 'enemy_all',
          action: 'damage',
          value: 2,
        }],
      });

      // 敵カードを配置
      const enemyCard = createTestFieldCard({
        id: 'enemy_target',
        name: '敵ターゲット',
        type: 'creature',
        faction: 'knight',
        cost: 1,
        attack: 1,
        health: 3,
        keywords: [],
        effects: [],
      });
      gameState.players.player2.field.push(enemyCard);

      // on_death効果発動
      processEffectTrigger(gameState, 'on_death', testCard, 'player1');

      // 敵カードにダメージが入っていることを確認
      expect(gameState.players.player2.field[0].currentHealth).toBe(1);
    });

    test('on_ally_death効果が味方死亡時に発動する', () => {
      const gameState = createTestGameState();
      
      // on_ally_death効果を持つカード
      const watcherCard = createTestFieldCard({
        id: 'watcher_test',
        name: 'ウォッチャー',
        type: 'creature',
        faction: 'necromancer',
        cost: 3,
        attack: 2,
        health: 3,
        keywords: [],
        effects: [{
          trigger: 'on_ally_death',
          target: 'self',
          action: 'buff_attack',
          value: 1,
        }],
      });
      gameState.players.player1.field.push(watcherCard);

      // 死亡する味方カード
      const dyingAlly = createTestFieldCard({
        id: 'dying_ally',
        name: '死に行く味方',
        type: 'creature',
        faction: 'necromancer',
        cost: 1,
        attack: 1,
        health: 1,
        keywords: [],
        effects: [],
      });

      // on_ally_death効果発動
      processEffectTrigger(gameState, 'on_ally_death', dyingAlly, 'player1');

      // ウォッチャーの攻撃力が+1されていることを確認
      expect(gameState.players.player1.field[0].attackModifier).toBe(1);
    });

    test('turn_start効果がターン開始時に発動する', () => {
      const gameState = createTestGameState();
      
      // turn_start効果を持つカード
      const turnStartCard = createTestFieldCard({
        id: 'turn_start_test',
        name: 'ターン開始時効果',
        type: 'creature',
        faction: 'mage',
        cost: 4,
        attack: 3,
        health: 4,
        keywords: [],
        effects: [{
          trigger: 'turn_start',
          target: 'player',
          action: 'heal',
          value: 1,
        }],
      });
      gameState.players.player1.field.push(turnStartCard);
      gameState.players.player1.life = 10; // 初期ライフを減らしておく

      // turn_start効果発動
      processEffectTrigger(gameState, 'turn_start');

      // プレイヤー1のライフが回復していることを確認
      expect(gameState.players.player1.life).toBe(11);
      // プレイヤー2には影響がないことを確認
      expect(gameState.players.player2.life).toBe(15);
    });
  });

  describe('実際のカードデータでのテスト', () => {
    test('ゾンビ・ガードの死亡時効果', () => {
      const gameState = createTestGameState();
      
      // ゾンビ・ガード（死亡時に味方全体の攻撃力+1）
      const zombieGuard = necromancerCards.find(card => card.id === 'necro_zombie')! as CreatureCard;
      const zombieFieldCard = createTestFieldCard(zombieGuard);

      // 味方カードを配置
      const allyCard = createTestFieldCard({
        id: 'ally_skeleton',
        name: 'スケルトン',
        type: 'creature',
        faction: 'necromancer',
        cost: 1,
        attack: 2,
        health: 1,
        keywords: [],
        effects: [],
      });
      gameState.players.player1.field.push(allyCard);

      // 死亡時効果発動
      processEffectTrigger(gameState, 'on_death', zombieFieldCard, 'player1');

      // 味方の攻撃力が+1されていることを確認
      expect(gameState.players.player1.field[0].attackModifier).toBe(1);
    });

    test('魔法使いの弟子のドロー効果', () => {
      const gameState = createTestGameState();
      
      // 魔法使いの弟子（配置時にカードドロー）
      const apprentice = mageCards.find(card => card.id === 'mag_apprentice')! as CreatureCard;
      const apprenticeFieldCard = createTestFieldCard(apprentice);

      const initialHandSize = gameState.players.player1.hand.length;

      // 配置時効果発動
      processEffectTrigger(gameState, 'on_play', apprenticeFieldCard, 'player1');

      // 手札が1枚増加していることを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
    });

    test('ナイト・スクワイアの回復効果', () => {
      const gameState = createTestGameState();
      
      // 味方カードを配置（ダメージを受けた状態）
      const allyCard = createTestFieldCard({
        id: 'ally_damaged',
        name: 'ダメージを受けた味方',
        type: 'creature',
        faction: 'knight',
        cost: 1,
        attack: 2,
        health: 3,
        keywords: [],
        effects: [],
      });
      allyCard.currentHealth = 1; // ダメージを受けている状態
      gameState.players.player1.field.push(allyCard);

      // ナイト・スクワイア（配置時に味方全体回復）
      const squire = knightCards.find(card => card.id === 'kni_squire')! as CreatureCard;
      const squireFieldCard = createTestFieldCard(squire);

      // 配置時効果発動
      processEffectTrigger(gameState, 'on_play', squireFieldCard, 'player1');

      // 味方カードが回復していることを確認
      expect(gameState.players.player1.field[0].currentHealth).toBe(2);
    });
  });

  describe('エラーハンドリング', () => {
    test('場が満杯時のトークン召喚', () => {
      const gameState = createTestGameState();
      
      // 場を満杯にする
      for (let i = 0; i < 5; i++) {
        const card = createTestFieldCard({
          id: `field_card_${i}`,
          name: `フィールドカード${i}`,
          type: 'creature',
          faction: 'necromancer',
          cost: 1,
          attack: 1,
          health: 1,
          keywords: [],
          effects: [],
        });
        gameState.players.player1.field.push(card);
      }

      const summonerCard = createTestFieldCard({
        id: 'summoner_full',
        name: 'フルサモナー',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 1,
        health: 1,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'self',
          action: 'summon',
          value: 1,
        }],
      });

      // 召喚効果実行（失敗するはず）
      executeCardEffect(gameState, summonerCard.effects[0], summonerCard, 'player1');

      // 場のサイズが変わっていないことを確認
      expect(gameState.players.player1.field.length).toBe(5);
    });

    test('手札上限時のカードドロー', () => {
      const gameState = createTestGameState();
      
      // 手札を上限まで増やす
      while (gameState.players.player1.hand.length < 7) {
        gameState.players.player1.hand.push(necromancerCards[0]);
      }

      const drawerCard = createTestFieldCard({
        id: 'drawer_full',
        name: 'フルドローワー',
        type: 'creature',
        faction: 'mage',
        cost: 1,
        attack: 1,
        health: 1,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'self',
          action: 'draw_card',
          value: 1,
        }],
      });

      // ドロー効果実行（失敗するはず）
      executeCardEffect(gameState, drawerCard.effects[0], drawerCard, 'player1');

      // 手札サイズが変わっていないことを確認
      expect(gameState.players.player1.hand.length).toBe(7);
    });
  });

  describe('新カード効果のテスト', () => {
    test('《断罪の宣告》が敵を1ターンスタンさせる', () => {
      const gameState = createTestGameState();
      const stunSpell = inquisitorCards.find(c => c.id === 'inq_verdict_of_conviction')!;
      const enemyCard = createTestFieldCard(berserkerCards[0] as CreatureCard);
      gameState.players.player2.field.push(enemyCard);

      executeCardEffect(gameState, stunSpell.effects[0], stunSpell, 'player1');

      const target = gameState.players.player2.field[0];
      expect(target.statusEffects.some(e => e.type === 'stun')).toBe(true);
      const stunEffect = target.statusEffects.find(e => e.type === 'stun');
      expect(stunEffect?.duration).toBe(1);
    });

    test('《真実を暴く者》が条件付きでデッキトップを破壊する', () => {
      const gameState = createTestGameState();
      const revealer = inquisitorCards.find(c => c.id === 'inq_truth_revealer')! as CreatureCard;
      const sourceCard = createTestFieldCard(revealer);
      
      // 条件を満たす場合 (コスト3)
      const highCostCard = mageCards.find(c => c.cost === 3)!;
      gameState.players.player2.deck.push(highCostCard);
      const initialDeckSize = gameState.players.player2.deck.length;
      const initialGraveSize = gameState.players.player2.graveyard.length;

      executeCardEffect(gameState, revealer.effects[0], sourceCard, 'player1');
      
      expect(gameState.players.player2.deck.length).toBe(initialDeckSize - 1);
      expect(gameState.players.player2.graveyard.length).toBe(initialGraveSize + 1);
      expect(gameState.players.player2.graveyard.at(-1)?.id).toBe(highCostCard.id);

      // 条件を満たさない場合 (コスト2)
      const lowCostCard = mageCards.find(c => c.cost === 2)!;
      gameState.players.player2.deck.push(lowCostCard);
      const currentDeckSize = gameState.players.player2.deck.length;
      const currentGraveSize = gameState.players.player2.graveyard.length;

      executeCardEffect(gameState, revealer.effects[0], sourceCard, 'player1');

      expect(gameState.players.player2.deck.length).toBe(currentDeckSize);
      expect(gameState.players.player2.graveyard.length).toBe(currentGraveSize);
    });

    test('《墓守の巨人》が墓地のクリーチャー数に応じて攻撃力を得る', () => {
      const gameState = createTestGameState();
      const giant = necromancerCards.find(c => c.id === 'necro_grave_giant')! as CreatureCard;
      const sourceCard = createTestFieldCard(giant);
      gameState.players.player1.field.push(sourceCard);
      
      // 墓地にクリーチャーを3体置く
      gameState.players.player1.graveyard.push(necromancerCards[0], necromancerCards[1], necromancerCards[2]);

      executeCardEffect(gameState, giant.effects[0], sourceCard, 'player1');

      expect(sourceCard.attackModifier).toBe(3);
    });

    test('《白翼の元帥》が自分以外の味方の攻撃力を上げる', () => {
      const gameState = createTestGameState();
      const marshal = knightCards.find(c => c.id === 'kni_white_wing_marshal')! as CreatureCard;
      const sourceCard = createTestFieldCard(marshal);
      const ally = createTestFieldCard(knightCards[0] as CreatureCard);
      gameState.players.player1.field.push(sourceCard, ally);

      applyPassiveEffects(gameState);

      const marshalOnField = gameState.players.player1.field.find(c => c.id === marshal.id)!;
      const allyOnField = gameState.players.player1.field.find(c => c.id === ally.id)!;

      expect(marshalOnField.passiveAttackModifier).toBe(0); // 自分は影響を受けない
      expect(allyOnField.passiveAttackModifier).toBe(1);
    });

    test('《魂の渦》が墓地の枚数に応じたステータスのトークンを召喚し、墓地を空にする', () => {
      const gameState = createTestGameState();
      const soulVortex = necromancerCards.find(c => c.id === 'necro_soul_vortex')!;
      
      // 墓地にカードを5枚置く
      for (let i = 0; i < 5; i++) {
        gameState.players.player1.graveyard.push(necromancerCards[i]);
      }
      
      executeCardEffect(gameState, soulVortex.effects[0], soulVortex, 'player1');

      // 場のトークンを確認
      expect(gameState.players.player1.field.length).toBe(1);
      const token = gameState.players.player1.field[0];
      expect(token.name).toBe('魂の集合体');
      expect(token.attack).toBe(5);
      expect(token.health).toBe(5);

      // 墓地が空になっていることを確認
      expect(gameState.players.player1.graveyard.length).toBe(0);
    });

    test('《不動の聖壁、ガレオン》が他の味方の数だけ攻撃力を得る', () => {
      const gameState = createTestGameState();
      const galleon = knightCards.find(c => c.id === 'kni_galleon')! as CreatureCard;
      const sourceCard = createTestFieldCard(galleon);
      const ally1 = createTestFieldCard(knightCards[0] as CreatureCard);
      const ally2 = createTestFieldCard(knightCards[1] as CreatureCard);
      gameState.players.player1.field.push(sourceCard, ally1, ally2);

      applyPassiveEffects(gameState);

      const galleonOnField = gameState.players.player1.field.find(c => c.id === galleon.id)!;
      expect(galleonOnField.passiveAttackModifier).toBe(2);

      // 味方が1体減る
      gameState.players.player1.field.pop();
      applyPassiveEffects(gameState);
      
      expect(galleonOnField.passiveAttackModifier).toBe(1);
    });
  });

  describe('パッシブ効果の重複適用バグ再現テスト', () => {
    test('applyPassiveEffectsが複数回呼び出されても体力が増加し続けない', () => {
      const gameState = createTestGameState();
      const golemCard = mageCards.find(c => c.id === 'mag_golem')! as CreatureCard;
      const golemFieldCard = createTestFieldCard(golemCard);
      
      const otherCard = createTestFieldCard(mageCards.find(c => c.id === 'mag_apprentice')! as CreatureCard);

      gameState.players.player1.field.push(golemFieldCard, otherCard);

      // 1回目の適用
      applyPassiveEffects(gameState);
      const healthAfterFirstApply = gameState.players.player1.field[1].currentHealth;
      const healthModifierAfterFirstApply = gameState.players.player1.field[1].healthModifier;
      
      // 2回目の適用
      applyPassiveEffects(gameState);
      const healthAfterSecondApply = gameState.players.player1.field[1].currentHealth;
      const healthModifierAfterSecondApply = gameState.players.player1.field[1].healthModifier;

      // 体力と修正値が1回目と2回目で同じであるべき
      expect(healthAfterSecondApply).toBe(healthAfterFirstApply);
      expect(healthModifierAfterSecondApply).toBe(healthModifierAfterFirstApply);

      // 具体的な値も確認（元の体力2 + パッシブ効果1）
      expect(healthAfterSecondApply).toBe(otherCard.health + 1);
    });
  });

  describe('魂の収穫者効果テスト - 重複発動バグ修正検証', () => {
    test('魂の収穫者が1体の味方死亡時に攻撃力+1を正確に1回だけ得る', () => {
      const gameState = createTestGameState();
      
      // 魂の収穫者を場に配置
      const harvester = necromancerCards.find(c => c.id === 'necro_harvester')! as CreatureCard;
      const harvesterCard = createTestFieldCard(harvester, 'player1');
      gameState.players.player1.field.push(harvesterCard);
      
      // 他の味方も複数配置
      const ally1 = createTestFieldCard(necromancerCards[0] as CreatureCard, 'player1');
      const ally2 = createTestFieldCard(necromancerCards[1] as CreatureCard, 'player1');
      const ally3 = createTestFieldCard(necromancerCards[2] as CreatureCard, 'player1');
      gameState.players.player1.field.push(ally1, ally2, ally3);
      
      const initialAttack = harvesterCard.attack;
      
      // 味方1体を死亡させる
      const dyingAlly = ally1;
      dyingAlly.currentHealth = 0;
      
      // handleCreatureDeathを直接呼び出して味方死亡を処理
      handleCreatureDeath(gameState, dyingAlly, 'combat', 'test_source');
      
      // 魂の収穫者の攻撃力が+1されていることを確認（+複数回ではない）
      const harvesterOnField = gameState.players.player1.field.find(c => c.id === harvester.id)!;
      expect(harvesterOnField.attackModifier).toBe(1);
      expect(harvesterOnField.attack + harvesterOnField.attackModifier).toBe(initialAttack + 1);
    });

    test('複数の魂の収穫者がいる場合、それぞれ1回ずつ効果が発動する', () => {
      const gameState = createTestGameState();
      
      // 魂の収穫者を2体場に配置
      const harvester1 = createTestFieldCard(necromancerCards.find(c => c.id === 'necro_harvester')! as CreatureCard, 'player1');
      const harvester2 = createTestFieldCard(necromancerCards.find(c => c.id === 'necro_harvester')! as CreatureCard, 'player1');
      harvester2.id = 'necro_harvester_2'; // IDを変更して区別
      gameState.players.player1.field.push(harvester1, harvester2);
      
      // 死亡する味方を配置
      const dyingAlly = createTestFieldCard(necromancerCards[0] as CreatureCard, 'player1');
      gameState.players.player1.field.push(dyingAlly);
      
      // 味方を死亡させる
      dyingAlly.currentHealth = 0;
      
      handleCreatureDeath(gameState, dyingAlly, 'combat', 'test_source');
      
      // 両方の魂の収穫者の攻撃力が+1されていることを確認
      const harvester1OnField = gameState.players.player1.field.find(c => c.id === 'necro_harvester')!;
      const harvester2OnField = gameState.players.player1.field.find(c => c.id === 'necro_harvester_2')!;
      
      expect(harvester1OnField.attackModifier).toBe(1);
      expect(harvester2OnField.attackModifier).toBe(1);
    });

    test('魂の収穫者が複数味方存在時でも死亡1体につき1回のみ効果発動', () => {
      const gameState = createTestGameState();
      
      // 魂の収穫者を場に配置
      const harvester = createTestFieldCard(necromancerCards.find(c => c.id === 'necro_harvester')! as CreatureCard, 'player1');
      gameState.players.player1.field.push(harvester);
      
      // 死亡時効果を持たない味方を4体配置（骸骨剣士を使用）
      const skeleton = necromancerCards.find(c => c.id === 'necro_skeleton')! as CreatureCard;
      for (let i = 0; i < 4; i++) {
        const ally = createTestFieldCard(skeleton, 'player1');
        ally.id = `skeleton_${i}`;
        gameState.players.player1.field.push(ally);
      }
      
      const initialAttackModifier = harvester.attackModifier;
      
      // 1体目を死亡させる
      const firstVictim = gameState.players.player1.field[1]; // 最初の骸骨
      firstVictim.currentHealth = 0;
      
      handleCreatureDeath(gameState, firstVictim, 'combat', 'test_source');
      
      // 魂の収穫者の攻撃力が+1されていることを確認（骸骨は死亡時効果なし）
      const harvesterAfterFirst = gameState.players.player1.field.find(c => c.id === 'necro_harvester')!;
      expect(harvesterAfterFirst.attackModifier).toBe(initialAttackModifier + 1);
      
      // 2体目を死亡させる  
      const secondVictim = gameState.players.player1.field[1]; // 次の骸骨
      secondVictim.currentHealth = 0;
      handleCreatureDeath(gameState, secondVictim, 'combat', 'test_source');
      
      // 魂の収穫者の攻撃力がさらに+1されていることを確認（合計+2）
      const harvesterAfterSecond = gameState.players.player1.field.find(c => c.id === 'necro_harvester')!;
      expect(harvesterAfterSecond.attackModifier).toBe(initialAttackModifier + 2);
    });

    test('魂の収穫者自身が死亡する場合は効果が発動しない', () => {
      const gameState = createTestGameState();
      
      // 魂の収穫者を2体配置
      const harvester1 = createTestFieldCard(necromancerCards.find(c => c.id === 'necro_harvester')! as CreatureCard, 'player1');
      const harvester2 = createTestFieldCard(necromancerCards.find(c => c.id === 'necro_harvester')! as CreatureCard, 'player1');
      harvester2.id = 'necro_harvester_2';
      gameState.players.player1.field.push(harvester1, harvester2);
      
      const initialAttackModifier = harvester2.attackModifier;
      
      // harvester1を死亡させる（この場合harvester2のみ効果を得るべき）
      harvester1.currentHealth = 0;
      
      handleCreatureDeath(gameState, harvester1, 'combat', 'test_source');
      
      // 生き残った魂の収穫者の攻撃力が+1されていることを確認
      const survivingHarvester = gameState.players.player1.field.find(c => c.id === 'necro_harvester_2')!;
      expect(survivingHarvester.attackModifier).toBe(initialAttackModifier + 1);
      
      // 死亡した魂の収穫者は場からいなくなっていることを確認
      const deadHarvester = gameState.players.player1.field.find(c => c.id === 'necro_harvester');
      expect(deadHarvester).toBeUndefined();
    });
  });

  describe('不具合修正テスト', () => {
    test('相手ターン中に自軍のon_attack効果が発動しない', () => {
      const gameState = createTestGameState();
      gameState.currentPlayer = 'player2'; // 相手のターンに設定

      // 自軍（player1）の場に背水の狂戦士を配置
      const berserker = berserkerCards.find(c => c.id === 'ber_desperate_berserker')! as CreatureCard;
      const berserkerFieldCard = createTestFieldCard(berserker, 'player1');
      berserkerFieldCard.hasAttacked = true; // 攻撃済み状態にしておく
      gameState.players.player1.field.push(berserkerFieldCard);

      // 発動条件を満たすようにライフを調整 (player1 < player2)
      gameState.players.player1.life = 10;
      gameState.players.player2.life = 15;

      // 相手（player2）のクリーチャーが攻撃する
      const attacker = createTestFieldCard(berserkerCards[0] as CreatureCard, 'player2');
      
      // on_attackトリガーを発動
      processEffectTrigger(gameState, 'on_attack', attacker, 'player2');

      // 自軍の背水の狂戦士のhasAttackedフラグがfalseになっていない（効果が発動していない）ことを確認
      expect(gameState.players.player1.field[0].hasAttacked).toBe(true);
    });

    test('《囁きの書庫番》墓地条件テスト', () => {
      const gameState = createTestGameState();
      const librarian = necromancerCards.find(c => c.id === 'necro_librarian')!;
      const skeleton = necromancerCards.find(c => c.id === 'necro_skeleton')!;
      
      // 墓地に10枚配置
      for (let i = 0; i < 10; i++) {
        gameState.players.player1.graveyard.push(skeleton);
      }
      
      const initialHandSize = gameState.players.player1.hand.length;
      const initialGraveyardSize = gameState.players.player1.graveyard.length;
      
      // 蘇生効果テスト（墓地4枚以上で1体蘇生）
      const resurrectEffect = librarian.effects.find(e => e.action === 'resurrect')!;
      executeCardEffect(gameState, resurrectEffect, librarian, 'player1');
      
      // フィールドに1体蘇生されたことを確認
      expect(gameState.players.player1.field.length).toBe(1);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize - 1);
      
      // ドロー効果テスト（墓地8枚以上で1枚ドロー）
      const drawEffect = librarian.effects.find(e => e.action === 'draw_card')!;
      executeCardEffect(gameState, drawEffect, librarian, 'player1');
      
      // 手札に1枚ドローされたことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
    });

    test('《囁きの書庫番》墓地条件不足テスト', () => {
      const gameState = createTestGameState();
      const librarian = necromancerCards.find(c => c.id === 'necro_librarian')!;
      const skeleton = necromancerCards.find(c => c.id === 'necro_skeleton')!;
      
      // 墓地に3枚のみ配置（条件不足）
      for (let i = 0; i < 3; i++) {
        gameState.players.player1.graveyard.push(skeleton);
      }
      
      const initialHandSize = gameState.players.player1.hand.length;
      const initialFieldSize = gameState.players.player1.field.length;
      
      // 蘇生効果テスト（墓地5枚未満なので発動しない）
      const resurrectEffect = librarian.effects.find(e => e.action === 'resurrect')!;
      executeCardEffect(gameState, resurrectEffect, librarian, 'player1');
      
      // フィールドに変化がないことを確認
      expect(gameState.players.player1.field.length).toBe(initialFieldSize);
      
      // ドロー効果テスト（墓地10枚未満なので発動しない）
      const drawEffect = librarian.effects.find(e => e.action === 'draw_card')!;
      executeCardEffect(gameState, drawEffect, librarian, 'player1');
      
      // 手札に変化がないことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
    });
  });
});
