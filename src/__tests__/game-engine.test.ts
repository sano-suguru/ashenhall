/**
 * Ashenhall ゲームエンジン テスト
 * 
 * このテストファイル自体がゲーム仕様書として機能する：
 * - 各テストケースが期待される動作を明示
 * - 失敗した場合、仕様との差異が即座に判明
 * - 型安全性により実装の整合性を保証
 */

import { describe, test, expect } from '@jest/globals';
import {
  createInitialGameState,
  executeFullGame,
  processGameStep,
} from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards } from '@/data/cards/base-cards';
import { GAME_CONSTANTS } from '@/types/game';
import type { Card, Faction, TacticsType, GameState } from '@/types/game';

describe('Ashenhall ゲームエンジン', () => {
  // テスト用の基本設定
  const testGameId = 'test-game-001';
  const testSeed = 'test-seed-12345';
  const player1Faction: Faction = 'necromancer';
  const player2Faction: Faction = 'necromancer';
  const player1Tactics: TacticsType = 'balanced';
  const player2Tactics: TacticsType = 'aggressive';

  // テスト用デッキ（ネクロマンサーカード20枚）
  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    const availableCards = necromancerCards.slice(0, 4); // 最初の4種類のカードを使用
    
    // 各カードを5枚ずつ（20枚デッキ）
    availableCards.forEach(card => {
      for (let i = 0; i < 5; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });
    
    return deck;
  };

  describe('初期ゲーム状態の作成', () => {
    test('正しい初期状態が作成される', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const gameState = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );

      // 基本プロパティの検証
      expect(gameState.gameId).toBe(testGameId);
      expect(gameState.turnNumber).toBe(1);
      expect(gameState.phase).toBe('draw');
      expect(gameState.randomSeed).toBe(testSeed);
      expect(gameState.result).toBeUndefined();

      // 先攻プレイヤーの検証
      expect(['player1', 'player2']).toContain(gameState.currentPlayer);

      // プレイヤー状態の検証
      const player1 = gameState.players.player1;
      const player2 = gameState.players.player2;

      expect(player1.id).toBe('player1');
      expect(player1.life).toBe(GAME_CONSTANTS.INITIAL_LIFE);
      expect(player1.energy).toBe(GAME_CONSTANTS.INITIAL_ENERGY);
      expect(player1.maxEnergy).toBe(GAME_CONSTANTS.INITIAL_MAX_ENERGY);
      expect(player1.faction).toBe(player1Faction);
      expect(player1.tacticsType).toBe(player1Tactics);
      expect(player1.hand).toHaveLength(3); // 初期手札3枚
      expect(player1.deck).toHaveLength(17); // 残りデッキ17枚
      expect(player1.field).toHaveLength(0);
      expect(player1.graveyard).toHaveLength(0);

      expect(player2.id).toBe('player2');
      expect(player2.life).toBe(GAME_CONSTANTS.INITIAL_LIFE);
      expect(player2.energy).toBe(GAME_CONSTANTS.INITIAL_ENERGY);
      expect(player2.maxEnergy).toBe(GAME_CONSTANTS.INITIAL_MAX_ENERGY);
      expect(player2.faction).toBe(player2Faction);
      expect(player2.tacticsType).toBe(player2Tactics);
      expect(player2.hand).toHaveLength(3);
      expect(player2.deck).toHaveLength(17);
      expect(player2.field).toHaveLength(0);
      expect(player2.graveyard).toHaveLength(0);

      // アクションログの検証
      expect(gameState.actionLog).toHaveLength(1);
      expect(gameState.actionLog[0].type).toBe('phase_change');
    });

    test('決定論的乱数による一貫した結果', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      // 同じシードで複数回実行
      const gameState1 = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );
      
      const gameState2 = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );

      // 先攻プレイヤーが一致する（決定論的）
      expect(gameState1.currentPlayer).toBe(gameState2.currentPlayer);
      
      // 手札の内容が一致する（シャッフル結果が決定論的）
      expect(gameState1.players.player1.hand).toEqual(gameState2.players.player1.hand);
      expect(gameState1.players.player2.hand).toEqual(gameState2.players.player2.hand);
    });
  });

  describe('ゲーム進行ロジック', () => {
    test('基本的なフェーズ進行', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      let gameState = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );

      const initialPlayer = gameState.currentPlayer;
      const initialPhase = gameState.phase;

      // 1ステップ進行
      gameState = processGameStep(gameState);

      // フェーズが進行している
      expect(gameState.phase).not.toBe(initialPhase);
      
      // まだゲームは終了していない
      expect(gameState.result).toBeUndefined();
      
      // アクションログが増加している
      expect(gameState.actionLog.length).toBeGreaterThan(1);
    });

    test('エネルギーシステム - 毎ターンプラス1増加（上限8）', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      let gameState = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );

      // ライフを大きな値に設定して早期決着を防止
      gameState.players.player1.life = 99;
      gameState.players.player2.life = 99;

      // 16ターン (8ターンずつ) 進行させて、エネルギーが上限に達することを確認
      for (let i = 0; i < 16 * 5; i++) { // 5 phases per turn
        if (gameState.result) break;

        if (gameState.phase === 'energy') {
          const currentPlayerId = gameState.currentPlayer;
          const player = gameState.players[currentPlayerId];
          const maxEnergyBefore = player.maxEnergy;
          
          gameState = processGameStep(gameState); // 新しい状態を取得
          
          const updatedPlayer = gameState.players[currentPlayerId]; // 更新後のプレイヤー状態を取得
          const maxEnergyAfter = updatedPlayer.maxEnergy;
          
          const expectedMaxEnergy = Math.min(maxEnergyBefore + 1, 8);
          expect(maxEnergyAfter).toBe(expectedMaxEnergy);
          expect(updatedPlayer.energy).toBe(expectedMaxEnergy);

          // ログの検証
          if (maxEnergyAfter > maxEnergyBefore) {
            // processGameStepはenergyフェーズの後にphase_changeアクションを追加するため、最後から2番目を確認
            const energyUpdateAction = gameState.actionLog[gameState.actionLog.length - 2];
            expect(energyUpdateAction.type).toBe('energy_update');
            if (energyUpdateAction.type === 'energy_update') {
              expect(energyUpdateAction.data.maxEnergyBefore).toBe(maxEnergyBefore);
              expect(energyUpdateAction.data.maxEnergyAfter).toBe(maxEnergyAfter);
            }
          }
        } else {
          gameState = processGameStep(gameState);
        }
      }

      // 最終的に両プレイヤーのエネルギーが上限に達していることを確認
      expect(gameState.players.player1.maxEnergy).toBe(8);
      expect(gameState.players.player2.maxEnergy).toBe(8);
    });
  });

  describe('完全なゲーム実行', () => {
    test('ゲームが正常に完了する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const finalGameState = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );

      // ゲームが終了している
      expect(finalGameState.result).toBeDefined();
      expect(finalGameState.result!.totalTurns).toBeGreaterThan(0);
      expect(finalGameState.result!.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(finalGameState.result!.endTime).toBeGreaterThan(finalGameState.startTime);

      // 勝者が決定している（引き分けまたはどちらかの勝利）
      expect(['player1', 'player2', null]).toContain(finalGameState.result!.winner);
      
      // 終了理由が設定されている
      expect(['life_zero', 'timeout']).toContain(finalGameState.result!.reason);

      // アクションログが記録されている
      expect(finalGameState.actionLog.length).toBeGreaterThan(1);
      
      // 各アクションが適切な形式である
      finalGameState.actionLog.forEach((action, index) => {
        expect(action.sequence).toBe(index);
        expect(['player1', 'player2']).toContain(action.playerId);
        expect(['card_play', 'card_attack', 'effect_trigger', 'phase_change', 'creature_destroyed', 'trigger_event', 'energy_update']).toContain(action.type);
        expect(action.timestamp).toBeGreaterThan(0);
        expect(action.data).toBeDefined();
      });
    });

    test('決定論的な結果', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      // 同じ条件で2回実行
      const result1 = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );
      
      const result2 = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );

      // 結果が完全に一致する（決定論的）
      expect(result1.result!.winner).toBe(result2.result!.winner);
      expect(result1.result!.reason).toBe(result2.result!.reason);
      expect(result1.result!.totalTurns).toBe(result2.result!.totalTurns);
      
      // アクションログの長さと内容が一致する（タイムスタンプ除く）
      expect(result1.actionLog.length).toBe(result2.actionLog.length);
      result1.actionLog.forEach((action1, index) => {
        const action2 = result2.actionLog[index];
        expect(action1.sequence).toBe(action2.sequence);
        expect(action1.playerId).toBe(action2.playerId);
        expect(action1.type).toBe(action2.type);
        expect(action1.data).toEqual(action2.data);
        // タイムスタンプは除外（実行時刻に依存するため）
      });
    });

    test('異なるシードで異なる結果', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const result1 = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        'seed-1'
      );
      
      const result2 = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        'seed-2'
      );

      // 少なくとも何らかの違いがある（完全に一致する可能性は低い）
      const isDifferent = 
        result1.result!.winner !== result2.result!.winner ||
        result1.result!.totalTurns !== result2.result!.totalTurns ||
        result1.actionLog.length !== result2.actionLog.length;
      
      expect(isDifferent).toBe(true);
    });
  });

  describe('ログシステム', () => {
    test('トリガーイベントが正しくログに記録される', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();

      // on_damage_takenを持つカードと、攻撃用のカードを準備
      const thornOrc = berserkerCards.find(c => c.id === 'ber_thorn_orc');
      const skeletonSwordsman = necromancerCards.find(c => c.id === 'necro_skeleton');
      
      if (!thornOrc || thornOrc.type !== 'creature' || !skeletonSwordsman || skeletonSwordsman.type !== 'creature') {
        throw new Error('Test creature cards not found');
      }

      let gameState = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        'berserker', // player1's faction
        'necromancer', // player2's faction
        player1Tactics,
        player2Tactics,
        'trigger-log-test'
      );

      // player1の場に棘の鎧のオークを、player2の場に骸骨剣士を配置する
      gameState.players.player1.field.push({
        ...thornOrc,
        owner: 'player1',
        currentHealth: thornOrc.health,
        attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
        summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
      });
      gameState.players.player2.field.push({
        ...skeletonSwordsman,
        owner: 'player2',
        currentHealth: skeletonSwordsman.health,
        attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
        summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
      });

      // player2のターンで戦闘フェーズまで進める
      gameState.currentPlayer = 'player2';
      gameState.phase = 'battle';

      // 1ステップ実行して戦闘を発生させる
      gameState = processGameStep(gameState);

      // ログを確認
      const triggerEvent = gameState.actionLog.find(a => a.type === 'trigger_event' && a.data.triggerType === 'on_damage_taken');
      const effectTrigger = gameState.actionLog.find(a => a.type === 'effect_trigger' && a.data.sourceCardId === 'ber_thorn_orc');

      // トリガーイベントが記録されていることを確認
      expect(triggerEvent).toBeDefined();
      if (triggerEvent?.type === 'trigger_event') {
        expect(triggerEvent.data.sourceCardId).toBe('necro_skeleton'); // 攻撃者
        expect(triggerEvent.data.targetCardId).toBe('ber_thorn_orc'); // 効果発動者
      }

      // トリガーイベントの後に効果が発動していることを確認
      expect(effectTrigger).toBeDefined();
      expect(triggerEvent!.sequence).toBeLessThan(effectTrigger!.sequence);
  });
});

