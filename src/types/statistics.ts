/**
 * Ashenhall 統計・分析システム型定義
 * 
 * 設計方針:
 * - カードバランス分析用メトリクス
 * - プレイヤー戦績・統計データ
 * - 非同期対戦システム
 */

import type {
  Faction,
  TacticsType
} from './core';

import type {
  Card
} from './cards';

// === バランス・分析用型定義 ===

/** カードの価値メトリクス */
export interface CardMetrics {
  /** 基本価値（攻撃力+体力） */
  baseValue: number;
  /** 効果価値（効果の換算値） */
  effectValue: number;
  /** コスト効率 */
  costEfficiency: number;
  /** 使用率（統計データより） */
  usageRate?: number;
  /** 勝率（統計データより） */
  winRate?: number;
}

/** デッキ構成の分析データ */
export interface DeckAnalysis {
  /** 総カード数 */
  totalCards: number;
  /** 平均エネルギーコスト */
  averageCost: number;
  /** コスト分布 */
  costDistribution: Record<number, number>;
  /** 勢力純正度（同勢力カードの割合） */
  factionPurity: number;
  /** 予想戦術タイプ */
  suggestedTactics: TacticsType;
}

// === ローカル統計機能用型定義 ===

/** 勢力ごとの戦績 */
export interface FactionStats {
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

// === 非同期対戦用型定義 ===

/** 対戦申請 */
export interface BattleRequest {
  /** 申請プレイヤーID */
  playerId: string;
  /** 使用デッキ */
  deck: Card[];
  /** 戦術タイプ */
  tacticsType: TacticsType;
  /** 申請時刻 */
  requestTime: number;
  /** 希望対戦相手（オプション） */
  preferredOpponent?: string;
}

/** 対戦マッチング情報 */
export interface BattleMatch {
  /** マッチID */
  matchId: string;
  /** プレイヤー1の情報 */
  player1: BattleRequest;
  /** プレイヤー2の情報 */
  player2: BattleRequest;
  /** マッチング時刻 */
  matchTime: number;
  /** 戦闘実行状態 */
  status: 'pending' | 'running' | 'completed' | 'error';
}
