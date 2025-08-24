'use client';

import React from 'react';
import type { Card } from '@/types/game';
import { CARD_TYPE_JP } from '@/lib/card-constants';

interface CardBodyProps {
  card: Card;
  sizeStyle: {
    text: string;
  };
  factionStyle: {
    accent: string;
  };
}

export const CardBody = ({ card, sizeStyle, factionStyle }: CardBodyProps) => {
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
