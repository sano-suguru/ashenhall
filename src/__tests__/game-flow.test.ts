/**
 * ゲームフロー統合テスト
 * 
 * ゲーム開始から終了までの一連の流れをシミュレートし、
 * システム全体が正しく連携して動作することを検証する。
 */

import { describe, test, expect } from '@jest/globals';
import { executeFullGame } from '@/lib/game-engine/core';
import { necromancerCards, knightCards } from '@/data/cards/base-cards';

describe('ゲームフロー統合テスト', () => {
  test('死霊術師 vs 騎士のデッキでゲームが正常に終了する', () => {
    const finalState = executeFullGame(
      'integration-test-1',
      necromancerCards,
      knightCards,
      'necromancer',
      'knight',
      'balanced',
      'balanced',
      'test-seed-flow'
    );

    // ゲームが終了していることを確認
    expect(finalState.result).not.toBeNull();
    expect(finalState.result?.winner).not.toBeNull();

    // どちらかのプレイヤーのライフが0以下になっているか、
    // または30ターン経過していることを確認
    const player1LifeZero = finalState.players.player1.life <= 0;
    const player2LifeZero = finalState.players.player2.life <= 0;
    const maxTurnsReached = finalState.turnNumber >= 30;

    expect(player1LifeZero || player2LifeZero || maxTurnsReached).toBe(true);
  });

  test('デッキが切れたプレイヤーはダメージを受け、最終的に敗北する', () => {
    // 非常に小さいデッキでゲームを開始
    const smallDeck = necromancerCards.slice(0, 3);
    const finalState = executeFullGame(
      'integration-test-deckout',
      smallDeck,
      knightCards,
      'necromancer',
      'knight',
      'balanced',
      'balanced',
      'test-seed-deckout'
    );

    // ゲームが終了し、勝者が決まっていることを確認
    expect(finalState.result).not.toBeNull();
    expect(finalState.result?.winner).toBe('player2');
    expect(finalState.result?.reason).toBe('life_zero');

    // プレイヤー1のライフが0以下になっていることを確認
    expect(finalState.players.player1.life).toBeLessThanOrEqual(0);
  });
});
