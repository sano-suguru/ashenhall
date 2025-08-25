/**
 * AI同士の自動対戦シミュレーター
 * 
 * ゲームバランスの評価を目的として、指定されたデッキ構成で
 * AI同士の対戦を大量に実行し、統計データを収集する。
 */

import { describe, test, expect, afterAll } from '@jest/globals';
import { executeFullGame } from '@/lib/game-engine/core';
import { FACTION_CARDS } from '@/data/cards/base-cards';
import type { Faction } from '@/types/game';
import fs from 'fs';
import path from 'path';

// シミュレーション設定
const SIMULATION_COUNT = 10; // バランス調整中は回数を減らして高速化
const ALL_FACTIONS: Faction[] = ['necromancer', 'berserker', 'mage', 'knight', 'inquisitor'];

interface SimulationResult {
  faction1: Faction;
  faction2: Faction;
  wins1: number;
  wins2: number;
  draws: number;
  averageTurns: number;
}

const allResults: SimulationResult[] = [];

/**
 * 2勢力間の対戦シミュレーションを実行するヘルパー関数
 */
const runSimulation = (faction1: Faction, faction2: Faction): SimulationResult => {
  const results = {
    wins1: 0,
    wins2: 0,
    draws: 0,
    totalTurns: 0,
  };

  for (let i = 0; i < SIMULATION_COUNT; i++) {
    const finalState = executeFullGame(
      `sim-${faction1}-vs-${faction2}-${i}`,
      FACTION_CARDS[faction1],
      FACTION_CARDS[faction2],
      faction1,
      faction2,
      'balanced',
      'balanced',
      `test-seed-sim-${faction1}-${faction2}-${i}`
    );

    if (finalState.result?.winner === 'player1') {
      results.wins1++;
    } else if (finalState.result?.winner === 'player2') {
      results.wins2++;
    } else {
      results.draws++;
    }
    results.totalTurns += finalState.turnNumber;
  }
  
  return {
    faction1,
    faction2,
    ...results,
    averageTurns: results.totalTurns / SIMULATION_COUNT,
  };
};

describe('AI自動対戦シミュレーター', () => {
  // 全勢力の総当たり戦を実行
  for (let i = 0; i < ALL_FACTIONS.length; i++) {
    for (let j = i + 1; j < ALL_FACTIONS.length; j++) {
      const faction1 = ALL_FACTIONS[i];
      const faction2 = ALL_FACTIONS[j];

      test(`${faction1} vs ${faction2} のシミュレーション`, () => {
        console.log(`\n=== Running simulation: ${faction1} vs ${faction2} (${SIMULATION_COUNT} games) ===`);
        const result = runSimulation(faction1, faction2);
        
        const winRate1 = (result.wins1 / SIMULATION_COUNT) * 100;
        const winRate2 = (result.wins2 / SIMULATION_COUNT) * 100;

        console.log(`  ${result.faction1} Wins: ${result.wins1} (${winRate1.toFixed(2)}%)`);
        console.log(`  ${result.faction2} Wins: ${result.wins2} (${winRate2.toFixed(2)}%)`);
        console.log(`  Average Turns: ${result.averageTurns.toFixed(2)}`);

        allResults.push(result);
        expect(result.wins1 + result.wins2 + result.draws).toBe(SIMULATION_COUNT);
      });
    }
  }
});

afterAll(() => {
  console.log('\n\n--- All Simulations Complete ---');
  
  const reportDir = path.resolve(__dirname, '../../simulation_reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `simulation-results-${timestamp}.json`;
  
  const report = {
    simulationDate: new Date().toISOString(),
    simulationCountPerMatchup: SIMULATION_COUNT,
    results: allResults,
  };

  const reportPath = path.resolve(reportDir, filename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Simulation report saved to: ${reportPath}`);
  console.log('================================');
});
