import { executeFullGame } from '@/lib/game-engine/core';
import { computeGameMetrics, formatMetrics } from '@/lib/metrics/action-log-metrics';
import type { Card, Faction } from '@/types/game';
import { necromancerCards } from '@/data/cards/base-cards';
import { createCardInstance } from '@/test-helpers/card-test-helpers';

function createTestDeck(): Card[] {
  const deck: Card[] = [];
  const subset = necromancerCards.slice(0, 4);
  subset.forEach(card => {
    for (let i = 0; i < 5; i++) {
      deck.push(createCardInstance(card, `m${i}`));
    }
  });
  return deck;
}

describe('action-log metrics', () => {
  test('computeGameMetrics returns aggregate with combat_stage present', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
  const faction: Faction = 'necromancer';
  const state = executeFullGame('metrics-game', deck1, deck2, faction, faction, 'seed-metrics');
    const metrics = computeGameMetrics(state);
    expect(metrics.aggregate.total).toBeGreaterThan(0);
    // combat_stage が 1 度は出現している前提 (最低1回は攻撃する想定)
    expect(metrics.aggregate.byType['combat_stage']).toBeGreaterThan(0);
    // フェーズ集計の検証
    expect(metrics.aggregatePhases).toBeDefined();
    if (metrics.aggregatePhases) {
      const sumPhases = Object.values(metrics.aggregatePhases.totalByPhase).reduce((a,b)=>a+b,0);
      expect(sumPhases).toBe(metrics.aggregate.total);
      const ratioSum = Object.values(metrics.aggregatePhases.ratioByPhase).reduce((a,b)=>a+b,0);
      expect(ratioSum).toBeGreaterThan(0.99);
      expect(ratioSum).toBeLessThan(1.01);
    }
    const text = formatMetrics(metrics);
    expect(text).toContain('Game metrics-game');
  });
});
