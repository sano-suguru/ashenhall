'use client';

import React from 'react';
import type { Card } from '@/types/game';
import { CARD_TYPE_JP } from '@/lib/card-constants';

interface TooltipHeaderProps {
  card: Card;
}

export const TooltipHeader = ({ card }: TooltipHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-2">
      <div className="font-bold text-base text-amber-200">{card.name}</div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-400">
          {CARD_TYPE_JP[card.type] || card.type}
        </span>
        <div className="text-blue-300 font-bold text-xs bg-blue-900 px-2 py-1 rounded">
          コスト {card.cost}
        </div>
      </div>
    </div>
  );
};
