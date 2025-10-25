/**
 * プレイ条件システムのテスト
 * スペルカードの空打ち防止機能の動作確認
 */

import { createInitialGameState } from '../lib/game-engine/core';
import { processDeployPhase } from '../lib/game-engine/phase-processors';
import { getCardById } from '../data/cards/base-cards';
import { createCardInstance } from '../test-helpers/card-test-helpers';
import type { GameState, Card, CreatureCard } from '../types/game';

describe('プレイ条件システム', () => {
  let gameState: GameState;

  // テスト用デッキ作成（魔導士カードを含む）
  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    // 魔力の奔流を複数枚含むデッキ
    const torrent = getCardById('mag_torrent');
    const lightning = getCardById('mag_arcane_lightning');
    const apprentice = getCardById('mag_apprentice');

    if (!torrent || !lightning || !apprentice) {
      throw new Error('Required test cards not found');
    }

    // デッキに必要なカードを追加
    for (let i = 0; i < 3; i++) {
      deck.push(createCardInstance(torrent, `mag_torrent_${i}`));
      deck.push(createCardInstance(lightning, `mag_arcane_lightning_${i}`));
      deck.push(createCardInstance(apprentice, `mag_apprentice_${i}`));
    }

    // 残りのスロットを埋める
    for (let i = deck.length; i < 20; i++) {
      deck.push(createCardInstance(apprentice, `filler_${i}`));
    }

    return deck;
  };

  beforeEach(() => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    
    gameState = createInitialGameState(
      'test-game',
      deck1,
      deck2,
      'mage',
      'mage',
      'test-seed'
    );

    // テストのためにエネルギーを十分に設定
    gameState.players.player1.maxEnergy = 8;
    gameState.players.player1.energy = 8;
    gameState.players.player2.maxEnergy = 8;
    gameState.players.player2.energy = 8;
    
    // テストはplayer1のターンで実行
    gameState.currentPlayer = 'player1';
  });

  describe('敵クリーチャーがいない場合', () => {
    it('魔力の奔流がプレイされないこと', () => {
      // player1の手札に魔力の奔流を追加
      const torrent = getCardById('mag_torrent');
      if (!torrent) throw new Error('mag_torrent not found');
      
      gameState.players.player1.hand = [createCardInstance(torrent, 'test_torrent')];
      
      // 相手の場を空にする
      gameState.players.player2.field = [];
      
      // 配置フェーズを実行
      const initialHandSize = gameState.players.player1.hand.length;
      processDeployPhase(gameState);
      
      // 魔力の奔流がプレイされていないことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
      expect(gameState.players.player1.graveyard.length).toBe(0);
    });

    it('秘術の連雷がプレイされないこと', () => {
      // player1の手札に秘術の連雷を追加
      const lightning = getCardById('mag_arcane_lightning');
      if (!lightning) throw new Error('mag_arcane_lightning not found');
      
      gameState.players.player1.hand = [createCardInstance(lightning, 'test_lightning')];
      
      // 相手の場を空にする
      gameState.players.player2.field = [];
      
      // 配置フェーズを実行
      const initialHandSize = gameState.players.player1.hand.length;
      processDeployPhase(gameState);
      
      // 秘術の連雷がプレイされていないことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
      expect(gameState.players.player1.graveyard.length).toBe(0);
    });

    it('プレイ条件のないクリーチャーカードは正常にプレイされること', () => {
      // player1の手札に術師見習いを追加
      const apprentice = getCardById('mag_apprentice');
      if (!apprentice) throw new Error('mag_apprentice not found');
      
      gameState.players.player1.hand = [createCardInstance(apprentice, 'test_apprentice')];
      
      // 相手の場を空にする
      gameState.players.player2.field = [];
      
      // 配置フェーズを実行
      processDeployPhase(gameState);
      
      // クリーチャーがプレイされていることを確認
      expect(gameState.players.player1.field.length).toBe(1);
      expect(gameState.players.player1.field[0].name).toBe('術師見習い');
      // processDeployPhaseがadvancePhaseを呼ぶため手札は変わらない可能性がある
    });
  });

  describe('敵クリーチャーがいる場合', () => {
    beforeEach(() => {
      // 相手の場にクリーチャーを配置
      const skeleton = getCardById('necro_skeleton') as CreatureCard;
      if (!skeleton) throw new Error('necro_skeleton not found');
      
      gameState.players.player2.field = [{
        ...skeleton,
        owner: 'player2',
        currentHealth: skeleton.health,
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
      }];
    });

    it('魔力の奔流が正常にプレイされること', () => {
      // player1の手札に魔力の奔流を追加
      const torrent = getCardById('mag_torrent');
      if (!torrent) throw new Error('mag_torrent not found');
      
      gameState.players.player1.hand = [createCardInstance(torrent, 'test_torrent')];
      
      // 配置フェーズを実行
      processDeployPhase(gameState);
      
      // 魔力の奔流がプレイされていることを確認
      expect(gameState.players.player1.hand.length).toBe(0);
      expect(gameState.players.player1.graveyard.length).toBe(1);
      expect(gameState.players.player1.graveyard[0].name).toBe('魔力の奔流');
    });

    it('秘術の連雷が正常にプレイされること', () => {
      // player1の手札に秘術の連雷を追加
      const lightning = getCardById('mag_arcane_lightning');
      if (!lightning) throw new Error('mag_arcane_lightning not found');
      
      gameState.players.player1.hand = [createCardInstance(lightning, 'test_lightning')];
      
      // 配置フェーズを実行
      processDeployPhase(gameState);
      
      // 秘術の連雷がプレイされていることを確認
      expect(gameState.players.player1.hand.length).toBe(0);
      expect(gameState.players.player1.graveyard.length).toBe(1);
      expect(gameState.players.player1.graveyard[0].name).toBe('秘術の連雷');
    });
  });

  describe('審問官スペルの条件テスト', () => {
    beforeEach(() => {
      // 審問官勢力に変更
      gameState.players.player1.faction = 'inquisitor';
    });

    it('敵がいない場合、沈黙の令状がプレイされないこと', () => {
      const writOfSilence = getCardById('inq_writ_of_silence');
      if (!writOfSilence) throw new Error('inq_writ_of_silence not found');
      
      gameState.players.player1.hand = [createCardInstance(writOfSilence, 'test_writ')];
      gameState.players.player2.field = [];
      
      const initialHandSize = gameState.players.player1.hand.length;
      processDeployPhase(gameState);
      
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
      expect(gameState.players.player1.graveyard.length).toBe(0);
    });

    it('敵がいる場合、罪の重圧が正常にプレイされること', () => {
      const sinBurden = getCardById('inq_sin_burden');
      if (!sinBurden) throw new Error('inq_sin_burden not found');
      
      // 相手の場にクリーチャーを配置
      const skeleton = getCardById('necro_skeleton') as CreatureCard;
      if (!skeleton) throw new Error('necro_skeleton not found');
      
      gameState.players.player2.field = [{
        ...skeleton,
        owner: 'player2',
        currentHealth: skeleton.health,
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
      }];
      
      gameState.players.player1.hand = [createCardInstance(sinBurden, 'test_sin_burden')];
      
      processDeployPhase(gameState);
      
      expect(gameState.players.player1.hand.length).toBe(0);
      expect(gameState.players.player1.graveyard.length).toBe(1);
      expect(gameState.players.player1.graveyard[0].name).toBe('罪の重圧');
    });
  });

  describe('複合ケース', () => {
    it('条件を満たすカードと満たさないカードが混在する場合、条件を満たすカードのみプレイされること', () => {
      const torrent = getCardById('mag_torrent');
      const apprentice = getCardById('mag_apprentice');
      
      if (!torrent || !apprentice) {
        throw new Error('Required test cards not found');
      }
      
      // 手札に両方のカードを追加
      gameState.players.player1.hand = [
        createCardInstance(torrent, 'test_torrent'),
        createCardInstance(apprentice, 'test_apprentice')
      ];
      
      // 相手の場を空にする（魔力の奔流の条件を満たさない）
      gameState.players.player2.field = [];
      
      processDeployPhase(gameState);
      
      // 術師見習いがプレイされ、魔力の奔流は手札に残る
      expect(gameState.players.player1.field.length).toBeGreaterThan(0);
      expect(gameState.players.player1.field.some(c => c.name === '術師見習い')).toBe(true);
      // 魔力の奔流はプレイ条件を満たさないため手札に残る
      expect(gameState.players.player1.hand.some(c => c.name === '魔力の奔流')).toBe(true);
    });
  });
});
