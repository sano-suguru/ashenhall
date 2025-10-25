/**
 * Ashenhall UI・ユーティリティ型定義
 * 
 * 設計方針:
 * - UI表示・ログフォーマット関連
 * - デッキビルディング機能
 * - 型安全性のためのユーティリティ型
 */

import type {
  Faction
} from './core';

import type {
  GameAction
} from './game-state';

// === ログ表示用拡張型定義 ===

/** ログ表示用の構造化データ */
export interface LogDisplayParts {
  type: GameAction['type'];
  iconName: string; // 'Zap', 'Swords', 'Flag' など Lucide Icon の名前
  playerName: string;
  message: string; // メインのメッセージ部分
  details?: string; // コストやダメージなどの詳細情報
  cardIds: string[]; // 関連するカードIDのリスト
  triggerText?: string; // 'プレイされた時' などのトリガー情報
}

// === デッキビルディング機能用型定義 ===

/** カスタムデッキ */
export interface CustomDeck {
  id: string; // UUID
  name: string;
  faction: Faction;
  cards: string[]; // カードIDの配列
  coreCardIds: string[]; // コアカードのID配列
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** 保存されるデッキコレクション */
export interface DeckCollection {
  decks: CustomDeck[];
  activeDeckIds: Partial<Record<Faction, string>>; // 各勢力で選択中のデッキID
}
