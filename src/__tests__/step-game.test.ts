import { stepGame } from '@/lib/game-engine/step-game';
import type { GameState, GameAction } from '@/types/game-state';
import type { PlayerId } from '@/types/core';

function dummyPlayers() {
  return {
    player1: {
      deck: [],
      hand: [],
      graveyard: [],
      banishedCards: [],
      field: [],
    },
    player2: {
      deck: [],
      hand: [],
      graveyard: [],
      banishedCards: [],
      field: [],
    },
  };
}

describe('stepGame', () => {
  it('新規アクションがない場合は newActions が空', () => {
    const state: GameState = { actionLog: [], players: dummyPlayers() } as unknown as GameState;
    const { newState, newActions } = stepGame(state);
    expect(newState).not.toBe(state); // clone される
    expect(newActions).toEqual([]);
  });

  it('actionLog に新規アクションが追加された場合は差分のみ返す', () => {
    const P1: PlayerId = 'player1';
    const base: GameAction = {
      sequence: 1,
      playerId: P1,
      type: 'card_attack',
      data: { attackerCardId: 'cA', targetId: 'cB', damage: 2 },
      timestamp: 0,
    } as unknown as GameAction;
    const next: GameState = {
      actionLog: [
        base,
        {
          sequence: 2,
          playerId: P1,
          type: 'effect_trigger',
          data: {
            sourceCardId: 'cX',
            effectType: 'damage',
            effectValue: 3,
            targets: { cB: { health: { before: 5, after: 2 } } },
          },
          timestamp: 1,
        },
      ],
      players: dummyPlayers(),
    } as unknown as GameState;
    const { newState, newActions } = stepGame(next);
    expect(newState).not.toBe(next); // clone される
    expect(Array.isArray(newActions)).toBe(true);
    expect(newActions.length).toBe(0);
  });
});