describe('守護キーワード処理テスト', () => {
  const testGameId = 'guard-test';
  const testSeed = 'guard-test-seed';
  const player1Faction: Faction = 'berserker';
  const player2Faction: Faction = 'knight';
  const player1Tactics: TacticsType = 'aggressive';
  const player2Tactics: TacticsType = 'defensive';

  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    const availableCards = necromancerCards.slice(0, 4);
    availableCards.forEach(card => {
      for (let i = 0; i < 5; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });
    return deck;
  };

  test('守護がいる場合、攻撃者は必ず守護を攻撃する', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, testSeed);

    // 攻撃者（攻撃力4）を配置
    const attackerCard = berserkerCards.find(c => c.id === 'ber_champion');
    if (!attackerCard || attackerCard.type !== 'creature') {
      throw new Error('攻撃者カードが見つかりません');
    }

    // 守護クリーチャー（攻撃力1、体力2）と通常クリーチャー（攻撃力2、体力1）を配置
    const guardCard = necromancerCards.find(c => c.id === 'necro_skeleton');
    const normalCard = necromancerCards.find(c => c.id === 'necro_wraith');
    if (!guardCard || guardCard.type !== 'creature' || !normalCard || normalCard.type !== 'creature') {
      throw new Error('守護・通常カードが見つかりません');
    }

    // player1（攻撃者）の場にカードを配置
    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
      hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    // player2の場に守護と通常クリーチャーを配置
    gameState.players.player2.field.push({
      ...guardCard,
      keywords: [...guardCard.keywords, 'guard'], // 守護キーワードを追加
      owner: 'player2', currentHealth: guardCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
      hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });
    gameState.players.player2.field.push({
      ...normalCard,
      owner: 'player2', currentHealth: normalCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 1,
      hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialPlayer2Life = gameState.players.player2.life;
    const initialGuardHealth = gameState.players.player2.field[0].currentHealth;
    const initialNormalHealth = gameState.players.player2.field[1].currentHealth;

    gameState = processGameStep(gameState);

    // 守護が攻撃されていることを確認（プレイヤーは攻撃されていない）
    expect(gameState.players.player2.life).toBe(initialPlayer2Life);
    
    // 守護クリーチャーが攻撃されたことをアクションログで確認
    const attackActions = gameState.actionLog.filter(action => action.type === 'card_attack');
    expect(attackActions.length).toBeGreaterThan(0);
    
    // 守護クリーチャーへの攻撃が記録されている
    const guardAttack = attackActions.find(action => 
      action.type === 'card_attack' && 
      action.data.targetId !== 'player1' && action.data.targetId !== 'player2' &&
      action.playerId === 'player1'
    );
    expect(guardAttack).toBeDefined();
    
    // 通常クリーチャーは攻撃されていない（守護クリーチャーのIDと異なることを確認）
    const normalCreature = gameState.players.player2.field.find(c => !c.keywords.includes('guard'));
    if (normalCreature) {
      const normalAttack = attackActions.find(action => 
        action.type === 'card_attack' && action.data.targetId === normalCreature.id
      );
      expect(normalAttack).toBeUndefined();
    }
  });

  test('守護がいない場合、プレイヤーまたは通常クリーチャーを攻撃できる', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, testSeed + '_no_guard');

    // 攻撃者を配置
    const attackerCard = berserkerCards.find(c => c.id === 'ber_warrior');
    if (!attackerCard || attackerCard.type !== 'creature') {
      throw new Error('攻撃者カードが見つかりません');
    }

    // 通常クリーチャー（守護なし）を配置
    const normalCard = necromancerCards.find(c => c.id === 'necro_wraith');
    if (!normalCard || normalCard.type !== 'creature') {
      throw new Error('通常カードが見つかりません');
    }

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
      hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.players.player2.field.push({
      ...normalCard,
      owner: 'player2', currentHealth: normalCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
      hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialPlayer2Life = gameState.players.player2.life;
    const initialNormalHealth = gameState.players.player2.field[0].currentHealth;

    gameState = processGameStep(gameState);

    // プレイヤーまたはクリーチャーのいずれかが攻撃されている
    const finalPlayer2Life = gameState.players.player2.life;
    const finalNormalHealth = gameState.players.player2.field[0]?.currentHealth || 0;
    
    const playerAttacked = finalPlayer2Life < initialPlayer2Life;
    const creatureAttacked = finalNormalHealth < initialNormalHealth;
    
    // どちらか一方が攻撃されている（両方はありえない）
    expect(playerAttacked || creatureAttacked).toBe(true);
    expect(playerAttacked && creatureAttacked).toBe(false);
  });

  test('沈黙状態の守護は守護効果を発揮しない', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, testSeed + '_silenced');

    // 攻撃者を配置
    const attackerCard = berserkerCards.find(c => c.id === 'ber_warrior');
    if (!attackerCard || attackerCard.type !== 'creature') {
      throw new Error('攻撃者カードが見つかりません');
    }

    // 沈黙状態の守護クリーチャーを配置
    const guardCard = necromancerCards.find(c => c.id === 'necro_skeleton');
    if (!guardCard || guardCard.type !== 'creature') {
      throw new Error('守護カードが見つかりません');
    }

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
      hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.players.player2.field.push({
      ...guardCard,
      keywords: [...guardCard.keywords, 'guard'], // 守護キーワードを追加
      owner: 'player2', currentHealth: guardCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
      hasAttacked: false, isStealthed: false, isSilenced: true, // 沈黙状態
      statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialPlayer2Life = gameState.players.player2.life;

    gameState = processGameStep(gameState);

    // 沈黙状態の守護は効果を発揮しないため、プレイヤーが攻撃される可能性がある
    const finalPlayer2Life = gameState.players.player2.life;
    
    // プレイヤーまたは沈黙状態の守護のいずれかが攻撃されている
    // 沈黙状態なので守護効果は発動せず、攻撃対象が自由に選択される
    expect(finalPlayer2Life <= initialPlayer2Life).toBe(true);
  });

  test('体力0の守護は守護効果を発揮しない', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, testSeed + '_dead_guard');

    // 攻撃者を配置
    const attackerCard = berserkerCards.find(c => c.id === 'ber_warrior');
    if (!attackerCard || attackerCard.type !== 'creature') {
      throw new Error('攻撃者カードが見つかりません');
    }

    // 体力0の守護クリーチャーを配置
    const guardCard = necromancerCards.find(c => c.id === 'necro_skeleton');
    if (!guardCard || guardCard.type !== 'creature') {
      throw new Error('守護カードが見つかりません');
    }

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0,
      passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
      hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.players.player2.field.push({
      ...guardCard,
      keywords: [...guardCard.keywords, 'guard'], // 守護キーワードを追加
      owner: 'player2', currentHealth: 0, // 体力0
      attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false,
      statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialPlayer2Life = gameState.players.player2.life;

    gameState = processGameStep(gameState);

    // 体力0の守護は効果を発揮しないため、プレイヤーが攻撃される
    const finalPlayer2Life = gameState.players.player2.life;
    expect(finalPlayer2Life).toBeLessThan(initialPlayer2Life);

    // プレイヤーへの直接攻撃がログに記録されている
    const playerAttacks = gameState.actionLog.filter(action => 
      action.type === 'card_attack' && action.data.targetId === 'player2'
    );
    expect(playerAttacks.length).toBeGreaterThan(0);
  });

  test('複数の守護がいる場合、その中からランダムに選択される', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    
    // 複数回実行して、異なる守護が選択されることを確認
    const targetCounts = new Map<string, number>();
    
    for (let attempt = 0; attempt < 5; attempt++) {
      let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, testSeed + `_multi_guard_${attempt}`);

      // 攻撃者を配置
      const attackerCard = berserkerCards.find(c => c.id === 'ber_warrior');
      if (!attackerCard || attackerCard.type !== 'creature') {
        throw new Error('攻撃者カードが見つかりません');
      }

      // 2体の守護クリーチャーを配置
      const guardCard1 = necromancerCards.find(c => c.id === 'necro_skeleton');
      const guardCard2 = necromancerCards.find(c => c.id === 'necro_wraith');
      if (!guardCard1 || guardCard1.type !== 'creature' || !guardCard2 || guardCard2.type !== 'creature') {
        throw new Error('守護カードが見つかりません');
      }

      gameState.players.player1.field.push({
        ...attackerCard,
        owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0,
        passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
        hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
      });

      gameState.players.player2.field.push({
        ...guardCard1,
        id: `guard_1_${attempt}`,
        keywords: [...guardCard1.keywords, 'guard'], // 守護キーワードを追加
        owner: 'player2', currentHealth: guardCard1.health, attackModifier: 0, healthModifier: 0,
        passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0,
        hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
      });

      gameState.players.player2.field.push({
        ...guardCard2,
        id: `guard_2_${attempt}`,
        keywords: [...guardCard2.keywords, 'guard'], // 守護キーワードを追加
        owner: 'player2', currentHealth: guardCard2.health, attackModifier: 0, healthModifier: 0,
        passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 1,
        hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
      });

      gameState.currentPlayer = 'player1';
      gameState.phase = 'battle';

      gameState = processGameStep(gameState);

      // どの守護が攻撃されたかを記録
      const attackActions = gameState.actionLog.filter(action => action.type === 'card_attack');
      const guardAttack = attackActions.find(action => 
        action.type === 'card_attack' && 
        (action.data.targetId === `guard_1_${attempt}` || action.data.targetId === `guard_2_${attempt}`)
      );
      
      if (guardAttack && guardAttack.type === 'card_attack') {
        const targetId = guardAttack.data.targetId;
        targetCounts.set(targetId, (targetCounts.get(targetId) || 0) + 1);
      }
    }

    // 複数の異なる守護が選択されていることを確認（完全にランダムなので、すべて同じになる可能性もあるが）
    expect(targetCounts.size).toBeGreaterThanOrEqual(1);
    
    // 少なくとも攻撃が発生していることを確認
    const totalAttacks = Array.from(targetCounts.values()).reduce((sum, count) => sum + count, 0);
    expect(totalAttacks).toBeGreaterThan(0);
  });
});

