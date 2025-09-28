/**
 * カードレジストリ - 勢力別カードの統合管理
 * 
 * 設計方針:
 * - 各勢力カードファイルからインポートして統合
 * - 動的に統計情報を計算
 * - 既存のAPIとの完全互換性を保持
 */

import type { Card, Faction } from '@/types/game';

// 勢力別カードファイルからインポート
import { necromancerCards } from './base-cards/necromancer-cards';
import { berserkerCards } from './base-cards/berserker-cards';
import { mageCards } from './base-cards/mage-cards';
import { knightCards } from './base-cards/knight-cards';
import { inquisitorCards } from './base-cards/inquisitor-cards';

/**
 * 全カードデータを勢力別にエクスポート
 */
export const FACTION_CARDS: Record<Faction, Card[]> = {
  necromancer: necromancerCards,
  berserker: berserkerCards,
  mage: mageCards,
  knight: knightCards,
  inquisitor: inquisitorCards,
};

/**
 * 全カードのフラットなリスト
 */
export const ALL_CARDS: Card[] = [
  ...necromancerCards,
  ...berserkerCards,
  ...mageCards,
  ...knightCards,
  ...inquisitorCards,
];

/**
 * カードIDから基本カードデータを取得
 * @param cardId 取得するカードのID
 * @returns マッチするカード、または undefined
 */
export function getCardById(cardId: string): Card | undefined {
  return ALL_CARDS.find(card => card.templateId === cardId);
}

/**
 * 勢力のカード一覧を取得
 * @param faction 取得する勢力
 * @returns 指定勢力のカード配列
 */
export function getCardsByFaction(faction: Faction): Card[] {
  return FACTION_CARDS[faction] || [];
}

/**
 * カード数の統計情報（動的計算）
 */
export const CARD_STATISTICS = {
  totalCards: ALL_CARDS.length,
  cardsPerFaction: {
    necromancer: necromancerCards.length,
    berserker: berserkerCards.length,
    mage: mageCards.length,
    knight: knightCards.length,
    inquisitor: inquisitorCards.length,
  },
  costRange: { 
    min: Math.min(...ALL_CARDS.map(card => card.cost)), 
    max: Math.max(...ALL_CARDS.map(card => card.cost)) 
  },
  averageCost: ALL_CARDS.reduce((sum, card) => sum + card.cost, 0) / ALL_CARDS.length,
  cardsWithEffects: ALL_CARDS.filter(card => card.effects.length > 0).length,
} as const;
