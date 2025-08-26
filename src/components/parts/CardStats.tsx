'use client';

import React from 'react';
import type { Card, FieldCard, CreatureCard } from '@/types/game';
import { Sword, Heart } from 'lucide-react';

interface CardStatsProps {
  card: Card;
  isFieldCard?: boolean;
  sizeStyle: {
    stats: string;
  };
  isEnhanced: boolean;
  isDamaged: boolean;
}

/**
 * 攻撃力と体力の表示値を計算する
 */
const calculateDisplayStats = (card: CreatureCard, fieldCard: FieldCard | null) => {
  const attack = fieldCard ? card.attack + fieldCard.attackModifier : card.attack;
  const health = fieldCard ? `${fieldCard.currentHealth}/${card.health + fieldCard.healthModifier}` : card.health;
  
  return { attack, health };
};

/**
 * 攻撃力のCSSクラス名を構築する
 */
const buildAttackClassName = (baseClass: string, isEnhanced: boolean, fieldCard: FieldCard | null) => {
  const shouldHighlight = isEnhanced && fieldCard?.attackModifier !== 0;
  return `${baseClass} font-bold ${shouldHighlight ? 'text-green-400' : ''}`;
};

/**
 * 体力のCSSクラス名を構築する
 */
const buildHealthClassName = (baseClass: string, isDamaged: boolean, isEnhanced: boolean, fieldCard: FieldCard | null) => {
  if (isDamaged) {
    return `${baseClass} font-bold text-red-400`;
  }
  
  const shouldHighlight = isEnhanced && fieldCard?.healthModifier !== 0;
  return `${baseClass} font-bold ${shouldHighlight ? 'text-green-400' : ''}`;
};

export const CardStats = ({ card, isFieldCard, sizeStyle, isEnhanced, isDamaged }: CardStatsProps) => {
  if (card.type !== 'creature') {
    return null;
  }

  const creatureCard = card as CreatureCard;
  const fieldCard = isFieldCard ? (card as FieldCard) : null;
  const { attack, health } = calculateDisplayStats(creatureCard, fieldCard);
  const attackClassName = buildAttackClassName(sizeStyle.stats, isEnhanced, fieldCard);
  const healthClassName = buildHealthClassName(sizeStyle.stats, isDamaged, isEnhanced, fieldCard);

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
