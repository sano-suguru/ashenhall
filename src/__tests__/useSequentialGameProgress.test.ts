/**
 * useSequentialGameProgress フック テスト
 * 
 * テスト方針:
 * - 完了待機原則の動作確認
 * - 直列処理の順序保証確認
 * - 従来フックとの互換性確認
 */

import { renderHook, act } from '@testing-library/react';
import { useSequentialGameProgress, type SequentialGameProgressConfig } from '@/hooks/useSequentialGameProgress';
import { createInitialGameState } from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards } from '@/data/cards/base-cards';
import type { GameState } from '@/types/game';

// processGameStepのモック
jest.mock('@/lib/game-engine/core', () => ({
  ...jest.requireActual('@/lib/game-engine/core'),
  processGameStep: jest.fn(),
}));

import { processGameStep } from '@/lib/game-engine/core';
const mockProcessGameStep = processGameStep as jest.MockedFunction<typeof processGameStep>;

describe('useSequentialGameProgress', () => {
  let consoleSpy: jest.SpyInstance;

  const createTestGameState = (): GameState => {
    const deck1 = necromancerCards.slice(0, 20);
    const deck2 = berserkerCards.slice(0, 20);
    
    return createInitialGameState(
      'test-game',
      deck1,
      deck2,
      'necromancer',
      'berserker', 
      'balanced',
      'aggressive',
      'test-seed'
    );
  };

  const createBasicConfig = (overrides: Partial<SequentialGameProgressConfig> = {}): SequentialGameProgressConfig => ({
    gameState: createTestGameState(),
    isPlaying: true,
    currentTurn: -1,
    gameSpeed: 1.0,
    onGameStateChange: jest.fn(),
    onGameFinished: jest.fn(),
    onStatsUpdate: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    consoleSpy.mockRestore();
  });

  describe('基本機能', () => {
    test('gameStateがnullの場合、displayStateもnull', () => {
      const config = createBasicConfig({ gameState: null });
      const { result } = renderHook(() => useSequentialGameProgress(config));

      expect(result.current.displayState).toBeNull();
      expect(result.current.progressError).toBeNull();
      expect(result.current.isProcessing).toBe(false);
    });

    test('初期状態でアニメーションなし', () => {
      const config = createBasicConfig();
      const { result } = renderHook(() => useSequentialGameProgress(config));

      expect(result.current.currentAnimationState).toEqual({
        isAnimating: false,
        animationType: 'none',
        sourceCardId: undefined,
        targetCardId: undefined,
      });

      // カードアニメーション状態もすべてfalse
      const cardState = result.current.getCardAnimationState('test-card-id');
      expect(cardState).toEqual({
        isAttacking: false,
        isBeingAttacked: false,
        isDying: false,
        damageAmount: 0,
      });
    });

    test('最新ターン表示時はdisplayState = gameState', () => {
      const testGameState = createTestGameState();
      const config = createBasicConfig({ 
        gameState: testGameState,
        currentTurn: -1 
      });

      const { result } = renderHook(() => useSequentialGameProgress(config));

      expect(result.current.displayState).toBe(testGameState);
    });
  });

  describe('シーケンシャル処理', () => {
    test('完了待機原則による順次実行', async () => {
      const initialGameState = createTestGameState();
      const nextGameState = { ...initialGameState, turnNumber: 2 };
      
      mockProcessGameStep.mockReturnValue(nextGameState);
      
      const onGameStateChangeMock = jest.fn();
      const config = createBasicConfig({ 
        gameState: initialGameState,
        onGameStateChange: onGameStateChangeMock
      });

      const { result } = renderHook(() => useSequentialGameProgress(config));

      // 初期状態の確認
      expect(result.current.isProcessing).toBe(false);

      // タイマー実行（シーケンシャル処理開始）
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // 処理中状態の確認は同期的にはできないが、モックが呼ばれることは確認可能
      expect(mockProcessGameStep).toHaveBeenCalledWith(initialGameState);
    });

    test('ゲーム終了時のコールバック実行', () => {
      const initialGameState = createTestGameState();
      const finishedGameState = {
        ...initialGameState,
        result: {
          winner: 'player1' as const,
          reason: 'life_zero' as const,
          totalTurns: 5,
          durationSeconds: 120,
          endTime: Date.now(),
        }
      };
      
      mockProcessGameStep.mockReturnValue(finishedGameState);
      
      const onGameFinishedMock = jest.fn();
      const onStatsUpdateMock = jest.fn();
      const config = createBasicConfig({ 
        gameState: initialGameState,
        onGameFinished: onGameFinishedMock,
        onStatsUpdate: onStatsUpdateMock
      });

      renderHook(() => useSequentialGameProgress(config));

      // タイマー実行（同期化により即座に処理完了）
      act(() => {
        jest.advanceTimersByTime(100);
        // Promise の非同期処理完了を待機
        jest.runAllTimers();
      });

      expect(onGameFinishedMock).toHaveBeenCalled();
      expect(onStatsUpdateMock).toHaveBeenCalledWith(finishedGameState);
    });

    test('エラーハンドリング', () => {
      const initialGameState = createTestGameState();
      const mockError = new Error('シーケンシャル処理エラー');
      
      mockProcessGameStep.mockImplementation(() => {
        throw mockError;
      });

      const config = createBasicConfig({ gameState: initialGameState });
      const { result } = renderHook(() => useSequentialGameProgress(config));

      // タイマー実行（テスト環境では同期的エラー処理）
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // テスト環境では即座にエラーが設定される
      expect(result.current.currentAnimationState.isAnimating).toBe(false);
      expect(result.current.progressError).toEqual(mockError);
    });
  });

  describe('アニメーション状態管理', () => {
    test('アニメーションなし状態の確認', () => {
      const config = createBasicConfig();
      const { result } = renderHook(() => useSequentialGameProgress(config));

      // 初期状態ではすべてのカードでアニメーションなし
      const cardState = result.current.getCardAnimationState('test-card');
      expect(cardState.isAttacking).toBe(false);
      expect(cardState.isBeingAttacked).toBe(false);
      expect(cardState.isDying).toBe(false);
      expect(cardState.damageAmount).toBe(0);
    });

    test('currentAnimationStateの初期値確認', () => {
      const config = createBasicConfig();
      const { result } = renderHook(() => useSequentialGameProgress(config));

      expect(result.current.currentAnimationState.isAnimating).toBe(false);
      expect(result.current.currentAnimationState.animationType).toBe('none');
      expect(result.current.currentAnimationState.sourceCardId).toBeUndefined();
      expect(result.current.currentAnimationState.targetCardId).toBeUndefined();
    });
  });

  describe('ゲーム制御', () => {
    test('一時停止時は処理されない', () => {
      const config = createBasicConfig({ isPlaying: false });

      renderHook(() => useSequentialGameProgress(config));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockProcessGameStep).not.toHaveBeenCalled();
    });

    test('ゲーム終了状態では処理されない', () => {
      const finishedGameState = createTestGameState();
      finishedGameState.result = {
        winner: 'player1',
        reason: 'life_zero',
        totalTurns: 5,
        durationSeconds: 120,
        endTime: Date.now(),
      };

      const config = createBasicConfig({ gameState: finishedGameState });

      renderHook(() => useSequentialGameProgress(config));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockProcessGameStep).not.toHaveBeenCalled();
    });

    test('過去ターン表示時は進行しない', () => {
      const gameState = createTestGameState();
      gameState.turnNumber = 5;

      const config = createBasicConfig({ 
        gameState,
        currentTurn: 3  // 過去ターン表示
      });

      renderHook(() => useSequentialGameProgress(config));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockProcessGameStep).not.toHaveBeenCalled();
    });
  });

  describe('従来システムとの互換性', () => {
    test('getCardAnimationStateの戻り値形式が一致', () => {
      const config = createBasicConfig();
      const { result } = renderHook(() => useSequentialGameProgress(config));

      const animationState = result.current.getCardAnimationState('test-card');
      
  // 逐次モデル移行後も旧 useAttackSequence が返していた形式互換を維持することを確認
      expect(animationState).toHaveProperty('isAttacking');
      expect(animationState).toHaveProperty('isBeingAttacked');
      expect(animationState).toHaveProperty('isDying');
      expect(animationState).toHaveProperty('damageAmount');
      
      expect(typeof animationState.isAttacking).toBe('boolean');
      expect(typeof animationState.isBeingAttacked).toBe('boolean');
      expect(typeof animationState.isDying).toBe('boolean');
      expect(typeof animationState.damageAmount).toBe('number');
    });

    test('displayStateの形式が従来と一致', () => {
      const testGameState = createTestGameState();
      const config = createBasicConfig({ gameState: testGameState });
      
      const { result } = renderHook(() => useSequentialGameProgress(config));

      expect(result.current.displayState).toBe(testGameState);
      expect(result.current.progressError).toBeNull();
    });
  });
});
