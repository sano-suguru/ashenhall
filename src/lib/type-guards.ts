/**
 * 型ガード統一システム
 * 
 * 設計方針:
 * - 55箇所で重複する型チェックを共通化
 * - エラーメッセージの統一
 * - 型安全性の向上
 */

import type { CardTemplate, CreatureCardTemplate } from '@/types/game';

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
