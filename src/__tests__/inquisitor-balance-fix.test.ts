/**
 * 審問官バランス修正テスト
 * 
 * 2025-01-19 修正内容の動作確認
 */

import { describe, test, expect } from '@jest/globals';
import { executeCardEffect } from '@/lib/game-engine/card-effects';
import { createInitialGameState } from '@/lib/game-engine/core';
import { inquisitorCards, necromancerCards } from '@/data/cards/base-cards';
import { createCardInstance } from '@/test-helpers/card-test-helpers';
import type { GameState, FieldCard, CreatureCard } from '@/types/game';

describe('審問官バランス修正テスト', () => {
  const createTestGameState = (): GameState => {
    const testDeck = necromancerCards.slice(0, 6).map(t => createCardInstance(t));
    return createInitialGameState(
      'test-inquisitor-fix',
      testDeck,
      testDeck,
      'inquisitor',
      'necromancer',
      'balanced',
      'balanced',
      'test-seed-fix'
    );
  };

  const createTestFieldCard = (
    cardData: Omit<CreatureCard, 'instanceId'> & { instanceId?: string },
    owner: 'player1' | 'player2' = 'player1'
  ): FieldCard => ({
    ...cardData,
    instanceId: cardData.instanceId ?? `test-instance-${Date.now()}-${Math.random()}`,
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

  describe('沈黙の令状 - 効果追加確認', () => {
    test('敵を沈黙させる効果が動作する', () => {
      const gameState = createTestGameState();
      
      // 敵クリーチャーを配置
      const enemyCard = createTestFieldCard({
        templateId: 'enemy_test',
        name: '敵テスト',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [{
          trigger: 'on_play',
          target: 'ally_all',
          action: 'buff_attack',
          value: 1,
        }],
      }, 'player2');
      gameState.players.player2.field.push(enemyCard);

      // 沈黙の令状を取得
      const writOfSilence = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_writ_of_silence')!
      );

      // 沈黙効果を実行
      const silenceEffect = writOfSilence.effects[0];
      executeCardEffect(gameState, silenceEffect, writOfSilence, 'player1');

      // 敵が沈黙状態になっていることを確認
      expect(gameState.players.player2.field[0].isSilenced).toBe(true);
    });

    test('1枚ドローする効果が追加されている', () => {
      const gameState = createTestGameState();
      
      // 敵クリーチャーを配置（沈黙効果の対象が必要）
      const enemyCard = createTestFieldCard({
        templateId: 'enemy_for_draw',
        name: 'ドロー用敵',
        type: 'creature',
        faction: 'necromancer',
        cost: 1,
        attack: 1,
        health: 1,
        keywords: [],
        effects: [],
      }, 'player2');
      gameState.players.player2.field.push(enemyCard);

      const writOfSilence = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_writ_of_silence')!
      );

      const initialHandSize = gameState.players.player1.hand.length;
      const initialDeckSize = gameState.players.player1.deck.length;

      // ドロー効果を実行（効果配列の2番目）
      const drawEffect = writOfSilence.effects[1];
      expect(drawEffect.action).toBe('draw_card');
      executeCardEffect(gameState, drawEffect, writOfSilence, 'player1');

      // 手札が1枚増加していることを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
      expect(gameState.players.player1.deck.length).toBe(initialDeckSize - 1);
    });

    test('2つの効果が正しい順序で配置されている', () => {
      const writOfSilence = inquisitorCards.find(c => c.templateId === 'inq_writ_of_silence')!;
      
      // 2つの効果が存在することを確認
      expect(writOfSilence.effects.length).toBe(2);
      
      // 1番目が沈黙効果
      expect(writOfSilence.effects[0].action).toBe('silence');
      expect(writOfSilence.effects[0].target).toBe('enemy_random');
      
      // 2番目がドロー効果
      expect(writOfSilence.effects[1].action).toBe('draw_card');
      expect(writOfSilence.effects[1].target).toBe('self');
      expect(writOfSilence.effects[1].value).toBe(1);
    });
  });

  describe('断罪の宣告 - 効果追加確認', () => {
    test('敵を気絶させる効果が動作する', () => {
      const gameState = createTestGameState();
      
      // 敵クリーチャーを配置
      const enemyCard = createTestFieldCard({
        templateId: 'enemy_stun_test',
        name: '気絶対象',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [],
      }, 'player2');
      gameState.players.player2.field.push(enemyCard);

      // 断罪の宣告を取得
      const verdict = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_verdict_of_conviction')!
      );

      // 気絶効果を実行
      const stunEffect = verdict.effects[0];
      executeCardEffect(gameState, stunEffect, verdict, 'player1');

      // 敵が気絶状態になっていることを確認
      const stunStatus = gameState.players.player2.field[0].statusEffects.find(
        e => e.type === 'stun'
      );
      expect(stunStatus).toBeDefined();
      expect(stunStatus?.duration).toBe(1);
    });

    test('烙印を付与する効果が追加されている', () => {
      const gameState = createTestGameState();
      
      // 敵クリーチャーを配置
      const enemyCard = createTestFieldCard({
        templateId: 'enemy_brand_test',
        name: '烙印対象',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [],
      }, 'player2');
      gameState.players.player2.field.push(enemyCard);

      const verdict = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_verdict_of_conviction')!
      );

      // 烙印効果を実行（効果配列の2番目）
      const brandEffect = verdict.effects[1];
      expect(brandEffect.action).toBe('apply_brand');
      executeCardEffect(gameState, brandEffect, verdict, 'player1');

      // 敵に烙印が付与されていることを確認
      const brandStatus = gameState.players.player2.field[0].statusEffects.find(
        e => e.type === 'branded'
      );
      expect(brandStatus).toBeDefined();
    });

    test('2つの効果が正しい順序で配置されている', () => {
      const verdict = inquisitorCards.find(c => c.templateId === 'inq_verdict_of_conviction')!;
      
      // 2つの効果が存在することを確認
      expect(verdict.effects.length).toBe(2);
      
      // 1番目が気絶効果
      expect(verdict.effects[0].action).toBe('stun');
      expect(verdict.effects[0].target).toBe('enemy_random');
      expect(verdict.effects[0].value).toBe(1);
      
      // 2番目が烙印効果
      expect(verdict.effects[1].action).toBe('apply_brand');
      expect(verdict.effects[1].target).toBe('enemy_random');
      expect(verdict.effects[1].value).toBe(1);
    });
  });

  describe('浄罪の天火 - 効果変更確認', () => {
    test('敵全体に5ダメージを与える', () => {
      const gameState = createTestGameState();
      
      // 敵クリーチャーを3体配置
      const enemy1 = createTestFieldCard({
        templateId: 'enemy_flame1',
        name: '炎対象1',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 6,
        keywords: [],
        effects: [],
      }, 'player2');
      const enemy2 = createTestFieldCard({
        templateId: 'enemy_flame2',
        name: '炎対象2',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 6,
        keywords: [],
        effects: [],
      }, 'player2');
      const enemy3 = createTestFieldCard({
        templateId: 'enemy_flame3',
        name: '炎対象3',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 6,
        keywords: [],
        effects: [],
      }, 'player2');
      
      gameState.players.player2.field.push(enemy1, enemy2, enemy3);

      // 浄罪の天火を取得
      const purifyingFlame = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_purifying_flame')!
      );

      // ダメージ効果を実行
      const damageEffect = purifyingFlame.effects[0];
      executeCardEffect(gameState, damageEffect, purifyingFlame, 'player1');

      // 全ての敵が5ダメージを受けていることを確認
      expect(gameState.players.player2.field[0].currentHealth).toBe(1); // 6 - 5 = 1
      expect(gameState.players.player2.field[1].currentHealth).toBe(1);
      expect(gameState.players.player2.field[2].currentHealth).toBe(1);
    });

    test('味方にダメージを与えない', () => {
      const gameState = createTestGameState();
      
      // 味方クリーチャーを配置
      const ally = createTestFieldCard({
        templateId: 'ally_safe',
        name: '安全な味方',
        type: 'creature',
        faction: 'inquisitor',
        cost: 2,
        attack: 2,
        health: 5,
        keywords: [],
        effects: [],
      }, 'player1');
      gameState.players.player1.field.push(ally);

      // 敵クリーチャーも配置
      const enemy = createTestFieldCard({
        templateId: 'enemy_flame_target',
        name: '炎の標的',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 6,
        keywords: [],
        effects: [],
      }, 'player2');
      gameState.players.player2.field.push(enemy);

      const purifyingFlame = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_purifying_flame')!
      );

      const damageEffect = purifyingFlame.effects[0];
      executeCardEffect(gameState, damageEffect, purifyingFlame, 'player1');

      // 味方の体力は変化していないことを確認
      expect(gameState.players.player1.field[0].currentHealth).toBe(5);
      
      // 敵はダメージを受けていることを確認
      expect(gameState.players.player2.field[0].currentHealth).toBe(1);
    });

    test('効果が1つだけになっている', () => {
      const purifyingFlame = inquisitorCards.find(c => c.templateId === 'inq_purifying_flame')!;
      
      // 効果が1つのみであることを確認
      expect(purifyingFlame.effects.length).toBe(1);
      
      // 敵全体ダメージ効果のみ
      expect(purifyingFlame.effects[0].action).toBe('damage');
      expect(purifyingFlame.effects[0].target).toBe('enemy_all');
      expect(purifyingFlame.effects[0].value).toBe(5);
    });

    test('コストは7のまま変更されていない', () => {
      const purifyingFlame = inquisitorCards.find(c => c.templateId === 'inq_purifying_flame')!;
      expect(purifyingFlame.cost).toBe(7);
    });
  });

  describe('統合テスト - 修正されたカードの実戦シミュレーション', () => {
    test('沈黙の令状を使用した場合のリソース変化', () => {
      const gameState = createTestGameState();
      
      // 敵を配置
      const enemy = createTestFieldCard({
        templateId: 'integration_enemy',
        name: '統合テスト敵',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [],
      }, 'player2');
      gameState.players.player2.field.push(enemy);

      const writOfSilence = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_writ_of_silence')!
      );

      const initialHandSize = gameState.players.player1.hand.length;

      // 両方の効果を順次実行
      writOfSilence.effects.forEach(effect => {
        executeCardEffect(gameState, effect, writOfSilence, 'player1');
      });

      // 敵が沈黙 + 手札が1枚増加
      expect(gameState.players.player2.field[0].isSilenced).toBe(true);
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
    });

    test('断罪の宣告を使用した場合の状態変化', () => {
      const gameState = createTestGameState();
      
      // 敵を配置
      const enemy = createTestFieldCard({
        templateId: 'verdict_enemy',
        name: '断罪対象',
        type: 'creature',
        faction: 'necromancer',
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        effects: [],
      }, 'player2');
      gameState.players.player2.field.push(enemy);

      const verdict = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_verdict_of_conviction')!
      );

      // 両方の効果を順次実行
      verdict.effects.forEach(effect => {
        executeCardEffect(gameState, effect, verdict, 'player1');
      });

      const targetEnemy = gameState.players.player2.field[0];
      
      // 気絶 + 烙印の両方が付与されている
      expect(targetEnemy.statusEffects.some(e => e.type === 'stun')).toBe(true);
      expect(targetEnemy.statusEffects.some(e => e.type === 'branded')).toBe(true);
    });

    test('浄罪の天火で複数の敵を一掃できる', () => {
      const gameState = createTestGameState();
      
      // 体力5以下の敵を複数配置
      for (let i = 0; i < 3; i++) {
        const enemy = createTestFieldCard({
          templateId: `flame_victim_${i}`,
          name: `炎の犠牲者${i}`,
          type: 'creature',
          faction: 'necromancer',
          cost: 2,
          attack: 2,
          health: 5,
          keywords: [],
          effects: [],
        }, 'player2');
        gameState.players.player2.field.push(enemy);
      }

      const purifyingFlame = createCardInstance(
        inquisitorCards.find(c => c.templateId === 'inq_purifying_flame')!
      );

      const initialEnemyCount = gameState.players.player2.field.length;

      // ダメージ効果を実行
      executeCardEffect(gameState, purifyingFlame.effects[0], purifyingFlame, 'player1');

      // 全ての敵が死亡していることを確認（体力5なので5ダメージで0になる）
      const aliveEnemies = gameState.players.player2.field.filter(e => e.currentHealth > 0);
      expect(aliveEnemies.length).toBe(0);
      expect(initialEnemyCount).toBe(3);
    });
  });
});
