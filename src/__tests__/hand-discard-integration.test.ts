/**
 * 手札破壊統合テスト
 * 
 * executeHandDiscardEffectのUniversalFilterEngine統合動作を検証
 * 新規実装機能の安全性を保証
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { executeHandDiscardEffect } from "@/lib/game-engine/effects/core-effects";
import { createInitialGameState } from "@/lib/game-engine/core";
import { necromancerCards, mageCards, knightCards } from "@/data/cards/base-cards";
import type { GameState, FilterRule, Keyword } from "@/types/game";
import { SeededRandom } from "@/lib/game-engine/seeded-random";

describe("executeHandDiscardEffect - UniversalFilterEngine統合テスト", () => {
  let gameState: GameState;
  let seededRandom: SeededRandom;

  beforeEach(() => {
    // テスト用デッキを作成
    const testDeck = [
      ...necromancerCards.slice(0, 5),
      ...mageCards.slice(0, 5),
      ...knightCards.slice(0, 5),
    ];

    gameState = createInitialGameState(
      'hand-discard-test',
      testDeck,
      testDeck,
      'necromancer',
      'necromancer',
      'balanced',
      'balanced',
      'test-seed-hand-discard'
    );

    seededRandom = new SeededRandom('test-seed');
  });

  describe("基本的な手札破壊機能", () => {
    it("フィルターなしで正しくカードを破壊する", () => {
      const initialHandSize = gameState.players.player1.hand.length;
      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      // フィルターなしで手札破壊を実行
      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, undefined);

      // 手札が1枚減少し、墓地が1枚増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize - 1);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize + 1);

      // アクションログに記録されることを確認
      const discardAction = gameState.actionLog.find(action =>
        action.type === 'effect_trigger' && 
        action.data.effectType === 'hand_discard'
      );
      expect(discardAction).toBeDefined();
    });

    it("手札が空の場合は何もしない", () => {
      // 手札を空にする
      gameState.players.player1.hand = [];

      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, undefined);

      // 墓地が変化しないことを確認
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize);
    });

    it("複数枚の破壊が正しく動作する", () => {
      const initialHandSize = gameState.players.player1.hand.length;
      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      // 3枚破壊を実行
      executeHandDiscardEffect(gameState, 'player1', 3, 'test-source', seededRandom, undefined);

      // 手札が3枚減少し、墓地が3枚増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize - 3);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize + 3);
    });

    it("破壊枚数が手札枚数を超える場合は全て破壊する", () => {
      // 手札を2枚にする
      gameState.players.player1.hand = [necromancerCards[0], mageCards[0]];

      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      // 5枚破壊を試行（実際は2枚しかない）
      executeHandDiscardEffect(gameState, 'player1', 5, 'test-source', seededRandom, undefined);

      // 手札が空になり、墓地が2枚増加することを確認
      expect(gameState.players.player1.hand.length).toBe(0);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize + 2);
    });
  });

  describe("FilterRuleによるフィルタリング", () => {
    it("勢力フィルターで正しくカードを破壊する", () => {
      // テスト用に特定勢力のカードを手札に配置
      gameState.players.player1.hand = [
        necromancerCards[0], // ネクロマンサー
        mageCards[0],        // メイジ
        knightCards[0],      // ナイト
      ];

      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'mage' }];
      
      const initialHandSize = gameState.players.player1.hand.length;
      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, rules);

      // 手札が1枚減少し、墓地が1枚増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize - 1);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize + 1);

      // メイジカードが破壊されたことを確認
      const discardedCard = gameState.players.player1.graveyard[gameState.players.player1.graveyard.length - 1];
      expect(discardedCard.faction).toBe('mage');

      // 手札に残っているカードがメイジではないことを確認
      const remainingMageCards = gameState.players.player1.hand.filter(c => c.faction === 'mage');
      expect(remainingMageCards.length).toBe(0);
    });

    it("コスト範囲フィルターで正しくカードを破壊する", () => {
      // 異なるコストのカードを手札に配置
      const lowCostCard = necromancerCards.find(c => c.cost === 1)!;
      const midCostCard = necromancerCards.find(c => c.cost === 3)!;
      const highCostCard = knightCards.find(c => c.cost === 4)!;
      
      gameState.players.player1.hand = [lowCostCard, midCostCard, highCostCard];

      const rules: FilterRule[] = [{ 
        type: 'cost', 
        operator: 'range', 
        minValue: 2, 
        maxValue: 4 
      }];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeHandDiscardEffect(gameState, 'player1', 2, 'test-source', seededRandom, rules);

      // 条件に合うカードのみが破壊されることを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize - 2);
      
      // 残ったカードがコスト1のカードであることを確認
      expect(gameState.players.player1.hand[0].cost).toBe(1);
    });

    it("カード種別フィルターで正しくカードを破壊する", () => {
      // クリーチャーとスペルカードを混在させる
      const creatureCard = necromancerCards.find(c => c.type === 'creature')!;
      const spellCard = necromancerCards.find(c => c.type === 'spell')!;
      
      gameState.players.player1.hand = [creatureCard, spellCard];

      const rules: FilterRule[] = [{ type: 'card_type', operator: 'eq', value: 'spell' }];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, rules);

      // スペルカードのみが破壊されることを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize - 1);
      expect(gameState.players.player1.hand[0].type).toBe('creature');
      
      // 墓地に送られたカードがスペルであることを確認
      const discardedCard = gameState.players.player1.graveyard[gameState.players.player1.graveyard.length - 1];
      expect(discardedCard.type).toBe('spell');
    });

    it("複数フィルターの組み合わせで正しくカードを破壊する", () => {
      // 条件に合うクリーチャーカードを選択
      const targetCard = necromancerCards.find(c => c.type === 'creature' && c.cost <= 3)!;
      // 条件に合わないスペルカードを選択
      const nonTargetCard = necromancerCards.find(c => c.type === 'spell')!;
      
      gameState.players.player1.hand = [targetCard, nonTargetCard];

      const rules: FilterRule[] = [
        { type: 'card_type', operator: 'eq', value: 'creature' },
        { type: 'faction', operator: 'eq', value: 'necromancer' },
        { type: 'cost', operator: 'range', minValue: 1, maxValue: 3 }
      ];
      
      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, rules);

      // 条件に合う1枚のみが破壊されることを確認
      expect(gameState.players.player1.hand.length).toBe(1);
      expect(gameState.players.player1.hand[0]).toBe(nonTargetCard);
    });

    it("条件に合うカードがない場合は何もしない", () => {
      gameState.players.player1.hand = [necromancerCards[0]];

      // 存在しない条件でフィルター
      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'berserker' }];
      
      const initialHandSize = gameState.players.player1.hand.length;
      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, rules);

      // 手札と墓地が変化しないことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize);
    });
  });

  describe("ランダム選択機能", () => {
    it("複数の候補から正しく選択する", () => {
      // 同じ条件を満たすカードを複数配置
      const card1 = { ...mageCards[0], id: 'mage-discard-1' };
      const card2 = { ...mageCards[1], id: 'mage-discard-2' };
      gameState.players.player1.hand = [card1, card2];

      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'mage' }];
      
      // 特定のカードを選択するモックランダム
      const specificSeededRandom = new SeededRandom('specific-seed');
      
      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', specificSeededRandom, rules);

      // どちらかのメイジカードが破壊されることを確認
      expect(gameState.players.player1.hand.length).toBe(1);
      expect(gameState.players.player1.graveyard.length).toBe(1);
      
      // 墓地のカードがメイジであることを確認
      const discardedCard = gameState.players.player1.graveyard[0];
      expect(discardedCard.faction).toBe('mage');
    });
  });

  describe("エッジケースとエラーハンドリング", () => {
    it("空のFilterRuleで全手札から破壊する", () => {
      const rules: FilterRule[] = [];
      
      const initialHandSize = gameState.players.player1.hand.length;
      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, rules);

      // 手札が1枚減少し、墓地が1枚増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize - 1);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize + 1);
    });

    it("未定義のFilterRuleで正常に動作する", () => {
      const initialHandSize = gameState.players.player1.hand.length;
      const initialGraveyardSize = gameState.players.player1.graveyard.length;

      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, undefined);

      // 手札が1枚減少し、墓地が1枚増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize - 1);
      expect(gameState.players.player1.graveyard.length).toBe(initialGraveyardSize + 1);
    });
  });

  describe("プレイヤー固有の動作", () => {
    it("player2の手札破壊が正しく動作する", () => {
      const initialPlayer1HandSize = gameState.players.player1.hand.length;
      const initialPlayer2HandSize = gameState.players.player2.hand.length;
      const initialPlayer2GraveyardSize = gameState.players.player2.graveyard.length;

      executeHandDiscardEffect(gameState, 'player2', 1, 'test-source', seededRandom, undefined);

      // player2の手札と墓地が正しく変化することを確認
      expect(gameState.players.player2.hand.length).toBe(initialPlayer2HandSize - 1);
      expect(gameState.players.player2.graveyard.length).toBe(initialPlayer2GraveyardSize + 1);

      // player1に影響がないことを確認（初期サイズを維持）
      expect(gameState.players.player1.hand.length).toBe(initialPlayer1HandSize);
    });
  });

  describe("実際のカード効果との統合", () => {
    it("《懺悔するサキュバス》のhand_discard効果が正しく動作する", () => {
      // プレイヤー2の手札にカードを配置
      gameState.players.player2.hand = [
        necromancerCards[0],
        mageCards[0],
        knightCards[0],
      ];

      const initialPlayer2HandSize = gameState.players.player2.hand.length;
      const initialPlayer2GraveyardSize = gameState.players.player2.graveyard.length;

      // 《懺悔するサキュバス》のhand_discard効果を模擬
      executeHandDiscardEffect(gameState, 'player2', 1, 'inq_repentant_succubus', seededRandom, undefined);

      // 相手の手札が1枚減少し、墓地が1枚増加することを確認
      expect(gameState.players.player2.hand.length).toBe(initialPlayer2HandSize - 1);
      expect(gameState.players.player2.graveyard.length).toBe(initialPlayer2GraveyardSize + 1);
    });
  });

  describe("フィルタリング精度テスト", () => {
    it("キーワードフィルターで正しくカードを破壊する", () => {
      // キーワード付きカードを手札に追加
      const guardCard = {
        ...knightCards[0],
        id: 'test-guard-hand',
        keywords: ['guard'] as Keyword[]
      };
      const normalCard = necromancerCards[0];
      
      gameState.players.player1.hand = [guardCard, normalCard];

      const rules: FilterRule[] = [{ type: 'keyword', operator: 'has', value: 'guard' }];
      
      executeHandDiscardEffect(gameState, 'player1', 1, 'test-source', seededRandom, rules);

      // ガード持ちカードが破壊されることを確認
      expect(gameState.players.player1.hand.length).toBe(1);
      expect(gameState.players.player1.hand[0]).toBe(normalCard);
      
      // 墓地のカードがガード持ちであることを確認
      const discardedCard = gameState.players.player1.graveyard[gameState.players.player1.graveyard.length - 1];
      expect(discardedCard.keywords).toContain('guard');
    });

    it("自分除外フィルターで正しくカードを破壊する", () => {
      const sourceCard = necromancerCards[0];
      const targetCard = { ...sourceCard, id: 'different-card' };
      
      gameState.players.player1.hand = [sourceCard, targetCard];

      const rules: FilterRule[] = [{ type: 'exclude_self', operator: 'eq', value: true }];
      
      executeHandDiscardEffect(gameState, 'player1', 1, sourceCard.id, seededRandom, rules);

      // ソースカード以外が破壊されることを確認
      expect(gameState.players.player1.hand.length).toBe(1);
      expect(gameState.players.player1.hand[0].id).toBe(sourceCard.id);
      
      // 破壊されたカードが異なるIDであることを確認
      const discardedCard = gameState.players.player1.graveyard[gameState.players.player1.graveyard.length - 1];
      expect(discardedCard.id).toBe('different-card');
    });
  });
});
