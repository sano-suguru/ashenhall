/**
 * Ashenhall アニメーション状態管理型定義
 * 
 * 設計方針:
 * - アニメーション状態の統合管理
 * - 複雑度削減のためのオブジェクト指向設計
 * - 型安全性の保証
 */

type CardAnimationKind = 
  | 'none'
  | 'attacking' 
  | 'being_attacked'
  | 'dying'
  | 'summoning'
  | 'drawing'
  | 'spell_casting'
  | 'healing';

/**
 * カードアニメーション状態
 * 従来の9個の個別プロパティを1つのオブジェクトに統合
 */
export interface CardAnimationState {
  /** アニメーション種別 */
  kind: CardAnimationKind;
  /** アニメーション値（ダメージ量・回復量等） */
  value?: number;
}

/**
 * アニメーションなし状態の定数
 */
export const ANIMATION_NONE: CardAnimationState = {
  kind: 'none',
  value: 0,
};

/**
 * CardAnimationStateからCSSクラス名を取得
 */
export function getAnimationCssClass(state: CardAnimationState | undefined | null): string {
  if (!state) return '';
  
  switch (state.kind) {
    case 'attacking': return 'card-attacking';
    case 'being_attacked': return 'card-being-attacked';
    case 'dying': return 'card-dying';
    case 'summoning': return 'card-summoning';
    case 'drawing': return 'card-drawing';
    case 'spell_casting': return 'card-spell-casting';
    case 'healing': return 'card-healing';
    case 'none': return '';
    default: return '';
  }
}
