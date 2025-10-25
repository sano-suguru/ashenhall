import { executeFullGame } from '@/lib/game-engine/core';
import type { Card, Faction, GameAction } from '@/types/game';
import { necromancerCards } from '@/data/cards/base-cards';
import { createCardInstance } from '@/test-helpers/card-test-helpers';

function createTestDeck(): Card[] {
  const deck: Card[] = [];
  const subset = necromancerCards.slice(0, 2);
  subset.forEach(card => {
    for (let i = 0; i < 10; i++) {
      deck.push(createCardInstance(card, `d${i}`));
    }
  });
  return deck;
}

describe('creature_destroyed action snapshot', () => {
  test('destroy action includes cardSnapshot', () => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    const faction: Faction = 'necromancer';
    const state = executeFullGame('destroy-snapshot', deck1, deck2, faction, faction, 'seed-destroy');
    const destroyActions = state.actionLog.filter(a => a.type === 'creature_destroyed');
    expect(destroyActions.length).toBeGreaterThan(0);
    const first = destroyActions[0] as Extract<GameAction,{type:'creature_destroyed'}>;
    expect(first.data.cardSnapshot).toBeDefined();
    if (first.data.cardSnapshot) {
      expect(first.data.cardSnapshot.id).toBe(first.data.destroyedCardId);
      expect(first.data.cardSnapshot.attackTotal).toBeGreaterThanOrEqual(0);
      expect(first.data.cardSnapshot.healthTotal).toBeGreaterThan(0);
    }
  });
});