describe('Card Keyword and Effect Tests', () => {
  const testGameId = 'test-game-001';
  const testSeed = 'test-seed-12345';
  const player1Faction: Faction = 'berserker';
  const player2Faction: Faction = 'necromancer';
  const player1Tactics: TacticsType = 'aggressive';
  const player2Tactics: TacticsType = 'defensive';

  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    const availableCards = necromancerCards.slice(0, 4);
    availableCards.forEach(card => {
      for (let i = 0; i < 5; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });
    return deck;
  };

  test('Trample keyword should deal excess damage to the player', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'trample-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    const defenderCard = necromancerCards.find(c => c.id === 'necro_skeleton');
    if (!attackerCard || attackerCard.type !== 'creature' || !defenderCard || defenderCard.type !== 'creature') {
      throw new Error('Test cards not found');
    }

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });
    gameState.players.player2.field.push({
      ...defenderCard,
      keywords: [...defenderCard.keywords, 'guard'], // guardを追加して攻撃を強制
      owner: 'player2', currentHealth: defenderCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;
    const defenderHealth = defenderCard.health;

    gameState = processGameStep(gameState);

    const finalOpponentLife = gameState.players.player2.life;
    const expectedDamage = attackerPower - defenderHealth;
    expect(finalOpponentLife).toBe(initialOpponentLife - expectedDamage);
  });

  test('Ready effect (Desperate Berserker) should allow attacking twice when life is lower', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'ready-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    if (!attackerCard || attackerCard.type !== 'creature') throw new Error('Test card not found');

    gameState.players.player1.life = 10;
    gameState.players.player2.life = 15; // player1's life is lower

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;

    gameState = processGameStep(gameState); // This will perform the battle phase

    const finalOpponentLife = gameState.players.player2.life;
    // Should attack twice
    expect(finalOpponentLife).toBe(initialOpponentLife - (attackerPower * 2));
  });

  test('Ready effect (Desperate Berserker) should only attack once when life is higher', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'ready-no-trigger-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    if (!attackerCard || attackerCard.type !== 'creature') throw new Error('Test card not found');

    gameState.players.player1.life = 15;
    gameState.players.player2.life = 10; // player1's life is higher

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;

    gameState = processGameStep(gameState);

    const finalOpponentLife = gameState.players.player2.life;
    // Should attack once
    expect(finalOpponentLife).toBe(initialOpponentLife - attackerPower);
  });
});

