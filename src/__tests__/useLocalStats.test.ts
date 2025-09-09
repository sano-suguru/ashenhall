/**
 * useLocalStats フック ユニットテスト
 * 
 * テスト方針:
 * - localStorage操作の正常系・異常系テスト
 * - 統計更新ロジックの正確性確認
 * - エラーハンドリングとデータ整合性の確保
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocalStats } from '@/hooks/useLocalStats';
import { createInitialGameState } from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards } from '@/data/cards/base-cards';
import type { LocalStats, GameState, Card } from '@/types/game';

// localStorage のモック
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// stats-utils のモック（部分的）
jest.mock('@/lib/stats-utils', () => {
  const actualModule = jest.requireActual('@/lib/stats-utils');
  return {
    ...actualModule,
    loadStats: jest.fn(),
    saveStats: jest.fn(),
    updateStatsWithGameResult: jest.fn(),
  };
});

import { loadStats, saveStats, updateStatsWithGameResult } from '@/lib/stats-utils';

const mockLoadStats = loadStats as jest.MockedFunction<typeof loadStats>;
const mockSaveStats = saveStats as jest.MockedFunction<typeof saveStats>;
const mockUpdateStatsWithGameResult = updateStatsWithGameResult as jest.MockedFunction<typeof updateStatsWithGameResult>;

describe('useLocalStats', () => {
  // コンソールモック用スパイ
  let consoleSpy: {
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    log: jest.SpyInstance;
  };

  // テスト用データ
  const mockInitialStats: LocalStats = {
    totalGames: 5,
    totalWins: 3,
    factionStats: {
      necromancer: { games: 2, wins: 1 },
      berserker: { games: 1, wins: 1 },
      mage: { games: 1, wins: 0 },
      knight: { games: 1, wins: 1 },
      inquisitor: { games: 0, wins: 0 },
    },
    lastPlayed: '2025-01-01T00:00:00.000Z',
  };

  const mockUpdatedStats: LocalStats = {
    ...mockInitialStats,
    totalGames: 6,
    totalWins: 4,
    factionStats: {
      ...mockInitialStats.factionStats,
      necromancer: { games: 3, wins: 2 },
    },
    lastPlayed: '2025-01-01T12:00:00.000Z',
  };

  // テスト用ゲーム状態
  const createTestGameState = (winner: 'player1' | 'player2' | null = 'player1'): GameState => {
    const deck1 = necromancerCards.slice(0, 20);
    const deck2 = berserkerCards.slice(0, 20);
    
    const gameState = createInitialGameState(
      'test-game',
      deck1,
      deck2,
      'necromancer',
      'berserker', 
      'balanced',
      'aggressive',
      'test-seed'
    );
    
    // ゲーム結果を設定
    gameState.result = {
      winner,
      reason: 'life_zero',
      totalTurns: 8,
      durationSeconds: 240,
      endTime: Date.now(),
    };
    
    return gameState;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    
    // コンソール出力をモック（クリーンなテスト出力のため）
    consoleSpy = {
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      log: jest.spyOn(console, 'log').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    // コンソールモックの復元
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.log.mockRestore();
  });

  describe('初期化と統計読み込み', () => {
    test('正常な統計データの読み込み', async () => {
      mockLoadStats.mockReturnValue(mockInitialStats);

      const { result } = renderHook(() => useLocalStats());

      // 非同期処理完了まで待機（長めの時間設定）
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.localStats).toEqual(mockInitialStats);
      expect(result.current.loadError).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockLoadStats).toHaveBeenCalledTimes(1);
    });

    test('統計データ読み込み失敗時のエラー処理', async () => {
      const mockError = new Error('localStorage読み込み失敗');
      mockLoadStats.mockImplementation(() => {
        throw mockError;
      });

      const { result } = renderHook(() => useLocalStats());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.localStats).toBeNull();
      expect(result.current.loadError).toEqual(mockError);
      expect(result.current.isLoading).toBe(false);
      
      // console.errorが正しく呼ばれたことを検証
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to load stats:', mockError);
    });

    test('統計データが存在しない場合の初期化', async () => {
      mockLoadStats.mockImplementation(() => {
        return {
          totalGames: 0,
          totalWins: 0,
          factionStats: {
            necromancer: { games: 0, wins: 0 },
            berserker: { games: 0, wins: 0 },
            mage: { games: 0, wins: 0 },
            knight: { games: 0, wins: 0 },
            inquisitor: { games: 0, wins: 0 },
          },
          lastPlayed: expect.any(String),
        };
      });

      const { result } = renderHook(() => useLocalStats());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.localStats!.totalGames).toBe(0);
      expect(result.current.localStats!.totalWins).toBe(0);
      expect(result.current.loadError).toBeNull();
    });
  });

  describe('基本動作確認', () => {
    test('統計データの基本的な読み込み動作', async () => {
      mockLoadStats.mockReturnValue(mockInitialStats);

      const { result } = renderHook(() => useLocalStats());

      // 非同期初期化完了まで待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.localStats).toEqual(mockInitialStats);
      expect(result.current.loadError).toBeNull();
      expect(mockLoadStats).toHaveBeenCalled();
    });

    test('統計更新機能の基本動作', async () => {
      mockLoadStats.mockReturnValue(mockInitialStats);

      const { result } = renderHook(() => useLocalStats());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const testGameState = createTestGameState('player1');
      mockUpdateStatsWithGameResult.mockReturnValue(mockUpdatedStats);

      // 統計更新実行
      act(() => {
        result.current.updateWithGameResult(testGameState);
      });

      // 関数が呼び出されることを確認
      expect(mockUpdateStatsWithGameResult).toHaveBeenCalledWith(mockInitialStats, testGameState);
      expect(mockSaveStats).toHaveBeenCalled();
    });

    test('エラー状態の基本管理', async () => {
      const mockError = new Error('テストエラー');
      mockLoadStats.mockImplementation(() => {
        throw mockError;
      });

      const { result } = renderHook(() => useLocalStats());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.localStats).toBeNull();
      expect(result.current.loadError).toEqual(mockError);
      
      // console.errorが正しく呼ばれたことを検証
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to load stats:', mockError);
    });

    test('ゲーム結果未確定時のスキップ動作', async () => {
      mockLoadStats.mockReturnValue(mockInitialStats);

      const { result } = renderHook(() => useLocalStats());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const incompleteGameState = createTestGameState();
      incompleteGameState.result = undefined;

      act(() => {
        result.current.updateWithGameResult(incompleteGameState);
      });

      // スキップされることを確認
      expect(mockUpdateStatsWithGameResult).not.toHaveBeenCalled();
      
      // console.warnが正しく呼ばれたことを検証
      expect(consoleSpy.warn).toHaveBeenCalledWith('ゲーム結果が未確定のため統計更新をスキップします');
    });
  });
});
