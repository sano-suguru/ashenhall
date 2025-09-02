/**
 * カードスタイル計算ユーティリティ
 * 
 * CardComponentからスタイル計算ロジックを分離し、
 * 複雑度を削減するためのユーティリティ関数群
 */

import { FACTION_COLORS, FACTION_HOVER_CLASSES } from './card-constants';

interface FactionStyle {
  border: string;
  bg: string;
}

interface CardStyleOptions {
  factionStyle: FactionStyle;
  isOpponent: boolean;
  faction: keyof typeof FACTION_COLORS;
}

/**
 * カードのホバー効果クラスを取得する
 */
export function getCardHoverClasses(faction: keyof typeof FACTION_COLORS): string {
  return FACTION_HOVER_CLASSES[faction] ?? '';
}

/**
 * カードコンテナのCSSクラスを生成する
 */
export function getCardContainerClasses({
  factionStyle,
  isOpponent,
  faction,
}: CardStyleOptions): string {
  const baseClasses = [
    'w-full',
    'h-full',
    'rounded-lg',
    'border-2',
    factionStyle.border,
    'bg-gradient-to-b',
    factionStyle.bg,
    'text-white',
    'shadow-lg',
    'transition-all',
    'duration-300',
    'group-hover:scale-105',
    'group-hover:shadow-xl',
  ];

  // 状態による追加クラス
  const conditionalClasses = [];
  
  if (isOpponent) {
    conditionalClasses.push('opacity-90');
  } else {
    conditionalClasses.push('opacity-100');
  }

  // 全カードにホバー効果を追加（手札・場の両方）
  const hoverClasses = getCardHoverClasses(faction);
  conditionalClasses.push(hoverClasses);

  return [...baseClasses, ...conditionalClasses].join(' ');
}

/**
 * カードラッパーのCSSクラスを生成する
 */
export function getCardWrapperClasses(
  containerClasses: string,
  className: string
): string {
  return `relative group ${containerClasses} ${className}`;
}
