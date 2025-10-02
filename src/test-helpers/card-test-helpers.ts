/**
 * カードテスト用ヘルパー関数
 * 
 * 設計方針:
 * - CardTemplateからテスト用Cardインスタンスへの変換を統一
 * - 型安全性の確保と重複コードの削減
 * - テストコードの可読性と保守性の向上
 */

import type { Card, CreatureCard, SpellCard, CardTemplate, CreatureCardTemplate } from '@/types/game';

/**
 * CardTemplateからテスト用Cardインスタンスを生成
 * 
 * @param template - カードテンプレート（マスターデータ）
 * @param instanceIdSuffix - instanceIdの接尾辞（オプション、デフォルトは'test'）
 * @returns instanceId付きのCardインスタンス
 */
export function createCardInstance(
  template: CardTemplate,
  instanceIdSuffix?: string
): Card {
  const instanceId = `${template.templateId}${instanceIdSuffix ? `-${instanceIdSuffix}` : '-test'}`;
  
  if (template.type === 'creature') {
    return {
      ...template,
      instanceId,
    } as CreatureCard;
  } else {
    return {
      ...template,
      instanceId,
    } as SpellCard;
  }
}

/**
 * CardTemplate配列からクリーチャーを検索し、Cardインスタンスとして取得
 * 
 * @param templates - カードテンプレート配列
 * @param templateId - 検索するカードのテンプレートID
 * @param context - エラーメッセージ用のコンテキスト情報
 * @param instanceIdSuffix - instanceIdの接尾辞（オプション）
 * @returns 検索されたクリーチャーカードのインスタンス
 * @throws カードが見つからない、またはクリーチャーでない場合
 */
export function findAndCreateCreature(
  templates: CardTemplate[],
  templateId: string,
  context: string,
  instanceIdSuffix?: string
): CreatureCard {
  const template = templates.find(t => t.templateId === templateId);
  
  if (!template) {
    throw new Error(`${context}（templateId: ${templateId}）が見つかりません`);
  }
  
  if (template.type !== 'creature') {
    throw new Error(`${context}はクリーチャーカードではありません`);
  }
  
  return createCardInstance(template, instanceIdSuffix) as CreatureCard;
}

/**
 * CardTemplate配列からカードを検索し、Cardインスタンスとして取得
 * 
 * @param templates - カードテンプレート配列
 * @param templateId - 検索するカードのテンプレートID
 * @param context - エラーメッセージ用のコンテキスト情報
 * @param instanceIdSuffix - instanceIdの接尾辞（オプション）
 * @returns 検索されたカードのインスタンス
 * @throws カードが見つからない場合
 */
export function findAndCreateCard(
  templates: CardTemplate[],
  templateId: string,
  context: string,
  instanceIdSuffix?: string
): Card {
  const template = templates.find(t => t.templateId === templateId);
  
  if (!template) {
    throw new Error(`${context}（templateId: ${templateId}）が見つかりません`);
  }
  
  return createCardInstance(template, instanceIdSuffix);
}

/**
 * CreatureCardTemplateからテスト用CreatureCardインスタンスを生成
 * 既にテンプレートが特定されている場合に使用
 * 
 * @param template - クリーチャーカードテンプレート
 * @param instanceIdSuffix - instanceIdの接尾辞（オプション）
 * @returns instanceId付きのCreatureCardインスタンス
 */
export function createCreatureInstance(
  template: CreatureCardTemplate,
  instanceIdSuffix?: string
): CreatureCard {
  const instanceId = `${template.templateId}${instanceIdSuffix ? `-${instanceIdSuffix}` : '-test'}`;
  
  return {
    ...template,
    instanceId,
  } as CreatureCard;
}
