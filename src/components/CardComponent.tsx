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
import type { Card } from '@/types/game';
import { FACTION_COLORS, SIZE_CLASSES } from '@/lib/card-constants';
import { useCardTooltip } from '@/hooks/useCardTooltip';
import { useCardState } from '@/hooks/useCardState';
import { useCardAnimation } from '@/hooks/useCardAnimation';
import { useCardPortal } from '@/hooks/useCardPortal';
import { getCardContainerClasses } from '@/lib/card-style-utils';
import { CardTooltip } from './CardTooltip';
import { CardHeader } from './parts/CardHeader';
import { CardArt } from './parts/CardArt';
import { CardBody } from './parts/CardBody';
import { CardStats } from './parts/CardStats';
import { CardOverlays } from './parts/CardOverlays';

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
}


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
