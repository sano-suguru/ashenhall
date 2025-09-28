/**
 * 型ガード統一システム
 * 
 * 設計方針:
 * - 55箇所で重複する型チェックを共通化
 * - エラーメッセージの統一
 * - 型安全性の向上
 */

import type { Card, CreatureCard, CardTemplate, CreatureCardTemplate } from '@/types/game';

/**
 * カードがクリーチャーカードかどうかを確認し、型安全にキャスト
 */
export function ensureCreature(card: Card | undefined, context: string): CreatureCard {
  if (!card || card.type !== 'creature') {
    throw new Error(`${context}が見つかりません`);
  }
  return card;
}

/**
 * カードが存在することを確認し、型安全にキャスト
 */
export function ensureCard(card: Card | undefined, context: string): Card {
  if (!card) {
    throw new Error(`${context}が見つかりません`);
  }
  return card;
}

/**
 * 複数のクリーチャーカードを一度に検証
 */
export function ensureMultipleCreatures(
  cards: Array<Card | undefined>, 
  names: string[]
): CreatureCard[] {
  const results: CreatureCard[] = [];
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const name = names[i] || `カード${i + 1}`;
    
    if (!card || card.type !== 'creature') {
      throw new Error(`${name}が見つかりません`);
    }
    
    results.push(card);
  }
  
  return results;
}

/**
 * 2つのクリーチャーカードを検証（よく使われるパターン）
 */
export function ensureTwoCreatures(
  card1: Card | undefined,
  card2: Card | undefined,
  name1: string,
  name2: string
): [CreatureCard, CreatureCard] {
  const results = ensureMultipleCreatures([card1, card2], [name1, name2]);
  return [results[0], results[1]];
}

/**
 * カードIDでクリーチャーを検索し、型安全に取得
 */
export function findCreatureById(cards: Card[], cardId: string, context: string): CreatureCard {
  const card = cards.find(c => c.templateId === cardId);
  return ensureCreature(card, context);
}

// === CardTemplate用型ガード ===

/**
 * カードテンプレートがクリーチャーかどうかを確認し、型安全にキャスト
 */
export function ensureCreatureTemplate(template: CardTemplate | undefined, context: string): CreatureCardTemplate {
  if (!template || template.type !== 'creature') {
    throw new Error(`${context}が見つかりません`);
  }
  return template;
}

/**
 * カードIDでクリーチャーテンプレートを検索し、型安全に取得
 */
export function findCreatureTemplateById(templates: CardTemplate[], cardId: string, context: string): CreatureCardTemplate {
  const template = templates.find(t => t.templateId === cardId);
  return ensureCreatureTemplate(template, context);
}

/**
 * 2つのクリーチャーテンプレートを検証（よく使われるパターン）
 */
export function ensureTwoCreatureTemplates(
  template1: CardTemplate | undefined,
  template2: CardTemplate | undefined,
  name1: string,
  name2: string
): [CreatureCardTemplate, CreatureCardTemplate] {
  const t1 = ensureCreatureTemplate(template1, name1);
  const t2 = ensureCreatureTemplate(template2, name2);
  return [t1, t2];
}
