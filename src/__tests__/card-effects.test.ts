/**
 * カード効果システム テスト
 * 
 * 各勢力の特色ある効果が正しく動作することを検証
 */

import { describe, test, expect } from '@jest/globals';
import { executeCardEffect, processEffectTrigger, applyPassiveEffects } from '@/lib/game-engine/card-effects';
import { createInitialGameState } from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards, mageCards, knightCards, inquisitorCards } from '@/data/cards/base-cards';
import type { GameState, FieldCard, Card, CardEffect, CreatureCard } from '@/types/game';

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
  });
});
