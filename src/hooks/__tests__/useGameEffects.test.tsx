import { renderHook, act } from '@testing-library/react';
import { useGameEffects } from '../useGameEffects';
import type { GameState, PlayerState, GamePhase, GameResult } from '@/types/game';

type PartialPlayer = Partial<PlayerState> & { id: PlayerState['id'] };

type Overrides = Partial<GameState>;

const createPlayerState = ({ id, ...rest }: PartialPlayer): PlayerState => ({
  id,
  life: 15,
  energy: 0,
  maxEnergy: 8,
  faction: 'necromancer',
  deck: [],
  hand: [],
  field: [],
  graveyard: [],
  banishedCards: [],
  ...rest,
});

const createGameState = (overrides?: Overrides): GameState => ({
  gameId: 'test-game',
  turnNumber: 1,
  currentPlayer: 'player1',
  phase: 'draw',
  players: {
    player1: createPlayerState({ id: 'player1' }),
    player2: createPlayerState({ id: 'player2', faction: 'berserker' }),
  },
  actionLog: [],
  randomSeed: 'seed',
  startTime: Date.now(),
  ...overrides,
});

describe('useGameEffects', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('detects phase transitions', () => {
    const initialState = createGameState();
    const { result, rerender } = renderHook(({ state }) => useGameEffects(state), {
      initialProps: { state: initialState },
    });

    const nextState: GameState = {
      ...initialState,
      phase: 'energy' as GamePhase,
    };

    act(() => {
      rerender({ state: nextState });
    });

    expect(result.current.effectState.phaseTransition).toBe(true);

    act(() => {
      jest.advanceTimersByTime(810);
    });

    expect(result.current.effectState.phaseTransition).toBe(false);
  });

  it('detects life changes for both players', () => {
    const initialState = createGameState();
    const { result, rerender } = renderHook(({ state }) => useGameEffects(state), {
      initialProps: { state: initialState },
    });

    const lifeChanged: GameState = {
      ...initialState,
      players: {
        player1: { ...initialState.players.player1, life: 12 },
        player2: { ...initialState.players.player2, life: 18 },
      },
    };

    act(() => {
      rerender({ state: lifeChanged });
    });

    expect(result.current.effectState.lifePulse).toEqual([
      { playerId: 'player1', diff: -3 },
      { playerId: 'player2', diff: 3 },
    ]);

    act(() => {
      jest.advanceTimersByTime(710);
    });

    expect(result.current.effectState.lifePulse).toEqual([]);
  });

  it('detects energy changes', () => {
    const initialState = createGameState();
    const { result, rerender } = renderHook(({ state }) => useGameEffects(state), {
      initialProps: { state: initialState },
    });

    const energyChanged: GameState = {
      ...initialState,
      players: {
        player1: { ...initialState.players.player1, energy: 2 },
        player2: { ...initialState.players.player2, energy: 1 },
      },
    };

    act(() => {
      rerender({ state: energyChanged });
    });

    expect(result.current.effectState.energyPulse).toEqual([
      { playerId: 'player1', diff: 2 },
      { playerId: 'player2', diff: 1 },
    ]);

    act(() => {
      jest.advanceTimersByTime(710);
    });

    expect(result.current.effectState.energyPulse).toEqual([]);
  });

  it('detects game result changes', () => {
    const initialState = createGameState();
    const { result, rerender } = renderHook(({ state }) => useGameEffects(state), {
      initialProps: { state: initialState },
    });

    const gameResult: GameResult = {
      winner: 'player1',
      reason: 'life_zero',
      totalTurns: 12,
      durationSeconds: 45,
      endTime: Date.now(),
    };

    const finishedState: GameState = {
      ...initialState,
      result: gameResult,
    };

    act(() => {
      rerender({ state: finishedState });
    });

    expect(result.current.effectState.resultChange).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current.effectState.resultChange).toBe(false);
  });
});
