/**
 * カードコンポーネント - 個別カードの表示
 * 
 * 設計方針:
 * - 場のカードと手札のカード両方で使用可能
 * - プレースホルダー画像で各勢力の特色表現
 * - レスポンシブ対応
 * - React Portalを使用してツールチップがoverflowに隠れないようにする
 */

'use client';

import React from 'react';
import type { Card, FieldCard, CreatureCard } from '@/types/game';
import { FACTION_COLORS, SIZE_CLASSES } from '@/lib/card-constants';
import { useCardTooltip } from '@/hooks/useCardTooltip';
import { useCardState } from '@/hooks/useCardState';
import { useCardAnimation } from '@/hooks/useCardAnimation';
import { useCardPortal } from '@/hooks/useCardPortal';
import { FACTION_HOVER_CLASSES } from '@/lib/card-constants';
import { CardTooltip } from './CardTooltip';
import { FACTION_ICONS, CARD_TYPE_JP } from '@/lib/card-constants';
import { Sword, Heart } from 'lucide-react';

interface CardComponentProps {
  card: Card;
  isFieldCard?: boolean;
  isOpponent?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  // 攻撃演出用のprops
  isAttacking?: boolean;
  isBeingAttacked?: boolean;
  damageAmount?: number;
  // 破壊演出用のprops
  isDying?: boolean;
  // 新演出用のprops
  isSummoning?: boolean;
  isDrawing?: boolean;
  isSpellCasting?: boolean;
  isHealing?: boolean;
  healAmount?: number;
}


// === 内部ユーティリティ関数（旧card-style-utils.tsから統合） ===

/**
 * カードのホバー効果クラスを取得する
 */
const getCardHoverClasses = (faction: keyof typeof FACTION_COLORS): string => {
  return FACTION_HOVER_CLASSES[faction] ?? '';
};

/**
 * カードコンテナのCSSクラスを生成する
 */
const getCardContainerClasses = ({
  factionStyle,
  isOpponent,
  faction,
}: {
  factionStyle: { border: string; bg: string };
  isOpponent: boolean;
  faction: keyof typeof FACTION_COLORS;
}): string => {
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
};

// === 内部コンポーネント定義（旧parts/ディレクトリから統合） ===

/**
 * カードアート部分のコンポーネント
 */
const CardArt = ({ card, size, factionStyle }: {
  card: Card;
  size: 'small' | 'medium' | 'large';
  factionStyle: { accent: string };
}) => {
  const FactionIcon = FACTION_ICONS[card.faction];
  const iconSize = size === 'small' ? 20 : size === 'medium' ? 28 : 36;

  return (
    <div className="h-1/2 p-2 flex items-center justify-center">
      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 rounded border border-gray-600 flex items-center justify-center">
        <FactionIcon size={iconSize} className={factionStyle.accent} />
      </div>
    </div>
  );
};

/**
 * カード本体（名前・タイプ）のコンポーネント
 */
const CardBody = ({ card, sizeStyle, factionStyle }: {
  card: Card;
  sizeStyle: { text: string };
  factionStyle: { accent: string };
}) => {
  return (
    <div className="px-2 py-1">
      <h3 className={`${sizeStyle.text} font-bold text-center leading-tight`}>
        {card.name}
      </h3>
      <p className={`text-xs text-center ${factionStyle.accent} opacity-80`}>
        {CARD_TYPE_JP[card.type]}
      </p>
    </div>
  );
};

/**
 * カードヘッダー（コスト・勢力アイコン）のコンポーネント
 */
const CardHeader = ({ card }: { card: Card }) => {
  const FactionIcon = FACTION_ICONS[card.faction];

  return (
    <>
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white z-10">
        <span className="text-white text-xs font-bold">{card.cost}</span>
      </div>
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white z-10">
        <FactionIcon size={14} className="text-white" />
      </div>
    </>
  );
};

/**
 * カードオーバーレイ（ターン数など）のコンポーネント
 */
const CardOverlays = ({ isFieldCard, fieldCard }: {
  isFieldCard?: boolean;
  fieldCard: FieldCard | null;
}) => {
  return (
    <>
      {isFieldCard && fieldCard && (
        <div className="absolute top-2 left-2 text-xs text-gray-400">
          T{fieldCard.summonTurn}
        </div>
      )}
    </>
  );
};

/**
 * 攻撃力・体力の表示値を計算するヘルパー関数
 */