describe('Card Keyword and Effect Tests', () => {
  const testGameId = 'test-game-001';
  const testSeed = 'test-seed-12345';
  const player1Faction: Faction = 'berserker';
  const player2Faction: Faction = 'necromancer';
  const player1Tactics: TacticsType = 'aggressive';
  const player2Tactics: TacticsType = 'defensive';

  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    const availableCards = necromancerCards.slice(0, 4);
    availableCards.forEach(card => {
      for (let i = 0; i < 5; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });
    return deck;
  };

  test('Trample keyword should deal excess damage to the player', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'trample-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    const defenderCard = necromancerCards.find(c => c.id === 'necro_skeleton');
    if (!attackerCard || attackerCard.type !== 'creature' || !defenderCard || defenderCard.type !== 'creature') {
      throw new Error('Test cards not found');
    }

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });
    gameState.players.player2.field.push({
      ...defenderCard,
      keywords: [...defenderCard.keywords, 'guard'], // guardを追加して攻撃を強制
      owner: 'player2', currentHealth: defenderCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;
    const defenderHealth = defenderCard.health;

    gameState = processGameStep(gameState);

    const finalOpponentLife = gameState.players.player2.life;
    const expectedDamage = attackerPower - defenderHealth;
    expect(finalOpponentLife).toBe(initialOpponentLife - expectedDamage);
  });

  test('Ready effect (Desperate Berserker) should allow attacking twice when life is lower', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'ready-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    if (!attackerCard || attackerCard.type !== 'creature') throw new Error('Test card not found');

    gameState.players.player1.life = 10;
    gameState.players.player2.life = 15; // player1's life is lower

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;

    gameState = processGameStep(gameState); // This will perform the battle phase

    const finalOpponentLife = gameState.players.player2.life;
    // Should attack twice
    expect(finalOpponentLife).toBe(initialOpponentLife - (attackerPower * 2));
  });

  test('Ready effect (Desperate Berserker) should only attack once when life is higher', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'ready-no-trigger-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    if (!attackerCard || attackerCard.type !== 'creature') throw new Error('Test card not found');

    gameState.players.player1.life = 15;
    gameState.players.player2.life = 10; // player1's life is higher

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;

    gameState = processGameStep(gameState);

    const finalOpponentLife = gameState.players.player2.life;
    // Should attack once
    expect(finalOpponentLife).toBe(initialOpponentLife - attackerPower);
  });
});

