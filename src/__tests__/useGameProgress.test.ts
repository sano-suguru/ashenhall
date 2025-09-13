/**
 * useGameProgress フック ユニットテスト
 * 
 * テスト方針:
 * - displayState計算の正確性確認
 * - AttackSequence演出管理の動作確認
 * - エラーハンドリングの実装確認
 * - Phase 1 リプレイモード準備の確認
 */

import { renderHook, act } from '@testing-library/react';
import { useGameProgress, type GameProgressConfig } from '@/hooks/useGameProgress';
import { createInitialGameState } from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards } from '@/data/cards/base-cards';
import type { GameState } from '@/types/game';

// game-engine/core のモック（processGameStep のみ）
jest.mock('@/lib/game-engine/core', () => ({
  ...jest.requireActual('@/lib/game-engine/core'),
  processGameStep: jest.fn(),
}));

// game-state-utils のモック（reconstructStateAtSequence のみ）
jest.mock('@/lib/game-state-utils', () => ({
  ...jest.requireActual('@/lib/game-state-utils'),
  reconstructStateAtSequence: jest.fn(),
}));

import { processGameStep } from '@/lib/game-engine/core';
import { reconstructStateAtSequence } from '@/lib/game-state-utils';

const mockProcessGameStep = processGameStep as jest.MockedFunction<typeof processGameStep>;
const mockReconstructStateAtSequence = reconstructStateAtSequence as jest.MockedFunction<typeof reconstructStateAtSequence>;

