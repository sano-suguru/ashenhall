/**
 * カードスタイル計算ユーティリティ
 * 
 * CardComponentからスタイル計算ロジックを分離し、
 * 複雑度を削減するためのユーティリティ関数群
 */

interface FactionStyle {
  border: string;
  bg: string;
}

interface CardStyleOptions {
  factionStyle: FactionStyle;
  isOpponent: boolean;
}

/**
 * カードコンテナのCSSクラスを生成する
 */
export function getCardContainerClasses({
  factionStyle,
  isOpponent,
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
