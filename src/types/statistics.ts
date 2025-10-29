/**
 * Ashenhall 統計・分析システム型定義
 *
 * 設計方針:
 * - カードバランス分析用メトリクス
 * - プレイヤー戦績・統計データ
 * - 非同期対戦システム
 */

import type { Faction } from './core';

// === ローカル統計機能用型定義 ===

/** 勢力ごとの戦績 */
interface FactionStats {
  games: number;
  wins: number;
}

/** ローカル統計データ */
export interface LocalStats {
  totalGames: number;
  totalWins: number;
  factionStats: Record<Faction, FactionStats>;
  lastPlayed: string; // ISO 8601 形式の日付文字列
}