const calculateCardStats = (creatureCard: CreatureCard, fieldCard: FieldCard | null) => {
  const attack = fieldCard ? creatureCard.attack + fieldCard.attackModifier : creatureCard.attack;
  const health = fieldCard ? `${fieldCard.currentHealth}/${creatureCard.health + fieldCard.healthModifier}` : creatureCard.health;
  return { attack, health };
};

/**
 * CSS クラス名を構築するヘルパー関数
 */
const buildStatsClassNames = (sizeStyle: { stats: string }, isEnhanced: boolean, isDamaged: boolean, fieldCard: FieldCard | null) => {
  const shouldHighlightAttack = isEnhanced && fieldCard?.attackModifier !== 0;
  const attackClassName = `${sizeStyle.stats} font-bold ${shouldHighlightAttack ? 'text-green-400' : ''}`;
  
  let healthClassName;
  if (isDamaged) {
    healthClassName = `${sizeStyle.stats} font-bold text-red-400`;
  } else {
    const shouldHighlightHealth = isEnhanced && fieldCard?.healthModifier !== 0;
    healthClassName = `${sizeStyle.stats} font-bold ${shouldHighlightHealth ? 'text-green-400' : ''}`;
  }
  
  return { attackClassName, healthClassName };
};

/**
 * カードステータス（攻撃力・体力）のコンポーネント
 */
const CardStats = ({ card, isFieldCard, sizeStyle, isEnhanced, isDamaged }: {
  card: Card;
  isFieldCard?: boolean;
  sizeStyle: { stats: string };
  isEnhanced: boolean;
  isDamaged: boolean;
}) => {
  if (card.type !== 'creature') {
    return null;
  }

  const creatureCard = card as CreatureCard;
  const fieldCard = isFieldCard ? (card as FieldCard) : null;
  
  const { attack, health } = calculateCardStats(creatureCard, fieldCard);
  const { attackClassName, healthClassName } = buildStatsClassNames(sizeStyle, isEnhanced, isDamaged, fieldCard);

  return (
    <div className="absolute bottom-2 left-2 right-2 flex justify-between">
      <div className="flex items-center space-x-1">
        <Sword size={12} className="text-orange-400" />
        <span className={attackClassName}>
          {attack}
        </span>
      </div>
      <div className="flex items-center space-x-1">
        <Heart size={12} className="text-red-400" />
        <span className={healthClassName}>
          {health}
        </span>
      </div>
    </div>
  );
};

// === メインコンポーネント ===

export default function CardComponent({
  card,
  isFieldCard = false,
  isOpponent = false,
  size = 'medium',
  className = '',
  isAttacking = false,
  isBeingAttacked = false,
  damageAmount = 0,
  isDying = false,
  // 新演出用のprops
  isSummoning = false,
  isDrawing = false,
  isSpellCasting = false,
  isHealing = false,
  healAmount = 0,
}: CardComponentProps) {
  const factionStyle = FACTION_COLORS[card.faction];
  const sizeStyle = SIZE_CLASSES[size];
  
  const { 
    showTooltip, 
    tooltipStyle, 
    tooltipRef, 
    handleMouseEnter, 
    handleMouseLeave 
  } = useCardTooltip();
  
  const { fieldCard, isDamaged, isEnhanced } = useCardState(card, isFieldCard);
  
  const { animationClasses, damagePopupElement } = useCardAnimation({
    isAttacking,
    isBeingAttacked,
    isDying,
    damageAmount,
    isSummoning,
    isDrawing,
    isSpellCasting,
    isHealing,
    healAmount,
  });

  const tooltipContent = (
    <CardTooltip card={card} isFieldCard={isFieldCard} fieldCard={fieldCard} tooltipStyle={tooltipStyle} />
  );
  
  const { portalElement } = useCardPortal(showTooltip, tooltipContent);

  const cardContainerClasses = getCardContainerClasses({
    factionStyle,
    isOpponent,
    faction: card.faction,
  });

  return (
    <div
      ref={tooltipRef}
      className={`relative group ${sizeStyle.container} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${cardContainerClasses.trim()} ${animationClasses}`.trim()}>
        <CardHeader card={card} />
        <CardArt card={card} size={size} factionStyle={factionStyle} />
        <CardBody card={card} sizeStyle={sizeStyle} factionStyle={factionStyle} />
        <CardStats
          card={card} 
          isFieldCard={isFieldCard} 
          sizeStyle={sizeStyle} 
          isEnhanced={isEnhanced} 
          isDamaged={isDamaged} 
        />
        <CardOverlays 
          isFieldCard={isFieldCard} 
          fieldCard={fieldCard} 
        />
      </div>

      {damagePopupElement}
      {portalElement}
    </div>
  );
}