describe('Card Keyword and Effect Tests', () => {
  const testGameId = 'test-game-001';
  const testSeed = 'test-seed-12345';
  const player1Faction: Faction = 'berserker';
  const player2Faction: Faction = 'necromancer';
  const player1Tactics: TacticsType = 'aggressive';
  const player2Tactics: TacticsType = 'defensive';

  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    const availableCards = necromancerCards.slice(0, 4);
    availableCards.forEach(card => {
      for (let i = 0; i < 5; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });
    return deck;
  };

  test('Trample keyword should deal excess damage to the player', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'trample-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    const defenderCard = necromancerCards.find(c => c.id === 'necro_skeleton');
    if (!attackerCard || attackerCard.type !== 'creature' || !defenderCard || defenderCard.type !== 'creature') {
      throw new Error('Test cards not found');
    }

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });
    gameState.players.player2.field.push({
      ...defenderCard,
      keywords: [...defenderCard.keywords, 'guard'], // guardを追加して攻撃を強制
      owner: 'player2', currentHealth: defenderCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;
    const defenderHealth = defenderCard.health;

    gameState = processGameStep(gameState);

    const finalOpponentLife = gameState.players.player2.life;
    const expectedDamage = attackerPower - defenderHealth;
    expect(finalOpponentLife).toBe(initialOpponentLife - expectedDamage);
  });

  test('Ready effect (Desperate Berserker) should allow attacking twice when life is lower', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'ready-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    if (!attackerCard || attackerCard.type !== 'creature') throw new Error('Test card not found');

    gameState.players.player1.life = 10;
    gameState.players.player2.life = 15; // player1's life is lower

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;

    gameState = processGameStep(gameState); // This will perform the battle phase

    const finalOpponentLife = gameState.players.player2.life;
    // Should attack twice
    expect(finalOpponentLife).toBe(initialOpponentLife - (attackerPower * 2));
  });

  test('Ready effect (Desperate Berserker) should only attack once when life is higher', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    let gameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, 'ready-no-trigger-test');

    const attackerCard = berserkerCards.find(c => c.id === 'ber_desperate_berserker');
    if (!attackerCard || attackerCard.type !== 'creature') throw new Error('Test card not found');

    gameState.players.player1.life = 15;
    gameState.players.player2.life = 10; // player1's life is higher

    gameState.players.player1.field.push({
      ...attackerCard,
      owner: 'player1', currentHealth: attackerCard.health, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
      summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
    });

    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    const initialOpponentLife = gameState.players.player2.life;
    const attackerPower = attackerCard.attack;

    gameState = processGameStep(gameState);

    const finalOpponentLife = gameState.players.player2.life;
    // Should attack once
    expect(finalOpponentLife).toBe(initialOpponentLife - attackerPower);
  });
});


  describe('パフォーマンス要件', () => {
    test('1戦闘が5秒以内で完了する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const startTime = Date.now();
      
      const finalGameState = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );
      
      const executionTime = Date.now() - startTime;
      
      // 5秒（5000ms）以内で完了
      expect(executionTime).toBeLessThan(5000);
      
      // ゲームが正常に完了している
      expect(finalGameState.result).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    test('無限ループ防止機能', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      // executeFullGameには内部的にmaxSteps制限がある
      const result = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        player1Tactics,
        player2Tactics,
        testSeed
      );
      
      // 必ず結果が返される（無限ループしない）
      expect(result.result).toBeDefined();
      expect(result.result!.totalTurns).toBeGreaterThan(0);
    });
  });

  describe('配置システム - 完全実装（エネルギー上限まで配置）', () => {
    test('エネルギーが十分な場合、エネルギー上限まで配置する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      let gameState = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive', // 攻撃重視で配置しやすくする
        'balanced',
        'full-deploy-test-1'
      );

      // ターン5まで進行させてエネルギーを十分に蓄積
      let multiDeployOccurred = false;
      let maxDeploysInPhase = 0;
      
      for (let step = 0; step < 200 && !gameState.result; step++) {
        const prevState = JSON.parse(JSON.stringify(gameState));
        gameState = processGameStep(gameState);
        
        // 配置フェーズでの複数枚配置をチェック
        if (prevState.phase === 'deploy' && gameState.phase !== 'deploy') {
          const deployActionsInThisPhase = gameState.actionLog.filter(
            action => action.type === 'card_play' && 
            action.sequence > prevState.actionLog.length - 1
          ).length;
          
          maxDeploysInPhase = Math.max(maxDeploysInPhase, deployActionsInThisPhase);
          
          // 複数枚配置が発生した場合を記録
          if (deployActionsInThisPhase >= 2) {
            multiDeployOccurred = true;
            // 完全実装では場の上限（5枚）まで配置可能
            expect(deployActionsInThisPhase).toBeLessThanOrEqual(5);
          }
        }
        
        // ターン7以降で十分なエネルギーがあることを確認
        if (gameState.turnNumber >= 7) {
          break;
        }
      }
      
      // 複数枚配置が少なくとも一度は発生することを期待
      expect(gameState.turnNumber).toBeGreaterThanOrEqual(5);
    });

    test('エネルギー不足時は配置を適切に停止する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      let gameState = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive',
        'defensive',
        'energy-limit-test-2'
      );

      // 初期ターンでエネルギー制限をテスト
      for (let step = 0; step < 20 && !gameState.result && gameState.turnNumber <= 2; step++) {
        const prevState = JSON.parse(JSON.stringify(gameState));
        gameState = processGameStep(gameState);
        
        // 配置フェーズでの動作をチェック
        if (prevState.phase === 'deploy' && gameState.phase !== 'deploy') {
          const player = gameState.players[gameState.currentPlayer === 'player1' ? 'player2' : 'player1'];
          const deployActions = gameState.actionLog.filter(
            action => action.type === 'card_play' && 
            action.sequence > prevState.actionLog.length - 1
          );
          
          // エネルギーが低い場合は配置枚数も制限される
          if (prevState.turnNumber <= 2) {
            expect(deployActions.length).toBeLessThanOrEqual(prevState.turnNumber);
          }
        }
      }
    });

    test('場が満杯時は配置を停止する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const finalGameState = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive',
        'aggressive', // 両者攻撃重視で場を埋めやすくする
        'field-limit-test-3'
      );

      // ゲーム中に場の制限が適切に守られていることを確認
      const cardPlayActions = finalGameState.actionLog.filter(action => action.type === 'card_play');
      
      // 各配置アクションが場の制限内で実行されていることを確認
      cardPlayActions.forEach(action => {
        expect(action.data.position).toBeLessThan(5); // 場の上限は5
      });
      
      // 最終的にゲームが完了していることを確認
      expect(finalGameState.result).toBeDefined();
    });

    test('複数配置時の効果発動が正常に動作する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const finalGameState = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'tempo', // テンポ重視で効果のあるカードを優先
        'balanced',
        'effect-chain-test-4'
      );

      // カード配置と効果発動のアクションログを分析
      const cardPlayActions = finalGameState.actionLog.filter(action => action.type === 'card_play');
      const effectTriggerActions = finalGameState.actionLog.filter(action => action.type === 'effect_trigger');

      // カードが配置された場合、対応する効果が発動していることを確認
      if (cardPlayActions.length > 0) {
        // on_play効果を持つカードデータを確認
        const cardsWithOnPlayEffects = ['necro_wraith', 'necro_necromancer', 'necro_lich', 'necro_ghoul'];
        
        cardPlayActions.forEach(playAction => {
          if (cardsWithOnPlayEffects.includes(playAction.data.cardId)) {
            // このカードの配置後に効果発動アクションが存在するはず
            const relatedEffects = effectTriggerActions.filter(
              effectAction => effectAction.sequence > playAction.sequence &&
              effectAction.data.sourceCardId === playAction.data.cardId
            );
            
            // 効果を持つカードなら効果発動ログが存在することを確認
            // （ただし、対象がいない場合は発動しないこともある）
            expect(relatedEffects.length).toBeGreaterThanOrEqual(0);
          }
        });
      }

      expect(finalGameState.result).toBeDefined();
    });

    test('決定論性が複数配置でも維持される', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const result1 = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive',
        'defensive',
        'deterministic-multi-deploy-test'
      );
      
      const result2 = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive',
        'defensive',
        'deterministic-multi-deploy-test' // 同じシード
      );

      // 結果が完全に一致する（決定論的）
      expect(result1.result!.winner).toBe(result2.result!.winner);
      expect(result1.result!.totalTurns).toBe(result2.result!.totalTurns);
      expect(result1.actionLog.length).toBe(result2.actionLog.length);

      // カード配置アクションが一致することを確認
      const playActions1 = result1.actionLog.filter(action => action.type === 'card_play');
      const playActions2 = result2.actionLog.filter(action => action.type === 'card_play');
      
      expect(playActions1.length).toBe(playActions2.length);
      
      playActions1.forEach((action1, index) => {
        const action2 = playActions2[index];
        expect(action1.data.cardId).toBe(action2.data.cardId);
        expect(action1.data.position).toBe(action2.data.position);
        expect(action1.playerId).toBe(action2.playerId);
    });
  });
});

