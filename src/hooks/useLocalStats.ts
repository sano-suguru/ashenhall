/**
 * ローカル統計管理フック
 *
 * 設計方針:
 * - localStorage操作の完全な抽象化
 * - エラーハンドリングの統一実装
 * - Phase 1でのサーバー統計移行への準備
 */

import { useState, useEffect, useCallback } from 'react';
import type { LocalStats, GameState } from '@/types/game';
import { loadStats, saveStats, updateStatsWithGameResult } from '@/lib/stats-utils';

interface LocalStatsReturn {
  // 統計データ
  localStats: LocalStats | null;

  // 統計更新関数
  updateWithGameResult: (gameState: GameState) => void;
  refreshStats: () => void;

  // エラー状態
  loadError: Error | null;
  saveError: Error | null;

  // ローディング状態
  isLoading: boolean;
}

/**
 * ローカル統計管理フック
 * page.tsx内の統計管理ロジックを独立したフックとして抽出
 */
export const useLocalStats = (): LocalStatsReturn => {
  const [localStats, setLocalStats] = useState<LocalStats | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 統計データの読み込み
  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // 非同期処理として実装（テスト可能）
      await new Promise((resolve) => setTimeout(resolve, 0));
      const stats = loadStats();
      setLocalStats(stats);
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error('統計データの読み込みに失敗しました');
      setLoadError(errorObj);
      console.error('Failed to load stats:', errorObj);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期化時の統計読み込み
  useEffect(() => {
    const initializeStats = async () => {
      await refreshStats();
    };
    initializeStats();
  }, [refreshStats]);

  // ゲーム結果による統計更新
  const updateWithGameResult = useCallback(
    (gameState: GameState) => {
      if (!gameState.result) {
        console.warn('ゲーム結果が未確定のため統計更新をスキップします');
        return;
      }

      if (!localStats) {
        console.warn('統計データが読み込まれていないため統計更新をスキップします');
        return;
      }

      setSaveError(null);

      try {
        // 統計更新
        const updatedStats = updateStatsWithGameResult(localStats, gameState);

        // localStorage保存
        saveStats(updatedStats);

        // 状態更新
        setLocalStats(updatedStats);

        console.log('統計データが正常に更新されました');
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error('統計データの保存に失敗しました');
        setSaveError(errorObj);
        console.error('Failed to save stats:', errorObj);

        // 保存失敗時は統計データを元に戻す（整合性確保）
        refreshStats();
      }
    },
    [localStats, refreshStats]
  );

  return {
    localStats,
    updateWithGameResult,
    refreshStats,
    loadError,
    saveError,
    isLoading,
  };
};