describe('useGameProgress', () => {
  // コンソールモック用スパイ
  let consoleSpy: {
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  // テスト用ゲーム状態
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

  // 基本設定
  const createBasicConfig = (overrides: Partial<GameProgressConfig> = {}): GameProgressConfig => ({
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
    
    // コンソール出力をモック（クリーンなテスト出力のため）
    consoleSpy = {
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    
    // コンソールモックの復元
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('基本機能', () => {
    test('gameStateがnullの場合、displayStateもnull', () => {
      const config = createBasicConfig({ gameState: null });
      const { result } = renderHook(() => useGameProgress(config));

      expect(result.current.displayState).toBeNull();
      expect(result.current.currentAttackAction).toBeNull();
      expect(result.current.progressError).toBeNull();
    });

    test('最新ターン表示時はdisplayState = gameState', () => {
      const testGameState = createTestGameState();
      const config = createBasicConfig({ 
        gameState: testGameState,
        currentTurn: -1 
      });

      const { result } = renderHook(() => useGameProgress(config));

      expect(result.current.displayState).toBe(testGameState);
    });

    test('過去ターン表示時はreconstructStateAtSequenceが呼ばれる', () => {
      const testGameState = createTestGameState();
      // ターン数を増やしてテスト条件を満たす
      testGameState.turnNumber = 5;
      
      const reconstructedState = { ...testGameState, turnNumber: 3 };
      mockReconstructStateAtSequence.mockReturnValue(reconstructedState);

      const config = createBasicConfig({ 
        gameState: testGameState,
        currentTurn: 3  // 3 < 5 なので reconstruct が呼ばれる
      });

      const { result } = renderHook(() => useGameProgress(config));

      expect(mockReconstructStateAtSequence).toHaveBeenCalledWith(testGameState, expect.any(Number));
      expect(result.current.displayState).toBe(reconstructedState);
    });
  });

  describe('ゲーム進行制御', () => {
    test('ゲーム終了状態では進行しない', () => {
      const finishedGameState = createTestGameState();
      finishedGameState.result = {
        winner: 'player1',
        reason: 'life_zero',
        totalTurns: 5,
        durationSeconds: 120,
        endTime: Date.now(),
      };

      const config = createBasicConfig({ 
        gameState: finishedGameState,
        isPlaying: true 
      });

      renderHook(() => useGameProgress(config));

      // タイマーが設定されていないことを確認
      expect(jest.getTimerCount()).toBe(0);
      expect(mockProcessGameStep).not.toHaveBeenCalled();
    });

    test('一時停止状態では進行しない', () => {
      const config = createBasicConfig({ isPlaying: false });

      renderHook(() => useGameProgress(config));

      expect(jest.getTimerCount()).toBe(0);
      expect(mockProcessGameStep).not.toHaveBeenCalled();
    });

    test('再生状態では適切なタイマーが設定される', () => {
      const config = createBasicConfig({ 
        gameSpeed: 2.0  // 2倍速
      });

      renderHook(() => useGameProgress(config));

      // タイマーが設定されることを確認
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      
      // processGameStepがまだ呼ばれていないことを確認（タイマー未実行）
      expect(mockProcessGameStep).not.toHaveBeenCalled();
    });

    test('processGameStepが呼ばれて状態が更新される', () => {
      const initialGameState = createTestGameState();
      const nextGameState = { ...initialGameState, turnNumber: 2 };
      
      mockProcessGameStep.mockReturnValue(nextGameState);
      
      const onGameStateChangeMock = jest.fn();
      const config = createBasicConfig({ 
        gameState: initialGameState,
        onGameStateChange: onGameStateChangeMock 
      });

      renderHook(() => useGameProgress(config));

      // タイマー実行
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockProcessGameStep).toHaveBeenCalledWith(initialGameState);
      expect(onGameStateChangeMock).toHaveBeenCalledWith(nextGameState);
    });

    test('ゲーム終了時にコールバックが呼ばれる', () => {
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

      renderHook(() => useGameProgress(config));

      // タイマー実行
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onGameFinishedMock).toHaveBeenCalled();
      expect(onStatsUpdateMock).toHaveBeenCalledWith(finishedGameState);
    });
  });

  describe('AttackSequence演出', () => {
    test('攻撃アクションがない場合は演出開始しない', () => {
      // 攻撃アクションのないゲーム状態
      const gameStateWithoutAttack = createTestGameState();
      gameStateWithoutAttack.actionLog = [
        {
          sequence: 0,
          playerId: 'player1',
          type: 'phase_change',
          data: { fromPhase: 'draw', toPhase: 'energy' },
          timestamp: Date.now(),
        }
      ];

      const config = createBasicConfig({ gameState: gameStateWithoutAttack });
      const { result } = renderHook(() => useGameProgress(config));

      expect(result.current.attackSequenceState.isShowingAttackSequence).toBe(false);
      expect(result.current.currentAttackAction).toBeNull();
    });

    test('攻撃演出の基本状態管理', () => {
      const config = createBasicConfig();
      const { result } = renderHook(() => useGameProgress(config));

      // 初期状態は演出なし
      expect(result.current.attackSequenceState).toEqual({
        isShowingAttackSequence: false,
        currentAttackIndex: 0,
        attackActions: []
      });
      expect(result.current.currentAttackAction).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    test('processGameStep失敗時のエラー処理', () => {
      const mockError = new Error('ゲーム進行エラー');
      mockProcessGameStep.mockImplementation(() => {
        throw mockError;
      });

      const config = createBasicConfig();
      const { result } = renderHook(() => useGameProgress(config));

      // タイマー実行（エラー発生）
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.progressError).toEqual(mockError);
      
      // console.errorが正しく呼ばれたことを検証
      expect(consoleSpy.error).toHaveBeenCalledWith('Game step processing failed:', mockError);
    });

    test('基本的なエラー状態管理', () => {
      const config = createBasicConfig();
      const { result } = renderHook(() => useGameProgress(config));

      // 初期状態ではエラーなし
      expect(result.current.progressError).toBeNull();
      
      // displayStateは正常に表示される
      expect(result.current.displayState).toBe(config.gameState);
    });
  });

  describe('Phase 1 拡張準備', () => {
    test('replayモードでの基本動作', () => {
      const originalGameState = createTestGameState();
      const replayGameState = { ...originalGameState, turnNumber: 10 };
      
      const config = createBasicConfig({
        mode: 'replay',
        replayData: replayGameState,
        isPlaying: false  // リプレイは通常一時停止状態
      });

      const { result } = renderHook(() => useGameProgress(config));

      // replayDataが使用されることを確認
      expect(result.current.displayState).toBe(replayGameState);
      
      // リプレイモードでは自動進行しない
      expect(jest.getTimerCount()).toBe(0);
    });

    test('リプレイモードでの過去ターン表示', () => {
      const replayGameState = createTestGameState();
      replayGameState.turnNumber = 10;
      
      const reconstructedReplayState = { ...replayGameState, turnNumber: 5 };
      mockReconstructStateAtSequence.mockReturnValue(reconstructedReplayState);

      const config = createBasicConfig({
        mode: 'replay',
        replayData: replayGameState,
        currentTurn: 5,
        isPlaying: false
      });

      const { result } = renderHook(() => useGameProgress(config));

      expect(mockReconstructStateAtSequence).toHaveBeenCalledWith(replayGameState, expect.any(Number));
      expect(result.current.displayState).toBe(reconstructedReplayState);
    });
  });

  describe('速度制御', () => {
    test('gameSpeedが遅延時間に反映される', () => {
      const config1 = createBasicConfig({ gameSpeed: 1.0 });
      const config2 = createBasicConfig({ gameSpeed: 2.0 });
      
      const { rerender } = renderHook((props: GameProgressConfig) => useGameProgress(props), {
        initialProps: config1
      });

      // 1倍速でのタイマー確認
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      
      // 2倍速に変更
      rerender(config2);
      
      // タイマーがリセットされ、新しい速度で設定される
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('メモ化動作', () => {
    test('displayStateが依存値変更時に再計算される', () => {
      const gameState1 = createTestGameState();
      const gameState2 = { ...gameState1, turnNumber: 5 };
      
      const config1 = createBasicConfig({ gameState: gameState1 });
      const config2 = createBasicConfig({ gameState: gameState2 });

      const { result, rerender } = renderHook(
        (props: GameProgressConfig) => useGameProgress(props),
        { initialProps: config1 }
      );

      const initialDisplayState = result.current.displayState;

      // gameState変更
      rerender(config2);

      // displayStateが更新される
      expect(result.current.displayState).not.toBe(initialDisplayState);
    });

    test('displayStateが依存値未変更時に再計算されない', () => {
      const config = createBasicConfig();
      
      const { result, rerender } = renderHook(
        (props: GameProgressConfig) => useGameProgress(props),
        { initialProps: config }
      );

      const initialDisplayState = result.current.displayState;

      // 無関係なコールバック変更
      const newConfig = { 
        ...config, 
        onGameFinished: jest.fn()  // 新しい関数（依存値でない）
      };
      rerender(newConfig);

      // displayStateは再計算されない
      expect(result.current.displayState).toBe(initialDisplayState);
    });
  });

  describe('統合動作', () => {
    test('基本的なゲーム進行フロー', () => {
      const initialGameState = createTestGameState();
      const nextGameState = { ...initialGameState, turnNumber: 2 };
      
      mockProcessGameStep.mockReturnValue(nextGameState);
      
      const onGameStateChangeMock = jest.fn();
      const config = createBasicConfig({ 
        gameState: initialGameState,
        onGameStateChange: onGameStateChangeMock
      });

      const { result } = renderHook(() => useGameProgress(config));

      // 初期表示状態の確認
      expect(result.current.displayState).toBe(initialGameState);
      expect(result.current.progressError).toBeNull();

      // タイマー実行
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockProcessGameStep).toHaveBeenCalledWith(initialGameState);
      expect(onGameStateChangeMock).toHaveBeenCalledWith(nextGameState);
    });

    test('エラー発生時の基本動作', () => {
      const initialGameState = createTestGameState();
      
      // processGameStepでエラーが発生する設定
      const mockError = new Error('一時的なエラー');
      mockProcessGameStep.mockImplementation(() => {
        throw mockError;
      });

      const config = createBasicConfig({ gameState: initialGameState });
      const { result } = renderHook(() => useGameProgress(config));

      // 初期状態は正常
      expect(result.current.progressError).toBeNull();
      expect(result.current.displayState).toBe(initialGameState);

      // タイマー実行（エラー発生）
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // エラーが記録される
      expect(result.current.progressError).toEqual(mockError);
      
      // displayStateは維持される
      expect(result.current.displayState).toBe(initialGameState);
    });
  });

  describe('Phase 1 準備機能', () => {
    test('localモードとreplayモードの切り替え', () => {
      const gameState = createTestGameState();
      const replayData = { ...gameState, turnNumber: 15 };

      // localモード
      const localConfig = createBasicConfig({ 
        mode: 'local',
        gameState 
      });
      const { result: localResult } = renderHook(() => useGameProgress(localConfig));
      expect(localResult.current.displayState).toBe(gameState);

      // replayモード  
      const replayConfig = createBasicConfig({
        mode: 'replay',
        replayData,
        gameState: null  // replayモードではgameStateは無視
      });
      const { result: replayResult } = renderHook(() => useGameProgress(replayConfig));
      expect(replayResult.current.displayState).toBe(replayData);
    });
  });
});
