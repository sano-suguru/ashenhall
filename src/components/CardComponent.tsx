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

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Card, FieldCard } from '@/types/game';
import { FACTION_COLORS, SIZE_CLASSES } from '@/lib/card-constants';
import { useCardTooltip } from '@/hooks/useCardTooltip';
import { CardTooltip } from './CardTooltip';
import { CardHeader } from './parts/CardHeader';
import { CardArt } from './parts/CardArt';
import { CardBody } from './parts/CardBody';
import { CardEffectsIcons } from './parts/CardEffectsIcons';
import { CardStats } from './parts/CardStats';
import { CardOverlays } from './parts/CardOverlays';

interface CardComponentProps {
  card: Card;
  isFieldCard?: boolean;
  isOpponent?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}


export default function CardComponent({
  card,
  isFieldCard = false,
  isOpponent = false,
  size = 'medium',
  className = '',
}: CardComponentProps) {
  const fieldCard = isFieldCard ? card as FieldCard : null;
  const factionStyle = FACTION_COLORS[card.faction];
  const sizeStyle = SIZE_CLASSES[size];
  
  const { 
    showTooltip, 
    tooltipStyle, 
    tooltipRef, 
    handleMouseEnter, 
    handleMouseLeave 
  } = useCardTooltip();
  const [isMounted, setIsMounted] = useState(false);

  const isDamaged = fieldCard ? fieldCard.currentHealth < (card.type === 'creature' ? card.health : 0) + (fieldCard.healthModifier || 0) : false;
  const isEnhanced = fieldCard ? (fieldCard.attackModifier !== 0 || fieldCard.healthModifier !== 0) : false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const cardContainerClasses = `
    w-full h-full rounded-lg border-2 ${factionStyle.border}
    bg-gradient-to-b ${factionStyle.bg} text-white shadow-lg
    transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl
    ${isDamaged ? 'ring-2 ring-red-500' : ''}
    ${isEnhanced ? 'ring-2 ring-green-500' : ''}
    ${isOpponent ? 'opacity-90' : 'opacity-100'}
  `;

  return (
    <div
      ref={tooltipRef}
      className={`relative group ${sizeStyle.container} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={cardContainerClasses.trim()}>
        <CardHeader card={card} />
        <CardArt card={card} size={size} factionStyle={factionStyle} />
        <CardBody card={card} sizeStyle={sizeStyle} factionStyle={factionStyle} />
        <CardEffectsIcons card={card} />
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
          isEnhanced={isEnhanced} 
          isDamaged={isDamaged} 
        />
      </div>

      {isMounted && showTooltip && createPortal(
        <CardTooltip card={card} isFieldCard={isFieldCard} fieldCard={fieldCard} tooltipStyle={tooltipStyle} />,
        document.body
      )}
    </div>
  );
}
