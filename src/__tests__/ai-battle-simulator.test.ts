/**
 * AI同士の自動対戦シミュレーター
 * 
 * ゲームバランスの評価を目的として、指定されたデッキ構成で
 * AI同士の対戦を大量に実行し、統計データを収集する。
 */

import { describe, test, expect } from '@jest/globals';
import { executeFullGame } from '@/lib/game-engine/core';
import { necromancerCards, knightCards } from '@/data/cards/base-cards';
import type { GameState, PlayerId } from '@/types/game';

// シミュレーション設定
const SIMULATION_COUNT = 100; // 実行する対戦回数

describe('AI自動対戦シミュレーター', () => {
  test(`死霊術師 vs 騎士のデッキで${SIMULATION_COUNT}回対戦し、統計を出力する`, () => {
    const results = {
      player1Wins: 0,
      player2Wins: 0,
      draws: 0,
      totalTurns: 0,
    };

    console.log(`\n=== AI Battle Simulation Start: Necromancer vs Knight (${SIMULATION_COUNT} games) ===`);

    for (let i = 0; i < SIMULATION_COUNT; i++) {
      const finalState = executeFullGame(
        `sim-${i}`,
        necromancerCards,
        knightCards,
        'necromancer',
        'knight',
        'balanced',
        'balanced',
        `test-seed-sim-${i}`
      );

      if (finalState.result?.winner === 'player1') {
        results.player1Wins++;
      } else if (finalState.result?.winner === 'player2') {
        results.player2Wins++;
      } else {
        results.draws++;
      }
      results.totalTurns += finalState.turnNumber;
    }

    const player1WinRate = (results.player1Wins / SIMULATION_COUNT) * 100;
    const player2WinRate = (results.player2Wins / SIMULATION_COUNT) * 100;
    const averageTurns = results.totalTurns / SIMULATION_COUNT;

    console.log('--- Simulation Results ---');
    console.log(`Necromancer (Player 1) Wins: ${results.player1Wins} (${player1WinRate.toFixed(2)}%)`);
    console.log(`Knight (Player 2) Wins: ${results.player2Wins} (${player2WinRate.toFixed(2)}%)`);
    console.log(`Draws: ${results.draws}`);
    console.log(`Average Turns: ${averageTurns.toFixed(2)}`);
    console.log('==========================');

    // テストとしては、シミュレーションが正常に完了したことを確認
    expect(results.player1Wins + results.player2Wins + results.draws).toBe(SIMULATION_COUNT);
  });
});
