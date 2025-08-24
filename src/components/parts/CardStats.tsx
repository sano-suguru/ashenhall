'use client';

import React from 'react';
import type { Card, FieldCard } from '@/types/game';
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

export const CardStats = ({ card, isFieldCard, sizeStyle, isEnhanced, isDamaged }: CardStatsProps) => {
  if (card.type !== 'creature') {
    return null;
  }

  const fieldCard = isFieldCard ? (card as FieldCard) : null;

  const attack = isFieldCard && fieldCard ? card.attack + fieldCard.attackModifier : card.attack;
  const health = isFieldCard && fieldCard ? `${fieldCard.currentHealth}/${card.health + fieldCard.healthModifier}` : card.health;

  const attackClassName = `${sizeStyle.stats} font-bold ${isEnhanced && fieldCard?.attackModifier !== 0 ? 'text-green-400' : ''}`;
  const healthClassName = `${sizeStyle.stats} font-bold ${isDamaged ? 'text-red-400' : isEnhanced && fieldCard?.healthModifier !== 0 ? 'text-green-400' : ''}`;

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
