/**
 * ローカル統計管理ユーティリティ
 * 
 * 設計方針:
 * - localStorageとのやり取りを抽象化
 * - 安全なデータの読み書き（エラーハンドリング）
 * - テスト可能な純粋な関数として実装
 */

import type { LocalStats, Faction, GameState, PlayerId } from '@/types/game';

const STATS_STORAGE_KEY = 'ashenhall_local_stats';

/**
 * 初期状態の統計データを生成
 */
export function getInitialStats(): LocalStats {
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
    lastPlayed: new Date().toISOString(),
  };
}

/**
 * localStorageから統計データを読み込む
 */
export function loadStats(): LocalStats {
  try {
    const storedStats = localStorage.getItem(STATS_STORAGE_KEY);
    if (storedStats) {
      // TODO: ここでデータ構造のバリデーションを追加するとより堅牢になる
      return JSON.parse(storedStats) as LocalStats;
    }
  } catch (error) {
    console.error('Failed to load stats from localStorage:', error);
    // エラーが発生した場合は初期データを返す
  }
  return getInitialStats();
}

/**
 * localStorageに統計データを保存する
 */
export function saveStats(stats: LocalStats): void {
  try {
    const statsString = JSON.stringify(stats);
    localStorage.setItem(STATS_STORAGE_KEY, statsString);
  } catch (error) {
    console.error('Failed to save stats to localStorage:', error);
  }
}

/**
 * ゲーム結果を基に統計データを更新する
 * @param currentStats 更新前の統計データ
 * @param gameState 終了したゲームの状態
 * @returns 更新後の新しい統計データオブジェクト
 */
export function updateStatsWithGameResult(
  currentStats: LocalStats,
  gameState: GameState
): LocalStats {
  if (!gameState.result) {
    return currentStats;
  }

  // ディープコピーして元のオブジェクトを変更しない
  const newStats: LocalStats = JSON.parse(JSON.stringify(currentStats));

  const playerFaction = gameState.players.player1.faction;
  const winner = gameState.result.winner;

  // 全体統計を更新
  newStats.totalGames += 1;
  if (winner === 'player1') {
    newStats.totalWins += 1;
  }

  // 勢力別統計を更新
  newStats.factionStats[playerFaction].games += 1;
  if (winner === 'player1') {
    newStats.factionStats[playerFaction].wins += 1;
  }

  // 最終プレイ日時を更新
  newStats.lastPlayed = new Date().toISOString();

  return newStats;
}
