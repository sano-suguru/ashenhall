/**
 * カードレジストリ - 勢力別カードの統合管理
 *
 * 設計方針:
 * - 各勢力カードファイルからインポートして統合
 * - 動的に統計情報を計算
 * - 既存のAPIとの完全互換性を保持
 */

import type { CardTemplate, Card, Faction } from '@/types/game';

// 勢力別カードファイルからインポート
import { necromancerCards } from './base-cards/necromancer-cards';
import { berserkerCards } from './base-cards/berserker-cards';
import { mageCards } from './base-cards/mage-cards';
import { knightCards } from './base-cards/knight-cards';
import { inquisitorCards } from './base-cards/inquisitor-cards';

/**
 * 全カードテンプレートを勢力別にエクスポート
 */
const FACTION_CARD_TEMPLATES: Record<Faction, CardTemplate[]> = {
  necromancer: necromancerCards,
  berserker: berserkerCards,
  mage: mageCards,
  knight: knightCards,
  inquisitor: inquisitorCards,
};

/**
 * 全カードテンプレートのフラットなリスト
 */
export const ALL_CARD_TEMPLATES: CardTemplate[] = [
  ...necromancerCards,
  ...berserkerCards,
  ...mageCards,
  ...knightCards,
  ...inquisitorCards,
];

/**
 * カードテンプレートからカードインスタンスを生成
 * @param template カードテンプレート
 * @param instanceId インスタンスID（指定されない場合は自動生成）
 * @returns カードインスタンス
 */
export function createCardFromTemplate(template: CardTemplate, instanceId?: string): Card {
  const finalInstanceId =
    instanceId || `${template.templateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    ...template,
    instanceId: finalInstanceId,
  } as Card;
}

/**
 * カードIDから基本カードテンプレートを取得
 * @param cardId 取得するカードのID
 * @returns マッチするカードテンプレート、または undefined
 */
export function getCardTemplateById(cardId: string): CardTemplate | undefined {
  return ALL_CARD_TEMPLATES.find((card) => card.templateId === cardId);
}

/**
 * カードIDからカードインスタンスを生成
 * @param cardId 取得するカードのID
 * @param instanceId 指定するinstanceId（省略時は自動生成）
 * @returns マッチするカードインスタンス、または undefined
 */
export function getCardById(cardId: string, instanceId?: string): Card | undefined {
  const template = getCardTemplateById(cardId);
  if (!template) return undefined;

  return createCardFromTemplate(template, instanceId);
}

/**
 * 勢力のカードテンプレート一覧を取得
 * @param faction 取得する勢力
 * @returns 指定勢力のカードテンプレート配列
 */
function getCardTemplatesByFaction(faction: Faction): CardTemplate[] {
  return FACTION_CARD_TEMPLATES[faction] || [];
}

/**
 * 勢力のカードインスタンス一覧を取得
 * @param faction 取得する勢力
 * @returns 指定勢力のカードインスタンス配列
 */
export function getCardsByFaction(faction: Faction): Card[] {
  const templates = getCardTemplatesByFaction(faction);
  return templates.map((template) => createCardFromTemplate(template));
}

// === 後方互換性のためのエイリアス ===

/**
 * @deprecated 新しいコードでは ALL_CARD_TEMPLATES を使用してください
 */
export const ALL_CARDS = ALL_CARD_TEMPLATES.map((template) => createCardFromTemplate(template));

/**
 * @deprecated 新しいコードでは ALL_CARD_TEMPLATES を使用してください
 */
export const FACTION_CARDS: Record<Faction, Card[]> = {
  necromancer: necromancerCards.map((t) => createCardFromTemplate(t)),
  berserker: berserkerCards.map((t) => createCardFromTemplate(t)),
  mage: mageCards.map((t) => createCardFromTemplate(t)),
  knight: knightCards.map((t) => createCardFromTemplate(t)),
  inquisitor: inquisitorCards.map((t) => createCardFromTemplate(t)),
};
