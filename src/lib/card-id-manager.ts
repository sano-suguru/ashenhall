/**
 * カード・勢力ID管理ユーティリティ
 * 
 * 設計方針:
 * - 文字列IDと一意の数値IDを相互に変換するマッピングを提供
 * - アプリケーション全体でIDの対応関係を単一のソース（Single Source of Truth）から管理
 * - カードや勢力が追加された場合も、マスターデータを更新するだけで自動的に対応可能
 */

import { ALL_CARDS } from '@/data/cards/base-cards';
import type { Faction } from '@/types/game';

// 勢力の順序を固定するための配列（Single Source of Truth）
export const FACTIONS_ORDER: Faction[] = [
  'necromancer',
  'berserker',
  'mage',
  'knight',
  'inquisitor',
];

// --- カードIDマッピング ---

export const cardIdToIntegerMap = new Map<string, number>();
export const integerToCardIdMap = new Map<number, string>();

ALL_CARDS.forEach((card, index) => {
  cardIdToIntegerMap.set(card.id, index);
  integerToCardIdMap.set(index, card.id);
});

// --- 勢力IDマッピング ---

export const factionToIntegerMap = new Map<Faction, number>();
export const integerToFactionMap = new Map<number, Faction>();

FACTIONS_ORDER.forEach((faction, index) => {
  factionToIntegerMap.set(faction, index);
  integerToFactionMap.set(index, faction);
});
