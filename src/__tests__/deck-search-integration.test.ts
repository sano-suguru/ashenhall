/**
 * デッキサーチ統合テスト
 * 
 * executeDeckSearchEffectのUniversalFilterEngine統合動作を検証
 * 実際のゲーム状況での安全性を保証
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { executeDeckSearchEffect } from "@/lib/game-engine/effects/specialized-effects";
import { createInitialGameState } from "@/lib/game-engine/core";
import { necromancerCards, mageCards, knightCards } from "@/data/cards/base-cards";
import { createCardInstance } from "@/test-helpers/card-test-helpers";
import type { GameState, FilterRule, Keyword, CreatureCard } from "@/types/game";

describe("executeDeckSearchEffect - UniversalFilterEngine統合テスト", () => {
  let gameState: GameState;
  let mockRandom: { choice: <T>(array: T[]) => T | undefined };

  beforeEach(() => {
    // テスト用デッキを作成（多様なカードを含む）
    const testDeck = [
      ...necromancerCards.slice(0, 3).map((t, i) => createCardInstance(t, `necro-${i}`)),
      ...mageCards.slice(0, 3).map((t, i) => createCardInstance(t, `mage-${i}`)),
      ...knightCards.slice(0, 3).map((t, i) => createCardInstance(t, `knight-${i}`)),
    ];

    gameState = createInitialGameState(
      'deck-search-test',
      testDeck,
      testDeck,
      'necromancer',
      'necromancer',
      'test-seed-deck-search'
    );

    // 決定論的テストのためのモックランダム
    mockRandom = {
      choice: <T>(array: T[]): T | undefined => array[0] // 常に最初の要素を選択
    };
  });

  describe("基本的なデッキサーチ機能", () => {
    it("フィルターなしで正しくカードを取得する", () => {
      const initialHandSize = gameState.players.player1.hand.length;
      const initialDeckSize = gameState.players.player1.deck.length;

      // フィルターなしでデッキサーチを実行
      executeDeckSearchEffect(gameState, 'player1', 'test-source', undefined, mockRandom);

      // 手札が1枚増加し、デッキが1枚減少することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
      expect(gameState.players.player1.deck.length).toBe(initialDeckSize - 1);

      // アクションログに記録されることを確認
      const searchAction = gameState.actionLog.find(action =>
        action.type === 'effect_trigger' && 
        action.data.effectType === 'deck_search'
      );
      expect(searchAction).toBeDefined();
    });

    it("手札上限時は何もしない", () => {
      // 手札を上限まで埋める
      while (gameState.players.player1.hand.length < 7) {
        gameState.players.player1.hand.push(
          createCardInstance(necromancerCards[0], `hand-filler-${gameState.players.player1.hand.length}`)
        );
      }

      const initialHandSize = gameState.players.player1.hand.length;
      const initialDeckSize = gameState.players.player1.deck.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', undefined, mockRandom);

      // 手札とデッキのサイズが変化しないことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
      expect(gameState.players.player1.deck.length).toBe(initialDeckSize);
    });

    it("デッキが空の場合は何もしない", () => {
      // デッキを空にする
      gameState.players.player1.deck = [];

      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', undefined, mockRandom);

      // 手札が変化しないことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
    });
  });

  describe("FilterRuleによるフィルタリング", () => {
    it("勢力フィルターで正しくカードを検索する", () => {
      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'mage' }];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);

      // 取得したカードがメイジ勢力であることを確認
      const addedCard = gameState.players.player1.hand[gameState.players.player1.hand.length - 1];
      expect(addedCard.faction).toBe('mage');
    });

    it("コスト範囲フィルターで正しくカードを検索する", () => {
      const rules: FilterRule[] = [{ 
        type: 'cost', 
        operator: 'range', 
        minValue: 2, 
        maxValue: 3 
      }];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);

      // 取得したカードのコストが範囲内であることを確認
      const addedCard = gameState.players.player1.hand[gameState.players.player1.hand.length - 1];
      expect(addedCard.cost).toBeGreaterThanOrEqual(2);
      expect(addedCard.cost).toBeLessThanOrEqual(3);
    });

    it("カード種別フィルターで正しくカードを検索する", () => {
      const rules: FilterRule[] = [{ type: 'card_type', operator: 'eq', value: 'creature' }];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);

      // 取得したカードがクリーチャーであることを確認
      const addedCard = gameState.players.player1.hand[gameState.players.player1.hand.length - 1];
      expect(addedCard.type).toBe('creature');
    });

    it("複数フィルターの組み合わせで正しくカードを検索する", () => {
      const rules: FilterRule[] = [
        { type: 'card_type', operator: 'eq', value: 'creature' },
        { type: 'faction', operator: 'eq', value: 'knight' },
        { type: 'cost', operator: 'range', minValue: 1, maxValue: 3 }
      ];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);

      // 取得したカードが全ての条件を満たすことを確認
      const addedCard = gameState.players.player1.hand[gameState.players.player1.hand.length - 1];
      expect(addedCard.type).toBe('creature');
      expect(addedCard.faction).toBe('knight');
      expect(addedCard.cost).toBeGreaterThanOrEqual(1);
      expect(addedCard.cost).toBeLessThanOrEqual(3);
    });

    it("条件に合うカードがない場合は何もしない", () => {
      // 存在しない条件でフィルター
      const rules: FilterRule[] = [{ 
        type: 'cost', 
        operator: 'range', 
        minValue: 100, 
        maxValue: 200 
      }];
      
      const initialHandSize = gameState.players.player1.hand.length;
      const initialDeckSize = gameState.players.player1.deck.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, mockRandom);

      // 手札とデッキが変化しないことを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize);
      expect(gameState.players.player1.deck.length).toBe(initialDeckSize);
    });
  });

  describe("キーワードフィルタリング", () => {
    it("キーワードフィルターで正しくカードを検索する", () => {
      // テスト用にキーワード付きカードをデッキに追加
      const guardCard = createCardInstance(necromancerCards[0], 'test-guard-card') as CreatureCard;
      guardCard.keywords = ['guard'] as Keyword[];
      gameState.players.player1.deck.push(guardCard);

      const rules: FilterRule[] = [{ type: 'keyword', operator: 'has', value: 'guard' }];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);

      // 取得したカードがガードキーワードを持つことを確認
      const addedCard = gameState.players.player1.hand[gameState.players.player1.hand.length - 1];
      expect(addedCard.keywords).toContain('guard');
    });
  });

  describe("ランダム選択機能", () => {
    it("複数の候補から正しく選択する", () => {
      // 同じ勢力のカードを複数デッキに追加
      const mageCard1 = { ...mageCards[0], instanceId: 'mage-1' };
      const mageCard2 = { ...mageCards[1], instanceId: 'mage-2' };
      gameState.players.player1.deck = [mageCard1, mageCard2];

      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'mage' }];
      
      // 特定のカードを選択するモックランダム
      const specificMockRandom = {
        choice: <T>(array: T[]): T | undefined => array[1] // 2番目の要素を選択
      };

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, specificMockRandom);

      // 2番目のカードが手札に追加されることを確認
      const addedCard = gameState.players.player1.hand[gameState.players.player1.hand.length - 1];
      expect(addedCard.instanceId).toBe('mage-2');

      // デッキから正しく除去されることを確認
      expect(gameState.players.player1.deck.find(c => c.instanceId === 'mage-2')).toBeUndefined();
    });

    it("ランダム関数なしでもデフォルトのランダム選択が動作する", () => {
      const rules: FilterRule[] = [{ type: 'faction', operator: 'eq', value: 'necromancer' }];
      
      const initialHandSize = gameState.players.player1.hand.length;

      // ランダム関数を渡さずに実行
      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules);

      // 手札が増加することを確認（内蔵のMath.randomが使用される）
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
    });
  });

  describe("エッジケースとエラーハンドリング", () => {
    it("空のFilterRuleで全デッキから検索する", () => {
      const rules: FilterRule[] = [];
      
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', rules, mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
    });

    it("未定義のFilterRuleで正常に動作する", () => {
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', undefined, mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
    });

    it("nullのFilterRuleで正常に動作する", () => {
      const initialHandSize = gameState.players.player1.hand.length;

      executeDeckSearchEffect(gameState, 'player1', 'test-source', null as unknown as FilterRule[], mockRandom);

      // 手札が増加することを確認
      expect(gameState.players.player1.hand.length).toBe(initialHandSize + 1);
    });
  });

  describe("プレイヤー固有の動作", () => {
    it("player2のデッキサーチが正しく動作する", () => {
      const initialHandSize = gameState.players.player2.hand.length;
      const initialDeckSize = gameState.players.player2.deck.length;

      executeDeckSearchEffect(gameState, 'player2', 'test-source', undefined, mockRandom);

      // player2の手札とデッキが正しく変化することを確認
      expect(gameState.players.player2.hand.length).toBe(initialHandSize + 1);
      expect(gameState.players.player2.deck.length).toBe(initialDeckSize - 1);

      // player1に影響がないことを確認（初期状態のサイズを取得）
      const player1InitialHand = 3; // createInitialGameStateで設定される初期手札
      expect(gameState.players.player1.hand.length).toBe(player1InitialHand);
    });
  });
});
