/**
 * AI同士の自動対戦シミュレーター
 * 
 * ゲームバランスの評価を目的として、指定されたデッキ構成で
 * AI同士の対戦を大量に実行し、統計データを収集する。
 */

import { describe, test, expect, afterAll } from '@jest/globals';
import { executeFullGame } from '@/lib/game-engine/core';
import { FACTION_CARDS, getCardById } from '@/data/cards/base-cards';
import { sampleDecks } from '@/data/decks/sample-decks';
import type { Faction, Card } from '@/types/game';
import fs from 'fs';
import path from 'path';

// --- シミュレーション設定 ---
/**
 * 環境別シミュレーション回数の動的調整
 * 
 * 個人開発制約に配慮し、通常の開発・テスト実行では高速化を優先。
 * 詳細なバランス分析が必要な場合のみ、明示的に高回数実行を指定可能。
 */
const getSimulationCount = (): number => {
  if (process.env.CI) return 1;                    // CI環境：最小限（高速フィードバック重視）
  if (process.env.NODE_ENV === 'test' && process.env.QUICK_TEST) return 2; // 開発中：高速
  if (process.env.FULL_SIMULATION) return 100;     // 詳細分析：完全実行（手動指定時）※50→100回に増加
  return 3;                                        // デフォルト：バランス重視（開発継続性重視）
};

const SIMULATION_COUNT = getSimulationCount();

// --- 型定義 ---
interface SimulationResult {
  scenario: string;
  faction1: Faction;
  faction2: Faction;
  deck1Name: string;
  deck2Name: string;
  wins1: number;
  wins2: number;
  draws: number;
  averageTurns: number;
}

const allResults: SimulationResult[] = [];

// --- ヘルパー関数 ---
const runSimulation = (
  scenario: string,
  faction1: Faction, deck1: Card[],
  faction2: Faction, deck2: Card[],
  count: number
): SimulationResult => {
  const results = { wins1: 0, wins2: 0, draws: 0, totalTurns: 0 };

  for (let i = 0; i < count; i++) {
    const finalState = executeFullGame(
      `sim-${scenario}-${i}`,
      deck1, deck2,
      faction1, faction2,
      `seed-${scenario}-${i}`
    );
    if (finalState.result?.winner === 'player1') results.wins1++;
    else if (finalState.result?.winner === 'player2') results.wins2++;
    else results.draws++;
    results.totalTurns += finalState.turnNumber;
  }
  
  return {
    scenario, faction1, faction2,
    deck1Name: deck1.length === FACTION_CARDS[faction1].length ? 'スターター' : 'サンプル',
    deck2Name: deck2.length === FACTION_CARDS[faction2].length ? 'スターター' : 'サンプル',
    ...results,
    averageTurns: results.totalTurns / count,
  };
};

// --- テストスイート ---
describe('AI自動対戦シミュレーター', () => {
  
  // サンプルデッキを事前に準備
  const decks = sampleDecks.map(d => ({
    ...d,
    cards: d.cardIds.map(id => getCardById(id)).filter((c): c is Card => !!c)
  }));

  describe('スイートA: サンプルデッキ総当たり戦', () => {
    for (let i = 0; i < decks.length; i++) {
      for (let j = i + 1; j < decks.length; j++) {
        const deck1 = decks[i];
        const deck2 = decks[j];

        test(`${deck1.name} vs ${deck2.name}`, () => {
          const result = runSimulation(
            'sample-deck-matchup',
            deck1.faction, deck1.cards,
            deck2.faction, deck2.cards,
            SIMULATION_COUNT
          );
          allResults.push(result);
          expect(result.wins1 + result.wins2 + result.draws).toBe(SIMULATION_COUNT);
        });
      }
    }
  });

});

// --- レポート生成 ---
afterAll(() => {
  const reportDir = path.resolve(__dirname, '../../simulation_reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `simulation-results-${timestamp}.json`;
  
  const report = {
    simulationDate: new Date().toISOString(),
    results: allResults,
  };

  const reportPath = path.resolve(reportDir, filename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
});
