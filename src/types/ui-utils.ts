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

// === 型安全性のためのユーティリティ型 ===

/** 配列の要素型を取得 */
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer U)[] ? U : never;

/** オプショナルなプロパティを必須に変換 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/** 型の厳密性チェック用 */
export type Exact<T, U> = T extends U ? (U extends T ? T : never) : never;