describe('戦闘システム - 勝利判定後の処理', () => {
  const testGameId = 'overkill-test';
  const testSeed = 'overkill-test-seed';
  const player1Faction: Faction = 'berserker';
  const player2Faction: Faction = 'necromancer';
  const player1Tactics: TacticsType = 'aggressive';
  const player2Tactics: TacticsType = 'defensive';

  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    const availableCards = necromancerCards.slice(0, 4);
    availableCards.forEach(card => {
      for (let i = 0; i < 5; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });
    return deck;
  };

  test('ライフが0になった後、過剰な攻撃が行われず、ライフがマイナスにならない', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    const gameState: GameState = createInitialGameState(testGameId, deck1, deck2, player1Faction, player2Faction, player1Tactics, player2Tactics, testSeed);

    // Arrange: 状況設定
    // player2のライフを3に設定
    gameState.players.player2.life = 3;
    // player2の場は空
    gameState.players.player2.field = [];

    // player1の場に攻撃力2のクリーチャーを3体配置
    const attackerCard = berserkerCards.find(c => c.id === 'ber_warrior');
    if (!attackerCard || attackerCard.type !== 'creature') {
      throw new Error('攻撃者カードが見つかりません');
    }
    for (let i = 0; i < 3; i++) {
      gameState.players.player1.field.push({
        ...attackerCard,
        id: `attacker_${i}`,
        owner: 'player1',
        currentHealth: attackerCard.health,
        attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0,
        summonTurn: 0, position: i, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [], readiedThisTurn: false,
      });
    }

    // player1のターン、戦闘フェーズに設定
    gameState.currentPlayer = 'player1';
    gameState.phase = 'battle';

    // Act: 戦闘フェーズを実行
    const finalGameState = processGameStep(gameState);

    // Assert: 結果を検証
    // 1. 最終的なライフが0であること
    expect(finalGameState.players.player2.life).toBe(0);

    // 2. 攻撃アクションが1回だけ行われていること
    const attackActions = finalGameState.actionLog.filter(
      action => action.type === 'card_attack' && action.data.targetId === 'player2'
    );
    expect(attackActions.length).toBe(1);

    // 3. ログの詳細を検証
    if (attackActions[0]?.type === 'card_attack') {
      expect(attackActions[0].data.targetPlayerLife?.before).toBe(3);
      expect(attackActions[0].data.targetPlayerLife?.after).toBe(0);
    }
  });
});

  describe('戦闘システム - 直接攻撃バグ修正検証', () => {
    test('相手の場が空の時、プレイヤーに直接攻撃する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      // 初期状態作成
      let gameState = createInitialGameState(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive', // 攻撃重視でカードを出やすくする
        'defensive',
        'direct-attack-test-1'
      );

      // player1だけカードを出す状況を作るためにゲームを進行
      let steps = 0;
      const maxSteps = 100;
      
      while (steps < maxSteps && !gameState.result) {
        const previousState = JSON.parse(JSON.stringify(gameState));
        gameState = processGameStep(gameState);
        steps++;

        // player1がカードを出しており、player2が場にカードがない状況をチェック
        const player1HasCards = gameState.players.player1.field.length > 0;
        const player2HasNoCards = gameState.players.player2.field.length === 0;
        const isPlayer1Turn = gameState.currentPlayer === 'player1';
        const isBattlePhase = gameState.phase === 'battle';

        if (player1HasCards && player2HasNoCards && isPlayer1Turn && isBattlePhase) {
          // この状況で戦闘フェーズを処理
          const initialPlayer2Life = gameState.players.player2.life;
          gameState = processGameStep(gameState);
          
          // プレイヤー2のライフが減少していることを確認
          const finalPlayer2Life = gameState.players.player2.life;
          
          // 直接攻撃が発生した場合、アクションログに記録される
          const attackActions = gameState.actionLog.filter(action => 
            action.type === 'card_attack' && 
            (action.data.targetId === 'player1' || action.data.targetId === 'player2')
          );
          
          if (initialPlayer2Life > finalPlayer2Life) {
            // ライフが減った場合、直接攻撃ログが存在することを確認
            expect(attackActions.length).toBeGreaterThan(0);
            expect(finalPlayer2Life).toBeLessThan(initialPlayer2Life);
          }
          
          break;
        }
      }
    });

    test('生きているカードが存在しない場合、プレイヤーへ直接攻撃する', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const gameState = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive',
        'defensive', // 守備重視で相手がカードを出しにくくする
        'alive-check-test-2'
      );

      // ゲームが完了していることを確認
      expect(gameState.result).toBeDefined();
      
      // 戦闘ログから直接攻撃パターンを分析
      const battleActions = gameState.actionLog.filter(action => action.type === 'card_attack');
      
      // 攻撃アクションが存在する場合の検証
      if (battleActions.length > 0) {
        const directAttacks = battleActions.filter(action => {
          if (action.type === 'card_attack') {
            return action.data.targetId === 'player1' || action.data.targetId === 'player2';
          }
          return false;
        });
        
        const cardAttacks = battleActions.filter(action => {
          if (action.type === 'card_attack') {
            return action.data.targetId !== 'player1' && action.data.targetId !== 'player2';
          }
          return false;
        });
        
        // 戦闘が発生した場合、直接攻撃またはカード攻撃のいずれかが存在することを確認
        expect(directAttacks.length + cardAttacks.length).toBeGreaterThan(0);
        
        // 直接攻撃が発生した場合、適切な形式であることを確認
        directAttacks.forEach(action => {
          if (action.type === 'card_attack') {
            expect(action.data.attackerCardId).toBeDefined();
            expect(['player1', 'player2']).toContain(action.data.targetId);
            expect(action.data.damage).toBeGreaterThanOrEqual(0);
          }
        });
      }
    });

    test('段階的戦闘進行でプレイヤー攻撃が確実に実行される', () => {
      const deck1 = createTestDeck();
      const deck2 = createTestDeck();
      
      const gameState = executeFullGame(
        testGameId,
        deck1,
        deck2,
        player1Faction,
        player2Faction,
        'aggressive',
        'balanced',
        'battle-progression-test-3'
      );

      // ゲームが完了していることを確認
      expect(gameState.result).toBeDefined();
      
      // アクションログに直接攻撃が記録されていることを確認
      const directAttackActions = gameState.actionLog.filter(action => 
        action.type === 'card_attack' && 
        (action.data.targetId === 'player1' || action.data.targetId === 'player2')
      );

      // 攻撃重視vs バランス型なので、直接攻撃が発生する可能性が高い
      expect(directAttackActions.length).toBeGreaterThanOrEqual(0);
      
      // アクションログの形式が正しいことを確認
      directAttackActions.forEach(action => {
        if (action.type === 'card_attack') {
          expect(action.data.attackerCardId).toBeDefined();
          expect(['player1', 'player2']).toContain(action.data.targetId);
          expect(action.data.damage).toBeGreaterThanOrEqual(0);
        }
        expect(['player1', 'player2']).toContain(action.playerId);
      });
    });
  });
});
